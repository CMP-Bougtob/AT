<?php
// api.php

header("Access-Control-Allow-Origin: *"); // السماح لجميع المصادر بالوصول
header("Content-Type: application/json; charset=UTF-8"); // تحديد نوع المحتوى كـ JSON

// بيانات الاتصال بقاعدة البيانات
$host = "sql211.infinityfree.com"; // اسم الخادم
$dbname = "if0_38037105_db_cmpb"; // اسم قاعدة البيانات
$username = "if0_38037105"; // اسم المستخدم
$password = "Merwan208"; // كلمة المرور (استبدلها بكلمة المرور الخاصة بك)

try {
    // إنشاء اتصال بقاعدة البيانات باستخدام PDO
    $conn = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // استرجاع بيانات الموظفين
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $stmt = $conn->query("SELECT * FROM employees"); // استرجاع جميع الموظفين
        $employees = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode($employees); // إرجاع البيانات كـ JSON
    }

    // إضافة موظف جديد (مثال)
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = json_decode(file_get_contents("php://input"), true);

        $name = $data['name'];
        $frenchName = $data['frenchName'];

        $stmt = $conn->prepare("INSERT INTO employees (name, frenchName) VALUES (:name, :frenchName)");
        $stmt->execute(['name' => $name, 'frenchName' => $frenchName]);

        echo json_encode(["message" => "تمت إضافة الموظف بنجاح"]);
    }
} catch (PDOException $e) {
    echo json_encode(["error" => "فشل الاتصال بقاعدة البيانات: " . $e->getMessage()]);
}
?>
