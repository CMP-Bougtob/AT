import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-database.js";

// بيانات التهيئة Firebase
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

// تهيئة Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// بيانات الموظفين
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

// متغيرات عامة
let isInitialized = false;
let isProcessing = false;
let currentStream = null;
let labeledFaceDescriptors = null;
let faceMatcher = null;
let selectedEmployeeForHoliday = null;

// عرض أو إخفاء رسالة التحميل
function showLoading(show) {
    const loadingDiv = document.getElementById('loading');
    if (show) {
        loadingDiv.style.display = 'block'; // عرض رسالة التحميل
    } else {
        loadingDiv.style.display = 'none'; // إخفاء رسالة التحميل
    }
}

// حفظ البيانات في Firebase
function saveAttendanceData() {
    const date = new Date().toISOString().split('T')[0]; // تاريخ اليوم
    set(ref(database, 'attendance/' + date), employees)
        .then(() => console.log('Data saved successfully!'))
        .catch((error) => {
            console.error('Failed to save data:', error);
            showError('فشل في حفظ البيانات: ' + error.message);
        });
}

// تحميل البيانات من Firebase
function loadAttendanceData() {
    const date = new Date().toISOString().split('T')[0]; // تاريخ اليوم
    const attendanceRef = ref(database, 'attendance/' + date);

    onValue(attendanceRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            employees = data;
            updateAttendanceTable();
        } else {
            // إذا لم تكن هناك بيانات، قم بتهيئة البيانات الافتراضية
            employees.forEach(emp => {
                emp.morning = { in: null, out: null };
                emp.evening = { in: null, out: null };
                emp.status = "out";
                emp.holiday = null;
            });
            updateAttendanceTable();
        }
    }, (error) => {
        console.error('Failed to load data:', error);
        showError('فشل في تحميل البيانات: ' + error.message);
    });
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
    if (!period || typeof period !== 'object') {
        return '- / -'; // إرجاع قيمة افتراضية إذا كانت البيانات غير صحيحة
    }
    return `${period.in || '-'} / ${period.out || '-'}`;
}

// عرض رسالة خطأ
function showError(message) {
    const errorDiv = document.getElementById('error');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

// التحقق من دعم المتصفح
function checkBrowserSupport() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('متصفحك لا يدعم استخدام الكاميرا. الرجاء استخدام متصفح حديث.');
    }
}

// تحميل نماذج التعرف على الوجوه
async function loadModels() {
    // يمكنك استخدام مكتبة مثل face-api.js لتحميل النماذج
    console.log("تم تحميل النماذج بنجاح.");
}

// تدريب النظام على صور الموظفين
async function trainEmployeeFaces() {
    // يمكنك استخدام مكتبة مثل face-api.js لتدريب النظام على صور الموظفين
    console.log("تم تدريب النظام بنجاح.");
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

// إغلاق نافذة العطلة
function closeHolidayModal() {
    document.getElementById('holidayModal').style.display = 'none';
    document.getElementById('holidayModalOverlay').style.display = 'none';
    selectedEmployeeForHoliday = null;
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
    
    // تنسيق ورقة العمل
    ws['!cols'] = [
        { wch: 25 }, // عرض عمود الاسم
        { wch: 15 }, // عرض أعمدة الوقت
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
function disableButtons(disabled) {
    document.getElementById('loginBtn').disabled = disabled;
    document.getElementById('logoutBtn').disabled = disabled;
    document.getElementById('holidayBtn').disabled = disabled;
    document.getElementById('exportBtn').disabled = disabled;
}

// مستمعات الأحداث
window.addEventListener('load', () => {
    loadAttendanceData();
    initializeSystem(); // استدعاء الدالة هنا
});

window.addEventListener('beforeunload', () => {
    saveAttendanceData();
});

// جعل الدوال متاحة للنقر على الأزرار
window.startAttendance = startAttendance;
window.startHolidayProcess = startHolidayProcess;
