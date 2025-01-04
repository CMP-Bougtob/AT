/// بيانات الموظفين
const employees = [
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

// متغيرات عامة
let isInitialized = false;
let isProcessing = false;
let currentStream = null;
let labeledFaceDescriptors = null;
let faceMatcher = null;
let selectedEmployeeForHoliday = null;

// فتح نافذة العطلة
function openHolidayModal(employee) {
    selectedEmployeeForHoliday = employee;
    document.getElementById('holidayEmployeeName').textContent = `تعيين عطلة لـ: ${employee.name}`;
    document.getElementById('holidayModal').style.display = 'block';
    document.getElementById('holidayModalOverlay').style.display = 'block';
}

// إغلاق نافذة العطلة
function closeHolidayModal() {
    document.getElementById('holidayModal').style.display = 'none';
    document.getElementById('holidayModalOverlay').style.display = 'none';
    selectedEmployeeForHoliday = null;
}

// تأكيد العطلة
function confirmHoliday() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    if (!startDate || !endDate) {
        alert("الرجاء تحديد تاريخي بداية ونهاية العطلة.");
        return;
    }

    if (new Date(startDate) > new Date(endDate)) {
        alert("تاريخ البداية يجب أن يكون قبل تاريخ النهاية.");
        return;
    }

    selectedEmployeeForHoliday.holiday = { start: startDate, end: endDate };
    selectedEmployeeForHoliday.status = "holiday";
    updateAttendanceTable();
    closeHolidayModal();
    alert(`تم تعيين عطلة لـ ${selectedEmployeeForHoliday.name} من ${startDate} إلى ${endDate}`);
}

// بدء عملية تعيين العطلة
async function startHolidayProcess() {
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
}

// معالجة تعيين العطلة
async function processHoliday() {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const context = canvas.getContext('2d');
    
    try {
        if (!video.srcObject) {
            throw new Error('الكاميرا غير متصلة');
        }

        const detection = await faceapi.detectSingleFace(video, new faceapi.SsdMobilenetv1Options())
            .withFaceLandmarks()
            .withFaceDescriptor();
        
        if (!detection) {
            throw new Error('لم يتم العثور على وجه واضح - الرجاء المحاولة مجددا');
        }
        
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('انتهت مهلة التعرف على الوجه')), 10000);
        });

        const match = await Promise.race([
            faceMatcher.findBestMatch(detection.descriptor),
            timeoutPromise
        ]);
        
        if (match.label === 'unknown') {
            throw new Error('لم يتم التعرف على الموظف');
        }
        
        const employee = employees.find(emp => emp.name === match.label);
        openHolidayModal(employee);
    } catch (error) {
        throw new Error('فشل في عملية التعرف: ' + error.message);
    }
}

// التحقق من دعم المتصفح
function checkBrowserSupport() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('متصفحك لا يدعم استخدام الكاميرا. الرجاء استخدام متصفح حديث.');
    }
}

// تهيئة النظام
async function initializeSystem() {
    if (isInitialized) return;

    showLoading(true);
    try {
        checkBrowserSupport();
        
        console.log("جاري تحميل النماذج...");
        await loadModels();
        console.log("تم تحميل النماذج بنجاح.");

        console.log("جاري تدريب النظام على صور الموظفين...");
        await trainEmployeeFaces();
        console.log("تم تدريب النظام بنجاح.");
        
        isInitialized = true;
        updateAttendanceTable();
    } catch (error) {
        console.error("فشل في تهيئة النظام:", error);
        showError('فشل في تهيئة النظام: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// تحميل نماذج التعرف على الوجوه
async function loadModels() {
    const modelPath = './models';
    try {
        await Promise.all([
            faceapi.nets.ssdMobilenetv1.loadFromUri(modelPath),
            faceapi.nets.faceLandmark68Net.loadFromUri(modelPath),
            faceapi.nets.faceRecognitionNet.loadFromUri(modelPath)
        ]);
    } catch (error) {
        throw new Error('فشل في تحميل نماذج التعرف على الوجوه');
    }
}

// تدريب النظام على صور الموظفين
async function trainEmployeeFaces() {
    try {
        labeledFaceDescriptors = await Promise.all(
            employees.map(async employee => {
                const imgUrl = `./images/${employee.frenchName}.jpg`;
                console.log(`جاري تحميل صورة الموظف: ${employee.frenchName}`);
                const img = await faceapi.fetchImage(imgUrl);
                const detection = await faceapi.detectSingleFace(img, new faceapi.SsdMobilenetv1Options())
                    .withFaceLandmarks()
                    .withFaceDescriptor();
                    
                if (!detection) {
                    throw new Error(`لم يتم العثور على وجه في صورة ${employee.frenchName}`);
                }
                
                return new faceapi.LabeledFaceDescriptors(
                    employee.name,
                    [detection.descriptor]
                );
            })
        );
        
        faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors, 0.6);
    } catch (error) {
        throw new Error('فشل في تدريب النظام على صور الموظفين: ' + error.message);
    }
}

// بدء عملية تسجيل الحضور
async function startAttendance(type) {
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
}

// عداد التنازلي
async function startCountdown() {
    const countdown = document.getElementById('countdown');
    countdown.style.display = 'flex';
    
    for (let i = 3; i > 0; i--) {
        countdown.textContent = i;
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    countdown.style.display = 'none';
}

// بدء الكاميرا
async function startCamera() {
    const video = document.getElementById('video');
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'user' }
        });
        
        video.srcObject = stream;
        currentStream = stream;
        video.style.display = 'block';
        
        await new Promise(resolve => video.onloadedmetadata = resolve);
        await video.play();
        
        const canvas = document.getElementById('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
    } catch (error) {
        throw new Error('فشل في تشغيل الكاميرا - الرجاء التأكد من السماح باستخدام الكاميرا');
    }
}

