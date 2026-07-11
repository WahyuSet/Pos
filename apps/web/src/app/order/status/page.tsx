'use client';

import React, { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { useAppStore } from '../../../lib/store';
import { useSocket } from '../../../lib/socket';
import { OrderStatus } from '@repo/types';

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  CASH: 'Bayar Tunai di Kasir',
  E_WALLET: 'E-Wallet (OVO / GoPay / DANA)',
  QRIS: 'QRIS',
  BANK_TRANSFER: 'Transfer Bank (VA)',
};

function OrderStatusContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get('orderId');
  const restaurantId = searchParams.get('restaurantId');
  const tableId = searchParams.get('tableId');
  const queryClient = useQueryClient();

  const { cart, clearCart, pendingOrderDraft, clearPendingOrderDraft } = useAppStore();

  // ─────────────────────────────────────────────────────────────
  // Mode DRAFT: belum ada order di DB, tampilkan preview dari cart
  // ─────────────────────────────────────────────────────────────
  const { data: table, isLoading: isTableLoading, error: tableError } = useQuery({
    queryKey: ['table', tableId],
    queryFn: () => api.getTable(tableId!),
    enabled: !orderId && !!tableId,
  });

  const confirmOrderMutation = useMutation({
    mutationFn: () => {
      if (!pendingOrderDraft) throw new Error('Draft pesanan tidak ditemukan');
      return api.createOrder(pendingOrderDraft.restaurantId, {
        tableId: pendingOrderDraft.tableId,
        paymentMethod: pendingOrderDraft.paymentMethod,
        items: cart.map((item) => ({
          menuId: item.id,
          quantity: item.quantity,
          notes: item.notes || '',
        })),
        ...(pendingOrderDraft.voucherCode ? { voucherCode: pendingOrderDraft.voucherCode } : {}),
      });
    },
    onSuccess: (data) => {
      const draftRestaurantId = pendingOrderDraft?.restaurantId;
      clearCart();
      clearPendingOrderDraft();
      // Jangan seed cache dengan response create — bentuknya beda dari getOrder
      // (tidak ada payments/restaurant), biarkan useQuery fetch ulang via getOrder.
      router.replace(`/order/status?orderId=${data.id}&restaurantId=${draftRestaurantId}`);
    },
    onError: (err: any) => {
      alert(err.message || 'Gagal membuat pesanan');
    },
  });

  const handleCancelDraft = () => {
    clearPendingOrderDraft();
    router.push(tableId ? `/order?tableId=${tableId}` : '/order');
  };

  // ─────────────────────────────────────────────────────────────
  // Mode ORDER: order sudah ada di DB (dibuat lewat konfirmasi draft)
  // ─────────────────────────────────────────────────────────────
  const { data: order, isLoading: isOrderLoading, error: orderError } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => api.getOrder(restaurantId!, orderId!),
    enabled: !!orderId && !!restaurantId,
  });

  useSocket(restaurantId || undefined, (event, data) => {
    if (data.orderId === orderId) {
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
    }
  });

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

  const getStepStatus = (step: string, status: OrderStatus) => {
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

  const getStepClass = (step: string, status: OrderStatus) => {
    const state = getStepStatus(step, status);
    if (state === 'completed') return 'bg-success text-white border-success';
    if (state === 'active') return 'bg-primary text-white border-primary animate-pulse';
    return 'bg-muted text-secondary border-border';
  };

  // ═════════════════════════════════════════════════════════════
  // RENDER: Mode ORDER (orderId ada di URL)
  // ═════════════════════════════════════════════════════════════
  if (orderId) {
    if (isOrderLoading) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
          <p className="text-secondary text-sm mt-4">Memuat status pesanan...</p>
        </div>
      );
    }

    if (orderError || !order) {
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

    const subtotal = order.orderItems.reduce(
      (sum: number, item: any) => sum + Number(item.price) * item.quantity,
      0
    );
    const discountAmount = Number(order.discountAmount || 0);
    const discountedSubtotal = subtotal - discountAmount;
    const taxAmount = order.restaurant?.enableTax
      ? Math.round((discountedSubtotal * Number(order.restaurant.taxRate)) / 100)
      : 0;
    const method = order.payments?.[0]?.method || '';

    return (
      <div className="flex flex-col min-h-screen bg-background text-foreground pb-12">
        <header className="bg-primary text-white p-4 shadow-medium">
          <div className="max-w-md mx-auto text-center">
            <h1 className="text-lg font-bold font-serif">Status Pesanan</h1>
            <p className="text-xs text-slate-300">ID: {order.id.substring(0, 8)}... &middot; Meja {order.table.number}</p>
          </div>
        </header>

        <main className="max-w-md w-full mx-auto p-4 space-y-5 flex-1">
          {/* Step Indicator */}
          <div className="bg-surface border border-border p-6 rounded-md shadow-subtle">
            <h3 className="font-bold text-base text-slate-800 mb-6 text-center font-serif">
              Lacak Pesanan Anda (Meja {order.table.number})
            </h3>

            <div className="relative pl-8 space-y-6">
              <div className="absolute left-3.5 top-2.5 bottom-2.5 w-0.5 bg-border z-0"></div>

              <div className="relative flex gap-4 items-start z-10">
                <div className={`w-7.5 h-7.5 rounded-full border flex items-center justify-center text-xs font-bold ${getStepClass('PENDING', order.status)}`}>
                  1
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-800">Menunggu Pembayaran</h4>
                  <p className="text-xs text-secondary mt-0.5">Silakan selesaikan pembayaran Anda.</p>
                </div>
              </div>

              <div className="relative flex gap-4 items-start z-10">
                <div className={`w-7.5 h-7.5 rounded-full border flex items-center justify-center text-xs font-bold ${getStepClass('PAID', order.status)}`}>
                  2
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-800">Pesanan Diterima</h4>
                  <p className="text-xs text-secondary mt-0.5">Pembayaran lunas dan pesanan masuk antrean.</p>
                </div>
              </div>

              <div className="relative flex gap-4 items-start z-10">
                <div className={`w-7.5 h-7.5 rounded-full border flex items-center justify-center text-xs font-bold ${getStepClass('PROCESSING', order.status)}`}>
                  3
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-800">Sedang Dimasak</h4>
                  <p className="text-xs text-secondary mt-0.5">Koki sedang menyiapkan pesanan segar Anda.</p>
                </div>
              </div>

              <div className="relative flex gap-4 items-start z-10">
                <div className={`w-7.5 h-7.5 rounded-full border flex items-center justify-center text-xs font-bold ${getStepClass('READY', order.status)}`}>
                  4
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-800">Siap Dihidangkan</h4>
                  <p className="text-xs text-secondary mt-0.5">Pesanan diantar ke meja atau siap diambil.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Instruksi / Simulasi Pembayaran + Batalkan */}
          {order.status === OrderStatus.PENDING_PAYMENT && (
            <>
              {method === 'CASH' ? (
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
              )}

              <button
                id="btn-batal-pesan-ulang"
                onClick={() => cancelOrderMutation.mutate()}
                disabled={cancelOrderMutation.isPending}
                className="w-full flex items-center justify-center gap-2 bg-surface hover:bg-red-50 text-red-600 border border-red-200 hover:border-red-300 font-semibold py-2.5 rounded-sm text-xs uppercase tracking-wider transition-colors disabled:opacity-50"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                {cancelOrderMutation.isPending ? 'Membatalkan...' : 'Batalkan Pesanan'}
              </button>
            </>
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
                <span className="font-medium">{PAYMENT_METHOD_LABEL[method] || method}</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════
  // RENDER: Mode DRAFT (belum ada orderId)
  // ═════════════════════════════════════════════════════════════
  if (!tableId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background text-center">
        <div className="p-8 bg-surface rounded-lg shadow-medium max-w-md w-full border border-border">
          <h1 className="text-xl font-bold font-serif text-error mb-2">Pesanan Tidak Ditemukan</h1>
          <p className="text-secondary text-sm mb-4">
            Tautan tidak valid. Silakan pindai QR Code di meja Anda untuk mulai memesan.
          </p>
        </div>
      </div>
    );
  }

  if (isTableLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
        <p className="text-secondary text-sm mt-4">Memuat ringkasan pesanan...</p>
      </div>
    );
  }

  if (tableError || !table) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background text-center">
        <div className="p-8 bg-surface rounded-lg shadow-medium max-w-md w-full border border-border">
          <h1 className="text-xl font-bold font-serif text-error mb-2">Error Meja Tidak Valid</h1>
          <p className="text-secondary text-sm">
            Meja tidak terdaftar di sistem. Pastikan QR Code yang Anda scan sudah benar.
          </p>
        </div>
      </div>
    );
  }

  if (cart.length === 0 || !pendingOrderDraft) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background text-center">
        <div className="p-8 bg-surface rounded-lg shadow-medium max-w-md w-full border border-border">
          <h1 className="text-xl font-bold font-serif text-primary mb-2">Tidak Ada Pesanan untuk Dikonfirmasi</h1>
          <p className="text-secondary text-sm mb-4">
            Silakan pilih menu terlebih dahulu sebelum melanjutkan ke konfirmasi pesanan.
          </p>
          <button
            onClick={() => router.push(`/order?tableId=${tableId}`)}
            className="bg-primary hover:bg-primary-hover text-white px-6 py-2.5 rounded-sm text-sm font-bold uppercase tracking-wider shadow-subtle transition-colors"
          >
            Kembali ke Menu
          </button>
        </div>
      </div>
    );
  }

  const restaurant = table.restaurant;
  const totalCartPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountAmount = pendingOrderDraft.discountAmount ?? 0;
  const discountedSubtotal = Math.max(0, totalCartPrice - discountAmount);
  const taxAmount = restaurant?.enableTax
    ? Math.round((discountedSubtotal * restaurant.taxRate) / 100)
    : 0;
  const grandTotal = discountedSubtotal + taxAmount;

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground pb-12">
      <header className="bg-primary text-white p-4 shadow-medium">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-lg font-bold font-serif">Status Pesanan</h1>
          <p className="text-xs text-slate-300">Meja {table.number}</p>
        </div>
      </header>

      <main className="max-w-md w-full mx-auto p-4 space-y-5 flex-1">
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
            {cart.map((item) => (
              <div key={item.id} className="flex items-start justify-between text-xs">
                <div className="flex-1 pr-3">
                  <span className="font-bold text-slate-800">{item.name}</span>
                  <span className="text-secondary ml-1">x{item.quantity}</span>
                  {item.notes && (
                    <span className="block text-[10px] text-secondary italic mt-0.5">
                      Catatan: {item.notes}
                    </span>
                  )}
                </div>
                <span className="font-semibold text-slate-800 shrink-0">
                  Rp {(item.price * item.quantity).toLocaleString('id-ID')}
                </span>
              </div>
            ))}

            {/* Harga Summary */}
            <div className="border-t border-dashed border-border pt-3 space-y-1.5 mt-2">
              {restaurant?.enableTax ? (
                <>
                  <div className="flex justify-between text-xs text-secondary">
                    <span>Subtotal</span>
                    <span>Rp {totalCartPrice.toLocaleString('id-ID')}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-xs text-tertiary font-semibold">
                      <span>Diskon Voucher {pendingOrderDraft.voucherCode ? `(${pendingOrderDraft.voucherCode})` : ''}</span>
                      <span>-Rp {discountAmount.toLocaleString('id-ID')}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs text-secondary">
                    <span>Pajak PPN ({restaurant.taxRate}%)</span>
                    <span>Rp {taxAmount.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm pt-1">
                    <span className="text-slate-800">Total Pembayaran</span>
                    <span className="text-primary">Rp {grandTotal.toLocaleString('id-ID')}</span>
                  </div>
                </>
              ) : (
                <>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-xs text-tertiary font-semibold">
                      <span>Diskon Voucher {pendingOrderDraft.voucherCode ? `(${pendingOrderDraft.voucherCode})` : ''}</span>
                      <span>-Rp {discountAmount.toLocaleString('id-ID')}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-sm">
                    <span className="text-slate-800">Total Pembayaran</span>
                    <span className="text-primary">Rp {grandTotal.toLocaleString('id-ID')}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between text-xs text-secondary pt-1">
                <span>Metode Bayar</span>
                <span className="font-medium">
                  {PAYMENT_METHOD_LABEL[pendingOrderDraft.paymentMethod] || pendingOrderDraft.paymentMethod}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="px-5 pb-5 flex flex-col gap-2.5">
            <button
              id="btn-konfirmasi-pesanan"
              onClick={() => confirmOrderMutation.mutate()}
              disabled={confirmOrderMutation.isPending}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white font-bold py-3 rounded-sm text-sm uppercase tracking-wider shadow-subtle transition-colors disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              {confirmOrderMutation.isPending ? 'Mengirim Pesanan...' : 'Ya, Pesanan Sudah Benar'}
            </button>
            <button
              id="btn-batal-pesan-ulang"
              onClick={handleCancelDraft}
              disabled={confirmOrderMutation.isPending}
              className="w-full flex items-center justify-center gap-2 bg-surface hover:bg-red-50 text-red-600 border border-red-200 hover:border-red-300 font-semibold py-2.5 rounded-sm text-xs uppercase tracking-wider transition-colors disabled:opacity-50"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Batalkan & Pesan Ulang
            </button>
          </div>
        </div>
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
