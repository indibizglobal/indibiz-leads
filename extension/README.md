# Prospek Lokal — IndiBiz v1.0.2

## Pembaruan penting 12 September 2026

- Backup source sebelum perbaikan tersedia di folder `C:\Users\ASUS\indibiz-leads-backups\20260912-144422`. Ini backup kode, bukan data prospek browser.
- Untuk memakai pembaruan: download backup JSON data terlebih dahulu, tutup tab/panel CRM lama, klik **Reload / Muat ulang** pada ekstensi di `chrome://extensions`, lalu buka kembali. Jangan uninstall ekstensi.
- Nomor internasional harus menggunakan `+` atau `00` dan kode negara. Nomor Indonesia tetap menerima `08...` / `8...` / `62...`. Pemeriksaan ini hanya format, bukan verifikasi nomor aktif/terdaftar WhatsApp. Nomor yang sudah salah tersimpan oleh versi lama harus diperiksa manual; aplikasi tidak menebak nomor aslinya.
- Mengganti nomor menghapus bukti dan waktu izin lama. Simpan nomor baru dahulu, lalu buka detail lagi untuk mencatat izin baru. Status jangan hubungi tetap dipertahankan.
- Preview ditolak bila data kontak, izin, atau pengaturan pengirim berubah. Buat preview ulang; error tampil di dalam dialog.
- Pencarian menerima nomor lokal berformat seperti `0812-3456-7890`.
- **Pulihkan backup utuh** mengganti prospek, ID, tanggal, riwayat, dan pengaturan dari backup valid. Daftar jangan hubungi sekarang tetap digabungkan agar pemulihan backup lama tidak membuka blokir. Buat backup data sekarang sebelum menggantinya.
- Storage diperiksa sebelum dibaca/ditulis. Data tidak valid ditolak, tidak dihapus otomatis. Pemulihan dari UI membutuhkan storage saat ini masih dapat dibaca; storage rusak memerlukan pemeriksaan terpisah agar data tidak tertimpa.
- Tidak ada integrasi Meta Cloud API atau auto-send. Server health opsional hanya mendengarkan `127.0.0.1:3000`; CRM tetap memakai storage browser, bukan server. Izin host hanya endpoint lokal tersebut.

Ekstensi Chrome/Edge yang bekerja di browser lokal. **Tanpa Google Cloud, API key, server, npm install, dan biaya hosting.** Aplikasi tidak mengirim pesan otomatis.

## Pasang (sekitar 2 menit)

1. Ekstrak ZIP bila menggunakan paket unduhan. Jangan pindahkan folder setelah ekstensi dipasang.
2. Buka `chrome://extensions` di Chrome atau `edge://extensions` di Edge melalui address bar.
3. Aktifkan **Developer mode / Mode pengembang**.
4. Klik **Load unpacked / Muat yang dibongkar**. Pilih folder yang langsung berisi `manifest.json`:

   `C:\Users\ASUS\indibiz-leads\extension`

   Jika ZIP diekstrak ke lokasi lain, gunakan folder hasil ekstraksi tersebut.
5. Pin ekstensi **Prospek Lokal — IndiBiz** melalui menu ekstensi browser.
6. Buka Google Maps lalu klik ikon **Prospek Lokal**. Panel tampil di samping Maps. Tombol **Buka dashboard penuh** menampilkan CRM di tab terpisah.

Chrome minimum 116; disarankan Chrome/Edge desktop terbaru. Browser lain, termasuk browser Electron, belum diuji dan tidak dijamin mendukung Side Panel API. Kebijakan browser kantor dapat membatasi pemasangan ekstensi.

## Alur penggunaan

1. **Pesan & identitas**: isi nama sales, nama badan usaha/mitra yang sebenarnya, dan template. Harga/paket tidak diisi otomatis karena perlu verifikasi.
2. **Prospek**: isi kategori (misalnya kafe) dan wilayah (Kediri), lalu **Cari di Maps**.
3. Di tab Maps, buka **satu profil bisnis**, bukan hanya daftar pencarian. Klik ikon ekstensi pada tab tersebut, lalu **Baca bisnis yang dibuka**.
4. Review nama, telepon, alamat, kategori, website, dan tautan Maps. Wilayah hanya dibaca bila alamat menyebut Kota/Kabupaten secara jelas; jika tidak, isi saat review. Data yang tidak tersedia dibiarkan kosong. Klik **Simpan prospek**. Bisa juga **Tambah manual**.
5. Gunakan filter nama/nomor/wilayah, status, dan antrean follow-up. Nomor Indonesia dinormalisasi ke format 62. Nomor/alamat yang sama ditahan sebagai duplikat untuk ditinjau, termasuk kemungkinan nomor bersama antar cabang.
6. Saat sudah mendapatkan izin WhatsApp, buka **Detail / edit**, pilih **Sudah ada izin**, isi **sumber/bukti** dan **waktu persetujuan**. Nomor publik dari Maps tidak otomatis memiliki izin. Aplikasi mencatat keterangan operator, bukan memverifikasi bukti ke layanan eksternal.
7. Klik **Draf WhatsApp**, review/edit pesan, lalu **Buka WhatsApp Web**. Anda tetap memeriksa penerima dan menekan **Kirim** sendiri. Membuka draf tidak mengubah status menjadi terkirim.
8. Catat hasil, status, dan tanggal follow-up. Jika menerima STOP/penolakan, klik **Jangan hubungi** secara manual. Nomor yang diblokir tidak dapat diaktifkan kembali dari formulir biasa atau impor backup.

