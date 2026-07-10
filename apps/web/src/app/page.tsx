import React from 'react';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Hero Section */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-16 flex flex-col justify-center space-y-12">
        <div className="text-center space-y-4">
          <span className="text-xs uppercase tracking-widest text-secondary font-bold">
            Platform Pemesanan Meja & POS
          </span>
          <h1 className="text-4xl md:text-5xl font-bold font-serif text-primary">
            POSKita POS Makanan
          </h1>
          <p className="max-w-xl mx-auto text-sm text-secondary leading-relaxed">
            Digitalisasi pemesanan menu di meja restoran menggunakan QR Code. Pelanggan memindai, memesan, 
            dan membayar secara instan, sementara dapur dan kasir menerima pesanan secara real-time.
          </p>
        </div>

        {/* Dashboards Navigation */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Admin Panel */}
          <div className="bg-surface border border-border p-6 rounded-md shadow-subtle flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-base text-slate-800 font-serif mb-2">Panel Admin</h3>
              <p className="text-xs text-secondary leading-relaxed mb-4">
                Kelola menu makanan, buat kategori hidangan, dan daftarkan meja makan dengan QR Code unik.
              </p>
            </div>
            <a
              href="/dashboard/admin"
              className="inline-block text-center bg-primary hover:bg-primary-hover text-white text-xs font-bold uppercase tracking-wider py-2.5 rounded-sm transition-colors"
            >
              Masuk Admin
            </a>
          </div>

          {/* Kasir Panel */}
          <div className="bg-surface border border-border p-6 rounded-md shadow-subtle flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-base text-slate-800 font-serif mb-2">Panel Kasir</h3>
              <p className="text-xs text-secondary leading-relaxed mb-4">
                Pantau pesanan masuk secara real-time, konfirmasi transaksi pembayaran tunai, dan ubah status pesanan.
              </p>
            </div>
            <a
              href="/dashboard/cashier"
              className="inline-block text-center bg-primary hover:bg-primary-hover text-white text-xs font-bold uppercase tracking-wider py-2.5 rounded-sm transition-colors"
            >
              Masuk Kasir
            </a>
          </div>

          {/* Dapur Panel (KDS) */}
          <div className="bg-surface border border-border p-6 rounded-md shadow-subtle flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-base text-slate-800 font-serif mb-2">Display Dapur (KDS)</h3>
              <p className="text-xs text-secondary leading-relaxed mb-4">
                Layar khusus koki dapur untuk melihat antrean masakan yang harus diproses dan menandai selesai.
              </p>
            </div>
            <a
              href="/dashboard/kitchen"
              className="inline-block text-center bg-primary hover:bg-primary-hover text-white text-xs font-bold uppercase tracking-wider py-2.5 rounded-sm transition-colors"
            >
              Masuk Dapur
            </a>
          </div>
        </div>

        {/* Demo/Guide Section */}
        <div className="bg-muted border border-border p-6 rounded-md shadow-subtle">
          <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wider mb-2 font-serif">
            Petunjuk Penggunaan Demo (MVP)
          </h3>
          <ol className="list-decimal pl-5 text-xs text-secondary space-y-2 leading-relaxed">
            <li>
              Jalankan database PostgreSQL dan Redis menggunakan perintah <code className="font-mono bg-white px-1 py-0.5 rounded border border-border">docker compose up -d</code>.
            </li>
            <li>
              Lakukan sinkronisasi schema database dengan menjalankan <code className="font-mono bg-white px-1 py-0.5 rounded border border-border">pnpm db:push</code>.
            </li>
            <li>
              Gunakan script seed database untuk mengisi data restoran, akun demo kasir/dapur/admin, meja, dan menu hidangan.
            </li>
            <li>
              Masuk ke akun demo melalui tombol login di atas, atau kunjungi <code className="font-mono bg-white px-1 py-0.5 rounded border border-border">/order?tableId=[ID_MEJA]</code> untuk menyimulasikan scan QR meja oleh pelanggan.
            </li>
          </ol>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-[10px] text-secondary border-t border-border bg-surface">
        POSKita CorpScale Design System. All rights reserved.
      </footer>
    </div>
  );
}
