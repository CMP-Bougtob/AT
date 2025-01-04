// attendance.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-database.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyB8u8X_sPh9VE1J2ttSW8ARVy4YnB2rCXY",
    authDomain: "cmp-bougtob.firebaseapp.com",
    databaseURL: "https://cmp-bougtob-default-rtdb.firebaseio.com",
    projectId: "cmp-bougtob",
    storageBucket: "cmp-bougtob.firebasestorage.app",
    messagingSenderId: "962017064792",
    appId: "1:962017064792:web:880de88999961a801f572d",
    measurementId: "G-N2V051HQYN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Constants
const RECOGNITION_THRESHOLD = 0.6;
const VERIFICATION_ATTEMPTS = 3;
const TRAINING_IMAGES_PER_EMPLOYEE = 3;

// Employee data structure
const employees = [
    { 
        name: "مكاوي بلعيد", 
        frenchName: "Mekawi_Belaid", 
        imageFiles: Array.from({length: TRAINING_IMAGES_PER_EMPLOYEE}, (_, i) => `Mekawi_${i + 1}.jpg`),
        department: "الصيانة"
    },
    { 
        name: "بوعكة بغدادي", 
        frenchName: "Bouaka_Baghdadi", 
        imageFiles: Array.from({length: TRAINING_IMAGES_PER_EMPLOYEE}, (_, i) => `Bouaka_${i + 1}.jpg`),
        department: "الإنتاج"
    }
].map(emp => ({
    ...emp,
    morning: { in: null, out: null },
    evening: { in: null, out: null },
    status: "out",
    holiday: null,
    faceDescriptors: [],
    lastUpdated: null
}));

// Global state
let isInitialized = false;
let isProcessing = false;
let currentStream = null;
let faceMatcher = null;

// Face detection options
const FACE_DETECTION_OPTIONS = new faceapi.SsdMobilenetv1Options({
    minConfidence: 0.5
});

// Time windows for attendance
const TIME_WINDOWS = {
    morning: {
        in: { start: 7, end: 9 },
        out: { start: 11, end: 13 }
    },
    evening: {
        in: { start: 13, end: 15 },
        out: { start: 16, end: 18 }
    }
};

// Initialize face-api.js models
async function loadModels() {
    try {
        const modelPath = './models';
        console.log("بدء تحميل النماذج من:", modelPath);
        
        // التحقق من وجود النماذج
        const checkModelFiles = async () => {
            const modelFiles = [
                'tiny_face_detector_model-weights_manifest.json',
                'face_landmark_68_model-weights_manifest.json',
                'face_recognition_model-weights_manifest.json',
                'face_expression_model-weights_manifest.json',
                'ssd_mobilenetv1_model-weights_manifest.json'
            ];
            
            for (const file of modelFiles) {
                try {
                    const response = await fetch(`${modelPath}/${file}`);
                    if (!response.ok) {
                        throw new Error(`فشل في تحميل الملف: ${file}`);
                    }
                } catch (error) {
                    throw new Error(`فشل في الوصول إلى ملف النموذج ${file}: ${error.message}`);
                }
            }
        };
        
        await checkModelFiles();
        
        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(modelPath),
            faceapi.nets.faceLandmark68Net.loadFromUri(modelPath),
            faceapi.nets.faceRecognitionNet.loadFromUri(modelPath),
            faceapi.nets.faceExpressionNet.loadFromUri(modelPath),
            faceapi.nets.ssdMobilenetv1.loadFromUri(modelPath)
        ]);
        
        console.log("تم تحميل جميع النماذج بنجاح");
    } catch (error) {
        console.error("فشل في تحميل النماذج:", error);
        throw new Error(`فشل في تحميل نماذج التعرف على الوجه: ${error.message}`);
    }
}

// Load and process training images
async function loadTrainingImage(employee, imageFile) {
    try {
        const imagePath = `./images/${imageFile}`;
        console.log(`محاولة تحميل الصورة: ${imagePath}`);
        
        // التحقق من وجود الصورة
        const checkImage = await fetch(imagePath);
        if (!checkImage.ok) {
            throw new Error(`الصورة غير موجودة: ${imagePath}`);
        }
        
        const img = await faceapi.fetchImage(imagePath);
        console.log(`تم تحميل الصورة: ${imageFile}`);
        
        const detection = await faceapi
            .detectSingleFace(img, FACE_DETECTION_OPTIONS)
            .withFaceLandmarks()
            .withFaceDescriptor();
        
        if (!detection) {
            console.warn(`لم يتم العثور على وجه في صورة التدريب ${imageFile} للموظف ${employee.name}`);
            return null;
        }
        
        console.log(`تم استخراج خصائص الوجه من الصورة: ${imageFile}`);
        return detection.descriptor;
    } catch (error) {
        console.error(`خطأ في معالجة صورة التدريب ${imageFile} للموظف ${employee.name}:`, error);
        return null;
    }
}

