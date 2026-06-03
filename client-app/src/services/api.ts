let rawBaseUrl = import.meta.env.VITE_API_URL || '/api';
if (rawBaseUrl.startsWith('http')) {
  rawBaseUrl = rawBaseUrl.replace(/\/$/, ''); // Remove trailing slash
  if (!rawBaseUrl.endsWith('/api')) {
    rawBaseUrl += '/api';
  }
}
const BASE_URL = rawBaseUrl;

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
    localStorage.removeItem('userId');
    window.dispatchEvent(new Event('auth-unauthorized'));
    throw new Error('Oturumunuz sonlandırıldı. Lütfen tekrar giriş yapın.');
  }

  return response;
}

async function apiCall<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await apiFetch(endpoint, options);
  
  if (!res.ok) {
    let errorMessage = `İstek başarısız oldu (Hata Kodu: ${res.status})`;
    try {
      const errData = await res.json();
      if (errData && errData.message) {
        errorMessage = errData.message;
      }
    } catch {
      // Body is not JSON (e.g. 502 Bad Gateway HTML, 404, etc.)
      if (res.status === 502) {
        errorMessage = 'Sunucu şu anda başlatılıyor olabilir (Render ücretsiz sunucuları kullanılmadığında uyku moduna geçer). Lütfen 30 saniye sonra tekrar deneyin.';
      } else if (res.status === 404) {
        errorMessage = `API adresi bulunamadı (404). Lütfen VITE_API_URL adresini doğru girdiğinizden emin olun. (Giden İstek: ${res.url})`;
      } else if (res.status === 500) {
        errorMessage = 'Sunucu tarafında dahili bir hata oluştu (500). Lütfen sunucu loglarını kontrol edin.';
      }
    }
    throw new Error(errorMessage);
  }
  
  try {
    return await res.json() as T;
  } catch {
    throw new Error('Sunucudan geçersiz veri biçimi alındı (JSON bekleniyordu).');
  }
}

export const api = {
  // Auth
  login(username: string, password: string): Promise<User> {
    return apiCall<User>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },

  register(registrationData: any): Promise<{ message: string }> {
    return apiCall<{ message: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(registrationData),
    });
  },

  // Connections
  getConnections(): Promise<ConnectionUser[]> {
    return apiCall<ConnectionUser[]>('/auth/connections');
  },

  sendConnectionRequest(username: string): Promise<{ message: string }> {
    return apiCall<{ message: string }>(`/auth/connections/send-request?username=${encodeURIComponent(username)}`, {
      method: 'POST',
    });
  },

  getIncomingRequests(): Promise<ConnectionRequest[]> {
    return apiCall<ConnectionRequest[]>('/auth/connections/requests/incoming');
  },

  getSentRequests(): Promise<ConnectionRequest[]> {
    return apiCall<ConnectionRequest[]>('/auth/connections/requests/sent');
  },

  acceptRequest(requestId: string): Promise<{ message: string }> {
    return apiCall<{ message: string }>(`/auth/connections/requests/${requestId}/accept`, {
      method: 'POST',
    });
  },

  rejectRequest(requestId: string): Promise<{ message: string }> {
    return apiCall<{ message: string }>(`/auth/connections/requests/${requestId}/reject`, {
      method: 'POST',
    });
  },

  deleteSentRequest(requestId: string): Promise<{ message: string }> {
    return apiCall<{ message: string }>(`/auth/connections/requests/${requestId}`, {
      method: 'DELETE',
    });
  },

  removeConnection(targetId: string): Promise<{ message: string }> {
    return apiCall<{ message: string }>(`/auth/connections/${targetId}`, {
      method: 'DELETE',
    });
  },

  // Products
  getProducts(): Promise<Product[]> {
    return apiCall<Product[]>('/products');
  },

  createProduct(productData: any): Promise<{ product: Product; message: string }> {
    return apiCall<{ product: Product; message: string }>('/products', {
      method: 'POST',
      body: JSON.stringify(productData),
    });
  },

  toggleProductComplete(productId: string, completed: boolean): Promise<{ message: string }> {
    return apiCall<{ message: string }>(`/products/${productId}/complete`, {
      method: 'PUT',
      body: JSON.stringify({ completed }),
    });
  },

  updateProduct(productId: string, productData: any): Promise<{ product: Product; message: string }> {
    return apiCall<{ product: Product; message: string }>(`/products/${productId}`, {
      method: 'PUT',
      body: JSON.stringify(productData),
    });
  },

  deleteProduct(productId: string): Promise<{ message: string }> {
    return apiCall<{ message: string }>(`/products/${productId}`, {
      method: 'DELETE',
    });
  },

  // Catalog
  getCatalog(): Promise<CatalogProduct[]> {
    return apiCall<CatalogProduct[]>('/catalog');
  },

  addCatalogProduct(catalogData: any): Promise<{ product: CatalogProduct; message: string }> {
    return apiCall<{ product: CatalogProduct; message: string }>('/catalog', {
      method: 'POST',
      body: JSON.stringify(catalogData),
    });
  },

  updateCatalogProduct(id: string, catalogData: any): Promise<{ product: CatalogProduct; message: string }> {
    return apiCall<{ product: CatalogProduct; message: string }>(`/catalog/${id}`, {
      method: 'PUT',
      body: JSON.stringify(catalogData),
    });
  },

  deleteCatalogProduct(id: string): Promise<{ message: string }> {
    return apiCall<{ message: string }>(`/catalog/${id}`, {
      method: 'DELETE',
    });
  },

  // Fields
  getFields(): Promise<ExtraFieldDef[]> {
    return apiCall<ExtraFieldDef[]>('/fields');
  },

  createField(fieldData: any): Promise<{ field: ExtraFieldDef; message: string }> {
    return apiCall<{ field: ExtraFieldDef; message: string }>('/fields', {
      method: 'POST',
      body: JSON.stringify(fieldData),
    });
  },

  deleteField(id: string): Promise<{ message: string }> {
    return apiCall<{ message: string }>(`/fields/${id}`, {
      method: 'DELETE',
    });
  }
};
