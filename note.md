# 📝 Agent Notes — POSKita (Sistem POS & Pemesanan QR Code Restoran)

> **Untuk:** AI Agent selanjutnya yang melanjutkan project ini
> **Tanggal dibuat:** 2026-07-10
> **Bahasa proyek:** Indonesia (UI), TypeScript (kode)

---

## 🆕 Update Log

**2026-07-10** — Fokus prioritas: workflow single-tenant harus solid dulu sebelum fitur baru/multi-tenant (lihat memori project). Lima hal dibangun:
- **Voucher/diskon persentase** — tab admin baru, validasi penuh backend (aktif/tanggal/minimal belanja/kuota), diterapkan di checkout customer, redemption atomik race-safe. (Exception yang diminta eksplisit user, di luar prioritas polish workflow.)
- **QR Code generator nyata** — tab Meja admin, gambar QR (qrcode.react) client-side, unduh PNG, salin link. (Exception juga.)
- **Pembatalan pesanan customer** — endpoint publik `POST .../orders/:orderId/cancel`, hanya untuk order `PENDING_PAYMENT`, dashboard kasir otomatis update via WebSocket. (Bagian dari polish workflow 🟡 Penting.)
- **Notifikasi audio/visual order baru** — bunyi beep (Web Audio API, sintesis, tanpa file asset) + pulse visual di kasir (tab "Belum Bayar") dan dapur (highlight card order yang baru dikirim ke dapur). (Bagian dari polish workflow 🟡 Penting.)
- **Validasi upload foto menu** — batas 2MB + validasi tipe MIME (gambar saja), pesan error Bahasa Indonesia, pre-check di client. (Bagian dari polish workflow 🟡 Penting.)

**Keputusan menunda Pagination** (item 🟡 Penting lain di daftar yang sama): riset menemukan data masih kecil (7 menu, 0 order di seed) dan menu sudah pakai search+filter client-side yang butuh data lengkap sekaligus — pagination di situ justru merusak search tanpa manfaat nyata. Order history ("Riwayat Selesai" kasir) yang berpotensi membengkak seiring waktu (tidak pernah dibersihkan), tapi user memilih menunda sampai itu benar-benar terasa jadi masalah nyata, bukan dikerjakan preventif. Kalau nanti dikerjakan, fokuskan ke situ saja (bukan GET /menus — lihat detail alasan di atas).

Detail lengkap masing-masing ada di commit history repo (`WahyuSet/Pos` di GitHub) dan tercermin di bagian ✅/❌ di bawah.

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
│   │   ├── order/         — Buat pesanan, update status, get order, cancel pesanan
│   │   ├── payment/       — Simulasi pembayaran digital
│   │   ├── voucher/       — CRUD voucher, validasi & redeem kode diskon
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
│           ├── api.ts          — Semua fungsi API client
│           ├── store.ts        — Zustand store (cart + auth)
│           ├── socket.ts       — Hook useSocket WebSocket
│           └── notification.ts — Sintesis bunyi beep (Web Audio API) untuk alert order baru
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
  - Upload foto menu lokal → disimpan ke apps/server/uploads/, maksimal 2MB, harus tipe gambar (JPG/PNG/WEBP/GIF) — divalidasi di server (`fileFilter`+`limits.fileSize`, pesan Indonesia) dan pre-check di client
  - Filter berdasarkan kategori + pencarian teks real-time
- Tab Kategori: CRUD kategori (edit inline)
- Tab Meja / QR Code: CRUD nomor meja, edit inline, tombol "Lihat QR" → modal gambar QR code asli (qrcode.react, generate client-side), tombol Unduh PNG dan Salin Link
- Tab Voucher: CRUD kode voucher diskon persentase (kode, persen diskon, cap maksimal nominal, minimal belanja, tanggal mulai/berakhir, kuota pemakaian, toggle aktif/nonaktif)
- Tab Pengaturan:
  - Toggle metode bayar: Tunai, E-Wallet, QRIS, Transfer Bank
  - Toggle Pajak PPN + input tarif PPN (1%-10%)

