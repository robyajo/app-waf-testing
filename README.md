# WAF Test Console — Laravel Security Monitor

Aplikasi web **khusus pengujian** untuk memverifikasi WAF
[`robyajo/laravel-security-monitor`](../laravel-security-monitor) (Bulwark).

Dibangun dengan **React + Vite** (Tailwind CSS v4). Tidak ada database, tidak ada
backend framework — hanya sebuah konsol uji satu halaman.

> ⚠️ **Hanya untuk lokal.** Jangan pernah mengekspos aplikasi ini ke internet
> publik. Alat ini bisa mengirim permintaan ke URL apa pun dengan header IP palsu.

---

## Kenapa butuh proxy sisi server?

Browser melarang JavaScript menyetel header seperti `CF-Connecting-IP`,
`X-Forwarded-For`, atau `X-Real-IP` (disebut _forbidden headers_). Padahal WAF
Bulwark justru membaca header tersebut untuk menentukan IP klien
(`SecurityMonitorService::resolveClientIp()`).

Karena itu aplikasi ini menyertakan proxy kecil di sisi server yang berjalan
sebagai **middleware dev-server Vite** (`server/proxy.js`). Frontend React
mengirim permintaan ke `POST /api/proxy`, lalu proxy tersebut yang meneruskan ke
URL target sambil menyuntikkan header IP virtual. Hasilnya: cukup satu perintah
`npm run dev`, tanpa server PHP terpisah.

Proxy mengirim permintaan memakai `node:http`/`node:https` langsung (bukan
`fetch`) agar path mentah seperti `../../etc/passwd` terkirim apa adanya dan
tidak dinormalisasi.

Proxy juga dapat membangun body **`multipart/form-data` sungguhan** dari sebuah
spesifikasi berkas (`upload`), sehingga pengujian Arbitrary File Upload /
webshell mengirim berkas nyata — bukan sekadar mensimulasikan nama berkas di URL.

---

## Menjalankan

```bash
cd app-testing
npm install
npm run dev
```

Buka `http://localhost:5175`. **Biarkan terminal ini tetap terbuka** — kalau
dev-server mati, setiap permintaan akan gagal dengan pesan jaringan.

Siapkan aplikasi target, misalnya sample `laravel-none`:

```bash
cd ../laravel-none
php artisan serve            # http://localhost:8000
```

---

## Dua tab aplikasi

Aplikasi punya dua tab di bagian atas:

1. **Konsol Uji** (tab pertama) — form permintaan, riwayat, dan panel hasil.
2. **Pengujian Serangan** (tab kedua) — menurunkan temuan dari body respons
   tab pertama (hasil `analyzeSurface`) lalu menjalankan serangan langsung per
   temuan. Seluruh komponennya ada di `src/components/attack/`.

### Cara memakai tab Pengujian Serangan

1. Kirim satu permintaan di **Konsol Uji** (mis. halaman target yang punya
   formulir/link).
2. Buka tab **Pengujian Serangan** — daftar temuan tampil di kiri (badge jumlah
   temuan ada di tab).
3. Pilih temuan, pilih field injeksi (bila lebih dari satu) dan payload — atau
   tulis payload kustom.
4. Klik **⚔ Kirim 1 Payload** atau **⚔ Uji Semua Terpilih**. Tiap serangan
   dikirim dengan **IP publik acak baru** lewat proxy dan **tidak** mengubah
   hasil di tab pertama. Status, indikator blokir, durasi, dan body tampil di
   panel kanan.
5. Bila server membalas **405 Method Not Allowed**, muncul kartu saran yang
   membaca metode yang didukung (header `Allow` atau pesan
   "Supported methods:") dan menyediakan tombol untuk mengulang serangan dengan
   metode tersebut. Status `405` (bukan `403`) menandakan WAF tidak memblokir —
   router aplikasi yang menolak.

> Temuan tanpa request konkret (komentar HTML / indikasi error) tetap tampil
> tapi tidak bisa ditembak langsung.

---

## Cara memakai

1. **URL Target** — mis. `http://localhost:8000`.
2. **Path / Query** — mis. `/` atau `/?id=1`.
3. **IP Virtual** — isi manual atau klik **🎲 IP Acak**. Kosongkan untuk IP
   publik acak otomatis. IP ini dikirim lewat header `CF-Connecting-IP`,
   `True-Client-IP`, `X-Real-IP`, dan `X-Forwarded-For`.
4. **User-Agent** — pilih preset (`Browser`, `sqlmap`, `Nikto`, `curl`).
5. **Vektor Serangan** — klik untuk mengisi path otomatis, dikelompokkan per
   kategori: **Umum** (SSTI `{{7*7}}`, `.env`, SQLi, XSS, sqlmap UA),
   **Path Traversal / LFI**, **Log Poisoning → RCE**, dan
   **File Upload / Webshell**. Memilih vektor otomatis menetapkan **metode HTTP**
   (GET untuk query/path/User-Agent, POST untuk unggah berkas) dan menampilkan
   kartu **Saran Vektor** berisi alasan metode, path, payload, ekspektasi, dan
   langkah lanjutan. Vektor unggah otomatis mengaktifkan panel unggah berkas
   (`POST` + `multipart/form-data`).