// Train the system with employee faces
async function trainEmployeeFaces() {
    try {
        console.log("بدء تدريب النظام على وجوه الموظفين");
        
        const labeledDescriptors = await Promise.all(
            employees.map(async (employee) => {
                const descriptors = [];
                
                for (const imageFile of employee.imageFiles) {
                    const descriptor = await loadTrainingImage(employee, imageFile);
                    if (descriptor) {
                        descriptors.push(descriptor);
                        employee.faceDescriptors.push(descriptor);
                    }
                }
                
                if (descriptors.length === 0) {
                    throw new Error(`لم يتم العثور على وجوه صالحة في صور التدريب للموظف ${employee.name}`);
                }
                
                console.log(`تم تدريب النظام على ${descriptors.length} صور للموظف ${employee.name}`);
                return new faceapi.LabeledFaceDescriptors(employee.frenchName, descriptors);
            })
        );
        
        faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, RECOGNITION_THRESHOLD);
        console.log("تم تدريب النظام بنجاح");
    } catch (error) {
        console.error("فشل في تدريب النظام:", error);
        throw new Error('فشل في تدريب النظام: ' + error.message);
    }
}

// Initialize the system
async function initializeSystem() {
    if (isInitialized) return;
    
    showLoading(true);
    try {
        await loadModels();
        await trainEmployeeFaces();
        await loadAttendanceData();
        isInitialized = true;
        updateAttendanceTable();
        console.log("تم تهيئة النظام بنجاح");
    } catch (error) {
        console.error("فشل في تهيئة النظام:", error);
        showError('فشل في تهيئة النظام: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// Start camera
async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: "user"
            }
        });
        
        currentStream = stream;
        const video = document.getElementById('video');
        video.srcObject = stream;
        video.style.display = 'block';
        
        const canvas = document.getElementById('overlay');
        canvas.style.display = 'block';
        
        video.addEventListener('play', () => {
            const displaySize = { width: video.videoWidth, height: video.videoHeight };
            faceapi.matchDimensions(canvas, displaySize);
            
            setInterval(async () => {
                if (video.paused || video.ended) return;
                
                const detections = await faceapi
                    .detectAllFaces(video, FACE_DETECTION_OPTIONS)
                    .withFaceLandmarks();
                
                const resizedDetections = faceapi.resizeResults(detections, displaySize);
                canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
                faceapi.draw.drawDetections(canvas, resizedDetections);
                faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
            }, 100);
        });
        
        await video.play();
        return true;
    } catch (error) {
        console.error("فشل في تشغيل الكاميرا:", error);
        throw new Error('فشل في تشغيل الكاميرا: ' + error.message);
    }
}

// Face recognition process
async function recognizeFace(video) {
    try {
        console.log("بدء عملية التعرف على الوجه");
        
        const detections = await faceapi
            .detectAllFaces(video, FACE_DETECTION_OPTIONS)
            .withFaceLandmarks()
            .withFaceDescriptors();
        
        console.log(`تم العثور على ${detections.length} وجه/وجوه`);
        
        if (detections.length === 0) {
            throw new Error('لم يتم العثور على وجه في الصورة');
        }
        
        if (detections.length > 1) {
            throw new Error('تم اكتشاف أكثر من وجه في الصورة');
        }
        
        const match = faceMatcher.findBestMatch(detections[0].descriptor);
        console.log(`نتيجة المطابقة: ${match.label} بدرجة ثقة ${(1 - match.distance).toFixed(2)}`);
        
        if (match.distance > RECOGNITION_THRESHOLD) {
            throw new Error('لم يتم التعرف على الموظف بثقة كافية');
        }
        
        const employee = employees.find(emp => emp.frenchName === match.label);
        if (!employee) {
            throw new Error('لم يتم العثور على بيانات الموظف');
        }
        
        return {
            employee,
            confidence: 1 - match.distance
        };
    } catch (error) {
        console.error("خطأ في التعرف على الوجه:", error);
        throw error;
    }
}

// Add countdown before taking photo
function startCountdown(seconds = 3) {
    return new Promise((resolve) => {
        const countdownElement = document.getElementById('countdown');
        countdownElement.style.display = 'block';
        
        let remaining = seconds;
        
        const countdownInterval = setInterval(() => {
            countdownElement.textContent = remaining;
            
            if (remaining <= 0) {
                clearInterval(countdownInterval);
                countdownElement.style.display = 'none';
                resolve();
            }
            
            remaining--;
        }, 1000);
    });
}

