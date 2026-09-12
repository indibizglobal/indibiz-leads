# Hasil verifikasi v1.0.1 — 12 September 2026

- `npm test`: 17/17 lulus (8 tes awal + 9 tes regresi).
- `node --check core.js` dan `node --check app.js`: lulus.
- `node tests/browser.cjs`: lulus; ekstensi native dimuat di Edge headless dengan profil baru, bukan profil pengguna.
- Regresi browser: pencarian nomor lokal berformat; penggantian nomor menghapus izin; preview stale ditolak dan error terlihat di modal; fungsi pembukaan tautan diganti stub di memori dan tidak dipanggil pada preview stale.
- Backup: ekspor/impor JSON, restore utuh mempertahankan ID/riwayat/pengaturan, input rusak tidak mengubah storage, dan suppression tetap berlaku.
- Tes domain juga mencakup nomor +81/+852/+86, tanggal rollover, edit nomor internasional, konflik revisi, dan invalidasi preview ketika pengaturan berubah.
- Alur simpan/edit, reload, teks tidak tepercaya, layout panel/landscape, serta fixture Maps lulus tanpa error JavaScript.
- Screenshot tes disimpan di profil uji sementara, tidak menimpa gambar proyek.
- Tidak mengirim WhatsApp, tidak mengakses data CRM profil utama, tidak menguji ulang Maps langsung. Integrasi Meta Cloud API belum dibuat.
- Pemeriksaan format nomor bukan verifikasi nomor aktif. Nomor lama yang sudah salah dinormalisasi tidak diperbaiki dengan tebakan otomatis.

## Catatan historis — 8 September 2026

## Lulus

- 8/8 unit test: format nomor, tautan aman, deduplikasi, bukti/waktu izin, blokir setelah hapus/impor, blokir dari duplikat backup, konflik edit, template dan input tidak tepercaya, tanggal/backup tidak valid.
- Pemeriksaan sintaks JavaScript.
- Ekstensi Manifest V3 benar-benar dimuat di Microsoft Edge headless dengan profil uji terpisah.
- Simpan/edit, persistensi setelah reload, gating izin, template personal.
- Teks HTML dari input ditampilkan sebagai teks; tidak dieksekusi.
- Layout desktop, panel 375 px, landscape 812×375, reduced motion, tanpa overflow horizontal.
- Konflik penyimpanan antar-tab: editor lama tidak dapat menimpa blokir baru.
- Download backup JSON asli dan impor duplikat dengan daftar blokir tetap aktif.
- Pembaca detail Maps dengan fixture DOM (nama, telepon, alamat).
- Pembaca juga diuji pada satu profil bisnis Google Maps langsung dari pencarian kafe di Kediri: nama, nomor telepon, alamat, kategori, dan tautan terbaca; website tidak tersedia pada profil uji. Data bisnis tidak disimpan ke CRM atau dicetak dalam laporan.
- Tidak ada error JavaScript halaman selama pengujian.

## Lingkup

Tidak mengirim pesan WhatsApp. Pemasangan pada profil utama pengguna belum dilakukan. Klik ikon toolbar dan interaksi side panel secara manual pada profil utama belum diuji; layout panel diuji pada viewport 375 px. Pengujian aplikasi runtime tidak membutuhkan Google Cloud atau API key.