6. **Payload Body** / **Content-Type** — body opsional; Content-Type boleh
   diisi manual atau dikosongkan agar dideteksi otomatis (JSON vs form-urlencoded).
7. **Unggah Berkas** — centang untuk mengirim berkas nyata sebagai
   `multipart/form-data` (nama field, nama berkas, tipe, dan isi bisa diatur).
8. Klik **Kirim**, **🎲 Kirim + IP Acak Baru**, atau **Uji 5 IP Acak**.

### Panel hasil

- **Meta**: status, IP, durasi, ukuran, indikator blokir.
- Tab **Body / Pratinjau / Response Headers / Request Headers / Permukaan
  Serangan**.
- Tab **Pratinjau** menampilkan **iframe real** dari respons target, sehingga UI
  aplikasi target bisa dilihat langsung. Proxy menyertakan `base_url` (origin
  target) yang disuntikkan sebagai `<base href>` ke iframe, sehingga aset
  relatif (CSS/gambar/font) termuat dari server target — bukan dari dev-server.
  Tombol **⤢ Buka Penuh** membuka pratinjau yang sama dalam modal besar.
- Tab **Permukaan Serangan** menganalisis body respons dan menurunkan titik yang
  kemungkinan bisa diserang — formulir, parameter query, endpoint, titik unggah
  berkas, komentar HTML, dan indikasi pesan error. Tiap temuan menampilkan
  **metode HTTP yang direkomendasikan** beserta contoh payload (SQLi, XSS, LFI,
  SSTI, Command Injection, File Upload, dll.). Lihat `src/lib/surface.js`.
- Iframe berjalan dengan `sandbox` tanpa `allow-same-origin`, jadi HTML target
  tidak bisa mengakses storage/DOM aplikasi uji ini.

---

## Contoh skenario uji

### A. Memblokir IP manual (paling sederhana)

```bash
# Di folder laravel-none
php artisan tinker --execute 'app(\Internal\SecurityMonitor\Services\SecurityMonitorService::class)->block("203.0.113.50", ["reason" => "Uji coba", "duration_hours" => 24]);'
```

Lalu di konsol uji:

| IP Virtual     | Ekspektasi                 |
| :------------- | :------------------------- |
| `203.0.113.50` | `403 Forbidden` (diblokir) |
| IP acak baru   | `200 OK`                   |

### B. Memicu deteksi otomatis (zero-tolerance)

Pilih vektor **SSTI `{{7*7}}`** (atau `.env`, path traversal, sqlmap UA), lalu
kirim dengan IP acak. Target akan membalas `403` dan menambahkan baris ke tabel
`blocked_ips` dengan sumber `automatic`.

> **Penting — agar deteksi ikut berjalan di lokal.** Middleware
> `DetectSecurityThreats` melewati pemindaian bila `$request->ip()` termasuk
> whitelist. Secara lokal `$request->ip()` selalu `127.0.0.1` (di-whitelist),
> sehingga target harus mempercayai proxy agar IP dari header terbaca:
>
> ```php
> // laravel-none/bootstrap/app.php
> $middleware->trustProxies(at: ['127.0.0.1', '::1']);
> ```
>
> **Jangan pakai `'*'`** — daftar trust-all membuat Symfony membuang seluruh
> entri `X-Forwarded-For` dan jatuh kembali ke `REMOTE_ADDR` (jadi tetap
> `127.0.0.1`). Sampel `laravel-none` sudah dikonfigurasi seperti ini.

> Catatan: `127.0.0.1` dan `::1` ada di whitelist bawaan
> (`SECURITY_IP_WHITELIST`), sehingga **localhost tidak akan pernah diblokir** —
> itulah sebabnya header IP virtual diperlukan saat menguji.

Buka blokir:

```bash
php artisan security:unblock-ip 203.0.113.50
```

### C. Local File Inclusion (LFI)

Vektor kelompok **Path Traversal / LFI** mengirim path mentah (proxy sengaja
memakai `node:http` agar `../` tidak dinormalisasi):

| Vektor        | Path                                                           |
| :------------ | :------------------------------------------------------------- |
| `/etc/passwd` | `/../../../../etc/passwd`                                      |
| Nested trav.  | `/?file=....//....//....//....//etc/passwd`                    |
| php filter    | `/?file=php://filter/convert.base64-encode/resource=index.php` |
| environ       | `/?file=../../../../proc/self/environ`                         |
| win.ini       | `/../../../../windows/win.ini`                                 |
| null byte     | `/?file=../../../../etc/passwd%00`                             |

Ekspektasi: target membalas `403` dan mencatat IP otomatis.

### D. Log Poisoning → Remote Code Execution (RCE)

