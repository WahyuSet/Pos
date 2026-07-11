# 📝 Agent Notes — POSKita (Sistem POS & Pemesanan QR Code Restoran)

> **Untuk:** AI Agent selanjutnya yang melanjutkan project ini
> **Tanggal dibuat:** 2026-07-10
> **Bahasa proyek:** Indonesia (UI), TypeScript (kode)

---

## 🆕 Update Log

**2026-07-12** — **Manajemen User/Staff** (item 🔴 KRITIS #1, sekarang selesai): tab "Staff" baru di admin dashboard untuk CRUD akun kasir/dapur/pelayan/manajer — sebelumnya user cuma bisa dibuat lewat `seed.ts`.
- Backend: modul baru `apps/server/src/user/` (`user.module.ts`/`user.controller.ts`/`user.service.ts`/`dto/user.dto.ts`), tiga endpoint di bawah `@Roles(OWNER, MANAGER)`: `POST/GET/PATCH /restaurants/:id/users`. Role yang boleh di-assign dibatasi ke `MANAGER|CASHIER|KITCHEN|WAITER` lewat `@IsIn(ASSIGNABLE_ROLES)` di DTO (bukan `@IsEnum(Role)`) — OWNER/SUPER_ADMIN tidak bisa dibuat/di-assign dari endpoint ini sama sekali, divalidasi di layer DTO jadi tidak bisa di-bypass lewat request langsung.
- **Nonaktifkan, bukan hapus permanen**: tambah kolom `User.isActive` (`Boolean @default(true)`, migrasi via `prisma db push`), tombol Aktifkan/Nonaktifkan di tabel Staff — keputusan eksplisit user untuk konsistensi dengan pola `Voucher.isActive` yang sudah ada, dan menghindari resiko hapus permanen yang salah sasaran. **Tidak ada endpoint/tombol hapus staff.**
- Dua guard keamanan di `UserService.updateUser`: **self-lockout** (OWNER/MANAGER tidak bisa nonaktifkan akun sendiri → 400) dan **privilege-escalation** (siapapun tidak bisa mengelola akun yang role-nya OWNER/SUPER_ADMIN lewat endpoint ini, walau tahu `userId`-nya → 403) — diverifikasi manual keduanya lewat API dengan akun MANAGER baru.
- **Enforcement `isActive` di dua tempat**: saat login (`AuthService.login`, setelah password valid supaya tidak bocorkan status akun ke penebak password salah → 401 "Akun tidak aktif, hubungi admin") **dan** per-request lewat `JwtStrategy.validate` (lookup `User` by ID dari `payload.sub` di setiap request terautentikasi) — tanpa yang kedua, staff yang baru dinonaktifkan tetap bisa pakai token lama sampai 24 jam (`accessToken` tidak pernah di-refresh dari frontend). Diverifikasi: token yang didapat **sebelum** dinonaktifkan langsung ditolak 401 (bukan 403) begitu status berubah, membuktikan pemotongan token real-time, bukan cuma blokir login baru.
- **Endpoint publik `POST /auth/register` dihapus total** (controller/service/DTO/`api.ts`) — sebelumnya endpoint ini bisa dipanggil siapa saja tanpa login, pemanggilnya bebas pilih role apapun (termasuk OWNER/SUPER_ADMIN) dan `restaurantId` manapun (celah keamanan nyata), dan tidak pernah dipakai dari UI manapun. Staff baru sekarang cuma bisa dibuat lewat endpoint admin yang di-gate role.
- Diverifikasi end-to-end via API: create staff (201, response tanpa `passwordHash`), reject role OWNER/SUPER_ADMIN & password < 6 karakter (400), login staff baru (200), role CASHIER ditolak akses endpoint admin (403), nonaktifkan staff → login staff itu ditolak (401) dan token lama langsung invalid (401), self-lockout OWNER/MANAGER (403/400 tergantung target), privilege-escalation MANAGER→OWNER (403), `/auth/register` sekarang 404, regresi endpoint voucher masih normal. Typecheck (`server`+`web`) dan `nest build` bersih.
- **Catatan**: role `WAITER` bisa dibuat lewat tab Staff ini tapi belum punya dashboard route sendiri (`apps/web/src/app/login/page.tsx` fallback ke `/`) — di luar scope task ini, dicatat sebagai known limitation.

**2026-07-11** — **Laporan & Rekap Transaksi** (item 🔴 KRITIS #1, sekarang selesai) — tab "Laporan" baru di admin dashboard: kartu ringkasan (total pendapatan, total pesanan, rata-rata/pesanan), chart pendapatan harian (custom CSS bar chart, **tanpa library chart baru** — keputusan eksplisit user untuk konsisten dengan project yang full vanilla CSS), tabel menu terlaris (top 10), dan rekap per metode pembayaran. Kontrol rentang tanggal: quick-select (Hari Ini/7 Hari/30 Hari) + date input manual, default 7 hari terakhir.
- Backend: modul baru `apps/server/src/report/` (`report.module.ts`/`report.controller.ts`/`report.service.ts`), satu endpoint `GET /restaurants/:id/reports/summary?from=&to=` (`@Roles(OWNER, MANAGER)`), agregasi dilakukan in-memory (bukan raw SQL `groupBy`) — konsisten dengan alasan penundaan pagination project ini ("data masih kecil").
- **Temuan penting yang mempengaruhi desain**: pembayaran cash dikonfirmasi kasir lewat `updateOrderStatus` (generic status PATCH), yang **hanya update `Order.status`, tidak pernah menyentuh `Payment.status`/`paidAt`** — jadi untuk transaksi cash, `Payment.status` selamanya `PENDING` walau order-nya sudah lunas. Laporan **filter berdasarkan `Order.status`** (PAID/PROCESSING/READY/COMPLETED), **bukan** `Payment.status` — kalau nanti ada fitur lain yang butuh "status pembayaran sukses", jangan asumsikan `Payment.status === SUCCESS` reliable untuk cash. Tanggal transaksi pakai `Order.createdAt` (bukan `Payment.paidAt` yang null untuk cash).
- Diverifikasi via API: total pendapatan bertambah tepat sesuai order baru untuk **kedua** jalur pembayaran (cash via `updateOrderStatus` dan digital via `simulatePayment`), role kasir/dapur ditolak 403, range custom/kosong/1-hari semua diuji tanpa error.

**2026-07-11** — **Search menu di halaman customer** (item 🟢 Nice-to-have): input pencarian baru di `/order` (ikon kaca pembesar + tombol clear), digabung (AND) dengan filter kategori yang sudah ada, match nama/deskripsi menu case-insensitive. Murni client-side, tidak ada perubahan backend (data menu memang sudah di-load penuh). Pesan "tidak ada menu" dibedakan antara kategori kosong vs pencarian tidak ketemu.

**2026-07-11** — **Fix: catatan per-item customer tidak tersimpan**: input catatan di modal checkout (`apps/web/src/app/order/page.tsx`) sebelumnya uncontrolled (`defaultValue` + commit di `onBlur`) — kalau customer ketik catatan lalu langsung tap tombol "Buat Pesanan & Bayar" tanpa nge-tap area lain dulu, event blur bisa kalah timing dengan klik tombol (terutama di sejumlah browser/keyboard mobile), catatan hilang sebelum sempat tersimpan ke cart. Diubah jadi controlled input (`value` + `onChange`) yang commit ke store Zustand di setiap ketikan — race condition hilang total. Backend & rendering di dashboard kasir/dapur sudah benar sejak awal (diverifikasi via API langsung sebelum menyimpulkan ini bug frontend, bukan backend).

**2026-07-11** — **Tunda status PENDING_PAYMENT sampai customer konfirmasi**: sebelumnya order langsung dibuat di DB (status `PENDING_PAYMENT`, langsung terlihat kasir) begitu customer klik "Buat Pesanan & Bayar" di modal checkout, dan cart langsung dikosongkan — jadi kalau customer batal di halaman konfirmasi berikutnya, mereka harus pilih ulang semua menu dari nol. Sekarang order **baru dibuat di DB saat customer klik "Ya, Pesanan Sudah Benar"** di halaman `/order/status` (mode draft, sourced dari cart + draft lokal, bukan dari order yang sudah ada). Kalau batal dari situ, tidak ada panggilan API sama sekali (belum ada apa pun untuk dibatalkan) dan cart tetap utuh saat kembali ke menu. Detail lengkap di bagian "Status Pesanan Customer" di bawah. Perubahan murni di frontend (`apps/web/src/lib/store.ts`, `apps/web/src/app/order/page.tsx`, `apps/web/src/app/order/status/page.tsx`) — tidak ada perubahan backend/schema. Diverifikasi: typecheck bersih, `api.createOrder`/`clearCart` dikonfirmasi hanya dipanggil dari satu tempat (tombol konfirmasi), dan alur `createOrder`/`cancelOrder` backend diuji ulang via API tetap berfungsi sama seperti sebelumnya.

**2026-07-11** — **Pengaturan Profil Restoran** (item 🔴 KRITIS #1) selesai dibangun: admin sekarang bisa ubah nama, alamat, dan telepon restoran langsung dari tab Pengaturan di dashboard admin (sebelumnya hanya bisa lewat seed.ts). Endpoint baru `PATCH /restaurants/:id` (role OWNER/MANAGER), mengikuti pola persis `updatePaymentSettings` yang sudah ada. Diverifikasi via API: update tersimpan & persist, role kasir ditolak 403, request tanpa token ditolak 401.

**2026-07-10** — Fokus prioritas: workflow single-tenant harus solid dulu sebelum fitur baru/multi-tenant (lihat memori project). Enam hal dibangun:
- **Voucher/diskon persentase** — tab admin baru, validasi penuh backend (aktif/tanggal/minimal belanja/kuota), diterapkan di checkout customer, redemption atomik race-safe. (Exception yang diminta eksplisit user, di luar prioritas polish workflow.)
- **QR Code generator nyata** — tab Meja admin, gambar QR (qrcode.react) client-side, unduh PNG, salin link. (Exception juga.)
- **Pembatalan pesanan customer** — endpoint publik `POST .../orders/:orderId/cancel`, hanya untuk order `PENDING_PAYMENT`, dashboard kasir otomatis update via WebSocket. (Bagian dari polish workflow 🟡 Penting.)
- **Notifikasi audio/visual order baru** — bunyi beep (Web Audio API, sintesis, tanpa file asset) + pulse visual di kasir (tab "Belum Bayar") dan dapur (highlight card order yang baru dikirim ke dapur). (Bagian dari polish workflow 🟡 Penting.)
- **Validasi upload foto menu** — batas 2MB + validasi tipe MIME (gambar saja), pesan error Bahasa Indonesia, pre-check di client. (Bagian dari polish workflow 🟡 Penting.)
- **Cetak Nota (print receipt)** — halaman `/receipt?orderId=...&restaurantId=...`, tombol "Cetak Nota" di kasir untuk order PAID/PROCESSING/READY/COMPLETED, reuse `getOrder` yang sudah ada (tanpa endpoint baru). (Exception yang diminta eksplisit user, item 🟢 Nice-to-have yang dipercepat.)

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
│       │   ├── receipt/page.tsx            — Nota print-friendly (dibuka dari dashboard kasir)
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
  - Profil Restoran: ubah nama, alamat, telepon
- Tab Laporan: kartu ringkasan (total pendapatan, total pesanan, rata-rata/pesanan), chart pendapatan harian (custom CSS), tabel menu terlaris, rekap per metode pembayaran. Kontrol rentang tanggal quick-select (Hari Ini/7 Hari/30 Hari) + date input manual.
- Tab Staff: CRUD akun kasir/dapur/pelayan/manajer (username, nama, password, role), toggle Aktifkan/Nonaktifkan (bukan hapus permanen — tidak ada tombol Hapus). OWNER/SUPER_ADMIN tidak bisa dibuat/dikelola dari tab ini.

### Customer Order (/order?tableId=[ID])
- Tampil daftar menu, filter kategori + search teks (nama/deskripsi, client-side, digabung AND dengan filter kategori)
- Toggle tampilan List / Grid 2 kolom
- Keranjang belanja persisten (Zustand + localStorage)
- Checkout modal: item + catatan per-item (controlled input, commit tiap ketikan — bukan onBlur) + pilih metode bayar + input Kode Voucher (validasi instan via endpoint publik)
- Rincian harga: Subtotal, Diskon Voucher (jika ada kode diterapkan), Pajak PPN (dihitung dari subtotal setelah diskon), Total
- Tombol "Buat Pesanan & Bayar" **tidak langsung membuat order di DB** — hanya menyimpan draft (`pendingOrderDraft` di Zustand store: metode bayar + kode voucher + diskon) dan pindah ke `/order/status` tanpa `orderId`. Cart TIDAK dikosongkan di sini.

### Status Pesanan Customer (/order/status)
Dua mode, dibedakan dari ada/tidaknya `orderId` di query string:
- **Mode draft** (`!orderId`, sebelum order dibuat): render ringkasan dari cart + `pendingOrderDraft` (bukan dari order di DB, karena belum ada).
  - Tombol "Ya, Pesanan Sudah Benar" → **baru di sinilah** `POST /restaurants/:id/orders` benar-benar dipanggil (order jadi `PENDING_PAYMENT` di DB, baru sekarang muncul/notifikasi di dasbor kasir) → cart & draft dikosongkan → pindah ke mode order (`orderId` di-set via `router.replace`).
  - Tombol "Batalkan & Pesan Ulang" → **tidak ada panggilan API** (order belum pernah dibuat) → cart dikembalikan utuh ke `/order?tableId=...` (item yang sudah dipilih tidak hilang).
- **Mode order** (`orderId` ada — order sudah dibuat lewat konfirmasi draft di atas): langsung tampil tracker + ringkasan pesanan (tanpa gating konfirmasi lagi, karena begitu order ada berarti sudah dikonfirmasi). Tombol "Batalkan Pesanan" tetap tersedia selama status masih `PENDING_PAYMENT` (memanggil API cancel yang sama seperti sebelumnya).
- Tracker Status 4 langkah (Menunggu Bayar → Diterima → Dimasak → Siap)
- Instruksi bayar: Info kasir (Cash) atau Simulasi Bayar (Digital)
- Real-time via WebSocket

### Kasir Dashboard (/dashboard/cashier)
- 3 tab: Belum Bayar, Antrean Aktif, Selesai
- Tombol aksi: Konfirmasi Lunas, Kirim Dapur, Siap Saji, Tutup
- Tombol "Cetak Nota" (muncul untuk status PAID ke atas, kecuali Dibatalkan) → buka `/receipt?orderId=...&restaurantId=...` di tab baru, halaman print-friendly dengan tombol "Cetak" manual (`window.print()`)
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

> Item **QR Code Generator Nyata**, **Pembatalan Pesanan oleh Customer**, **Notifikasi Audio/Visual di Kasir & Dapur**, **Validasi Ukuran Upload Foto Menu**, dan **Print Struk/Receipt** sudah selesai dibangun (lihat 🆕 Update Log di bawah) dan dihapus dari daftar ini. Item **Validasi Meja Sudah Ada Pesanan Aktif** juga dihapus — dikonfirmasi user 2026-07-10 bahwa satu meja memang boleh punya lebih dari satu pesanan aktif sekaligus (skenario grup pelanggan pesan sendiri-sendiri), jadi itu bukan bug.

> Item **Pengaturan Profil Restoran**, **Search Menu di Halaman Customer**, dan **Laporan & Rekap Transaksi** sudah selesai dibangun (lihat 🆕 Update Log 2026-07-11) dan dihapus dari daftar ini.

> Item **Manajemen User/Staff** sudah selesai dibangun (lihat 🆕 Update Log 2026-07-12) dan dihapus dari daftar ini.

### 🔴 KRITIS — Harus Dibangun

1. **Multi-tenant / Multi-restoran**
   - Sistem hanya handle 1 restoran (seed hanya buat 1 data)
   - Solusi: Flow registrasi restoran baru, routing per restaurantId

### 🟡 PENTING — Perlu Ditingkatkan

2. **Pagination (ditunda sengaja — lihat 🆕 Update Log)**
   - Semua data diload sekaligus (pesanan, menu). Menu cuma 7 item dan sudah pakai search+filter client-side (butuh data lengkap, jangan paginate GET /menus tanpa rework search jadi server-side dulu). Order history ("Riwayat Selesai" kasir) yang berpotensi membengkak seiring waktu — itu satu-satunya target yang masuk akal kalau dikerjakan nanti.
   - Solusi (kalau/waktu dikerjakan): offset pagination + tombol "Muat Lebih Banyak" khusus di GET /orders untuk tab Riwayat Selesai kasir, bukan rewrite semua endpoint sekaligus

### 🟢 NICE TO HAVE

3. Dark Mode — CSS variables untuk dark mode + toggle
4. Riwayat Pesanan Customer — simpan orderId di localStorage
5. Estimasi Waktu Masak — field menit di Menu
6. Payment Gateway Nyata — Midtrans/Xendit untuk QRIS, E-Wallet, Bank Transfer
7. Flash Sale / Diskon per-Menu — voucher saat ini hanya persentase di seluruh subtotal, belum per-item/kategori
8. Dashboard untuk role WAITER — role ini bisa dibuat lewat tab Staff tapi belum ada route dashboard khusus (`apps/web/src/app/login/page.tsx` fallback ke `/`)

---

## 🗄️ Database Schema (Ringkasan)

`
Restaurant
  ├── id, name, address, phone
  ├── enableCash, enableQris, enableEWallet, enableBankTransfer
  ├── enableTax (Boolean, default false)
  └── taxRate (Float, default 10.0)

User (Staff)
  ├── role: OWNER | MANAGER | CASHIER | KITCHEN | WAITER
  └── isActive (Boolean, default true — nonaktif = tidak bisa login & token lama langsung invalid, bukan dihapus)

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
- PATCH /restaurants/:id  (Owner/Manager — update nama/alamat/telepon)
- PATCH /restaurants/:id/payment-settings  (Owner/Manager)
- PATCH /restaurants/:id/orders/:orderId/status  (Kasir/Dapur)
- POST /restaurants/:id/menus/upload  (Owner/Manager)
- CRUD /restaurants/:id/menus/:menuId
- CRUD /restaurants/:id/categories/:categoryId
- CRUD /restaurants/:id/tables/:tableId
- CRUD /restaurants/:id/vouchers/:voucherId  (Owner/Manager)
- GET /restaurants/:id/reports/summary?from=&to=  (Owner/Manager — laporan penjualan)
- POST/GET /restaurants/:id/users  (Owner/Manager — kelola staff, role dibatasi Manager/Kasir/Dapur/Pelayan)
- PATCH /restaurants/:id/users/:userId  (Owner/Manager — edit staff, toggle isActive; tidak bisa nonaktifkan diri sendiri atau kelola akun Owner/Super Admin)

---

## ⚠️ Gotchas & Bug yang Perlu Diketahui

1. Port konflik: error "Another next dev server already running" → taskkill /F /IM node.exe, tunggu 2 detik, pnpm dev lagi

2. MODULE_NOT_FOUND di NestJS: Terjadi setelah ubah Prisma schema tanpa rebuild server → wajib: pnpm --filter @repo/server build

3. "sseError not found" di browser console: Error dari ekstensi Chrome (kripto wallet), BUKAN dari kode proyek, aman diabaikan.

4. totalAmount INKLUSIF pajak: untuk dapatkan subtotal, hitung sum(orderItems.price * quantity).

5. Pembatalan pesanan: ada dua jalur sekarang. Sebelum order dibuat (mode draft di `/order/status`, belum ada `orderId`), "Batalkan" murni lokal — tidak ada panggilan API karena belum ada apa pun di DB. Setelah order dibuat (mode order, `orderId` ada), "Batalkan Pesanan" memanggil API sungguhan (POST .../orders/:orderId/cancel), hanya berlaku selama order masih PENDING_PAYMENT — kalau kasir sudah proses duluan (race condition), request cancel akan ditolak 400 dan customer harus refresh untuk lihat status terbaru. Tidak ada tombol cancel manual di dashboard kasir.

6. File upload gambar: tersimpan di apps/server/uploads/, diakses via /uploads/filename. Tidak ada cleanup file lama saat menu dihapus. Maksimal 2MB, harus tipe gambar (JPG/PNG/WEBP/GIF) — divalidasi di `menu.controller.ts` (Multer `limits`+`fileFilter`) dan `upload-size.filter.ts` (pesan 413 Bahasa Indonesia).

7. `JwtStrategy.validate` sekarang query DB (`User.findUnique` by ID) di **setiap** request terautentikasi, bukan cuma decode JWT — supaya staff yang dinonaktifkan langsung kehilangan akses meski `accessToken`-nya (berlaku 1 hari, tidak pernah di-refresh dari frontend) belum expired. Kalau nanti terasa jadi bottleneck di skala besar, ini kandidat untuk di-cache, tapi untuk sekarang trade-off-nya sepadan (alasan yang sama seperti penundaan pagination — data masih kecil).

8. Role `WAITER` bisa dibuat lewat tab Staff admin tapi belum ada dashboard route sendiri — login sebagai WAITER fallback ke `/` (lihat item 🟢 Nice-to-have #8).

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
