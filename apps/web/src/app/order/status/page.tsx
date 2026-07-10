'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { useSocket } from '../../../lib/socket';
import { OrderStatus } from '@repo/types';

function OrderStatusContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get('orderId');
  const restaurantId = searchParams.get('restaurantId');
  const tableId = searchParams.get('tableId');
  const queryClient = useQueryClient();

  // Local confirmation state
  const [isConfirmed, setIsConfirmed] = useState(false);

  // Fetch Order details
  const { data: order, isLoading, error } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => api.getOrder(restaurantId!, orderId!),
    enabled: !!orderId && !!restaurantId,
  });

  // Listen to WebSocket events for real-time updates
  useSocket(restaurantId || undefined, (event, data) => {
    if (data.orderId === orderId) {
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
    }
  });

  // Simulation Mutation
  const simulatePaymentMutation = useMutation({
    mutationFn: () => api.simulatePayment(restaurantId!, orderId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
    },
    onError: (err: any) => {
      alert(err.message || 'Gagal simulasi pembayaran');
    },
  });

  const cancelOrderMutation = useMutation({
    mutationFn: () => api.cancelOrder(restaurantId!, orderId!),
    onSuccess: () => {
      const redirectTableId = order?.table?.id;
      const redirectUrl = redirectTableId ? `/order?tableId=${redirectTableId}` : '/order';
      router.push(redirectUrl);
    },
    onError: (err: any) => {
      alert(err.message || 'Gagal membatalkan pesanan');
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
    },
  });

  const handleCancelAndReorder = () => {
    cancelOrderMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
        <p className="text-secondary text-sm mt-4">Memuat status pesanan...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background text-center">
        <div className="p-8 bg-surface rounded-lg shadow-medium max-w-md w-full border border-border">
          <h1 className="text-xl font-bold font-serif text-error mb-2">Error Pesanan</h1>
          <p className="text-secondary text-sm">
            Pesanan tidak ditemukan atau tautan rusak.
          </p>
        </div>
      </div>
    );
  }

  const getStepStatus = (step: string) => {
    const status = order.status;
    switch (step) {
      case 'PENDING':
        return status === OrderStatus.PENDING_PAYMENT ? 'active' : 'completed';
      case 'PAID':
        if (status === OrderStatus.PENDING_PAYMENT) return 'upcoming';
        return status === OrderStatus.PAID ? 'active' : 'completed';
      case 'PROCESSING':
        if ([OrderStatus.PENDING_PAYMENT, OrderStatus.PAID].includes(status)) return 'upcoming';
        return status === OrderStatus.PROCESSING ? 'active' : 'completed';
      case 'READY':
        if ([OrderStatus.PENDING_PAYMENT, OrderStatus.PAID, OrderStatus.PROCESSING].includes(status)) return 'upcoming';
        return status === OrderStatus.READY ? 'active' : 'completed';
      case 'COMPLETED':
        return status === OrderStatus.COMPLETED ? 'completed' : 'upcoming';
      default:
        return 'upcoming';
    }
  };

  const getStepClass = (step: string) => {
    const state = getStepStatus(step);
    if (state === 'completed') return 'bg-success text-white border-success';
    if (state === 'active') return 'bg-primary text-white border-primary animate-pulse';
    return 'bg-muted text-secondary border-border';
  };

  const subtotal = order.orderItems.reduce(
    (sum: number, item: any) => sum + Number(item.price) * item.quantity,
    0
  );
  const discountAmount = Number(order.discountAmount || 0);
  const discountedSubtotal = subtotal - discountAmount;
  const taxAmount = order.restaurant?.enableTax
    ? Math.round((discountedSubtotal * Number(order.restaurant.taxRate)) / 100)
    : 0;
  const paymentMethodLabel: Record<string, string> = {
    CASH: 'Bayar Tunai di Kasir',
    E_WALLET: 'E-Wallet (OVO / GoPay / DANA)',
    QRIS: 'QRIS',
    BANK_TRANSFER: 'Transfer Bank (VA)',
  };
  const method = order.payments[0]?.method || '';

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground pb-12">
      <header className="bg-primary text-white p-4 shadow-medium">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-lg font-bold font-serif">Status Pesanan</h1>
          <p className="text-xs text-slate-300">ID: {order.id.substring(0, 8)}... &middot; Meja {order.table.number}</p>
        </div>
      </header>

      <main className="max-w-md w-full mx-auto p-4 space-y-5 flex-1">

        {/* ─────────────────────────────────────────────────────────── */}
        {/* STEP KONFIRMASI PESANAN — hanya muncul jika belum dikonfirmasi */}
        {/* dan status pesanan masih PENDING_PAYMENT */}
        {/* ─────────────────────────────────────────────────────────── */}
        {!isConfirmed && order.status === OrderStatus.PENDING_PAYMENT && (
          <div className="bg-surface border-2 border-primary/30 rounded-lg shadow-medium overflow-hidden">
            {/* Header Konfirmasi */}
            <div className="bg-primary/5 border-b border-primary/20 px-5 py-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="font-bold text-sm text-slate-800 font-serif">Konfirmasi Pesanan Anda</h2>
                <p className="text-[10px] text-secondary mt-0.5">Pastikan pesanan di bawah sudah benar sebelum melanjutkan ke pembayaran.</p>
              </div>
            </div>

            {/* Ringkasan Item */}
            <div className="px-5 py-4 space-y-3">
              <h4 className="text-[10px] font-bold text-secondary uppercase tracking-wider">Item Pesanan</h4>
              {order.orderItems.map((item: any) => (
                <div key={item.id} className="flex items-start justify-between text-xs">
                  <div className="flex-1 pr-3">
                    <span className="font-bold text-slate-800">{item.menu.name}</span>
                    <span className="text-secondary ml-1">x{item.quantity}</span>
                    {item.notes && (
                      <span className="block text-[10px] text-secondary italic mt-0.5">
                        Catatan: {item.notes}
                      </span>
                    )}
                  </div>
                  <span className="font-semibold text-slate-800 shrink-0">
                    Rp {(Number(item.price) * item.quantity).toLocaleString('id-ID')}
                  </span>
                </div>
              ))}

              {/* Harga Summary */}
              <div className="border-t border-dashed border-border pt-3 space-y-1.5 mt-2">
                {order.restaurant?.enableTax ? (
                  <>
                    <div className="flex justify-between text-xs text-secondary">
                      <span>Subtotal</span>
                      <span>Rp {subtotal.toLocaleString('id-ID')}</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-xs text-tertiary font-semibold">
                        <span>Diskon Voucher {order.voucherCode ? `(${order.voucherCode})` : ''}</span>
                        <span>-Rp {discountAmount.toLocaleString('id-ID')}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-xs text-secondary">
                      <span>Pajak PPN ({order.restaurant.taxRate}%)</span>
                      <span>Rp {taxAmount.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between font-bold text-sm pt-1">
                      <span className="text-slate-800">Total Pembayaran</span>
                      <span className="text-primary">Rp {Number(order.totalAmount).toLocaleString('id-ID')}</span>
                    </div>
                  </>
                ) : (
                  <>
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-xs text-tertiary font-semibold">
                        <span>Diskon Voucher {order.voucherCode ? `(${order.voucherCode})` : ''}</span>
                        <span>-Rp {discountAmount.toLocaleString('id-ID')}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-sm">
                      <span className="text-slate-800">Total Pembayaran</span>
                      <span className="text-primary">Rp {Number(order.totalAmount).toLocaleString('id-ID')}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between text-xs text-secondary pt-1">
                  <span>Metode Bayar</span>
                  <span className="font-medium">{paymentMethodLabel[method] || method}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="px-5 pb-5 flex flex-col gap-2.5">
              <button
                id="btn-konfirmasi-pesanan"
                onClick={() => setIsConfirmed(true)}
                className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white font-bold py-3 rounded-sm text-sm uppercase tracking-wider shadow-subtle transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                Ya, Pesanan Sudah Benar
              </button>
              <button
                id="btn-batal-pesan-ulang"
                onClick={handleCancelAndReorder}
                disabled={cancelOrderMutation.isPending}
                className="w-full flex items-center justify-center gap-2 bg-surface hover:bg-red-50 text-red-600 border border-red-200 hover:border-red-300 font-semibold py-2.5 rounded-sm text-xs uppercase tracking-wider transition-colors disabled:opacity-50"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                {cancelOrderMutation.isPending ? 'Membatalkan...' : 'Batalkan & Pesan Ulang'}
              </button>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────── */}
        {/* KONTEN UTAMA — hanya muncul setelah konfirmasi */}
        {/* ─────────────────────────────────────────────────────────── */}
        {isConfirmed && (
          <>
            {/* Step Indicator */}
            <div className="bg-surface border border-border p-6 rounded-md shadow-subtle">
              <h3 className="font-bold text-base text-slate-800 mb-6 text-center font-serif">
                Lacak Pesanan Anda (Meja {order.table.number})
              </h3>

              <div className="relative pl-8 space-y-6">
                {/* Vertical Line */}
                <div className="absolute left-3.5 top-2.5 bottom-2.5 w-0.5 bg-border z-0"></div>

                {/* Step 1: Menunggu Pembayaran */}
                <div className="relative flex gap-4 items-start z-10">
                  <div className={`w-7.5 h-7.5 rounded-full border flex items-center justify-center text-xs font-bold ${getStepClass('PENDING')}`}>
                    1
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-800">Menunggu Pembayaran</h4>
                    <p className="text-xs text-secondary mt-0.5">Silakan selesaikan pembayaran Anda.</p>
                  </div>
                </div>

                {/* Step 2: Diterima / Dibayar */}
                <div className="relative flex gap-4 items-start z-10">
                  <div className={`w-7.5 h-7.5 rounded-full border flex items-center justify-center text-xs font-bold ${getStepClass('PAID')}`}>
                    2
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-800">Pesanan Diterima</h4>
                    <p className="text-xs text-secondary mt-0.5">Pembayaran lunas dan pesanan masuk antrean.</p>
                  </div>
                </div>

                {/* Step 3: Sedang Diproses */}
                <div className="relative flex gap-4 items-start z-10">
                  <div className={`w-7.5 h-7.5 rounded-full border flex items-center justify-center text-xs font-bold ${getStepClass('PROCESSING')}`}>
                    3
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-800">Sedang Dimasak</h4>
                    <p className="text-xs text-secondary mt-0.5">Koki sedang menyiapkan pesanan segar Anda.</p>
                  </div>
                </div>

                {/* Step 4: Siap Dihidangkan */}
                <div className="relative flex gap-4 items-start z-10">
                  <div className={`w-7.5 h-7.5 rounded-full border flex items-center justify-center text-xs font-bold ${getStepClass('READY')}`}>
                    4
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-800">Siap Dihidangkan</h4>
                    <p className="text-xs text-secondary mt-0.5">Pesanan diantar ke meja atau siap diambil.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Instruksi / Simulasi Pembayaran */}
            {order.status === OrderStatus.PENDING_PAYMENT && (
              order.payments[0]?.method === 'CASH' ? (
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-md shadow-subtle text-center">
                  <h4 className="text-sm font-bold text-blue-800 mb-1">Silakan Bayar di Kasir</h4>
                  <p className="text-xs text-blue-600 leading-relaxed">
                    Harap kunjungi meja kasir dan sebutkan <span className="font-bold">Meja {order.table.number}</span> untuk
                    melunasi pembayaran sebesar <span className="font-bold">Rp {Number(order.totalAmount).toLocaleString('id-ID')}</span>.
                    Status akan terupdate otomatis setelah kasir mengonfirmasi.
                  </p>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-md shadow-subtle text-center">
                  <h4 className="text-sm font-bold text-amber-800 mb-1">Simulasi Pembayaran Digital</h4>
                  <p className="text-xs text-amber-600 mb-4">
                    Karena ini adalah MVP simulasi, klik tombol di bawah untuk menyimulasikan pembayaran digital yang sukses.
                  </p>
                  <button
                    onClick={() => simulatePaymentMutation.mutate()}
                    disabled={simulatePaymentMutation.isPending}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 px-6 rounded-sm text-xs uppercase tracking-wider transition-colors shadow-subtle disabled:opacity-50"
                  >
                    {simulatePaymentMutation.isPending ? 'Memproses...' : 'Simulasikan Bayar Lunas'}
                  </button>
                </div>
              )
            )}

            {/* Order Details Summary */}
            <div className="bg-surface border border-border rounded-md shadow-subtle overflow-hidden">
              <div className="p-4 bg-muted border-b border-border">
                <h4 className="font-bold text-sm text-slate-800 font-serif">Rangkuman Pesanan</h4>
              </div>
              <div className="p-4 space-y-3">
                {order.orderItems.map((item: any) => (
                  <div key={item.id} className="flex justify-between items-center text-xs">
                    <div className="text-slate-800">
                      <span className="font-bold">{item.menu.name}</span>
                      <span className="text-secondary"> x{item.quantity}</span>
                      {item.notes && <span className="block text-[10px] text-secondary">({item.notes})</span>}
                    </div>
                    <div className="font-semibold text-slate-800">
                      Rp {(Number(item.price) * item.quantity).toLocaleString('id-ID')}
                    </div>
                  </div>
                ))}
                <hr className="border-border" />
                {order.restaurant?.enableTax ? (
                  <>
                    <div className="flex justify-between items-center text-xs text-secondary">
                      <span>Subtotal</span>
                      <span>Rp {subtotal.toLocaleString('id-ID')}</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between items-center text-xs text-tertiary font-semibold mt-1">
                        <span>Diskon Voucher {order.voucherCode ? `(${order.voucherCode})` : ''}</span>
                        <span>-Rp {discountAmount.toLocaleString('id-ID')}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-xs text-secondary mt-1">
                      <span>Pajak PPN ({order.restaurant.taxRate}%)</span>
                      <span>Rp {taxAmount.toLocaleString('id-ID')}</span>
                    </div>
                    <hr className="border-border border-dashed my-2" />
                    <div className="flex justify-between items-center text-sm font-bold">
                      <span className="text-slate-800">Total</span>
                      <span className="text-primary text-base">
                        Rp {Number(order.totalAmount).toLocaleString('id-ID')}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    {discountAmount > 0 && (
                      <div className="flex justify-between items-center text-xs text-tertiary font-semibold">
                        <span>Diskon Voucher {order.voucherCode ? `(${order.voucherCode})` : ''}</span>
                        <span>-Rp {discountAmount.toLocaleString('id-ID')}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-sm font-bold">
                      <span className="text-secondary">Total</span>
                      <span className="text-primary">
                        Rp {Number(order.totalAmount).toLocaleString('id-ID')}
                      </span>
                    </div>
                  </>
                )}
                <div className="flex justify-between items-center text-xs text-secondary mt-1">
                  <span>Metode Bayar</span>
                  <span className="font-medium">{paymentMethodLabel[method] || method}</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Jika belum konfirmasi, hanya tampilkan blok konfirmasi (sudah ditangani di atas) */}
        {/* Jika pesanan tidak PENDING_PAYMENT, langsung tampilkan isi penuh tanpa konfirmasi */}
        {order.status !== OrderStatus.PENDING_PAYMENT && !isConfirmed && (
          <>
            {/* Step Indicator */}
            <div className="bg-surface border border-border p-6 rounded-md shadow-subtle">
              <h3 className="font-bold text-base text-slate-800 mb-6 text-center font-serif">
                Lacak Pesanan Anda (Meja {order.table.number})
              </h3>
              <div className="relative pl-8 space-y-6">
                <div className="absolute left-3.5 top-2.5 bottom-2.5 w-0.5 bg-border z-0"></div>
                {['PENDING', 'PAID', 'PROCESSING', 'READY'].map((step, i) => {
                  const labels: Record<string, { title: string; desc: string }> = {
                    PENDING: { title: 'Menunggu Pembayaran', desc: 'Silakan selesaikan pembayaran Anda.' },
                    PAID: { title: 'Pesanan Diterima', desc: 'Pembayaran lunas dan pesanan masuk antrean.' },
                    PROCESSING: { title: 'Sedang Dimasak', desc: 'Koki sedang menyiapkan pesanan segar Anda.' },
                    READY: { title: 'Siap Dihidangkan', desc: 'Pesanan diantar ke meja atau siap diambil.' },
                  };
                  return (
                    <div key={step} className="relative flex gap-4 items-start z-10">
                      <div className={`w-7.5 h-7.5 rounded-full border flex items-center justify-center text-xs font-bold ${getStepClass(step)}`}>
                        {i + 1}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-800">{labels[step].title}</h4>
                        <p className="text-xs text-secondary mt-0.5">{labels[step].desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Order Details Summary */}
            <div className="bg-surface border border-border rounded-md shadow-subtle overflow-hidden">
              <div className="p-4 bg-muted border-b border-border">
                <h4 className="font-bold text-sm text-slate-800 font-serif">Rangkuman Pesanan</h4>
              </div>
              <div className="p-4 space-y-3">
                {order.orderItems.map((item: any) => (
                  <div key={item.id} className="flex justify-between items-center text-xs">
                    <div className="text-slate-800">
                      <span className="font-bold">{item.menu.name}</span>
                      <span className="text-secondary"> x{item.quantity}</span>
                      {item.notes && <span className="block text-[10px] text-secondary">({item.notes})</span>}
                    </div>
                    <div className="font-semibold text-slate-800">
                      Rp {(Number(item.price) * item.quantity).toLocaleString('id-ID')}
                    </div>
                  </div>
                ))}
                <hr className="border-border" />
                {order.restaurant?.enableTax ? (
                  <>
                    <div className="flex justify-between items-center text-xs text-secondary">
                      <span>Subtotal</span>
                      <span>Rp {subtotal.toLocaleString('id-ID')}</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between items-center text-xs text-tertiary font-semibold mt-1">
                        <span>Diskon Voucher {order.voucherCode ? `(${order.voucherCode})` : ''}</span>
                        <span>-Rp {discountAmount.toLocaleString('id-ID')}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-xs text-secondary mt-1">
                      <span>Pajak PPN ({order.restaurant.taxRate}%)</span>
                      <span>Rp {taxAmount.toLocaleString('id-ID')}</span>
                    </div>
                    <hr className="border-border border-dashed my-2" />
                    <div className="flex justify-between items-center text-sm font-bold">
                      <span className="text-slate-800">Total</span>
                      <span className="text-primary text-base">Rp {Number(order.totalAmount).toLocaleString('id-ID')}</span>
                    </div>
                  </>
                ) : (
                  <>
                    {discountAmount > 0 && (
                      <div className="flex justify-between items-center text-xs text-tertiary font-semibold">
                        <span>Diskon Voucher {order.voucherCode ? `(${order.voucherCode})` : ''}</span>
                        <span>-Rp {discountAmount.toLocaleString('id-ID')}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-sm font-bold">
                      <span className="text-secondary">Total</span>
                      <span className="text-primary">Rp {Number(order.totalAmount).toLocaleString('id-ID')}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between items-center text-xs text-secondary mt-1">
                  <span>Metode Bayar</span>
                  <span className="font-medium">{paymentMethodLabel[method] || method}</span>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default function OrderStatusPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
        <p className="text-secondary text-sm mt-4">Memuat...</p>
      </div>
    }>
      <OrderStatusContent />
    </Suspense>
  );
}
