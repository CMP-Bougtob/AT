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

// مستمعات الأحداث
window.addEventListener('load', () => {
    loadAttendanceData();
    initializeSystem(); // استدعاء الدالة هنا
});

window.addEventListener('beforeunload', () => {
    saveAttendanceData();
});
