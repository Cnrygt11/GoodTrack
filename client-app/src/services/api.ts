import { AUTH_STORAGE_KEYS, AUTH_EVENTS } from '../constants/authKeys';

let rawBaseUrl = '/api';

if (typeof window !== 'undefined') {
  const hostname = window.location.hostname;
  if (hostname === 'goodtrack-client.onrender.com') {
    rawBaseUrl = 'https://goodtrack.onrender.com/api';
  } else if (hostname === 'localhost' || hostname === '127.0.0.1') {
    rawBaseUrl = import.meta.env.VITE_API_URL || '/api';
  } else {
    rawBaseUrl = '/api';
  }
}

if (rawBaseUrl.startsWith('http')) {
  rawBaseUrl = rawBaseUrl.replace(/\/$/, ''); // Remove trailing slash
  if (!rawBaseUrl.endsWith('/api')) {
    rawBaseUrl += '/api';
  }
}
export const BASE_URL = rawBaseUrl;

export function getHubUrl(hubPath: string) {
  const hubBaseUrl = BASE_URL.endsWith('/api') ? BASE_URL.slice(0, -4) : BASE_URL;
  return `${hubBaseUrl}${hubPath}`;
}

export interface User {
  token: string;
  username: string;
  role: 'seller' | 'mfr';
  userId: string;
}

export interface UserProfile {
  username: string;
  email: string;
  phoneNumber: string;
  firstName: string;
  lastName: string;
  role: string;
  profilePicture: string;   // Backend always sends empty string, never undefined
  address: string;
  city: string;
  bio: string;
  productImages: string[];
  keywords: string[];
  isVisibleToSellers: boolean;
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

export interface OrderLog {
  timestamp: string;
  status: string;
  message: string;
  userId: string;
  userName: string;
}

export interface Product {
  id: string;
  code: string;
  image: string | null;
  text: string;
  length: string;
  extras: { [fieldId: string]: ExtraFieldValue };
  completed: boolean;
  isDefective?: boolean;
  defectNote?: string;
  defectImage?: string | null;
  isPendingApproval?: boolean;
  status?: string;
  logs?: OrderLog[];
  mfrId: string;
  mfrName: string;
  sellerId: string;    // Backend always sends empty string, never undefined
  sellerName: string;  // Backend always sends empty string, never undefined
  createdAt?: string;
  completedAt?: string;
}

async function apiFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem(AUTH_STORAGE_KEYS.token);
  
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
    localStorage.removeItem(AUTH_STORAGE_KEYS.token);
    localStorage.removeItem(AUTH_STORAGE_KEYS.username);
    localStorage.removeItem(AUTH_STORAGE_KEYS.role);
    localStorage.removeItem(AUTH_STORAGE_KEYS.userId);
    window.dispatchEvent(new Event(AUTH_EVENTS.unauthorized));
    throw new Error('Oturumunuz sonlandırıldı. Lütfen tekrar giriş yapın.');
  }

  return response;
}

async function apiCall<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await apiFetch(endpoint, options);
  
  if (!res.ok) {
    let errorMessage = `İstek başarısız oldu (Hata Kodu: ${res.status})`;
    try {
      const errData = await res.json() as { message?: string } | null;
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

export interface RegisterPayload {
  firstname: string;
  lastname: string;
  username: string;
  email: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;  // camelCase to match .NET JSON serialization
  role: 'seller' | 'mfr';
}

export interface CreateProductPayload {
  code: string;
  image: string | null;
  text?: string;
  length?: string;
  extras?: Record<string, ExtraFieldValue>;
  completed: boolean;
  mfrId: string;
  mfrName: string;
}

export interface CreateCatalogProductPayload {
  productCode: string;
  image: string;
  mfrId: string;
  mfrName: string;
}

export interface UpdateCatalogProductPayload {
  productCode: string;
  image: string;
  mfrId: string;
  mfrName: string;
}

export interface CreateFieldPayload {
  name: string;
  type: string;
  options: string[];
}

export const api = {
  // Auth
  login(username: string, password: string): Promise<User> {
    return apiCall<User>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },

  register(registrationData: RegisterPayload): Promise<{ message: string }> {
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

  getProductById(productId: string): Promise<Product> {
    return apiCall<Product>(`/products/${productId}`);
  },

  createProduct(productData: CreateProductPayload): Promise<{ product: Product; message: string }> {
    return apiCall<{ product: Product; message: string }>('/products', {
      method: 'POST',
      body: JSON.stringify(productData),
    });
  },

  toggleProductDefective(productId: string, isDefective: boolean, defectNote?: string, defectImage?: string | null): Promise<{ message: string }> {
    return apiCall<{ message: string }>(`/products/${productId}/defective`, {
      method: 'PUT',
      body: JSON.stringify({ isDefective, defectNote, defectImage }),
    });
  },

  toggleProductApproval(productId: string, isPendingApproval: boolean): Promise<{ message: string }> {
    return apiCall<{ message: string }>(`/products/${productId}/approval`, {
      method: 'PUT',
      body: JSON.stringify({ isPendingApproval }),
    });
  },

  updateOrderStatus(productId: string, status: string, defectNote?: string | null, defectImage?: string | null): Promise<{ message: string }> {
    return apiCall<{ message: string }>(`/products/${productId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, defectNote, defectImage }),
    });
  },

  updateProduct(productId: string, productData: Product): Promise<{ product: Product; message: string }> {
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

  addCatalogProduct(catalogData: CreateCatalogProductPayload): Promise<{ product: CatalogProduct; message: string }> {
    return apiCall<{ product: CatalogProduct; message: string }>('/catalog', {
      method: 'POST',
      body: JSON.stringify(catalogData),
    });
  },

  updateCatalogProduct(id: string, catalogData: UpdateCatalogProductPayload): Promise<{ product: CatalogProduct; message: string }> {
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

  createField(fieldData: CreateFieldPayload): Promise<{ field: ExtraFieldDef; message: string }> {
    return apiCall<{ field: ExtraFieldDef; message: string }>('/fields', {
      method: 'POST',
      body: JSON.stringify(fieldData),
    });
  },

  deleteField(id: string): Promise<{ message: string }> {
    return apiCall<{ message: string }>(`/fields/${id}`, {
      method: 'DELETE',
    });
  },

  getProfile(): Promise<UserProfile> {
    return apiCall<UserProfile>('/auth/profile');
  },

  getProfileByUsername(username: string): Promise<UserProfile> {
    return apiCall<UserProfile>(`/auth/profile/${encodeURIComponent(username)}`);
  },

  verifyPassword(password: string): Promise<{ success: boolean; message: string }> {
    return apiCall<{ success: boolean; message: string }>('/auth/verify-password', {
      method: 'POST',
      body: JSON.stringify({ password })
    });
  },

  changePassword(oldPassword: string, newPassword: string, confirmNewPassword: string): Promise<{ message: string }> {
    return apiCall<{ message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ oldPassword, newPassword, confirmNewPassword })
    });
  },

  updateProfile(profileData: Partial<UserProfile>): Promise<{ message: string }> {
    return apiCall<{ message: string }>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
  },

  searchManufacturers(city?: string, keyword?: string): Promise<UserProfile[]> {
    const params = new URLSearchParams();
    if (city) params.append('city', city);
    if (keyword) params.append('keyword', keyword);
    return apiCall<UserProfile[]>(`/auth/manufacturers/search?${params.toString()}`);
  }
};
