'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAppStore } from '../../lib/store';
import { Role } from '@repo/types';

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAppStore((state) => state.setAuth);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const loginMutation = useMutation({
    mutationFn: () => api.login({ username, password }),
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken);
      
      const role = data.user.role;
      if (role === Role.CASHIER) {
        router.push('/dashboard/cashier');
      } else if (role === Role.KITCHEN) {
        router.push('/dashboard/kitchen');
      } else if ([Role.OWNER, Role.MANAGER, Role.SUPER_ADMIN].includes(role)) {
        router.push('/dashboard/admin');
      } else {
        router.push('/');
      }
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Username atau password salah.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!username || !password) {
      setErrorMsg('Semua kolom harus diisi.');
      return;
    }
    loginMutation.mutate();
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <div className="bg-surface border border-border p-8 rounded-md shadow-medium max-w-md w-full">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold font-serif text-primary">Login POSKita</h1>
          <p className="text-xs text-secondary mt-1 uppercase tracking-wider font-semibold">
            Sistem Point of Sale Staf Restoran
          </p>
        </div>

        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-error text-xs rounded-sm p-3 mb-4 font-semibold">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Masukkan username"
              className="w-full bg-white border border-border rounded-sm px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-slate-300"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan password"
              className="w-full bg-white border border-border rounded-sm px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-slate-300"
            />
          </div>

          <button
            type="submit"
            disabled={loginMutation.isPending}
            className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-2.5 rounded-sm text-xs uppercase tracking-wider transition-colors shadow-subtle disabled:opacity-50 mt-2"
          >
            {loginMutation.isPending ? 'Mengecek...' : 'Masuk Dashboard'}
          </button>
        </form>

        <div className="mt-6 text-center text-[10px] text-secondary border-t border-border pt-4">
          POSKita CorpScale Design System. All rights reserved.
        </div>
      </div>
    </div>
  );
}
