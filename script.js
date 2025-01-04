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

// Employee data
let employees = [
    { name: "مكاوي بلعيد", frenchName: "Mekawi_Belaid", morning: { in: null, out: null }, evening: { in: null, out: null }, status: "out", holiday: null },
    { name: "بوعكة بغدادي", frenchName: "Bouaka_Baghdadi", morning: { in: null, out: null }, evening: { in: null, out: null }, status: "out", holiday: null },
    { name: "سعيدي محمد", frenchName: "Saidi_Mohamed", morning: { in: null, out: null }, evening: { in: null, out: null }, status: "out", holiday: null },
    { name: "خيلوف عمر فاروق", frenchName: "Khilouf_Omar_Farouk", morning: { in: null, out: null }, evening: { in: null, out: null }, status: "out", holiday: null },
    { name: "توتاي حمزة", frenchName: "Toutai_Hamza", morning: { in: null, out: null }, evening: { in: null, out: null }, status: "out", holiday: null },
    { name: "صحراوي شرف الدين", frenchName: "Sahraoui_Cherif_Eddine", morning: { in: null, out: null }, evening: { in: null, out: null }, status: "out", holiday: null },
    { name: "مقدم محمد أمين", frenchName: "Mokadem_Mohamed_Amine", morning: { in: null, out: null }, evening: { in: null, out: null }, status: "out", holiday: null },
    { name: "عزاوي حاج", frenchName: "Azzawi_Hadj", morning: { in: null, out: null }, evening: { in: null, out: null }, status: "out", holiday: null },
    { name: "بقافلة خيرة", frenchName: "Bekafla_Kheira", morning: { in: null, out: null }, evening: { in: null, out: null }, status: "out", holiday: null },
    { name: "محاري مروان", frenchName: "Mahari_Marouane", morning: { in: null, out: null }, evening: { in: null, out: null }, status: "out", holiday: null },
    { name: "عمريو عبد القادر", frenchName: "Amriou_Abdelkader", morning: { in: null, out: null }, evening: { in: null, out: null }, status: "out", holiday: null }
];

// Global variables
let isInitialized = false;
let isProcessing = false;
let currentStream = null;
let labeledFaceDescriptors = null;
let faceMatcher = null;
let selectedEmployeeForHoliday = null;

// Initialize face-api.js models
async function loadModels() {
    try {
        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
            faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
            faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
            faceapi.nets.faceExpressionNet.loadFromUri('/models')
        ]);
        console.log("تم تحميل النماذج بنجاح");
    } catch (error) {
        throw new Error('فشل في تحميل نماذج التعرف على الوجه: ' + error.message);
    }
}

// Train the system with employee faces
async function trainEmployeeFaces() {
    try {
        labeledFaceDescriptors = await Promise.all(
            employees.map(async (employee) => {
                const descriptions = [];
                // هنا يجب إضافة صور تدريب لكل موظف
                // للتجربة نستخدم وصف افتراضي
                descriptions.push(new Float32Array(128).fill(0));
                return new faceapi.LabeledFaceDescriptors(employee.frenchName, descriptions);
            })
        );
        faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors);
        console.log("تم تدريب النظام بنجاح");
    } catch (error) {
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
        isInitialized = true;
        updateAttendanceTable();
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
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        currentStream = stream;
        
        const video = document.getElementById('video');
        video.srcObject = stream;
        video.style.display = 'block';
        await video.play();
        
        return true;
    } catch (error) {
        console.error('Failed to start camera:', error);
        throw new Error('فشل في تشغيل الكاميرا: ' + error.message);
    }
}

// Stop camera
function stopCamera() {
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        currentStream = null;
        
        const video = document.getElementById('video');
        video.srcObject = null;
        video.style.display = 'none';
        
        const canvas = document.getElementById('canvas');
        const context = canvas.getContext('2d');
        context.clearRect(0, 0, canvas.width, canvas.height);
    }
}

