'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QRCodeCanvas } from 'qrcode.react';
import { api } from '../../../lib/api';
import { useAppStore } from '../../../lib/store';
import { Role } from '@repo/types';

const MAX_UPLOAD_SIZE_BYTES = 2 * 1024 * 1024; // 2MB — harus sinkron dengan limit di server

export default function AdminDashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, token, logout } = useAppStore();

  const [activeSubTab, setActiveSubTab] = useState<'menu' | 'categories' | 'tables' | 'vouchers' | 'settings'>('menu');

  // Input states
  const [newCatName, setNewCatName] = useState('');
  const [newTableNum, setNewTableNum] = useState('');
  const [restaurantProfileForm, setRestaurantProfileForm] = useState({ name: '', address: '', phone: '' });
  const [qrPreviewTable, setQrPreviewTable] = useState<{ id: string; number: string; qrCodeUrl: string } | null>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  const [newMenu, setNewMenu] = useState({
    categoryId: '',
    name: '',
    description: '',
    price: 0,
    imageUrl: '',
  });

  const [newVoucher, setNewVoucher] = useState({
    code: '',
    description: '',
    discountPercent: 0,
    maxDiscountAmount: '',
    minPurchaseAmount: '',
    startsAt: '',
    expiresAt: '',
    maxRedemptions: '',
    isActive: true,
  });

  // Edit Mode states
  const [editingMenuId, setEditingMenuId] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [editingTableId, setEditingTableId] = useState<string | null>(null);
  const [editTableNum, setEditTableNum] = useState('');
  const [editingVoucherId, setEditingVoucherId] = useState<string | null>(null);

  // Search & Filter states
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      alert('Ukuran file terlalu besar. Maksimal 2MB.');
      e.target.value = '';
      return;
    }

    setIsUploading(true);
    try {
      const res = await api.uploadMenuImage(restaurantId!, file);
      setNewMenu((prev) => ({ ...prev, imageUrl: res.imageUrl }));
    } catch (err: any) {
      alert(err.message || 'Gagal mengunggah gambar');
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    if (!token || ![Role.OWNER, Role.MANAGER, Role.SUPER_ADMIN].includes(user?.role as any)) {
      router.push('/login');
    }
  }, [token, user, router]);

  const restaurantId = user?.restaurantId;

  // Fetch Restaurant details
  const { data: restaurant, isLoading: isRestLoading } = useQuery({
    queryKey: ['admin-restaurant', restaurantId],
    queryFn: () => api.getRestaurant(restaurantId!),
    enabled: !!restaurantId,
  });

  useEffect(() => {
    if (restaurant) {
      setRestaurantProfileForm({
        name: restaurant.name || '',
        address: restaurant.address || '',
        phone: restaurant.phone || '',
      });
    }
  }, [restaurant]);

  // Fetch Categories
  const { data: categories, isLoading: isCatsLoading } = useQuery({
    queryKey: ['admin-categories', restaurantId],
    queryFn: () => api.getCategories(restaurantId!),
    enabled: !!restaurantId,
  });

  // Fetch Tables
  const { data: tables, isLoading: isTablesLoading } = useQuery({
    queryKey: ['admin-tables', restaurantId],
    queryFn: () => api.getTables(restaurantId!),
    enabled: !!restaurantId,
  });

  // Fetch Menus
  const { data: menus, isLoading: isMenusLoading } = useQuery({
    queryKey: ['admin-menus', restaurantId],
    queryFn: () => api.getMenus(restaurantId!),
    enabled: !!restaurantId,
  });

  // Fetch Vouchers
  const { data: vouchers, isLoading: isVouchersLoading } = useQuery({
    queryKey: ['admin-vouchers', restaurantId],
    queryFn: () => api.getVouchers(restaurantId!),
    enabled: !!restaurantId,
  });

  // Mutations
  const updatePaymentSettingsMutation = useMutation({
    mutationFn: (settings: {
      enableCash?: boolean;
      enableQris?: boolean;
      enableEWallet?: boolean;
      enableBankTransfer?: boolean;
      enableTax?: boolean;
      taxRate?: number;
    }) => api.updatePaymentSettings(restaurantId!, settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-restaurant', restaurantId] });
    },
    onError: (err: any) => alert(err.message || 'Gagal memperbarui pengaturan pembayaran'),
  });

  const updateRestaurantProfileMutation = useMutation({
    mutationFn: (data: { name?: string; address?: string; phone?: string }) =>
      api.updateRestaurant(restaurantId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-restaurant', restaurantId] });
    },
    onError: (err: any) => alert(err.message || 'Gagal memperbarui profil restoran'),
  });

  const addCategoryMutation = useMutation({
    mutationFn: (name: string) => api.createCategory(restaurantId!, name),
    onSuccess: () => {
      setNewCatName('');
      queryClient.invalidateQueries({ queryKey: ['admin-categories', restaurantId] });
    },
    onError: (err: any) => alert(err.message || 'Gagal menambahkan kategori'),
  });

  const addTableMutation = useMutation({
    mutationFn: (number: string) => api.createTable(restaurantId!, number),
    onSuccess: () => {
      setNewTableNum('');
      queryClient.invalidateQueries({ queryKey: ['admin-tables', restaurantId] });
    },
    onError: (err: any) => alert(err.message || 'Gagal menambahkan meja'),
  });

  const addMenuMutation = useMutation({
    mutationFn: (data: any) => api.createMenu(restaurantId!, data),
    onSuccess: () => {
      setNewMenu({ categoryId: '', name: '', description: '', price: 0, imageUrl: '' });
      queryClient.invalidateQueries({ queryKey: ['admin-menus', restaurantId] });
    },
    onError: (err: any) => alert(err.message || 'Gagal menambahkan menu'),
  });

  const toggleAvailabilityMutation = useMutation({
    mutationFn: ({ menuId, isAvailable }: { menuId: string; isAvailable: boolean }) =>
      api.updateMenu(restaurantId!, menuId, { isAvailable }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-menus', restaurantId] });
    },
    onError: (err: any) => alert(err.message || 'Gagal memperbarui ketersediaan'),
  });

  const deleteMenuMutation = useMutation({
    mutationFn: (menuId: string) => api.deleteMenu(restaurantId!, menuId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-menus', restaurantId] });
    },
    onError: (err: any) => alert(err.message || 'Gagal menghapus menu'),
  });

  const editMenuMutation = useMutation({
    mutationFn: ({ menuId, data }: { menuId: string; data: any }) =>
      api.updateMenu(restaurantId!, menuId, data),
    onSuccess: () => {
      setEditingMenuId(null);
      setNewMenu({ categoryId: '', name: '', description: '', price: 0, imageUrl: '' });
      queryClient.invalidateQueries({ queryKey: ['admin-menus', restaurantId] });
    },
    onError: (err: any) => alert(err.message || 'Gagal memperbarui menu'),
  });

  const editCategoryMutation = useMutation({
    mutationFn: ({ categoryId, name }: { categoryId: string; name: string }) =>
      api.updateCategory(restaurantId!, categoryId, name),
    onSuccess: () => {
      setEditingCategoryId(null);
      setEditCatName('');
      queryClient.invalidateQueries({ queryKey: ['admin-categories', restaurantId] });
    },
    onError: (err: any) => alert(err.message || 'Gagal memperbarui kategori'),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (categoryId: string) => api.deleteCategory(restaurantId!, categoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories', restaurantId] });
    },
    onError: (err: any) => alert(err.message || 'Gagal menghapus kategori. Pastikan tidak ada menu dalam kategori ini.'),
  });

  const editTableMutation = useMutation({
    mutationFn: ({ tableId, number }: { tableId: string; number: string }) =>
      api.updateTable(restaurantId!, tableId, number),
    onSuccess: () => {
      setEditingTableId(null);
      setEditTableNum('');
      queryClient.invalidateQueries({ queryKey: ['admin-tables', restaurantId] });
    },
    onError: (err: any) => alert(err.message || 'Gagal memperbarui meja'),
  });

  const deleteTableMutation = useMutation({
    mutationFn: (tableId: string) => api.deleteTable(restaurantId!, tableId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tables', restaurantId] });
    },
    onError: (err: any) => alert(err.message || 'Gagal menghapus meja'),
  });

  const handleDownloadQr = () => {
    const canvas = qrCanvasRef.current;
    if (!canvas || !qrPreviewTable) return;
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `QR-Meja-${qrPreviewTable.number}.png`;
    link.click();
  };

  const handleCopyQrLink = () => {
    if (!qrPreviewTable) return;
    navigator.clipboard.writeText(`${window.location.origin}${qrPreviewTable.qrCodeUrl}`);
  };

  const resetVoucherForm = () =>
    setNewVoucher({
      code: '',
      description: '',
      discountPercent: 0,
      maxDiscountAmount: '',
      minPurchaseAmount: '',
      startsAt: '',
      expiresAt: '',
      maxRedemptions: '',
      isActive: true,
    });

  const buildVoucherPayload = () => ({
    code: newVoucher.code,
    description: newVoucher.description || undefined,
    discountPercent: Number(newVoucher.discountPercent),
    maxDiscountAmount: newVoucher.maxDiscountAmount ? Number(newVoucher.maxDiscountAmount) : undefined,
    minPurchaseAmount: newVoucher.minPurchaseAmount ? Number(newVoucher.minPurchaseAmount) : undefined,
    startsAt: newVoucher.startsAt ? new Date(newVoucher.startsAt).toISOString() : undefined,
    expiresAt: newVoucher.expiresAt ? new Date(newVoucher.expiresAt).toISOString() : undefined,
    maxRedemptions: newVoucher.maxRedemptions ? Number(newVoucher.maxRedemptions) : undefined,
    isActive: newVoucher.isActive,
  });

  const addVoucherMutation = useMutation({
    mutationFn: (data: any) => api.createVoucher(restaurantId!, data),
    onSuccess: () => {
      resetVoucherForm();
      queryClient.invalidateQueries({ queryKey: ['admin-vouchers', restaurantId] });
    },
    onError: (err: any) => alert(err.message || 'Gagal menambahkan voucher'),
  });

  const editVoucherMutation = useMutation({
    mutationFn: ({ voucherId, data }: { voucherId: string; data: any }) =>
      api.updateVoucher(restaurantId!, voucherId, data),
    onSuccess: () => {
      setEditingVoucherId(null);
      resetVoucherForm();
      queryClient.invalidateQueries({ queryKey: ['admin-vouchers', restaurantId] });
    },
    onError: (err: any) => alert(err.message || 'Gagal memperbarui voucher'),
  });

  const deleteVoucherMutation = useMutation({
    mutationFn: (voucherId: string) => api.deleteVoucher(restaurantId!, voucherId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-vouchers', restaurantId] });
    },
    onError: (err: any) => alert(err.message || 'Gagal menghapus voucher'),
  });

  const toggleVoucherActiveMutation = useMutation({
    mutationFn: ({ voucherId, isActive }: { voucherId: string; isActive: boolean }) =>
      api.updateVoucher(restaurantId!, voucherId, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-vouchers', restaurantId] });
    },
    onError: (err: any) => alert(err.message || 'Gagal memperbarui status voucher'),
  });

  if (!restaurantId || isCatsLoading || isTablesLoading || isMenusLoading || isRestLoading || isVouchersLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
        <p className="text-secondary text-sm mt-4">Memuat panel admin...</p>
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const filteredMenus = menus?.filter((menu: any) => {
    const matchesCategory = selectedCategoryFilter ? menu.categoryId === selectedCategoryFilter : true;
    const matchesSearch = menu.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (menu.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Admin Navbar */}
      <header className="bg-primary text-white px-6 py-4 shadow-medium flex justify-between items-center z-10">
        <div>
          <span className="text-xs uppercase tracking-wider text-slate-300 font-semibold">Admin Panel</span>
          <h1 className="text-xl font-bold font-serif">POSKita Manajemen</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right text-xs">
            <div className="font-bold">{user?.name}</div>
            <div className="text-slate-300">Role: Owner / Manager</div>
          </div>
          <button
            onClick={handleLogout}
            className="bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-1.5 rounded-sm text-xs font-bold transition-all uppercase tracking-wider"
          >
            Keluar
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* Navigation SubTabs */}
        <div className="flex gap-2 border-b border-border pb-px">
          <button
            onClick={() => setActiveSubTab('menu')}
            className={`px-6 py-3 border-b-2 font-bold text-xs uppercase tracking-wider transition-all ${
              activeSubTab === 'menu'
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent text-secondary hover:text-foreground'
            }`}
          >
            Manajemen Menu ({menus?.length || 0})
          </button>
          <button
            onClick={() => setActiveSubTab('categories')}
            className={`px-6 py-3 border-b-2 font-bold text-xs uppercase tracking-wider transition-all ${
              activeSubTab === 'categories'
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent text-secondary hover:text-foreground'
            }`}
          >
            Kategori ({categories?.length || 0})
          </button>
          <button
            onClick={() => setActiveSubTab('tables')}
            className={`px-6 py-3 border-b-2 font-bold text-xs uppercase tracking-wider transition-all ${
              activeSubTab === 'tables'
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent text-secondary hover:text-foreground'
            }`}
          >
            Meja / QR Code ({tables?.length || 0})
          </button>
          <button
            onClick={() => setActiveSubTab('vouchers')}
            className={`px-6 py-3 border-b-2 font-bold text-xs uppercase tracking-wider transition-all ${
              activeSubTab === 'vouchers'
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent text-secondary hover:text-foreground'
            }`}
          >
            Voucher ({vouchers?.length || 0})
          </button>
          <button
            onClick={() => setActiveSubTab('settings')}
            className={`px-6 py-3 border-b-2 font-bold text-xs uppercase tracking-wider transition-all ${
              activeSubTab === 'settings'
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent text-secondary hover:text-foreground'
            }`}
          >
            Pengaturan Pembayaran
          </button>
        </div>

        {/* Tab Content: Menu */}
        {activeSubTab === 'menu' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form Menu Baru */}
            <div className="bg-surface border border-border p-6 rounded-md shadow-subtle h-fit">
              <h3 className="font-bold text-base text-slate-800 font-serif mb-4">
                {editingMenuId ? 'Edit Menu Hidangan' : 'Tambah Menu Baru'}
              </h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newMenu.name || !newMenu.price || !newMenu.categoryId) return;
                  if (editingMenuId) {
                    editMenuMutation.mutate({ menuId: editingMenuId, data: newMenu });
                  } else {
                    addMenuMutation.mutate(newMenu);
                  }
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Kategori</label>
                  <select
                    value={newMenu.categoryId}
                    onChange={(e) => setNewMenu({ ...newMenu, categoryId: e.target.value })}
                    className="w-full bg-white border border-border rounded-sm px-3 py-2 text-sm outline-none"
                    required
                  >
                    <option value="">Pilih Kategori</option>
                    {categories?.map((cat: any) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nama Menu</label>
                  <input
                    type="text"
                    placeholder="Nama Makanan / Minuman"
                    value={newMenu.name}
                    onChange={(e) => setNewMenu({ ...newMenu, name: e.target.value })}
                    className="w-full bg-white border border-border rounded-sm px-3 py-2 text-sm outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Deskripsi</label>
                  <textarea
                    placeholder="Deskripsi menu singkat"
                    value={newMenu.description}
                    onChange={(e) => setNewMenu({ ...newMenu, description: e.target.value })}
                    className="w-full bg-white border border-border rounded-sm px-3 py-2 text-sm outline-none h-20 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Harga (Rp)</label>
                  <input
                    type="number"
                    placeholder="Harga jual"
                    value={newMenu.price || ''}
                    onChange={(e) => setNewMenu({ ...newMenu, price: Number(e.target.value) })}
                    className="w-full bg-white border border-border rounded-sm px-3 py-2 text-sm outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Foto Menu (Upload)</label>
                  <div className="space-y-3">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={isUploading}
                      className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-sm file:border file:border-border file:text-xs file:font-semibold file:bg-muted file:text-secondary hover:file:bg-slate-200 file:cursor-pointer"
                    />
                    
                    {/* Progress upload / preview */}
                    {isUploading && (
                      <div className="text-xs text-primary font-semibold animate-pulse">Mengunggah gambar...</div>
                    )}

                    {newMenu.imageUrl && (
                      <div className="flex items-center gap-2 border border-border p-2 rounded-sm bg-muted/30">
                        <div className="w-12 h-12 rounded-sm overflow-hidden bg-white border border-border">
                          <img
                            src={newMenu.imageUrl}
                            alt="Preview"
                            className="object-cover w-full h-full"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] font-bold text-slate-800 truncate">Gambar terunggah</div>
                          <div className="text-[9px] text-secondary truncate">{newMenu.imageUrl}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setNewMenu((prev) => ({ ...prev, imageUrl: '' }))}
                          className="text-xs font-bold text-error hover:underline px-2"
                        >
                          Hapus
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={addMenuMutation.isPending || editMenuMutation.isPending}
                  className="w-full bg-primary hover:bg-primary-hover text-white py-2 rounded-sm text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
                >
                  {editingMenuId ? (editMenuMutation.isPending ? 'Menyimpan...' : 'Simpan Perubahan') : (addMenuMutation.isPending ? 'Menyimpan...' : 'Simpan Menu')}
                </button>
                {editingMenuId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingMenuId(null);
                      setNewMenu({ categoryId: '', name: '', description: '', price: 0, imageUrl: '' });
                    }}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-sm text-xs font-bold uppercase tracking-wider transition-colors mt-2"
                  >
                    Batal Edit
                  </button>
                )}
              </form>
            </div>

            {/* List Menu */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <h3 className="font-bold text-base text-slate-800 font-serif">Daftar Menu Hidangan</h3>
                
                {/* Search & Filter Controls */}
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto items-center">
                  <div className="relative w-full sm:w-48">
                    <input
                      type="text"
                      placeholder="Cari menu..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-white border border-border rounded-sm pl-8 pr-3 py-1.5 text-xs outline-none focus:border-primary transition-all"
                    />
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-secondary pointer-events-none text-[10px]">
                      🔍
                    </span>
                  </div>
                  <select
                    value={selectedCategoryFilter}
                    onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                    className="w-full sm:w-40 bg-white border border-border rounded-sm px-3 py-1.5 text-xs outline-none focus:border-primary transition-all text-slate-700"
                  >
                    <option value="">Semua Kategori</option>
                    {categories?.map((cat: any) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="bg-surface border border-border rounded-md shadow-subtle overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-muted border-b border-border font-bold text-secondary text-[10px] uppercase tracking-wider">
                      <th className="p-3 pl-4 w-[40%]">Nama Menu</th>
                      <th className="p-3 w-[15%]">Kategori</th>
                      <th className="p-3 text-right w-[15%]">Harga</th>
                      <th className="p-3 text-center w-[12%]">Status</th>
                      <th className="p-3 text-right pr-4 w-[18%]">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMenus?.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-10 text-center text-secondary">
                          {menus?.length === 0
                            ? 'Tidak ada menu. Tambahkan menu baru terlebih dahulu.'
                            : 'Tidak ada menu yang cocok dengan pencarian / filter Anda.'}
                        </td>
                      </tr>
                    ) : (
                      filteredMenus?.map((menu: any) => (
                        <tr key={menu.id} className="border-b border-border hover:bg-slate-50/50 transition-colors">
                          <td className="p-3 pl-4">
                            <div className="flex items-center gap-3">
                              {/* Thumbnail preview */}
                              <div className="w-12 h-12 rounded-sm overflow-hidden bg-slate-100 border border-border flex items-center justify-center shrink-0 shadow-subtle">
                                {menu.imageUrl ? (
                                  <img
                                    src={menu.imageUrl}
                                    alt={menu.name}
                                    className="object-cover w-full h-full"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100&auto=format&fit=crop&q=60';
                                    }}
                                  />
                                ) : (
                                  <span className="text-[9px] text-slate-400 font-bold uppercase">No Pic</span>
                                )}
                              </div>
                              <div>
                                <div className="font-bold text-slate-800 text-sm leading-snug">{menu.name}</div>
                                {menu.description && (
                                  <div className="text-[10px] text-secondary mt-0.5 max-w-[200px] md:max-w-[250px] line-clamp-1" title={menu.description}>
                                    {menu.description}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-3 font-semibold text-secondary">{menu.category?.name}</td>
                          <td className="p-3 font-bold text-slate-800 text-right">
                            Rp {Number(menu.price).toLocaleString('id-ID')}
                          </td>
                          <td className="p-3 text-center">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-wide border ${
                                menu.isAvailable
                                  ? 'bg-green-50 text-green-700 border-green-200'
                                  : 'bg-red-50 text-red-600 border-red-200'
                              }`}
                            >
                              {menu.isAvailable ? 'Tersedia' : 'Habis'}
                            </span>
                          </td>
                          <td className="p-3 pr-4 text-right">
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setEditingMenuId(menu.id);
                                  setNewMenu({
                                    categoryId: menu.categoryId,
                                    name: menu.name,
                                    description: menu.description || '',
                                    price: Number(menu.price),
                                    imageUrl: menu.imageUrl || '',
                                  });
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className="bg-primary hover:bg-primary-hover text-white px-2 py-1 rounded-sm text-[9px] font-bold uppercase tracking-wider shadow-subtle transition-all"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() =>
                                  toggleAvailabilityMutation.mutate({
                                    menuId: menu.id,
                                    isAvailable: !menu.isAvailable,
                                  })
                                }
                                className="border border-border bg-surface hover:bg-muted text-slate-700 px-2 py-1 rounded-sm text-[9px] font-bold uppercase tracking-wider shadow-subtle transition-all"
                              >
                                {menu.isAvailable ? 'Set Habis' : 'Set Tersedia'}
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm('Hapus menu ini?')) {
                                    deleteMenuMutation.mutate(menu.id);
                                  }
                                }}
                                className="border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 px-2 py-1 rounded-sm text-[9px] font-bold uppercase tracking-wider shadow-subtle transition-all"
                              >
                                Hapus
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content: Categories */}
        {activeSubTab === 'categories' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Form Kategori */}
            <div className="bg-surface border border-border p-6 rounded-md shadow-subtle h-fit">
              <h3 className="font-bold text-base text-slate-800 font-serif mb-4">Kategori Baru</h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newCatName) return;
                  addCategoryMutation.mutate(newCatName);
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nama Kategori</label>
                  <input
                    type="text"
                    placeholder="Contoh: Makanan Utama, Minuman"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="w-full bg-white border border-border rounded-sm px-3 py-2 text-sm outline-none"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={addCategoryMutation.isPending}
                  className="w-full bg-primary hover:bg-primary-hover text-white py-2 rounded-sm text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
                >
                  {addCategoryMutation.isPending ? 'Menyimpan...' : 'Tambah Kategori'}
                </button>
              </form>
            </div>

            {/* List Kategori */}
            <div className="md:col-span-2 space-y-4">
              <h3 className="font-bold text-base text-slate-800 font-serif">Daftar Kategori</h3>
              <div className="bg-surface border border-border rounded-md shadow-subtle overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-muted border-b border-border font-bold text-secondary text-[10px] uppercase tracking-wider">
                      <th className="p-3">Nama Kategori</th>
                      <th className="p-3">ID Kategori</th>
                      <th className="p-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories?.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="p-10 text-center text-secondary">
                          Tidak ada kategori.
                        </td>
                      </tr>
                    ) : (
                      categories?.map((cat: any) => (
                        <tr key={cat.id} className="border-b border-border">
                          {editingCategoryId === cat.id ? (
                            <td className="p-3" colSpan={3}>
                              <div className="flex gap-2 items-center">
                                <input
                                  type="text"
                                  value={editCatName}
                                  onChange={(e) => setEditCatName(e.target.value)}
                                  className="bg-white border border-border rounded-sm px-2 py-1 text-xs outline-none flex-1 max-w-[200px]"
                                />
                                <button
                                  type="button"
                                  onClick={() => editCategoryMutation.mutate({ categoryId: cat.id, name: editCatName })}
                                  disabled={editCategoryMutation.isPending}
                                  className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded-sm font-semibold text-[10px]"
                                >
                                  {editCategoryMutation.isPending ? 'Simpan...' : 'Simpan'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingCategoryId(null)}
                                  className="bg-muted hover:bg-slate-200 text-slate-700 px-2 py-1 rounded-sm border border-border font-semibold text-[10px]"
                                >
                                  Batal
                                </button>
                              </div>
                            </td>
                          ) : (
                            <>
                              <td className="p-3 font-bold text-slate-800">{cat.name}</td>
                              <td className="p-3 font-mono text-secondary text-[10px]">{cat.id}</td>
                              <td className="p-3 text-right flex justify-end gap-2">
                                <button
                                  onClick={() => {
                                    setEditingCategoryId(cat.id);
                                    setEditCatName(cat.name);
                                  }}
                                  className="bg-primary hover:bg-primary-hover text-white px-2 py-1 rounded-sm font-semibold text-[10px]"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => {
                                    if (confirm('Hapus kategori ini beserta seluruh menunya?')) {
                                      deleteCategoryMutation.mutate(cat.id);
                                    }
                                  }}
                                  className="bg-red-50 hover:bg-red-100 text-red-600 px-2 py-1 rounded-sm border border-red-200 font-semibold text-[10px]"
                                >
                                  Hapus
                                </button>
                              </td>
                            </>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content: Tables */}
        {activeSubTab === 'tables' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Form Meja */}
            <div className="bg-surface border border-border p-6 rounded-md shadow-subtle h-fit">
              <h3 className="font-bold text-base text-slate-800 font-serif mb-4">Meja Baru</h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newTableNum) return;
                  addTableMutation.mutate(newTableNum);
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nomor Meja</label>
                  <input
                    type="text"
                    placeholder="Contoh: 01, Meja Bar A"
                    value={newTableNum}
                    onChange={(e) => setNewTableNum(e.target.value)}
                    className="w-full bg-white border border-border rounded-sm px-3 py-2 text-sm outline-none"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={addTableMutation.isPending}
                  className="w-full bg-primary hover:bg-primary-hover text-white py-2 rounded-sm text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
                >
                  {addTableMutation.isPending ? 'Menyimpan...' : 'Tambah Meja'}
                </button>
              </form>
            </div>

            {/* List Meja */}
            <div className="md:col-span-2 space-y-4">
              <h3 className="font-bold text-base text-slate-800 font-serif">Daftar Meja & QR Code</h3>
              <div className="bg-surface border border-border rounded-md shadow-subtle overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-muted border-b border-border font-bold text-secondary text-[10px] uppercase tracking-wider">
                      <th className="p-3">Nomor Meja</th>
                      <th className="p-3">QR Link</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tables?.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-10 text-center text-secondary">
                          Tidak ada meja.
                        </td>
                      </tr>
                    ) : (
                      tables?.map((table: any) => (
                        <tr key={table.id} className="border-b border-border">
                          {editingTableId === table.id ? (
                            <td className="p-3" colSpan={4}>
                              <div className="flex gap-2 items-center">
                                <input
                                  type="text"
                                  value={editTableNum}
                                  onChange={(e) => setEditTableNum(e.target.value)}
                                  className="bg-white border border-border rounded-sm px-2 py-1 text-xs outline-none flex-1 max-w-[200px]"
                                />
                                <button
                                  type="button"
                                  onClick={() => editTableMutation.mutate({ tableId: table.id, number: editTableNum })}
                                  disabled={editTableMutation.isPending}
                                  className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded-sm font-semibold text-[10px]"
                                >
                                  {editTableMutation.isPending ? 'Simpan...' : 'Simpan'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingTableId(null)}
                                  className="bg-muted hover:bg-slate-200 text-slate-700 px-2 py-1 rounded-sm border border-border font-semibold text-[10px]"
                                >
                                  Batal
                                </button>
                              </div>
                            </td>
                          ) : (
                            <>
                              <td className="p-3 font-bold text-slate-800">Meja {table.number}</td>
                              <td className="p-3 font-mono text-secondary text-[10px]">
                                <a
                                  href={`/order?tableId=${table.id}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-tertiary hover:underline"
                                >
                                  {`/order?tableId=${table.id}`}
                                </a>
                              </td>
                              <td className="p-3">
                                <span className="px-2 py-0.5 rounded-sm font-semibold text-[10px] border bg-green-50 text-green-700 border-green-200">
                                  Aktif QR
                                </span>
                              </td>
                              <td className="p-3 text-right flex justify-end gap-2">
                                <button
                                  onClick={() =>
                                    setQrPreviewTable({ id: table.id, number: table.number, qrCodeUrl: table.qrCodeUrl })
                                  }
                                  className="bg-muted hover:bg-slate-200 text-slate-700 px-2 py-1 rounded-sm border border-border font-semibold text-[10px]"
                                >
                                  Lihat QR
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingTableId(table.id);
                                    setEditTableNum(table.number);
                                  }}
                                  className="bg-primary hover:bg-primary-hover text-white px-2 py-1 rounded-sm font-semibold text-[10px]"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => {
                                    if (confirm('Hapus meja ini beserta data order yang terkait?')) {
                                      deleteTableMutation.mutate(table.id);
                                    }
                                  }}
                                  className="bg-red-50 hover:bg-red-100 text-red-600 px-2 py-1 rounded-sm border border-red-200 font-semibold text-[10px]"
                                >
                                  Hapus
                                </button>
                              </td>
                            </>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Modal: QR Code Preview */}
        {qrPreviewTable && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setQrPreviewTable(null)}
          >
            <div
              className="bg-surface border border-border rounded-md shadow-subtle w-full max-w-xs p-6 text-center space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-bold text-base text-slate-800 font-serif">QR Code Meja {qrPreviewTable.number}</h3>
              <div className="flex justify-center">
                <QRCodeCanvas
                  ref={qrCanvasRef}
                  value={`${window.location.origin}${qrPreviewTable.qrCodeUrl}`}
                  size={220}
                />
              </div>
              <p className="text-[10px] font-mono text-secondary break-all">
                {`${window.location.origin}${qrPreviewTable.qrCodeUrl}`}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleDownloadQr}
                  className="flex-1 bg-primary hover:bg-primary-hover text-white py-2 rounded-sm text-xs font-bold uppercase tracking-wider"
                >
                  Unduh PNG
                </button>
                <button
                  onClick={handleCopyQrLink}
                  className="flex-1 bg-muted hover:bg-slate-200 text-slate-700 py-2 rounded-sm border border-border text-xs font-bold uppercase tracking-wider"
                >
                  Salin Link
                </button>
              </div>
              <button
                onClick={() => setQrPreviewTable(null)}
                className="text-secondary text-xs hover:underline"
              >
                Tutup
              </button>
            </div>
          </div>
        )}

        {/* Tab Content: Vouchers */}
        {activeSubTab === 'vouchers' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form Voucher */}
            <div className="bg-surface border border-border p-6 rounded-md shadow-subtle h-fit">
              <h3 className="font-bold text-base text-slate-800 font-serif mb-4">
                {editingVoucherId ? 'Edit Voucher' : 'Voucher Baru'}
              </h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newVoucher.code || !newVoucher.discountPercent) return;
                  const data = buildVoucherPayload();
                  if (editingVoucherId) {
                    editVoucherMutation.mutate({ voucherId: editingVoucherId, data });
                  } else {
                    addVoucherMutation.mutate(data);
                  }
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Kode Voucher</label>
                  <input
                    type="text"
                    placeholder="Contoh: HEMAT10"
                    value={newVoucher.code}
                    onChange={(e) => setNewVoucher({ ...newVoucher, code: e.target.value.toUpperCase() })}
                    className="w-full bg-white border border-border rounded-sm px-3 py-2 text-sm outline-none uppercase"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Deskripsi</label>
                  <input
                    type="text"
                    placeholder="Keterangan singkat (opsional)"
                    value={newVoucher.description}
                    onChange={(e) => setNewVoucher({ ...newVoucher, description: e.target.value })}
                    className="w-full bg-white border border-border rounded-sm px-3 py-2 text-sm outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Diskon (%)</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      placeholder="10"
                      value={newVoucher.discountPercent || ''}
                      onChange={(e) => setNewVoucher({ ...newVoucher, discountPercent: Number(e.target.value) })}
                      className="w-full bg-white border border-border rounded-sm px-3 py-2 text-sm outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Maks. Potongan (Rp)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="Tanpa batas"
                      value={newVoucher.maxDiscountAmount}
                      onChange={(e) => setNewVoucher({ ...newVoucher, maxDiscountAmount: e.target.value })}
                      className="w-full bg-white border border-border rounded-sm px-3 py-2 text-sm outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Minimal Belanja (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={newVoucher.minPurchaseAmount}
                    onChange={(e) => setNewVoucher({ ...newVoucher, minPurchaseAmount: e.target.value })}
                    className="w-full bg-white border border-border rounded-sm px-3 py-2 text-sm outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Mulai Berlaku</label>
                    <input
                      type="date"
                      value={newVoucher.startsAt}
                      onChange={(e) => setNewVoucher({ ...newVoucher, startsAt: e.target.value })}
                      className="w-full bg-white border border-border rounded-sm px-3 py-2 text-sm outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Kedaluwarsa</label>
                    <input
                      type="date"
                      value={newVoucher.expiresAt}
                      onChange={(e) => setNewVoucher({ ...newVoucher, expiresAt: e.target.value })}
                      className="w-full bg-white border border-border rounded-sm px-3 py-2 text-sm outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Kuota Pemakaian</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Tanpa batas"
                    value={newVoucher.maxRedemptions}
                    onChange={(e) => setNewVoucher({ ...newVoucher, maxRedemptions: e.target.value })}
                    className="w-full bg-white border border-border rounded-sm px-3 py-2 text-sm outline-none"
                  />
                </div>
                <div className="flex items-center justify-between p-3 border border-border rounded-sm">
                  <span className="text-xs font-bold text-slate-800">Aktifkan Voucher</span>
                  <input
                    type="checkbox"
                    checked={newVoucher.isActive}
                    onChange={(e) => setNewVoucher({ ...newVoucher, isActive: e.target.checked })}
                    className="w-4 h-4 text-primary border-border rounded-sm focus:ring-0 cursor-pointer accent-primary"
                  />
                </div>
                <button
                  type="submit"
                  disabled={addVoucherMutation.isPending || editVoucherMutation.isPending}
                  className="w-full bg-primary hover:bg-primary-hover text-white py-2 rounded-sm text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
                >
                  {editingVoucherId
                    ? (editVoucherMutation.isPending ? 'Menyimpan...' : 'Simpan Perubahan')
                    : (addVoucherMutation.isPending ? 'Menyimpan...' : 'Simpan Voucher')}
                </button>
                {editingVoucherId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingVoucherId(null);
                      resetVoucherForm();
                    }}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-sm text-xs font-bold uppercase tracking-wider transition-colors mt-2"
                  >
                    Batal Edit
                  </button>
                )}
              </form>
            </div>

            {/* List Voucher */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="font-bold text-base text-slate-800 font-serif">Daftar Voucher</h3>
              <div className="bg-surface border border-border rounded-md shadow-subtle overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-muted border-b border-border font-bold text-secondary text-[10px] uppercase tracking-wider">
                      <th className="p-3 pl-4">Kode</th>
                      <th className="p-3">Diskon</th>
                      <th className="p-3">Min. Beli</th>
                      <th className="p-3">Berlaku</th>
                      <th className="p-3 text-center">Kuota</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-right pr-4">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vouchers?.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-10 text-center text-secondary">
                          Belum ada voucher. Tambahkan voucher baru terlebih dahulu.
                        </td>
                      </tr>
                    ) : (
                      vouchers?.map((v: any) => (
                        <tr key={v.id} className="border-b border-border hover:bg-slate-50/50 transition-colors">
                          <td className="p-3 pl-4 font-bold text-slate-800 font-mono">{v.code}</td>
                          <td className="p-3 text-secondary">
                            {v.discountPercent}%
                            {v.maxDiscountAmount != null && (
                              <span className="block text-[10px]">
                                maks. Rp {Number(v.maxDiscountAmount).toLocaleString('id-ID')}
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-secondary">
                            {v.minPurchaseAmount ? `Rp ${Number(v.minPurchaseAmount).toLocaleString('id-ID')}` : '-'}
                          </td>
                          <td className="p-3 text-secondary text-[10px]">
                            {v.startsAt ? new Date(v.startsAt).toLocaleDateString('id-ID') : 'Kapan saja'}
                            {' – '}
                            {v.expiresAt ? new Date(v.expiresAt).toLocaleDateString('id-ID') : 'Selamanya'}
                          </td>
                          <td className="p-3 text-center text-secondary">
                            {v.usedCount}/{v.maxRedemptions ?? '∞'}
                          </td>
                          <td className="p-3 text-center">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-wide border ${
                                v.isActive
                                  ? 'bg-green-50 text-green-700 border-green-200'
                                  : 'bg-red-50 text-red-600 border-red-200'
                              }`}
                            >
                              {v.isActive ? 'Aktif' : 'Nonaktif'}
                            </span>
                          </td>
                          <td className="p-3 pr-4 text-right">
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setEditingVoucherId(v.id);
                                  setNewVoucher({
                                    code: v.code,
                                    description: v.description || '',
                                    discountPercent: v.discountPercent,
                                    maxDiscountAmount: v.maxDiscountAmount != null ? String(v.maxDiscountAmount) : '',
                                    minPurchaseAmount: v.minPurchaseAmount ? String(v.minPurchaseAmount) : '',
                                    startsAt: v.startsAt ? v.startsAt.slice(0, 10) : '',
                                    expiresAt: v.expiresAt ? v.expiresAt.slice(0, 10) : '',
                                    maxRedemptions: v.maxRedemptions != null ? String(v.maxRedemptions) : '',
                                    isActive: v.isActive,
                                  });
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className="bg-primary hover:bg-primary-hover text-white px-2 py-1 rounded-sm text-[9px] font-bold uppercase tracking-wider shadow-subtle transition-all"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() =>
                                  toggleVoucherActiveMutation.mutate({ voucherId: v.id, isActive: !v.isActive })
                                }
                                className="border border-border bg-surface hover:bg-muted text-slate-700 px-2 py-1 rounded-sm text-[9px] font-bold uppercase tracking-wider shadow-subtle transition-all"
                              >
                                {v.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm('Hapus voucher ini?')) {
                                    deleteVoucherMutation.mutate(v.id);
                                  }
                                }}
                                className="border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 px-2 py-1 rounded-sm text-[9px] font-bold uppercase tracking-wider shadow-subtle transition-all"
                              >
                                Hapus
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content: Settings */}
        {activeSubTab === 'settings' && restaurant && (
          <div className="max-w-xl bg-surface border border-border p-6 rounded-md shadow-subtle space-y-6">
            <div className="border-b border-border pb-6">
              <div>
                <h3 className="font-bold text-base text-slate-800 font-serif mb-1">Profil Restoran</h3>
                <p className="text-xs text-secondary">
                  Ubah identitas restoran yang tampil di halaman pemesanan, dashboard, dan nota.
                </p>
              </div>

              <div className="mt-4 space-y-3">
                <label className="block">
                  <span className="text-[11px] font-bold text-slate-700 mb-1 block">Nama Restoran</span>
                  <input
                    type="text"
                    value={restaurantProfileForm.name}
                    onChange={(e) =>
                      setRestaurantProfileForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                    className="w-full border border-border rounded-sm px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </label>

                <label className="block">
                  <span className="text-[11px] font-bold text-slate-700 mb-1 block">Alamat</span>
                  <input
                    type="text"
                    value={restaurantProfileForm.address}
                    onChange={(e) =>
                      setRestaurantProfileForm((prev) => ({ ...prev, address: e.target.value }))
                    }
                    className="w-full border border-border rounded-sm px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </label>

                <label className="block">
                  <span className="text-[11px] font-bold text-slate-700 mb-1 block">Telepon</span>
                  <input
                    type="tel"
                    value={restaurantProfileForm.phone}
                    onChange={(e) =>
                      setRestaurantProfileForm((prev) => ({ ...prev, phone: e.target.value }))
                    }
                    className="w-full border border-border rounded-sm px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </label>

                <button
                  onClick={() => updateRestaurantProfileMutation.mutate(restaurantProfileForm)}
                  disabled={updateRestaurantProfileMutation.isPending}
                  className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-sm text-xs font-bold uppercase tracking-wider shadow-subtle transition-all disabled:opacity-60"
                >
                  {updateRestaurantProfileMutation.isPending ? 'Menyimpan...' : 'Simpan Profil'}
                </button>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-base text-slate-800 font-serif mb-1">Pengaturan Metode Pembayaran</h3>
              <p className="text-xs text-secondary">
                Aktifkan atau nonaktifkan metode pembayaran yang tersedia bagi pelanggan di halaman pemesanan.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 border border-border rounded-sm hover:bg-muted/50 transition-colors">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Bayar Tunai di Kasir</h4>
                  <p className="text-[10px] text-secondary mt-0.5">Pelanggan memesan dulu dan melunasi langsung di kasir.</p>
                </div>
                <input
                  type="checkbox"
                  checked={restaurant.enableCash}
                  onChange={(e) =>
                    updatePaymentSettingsMutation.mutate({ enableCash: e.target.checked })
                  }
                  disabled={updatePaymentSettingsMutation.isPending}
                  className="w-4 h-4 text-primary border-border rounded-sm focus:ring-0 cursor-pointer accent-primary"
                />
              </div>

              <div className="flex items-center justify-between p-3 border border-border rounded-sm hover:bg-muted/50 transition-colors">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">E-Wallet</h4>
                  <p className="text-[10px] text-secondary mt-0.5">Simulasi pembayaran instan menggunakan OVO, GoPay, DANA.</p>
                </div>
                <input
                  type="checkbox"
                  checked={restaurant.enableEWallet}
                  onChange={(e) =>
                    updatePaymentSettingsMutation.mutate({ enableEWallet: e.target.checked })
                  }
                  disabled={updatePaymentSettingsMutation.isPending}
                  className="w-4 h-4 text-primary border-border rounded-sm focus:ring-0 cursor-pointer accent-primary"
                />
              </div>

              <div className="flex items-center justify-between p-3 border border-border rounded-sm hover:bg-muted/50 transition-colors">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">QRIS Dinamis</h4>
                  <p className="text-[10px] text-secondary mt-0.5">Scan kode QR dinamis dengan notifikasi konfirmasi langsung.</p>
                </div>
                <input
                  type="checkbox"
                  checked={restaurant.enableQris}
                  onChange={(e) =>
                    updatePaymentSettingsMutation.mutate({ enableQris: e.target.checked })
                  }
                  disabled={updatePaymentSettingsMutation.isPending}
                  className="w-4 h-4 text-primary border-border rounded-sm focus:ring-0 cursor-pointer accent-primary"
                />
              </div>

              <div className="flex items-center justify-between p-3 border border-border rounded-sm hover:bg-muted/50 transition-colors">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Transfer Bank (Virtual Account)</h4>
                  <p className="text-[10px] text-secondary mt-0.5">Simulasi transfer melalui VA Mandiri, BCA, atau BNI.</p>
                </div>
                <input
                  type="checkbox"
                  checked={restaurant.enableBankTransfer}
                  onChange={(e) =>
                    updatePaymentSettingsMutation.mutate({ enableBankTransfer: e.target.checked })
                  }
                  disabled={updatePaymentSettingsMutation.isPending}
                  className="w-4 h-4 text-primary border-border rounded-sm focus:ring-0 cursor-pointer accent-primary"
                />
              </div>
            </div>

            {/* Tax Settings */}
            <div className="border-t border-border pt-6">
              <div>
                <h3 className="font-bold text-base text-slate-800 font-serif mb-1">Pengaturan Pajak PPN</h3>
                <p className="text-xs text-secondary">
                  Aktifkan penarikan pajak PPN (1-10%) pada total pesanan pelanggan.
                </p>
              </div>

              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between p-3 border border-border rounded-sm hover:bg-muted/50 transition-colors">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Aktifkan Pajak PPN</h4>
                    <p className="text-[10px] text-secondary mt-0.5">Menarik pajak PPN secara otomatis pada setiap pesanan.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={restaurant.enableTax}
                    onChange={(e) =>
                      updatePaymentSettingsMutation.mutate({ enableTax: e.target.checked })
                    }
                    disabled={updatePaymentSettingsMutation.isPending}
                    className="w-4 h-4 text-primary border-border rounded-sm focus:ring-0 cursor-pointer accent-primary"
                  />
                </div>

                {restaurant.enableTax && (
                  <div className="p-3 border border-border rounded-sm bg-muted/30 flex items-center justify-between gap-4">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">Tarif Pajak (%)</h4>
                      <p className="text-[10px] text-secondary mt-0.5">Nilai persentase pajak PPN (1% hingga 10%).</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={restaurant.taxRate}
                        onChange={(e) => {
                          const val = Math.min(10, Math.max(1, Number(e.target.value)));
                          updatePaymentSettingsMutation.mutate({ taxRate: val });
                        }}
                        disabled={updatePaymentSettingsMutation.isPending}
                        className="w-16 bg-white border border-border rounded-sm px-2 py-1 text-xs font-bold text-center outline-none"
                      />
                      <span className="text-xs font-bold text-slate-600">%</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