// معالجة تسجيل الحضور
async function processAttendance(type) {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const context = canvas.getContext('2d');
    
    try {
        if (!video.srcObject) {
            throw new Error('الكاميرا غير متصلة');
        }

        const detection = await faceapi.detectSingleFace(video, new faceapi.SsdMobilenetv1Options())
            .withFaceLandmarks()
            .withFaceDescriptor();
        
        if (!detection) {
            throw new Error('لم يتم العثور على وجه واضح - الرجاء المحاولة مجددا');
        }
        
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('انتهت مهلة التعرف على الوجه')), 10000);
        });

        const match = await Promise.race([
            faceMatcher.findBestMatch(detection.descriptor),
            timeoutPromise
        ]);
        
        if (match.label === 'unknown') {
            throw new Error('لم يتم التعرف على الموظف');
        }
        
        const employee = employees.find(emp => emp.name === match.label);
        const now = new Date();
        const period = now.getHours() < 12 ? 'morning' : 'evening';
        
        validateAttendanceRecord(employee, period, type);
        
        employee[period][type] = now.toLocaleTimeString('ar-DZ');
        employee.status = type;
        
        updateAttendanceTable();
        
        if (type === 'out' && period === 'evening') {
            checkLastEmployee();
        }
        
        alert(`تم تسجيل ${type === 'in' ? 'دخول' : 'خروج'} ${employee.name} بنجاح`);
    } catch (error) {
        throw new Error('فشل في عملية التعرف: ' + error.message);
    }
}

// التحقق من صحة سجل الحضور
function validateAttendanceRecord(employee, period, type) {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();

    if (dayOfWeek === 5 || dayOfWeek === 6) {
        throw new Error('لا يمكن تسجيل الحضور في عطلة نهاية الأسبوع');
    }

    if (hour < 7 || hour > 17) {
        throw new Error('خارج ساعات العمل المسموح بها (7:00 - 17:00)');
    }

    if (period === 'morning' && hour >= 12) {
        throw new Error('لا يمكن تسجيل الدخول الصباحي بعد الظهر');
    }

    if (type === 'out' && !employee[period].in) {
        throw new Error('يجب تسجيل الدخول قبل تسجيل الخروج');
    }

    return true;
}

// تحديث جدول الحضور
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

// تنسيق عرض الفترة
function formatPeriod(period) {
    return `${period.in || '-'} / ${period.out || '-'}`;
}

// التحقق من آخر موظف
function checkLastEmployee() {
    const allOut = employees.every(emp => emp.status === 'out');
    if (allOut) {
        alert('تم خروج آخر موظف. سيتم استخراج التقرير تلقائياً.');
        exportToExcel();
    }
}

// تصدير إلى Excel
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

// إيقاف الكاميرا
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

// وظائف مساعدة لواجهة المستخدم
function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'block' : 'none';
}

function showError(message) {
    const errorDiv = document.getElementById('error');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

function disableButtons(disabled) {
    document.getElementById('loginBtn').disabled = disabled;
    document.getElementById('logoutBtn').disabled = disabled;
    document.getElementById('holidayBtn').disabled = disabled;
    document.getElementById('exportBtn').disabled = disabled;
}

// وظائف التخزين المحلي
function saveAttendanceData() {
    localStorage.setItem('attendanceData', JSON.stringify(employees));
    localStorage.setItem('lastUpdate', new Date().toISOString());
}

function loadAttendanceData() {
    const savedData = localStorage.getItem('attendanceData');
    const lastUpdate = localStorage.getItem('lastUpdate');
    
    if (savedData && lastUpdate) {
        const lastUpdateDate = new Date(lastUpdate);
        const today = new Date();
        
        if (lastUpdateDate.toDateString() !== today.toDateString()) {
            localStorage.clear();
            return;
        }
        
        const parsedData = JSON.parse(savedData);
        employees.forEach((emp, index) => {
            Object.assign(emp, parsedData[index]);
        });
    }
}

// مستمعات الأحداث
window.addEventListener('load', async () => {
    loadAttendanceData();
    await initializeSystem();
});

window.addEventListener('beforeunload', () => {
    saveAttendanceData();
});

// الحفظ التلقائي الدوري
setInterval(saveAttendanceData, 60000);
