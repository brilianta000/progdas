<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

// file handle manual
function read_json($file)
{
    if (!file_exists($file)) {
        file_put_contents($file, "[]");
    }

    $fp = fopen($file, "r");
    if (!$fp) { return []; }

    $size = filesize($file);
    if ($size == 0) { return []; }

    $content = fread($fp, $size);
    fclose($fp);

    $data = json_decode($content, true);
    return $data ?: [];
}

function write_json($file, $data)
{
    $fp = fopen($file, "w");
    if (!$fp) { return false; }

    $json = json_encode($data, JSON_PRETTY_PRINT);
    fwrite($fp, $json);
    fclose($fp);
    return true;
}

function clean($str)
{
    $str = trim($str);
    $str = filter_var($str, FILTER_SANITIZE_STRING);
    return $str;
}

function validate_text($text, $field, $min = 2, $max = 100)
{
    if (strlen($text) < $min)
        return "$field minimal $min karakter";

    if (strlen($text) > $max)
        return "$field maksimal $max karakter";

    return "";
}

function validate_int($num, $field)
{
    if (!filter_var($num, FILTER_VALIDATE_INT)) {
        return "$field harus angka";
    }
    return "";
}

// file handle maybe
$action = $_GET["action"] ?? "";

// File data
$supplier_file = "supplier.json";
$barang_file = "barang.json";
$stok_file = "stok_log.json";

$suppliers = read_json($supplier_file);
$barang = read_json($barang_file);
$stok_log = read_json($stok_file);

// Debug example (non-aktif)
// var_dump($suppliers);
// print_r($barang);

// tambah supli 
if ($action === "add_supplier") {
    $input = json_decode(file_get_contents("php://input"), true);

    $nama = clean($input["nama"] ?? "");
    $contact = clean($input["contact"] ?? "");
    $alamat = clean($input["alamat"] ?? "");

    // Validasi
    if ($err = validate_text($nama, "Nama")) {
        echo json_encode(["error" => $err]); exit;
    }

    if ($err = validate_text($contact, "Contact", 3, 20)) {
        echo json_encode(["error" => $err]); exit;
    }

    if ($err = validate_text($alamat, "Alamat")) {
        echo json_encode(["error" => $err]); exit;
    }

    // Manipulasi string
    $nama = strtoupper($nama);           
    $alamat = ucwords(strtolower($alamat)); 

    $id = count($suppliers) > 0 ? max(array_column($suppliers, 'id')) + 1 : 1;

    $suppliers[] = [
        "id" => $id,
        "nama" => $nama,
        "contact" => $contact,
        "alamat" => $alamat
    ];

    write_json($supplier_file, $suppliers);

    echo json_encode(["success" => true]);
    exit;
}
// del supli
if ($action === "delete_supplier") {
    $input = json_decode(file_get_contents("php://input"), true);
    $id = $input["id"] ?? 0;

    foreach ($suppliers as $i => $s) {
        if ($s["id"] == $id) {
            unset($suppliers[$i]);
            write_json($supplier_file, array_values($suppliers));
            echo json_encode(["success" => true]);
            exit;
        }
    }

    echo json_encode(["error" => "Supplier tidak ditemukan"]);
    exit;
}

if ($action === "get_suppliers") {
    echo json_encode(array_values($suppliers));
    exit;
}
// add barang
if ($action === "add_barang") {
    $input = json_decode(file_get_contents("php://input"), true);

    $nama = clean($input["nama"] ?? "");
    $jumlah = $input["jumlah"] ?? "";
    $supplier_id = $input["supplier_id"] ?? "";

    // Validasi
    if ($err = validate_text($nama, "Nama Barang")) {
        echo json_encode(["error" => $err]); exit;
    }
    if ($err = validate_int($jumlah, "Jumlah")) {
        echo json_encode(["error" => $err]); exit;
    }
    if ($err = validate_int($supplier_id, "Supplier")) {
        echo json_encode(["error" => $err]); exit;
    }

    // Manipulasi nama
    $nama = ucwords(strtolower($nama));

    $kode = count($barang) > 0 ? max(array_column($barang, 'kode')) + 1 : 1;
    $id = count($barang) > 0 ? max(array_column($barang, 'id')) + 1 : 1;

    $barang[] = [
        "id" => $id,
        "kode" => $kode,
        "nama" => $nama,
        "jumlah" => (int)$jumlah,
        "supplier_id" => (int)$supplier_id
    ];

    write_json($barang_file, $barang);

    echo json_encode(["success" => true]);
    exit;
}
// del barang 
if ($action === "delete_barang") {
    $input = json_decode(file_get_contents("php://input"), true);
    $id = $input["id"] ?? 0;

    foreach ($barang as $i => $b) {
        if ($b["id"] == $id) {
            unset($barang[$i]);
            write_json($barang_file, array_values($barang));
            echo json_encode(["success" => true]);
            exit;
        }
    }

    echo json_encode(["error" => "Barang tidak ditemukan"]);
    exit;
}

if ($action === "report") {
    echo json_encode(array_values($barang));
    exit;
}

if ($action === "stok_change") {
    $input = json_decode(file_get_contents("php://input"), true);

    $id = $input["id"];
    $tambah = $input["bertambah"] ?? 0;
    $kurang = $input["berkurang"] ?? 0;
    $ket = clean($input["keterangan"] ?? "");

    // var_dump($input);

    foreach ($barang as &$b) {
        if ($b["id"] == $id) {
            $old = $b["jumlah"];
            $new = $old + $tambah - $kurang;

            if ($new < 0) $new = 0;

            $b["jumlah"] = $new;

            $stok_log[] = [
                "barang_id" => $id,
                "old" => $old,
                "new" => $new,
                "keterangan" => $ket,
                "time" => date("Y-m-d H:i:s")
            ];

            write_json($barang_file, $barang);
            write_json($stok_file, $stok_log);

            echo json_encode(["success" => true]);
            exit;
        }
    }

    echo json_encode(["error" => "Barang tidak ditemukan"]);
    exit;
}
echo json_encode(["error" => "Invalid action"]);
exit;

?>