// Process attendance
async function processAttendance(type) {
    const video = document.getElementById('video');
    
    try {
        console.log(`بدء معالجة ${type === 'in' ? 'الحضور' : 'الانصراف'}`);
        const recognitionResults = [];
        
        for (let i = 0; i < VERIFICATION_ATTEMPTS; i++) {
            await new Promise(resolve => setTimeout(resolve, 500));
            const result = await recognizeFace(video);
            recognitionResults.push(result);
        }
        
        const allSameEmployee = recognitionResults.every(result => 
            result.employee.frenchName === recognitionResults[0].employee.frenchName
        );
        
        if (!allSameEmployee) {
            throw new Error('فشل في التحقق من هوية الموظف. الرجاء المحاولة مرة أخرى');
        }
        
        const avgConfidence = recognitionResults.reduce((sum, result) => sum + result.confidence, 0) / VERIFICATION_ATTEMPTS;
        
        const employee = recognitionResults[0].employee;
        const currentTime = new Date();
        const period = currentTime.getHours() < 12 ? 'morning' : 'evening';
        
        validateAttendanceTiming(employee, period, type, currentTime);
        
        if (type === 'in') {
            employee[period].in = currentTime.toLocaleTimeString('ar-DZ');
            employee.status = 'in';
        } else {
            employee[period].out = currentTime.toLocaleTimeString('ar-DZ');
            employee.status = 'out';
        }
        
        employee.lastUpdated = currentTime.toISOString();
        
        updateAttendanceTable();
        await saveAttendanceData();
        
        showSuccess(`تم تسجيل ${type === 'in' ? 'حضور' : 'انصراف'} ${employee.name} بنجاح (الثقة: ${(avgConfidence * 100).toFixed(1)}%)`);
        
    } catch (error) {
        console.error("فشل في معالجة الحضور:", error);
        throw new Error('فشل في معالجة الحضور: ' + error.message);
    }
}

// Validate attendance timing
function validateAttendanceTiming(employee, period, type, currentTime) {
    const currentHour = currentTime.getHours();
    const timeWindow = TIME_WINDOWS[period][type];
    
    if (currentHour < timeWindow.start || currentHour > timeWindow.end) {
        throw new Error(`وقت تسجيل ${type === 'in' ? 'الحضور' : 'الانصراف'} ${period === 'morning' ? 'الصباحي' : 'المسائي'} من ${timeWindow.start} إلى ${timeWindow.end}`);
    }
    
    if (employee.holiday) {
        const holidayStart = new Date(employee.holiday.start);
        const holidayEnd = new Date(employee.holiday.end);
        
        if (currentTime >= holidayStart && currentTime <= holidayEnd) {
            throw new Error('الموظف في عطلة حالياً');
        }
    }
    
    if (type === 'in' && employee.status === 'in') {
        throw new Error('الموظف مسجل بالفعل كحاضر');
    }
    if (type === 'out' && employee.status === 'out') {
        throw new Error('الموظف مسجل بالفعل كمنصرف');
    }
}

// Process holiday request
async function processHoliday() {
    try {
        const { employee } = await recognizeFace(document.getElementById('video'));
        
        if (employee.status === 'holiday') {
            throw new Error('الموظف في عطلة بالفعل');
        }
        
        showHolidayModal(employee);
    } catch (error) {
        console.error("فشل في معالجة العطلة:", error);
        throw new Error('فشل في معالجة العطلة: ' + error.message);
    }
}

// Firebase Data Management
async function saveAttendanceData() {
    const date = new Date().toISOString().split('T')[0];
    const attendanceData = employees.map(emp => ({
        name: emp.name,
        frenchName: emp.frenchName,
        department: emp.department,
        morning: emp.morning,
        evening: emp.evening,
        status: emp.status,
        holiday: emp.holiday,
        lastUpdated: emp.lastUpdated
    }));
    
    try {
        await set(ref(database, `attendance/${date}`), attendanceData);
        console.log('تم حفظ البيانات بنجاح');
    } catch (error) {
        console.error("فشل في حفظ البيانات:", error);
        throw new Error('فشل في حفظ البيانات: ' + error.message);
    }
}

async function loadAttendanceData() {
    const date = new Date().toISOString().split('T')[0];
    const attendanceRef = ref(database, `attendance/${date}`);
    
    try {
        const snapshot = await new Promise((resolve, reject) => {
            onValue(attendanceRef, resolve, reject);
        });
        
        const data = snapshot.val();
        if (data) {
            employees.forEach(emp => {
                const savedData = data.find(d => d.frenchName === emp.frenchName);
                if (savedData) {
                    emp.morning = savedData.morning;
                    emp.evening = savedData.evening;
                    emp.status = savedData.status;
                    emp.holiday = savedData.holiday;
                    emp.lastUpdated = savedData.lastUpdated;
                }
            });
            updateAttendanceTable();
        }
    } catch (error) {
        console.error('فشل في تحميل البيانات:', error);
        showError('فشل في تحميل البيانات: ' + error.message);
    }
}

