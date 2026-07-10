'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  CASH: 'Tunai',
  E_WALLET: 'E-Wallet',
  QRIS: 'QRIS',
  BANK_TRANSFER: 'Transfer Bank',
};

function ReceiptContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const restaurantId = searchParams.get('restaurantId');

  const { data: order, isLoading } = useQuery({
    queryKey: ['receipt-order', orderId],
    queryFn: () => api.getOrder(restaurantId!, orderId!),
    enabled: !!orderId && !!restaurantId,
  });

  if (isLoading || !order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
        <p className="text-secondary text-sm mt-4">Memuat nota...</p>
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
  const method = order.payments[0]?.method || '';

  return (
    <div className="min-h-screen bg-background py-8 px-4 print:bg-white print:py-0">
      <div className="max-w-sm mx-auto bg-surface border border-border rounded-md shadow-subtle p-6 space-y-4 print:shadow-none print:border-none">
        <div className="text-center space-y-1">
          <h1 className="font-serif font-bold text-lg text-slate-800">{order.restaurant.name}</h1>
          {order.restaurant.address && <p className="text-[10px] text-secondary">{order.restaurant.address}</p>}
          {order.restaurant.phone && <p className="text-[10px] text-secondary">{order.restaurant.phone}</p>}
        </div>

        <hr className="border-dashed border-border" />

        <div className="text-[10px] text-secondary space-y-0.5">
          <div className="flex justify-between">
            <span>No. Pesanan</span>
            <span className="font-mono">{order.id.slice(0, 8).toUpperCase()}</span>
          </div>
          <div className="flex justify-between">
            <span>Meja</span>
            <span>{order.table.number}</span>
          </div>
          <div className="flex justify-between">
            <span>Waktu</span>
            <span>{new Date(order.createdAt).toLocaleString('id-ID')}</span>
          </div>
        </div>

        <hr className="border-dashed border-border" />

        <div className="space-y-2 text-xs">
          {order.orderItems.map((item: any) => (
            <div key={item.id} className="flex justify-between">
              <div>
                <div className="font-semibold text-slate-800">{item.menu.name}</div>
                <div className="text-[10px] text-secondary">
                  {item.quantity} x Rp {Number(item.price).toLocaleString('id-ID')}
                </div>
              </div>
              <div className="font-semibold text-slate-800">
                Rp {(Number(item.price) * item.quantity).toLocaleString('id-ID')}
              </div>
            </div>
          ))}
        </div>

        <hr className="border-dashed border-border" />

        <div className="text-xs space-y-1">
          <div className="flex justify-between text-secondary">
            <span>Subtotal</span>
            <span>Rp {subtotal.toLocaleString('id-ID')}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-green-700">
              <span>Diskon Voucher{order.voucherCode ? ` (${order.voucherCode})` : ''}</span>
              <span>-Rp {discountAmount.toLocaleString('id-ID')}</span>
            </div>
          )}
          {order.restaurant?.enableTax && (
            <div className="flex justify-between text-secondary">
              <span>Pajak PPN ({order.restaurant.taxRate}%)</span>
              <span>Rp {taxAmount.toLocaleString('id-ID')}</span>
            </div>
          )}
          <hr className="border-border" />
          <div className="flex justify-between font-bold text-sm text-slate-800 pt-1">
            <span>Total</span>
            <span>Rp {Number(order.totalAmount).toLocaleString('id-ID')}</span>
          </div>
          <div className="flex justify-between text-[10px] text-secondary pt-1">
            <span>Metode Bayar</span>
            <span>{PAYMENT_METHOD_LABEL[method] || method}</span>
          </div>
        </div>

        <hr className="border-dashed border-border" />

        <p className="text-center text-[10px] text-secondary">Terima kasih atas kunjungan Anda!</p>

        <button
          onClick={() => window.print()}
          className="print:hidden w-full bg-primary hover:bg-primary-hover text-white py-2 rounded-sm text-xs font-bold uppercase tracking-wider transition-colors mt-2"
        >
          Cetak
        </button>
      </div>
    </div>
  );
}

export default function ReceiptPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-screen bg-background">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
          <p className="text-secondary text-sm mt-4">Memuat...</p>
        </div>
      }
    >
      <ReceiptContent />
    </Suspense>
  );
}
