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

## Cara memakai

1. **URL Target** — mis. `http://localhost:8000`.
2. **Path / Query** — mis. `/` atau `/?id=1`.
3. **IP Virtual** — isi manual atau klik **🎲 IP Acak**. Kosongkan untuk IP
   publik acak otomatis. IP ini dikirim lewat header `CF-Connecting-IP`,
   `True-Client-IP`, `X-Real-IP`, dan `X-Forwarded-For`.
4. **User-Agent** — pilih preset (`Browser`, `sqlmap`, `Nikto`, `curl`).
5. **Vektor Serangan** — klik untuk mengisi path otomatis (SSTI `{{7*7}}`,
   `.env`, path traversal, double extension, SQLi, XSS, null byte, sqlmap UA).
6. Klik **Kirim**, **🎲 Kirim + IP Acak Baru**, atau **Uji 5 IP Acak**.

### Panel hasil

- **Meta**: status, IP, durasi, ukuran, indikator blokir.
- Tab **Body / Pratinjau / Response Headers / Request Headers**.
- Tab **Pratinjau** menampilkan **iframe real** dari respons target, sehingga UI
  aplikasi target bisa dilihat langsung. Proxy menyertakan `base_url` (origin
  target) yang disuntikkan sebagai `<base href>` ke iframe, sehingga aset
  relatif (CSS/gambar/font) termuat dari server target — bukan dari dev-server.
  Tombol **⤢ Buka Penuh** membuka pratinjau yang sama dalam modal besar.
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
    │   ├── RequestForm.jsx     # form + vektor serangan + tombol aksi
    │   ├── ResultPanel.jsx     # meta + tab (body/pratinjau/headers)
    │   ├── PreviewFrame.jsx    # iframe pratinjau (inject <base>)
    │   ├── PreviewModal.jsx    # pratinjau layar penuh
    │   └── HistoryTable.jsx    # tabel riwayat
    └── lib/
        ├── ip.js               # generator IP publik acak (klien + server)
        ├── http.js             # pemetaan status → warna badge
        └── vectors.js          # preset vektor serangan & User-Agent
```

Arsitektur data: `useWafConsole()` menyimpan seluruh state dan mengembalikan
`{ form, result, history, tab, loading, progress, previewOpen, send, ... }`.
`App.jsx` hanya meneruskan potongan state/aksi itu sebagai props ke komponen UI.

---

## Build produksi (opsional)

```bash
npm run build     # hasil di dist/
npm run preview   # jalankan hasil build; proxy tetap aktif
```

Proxy juga terpasang di `preview` server, jadi `npm run preview` tetap berfungsi
penuh.
