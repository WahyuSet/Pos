'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAppStore } from '../../lib/store';

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAppStore((state) => state.setAuth);

  const [restaurantName, setRestaurantName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [ownerName, setOwnerName] = useState('');
  const [ownerUsername, setOwnerUsername] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleRestaurantNameChange = (value: string) => {
    setRestaurantName(value);
    if (!slugTouched) {
      setSlug(slugify(value));
    }
  };

  const registerMutation = useMutation({
    mutationFn: () =>
      api.registerRestaurant({
        name: restaurantName,
        slug: slug || undefined,
        ownerName,
        ownerUsername,
        ownerPassword,
      }),
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken);
      router.push('/dashboard/admin');
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Gagal mendaftarkan restoran.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!restaurantName || !ownerName || !ownerUsername || !ownerPassword) {
      setErrorMsg('Semua kolom harus diisi.');
      return;
    }
    if (ownerPassword.length < 6) {
      setErrorMsg('Password minimal 6 karakter.');
      return;
    }
    registerMutation.mutate();
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <div className="bg-surface border border-border p-8 rounded-md shadow-medium max-w-md w-full">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold font-serif text-primary">Daftar Restoran</h1>
          <p className="text-xs text-secondary mt-1 uppercase tracking-wider font-semibold">
            Mulai Kelola Restoran Anda dengan POSKita
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
              Nama Restoran
            </label>
            <input
              type="text"
              value={restaurantName}
              onChange={(e) => handleRestaurantNameChange(e.target.value)}
              placeholder="mis. Rumah Makan Sederhana"
              className="w-full bg-white border border-border rounded-sm px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-slate-300"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
              Kode Restoran (slug)
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(slugify(e.target.value));
              }}
              placeholder="mis. rumah-makan-sederhana"
              className="w-full bg-white border border-border rounded-sm px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-slate-300"
            />
            <p className="text-[10px] text-secondary mt-1">Dipakai untuk login staf nantinya. Otomatis dari nama restoran, boleh diubah.</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
              Nama Anda (Pemilik)
            </label>
            <input
              type="text"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="Nama lengkap"
              className="w-full bg-white border border-border rounded-sm px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-slate-300"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
              Username
            </label>
            <input
              type="text"
              value={ownerUsername}
              onChange={(e) => setOwnerUsername(e.target.value)}
              placeholder="Username untuk login"
              className="w-full bg-white border border-border rounded-sm px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-slate-300"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={ownerPassword}
              onChange={(e) => setOwnerPassword(e.target.value)}
              placeholder="Minimal 6 karakter"
              className="w-full bg-white border border-border rounded-sm px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-slate-300"
            />
          </div>

          <button
            type="submit"
            disabled={registerMutation.isPending}
            className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-2.5 rounded-sm text-xs uppercase tracking-wider transition-colors shadow-subtle disabled:opacity-50 mt-2"
          >
            {registerMutation.isPending ? 'Mendaftarkan...' : 'Daftar & Masuk Dashboard'}
          </button>
        </form>

        <div className="mt-4 text-center text-xs text-secondary">
          Sudah punya restoran?{' '}
          <a href="/login" className="text-primary font-semibold hover:underline">
            Masuk di sini
          </a>
        </div>

        <div className="mt-4 text-center text-[10px] text-secondary border-t border-border pt-4">
          POSKita CorpScale Design System. All rights reserved.
        </div>
      </div>
    </div>
  );
}