Dua langkah, keduanya tersedia sebagai vektor sekali-klik:

1. **① Poison via UA / Log4Shell UA** — kirim `User-Agent` berisi payload PHP
   (mis. `<?php system($_GET["c"]); ?>`) agar tertulis ke berkas log server
   (access log Apache/Nginx, `storage/logs/laravel.log`, atau log4j).
2. **② Apache/Nginx/Laravel log + cmd** — LFI berkas log tadi dengan parameter
   `&c=id`, mis. `/?file=../../../../var/log/apache2/access.log&c=id`, sehingga
   payload yang tersimpan di log dieksekusi.

> Middleware WAF memindai `User-Agent` dan query LFI, jadi salah satu langkah
> saja sudah memicu respons `403`.

### E. Arbitrary File Upload / Webshell

Kelompok **File Upload / Webshell** mengirim `POST` + `multipart/form-data`
berisi berkas nyata (lihat panel **Unggah Berkas**):

| Vektor           | Nama berkas     | Tipe                |
| :--------------- | :-------------- | :------------------ |
| PHP webshell     | `shell.php`     | `application/x-php` |
| PHTML shell      | `shell.phtml`   | `application/x-php` |
| PHAR shell       | `shell.phar`    | `application/x-php` |
| Double extension | `shell.php.jpg` | `image/jpeg`        |
| GIF magic shell  | `shell.php`     | `image/gif`         |
| `.htaccess`      | `.htaccess`     | `text/plain`        |
| SVG XSS          | `x.svg`         | `image/svg+xml`     |

Path contoh `/upload` hanyalah placeholder. Middleware WAF berjalan sebelum
routing, jadi pemindaian tetap terjadi walau route tidak ada (respons `404`).
Sesuaikan path dengan route unggah aplikasi target untuk pengujian end-to-end.
Field form tambahan bisa diisi lewat **Payload Body** sebagai JSON objek
(mis. `{"title":"avatar"}`) dan akan disertakan sebagai field multipart.

---

## Struktur

```
app-testing/
├── index.html
├── vite.config.js              # plugin React + Tailwind + proxy /api/proxy
├── server/
│   └── proxy.js                # proxy sisi server (penyuntik header IP)
└── src/
    ├── main.jsx
    ├── App.jsx                 # tipis: hanya menyusun komponen
    ├── index.css
    ├── hooks/
    │   └── useWafConsole.js    # seluruh state + logika jaringan
    ├── components/
    │   ├── AppHeader.jsx       # header (title, subtitle, badge)
    │   ├── AppFooter.jsx       # catatan kaki
    │   ├── AppTabs.jsx         # navigasi tab (Konsol Uji / Pengujian Serangan)
    │   ├── RequestForm.jsx     # form + vektor serangan + tombol aksi
    │   ├── VectorAdvice.jsx    # kartu saran + metode otomatis per vektor
    │   ├── ResultPanel.jsx     # meta + tab (body/pratinjau/headers/permukaan)
    │   ├── SurfacePanel.jsx    # tab analisis permukaan serangan dari body
    │   ├── PreviewFrame.jsx    # iframe pratinjau (inject <base>)
    │   ├── PreviewModal.jsx    # pratinjau layar penuh
    │   ├── HistoryTable.jsx    # tabel riwayat
    │   └── attack/             # seluruh komponen tab Pengujian Serangan
    │       ├── AttackTab.jsx         # kontainer tab + pemilihan temuan
    │       ├── AttackFindingList.jsx # daftar temuan (dari tab pertama)
    │       ├── AttackRunner.jsx      # kontrol penyusunan + eksekusi serangan
    │       ├── AttackResults.jsx     # hasil serangan per payload
    │       ├── MethodHint.jsx        # saran metode saat 405 (Allow/Supported)
    │       ├── attackBuilder.js      # temuan -> request konkret + parser 405
    │       └── useAttackRunner.js    # eksekutor rangkaian serangan
    └── lib/
        ├── ip.js               # generator IP publik acak (klien + server)
        ├── http.js             # pemetaan status → warna badge
        ├── surface.js          # analisis attack surface dari body respons
        ├── vectors.js          # preset vektor serangan (per kategori) & User-Agent
```

Arsitektur data: `useWafConsole()` menyimpan seluruh state dan mengembalikan
`{ form, result, history, tab, loading, progress, previewOpen, send, sendRaw, ... }`.
`App.jsx` menganalisis body sekali (`analyzeSurface`) untuk badge + temuan tab
kedua, lalu hanya meneruskan potongan state/aksi itu sebagai props ke komponen
UI. `sendRaw()` mengirim permintaan arbitrer tanpa menyentuh `result`/`history`,
sehingga tab Pengujian Serangan tidak mengubah temuan tab pertama.

---

## Build produksi (opsional)

```bash
npm run build     # hasil di dist/
npm run preview   # jalankan hasil build; proxy tetap aktif
```

Proxy juga terpasang di `preview` server, jadi `npm run preview` tetap berfungsi
penuh.