### Customer Order (/order?tableId=[ID])
- Tampil daftar menu, filter kategori
- Toggle tampilan List / Grid 2 kolom
- Keranjang belanja persisten (Zustand + localStorage)
- Checkout modal: item + catatan per-item + pilih metode bayar + input Kode Voucher (validasi instan via endpoint publik)
- Rincian harga: Subtotal, Diskon Voucher (jika ada kode diterapkan), Pajak PPN (dihitung dari subtotal setelah diskon), Total

### Status Pesanan Customer (/order/status)
- Section Konfirmasi (muncul di atas saat PENDING_PAYMENT):
  - Ringkasan item + diskon voucher (jika ada) + PPN + total + metode bayar
  - Tombol "Ya, Pesanan Sudah Benar" → tracker aktif
  - Tombol "Batalkan & Pesan Ulang" → memanggil API cancel (order jadi CANCELLED di DB), lalu redirect ke menu meja
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

### Notifikasi Audio/Visual Order Baru
- Kasir: bunyi beep saat `ORDER_CREATED` masuk + tombol tab "Belum Bayar" pulsing (animate-pulse + ring amber), hilang saat tab diklik
- Dapur: bunyi beep saat order berstatus `PROCESSING` masuk (dikirim dari kasir) + ring hijau pulsing pada card order terkait, hilang otomatis ~5 detik
- Suara disintesis via Web Audio API (`apps/web/src/lib/notification.ts`), tidak pakai file asset — aman dari masalah lisensi/ukuran bundle, gagal senyap kalau audio diblokir browser
- Auto-unlock `AudioContext` pada klik pertama di halaman (`unlockAudioOnFirstClick`), jaga-jaga kalau dashboard di-refresh tanpa login ulang (auth persisted via Zustand)

### Pajak PPN Dinamis
- DB: Restaurant.enableTax + Restaurant.taxRate (Float, default 10.0)
- Backend hitung PPN inklusif saat createOrder
- Frontend tampilkan breakdown di: cart, checkout, konfirmasi, status

---

## ❌ Fitur yang BELUM ADA / Kurang

> Item **QR Code Generator Nyata**, **Pembatalan Pesanan oleh Customer**, **Notifikasi Audio/Visual di Kasir & Dapur**, dan **Validasi Ukuran Upload Foto Menu** sudah selesai dibangun (lihat 🆕 Update Log di bawah) dan dihapus dari daftar ini. Item **Validasi Meja Sudah Ada Pesanan Aktif** juga dihapus — dikonfirmasi user 2026-07-10 bahwa satu meja memang boleh punya lebih dari satu pesanan aktif sekaligus (skenario grup pelanggan pesan sendiri-sendiri), jadi itu bukan bug.

### 🔴 KRITIS — Harus Dibangun

1. **Pengaturan Profil Restoran**
   - Admin tidak bisa ubah nama restoran, alamat, telepon dari dashboard
   - Solusi: Form update profil di tab Settings + endpoint PATCH /restaurants/:id

2. **Laporan & Rekap Transaksi**
   - Tidak ada laporan penjualan (per hari, per menu, total pendapatan)
   - Solusi: Tab "Laporan" di admin dengan chart dan tabel rekap

3. **Manajemen User / Staff**
   - Admin tidak bisa tambah/edit/hapus akun kasir atau dapur
   - User hanya bisa dibuat via seed.ts
   - Solusi: Tab "Staff" di admin untuk CRUD user + endpoint POST /restaurants/:id/users

4. **Multi-tenant / Multi-restoran**
   - Sistem hanya handle 1 restoran (seed hanya buat 1 data)
   - Solusi: Flow registrasi restoran baru, routing per restaurantId

### 🟡 PENTING — Perlu Ditingkatkan

5. **Pagination (ditunda sengaja — lihat 🆕 Update Log)**
   - Semua data diload sekaligus (pesanan, menu). Menu cuma 7 item dan sudah pakai search+filter client-side (butuh data lengkap, jangan paginate GET /menus tanpa rework search jadi server-side dulu). Order history ("Riwayat Selesai" kasir) yang berpotensi membengkak seiring waktu — itu satu-satunya target yang masuk akal kalau dikerjakan nanti.
   - Solusi (kalau/waktu dikerjakan): offset pagination + tombol "Muat Lebih Banyak" khusus di GET /orders untuk tab Riwayat Selesai kasir, bukan rewrite semua endpoint sekaligus

