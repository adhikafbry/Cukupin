# 💙 Cukupin

**Hari ini boleh habis berapa?**

Cukupin adalah website budgeting sederhana yang dirancang khusus untuk membantu mahasiswa, terutama anak rantau, dalam mengelola keuangan sehari-hari. Website ini membantu pengguna mengetahui batas pengeluaran harian berdasarkan saldo yang tersedia, biaya tetap yang belum dibayar, dan jumlah hari hingga uang kiriman berikutnya.

Dengan Cukupin, kamu bisa mengatur pengeluaran dengan lebih terencana tanpa harus merasa ribet mencatat keuangan.

## ✨ Fitur Utama

### 1. Pengaturan Keuangan
- Mengatur nominal uang kiriman.
- Mencatat daftar biaya tetap bulanan.
- Mengatur status pembayaran biaya tetap.
- Menentukan tanggal kiriman berikutnya.

### 2. Daily Spending Allowance
- Menghitung jatah pengeluaran harian secara otomatis.
- Menyesuaikan jatah berdasarkan saldo dan biaya tetap yang belum dibayar.
- Memperbarui jatah setiap ada transaksi dan pergantian hari.
- Memberikan indikator kondisi keuangan melalui warna hijau, kuning, dan merah.

### 3. Pencatatan Pengeluaran
- Menambahkan pengeluaran melalui tombol "+ Jajan".
- Memilih kategori pengeluaran: makan, transportasi, nongkrong, dan lainnya.
- Menambahkan catatan pengeluaran.
- Mengedit dan menghapus riwayat transaksi.

### 4. Prediksi dan Pengelolaan Keuangan
- Memperkirakan kecukupan uang hingga tanggal tertentu berdasarkan rata-rata pengeluaran harian.
- Mengelola pemasukan tambahan.
- Menyesuaikan tanggal kiriman berikutnya.
- Memulai siklus keuangan baru dengan opsi membawa sisa saldo sebelumnya.

### 5. Visualisasi dan Pengaturan
- Grafik perbandingan jatah dan pengeluaran harian.
- Export dan import data sebagai file JSON.
- Dark mode dengan dukungan preferensi sistem.
- Penyimpanan data menggunakan browser localStorage.

## 🎨 Design Concept

Cukupin menggunakan desain minimalis dengan nuansa biru yang bersih, modern, dan menenangkan. Tampilan dirancang menggunakan pendekatan mobile-first dan responsive agar nyaman digunakan melalui smartphone maupun laptop.

## 🛠️ Technologies Used

- **HTML5** — Struktur halaman website.
- **CSS3** — Styling, layout, responsive design, dan dark mode.
- **Vanilla JavaScript** — Logika perhitungan dan interaksi website.
- **Chart.js** — Visualisasi grafik pengeluaran.
- **Google Fonts (Plus Jakarta Sans)** — Tipografi website.
- **LocalStorage** — Penyimpanan data secara lokal pada browser.

## 📂 Project Structure

```text
Cukupin/
├── index.html
├── style.css
├── script.js
└── README.md
```

## 💡 Important Notes

- Website tidak memerlukan backend maupun database eksternal.
- Data pengguna disimpan secara lokal menggunakan browser localStorage.
- Data tersimpan pada browser dan perangkat yang digunakan, sehingga tidak otomatis tersinkronisasi ke perangkat lain.
- Pengguna dapat menggunakan fitur export dan import untuk mencadangkan serta memulihkan data.