// Start countdown
async function startCountdown() {
    return new Promise((resolve) => {
        const countdownElement = document.getElementById('countdown');
        let count = 3;
        
        countdownElement.style.display = 'flex';
        countdownElement.textContent = count;
        
        const interval = setInterval(() => {
            count--;
            countdownElement.textContent = count;
            
            if (count === 0) {
                clearInterval(interval);
                countdownElement.style.display = 'none';
                resolve();
            }
        }, 1000);
    });
}

// Process face recognition and attendance
async function processAttendance(type) {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const context = canvas.getContext('2d');
    
    try {
        // Capture image from video
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const detections = await faceapi.detectSingleFace(canvas)
            .withFaceLandmarks()
            .withFaceDescriptor();

        if (!detections) {
            throw new Error('لم يتم العثور على وجه في الصورة');
        }

        // Match face with employee
        const match = faceMatcher.findBestMatch(detections.descriptor);
        const employee = employees.find(emp => emp.frenchName === match.label);

        if (!employee) {
            throw new Error('لم يتم التعرف على الموظف');
        }

        // Update attendance
        const currentTime = new Date().toLocaleTimeString('ar-DZ');
        const period = new Date().getHours() < 12 ? 'morning' : 'evening';
        
        if (type === 'in') {
            employee[period].in = currentTime;
            employee.status = 'in';
        } else {
            employee[period].out = currentTime;
            employee.status = 'out';
        }
        
        updateAttendanceTable();
        saveAttendanceData();
        
    } catch (error) {
        throw new Error('فشل في معالجة الحضور: ' + error.message);
    }
}

// Process holiday assignment
async function processHoliday() {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const context = canvas.getContext('2d');
    
    try {
        // Capture image from video
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const detections = await faceapi.detectSingleFace(canvas)
            .withFaceLandmarks()
            .withFaceDescriptor();

        if (!detections) {
            throw new Error('لم يتم العثور على وجه في الصورة');
        }

        // Match face with employee
        const match = faceMatcher.findBestMatch(detections.descriptor);
        selectedEmployeeForHoliday = employees.find(emp => emp.frenchName === match.label);

        if (!selectedEmployeeForHoliday) {
            throw new Error('لم يتم التعرف على الموظف');
        }

        // Show holiday modal
        const modal = document.getElementById('holidayModal');
        const overlay = document.getElementById('holidayModalOverlay');
        const employeeName = document.getElementById('holidayEmployeeName');
        
        employeeName.textContent = `تعيين عطلة للموظف: ${selectedEmployeeForHoliday.name}`;
        modal.style.display = 'block';
        overlay.style.display = 'block';
        
    } catch (error) {
        throw new Error('فشل في معالجة العطلة: ' + error.message);
    }
}

// Confirm holiday
function confirmHoliday() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    if (!startDate || !endDate) {
        alert("الرجاء تحديد تاريخي بداية ونهاية العطلة");
        return;
    }

    if (new Date(startDate) > new Date(endDate)) {
        alert("تاريخ البداية يجب أن يكون قبل تاريخ النهاية");
        return;
    }

    if (selectedEmployeeForHoliday) {
        selectedEmployeeForHoliday.holiday = { start: startDate, end: endDate };
        selectedEmployeeForHoliday.status = "holiday";
        updateAttendanceTable();
        saveAttendanceData();
        closeHolidayModal();
        alert(`تم تعيين عطلة لـ ${selectedEmployeeForHoliday.name} من ${startDate} إلى ${endDate}`);
    }
}

// Close holiday modal
function closeHolidayModal() {
    document.getElementById('holidayModal').style.display = 'none';
    document.getElementById('holidayModalOverlay').style.display = 'none';
    selectedEmployeeForHoliday = null;
}

