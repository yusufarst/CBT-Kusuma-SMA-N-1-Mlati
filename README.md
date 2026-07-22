# CBT KUSUMA - Computer Based Test Platform
**SMA Negeri 1 Mlati, Sleman — Daerah Istimewa Yogyakarta**

Platform Ujian Digital Terproteksi Berbasis Komputer & Mobile (BYOD) yang dilengkapi dengan **Anti-Cheating Engine**, **Screen Lock Engine**, serta **Dashboard Pengawas Ujian berbasis Ruangan (Real-time Proctoring)**.

---

## 🌟 Fitur Utama

- 📱 **Mobile-First & BYOD Ready:** Optimal untuk Smartphone (Android/iOS), Tablet, maupun PC Lab Sekolah.
- 🛡️ **Anti-Cheating Engine:** Deteksi pindah tab/aplikasi, keluar *fullscreen*, DevTools, & pintasan keyboard dilarang.
- 🔒 **Screen Lock Engine & Kode Unlock 6-Digit:** Penguncian layar otomatis di level server ketika pelanggaran melampaui batas (3x). Pembukaan kunci via Kode 6-Digit Harian atau Dashboard Pengawas.
- 👨‍🏫 **Dashboard Pengawas Per Ruangan:** Monitoring status siswa per ruang ujian secara real-time via WebSocket dengan notifikasi suara/visual instant.
- 🏛️ **Branding Resmi SMAN 1 Mlati:** Tampilan ujian bersih, elegan, dan profesional khusus SMA Negeri 1 Mlati.

---

## 🚀 Cara Menjalankan (Pengembangan Lokal)

1. **Clone repository ini:**
   ```bash
   git clone https://github.com/yusufarst/CBT-Kusuma-SMA-N-1-Mlati.git
   cd CBT-Kusuma-SMA-N-1-Mlati
   ```

2. **Install dependensi:**
   ```bash
   npm install
   ```

3. **Salin file variabel lingkungan:**
   ```bash
   cp .env.example .env
   ```

4. **Jalankan server:**
   ```bash
   node server.js
   ```

5. Buka di browser: `http://localhost:3000`

---

## 🔒 Lisensi & Hak Cipta
Hak Cipta © 2026 **SMA Negeri 1 Mlati, Sleman**.
