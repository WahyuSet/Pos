'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { useAppStore } from '../../../lib/store';
import { useSocket } from '../../../lib/socket';
import { OrderStatus, Role } from '@repo/types';

export default function CashierDashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, token, logout } = useAppStore();

  const [activeTab, setActiveTab] = useState<'pending' | 'active' | 'completed'>('pending');

  useEffect(() => {
    if (!token || user?.role !== Role.CASHIER) {
      router.push('/login');
    }
  }, [token, user, router]);

  const restaurantId = user?.restaurantId;

  // Fetch orders
  const { data: orders, isLoading } = useQuery({
    queryKey: ['cashier-orders', restaurantId],
    queryFn: () => api.getOrders(restaurantId!),
    enabled: !!restaurantId,
  });

  // Real-time WebSocket listener
  useSocket(restaurantId, (event, data) => {
    console.log(`WebSocket event: ${event}`, data);
    queryClient.invalidateQueries({ queryKey: ['cashier-orders', restaurantId] });
  });

  // Update order status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: string }) =>
      api.updateOrderStatus(restaurantId!, orderId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashier-orders', restaurantId] });
    },
    onError: (err: any) => {
      alert(err.message || 'Gagal mengubah status');
    },
  });

  if (!restaurantId || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
        <p className="text-secondary text-sm mt-4">Memuat dashboard kasir...</p>
      </div>
    );
  }

  // Filter orders based on tabs
  const filteredOrders = orders?.filter((order: any) => {
    if (activeTab === 'pending') {
      return order.status === OrderStatus.PENDING_PAYMENT;
    }
    if (activeTab === 'active') {
      return [OrderStatus.PAID, OrderStatus.PROCESSING, OrderStatus.READY].includes(order.status);
    }
    return [OrderStatus.COMPLETED, OrderStatus.CANCELLED].includes(order.status);
  });

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const getBadgeClass = (status: OrderStatus) => {
    if (status === OrderStatus.PENDING_PAYMENT) return 'bg-amber-100 text-amber-800 border-amber-300';
    if (status === OrderStatus.PAID) return 'bg-blue-100 text-blue-800 border-blue-300';
    if (status === OrderStatus.PROCESSING) return 'bg-indigo-100 text-indigo-800 border-indigo-300';
    if (status === OrderStatus.READY) return 'bg-green-100 text-green-800 border-green-300';
    if (status === OrderStatus.COMPLETED) return 'bg-gray-100 text-gray-800 border-gray-300';
    return 'bg-red-100 text-red-800 border-red-300';
  };

  const getStatusLabel = (status: OrderStatus) => {
    if (status === OrderStatus.PENDING_PAYMENT) return 'Menunggu Bayar';
    if (status === OrderStatus.PAID) return 'Diterima / Lunas';
    if (status === OrderStatus.PROCESSING) return 'Sedang Dimasak';
    if (status === OrderStatus.READY) return 'Siap Hidang';
    if (status === OrderStatus.COMPLETED) return 'Selesai';
    return 'Dibatalkan';
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Navbar */}
      <header className="bg-primary text-white px-6 py-4 shadow-medium flex justify-between items-center z-10">
        <div>
          <span className="text-xs uppercase tracking-wider text-slate-300 font-semibold">Kasir Dashboard</span>
          <h1 className="text-xl font-bold font-serif">POSKita Kasir</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right text-xs">
            <div className="font-bold">{user?.name}</div>
            <div className="text-slate-300">Role: Kasir</div>
          </div>
          <button
            onClick={handleLogout}
            className="bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-1.5 rounded-sm text-xs font-bold transition-all uppercase tracking-wider"
          >
            Keluar
          </button>
        </div>
      </header>

      {/* Main Panel Grid */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* Navigation Tabs */}
        <div className="flex gap-2 border-b border-border pb-px">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-6 py-3 border-b-2 font-bold text-xs uppercase tracking-wider transition-all ${
              activeTab === 'pending'
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent text-secondary hover:text-foreground'
            }`}
          >
            Belum Bayar ({orders?.filter((o: any) => o.status === OrderStatus.PENDING_PAYMENT).length || 0})
          </button>
          <button
            onClick={() => setActiveTab('active')}
            className={`px-6 py-3 border-b-2 font-bold text-xs uppercase tracking-wider transition-all ${
              activeTab === 'active'
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent text-secondary hover:text-foreground'
            }`}
          >
            Antrean Aktif ({orders?.filter((o: any) => [OrderStatus.PAID, OrderStatus.PROCESSING, OrderStatus.READY].includes(o.status)).length || 0})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`px-6 py-3 border-b-2 font-bold text-xs uppercase tracking-wider transition-all ${
              activeTab === 'completed'
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent text-secondary hover:text-foreground'
            }`}
          >
            Riwayat Selesai ({orders?.filter((o: any) => [OrderStatus.COMPLETED, OrderStatus.CANCELLED].includes(o.status)).length || 0})
          </button>
        </div>

        {/* Order Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOrders?.length === 0 ? (
            <div className="col-span-full text-center py-20 text-secondary border border-dashed border-border rounded bg-surface">
              Tidak ada pesanan dalam tab ini.
            </div>
          ) : (
            filteredOrders?.map((order: any) => (
              <div
                key={order.id}
                className="bg-surface border border-border rounded-md shadow-subtle flex flex-col justify-between overflow-hidden"
              >
                {/* Header Card */}
                <div className="p-4 bg-muted border-b border-border flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-sm text-slate-800 font-serif">Meja {order.table.number}</h3>
                    <span className="text-[10px] text-secondary">
                      {new Date(order.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-sm text-[10px] font-bold border ${getBadgeClass(order.status)}`}>
                    {getStatusLabel(order.status)}
                  </span>
                </div>

                {/* Items detail list */}
                <div className="p-4 flex-1 space-y-3">
                  {order.orderItems.map((item: any) => (
                    <div key={item.id} className="flex justify-between items-start text-xs text-slate-700">
                      <div className="flex-1 pr-4">
                        <span className="font-semibold">{item.menu.name}</span>
                        <span className="text-secondary font-medium"> x{item.quantity}</span>
                        {item.notes && <span className="block text-[10px] text-secondary italic">Note: {item.notes}</span>}
                      </div>
                      <span className="font-bold">
                        Rp {(Number(item.price) * item.quantity).toLocaleString('id-ID')}
                      </span>
                    </div>
                  ))}
                  <hr className="border-border" />
                  <div className="flex justify-between items-center text-sm font-bold text-slate-800">
                    <span>Total Tagihan</span>
                    <span className="text-primary">
                      Rp {Number(order.totalAmount).toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-secondary">
                    <span>Metode Pembayaran</span>
                    <span className="font-semibold">{order.payments[0]?.method}</span>
                  </div>
                </div>

                {/* Actions Button Footer */}
                <div className="p-4 bg-muted border-t border-border flex gap-2">
                  {order.status === OrderStatus.PENDING_PAYMENT && (
                    <button
                      onClick={() =>
                        updateStatusMutation.mutate({ orderId: order.id, status: OrderStatus.PAID })
                      }
                      className="w-full bg-primary hover:bg-primary-hover text-white py-2 rounded-sm text-xs font-bold uppercase tracking-wider transition-colors shadow-subtle"
                    >
                      Konfirmasi Lunas (Tunai)
                    </button>
                  )}
                  {order.status === OrderStatus.PAID && (
                    <button
                      onClick={() =>
                        updateStatusMutation.mutate({ orderId: order.id, status: OrderStatus.PROCESSING })
                      }
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-sm text-xs font-bold uppercase tracking-wider transition-colors shadow-subtle"
                    >
                      Mulai Masak (Kirim ke Dapur)
                    </button>
                  )}
                  {order.status === OrderStatus.PROCESSING && (
                    <button
                      onClick={() =>
                        updateStatusMutation.mutate({ orderId: order.id, status: OrderStatus.READY })
                      }
                      className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-sm text-xs font-bold uppercase tracking-wider transition-colors shadow-subtle"
                    >
                      Tandai Siap Hidang
                    </button>
                  )}
                  {order.status === OrderStatus.READY && (
                    <button
                      onClick={() =>
                        updateStatusMutation.mutate({ orderId: order.id, status: OrderStatus.COMPLETED })
                      }
                      className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-sm text-xs font-bold uppercase tracking-wider transition-colors shadow-subtle"
                    >
                      Tutup Pesanan (Selesai)
                    </button>
                  )}
                </div>
              </div>
            )))}
        </div>
      </main>
    </div>
  );
}
