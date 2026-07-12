'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { useAppStore } from '../../../lib/store';
import { Role } from '@repo/types';

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function PlatformDashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, token, logout } = useAppStore();

  useEffect(() => {
    if (!token || user?.role !== Role.SUPER_ADMIN) {
      router.push('/login');
    }
  }, [token, user, router]);

  const { data: restaurants, isLoading } = useQuery({
    queryKey: ['platform-restaurants'],
    queryFn: api.getRestaurants,
    enabled: !!token && user?.role === Role.SUPER_ADMIN,
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.updateRestaurantStatus(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-restaurants'] });
    },
    onError: (err: any) => alert(err.message || 'Gagal memperbarui status tenant'),
  });

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (!token || user?.role !== Role.SUPER_ADMIN || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
        <p className="text-secondary text-sm mt-4">Memuat panel platform...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <header className="bg-primary text-white px-6 py-4 shadow-medium flex justify-between items-center z-10">
        <div>
          <span className="text-xs uppercase tracking-wider text-slate-300 font-semibold">Platform Panel</span>
          <h1 className="text-xl font-bold font-serif">POSKita Platform</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right text-xs">
            <div className="font-bold">{user?.name}</div>
            <div className="text-slate-300">Role: Super Admin</div>
          </div>
          <button
            onClick={handleLogout}
            className="bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-1.5 rounded-sm text-xs font-bold transition-all uppercase tracking-wider"
          >
            Keluar
          </button>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-4">
        <h2 className="font-bold text-base text-slate-800 font-serif">
          Daftar Tenant ({restaurants?.length || 0})
        </h2>
        <div className="bg-surface border border-border rounded-md shadow-subtle overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-muted border-b border-border font-bold text-secondary text-[10px] uppercase tracking-wider">
                <th className="p-3 pl-4">Nama Restoran</th>
                <th className="p-3">Kode (Slug)</th>
                <th className="p-3 text-center">Staff</th>
                <th className="p-3 text-center">Order</th>
                <th className="p-3">Daftar Pada</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-right pr-4">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {restaurants?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-secondary">
                    Belum ada restoran yang terdaftar.
                  </td>
                </tr>
              ) : (
                restaurants?.map((r: any) => (
                  <tr key={r.id} className="border-b border-border hover:bg-slate-50/50 transition-colors">
                    <td className="p-3 pl-4 font-bold text-slate-800">{r.name}</td>
                    <td className="p-3 font-mono text-secondary">{r.slug}</td>
                    <td className="p-3 text-center text-secondary">{r._count?.users ?? 0}</td>
                    <td className="p-3 text-center text-secondary">{r._count?.orders ?? 0}</td>
                    <td className="p-3 text-secondary">{formatDate(r.createdAt)}</td>
                    <td className="p-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-wide border ${
                          r.isActive
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-red-50 text-red-600 border-red-200'
                        }`}
                      >
                        {r.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="p-3 pr-4 text-right">
                      <button
                        onClick={() =>
                          toggleStatusMutation.mutate({ id: r.id, isActive: !r.isActive })
                        }
                        className="border border-border bg-surface hover:bg-muted text-slate-700 px-2 py-1 rounded-sm text-[9px] font-bold uppercase tracking-wider shadow-subtle transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {r.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
