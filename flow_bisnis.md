# Alur Bisnis & Arsitektur Fitur (Task Manager / Proposal Estimator)

Dokumen ini menjelaskan rancangan alur kerja menyeluruh (End-to-End Workflow) untuk aplikasi *Task Manager & Proposal Estimator*. Aplikasi ini ditujukan untuk mempermudah *freelancer*, *agency*, atau *developer* pribadi dalam memetakan cakupan kerja (JSON), menghitung estimasi biaya secara otomatis, mencetak proposal profesional, serta mengelola klien.

---

## 1. Flow Autentikasi (Start)
- **Halaman Login & Register (`/login` & `/register`)**:
  - Pengguna masuk menggunakan Email & Password (Firebase Auth) atau Google Sign-In.
  - Jika belum memiliki akun, pengguna mendaftar. Data profil awal (Nama, Email) disimpan ke Firebase Firestore di *collection* `users`.
- **Halaman Lupa Password**: Pengguna bisa mereset kata sandi melalui tautan yang dikirim via email.

---

## 2. Dashboard Utama (`/dashboard`)
*Dashboard adalah pusat kendali saat user berhasil login.*

**Fitur & Interaksi:**
- **Statistik Cepat (Hero Metrics)**: 
  - *Total Projects*: Menampilkan jumlah semua proposal/proyek.
  - *Total Revenue Estimates*: Akumulasi perkiraan pendapatan dari semua proyek.
  - *Active Clients*: Jumlah klien unik yang dilayani.
- **Tabel "Recent Projects"**:
  - Menampilkan 5 proyek terakhir yang dibuat.
  - **Aksi (Klik Baris)**: Membuka panel detail (atau *modal*) proyek.
  - **Aksi (Tombol Titik Tiga / Menu)**: Pilihan untuk *Edit*, *Delete*, *Duplicate*, atau *View Proposal*.
- **Tombol "New Project" (Sidebar & Header)**: Mengarahkan pengguna langsung ke halaman pembuatan proyek baru (`/dashboard/new-project`).

---

## 3. Alur Pembuatan Proyek Baru (`/dashboard/new-project`) - *Inti Aplikasi*
*Proses inti untuk meracik spesifikasi teknis menjadi sebuah harga proposal.*

**Fitur & Interaksi:**
- **Tahap 1: Formulir Informasi Klien & Proyek**
  - Input: Nama Proyek, Nama Klien, Nama Perusahaan, Email, No. Telp.
  - Pengaturan Harga: *Dropdown* Mata Uang (USD, IDR, dll) dan `Rate/Point` (Harga per 1 *Story Point*). Nilai *Rate/Point* ini akan diambil otomatis dari *Settings* sebagai nilai bawaan (Default).
- **Tahap 2: JSON Scope Configuration (Editor Interaktif)**
  - Sebuah teks editor (*Live Editor*) tempat pengguna memasukkan daftar modul aplikasi (misal: "Login", "Payment", dll) lengkap dengan tingkat kesulitan (*complexity*) dan jumlah bobot *Story Points* (`pts`).
  - **Fitur Upload JSON**: Tombol untuk mengunggah file `.json` dari lokal komputer (sistem mem-parsing otomatis).
  - **Live Validation**: Jika struktur JSON rusak (kurang koma, dll), muncul peringatan "Invalid JSON" dan tombol Generate dinonaktifkan.
- **Tahap 3: Live Summary (Kalkulasi Real-time)**
  - Panel di sebelah kanan yang otomatis bereaksi saat formulir atau JSON diubah.
  - Menghitung **Total Estimated Cost** = *(Total Points pada JSON) x (Rate/Point pada Form)*.
  - Menampilkan jumlah modul dan visualisasi sederhana tingkat kesulitan.
- **Tahap 4: Eksekusi (Save & Generate)**
  - Saat tombol "Generate Proposal" diklik, seluruh data form & JSON dikirim ke koleksi `projects` di Firebase Firestore.
  - *Redirect* otomatis ke halaman *Proposal Preview*.

