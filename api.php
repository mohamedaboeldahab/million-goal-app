<?php

header("Content-Type: application/json");

// حط API KEY هنا (مش في الفرونت)
$API_KEY = "AIzaSyAUamuXa-gndq8CZw5DAXdqcxUuOwAsZz0";

$data = json_decode(file_get_contents("php://input"), true);
$msg = $data['msg'] ?? '';

if(!$msg){
    echo json_encode(["reply"=>"❌ مفيش رسالة"]);
    exit;
}

// طلب Gemini API
$url = "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=".$API_KEY;

$postData = [
    "contents" => [
        [
            "parts" => [
                ["text" => $msg]
            ]
        ]
    ]
];

$options = [
    "http" => [
        "header"  => "Content-Type: application/json",
        "method"  => "POST",
        "content" => json_encode($postData),
    ]
];

$context  = stream_context_create($options);
$response = file_get_contents($url, false, $context);

if($response === FALSE){
    echo json_encode(["reply"=>"❌ فشل الاتصال"]);
    exit;
}

$result = json_decode($response, true);

// استخراج الرد
$reply = $result['candidates'][0]['content']['parts'][0]['text'] ?? "❌ مفيش رد";

echo json_encode(["reply"=>$reply]);