### 🟢 NICE TO HAVE

6. Print Struk / Receipt — halaman /receipt/:orderId print-friendly
7. Dark Mode — CSS variables untuk dark mode + toggle
8. Riwayat Pesanan Customer — simpan orderId di localStorage
9. Estimasi Waktu Masak — field menit di Menu
10. Search Menu di Halaman Customer — saat ini hanya filter kategori
11. Payment Gateway Nyata — Midtrans/Xendit untuk QRIS, E-Wallet, Bank Transfer
12. Flash Sale / Diskon per-Menu — voucher saat ini hanya persentase di seluruh subtotal, belum per-item/kategori

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
  └── number, qrCodeUrl (path teks /order?tableId=...; gambar QR di-generate client-side di admin via qrcode.react, tidak disimpan sebagai file/binary)

Category → menus[]

Menu → orderItems[]
  └── imageUrl (URL eksternal ATAU /uploads/filename.ext jika upload lokal)

Voucher
  ├── code (unik per restoran, disimpan uppercase+trimmed)
  ├── discountPercent, maxDiscountAmount (opsional cap nominal), minPurchaseAmount
  ├── startsAt, expiresAt (opsional), maxRedemptions (opsional), usedCount
  └── isActive

Order
  ├── status: PENDING_PAYMENT | PAID | PROCESSING | READY | COMPLETED | CANCELLED
  ├── totalAmount (INKLUSIF pajak jika enableTax=true, DIHITUNG SETELAH diskon voucher)
  ├── voucherCode, discountAmount (snapshot, bukan foreign key ke Voucher)
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
- POST /restaurants/:id/orders/:orderId/cancel  (hanya berhasil kalau status masih PENDING_PAYMENT)
- POST /restaurants/:id/vouchers/validate  (cek kode voucher, tanpa efek samping)

### Protected (butuh JWT Bearer token):
- PATCH /restaurants/:id/payment-settings  (Owner/Manager)
- PATCH /restaurants/:id/orders/:orderId/status  (Kasir/Dapur)
- POST /restaurants/:id/menus/upload  (Owner/Manager)
- CRUD /restaurants/:id/menus/:menuId
- CRUD /restaurants/:id/categories/:categoryId
- CRUD /restaurants/:id/tables/:tableId
- CRUD /restaurants/:id/vouchers/:voucherId  (Owner/Manager)

---

## ⚠️ Gotchas & Bug yang Perlu Diketahui

1. Port konflik: error "Another next dev server already running" → taskkill /F /IM node.exe, tunggu 2 detik, pnpm dev lagi

2. MODULE_NOT_FOUND di NestJS: Terjadi setelah ubah Prisma schema tanpa rebuild server → wajib: pnpm --filter @repo/server build

3. "sseError not found" di browser console: Error dari ekstensi Chrome (kripto wallet), BUKAN dari kode proyek, aman diabaikan.

4. totalAmount INKLUSIF pajak: untuk dapatkan subtotal, hitung sum(orderItems.price * quantity).

5. Pembatalan pesanan customer sudah pakai API sungguhan (POST .../orders/:orderId/cancel), tapi hanya berlaku selama order masih PENDING_PAYMENT — kalau kasir sudah proses duluan (race condition), request cancel akan ditolak 400 dan customer harus refresh untuk lihat status terbaru. Tidak ada tombol cancel manual di dashboard kasir.

6. File upload gambar: tersimpan di apps/server/uploads/, diakses via /uploads/filename. Tidak ada cleanup file lama saat menu dihapus. Maksimal 2MB, harus tipe gambar (JPG/PNG/WEBP/GIF) — divalidasi di `menu.controller.ts` (Multer `limits`+`fileFilter`) dan `upload-size.filter.ts` (pesan 413 Bahasa Indonesia).

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
