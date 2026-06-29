<?php

// ----------------------------------------------
// 0. CORS / PREFLIGHT
// ----------------------------------------------
//
// Origin stays open because the proxy is used from Postman, production,
// Codex, and local dev servers with variable ports. Mutating actions are
// protected by X-KV-Import-Token when configured in garden.php.

header("Content-Type: application/json; charset=utf-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-KV-Import-Token");
header("Access-Control-Max-Age: 86400");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(204);
    exit;
}

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    respond(false, "Method not allowed. Use POST.");
}

// ----------------------------------------------
// 1. LEER JSON DE ENTRADA
// ----------------------------------------------

$input = json_decode(file_get_contents("php://input"), true);

if (!$input) {
    respond(false, "Invalid JSON request.");
}

$baseId = $input["baseId"] ?? null;
$table = $input["table"] ?? null;
$action = $input["action"] ?? null;
$recordId = $input["recordId"] ?? null;
$data = $input["data"] ?? null;
$filter = $input["filter"] ?? null;

// Parámetros de configuración dinámicos
$scope = $input["scope"] ?? 'airtable';
$key_id = $input["key_id"] ?? 'klef-pay';
$offset = $input["offset"] ?? null;

// ----------------------------------------------
// 2. CONFIGURACIÓN Y LLAVES
// ----------------------------------------------

if (!$baseId || !$table || !$action) {
    respond(false, "Missing required parameters: baseId, table, action.");
}

$config = require '/home/rccgaowg/zakra/garden.php';

validateProxyToken($config, $action);

if (!isset($config[$scope])) {
    respond(false, "Scope '$scope' not found in config.");
}

$apiKey = $config[$scope][$key_id] ?? null;

if (!$apiKey) {
    respond(false, "API Key not found for scope '$scope' and key_id '$key_id'.");
}

// URL base para la API de Airtable
$airtableUrl = "https://api.airtable.com/v0/" . urlencode($baseId) . "/" . urlencode($table);

// ----------------------------------------------
// 3. CONTROLADOR DE ACCIONES
// ----------------------------------------------

switch ($action) {

    case "create":
        if (!$data)
            respond(false, "Data is required for create.");
        apiCreate($airtableUrl, $apiKey, $data);
        break;

    case "update":
        if (!$recordId)
            respond(false, "recordId is required for update.");
        if (!$data)
            respond(false, "Data is required for update.");
        apiUpdate($airtableUrl, $apiKey, $recordId, $data);
        break;

    case "delete":
        if (!$recordId)
            respond(false, "recordId is required for delete.");
        apiDelete($airtableUrl, $apiKey, $recordId);
        break;

    case "get":
        if (!$recordId)
            respond(false, "recordId is required for get.");
        apiGetRecord($airtableUrl, $apiKey, $recordId);
        break;

    case "list":
        apiListRecords($airtableUrl, $apiKey, $filter, $offset);
        break;

    default:
        respond(false, "Unknown action: $action");
}


// ----------------------------------------------
// 4. FUNCIONES DE ACCESO A AIRTABLE
// ----------------------------------------------

function apiCreate($url, $apiKey, $data)
{
    $payload = ["records" => [["fields" => $data]]];
    $response = airtableRequest("POST", $url, $apiKey, $payload);

    if (isset($response['error']) || !isset($response['records'])) {
        $errorMsg = $response['error']['message'] ?? 'Airtable reject request';
        respond(false, "Airtable Error: " . $errorMsg, $response);
    }

    respond(true, "Record created.", $response);
}

function apiUpdate($url, $apiKey, $recordId, $data)
{
    $payload = [
        "records" => [
            [
                "id" => $recordId,
                "fields" => $data
            ]
        ]
    ];

    $response = airtableRequest("PATCH", $url, $apiKey, $payload);
    respond(true, "Record updated.", $response);
}

function apiDelete($url, $apiKey, $recordId)
{
    $deleteUrl = $url . "/" . urlencode($recordId);
    $response = airtableRequest("DELETE", $deleteUrl, $apiKey);
    respond(true, "Record deleted.", $response);
}

function apiGetRecord($url, $apiKey, $recordId)
{
    $getUrl = $url . "/" . urlencode($recordId);
    $response = airtableRequest("GET", $getUrl, $apiKey);
    respond(true, "Record retrieved.", $response);
}

function apiListRecords($url, $apiKey, $filter, $offset)
{
    // Permite usar filtros (opcional)
    $params = [];

    if ($filter && is_array($filter)) {
        foreach ($filter as $key => $value) {
            $params[$key] = $value;
        }
    }

    if ($offset) {
        $params["offset"] = $offset;
    }

    $query = http_build_query($params);
    $listUrl = $url . ($query ? ("?" . $query) : "");

    $response = airtableRequest("GET", $listUrl, $apiKey);
    respond(true, "Records listed.", $response);
}


// ----------------------------------------------
// 5. FUNCIÓN UNIVERSAL DE REQUEST
// ----------------------------------------------

function airtableRequest($method, $url, $apiKey, $payload = null)
{

    $ch = curl_init($url);

    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);

    $headers = [
        "Authorization: Bearer $apiKey",
        "Content-Type: application/json"
    ];

    if ($payload !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    }

    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

    $result = curl_exec($ch);
    $error = curl_error($ch);

    curl_close($ch);

    if ($error) {
        respond(false, "CURL Error: $error");
    }

    return json_decode($result, true);
}


// ----------------------------------------------
// 6. AUTORIZACIÓN DEL PROXY
// ----------------------------------------------

function validateProxyToken($config, $action)
{
    // Backwards-compatible default:
    // If garden.php does not define shum_proxy.kv_import_token, reads/writes keep working.
    // Once configured, mutating actions require X-KV-Import-Token.
    $writeActions = ["create", "update", "delete"];

    if (!in_array($action, $writeActions, true)) {
        return;
    }

    $expectedToken = $config["shum_proxy"]["kv_import_token"] ?? "";

    if (!$expectedToken) {
        return;
    }

    $clientToken = getRequestHeader("X-KV-Import-Token");

    if (!$clientToken || !hash_equals($expectedToken, $clientToken)) {
        http_response_code(401);
        respond(false, "Unauthorized request.");
    }
}

function getRequestHeader($name)
{
    $serverKey = "HTTP_" . strtoupper(str_replace("-", "_", $name));
    return $_SERVER[$serverKey] ?? "";
}


// ----------------------------------------------
// 7. FUNCIÓN GLOBAL DE RESPUESTA JSON
// ----------------------------------------------

function respond($success, $message, $data = null)
{
    echo json_encode([
        "success" => $success,
        "message" => $message,
        "data" => $data
    ], JSON_UNESCAPED_UNICODE);

    exit;
}

?>
