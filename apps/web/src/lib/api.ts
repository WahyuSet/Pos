const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function fetchApi(path: string, options: RequestInit = {}) {
  let token = '';
  if (typeof window !== 'undefined') {
    token = localStorage.getItem('token') || '';
  }

  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Terjadi kesalahan pada server');
  }

  return response.json();
}

export const api = {
  // Auth
  login: (credentials: any) =>
    fetchApi('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),
  
  // Restaurant
  getRestaurant: (id: string) => fetchApi(`/restaurants/${id}`),
  updateRestaurant: (restaurantId: string, data: any) =>
    fetchApi(`/restaurants/${restaurantId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  getTables: (restaurantId: string) => fetchApi(`/restaurants/${restaurantId}/tables`),
  getTable: (tableId: string) => fetchApi(`/restaurants/tables/${tableId}`),
  createTable: (restaurantId: string, tableNumber: string) =>
    fetchApi(`/restaurants/${restaurantId}/tables`, {
      method: 'POST',
      body: JSON.stringify({ number: tableNumber }),
    }),
  updateTable: (restaurantId: string, tableId: string, tableNumber: string) =>
    fetchApi(`/restaurants/${restaurantId}/tables/${tableId}`, {
      method: 'PATCH',
      body: JSON.stringify({ number: tableNumber }),
    }),
  deleteTable: (restaurantId: string, tableId: string) =>
    fetchApi(`/restaurants/${restaurantId}/tables/${tableId}`, {
      method: 'DELETE',
    }),

  // Menu / Categories
  getCategories: (restaurantId: string) =>
    fetchApi(`/restaurants/${restaurantId}/categories`),
  createCategory: (restaurantId: string, name: string) =>
    fetchApi(`/restaurants/${restaurantId}/categories`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
  updateCategory: (restaurantId: string, categoryId: string, name: string) =>
    fetchApi(`/restaurants/${restaurantId}/categories/${categoryId}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    }),
  deleteCategory: (restaurantId: string, categoryId: string) =>
    fetchApi(`/restaurants/${restaurantId}/categories/${categoryId}`, {
      method: 'DELETE',
    }),
  getMenus: (restaurantId: string, categoryId?: string) => {
    const query = categoryId ? `?categoryId=${categoryId}` : '';
    return fetchApi(`/restaurants/${restaurantId}/menus${query}`);
  },
  createMenu: (restaurantId: string, data: any) =>
    fetchApi(`/restaurants/${restaurantId}/menus`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateMenu: (restaurantId: string, menuId: string, data: any) =>
    fetchApi(`/restaurants/${restaurantId}/menus/${menuId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteMenu: (restaurantId: string, menuId: string) =>
    fetchApi(`/restaurants/${restaurantId}/menus/${menuId}`, {
      method: 'DELETE',
    }),

  // Orders
  createOrder: (restaurantId: string, orderData: any) =>
    fetchApi(`/restaurants/${restaurantId}/orders`, {
      method: 'POST',
      body: JSON.stringify(orderData),
    }),
  getOrders: (restaurantId: string, status?: string) => {
    const query = status ? `?status=${status}` : '';
    return fetchApi(`/restaurants/${restaurantId}/orders${query}`);
  },
  getOrder: (restaurantId: string, orderId: string) =>
    fetchApi(`/restaurants/${restaurantId}/orders/${orderId}`),
  updateOrderStatus: (restaurantId: string, orderId: string, status: string) =>
    fetchApi(`/restaurants/${restaurantId}/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  // Payments (Simulated)
  simulatePayment: (restaurantId: string, orderId: string) =>
    fetchApi(`/restaurants/${restaurantId}/orders/${orderId}/simulate-payment`, {
      method: 'POST',
    }),

  cancelOrder: (restaurantId: string, orderId: string) =>
    fetchApi(`/restaurants/${restaurantId}/orders/${orderId}/cancel`, {
      method: 'POST',
    }),

  updatePaymentSettings: (restaurantId: string, settings: any) =>
    fetchApi(`/restaurants/${restaurantId}/payment-settings`, {
      method: 'PATCH',
      body: JSON.stringify(settings),
    }),

  uploadMenuImage: (restaurantId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return fetchApi(`/restaurants/${restaurantId}/menus/upload`, {
      method: 'POST',
      body: formData,
    });
  },

  // Vouchers
  getVouchers: (restaurantId: string) => fetchApi(`/restaurants/${restaurantId}/vouchers`),
  createVoucher: (restaurantId: string, data: any) =>
    fetchApi(`/restaurants/${restaurantId}/vouchers`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateVoucher: (restaurantId: string, voucherId: string, data: any) =>
    fetchApi(`/restaurants/${restaurantId}/vouchers/${voucherId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteVoucher: (restaurantId: string, voucherId: string) =>
    fetchApi(`/restaurants/${restaurantId}/vouchers/${voucherId}`, {
      method: 'DELETE',
    }),
  validateVoucher: (restaurantId: string, code: string, subtotal: number) =>
    fetchApi(`/restaurants/${restaurantId}/vouchers/validate`, {
      method: 'POST',
      body: JSON.stringify({ code, subtotal }),
    }),

  // Users / Staff
  getUsers: (restaurantId: string) => fetchApi(`/restaurants/${restaurantId}/users`),
  createUser: (restaurantId: string, data: any) =>
    fetchApi(`/restaurants/${restaurantId}/users`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateUser: (restaurantId: string, userId: string, data: any) =>
    fetchApi(`/restaurants/${restaurantId}/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // Reports
  getSalesSummary: (restaurantId: string, from?: string, to?: string) => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchApi(`/restaurants/${restaurantId}/reports/summary${query}`);
  },
};
