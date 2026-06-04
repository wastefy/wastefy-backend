# wastefy-backend

REST API untuk aplikasi **Wastefy** — platform manajemen stok makanan berbasis AI yang membantu pengguna memantau kondisi dan masa simpan bahan makanan.

---

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js v5
- **Auth:** Firebase Admin SDK (token-based)
- **AI Service:** Hugging Face Space (vision & shelf-life prediction)
- **Email:** Nodemailer
- **Deployment:** Vercel

---

## Struktur Proyek

```
wastefy-backend/
├── config/
│   ├── firebase.js          # Inisialisasi Firebase Admin & FCM
│   └── mailer.js            # Konfigurasi Nodemailer
├── controllers/
│   ├── authController.js    # Register, login, profil, OTP
│   ├── inventoryController.js # CRUD stok, scan AI, summary
│   └── notificationController.js # FCM token & riwayat notif
├── middleware/
│   ├── authMiddleware.js    # Verifikasi Firebase ID token
│   └── validateMiddleware.js # Validasi request body
├── models/
│   ├── userModel.js
│   ├── inventoryModel.js
│   ├── notificationModel.js
│   └── otpModel.js
├── routes/
│   ├── authRoutes.js
│   ├── inventoryRoutes.js
│   └── notificationRoutes.js
├── services/
│   └── aiService.js         # Integrasi AI vision & prediksi
├── data/
│   └── sayurBuah.js         # Data referensi item
├── public/
│   └── index.html
├── server.js
├── vercel.json
└── .env
```

---

## Instalasi & Menjalankan

### 1. Clone repo

```bash
git clone https://github.com/wastefy/wastefy-backend.git
cd wastefy-backend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Konfigurasi environment

Buat file `.env` di root project:

```env
PORT=3000
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
AI_SERVICE_URL=your_ai_service_url
```

### 4. Konfigurasi Firebase

Letakkan file `serviceAccountKey.json` (dari Firebase Console → Project Settings → Service Accounts) di root project.

### 5. Jalankan server

```bash
# Development (dengan auto-reload)
npm run dev

# Production
npm start
```

Server berjalan di `http://localhost:3000`

---

## API Endpoints

Semua endpoint yang memerlukan autentikasi menggunakan **Firebase ID Token** di header:

```
Authorization: Bearer <firebase_id_token>
```

### Auth — `/api/auth`

| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| POST | `/register` | ✗ | Daftar akun baru |
| POST | `/login` | ✓ | Login & verifikasi token |
| GET | `/profile` | ✓ | Ambil profil pengguna |
| PUT | `/profile` | ✓ | Update profil |
| PUT | `/change-password` | ✓ | Ganti password |
| POST | `/forgot-password` | ✗ | Kirim OTP reset password |
| POST | `/verify-otp` | ✗ | Verifikasi OTP |
| POST | `/reset-password` | ✗ | Reset password baru |
| POST | `/resend-verification` | ✗ | Kirim ulang verifikasi |
| POST | `/logout` | ✓ | Logout |
| DELETE | `/account` | ✓ | Hapus akun |

### Inventory — `/api/inventory`

| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| GET | `/` | ✓ | Ambil semua stok aktif |
| POST | `/` | ✓ | Tambah item baru |
| GET | `/:id` | ✓ | Detail item |
| PUT | `/:id` | ✓ | Update item |
| DELETE | `/:id` | ✓ | Hapus item |
| PATCH | `/:id/used` | ✓ | Tandai item sebagai terpakai |
| PATCH | `/:id/wasted` | ✓ | Tandai item sebagai dibuang |
| PATCH | `/:id/restore` | ✓ | Kembalikan item ke stok |
| GET | `/history` | ✓ | Riwayat item |
| GET | `/summary` | ✓ | Ringkasan inventori |
| GET | `/expiring` | ✓ | Item yang mendekati kedaluwarsa |
| POST | `/refresh-status` | ✓ | Perbarui status semua item |
| POST | `/scan` | ✓ | Scan gambar dengan AI (multipart/form-data) |
| GET | `/scan-quota` | ✓ | Cek kuota scan AI |
| GET | `/search` | ✗ | Cari referensi item |

### Notifications — `/api/notifications`

| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| POST | `/token` | ✓ | Simpan FCM token |
| DELETE | `/token` | ✓ | Hapus FCM token |
| GET | `/history` | ✓ | Riwayat notifikasi |
| PATCH | `/:id/read` | ✓ | Tandai notifikasi dibaca |
| POST | `/check` | ✓ | Trigger cek item kedaluwarsa |

---

## Deployment (Vercel)

Proyek ini sudah dikonfigurasi untuk Vercel via `vercel.json`. Pastikan environment variables (`PORT`, `EMAIL_USER`, `EMAIL_PASS`, `AI_SERVICE_URL`) ditambahkan di dashboard Vercel → Settings → Environment Variables.

```bash
vercel --prod
```

---