---

## 4. Pratinjau Proposal (`/dashboard/proposal-preview`)
*Halaman untuk meninjau secara visual sebelum diekspor atau dikirim.*

**Fitur & Interaksi:**
- **Canvas Dokumen (Tengah)**: Menampilkan bentuk fisik proposal (A4 / Presentasi) dengan tata letak rapi, menggabungkan identitas klien dan total biaya dari data Firebase terbaru.
- **Sidebar Kiri (Thumbnails)**: Navigasi cepat untuk melompat antar halaman proposal (Cover, Pendahuluan, Rincian Modul, Total Harga, Tanda Tangan).
- **Sidebar Kanan (Document Settings)**:
  - Mengubah *Theme Color* proposal.
  - Mengunggah/mengganti Logo Cover (*Upload Image*).
  - *Toggle* (tombol sakelar) untuk "Show Page Numbers" atau "Include Table of Contents".
  - Saat klik "Save All Changes", akan meng-*update* *document preferences* di *database* untuk proyek tersebut.
- **Toolbar Atas (Ekspor)**:
  - Tombol **Print / Download PDF**: Memicu dialog `window.print()` untuk mengekspor dokumen HTML tersebut ke format PDF beresolusi tinggi.
  - Tombol **Share**: Membuat *public link* statis (URL khusus) yang bisa dikirim ke WhatsApp/Email klien (Opsional jika ingin klien melihat secara *online*).

---

## 5. Rincian Estimasi Biaya (`/dashboard/estimates`)
*Laporan analitik mendalam untuk sisi internal developer.*

**Fitur & Interaksi:**
- Menarik *database* proyek terbaru (atau proyek yang dipilih).
- **Metric Cards**: Menampilkan Total Budget, Total Scope (Points), Price per Point, dan kalkulasi Estimasi Durasi (misal: 10 poin = 1 minggu pengerjaan).
- **Module Breakdown Table (Tabel Modul)**:
  - Daftar rinci modul dari file JSON.
  - Menghitung Estimasi Jam (Hours) dari Points (misal 1 poin = 2 jam kerja).
  - **Fitur Search**: Kolom pencarian untuk memfilter baris modul.
- **Visualisasi Chart**:
  - *Pie Chart* statis yang mewakili porsi bobot harga antar modul.
  - *Bar Chart* jadwal mingguan (*Velocity Forecast*).

---

## 6. Manajemen Klien (`/dashboard/clients`) - *Fitur CRUD Lengkap*
*Menu tempat menyimpan semua data kontak perusahaan agar tidak perlu diketik ulang.*

**Fitur & Interaksi:**
- **Tabel Klien**: Menampilkan kolom Nama, Perusahaan, Email, Status (Aktif/Pasif), dan Total Proyek bersama mereka.
- **Create (Add Client)**: Modal *Pop-up* form untuk menambah Klien baru (disimpan di koleksi `clients` Firestore).
- **Read**: Mengeklik baris klien akan membuka halaman "Client Detail", berisi profil lengkap dan riwayat/sejarah proposal yang pernah dibuat untuk klien tersebut.
- **Update**: Mengedit informasi klien (misal: ganti email atau nomor HP).
- **Delete**: Menghapus klien (dengan peringatan konfirmasi, *soft delete* agar tidak merusak data history proyek lama).

---

## 7. Template Konfigurasi (`/dashboard/templates`)
*Tempat menyimpan struktur JSON agar bisa dipakai berulang.*

**Fitur & Interaksi:**
- *Developer* bisa menyimpan *file* JSON standar. Contoh: Template "E-Commerce App", Template "Company Profile", Template "ERP System".
- Ketika membuat *New Project*, *user* cukup memilih dari *dropdown* Template ini, dan form *JSON Editor* akan otomatis terisi. Hemat waktu.

---

## 8. Pengaturan & Profil (`/dashboard/settings`)
*Mengatur preferensi bawaan aplikasi dan manajemen akun.*