## Penyimpanan dan backup

- Data menggunakan `chrome.storage.local` di profil tempat ekstensi dipasang. Tidak ada backend, sinkronisasi, analytics, atau unggahan otomatis.
- Google Maps serta pembukaan WhatsApp merupakan akses eksternal atas klik pengguna; nomor dan teks draf diteruskan ke WhatsApp saat tombolnya diklik.
- Backup: **Backup & bantuan → Download backup JSON**. Simpan di lokasi pribadi; file berisi kontak dan bukti izin. Aplikasi tidak menyediakan enkripsi tambahan.
- **Gabungkan backup** memvalidasi file terlebih dahulu, menambahkan prospek unik, melewati duplikat tanpa menimpa data lama, serta menggabungkan semua nomor jangan hubungi. Pengaturan pengirim dan riwayat lama tidak diimpor; pengaturan dapat disalin manual dari file backup. Batas impor 10 MB / 20.000 prospek.
- Riwayat perubahan tercatat dalam backup JSON. Konflik edit antar-tab ditolak; buka ulang prospek sebelum menyimpan.
- Menghapus prospek tidak menghapus nomor dari daftar jangan hubungi. Menghapus ekstensi atau profil dapat menghapus seluruh data, termasuk blokir; buat backup sebelum tindakan tersebut.
- Kuota penyimpanan mengikuti browser. Jika penyimpanan gagal, aplikasi menampilkan error dan tidak menutup formulir sebagai sukses.
- Membuka `index.html` langsung dari File Explorer hanya merupakan **mode pratinjau mandiri**. Datanya terpisah dari ekstensi dan tidak dapat membaca Maps; gunakan ekstensi untuk alur lengkap.

## Batasan yang disengaja

- Satu profil Maps per tindakan operator; tidak ada auto-scroll, scraping massal, rotasi akun/IP, atau bypass CAPTCHA.
- Tidak ada WA blast, auto-send, pembacaan balasan, validasi akun WhatsApp, atau jaminan nomor terdaftar WhatsApp.
- Tidak ada pemeriksaan coverage IndiBiz, harga langsung, atau klaim akun bebas pembatasan.
- Pembacaan Maps bergantung pada struktur halaman; jika Google mengubah tampilan, gunakan input manual dan perbarui pembaca.
- Mendukung domain `www.google.com/maps` dan `www.google.co.id/maps`. Bila halaman tidak terbaca, gunakan Google Maps pada salah satu domain itu.
- Penggunaan dan penyimpanan data tetap mengikuti [ketentuan Google Maps](https://www.google.com/help/terms_maps/) dan [kebijakan WhatsApp Business](https://business.whatsapp.com/policy). Ekstensi ini bukan produk resmi Google/WhatsApp.

## Troubleshooting

**Tombol baca gagal:** pastikan tab aktif adalah profil bisnis Maps. Klik ikon ekstensi di tab Maps sekali lagi untuk memberi izin sementara `activeTab`. Jangan membaca dari tab dashboard penuh. Refresh Maps jika tampilannya belum selesai dimuat.

**Tidak ada nomor:** profil mungkin tidak mencantumkan telepon atau elemen belum selesai dimuat; periksa manual. Nomor kosong tidak dianggap kesalahan dan tidak ditebak.

**Draf WhatsApp nonaktif:** periksa nomor, izin, sumber, waktu, status tidak berminat, dan daftar jangan hubungi. Isi identitas pengirim dahulu.

**Panel tidak muncul:** periksa versi Chrome/Edge, ikon ekstensi, dan pesan error di halaman Extensions. Jangan membuka folder ZIP tanpa ekstraksi.

## Verifikasi pengembang

Runtime aplikasi tidak membutuhkan dependency. `npm test` menjalankan uji domain/regresi, manifest, dan DOM Maps. `node --check app.js` memeriksa sintaks.

Dependency pengujian Playwright dipin di package-lock.json. Dari folder extension, jalankan `npm ci` (pengembang saja), `npm test`, `npm run test:browser`, lalu `npm run test:live`. Tes memakai Microsoft Edge lokal dan profil sementara terpisah, bukan profil utama. Tes live hanya membuka satu profil Alinea Kediri, tidak menyimpan data atau mengirim pesan. Runtime ekstensi tidak membutuhkan npm.

Implementasi akses tab menggunakan [Chrome activeTab](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab) dan [scripting API](https://developer.chrome.com/docs/extensions/reference/api/scripting), tanpa izin akses permanen ke seluruh situs.

## Perbaikan capture 1.0.2

- Manifest fisik divalidasi parser JSON; MV3, tanpa BOM atau izin situs luas.
- Baca hanya profil `/maps/place/` aktif; hasil pencarian, heading tersembunyi, dan feed ditolak.
- Selector semantic, aria-label, tel, dan data-item-id dipakai dengan scope profil. Kategori tidak ditebak dari tombol acak.
- Nomor lokal/internasional dinormalisasi sebelum masuk form agar tidak menjadi `++62` atau `+08`.
- Error izin tab, tab bukan Maps, loading, nama kosong, dan struktur DOM dibedakan. Log hanya kode error, bukan kontak.
- Server opsional: dari folder server jalankan `npm ci`, `npm start`; uji dengan `npm test`. Endpoint `/health` bukan penyimpanan CRM dan tidak menerima kiriman kontak.
