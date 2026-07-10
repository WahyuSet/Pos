# 📝 Agent Notes — POSKita (Sistem POS & Pemesanan QR Code Restoran)

> **Untuk:** AI Agent selanjutnya yang melanjutkan project ini
> **Tanggal dibuat:** 2026-07-10
> **Bahasa proyek:** Indonesia (UI), TypeScript (kode)

---

## 🏗️ Ringkasan Proyek

**POSKita** adalah sistem POS (Point of Sale) restoran berbasis web dengan fitur pemesanan mandiri pelanggan via scan QR Code meja. Dibangun sebagai monorepo Turborepo.

### Tech Stack
| Layer | Teknologi |
|-------|-----------|
| Monorepo | Turborepo + pnpm Workspaces |
| Backend | NestJS (TypeScript) — apps/server |
| Frontend | Next.js 16 App Router (TypeScript) — apps/web |
| Database | SQLite via Prisma ORM — packages/database/prisma/dev.db |
| State | Zustand (persist) + TanStack Query (server state) |
| Realtime | Socket.IO WebSocket (Gateway) |
| Styling | Vanilla CSS (CorpScale Design System — Navy #1E3A5F) |
| Auth | JWT + Passport + RBAC Guard |

### Cara Menjalankan
`powershell
# WAJIB set env sebelum jalankan dev:
$env:DATABASE_URL="file:g:/Project/post/packages/database/prisma/dev.db"
$env:JWT_SECRET="poskitasecretkeyforauthentication"
pnpm dev
`

- NestJS Server: http://localhost:3001
- Next.js Web: http://localhost:3000

### Catatan Penting: Setelah Ubah Prisma Schema
Jika mengubah packages/database/prisma/schema.prisma, **wajib urutan ini:**
1. pnpm --filter @repo/database db:push
2. pnpm --filter @repo/database build
3. pnpm --filter @repo/server build
4. Baru pnpm dev

Jika tidak dilakukan, NestJS akan error MODULE_NOT_FOUND.

---

## 📁 Struktur Direktori Penting

`
g:/Project/post/
├── apps/
│   ├── server/src/
│   │   ├── auth/          — JWT, Guards, Decorators
│   │   ├── restaurant/    — CRUD meja, pengaturan pembayaran & pajak
│   │   ├── menu/          — CRUD kategori & menu, upload foto
│   │   ├── order/         — Buat pesanan, update status, get order
│   │   ├── payment/       — Simulasi pembayaran digital
│   │   └── gateway/       — Socket.IO WebSocket gateway
│   └── web/src/
│       ├── app/
│       │   ├── page.tsx                    — Halaman utama (landing)
│       │   ├── login/page.tsx              — Login form
│       │   ├── order/page.tsx              — Pemesanan customer (QR → menu → keranjang)
│       │   ├── order/status/page.tsx       — Status pesanan + konfirmasi + tracker
│       │   ├── dashboard/admin/page.tsx    — Panel admin
│       │   ├── dashboard/cashier/page.tsx  — Dashboard kasir
│       │   └── dashboard/kitchen/page.tsx  — Dashboard dapur (KDS)
│       └── lib/
│           ├── api.ts    — Semua fungsi API client
│           ├── store.ts  — Zustand store (cart + auth)
│           └── socket.ts — Hook useSocket WebSocket
└── packages/
    ├── database/prisma/
    │   ├── schema.prisma — Schema Prisma (SQLite)
    │   ├── seed.ts       — Data demo
    │   └── dev.db        — File database SQLite lokal
    └── types/src/index.ts — Shared TypeScript enums & interfaces
`

---

## ✅ Fitur yang SUDAH ADA

### Admin Panel (/dashboard/admin)
- Tab Menu: CRUD menu hidangan (tambah, edit, hapus, toggle ketersediaan)
  - Upload foto menu lokal → disimpan ke apps/server/uploads/
  - Filter berdasarkan kategori + pencarian teks real-time
- Tab Kategori: CRUD kategori (edit inline)
- Tab Meja: CRUD nomor meja + QR link, edit inline
- Tab Pengaturan:
  - Toggle metode bayar: Tunai, E-Wallet, QRIS, Transfer Bank
  - Toggle Pajak PPN + input tarif PPN (1%-10%)

### Customer Order (/order?tableId=[ID])
- Tampil daftar menu, filter kategori
- Toggle tampilan List / Grid 2 kolom
- Keranjang belanja persisten (Zustand + localStorage)
- Checkout modal: item + catatan per-item + pilih metode bayar
- Rincian harga: Subtotal, Pajak PPN, Total

### Status Pesanan Customer (/order/status)
- Section Konfirmasi (muncul di atas saat PENDING_PAYMENT):
  - Ringkasan item + PPN + total + metode bayar
  - Tombol "Ya, Pesanan Sudah Benar" → tracker aktif
  - Tombol "Batalkan & Pesan Ulang" → redirect ke menu meja
- Tracker Status 4 langkah (Menunggu Bayar → Diterima → Dimasak → Siap)
- Instruksi bayar: Info kasir (Cash) atau Simulasi Bayar (Digital)
- Real-time via WebSocket

### Kasir Dashboard (/dashboard/cashier)
- 3 tab: Belum Bayar, Antrean Aktif, Selesai
- Tombol aksi: Konfirmasi Lunas, Kirim Dapur, Siap Saji, Tutup
- Real-time via WebSocket

### Dapur Dashboard (/dashboard/kitchen)
- KDS mode gelap, daftar pesanan sedang dimasak
- Tombol "Selesai Dimasak" → update ke READY
- Real-time via WebSocket

### Pajak PPN Dinamis
- DB: Restaurant.enableTax + Restaurant.taxRate (Float, default 10.0)
- Backend hitung PPN inklusif saat createOrder
- Frontend tampilkan breakdown di: cart, checkout, konfirmasi, status

---

## ❌ Fitur yang BELUM ADA / Kurang

### 🔴 KRITIS — Harus Dibangun

1. **QR Code Generator yang Nyata**
   - qrCodeUrl hanya teks /order?tableId=... belum jadi gambar QR
   - Solusi: Pakai library qrcode.react, generate QR image di tab meja admin

2. **Pengaturan Profil Restoran**
   - Admin tidak bisa ubah nama restoran, alamat, telepon dari dashboard
   - Solusi: Form update profil di tab Settings + endpoint PATCH /restaurants/:id

3. **Laporan & Rekap Transaksi**
   - Tidak ada laporan penjualan (per hari, per menu, total pendapatan)
   - Solusi: Tab "Laporan" di admin dengan chart dan tabel rekap

4. **Manajemen User / Staff**
   - Admin tidak bisa tambah/edit/hapus akun kasir atau dapur
   - User hanya bisa dibuat via seed.ts
   - Solusi: Tab "Staff" di admin untuk CRUD user + endpoint POST /restaurants/:id/users

5. **Multi-tenant / Multi-restoran**
   - Sistem hanya handle 1 restoran (seed hanya buat 1 data)
   - Solusi: Flow registrasi restoran baru, routing per restaurantId

### 🟡 PENTING — Perlu Ditingkatkan

6. **Pembatalan Pesanan oleh Customer**
   - "Batalkan & Pesan Ulang" hanya redirect, pesanan lama tetap di DB (PENDING_PAYMENT)
   - Solusi: Endpoint @Public() POST /orders/:orderId/cancel untuk customer

7. **Validasi Meja Sudah Ada Pesanan Aktif**
   - Customer bisa buat pesanan baru walau meja sudah punya PENDING/PAID/PROCESSING
   - Solusi: Cek pesanan aktif saat loadmeja, redirect ke status pesanan aktif

8. **Notifikasi Audio/Visual di Kasir & Dapur**
   - Tidak ada alert saat pesanan baru masuk
   - Solusi: Sound alert + badge animasi saat order baru

9. **Validasi Ukuran Upload Foto Menu**
   - Upload foto tidak ada batas ukuran file
   - Solusi: Tambah limits fileSize di Multer config server

10. **Pagination**
    - Semua data diload sekaligus (pesanan, menu)
    - Solusi: Offset/cursor pagination di GET /orders dan GET /menus

### 🟢 NICE TO HAVE

11. Print Struk / Receipt — halaman /receipt/:orderId print-friendly
12. Dark Mode — CSS variables untuk dark mode + toggle
13. Riwayat Pesanan Customer — simpan orderId di localStorage
14. Estimasi Waktu Masak — field menit di Menu
15. Search Menu di Halaman Customer — saat ini hanya filter kategori
16. Payment Gateway Nyata — Midtrans/Xendit untuk QRIS, E-Wallet, Bank Transfer

---

## 🗄️ Database Schema (Ringkasan)

`
Restaurant
  ├── id, name, address, phone
  ├── enableCash, enableQris, enableEWallet, enableBankTransfer
  ├── enableTax (Boolean, default false)
  └── taxRate (Float, default 10.0)

User (Staff)
  └── role: OWNER | MANAGER | CASHIER | KITCHEN | WAITER

Table
  └── number, qrCodeUrl (path teks, belum gambar QR)

Category → menus[]

Menu → orderItems[]
  └── imageUrl (URL eksternal ATAU /uploads/filename.ext jika upload lokal)

Order
  ├── status: PENDING_PAYMENT | PAID | PROCESSING | READY | COMPLETED | CANCELLED
  ├── totalAmount (INKLUSIF pajak jika enableTax=true)
  └── orderItems[], payments[]

Payment
  ├── method: CASH | E_WALLET | QRIS | BANK_TRANSFER
  └── status: PENDING | SUCCESS | FAILED
`

---

## 🔑 Akun Demo (dari seed.ts)

| Role | Username | Password |
|------|----------|----------|
| Admin/Owner | admin | password123 |
| Kasir | kasir | password123 |
| Dapur | dapur | password123 |

---

## 🌐 API Endpoints Penting

### Public (tanpa JWT):
- POST /auth/login
- GET /restaurants/:id
- GET /restaurants/tables/:tableId
- GET /restaurants/:id/tables
- GET /restaurants/:id/categories
- GET /restaurants/:id/menus
- POST /restaurants/:id/orders
- GET /restaurants/:id/orders/:orderId
- POST /restaurants/:id/orders/:orderId/simulate-payment

### Protected (butuh JWT Bearer token):
- PATCH /restaurants/:id/payment-settings  (Owner/Manager)
- PATCH /restaurants/:id/orders/:orderId/status  (Kasir/Dapur)
- POST /restaurants/:id/menus/upload  (Owner/Manager)
- CRUD /restaurants/:id/menus/:menuId
- CRUD /restaurants/:id/categories/:categoryId
- CRUD /restaurants/:id/tables/:tableId

---

## ⚠️ Gotchas & Bug yang Perlu Diketahui

1. Port konflik: error "Another next dev server already running" → taskkill /F /IM node.exe, tunggu 2 detik, pnpm dev lagi

2. MODULE_NOT_FOUND di NestJS: Terjadi setelah ubah Prisma schema tanpa rebuild server → wajib: pnpm --filter @repo/server build

3. "sseError not found" di browser console: Error dari ekstensi Chrome (kripto wallet), BUKAN dari kode proyek, aman diabaikan.

4. totalAmount INKLUSIF pajak: untuk dapatkan subtotal, hitung sum(orderItems.price * quantity).

5. Pembatalan pesanan customer: hanya redirect, pesanan tetap di DB. Kasir harus cancel manual dari dashboard.

6. File upload gambar: tersimpan di apps/server/uploads/, diakses via /uploads/filename. Tidak ada cleanup file lama saat menu dihapus.

---

## 🚀 Quick Start untuk Agent Baru

`powershell
# Set environment variables
$env:DATABASE_URL="file:g:/Project/post/packages/database/prisma/dev.db"
$env:JWT_SECRET="poskitasecretkeyforauthentication"

# Jalankan dev server
pnpm dev
`

URL:
- http://localhost:3000 — Landing page
- http://localhost:3000/login — Login staff
- http://localhost:3000/order?tableId=[ID] — Pemesanan customer (dapat tableId dari DB)

---

*Dibuat oleh AI Agent — 2026-07-10*
