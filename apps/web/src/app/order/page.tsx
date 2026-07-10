'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAppStore } from '../../lib/store';
import { OrderStatus, PaymentMethod } from '@repo/types';

function OrderContent() {
  const searchParams = useSearchParams();
  const tableId = searchParams.get('tableId');
  const router = useRouter();
  const queryClient = useQueryClient();

  const { cart, addToCart, updateCartQuantity, clearCart } = useAppStore();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.E_WALLET);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [voucherInput, setVoucherInput] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState<{ code: string; discountAmount: number } | null>(null);
  const [voucherError, setVoucherError] = useState('');

  // Fetch Table details
  const { data: table, isLoading: isTableLoading, error: tableError } = useQuery({
    queryKey: ['table', tableId],
    queryFn: () => api.getTable(tableId!),
    enabled: !!tableId,
  });

  // Set default payment method based on enabled payment options
  useEffect(() => {
    const rest = table?.restaurant;
    if (rest) {
      if (rest.enableEWallet) setPaymentMethod(PaymentMethod.E_WALLET);
      else if (rest.enableCash) setPaymentMethod(PaymentMethod.CASH);
      else if (rest.enableQris) setPaymentMethod(PaymentMethod.QRIS);
      else if (rest.enableBankTransfer) setPaymentMethod(PaymentMethod.BANK_TRANSFER);
    }
  }, [table]);

  const restaurantId = table?.restaurantId;

  // Fetch Categories
  const { data: categories, isLoading: isCategoriesLoading } = useQuery({
    queryKey: ['categories', restaurantId],
    queryFn: () => api.getCategories(restaurantId!),
    enabled: !!restaurantId,
  });

  // Fetch Menus
  const { data: menus, isLoading: isMenusLoading } = useQuery({
    queryKey: ['menus', restaurantId],
    queryFn: () => api.getMenus(restaurantId!),
    enabled: !!restaurantId,
  });

  // Create Order Mutation
  const createOrderMutation = useMutation({
    mutationFn: (orderData: any) => api.createOrder(restaurantId!, orderData),
    onSuccess: (data) => {
      clearCart();
      setIsCheckoutOpen(false);
      setAppliedVoucher(null);
      setVoucherInput('');
      setVoucherError('');
      router.push(`/order/status?orderId=${data.id}&restaurantId=${restaurantId}`);
    },
    onError: (err: any) => {
      alert(err.message || 'Gagal membuat pesanan');
    },
  });

  // Validate Voucher Mutation
  const validateVoucherMutation = useMutation({
    mutationFn: () => {
      const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
      return api.validateVoucher(restaurantId!, voucherInput.trim(), subtotal);
    },
    onSuccess: (res) => {
      setAppliedVoucher({ code: res.voucher.code, discountAmount: res.discountAmount });
      setVoucherError('');
    },
    onError: (err: any) => {
      setAppliedVoucher(null);
      setVoucherError(err.message || 'Voucher tidak valid');
    },
  });

  const handleCheckout = () => {
    if (cart.length === 0) return;
    queryClient.invalidateQueries({ queryKey: ['table', tableId] });
    setIsCheckoutOpen(true);
  };

  const submitOrder = () => {
    if (!tableId || cart.length === 0) return;

    const orderData = {
      tableId,
      paymentMethod,
      items: cart.map((item) => ({
        menuId: item.id,
        quantity: item.quantity,
        notes: item.notes || '',
      })),
      ...(appliedVoucher ? { voucherCode: appliedVoucher.code } : {}),
    };

    createOrderMutation.mutate(orderData);
  };

  if (!tableId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background text-center">
        <div className="p-8 bg-surface rounded-lg shadow-medium max-w-md w-full border border-border">
          <h1 className="text-2xl font-bold font-serif text-primary mb-4">Scan QR Code Meja</h1>
          <p className="text-secondary text-sm">
            Silakan memindai QR Code di meja Anda untuk mulai melakukan pemesanan makanan.
          </p>
        </div>
      </div>
    );
  }

  if (isTableLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
        <p className="text-secondary text-sm mt-4">Memuat data meja...</p>
      </div>
    );
  }

  if (tableError || !table) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background text-center">
        <div className="p-8 bg-surface rounded-lg shadow-medium max-w-md w-full border border-border">
          <h1 className="text-xl font-bold font-serif text-error mb-2">Error Meja Tidak Valid</h1>
          <p className="text-secondary text-sm mb-4">
            Meja tidak terdaftar di sistem. Pastikan QR Code yang Anda scan sudah benar.
          </p>
        </div>
      </div>
    );
  }

  const restaurant = table.restaurant;
  const filteredMenus = selectedCategory
    ? menus?.filter((m: any) => m.categoryId === selectedCategory)
    : menus;

  const totalCartItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalCartPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground pb-24">
      {/* Header Restoran */}
      <header className="sticky top-0 bg-primary text-white p-4 shadow-medium z-10">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold font-serif">{restaurant.name}</h1>
            <p className="text-xs text-slate-300">{restaurant.address || 'Selamat Datang'}</p>
          </div>
          <div className="bg-white/10 px-3 py-1.5 rounded-md text-sm font-semibold tracking-wide border border-white/20">
            Meja {table.number}
          </div>
        </div>
      </header>

      {/* Konten Menu */}
      <main className="max-w-2xl w-full mx-auto p-4 flex-1">
        {/* Kategori Bar */}
        <div className="mb-6 overflow-x-auto whitespace-nowrap py-2 scrollbar-none flex gap-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-sm text-xs font-semibold uppercase tracking-wider border transition-colors ${
              selectedCategory === null
                ? 'bg-primary text-white border-primary'
                : 'bg-surface text-secondary border-border hover:bg-muted'
            }`}
          >
            Semua Menu
          </button>
          {categories?.map((cat: any) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-sm text-xs font-semibold uppercase tracking-wider border transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-primary text-white border-primary'
                  : 'bg-surface text-secondary border-border hover:bg-muted'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* View mode toggle & List title */}
        <div className="flex justify-between items-center mb-4">
          <span className="text-xs font-bold uppercase tracking-wider text-secondary">
            {filteredMenus?.length || 0} Hidangan ditemukan
          </span>
          <div className="flex border border-border rounded-sm overflow-hidden bg-surface">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1 ${
                viewMode === 'list'
                  ? 'bg-primary text-white border-r border-border'
                  : 'text-secondary hover:bg-muted bg-surface border-r border-border'
              }`}
            >
              ☰ List
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1 ${
                viewMode === 'grid'
                  ? 'bg-primary text-white'
                  : 'text-secondary hover:bg-muted bg-surface'
              }`}
            >
              ⊞ Grid
            </button>
          </div>
        </div>

        {/* Daftar Menu */}
        {isMenusLoading ? (
          <div className="text-center py-10 text-secondary">Memuat daftar menu...</div>
        ) : filteredMenus?.length === 0 ? (
          <div className="text-center py-10 text-secondary border border-dashed border-border rounded p-4 bg-surface">
            Tidak ada menu tersedia saat ini.
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 gap-4">
            {filteredMenus?.map((menu: any) => {
              const cartItem = cart.find((i) => i.id === menu.id);
              return (
                <div
                  key={menu.id}
                  className="bg-surface border border-border rounded-md shadow-subtle flex flex-col overflow-hidden"
                >
                  {/* Thumbnail Gambar Menu */}
                  <div className="relative w-full h-32 bg-slate-100 border-b border-border flex items-center justify-center shrink-0">
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
                      <div className="text-slate-400">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                    )}
                  </div>

                  <div className="p-3 flex-1 flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] text-secondary font-bold tracking-wide uppercase">
                        {menu.category?.name}
                      </span>
                      <h3 className="font-bold text-sm text-slate-800 mt-0.5 line-clamp-1">{menu.name}</h3>
                      {menu.description && (
                        <p className="text-[10px] text-secondary mt-1 line-clamp-2 leading-relaxed">
                          {menu.description}
                        </p>
                      )}
                    </div>
                    <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100">
                      <span className="text-xs font-extrabold text-primary shrink-0">
                        Rp {Number(menu.price).toLocaleString('id-ID')}
                      </span>
                      
                      {/* Tombol Add / Quantity */}
                      <div className="flex items-center">
                        {!cartItem ? (
                          <button
                            type="button"
                            onClick={() =>
                              addToCart({
                                id: menu.id,
                                name: menu.name,
                                price: Number(menu.price),
                              })
                            }
                            className="bg-primary text-white hover:bg-primary-hover px-2.5 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wider transition-colors w-full text-center"
                          >
                            + Tambah
                          </button>
                        ) : (
                          <div className="flex items-center border border-border rounded-sm bg-muted overflow-hidden w-full justify-between">
                            <button
                              type="button"
                              onClick={() => updateCartQuantity(menu.id, cartItem.quantity - 1)}
                              className="px-2 py-0.5 hover:bg-slate-200 text-xs font-bold text-slate-700"
                            >
                              -
                            </button>
                            <span className="px-1.5 text-xs font-bold text-slate-800 min-w-[16px] text-center">
                              {cartItem.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateCartQuantity(menu.id, cartItem.quantity + 1)}
                              className="px-2 py-0.5 hover:bg-slate-200 text-xs font-bold text-slate-700"
                            >
                              +
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredMenus?.map((menu: any) => {
              const cartItem = cart.find((i) => i.id === menu.id);
              return (
                <div
                  key={menu.id}
                  className="bg-surface border border-border p-4 rounded-md shadow-subtle flex gap-4 items-center justify-between"
                >
                  <div className="flex gap-4 items-center flex-1">
                    {/* Thumbnail Gambar Menu */}
                    <div className="w-20 h-20 rounded-md overflow-hidden bg-slate-100 border border-border flex items-center justify-center shrink-0">
                      {menu.imageUrl ? (
                        <img
                          src={menu.imageUrl}
                          alt={menu.name}
                          className="object-cover w-full h-full"
                          onError={(e) => {
                            // fallback if image link fails
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100&auto=format&fit=crop&q=60';
                          }}
                        />
                      ) : (
                        <div className="text-slate-400">
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                        </div>
                      )}
                    </div>

                    <div className="flex-1">
                      <span className="text-xs text-secondary font-medium tracking-wide uppercase">
                        {menu.category?.name}
                      </span>
                      <h3 className="font-bold text-base text-slate-800 mt-0.5">{menu.name}</h3>
                      {menu.description && (
                        <p className="text-xs text-secondary mt-1 line-clamp-2 leading-relaxed">
                          {menu.description}
                        </p>
                      )}
                      <div className="text-sm font-bold text-primary mt-2">
                        Rp {Number(menu.price).toLocaleString('id-ID')}
                      </div>
                    </div>
                  </div>

                  {/* Tombol Add / Quantity */}
                  <div className="flex items-center">
                    {!cartItem ? (
                      <button
                        onClick={() =>
                          addToCart({
                            id: menu.id,
                            name: menu.name,
                            price: Number(menu.price),
                          })
                        }
                        className="bg-primary text-white hover:bg-primary-hover px-4 py-2 rounded-sm text-xs font-semibold transition-colors uppercase tracking-wider"
                      >
                        + Tambah
                      </button>
                    ) : (
                      <div className="flex items-center gap-3 bg-muted border border-border rounded-sm p-1">
                        <button
                          onClick={() => updateCartQuantity(menu.id, cartItem.quantity - 1)}
                          className="w-7 h-7 flex items-center justify-center text-primary font-bold hover:bg-slate-200 rounded transition-colors"
                        >
                          -
                        </button>
                        <span className="w-5 text-center font-bold text-sm">{cartItem.quantity}</span>
                        <button
                          onClick={() => updateCartQuantity(menu.id, cartItem.quantity + 1)}
                          className="w-7 h-7 flex items-center justify-center text-primary font-bold hover:bg-slate-200 rounded transition-colors"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Floating Cart bar di bawah */}
      {cart.length > 0 && !isCheckoutOpen && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-surface border-t border-border shadow-large z-20">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <div>
              <div className="text-xs text-secondary">{totalCartItems} Item Terpilih</div>
              <div className="text-base font-bold text-primary">
                Rp {restaurant?.enableTax
                  ? Math.round(totalCartPrice + (totalCartPrice * restaurant.taxRate) / 100).toLocaleString('id-ID')
                  : totalCartPrice.toLocaleString('id-ID')
                }
              </div>
            </div>
            <button
              onClick={handleCheckout}
              className="bg-primary text-white hover:bg-primary-hover px-6 py-3 rounded-sm text-sm font-bold tracking-wider uppercase shadow-subtle transition-colors"
            >
              Lanjutkan Pesanan
            </button>
          </div>
        </div>
      )}

      {/* Checkout Modal / Panel */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 p-0 sm:p-4">
          <div className="bg-surface max-w-md w-full rounded-t-lg sm:rounded-lg shadow-overlay border border-border flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-border flex justify-between items-center">
              <h2 className="text-lg font-bold font-serif text-primary">Konfirmasi Pesanan</h2>
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="text-secondary hover:text-foreground font-semibold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-4">
              {/* Item List */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-secondary uppercase tracking-wider">Item Pesanan</h4>
                {cart.map((item) => (
                  <div key={item.id} className="flex justify-between items-start py-1 text-sm">
                    <div className="flex-1 pr-4">
                      <div className="font-semibold text-slate-800">
                        {item.name} <span className="text-secondary font-normal">x{item.quantity}</span>
                      </div>
                      <input
                        type="text"
                        placeholder="Catatan (misal: pedas, es sedikit)"
                        defaultValue={item.notes || ''}
                        onBlur={(e) => useAppStore.getState().updateCartNotes(item.id, e.target.value)}
                        className="text-xs text-secondary bg-transparent border-b border-border focus:border-primary w-full py-1 mt-1 outline-none"
                      />
                    </div>
                    <div className="font-bold text-slate-800">
                      Rp {(item.price * item.quantity).toLocaleString('id-ID')}
                    </div>
                  </div>
                ))}
              </div>

              <hr className="border-border" />

              {/* Payment Method */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-secondary uppercase tracking-wider">Metode Pembayaran</h4>
                <div className="grid grid-cols-2 gap-2">
                  {restaurant?.enableCash && (
                    <button
                      onClick={() => setPaymentMethod(PaymentMethod.CASH)}
                      className={`p-3 rounded-sm border text-left text-xs font-bold transition-all ${
                        paymentMethod === PaymentMethod.CASH
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-border bg-surface text-secondary hover:bg-muted'
                      }`}
                    >
                      <div>Bayar Tunai</div>
                      <div className="text-[10px] font-normal text-secondary mt-1">Bayar langsung di kasir</div>
                    </button>
                  )}
                  {restaurant?.enableEWallet && (
                    <button
                      onClick={() => setPaymentMethod(PaymentMethod.E_WALLET)}
                      className={`p-3 rounded-sm border text-left text-xs font-bold transition-all ${
                        paymentMethod === PaymentMethod.E_WALLET
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-border bg-surface text-secondary hover:bg-muted'
                      }`}
                    >
                      <div>E-Wallet</div>
                      <div className="text-[10px] font-normal text-secondary mt-1">OVO, GoPay, DANA</div>
                    </button>
                  )}
                  {restaurant?.enableQris && (
                    <button
                      onClick={() => setPaymentMethod(PaymentMethod.QRIS)}
                      className={`p-3 rounded-sm border text-left text-xs font-bold transition-all ${
                        paymentMethod === PaymentMethod.QRIS
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-border bg-surface text-secondary hover:bg-muted'
                      }`}
                    >
                      <div>QRIS</div>
                      <div className="text-[10px] font-normal text-secondary mt-1">Scan QR Code Dinamis</div>
                    </button>
                  )}
                  {restaurant?.enableBankTransfer && (
                    <button
                      onClick={() => setPaymentMethod(PaymentMethod.BANK_TRANSFER)}
                      className={`p-3 rounded-sm border text-left text-xs font-bold transition-all ${
                        paymentMethod === PaymentMethod.BANK_TRANSFER
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-border bg-surface text-secondary hover:bg-muted'
                      }`}
                    >
                      <div>Transfer Bank (VA)</div>
                      <div className="text-[10px] font-normal text-secondary mt-1">Simulasi Bank VA</div>
                    </button>
                  )}
                </div>
              </div>

              {/* Kode Voucher */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-secondary uppercase tracking-wider">Kode Voucher</h4>
                {!appliedVoucher ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Masukkan kode voucher"
                      value={voucherInput}
                      onChange={(e) => setVoucherInput(e.target.value.toUpperCase())}
                      className="flex-1 bg-white border border-border rounded-sm px-3 py-2 text-sm outline-none uppercase"
                    />
                    <button
                      type="button"
                      disabled={!voucherInput.trim() || validateVoucherMutation.isPending}
                      onClick={() => validateVoucherMutation.mutate()}
                      className="bg-primary hover:bg-primary-hover text-white px-4 rounded-sm text-xs font-bold uppercase tracking-wider disabled:opacity-50"
                    >
                      {validateVoucherMutation.isPending ? '...' : 'Terapkan'}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-sm px-3 py-2">
                    <span className="text-xs font-bold text-green-700">
                      Voucher {appliedVoucher.code} diterapkan (-Rp {appliedVoucher.discountAmount.toLocaleString('id-ID')})
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setAppliedVoucher(null);
                        setVoucherInput('');
                        setVoucherError('');
                      }}
                      className="text-[10px] font-bold text-red-600 hover:underline"
                    >
                      Hapus
                    </button>
                  </div>
                )}
                {voucherError && <p className="text-[10px] text-error">{voucherError}</p>}
              </div>
            </div>

            {/* Submit Bar */}
            <div className="p-4 bg-muted border-t border-border space-y-3">
              {(() => {
                const discountAmount = appliedVoucher?.discountAmount ?? 0;
                const discountedSubtotal = Math.max(0, totalCartPrice - discountAmount);
                const taxAmount = restaurant?.enableTax
                  ? Math.round((discountedSubtotal * restaurant.taxRate) / 100)
                  : 0;
                const grandTotal = discountedSubtotal + taxAmount;

                return (
                  <>
                    {(discountAmount > 0 || restaurant?.enableTax) && (
                      <div className="flex justify-between items-center text-xs text-secondary">
                        <span>Subtotal</span>
                        <span>Rp {totalCartPrice.toLocaleString('id-ID')}</span>
                      </div>
                    )}
                    {discountAmount > 0 && (
                      <div className="flex justify-between items-center text-xs text-tertiary font-semibold">
                        <span>Diskon Voucher ({appliedVoucher?.code})</span>
                        <span>-Rp {discountAmount.toLocaleString('id-ID')}</span>
                      </div>
                    )}
                    {restaurant?.enableTax && (
                      <div className="flex justify-between items-center text-xs text-secondary">
                        <span>Pajak PPN ({restaurant.taxRate}%)</span>
                        <span>Rp {taxAmount.toLocaleString('id-ID')}</span>
                      </div>
                    )}
                    <hr className="border-border border-dashed" />
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-bold text-slate-800">Total Pembayaran</span>
                      <span className="text-lg font-bold text-primary">
                        Rp {grandTotal.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </>
                );
              })()}
              <button
                onClick={submitOrder}
                disabled={createOrderMutation.isPending}
                className="w-full bg-primary hover:bg-primary-hover text-white py-3 rounded-sm text-sm font-bold tracking-wider uppercase shadow-subtle transition-colors disabled:opacity-50"
              >
                {createOrderMutation.isPending ? 'Mengirim Pesanan...' : 'Buat Pesanan & Bayar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrderPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
        <p className="text-secondary text-sm mt-4">Memuat...</p>
      </div>
    }>
      <OrderContent />
    </Suspense>
  );
}