// UI Updates and Utilities
function updateAttendanceTable() {
    const tbody = document.querySelector('#attendanceTable tbody');
    tbody.innerHTML = employees.map(emp => `
        <tr class="status-${emp.status}">
            <td>${emp.name}</td>
            <td>${emp.department}</td>
            <td dir="ltr">${formatPeriod(emp.morning)}</td>
            <td dir="ltr">${formatPeriod(emp.evening)}</td>
            <td>${getStatusDisplay(emp)}</td>
            <td>${formatHolidayInfo(emp.holiday)}</td>
            <td dir="ltr">${emp.lastUpdated ? new Date(emp.lastUpdated).toLocaleString('ar-DZ') : '-'}</td>
        </tr>
    `).join('');
}

function formatPeriod(period) {
    if (!period || typeof period !== 'object') return '- / -';
    return `${period.in || '-'} / ${period.out || '-'}`;
}

function getStatusDisplay(employee) {
    switch (employee.status) {
        case 'in': return '<span class="status-badge in">متواجد</span>';
        case 'out': return '<span class="status-badge out">غير متواجد</span>';
        case 'holiday': return '<span class="status-badge holiday">في عطلة</span>';
        default: return '-';
    }
}

function formatHolidayInfo(holiday) {
    if (!holiday) return '-';
    return `
        <div class="holiday-info">
            <div>من: ${new Date(holiday.start).toLocaleDateString('ar-DZ')}</div>
            <div>إلى: ${new Date(holiday.end).toLocaleDateString('ar-DZ')}</div>
            <div class="holiday-reason">${holiday.reason}</div>
        </div>
    `;
}

// UI Helper Functions
function showSuccess(message) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = 'notification success';
    notification.style.display = 'block';
    setTimeout(() => { notification.style.display = 'none'; }, 5000);
}

function showError(message) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = 'notification error';
    notification.style.display = 'block';
    setTimeout(() => { notification.style.display = 'none'; }, 5000);
}

function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'block' : 'none';
}

function disableButtons(disabled) {
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => button.disabled = disabled);
}

// Export to Excel
async function exportToExcel() {
    try {
        const date = new Date();
        const workbook = XLSX.utils.book_new();
        
        // Attendance sheet
        const attendanceData = [
            ['تقرير الحضور والانصراف - اتصالات الجزائر'],
            ['التاريخ:', date.toLocaleDateString('ar-DZ')],
            [''],
            ['اسم الموظف', 'القسم', 'دخول صباحي', 'خروج صباحي', 'دخول مسائي', 'خروج مسائي', 'الحالة']
        ];
        
        employees.forEach(emp => {
            attendanceData.push([
                emp.name,
                emp.department,
                emp.morning.in || '-',
                emp.morning.out || '-',
                emp.evening.in || '-',
                emp.evening.out || '-',
                emp.status === 'in' ? 'متواجد' : emp.status === 'out' ? 'غير متواجد' : 'عطلة'
            ]);
        });
        
        const wsAttendance = XLSX.utils.aoa_to_sheet(attendanceData);
        XLSX.utils.book_append_sheet(workbook, wsAttendance, 'سجل الحضور');
        
        XLSX.writeFile(workbook, `تقرير_الحضور_${date.toISOString().split('T')[0]}.xlsx`);
        showSuccess('تم تصدير البيانات بنجاح');
    } catch (error) {
        console.error("فشل في تصدير البيانات:", error);
        showError('فشل في تصدير البيانات: ' + error.message);
    }
}

// Event Listeners
window.addEventListener('load', initializeSystem);
window.addEventListener('beforeunload', () => {
    if (currentStream) stopCamera();
    saveAttendanceData();
});

// Export window functions
window.startAttendance = async function(type) {
    if (isProcessing) return;
    
    try {
        isProcessing = true;
        disableButtons(true);
        
        if (!isInitialized) await initializeSystem();
        await startCamera();
        await startCountdown();
        await processAttendance(type);
        
    } catch (error) {
        console.error("خطأ:", error);
        showError(error.message);
    } finally {
        isProcessing = false;
        disableButtons(false);
        stopCamera();
    }
};

window.startHolidayProcess = async function() {
    if (isProcessing) return;
    
    try {
        isProcessing = true;
        disableButtons(true);
        
        if (!isInitialized) await initializeSystem();
        await startCamera();
        await startCountdown();
        await processHoliday();
        
    } catch (error) {
        console.error("خطأ:", error);
        showError(error.message);
    } finally {
        isProcessing = false;
        disableButtons(false);
        stopCamera();
    }
};

window.confirmHoliday = confirmHoliday;
window.closeHolidayModal = closeHolidayModal;
window.exportToExcel = exportToExcel;
