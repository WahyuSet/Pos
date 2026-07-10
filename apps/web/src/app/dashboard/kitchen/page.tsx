'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { useAppStore } from '../../../lib/store';
import { useSocket } from '../../../lib/socket';
import { OrderStatus, Role } from '@repo/types';

export default function KitchenDashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, token, logout } = useAppStore();

  useEffect(() => {
    if (!token || user?.role !== Role.KITCHEN) {
      router.push('/login');
    }
  }, [token, user, router]);

  const restaurantId = user?.restaurantId;

  // Fetch only active cooking orders (PROCESSING status)
  const { data: orders, isLoading } = useQuery({
    queryKey: ['kitchen-orders', restaurantId],
    queryFn: () => api.getOrders(restaurantId!, OrderStatus.PROCESSING),
    enabled: !!restaurantId,
  });

  // Real-time WebSocket listener
  useSocket(restaurantId, (event, data) => {
    console.log(`WebSocket event: ${event}`, data);
    queryClient.invalidateQueries({ queryKey: ['kitchen-orders', restaurantId] });
  });

  // Complete cooking order mutation
  const completeCookingMutation = useMutation({
    mutationFn: (orderId: string) =>
      api.updateOrderStatus(restaurantId!, orderId, OrderStatus.READY),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kitchen-orders', restaurantId] });
    },
    onError: (err: any) => {
      alert(err.message || 'Gagal menyelesaikan pesanan');
    },
  });

  if (!restaurantId || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
        <p className="text-secondary text-sm mt-4">Memuat KDS Dapur...</p>
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0F172A] text-white">
      {/* Navbar Dapur */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex justify-between items-center z-10">
        <div>
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Kitchen Display System (KDS)</span>
          <h1 className="text-xl font-bold font-serif text-amber-500">POSKita Dapur</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right text-xs">
            <div className="font-bold">{user?.name}</div>
            <div className="text-slate-400">Role: Dapur</div>
          </div>
          <button
            onClick={handleLogout}
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-sm text-xs font-bold transition-all uppercase tracking-wider"
          >
            Keluar
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <main className="flex-1 p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
            Daftar Masakan yang Harus Disiapkan ({orders?.length || 0})
          </h2>
        </div>

        {/* Dense cards for quick action */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {orders?.length === 0 ? (
            <div className="col-span-full text-center py-20 text-slate-400 border border-dashed border-slate-800 rounded bg-slate-900">
              Belum ada pesanan masuk untuk dimasak.
            </div>
          ) : (
            orders?.map((order: any) => (
              <div
                key={order.id}
                className="bg-slate-900 border border-slate-800 rounded-md shadow-large overflow-hidden flex flex-col justify-between"
              >
                {/* Card Title */}
                <div className="p-3 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
                  <span className="font-bold text-lg text-amber-400">Meja {order.table.number}</span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(order.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* Items List */}
                <div className="p-4 flex-1 space-y-3">
                  {order.orderItems.map((item: any) => (
                    <div key={item.id} className="text-sm">
                      <div className="flex justify-between font-semibold text-slate-200">
                        <span>{item.menu.name}</span>
                        <span className="text-amber-400 font-bold">x{item.quantity}</span>
                      </div>
                      {item.notes && (
                        <div className="text-xs text-amber-500 bg-amber-500/5 px-2 py-1 rounded-sm mt-1 border border-amber-500/10 italic">
                          Catatan: {item.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Confirm Button */}
                <div className="p-3 bg-slate-800 border-t border-slate-700">
                  <button
                    onClick={() => completeCookingMutation.mutate(order.id)}
                    disabled={completeCookingMutation.isPending}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 py-2.5 rounded-sm text-xs font-bold uppercase tracking-wider transition-colors shadow-subtle disabled:opacity-50"
                  >
                    {completeCookingMutation.isPending ? 'Menyimpan...' : 'Selesai Dimasak ✔'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
