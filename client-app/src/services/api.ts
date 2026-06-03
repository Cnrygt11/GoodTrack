const BASE_URL = '/api';

export interface User {
  token: string;
  username: string;
  role: 'seller' | 'mfr';
  userId: string;
}

export interface ConnectionUser {
  id: string;
  username: string;
  role: string;
}

export interface ConnectionRequest {
  id: string;
  senderId: string;
  senderUsername: string;
  receiverId: string;
  receiverUsername: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

export interface CatalogProduct {
  id: string;
  productCode: string;
  image: string;
  mfrId: string;
  mfrName: string;
}

export interface ExtraFieldDef {
  id: string;
  name: string;
  type: 'text' | 'select';
  options: string[];
}

export interface ExtraFieldValue {
  name: string;
  type: 'text' | 'select';
  value: string;
}

export interface Product {
  id: string;
  code: string;
  image: string | null;
  text: string;
  length: string;
  extras: { [fieldId: string]: ExtraFieldValue };
  completed: boolean;
  mfrId: string;
  mfrName: string;
  sellerId?: string;
  sellerName?: string;
  createdAt?: string;
}

async function apiFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem('token');
  
  if (!options.headers) {
    options.headers = {};
  }
  
  const headers = options.headers as Record<string, string>;
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, options);

  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    window.dispatchEvent(new Event('auth-unauthorized'));
    throw new Error('Oturumunuz sonlandırıldı. Lütfen tekrar giriş yapın.');
  }

  return response;
}

export const api = {
  // Auth
  async login(username: string, password: string): Promise<User> {
    const res = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Giriş başarısız.');
    return data;
  },

  async register(registrationData: any): Promise<{ message: string }> {
    const res = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify(registrationData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Kayıt başarısız.');
    return data;
  },

  // Connections
  async getConnections(): Promise<ConnectionUser[]> {
    const res = await apiFetch('/auth/connections');
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Bağlantılar listelenemedi.');
    return data;
  },

  async sendConnectionRequest(username: string): Promise<{ message: string }> {
    const res = await apiFetch(`/auth/connections/send-request?username=${encodeURIComponent(username)}`, {
      method: 'POST',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Bağlantı isteği gönderilemedi.');
    return data;
  },

  async getIncomingRequests(): Promise<ConnectionRequest[]> {
    const res = await apiFetch('/auth/connections/requests/incoming');
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gelen istekler listelenemedi.');
    return data;
  },

  async getSentRequests(): Promise<ConnectionRequest[]> {
    const res = await apiFetch('/auth/connections/requests/sent');
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gönderilen istekler listelenemedi.');
    return data;
  },

  async acceptRequest(requestId: string): Promise<{ message: string }> {
    const res = await apiFetch(`/auth/connections/requests/${requestId}/accept`, {
      method: 'POST',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'İstek kabul edilemedi.');
    return data;
  },

  async rejectRequest(requestId: string): Promise<{ message: string }> {
    const res = await apiFetch(`/auth/connections/requests/${requestId}/reject`, {
      method: 'POST',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'İstek reddedilemedi.');
    return data;
  },

  async deleteSentRequest(requestId: string): Promise<{ message: string }> {
    const res = await apiFetch(`/auth/connections/requests/${requestId}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'İstek silinemedi.');
    return data;
  },

  async removeConnection(targetId: string): Promise<{ message: string }> {
    const res = await apiFetch(`/auth/connections/${targetId}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Bağlantı kaldırılamadı.');
    return data;
  },

  // Products
  async getProducts(): Promise<Product[]> {
    const res = await apiFetch('/products');
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Siparişler listelenemedi.');
    return data;
  },

  async createProduct(productData: any): Promise<{ product: Product; message: string }> {
    const res = await apiFetch('/products', {
      method: 'POST',
      body: JSON.stringify(productData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Sipariş oluşturulamadı.');
    return data;
  },

  async toggleProductComplete(productId: string, completed: boolean): Promise<{ message: string }> {
    const res = await apiFetch(`/products/${productId}/complete`, {
      method: 'PUT',
      body: JSON.stringify({ completed }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Sipariş durumu güncellenemedi.');
    return data;
  },

  async updateProduct(productId: string, productData: any): Promise<{ product: Product; message: string }> {
    const res = await apiFetch(`/products/${productId}`, {
      method: 'PUT',
      body: JSON.stringify(productData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Sipariş güncellenemedi.');
    return data;
  },

  async deleteProduct(productId: string): Promise<{ message: string }> {
    const res = await apiFetch(`/products/${productId}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Sipariş silinemedi.');
    return data;
  },

  // Catalog
  async getCatalog(): Promise<CatalogProduct[]> {
    const res = await apiFetch('/catalog');
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Katalog listelenemedi.');
    return data;
  },

  async addCatalogProduct(catalogData: any): Promise<{ product: CatalogProduct; message: string }> {
    const res = await apiFetch('/catalog', {
      method: 'POST',
      body: JSON.stringify(catalogData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Kataloğa eklenemedi.');
    return data;
  },

  async updateCatalogProduct(id: string, catalogData: any): Promise<{ product: CatalogProduct; message: string }> {
    const res = await apiFetch(`/catalog/${id}`, {
      method: 'PUT',
      body: JSON.stringify(catalogData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Katalog ürünü güncellenemedi.');
    return data;
  },

  async deleteCatalogProduct(id: string): Promise<{ message: string }> {

    const res = await apiFetch(`/catalog/${id}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Katalog ürünü silinemedi.');
    return data;
  },

  // Fields
  async getFields(): Promise<ExtraFieldDef[]> {
    const res = await apiFetch('/fields');
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Özellikler listelenemedi.');
    return data;
  },

  async createField(fieldData: any): Promise<{ field: ExtraFieldDef; message: string }> {
    const res = await apiFetch('/fields', {
      method: 'POST',
      body: JSON.stringify(fieldData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Özellik oluşturulamadı.');
    return data;
  },

  async deleteField(id: string): Promise<{ message: string }> {
    const res = await apiFetch(`/fields/${id}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Özellik silinemedi.');
    return data;
  }
};