**Fitur & Interaksi:**
- **Profile Tab**: 
  - Ubah Nama Lengkap, Foto Profil (Upload ke Firebase Storage).
  - Ubah Password.
- **Preferences (App Defaults)**:
  - *Default Currency*: Mengatur mata uang utama saat membuat proyek baru (misal: diset otomatis ke `IDR (Rp)`).
  - *Default Rate/Point*: Menyimpan "Harga Standar per Poin" Anda. Jika Anda ubah di sini menjadi 1500, maka setiap masuk ke form *New Project*, angka awalnya selalu terisi 1500 otomatis.
  - *Tax/VAT % (PPN)*: Mengatur persentase pajak yang otomatis akan menambah total biaya proposal (jika diaktifkan).
- **Branding**:
  - Mengunggah "Logo Agensi Anda", Nama Agensi, Alamat, yang nantinya selalu muncul secara otomatis di Footer/Header setiap proposal PDF yang dicetak.

---

## 9. History / Audit Log (`/dashboard/history`)
*Log aktivitas aplikasi.*

- Menampilkan riwayat aksi yang terjadi secara berurutan.
- *Contoh Event*: "Proyek Fintech v3 berhasil di-generate", "Anda mengubah Default Rate menjadi 1200", "Proposal Alpha Project diekspor ke PDF".
- Bermanfaat jika kelak sistem ini dikembangkan untuk *Multi-user / Team* (bisa melihat siapa yang mengubah apa).

---

## END-TO-END WORKFLOW (Kesimpulan Alur 1 Hari Kerja)

1. Anda **Login** ke dalam aplikasi.
2. Anda mendapat permintaan pembuatan aplikasi dari klien bernama "PT Angkasa". Anda ke menu **Clients**, tambahkan data perusahaan mereka.
3. Anda ke menu **New Project**, pilih nama "PT Angkasa". Sistem menarik datanya.
4. Anda mengatur harga *Rate* Anda, dan mengunggah/mengetik spesifikasi **JSON** untuk fitur-fitur aplikasi.
5. Anda melihat **Live Summary**, harganya pas. Anda klik **Generate Proposal**.
6. Anda diarahkan ke **Proposal Preview**. Anda merapikan warna agar senada dengan logo PT Angkasa.
7. Anda menekan **Download PDF** lalu mengirimkannya ke WhatsApp mereka. 
8. Seminggu kemudian, Anda bisa mengevaluasi beban biaya di halaman **Estimates**. 
9. **Selesai**. Data tersimpan rapi selamanya di *database*.

---

## 10. Roadmap Masa Depan: Eksekusi Proyek (Task Manager)
*Pengembangan lebih lanjut agar aplikasi tidak hanya berhenti setelah proposal dikirim, melainkan digunakan untuk mengawal berjalannya proyek.*

**Konsep Hirarki Data & Harga:**
- **Project**: Menjadi payung utama (*container*) yang memiliki Total Budget (Akumulasi dari Task).
  - **Task (Modul Utama)**: Mengambil dari nama modul di JSON (contoh: "Autentikasi"). Memiliki harga turunan dari Sub-task.
    - **Sub-task (Rincian Teknis)**: Inilah level paling bawah tempat **harga dan poin** sebenarnya berada (contoh: "Setup Google Sign-in: 5 points / Rp 500.000").
    
**Fitur & Interaksi yang direncanakan:**
- **Auto-Breakdown**: Saat JSON Estimasi di-*generate*, sistem otomatis membuat kumpulan draf *Tasks* dan *Sub-tasks* di *database* agar pengguna tidak perlu mengetik ulang spesifikasi proyek.
- **Kanban Board**: Papan drag-and-drop (*To-do, In Progress, Done*) di dalam detail proyek untuk menggeser *Sub-tasks*.
- **Progress & Invoicing**: Ketika sebuah *Sub-task* bernilai Rp 500.000 digeser ke kolom "Done", persentase penyelesaian proyek naik, dan harga tersebut masuk ke dalam kalkulasi *Invoice* (tagihan) bulan ini.
