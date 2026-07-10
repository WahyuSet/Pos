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
  
  register: (data: any) =>
    fetchApi('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Restaurant
  getRestaurant: (id: string) => fetchApi(`/restaurants/${id}`),
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
};