// Save data to Firebase
function saveAttendanceData() {
    const date = new Date().toISOString().split('T')[0];
    set(ref(database, 'attendance/' + date), employees)
        .then(() => console.log('تم حفظ البيانات بنجاح'))
        .catch((error) => {
            console.error('فشل في حفظ البيانات:', error);
            showError('فشل في حفظ البيانات: ' + error.message);
        });
}

// Load data from Firebase
function loadAttendanceData() {
    const date = new Date().toISOString().split('T')[0];
    const attendanceRef = ref(database, 'attendance/' + date);

    onValue(attendanceRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            employees = data;
            updateAttendanceTable();
        }
    }, (error) => {
        console.error('فشل في تحميل البيانات:', error);
        showError('فشل في تحميل البيانات: ' + error.message);
    });
}

// Update attendance table
function updateAttendanceTable() {
    const tbody = document.querySelector('#attendanceTable tbody');
    tbody.innerHTML = employees.map(emp => `
        <tr>
            <td>${emp.name}</td>
            <td dir="ltr">${formatPeriod(emp.morning)}</td>
            <td dir="ltr">${formatPeriod(emp.evening)}</td>
            <td class="status-${emp.status}">
                <strong>${emp.status === 'in' ? 'متواجد' : emp.status === 'out' ? 'غير متواجد' : 'عطلة'}</strong>
            </td>
        </tr>
    `).join('');
}

// Format time period display
function formatPeriod(period) {
    if (!period || typeof period !== 'object') {
        return '- / -';
    }
    return `${period.in || '-'} / ${period.out || '-'}`;
}

// Show/hide loading message
function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'block' : 'none';
}

// Show error message
function showError(message) {
    const errorDiv = document.getElementById('error');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

// Export to Excel
function exportToExcel() {
    const date = new Date();
    const data = [
        ['تقرير الحضور والانصراف - اتصالات الجزائر'],
        ['التاريخ:', date.toLocaleDateString('ar-DZ')],
        ['خلية الصيانة والإنتاج'],
        [''],
        ['اسم الموظف', 'دخول صباحي', 'خروج صباحي', 'دخول مسائي', 'خروج مسائي', 'الحالة']
    ];

    employees.forEach(emp => {
        data.push([
            emp.name,
            emp.morning.in || '-',
            emp.morning.out || '-',
            emp.evening.in || '-',
            emp.evening.out || '-',
            emp.status === 'in' ? 'متواجد' : emp.status === 'out' ? 'غير متواجد' : 'عطلة'
        ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    
    ws['!cols'] = [
        { wch: 25 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'سجل الحضور');
    XLSX.writeFile(wb, `سجل_الحضور_${date.toISOString().split('T')[0]}.xlsx`);
}

// Event listeners
window.addEventListener('load', () => {
    loadAttendanceData();
    initializeSystem();
});

window.addEventListener('beforeunload', () => {
    saveAttendanceData();
});

// Make functions available globally
window.startAttendance = async function(type) {
    if (isProcessing) return;
    if (!isInitialized) await initializeSystem();

    try {
        isProcessing = true;
        disableButtons(true);
        
        await startCamera();
        await startCountdown();
        await processAttendance(type);
    } catch (error) {
        console.error("فشل في تسجيل الحضور:", error);
        showError(error.message);
    } finally {
        isProcessing = false;
        disableButtons(false);
        stopCamera();
    }
};

window.startHolidayProcess = async function() {
    if (isProcessing) return;
    if (!isInitialized) await initializeSystem();

    try {
        isProcessing = true;
        disableButtons(true);
        
        await startCamera();
        await startCountdown();
        await processHoliday();
    } catch (error) {
        console.error("فشل في تعيين العطلة:", error);
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

// Helper function to disable/enable buttons
function disableButtons(disabled) {
    document.getElementById('loginBtn').disabled = disabled;
    document.getElementById('logoutBtn').disabled = disabled;
    document.getElementById('holidayBtn').disabled = disabled;
    document.getElementById('exportBtn').disabled = disabled;
}
