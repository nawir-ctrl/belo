# SMARTBELL LOCAL — Sistem Bel Otomatis Sekolah Berbasis Web Lokal

Aplikasi sistem bel sekolah otomatis modern, tangguh, dan *offline-first* yang berjalan sepenuhnya pada satu komputer lokal (*single-machine architecture*). Sistem ini dirancang khusus untuk memutar file audio MP3/WAV secara tepat waktu melalui amplifier atau speaker sekolah tanpa ketergantungan pada internet, layanan cloud, maupun database online.

---

## 📋 Daftar Isi

1. [Fitur Utama](#-fitur-utama)
2. [Arsitektur Sistem](#-arsitektur-sistem)
3. [Persyaratan Perangkat Lunak & Keras](#-persyaratan-perangkat-lunak--keras)
4. [Panduan Instalasi Cepat](#-panduan-instalasi-cepat)
5. [Menjalankan Aplikasi](#-menjalankan-aplikasi)
6. [Halaman Pemutar Bel (`/player`) & Pengaturan Speaker](#-halaman-pemutar-bel-player--pengaturan-speaker)
7. [Panduan Operasional Harian](#-panduan-operasional-harian)
8. [Panduan Auto-Start & Kiosk Mode](#-panduan-auto-start--kiosk-mode)
   - [Debian / Ubuntu Linux (systemd)](#a-debian--ubuntu-linux-systemd-service)
   - [Windows (Task Scheduler & Batch)](#b-windows-task-scheduler--kiosk-mode)
9. [Backup & Pemulihan Data (Restore)](#-backup--pemulihan-data-restore)
10. [Panduan Troubleshooting](#-panduan-troubleshooting)

---

## ✨ Fitur Utama

- **Offline-First 100%**: Tidak memerlukan koneksi internet, Google Fonts runtime, CDN eksternal, maupun autentikasi cloud.
- **Backend Scheduler Mandiri**: Menggunakan Node.js background process dengan zona waktu lokal (default **WITA - Asia/Makassar**, mendukung WIB dan WIT).
- **Deduplikasi Mutlak**: Menghasilkan tepat 1 *occurrence* unik per jadwal dengan batasan `UNIQUE` di database SQLite untuk mencegah suara berbunyi ganda.
- **Toleransi Catch-Up Cerdas**: Mengantisipasi komputer mati tanpa memutar tumpukan bel lama sekaligus saat komputer dinyalakan kembali.
- **Manajemen Hari Libur & Periode Khusus**: Mendukung kalender hari libur nasional dan periode khusus (Ramadan, Ujian Sekolah) dengan prioritas otomatis.
- **Halaman Pemutar Khusus (`/player`)**: Tampilan layar penuh (*kiosk-ready*) dengan jam digital raksasa, indikator animasi saat berdering, dan mekanisme pembuka proteksi autoplay browser yang andal.
- **Manajemen Audio Persisten**: Simpan MP3/WAV di direktori aman `data/audio/`, pratinjau langsung, dan deteksi ketergantungan jadwal sebelum penghapusan.
- **Ekspor & Impor CSV**: Kemudahan memindahkan atau mencadangkan jadwal sekolah dalam format spreadsheet CSV.
- **Backup & Restore Terintegrasi**: Satu klik unduh arsip ZIP lengkap yang memuat database SQLite dan semua file audio.

---

## 🏛️ Arsitektur Sistem

Aplikasi berjalan pada satu komputer sekolah yang bertindak sebagai:
1. **Server Web Lokal**: Next.js App Router (Port 3000 di `127.0.0.1`).
2. **Database Lokal**: SQLite persisten di `data/smartbell.db`.
3. **Penyimpan Media**: Direktori lokal di `data/audio/`.
4. **Mesin Scheduler**: Background worker Node.js (`src/scheduler/worker.ts`).
5. **Pemutar Audio**: Browser pada halaman `http://127.0.0.1:3000/player` yang terhubung ke kabel audio jack 3.5mm amplifier sekolah.

---

## 💻 Persyaratan Perangkat Lunak & Keras

### Perangkat Lunak:
- **Node.js**: Versi 18.x, 20.x, atau 22+ (LTS direkomendasikan).
- **NPM**: Versi 9+ atau 10+.
- **Sistem Operasi**: Windows 10/11, Debian 11/12, Ubuntu 20.04/22.04/24.04, atau Linux lainnya.
- **Web Browser**: Google Chrome, Microsoft Edge, atau Mozilla Firefox.

### Perangkat Keras:
- PC / Laptop / Mini PC (dapat dinyalakan selama jam sekolah).
- Kabel Aux / Jack Audio 3.5mm ke RCA/Jack Amplifier.
- Unit Amplifier & Speaker Corong/Plafon Sekolah.

---

## 🚀 Panduan Instalasi Cepat

### 1. Ekstrak atau Buka Folder Proyek
```bash
cd /d/PROJECT/BELO
```

### 2. Pasang Seluruh Dependensi
```bash
npm install
```

### 3. Konfigurasi Environment
Salin template konfigurasi `.env.example` ke `.env`:
```bash
cp .env.example .env
```
Isi konfigurasi standar pada `.env`:
```env
PORT=3000
HOST=127.0.0.1
DATABASE_URL="file:../data/smartbell.db"
JWT_SECRET=kunci_rahasia_lokal_sekolah_32_karakter_acak
DEFAULT_TIMEZONE=Asia/Makassar
AUDIO_DIR=data/audio
BACKUP_DIR=data/backups
SCHEDULER_CHECK_INTERVAL_SEC=10
SCHEDULER_MAX_CATCHUP_MINUTES=5
```

### 4. Inisialisasi Database SQLite & Migrasi
```bash
npx prisma db push
```

### 5. Jalankan Seeder Awal (Opsional - Sangat Direkomendasikan)
Perintah ini akan membuat pengaturan default, menghasilkan nada lonceng bawaan, mendaftarkan hari libur contoh, dan template 6 jadwal sekolah reguler:
```bash
npm run db:seed
```
*Kredensial bawaan hasil seed:*
- **Username**: `admin`
- **Password**: `AdminSmartBell123!`

### 6. Membuat Akun Administrator Sendiri (Opsional)
Jika ingin membuat akun admin baru atau mengganti password admin tanpa hardcoded value:
```bash
npm run setup:admin
```
Atau berikan argumen langsung:
```bash
npx tsx scripts/setup-admin.ts admin RahasiaSekolah2026! "Nama Operator"
```

---

## 🏃 Menjalankan Aplikasi

### Mode Lengkap (Server Web + Background Scheduler Worker)

Gunakan perintah satu langkah berikut untuk menjalankan server Next.js dan scheduler worker secara bersamaan:

```bash
# Mode Produksi
npm run start:all

# Mode Pengembangan (Hot Reload)
npm run dev:all
```

Jika ingin menjalankan kedua proses secara terpisah di terminal yang berbeda:
- **Terminal 1 (Web Server)**: `npm start` (atau `npm run dev`)
- **Terminal 2 (Scheduler Worker)**: `npm run scheduler`

Buka browser:
- **Dashboard Admin**: `http://127.0.0.1:3000`
- **Halaman Pemutar Bel**: `http://127.0.0.1:3000/player`

---

## 📢 Halaman Pemutar Bel (`/player`) & Pengaturan Speaker

Halaman `/player` adalah halaman khusus yang bertugas memutar suara MP3 ke speaker:

1. Sambungkan kabel jack audio komputer ke input amplifier sekolah.
2. Buka browser ke alamat `http://127.0.0.1:3000/player`.
3. Klik tombol **"Aktifkan Audio Sekarang"**.
   > **Mengapa wajib diklik?** Seluruh browser modern (Chrome, Edge, Safari) memiliki kebijakan keamanan (*Autoplay Policy*) yang memblokir pemutaran audio otomatis tanpa izin interaksi pengguna pertama kali. Tombol ini membuka izin tersebut secara sah.
4. Klik tombol **"Tes Suara Speaker"** untuk memastikan suara terdengar jelas di speaker sekolah.
5. Atur slider volume pada layar dan kenop volume pada amplifier sekolah.
6. Biarkan tab browser `/player` tetap terbuka sepanjang jam sekolah.

---

## ⚙️ Panduan Operasional Harian

### 1. Menambah Jadwal Bel Baru
1. Masuk ke menu **Jadwal Bel** (`/schedules`).
2. Klik tombol **"Tambah Jadwal"**.
3. Isi nama kegiatan, jam (format 24 jam `HH:mm`), pilih hari aktif (Senin s/d Jumat), jenis bel, dan file audio.
4. Tentukan pengulangan (misal 2x untuk bel masuk) dan jeda pengulangan.
5. Klik **Simpan Jadwal**.

### 2. Mengunggah Lagu / Nada Bel Baru
1. Masuk ke menu **Manajemen Audio** (`/audio`).
2. Pilih file MP3 atau WAV dari komputer sekolah (maksimum 50MB).
3. Beri nama tampilan (misal: "Lagu Masuk Kelas").
4. Klik **Simpan Audio**. Anda dapat menekan tombol play untuk mendengarkan pratinjau audio kapan saja.

### 3. Mengatur Hari Libur
1. Masuk ke menu **Pengaturan** > tab **Kalender Libur**.
2. Masukkan tanggal dan nama libur.
3. Seluruh bel otomatis tidak akan berbunyi pada hari libur tersebut.

---

## 🔄 Panduan Auto-Start & Kiosk Mode

### A. Debian / Ubuntu Linux (systemd service)

1. Salin file service yang telah disediakan:
   ```bash
   sudo cp scripts/systemd/smartbell.service /etc/systemd/system/
   ```
2. Sesuaikan username dan path direktori di `/etc/systemd/system/smartbell.service` jika diperlukan:
   ```ini
   User=operator
   WorkingDirectory=/home/operator/smartbell
   ```
3. Muat ulang daemon dan aktifkan service:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable smartbell
   sudo systemctl start smartbell
   ```
4. Cek status service:
   ```bash
   sudo systemctl status smartbell
   ```

### B. Windows (Task Scheduler & Kiosk Mode)

1. File script startup telah disediakan di `scripts/windows/start-smartbell.bat`.
2. Buka menu **Task Scheduler** di Windows:
   - Pilih **Create Basic Task...**
   - Nama: `SmartBell Auto-Start`
   - Trigger: **When the computer starts** atau **When I log on**
   - Action: **Start a program**
   - Program/script: Arahkan ke `D:\PROJECT\BELO\scripts\windows\start-smartbell.bat`
3. Membuka Halaman Pemutar Layar Penuh (Kiosk Mode):
   - Gunakan file `scripts/windows/start-kiosk-player.bat` yang akan membuka Chrome/Edge dalam mode `--kiosk` langsung ke `http://127.0.0.1:3000/player`.

---

## 💾 Backup & Pemulihan Data (Restore)

### Melakukan Backup:
1. Buka menu **Pengaturan** > tab **Backup & Restore**.
2. Klik tombol **"Unduh Arsip Backup ZIP"**.
3. File `.zip` yang diunduh memuat database `smartbell.db`, seluruh file MP3, dan `manifest.json`.

### Melakukan Restore:
1. Buka menu **Pengaturan** > tab **Backup & Restore**.
2. Pilih file ZIP cadangan yang telah dibuat sebelumnya.
3. Konfirmasi peringatan penimpaan data. Sistem akan memulihkan database dan seluruh audio secara utuh.

---

## 🛠️ Panduan Troubleshooting

| Masalah | Penyebab Umum | Solusi |
|---|---|---|
| Suara bel tidak terdengar di speaker | Halaman `/player` belum dibuka atau audio belum diaktifkan | Buka `http://127.0.0.1:3000/player` dan klik tombol **"Aktifkan Audio"**. Pastikan amplifier menyala dan kabel jack terpasang. |
| Status scheduler di dashboard berwarna merah (Berhenti) | Background worker scheduler tidak berjalan | Pastikan perintah `npm run start:all` sedang aktif di terminal, atau jalankan `npm run scheduler`. |
| Bel tidak berbunyi pada hari ini | Tanggal hari ini terdaftar di kalender hari libur | Periksa menu **Pengaturan** > **Kalender Libur**. Jika bukan hari libur resmi, hapus tanggal tersebut. |
| Port 3000 bentrok atau sudah digunakan | Aplikasi lain menggunakan port 3000 | Ubah `PORT=3001` di file `.env` dan akses aplikasi di `http://127.0.0.1:3001`. |
| Bel berbunyi terlambat setelah komputer baru dinyalakan | Komputer mati saat jam bel tiba | SmartBell menerapkan batas *catch-up* (default 5 menit). Bel yang terlewat lebih dari 5 menit akan ditandai *SKIPPED* agar tidak memutar bel lama secara tiba-tiba. |

---

## 🧪 Menjalankan Pengujian (Unit Tests)

Untuk memverifikasi keakuratan mesin scheduler, penanganan zona waktu, deduplikasi, dan validasi audio:

```bash
npm test
```

Semua pengujian berjalan deterministik menggunakan simulasi waktu tanpa ketergantungan jam nyata.

---

**SmartBell Local** — Dibuat untuk keandalan maksimal sekolah di seluruh Indonesia.
