import { AUTH_STORAGE_KEYS, AUTH_EVENTS } from '../constants/authKeys';

let rawBaseUrl = '/api';

if (typeof window !== 'undefined') {
  const hostname = window.location.hostname;
  if (hostname === 'goodtrack-client.onrender.com') {
    rawBaseUrl = import.meta.env.VITE_PRODUCTION_API_URL || 'https://goodtrack.onrender.com/api';
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
  refreshToken: string;
  username: string;
  role: 'seller' | 'mfr' | 'admin';
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
  text?: string;
  length?: string;
  extras?: { [fieldId: string]: ExtraFieldValue };
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
  isReproduction?: boolean;
  cancelRequested?: boolean;
  status?: string;
  logs?: OrderLog[];
  mfrId: string;
  mfrName: string;
  sellerId: string;    // Backend always sends empty string, never undefined
  sellerName: string;  // Backend always sends empty string, never undefined
  createdAt?: string;
  completedAt?: string;
  isReadBySeller?: boolean;
  isReadByMfr?: boolean;
}

let refreshPromise: Promise<string | null> | null = null;

async function apiFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  let token = localStorage.getItem(AUTH_STORAGE_KEYS.token);
  
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

  let response = await fetch(`${BASE_URL}${endpoint}`, options);

  if (response.status === 401) {
    if (endpoint === '/auth/refresh' || endpoint === '/auth/login') {
      window.dispatchEvent(new Event(AUTH_EVENTS.unauthorized));
      throw new Error('Oturumunuz sonlandırıldı. Lütfen tekrar giriş yapın.');
    }

    const refreshToken = localStorage.getItem(AUTH_STORAGE_KEYS.refreshToken);
    if (token && refreshToken) {
      if (!refreshPromise) {
        refreshPromise = (async () => {
          try {
            const res = await fetch(`${BASE_URL}/auth/refresh`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ token, refreshToken })
            });

            if (res.ok) {
              const data = await res.json() as User;
              localStorage.setItem(AUTH_STORAGE_KEYS.token, data.token);
              localStorage.setItem(AUTH_STORAGE_KEYS.refreshToken, data.refreshToken);
              localStorage.setItem(AUTH_STORAGE_KEYS.username, data.username);
              localStorage.setItem(AUTH_STORAGE_KEYS.role, data.role);
              localStorage.setItem(AUTH_STORAGE_KEYS.userId, data.userId);
              return data.token;
            }
          } catch (err) {
            console.error('Token refresh request failed:', err);
          }
          return null;
        })();
      }

      const newToken = await refreshPromise;
      refreshPromise = null;

      if (newToken) {
        headers['Authorization'] = `Bearer ${newToken}`;
        response = await fetch(`${BASE_URL}${endpoint}`, options);
        return response;
      }
    }

    window.dispatchEvent(new Event(AUTH_EVENTS.unauthorized));
    throw new Error('Oturumunuz sonlandırıldı. Lütfen tekrar giriş yapın.');
  }

  return response;
}

/**
 * Represents an error response from the API, containing the HTTP status code.
 */
export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
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
    throw new ApiError(errorMessage, res.status);
  }
  
  if (res.status === 204) {
    return {} as T;
  }
  
  try {
    const text = await res.text();
    if (!text) {
      return {} as T;
    }
    try {
      return JSON.parse(text) as T;
    } catch (parseErr) {
      console.error("JSON parse failed. Raw response text:", text, parseErr);
      throw new Error(`Sunucudan geçersiz veri biçimi alındı (JSON bekleniyordu). Yanıt: ${text.slice(0, 100)}`);
    }
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('Sunucudan geçersiz veri biçimi')) {
      throw err;
    }
    throw new Error('Sunucudan geçersiz veri biçimi alındı (JSON bekleniyordu).');
  }
}

/**
 * Represents the user's credit balance and subscription plan details.
 */
export interface UserCredit {
  id: string;
  userId: string;
  plan: string;
  credits: number;
  planStartedAt: string;
  renewsAt: string;
}

/**
 * Represents the details of a subscription plan available for upgrade.
 */
export interface SubscriptionPlanDetail {
  plan: string;
  credits: number;
  price: number;
  features: string[];
}

export interface RegisterPayload {
  firstname: string;
  lastname: string;
  username: string;
  email: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;  // camelCase to match .NET JSON serialization
  role: 'seller' | 'mfr' | 'admin';
  adminSecret?: string;
}

export interface AdminUser {
  id: string;
  username: string;
  role: 'seller' | 'mfr' | 'admin';
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  createdAt: string;
  isActive: boolean;
}

export interface Feedback {
  id: string;
  userId: string;
  username: string;
  role: string;
  title: string;
  message: string;
  browserInfo?: string;
  createdAt: string;
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
  text?: string;
  length?: string;
  extras?: Record<string, ExtraFieldValue>;
}

export interface UpdateCatalogProductPayload {
  productCode: string;
  image: string;
  mfrId: string;
  mfrName: string;
  text?: string;
  length?: string;
  extras?: Record<string, ExtraFieldValue>;
}

export interface CreateFieldPayload {
  name: string;
  type: string;
  options: string[];
}

export interface FeedbackInput {
  title: string;
  message: string;
  browserInfo?: string;
}

export const api = {
  // Auth
  login(username: string, password: string): Promise<User> {
    return apiCall<User>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },

  refreshToken(token: string, refreshToken: string): Promise<User> {
    return apiCall<User>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ token, refreshToken }),
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
    return apiCall<ConnectionUser[]>('/connections');
  },

  sendConnectionRequest(username: string): Promise<{ message: string }> {
    return apiCall<{ message: string }>(`/connections?username=${encodeURIComponent(username)}`, {
      method: 'POST',
    });
  },

  getIncomingRequests(): Promise<ConnectionRequest[]> {
    return apiCall<ConnectionRequest[]>('/connections/requests/incoming');
  },

  getSentRequests(): Promise<ConnectionRequest[]> {
    return apiCall<ConnectionRequest[]>('/connections/requests/sent');
  },

  acceptRequest(requestId: string): Promise<{ message: string }> {
    return apiCall<{ message: string }>(`/connections/requests/${requestId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'accepted' }),
    });
  },

  rejectRequest(requestId: string): Promise<{ message: string }> {
    return apiCall<{ message: string }>(`/connections/requests/${requestId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'rejected' }),
    });
  },

  deleteSentRequest(requestId: string): Promise<{ message: string }> {
    return apiCall<{ message: string }>(`/connections/requests/${requestId}`, {
      method: 'DELETE',
    });
  },

  removeConnection(targetId: string): Promise<{ message: string }> {
    return apiCall<{ message: string }>(`/connections/${targetId}`, {
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


  updateOrderStatus(productId: string, status: string, defectNote?: string | null, defectImage?: string | null): Promise<{ message: string }> {
    return apiCall<{ message: string }>(`/products/${productId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, defectNote, defectImage }),
    });
  },

  markStatusAsRead(status: string): Promise<{ message: string }> {
    return apiCall<{ message: string }>('/products/read-status', {
      method: 'POST',
      body: JSON.stringify({ status })
    });
  },

  updateProduct(productId: string, productData: Product): Promise<{ product: Product; message: string }> {
    return apiCall<{ product: Product; message: string }>(`/products/${productId}`, {
      method: 'PUT',
      body: JSON.stringify(productData),
    });
  },

  requestOrderCancellation(productId: string): Promise<{ message: string }> {
    return apiCall<{ message: string }>(`/products/${productId}/cancellation-requests`, {
      method: 'POST',
    });
  },

  respondToOrderCancellation(productId: string, approve: boolean): Promise<{ message: string }> {
    return apiCall<{ message: string }>(`/products/${productId}/cancellation-requests`, {
      method: 'PATCH',
      body: JSON.stringify({ approve }),
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
    return apiCall<UserProfile>('/profile');
  },

  getProfileByUsername(username: string): Promise<UserProfile> {
    return apiCall<UserProfile>(`/profile/${encodeURIComponent(username)}`);
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
    return apiCall<{ message: string }>('/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
  },

  searchManufacturers(
    city?: string,
    keyword?: string,
    cursor?: string,
    limit?: number,
    mustHaveGallery?: boolean,
    mustHaveAvatar?: boolean
  ): Promise<{ items: UserProfile[]; nextCursor: string | null }> {
    const params = new URLSearchParams();
    if (city) params.append('city', city);
    if (keyword) params.append('keyword', keyword);
    if (cursor) params.append('cursor', cursor);
    if (limit) params.append('limit', limit.toString());
    if (mustHaveGallery) params.append('mustHaveGallery', 'true');
    if (mustHaveAvatar) params.append('mustHaveAvatar', 'true');
    return apiCall<{ items: UserProfile[]; nextCursor: string | null }>(`/manufacturers/search?${params.toString()}`);
  },

  submitFeedback(payload: FeedbackInput): Promise<{ message: string }> {
    return apiCall<{ message: string }>('/feedback', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  getAdminUsers(): Promise<AdminUser[]> {
    return apiCall<AdminUser[]>('/admin/users');
  },

  deleteUser(userId: string): Promise<{ message: string }> {
    return apiCall<{ message: string }>(`/admin/users/${userId}`, {
      method: 'DELETE'
    });
  },

  getAdminFeedbacks(): Promise<Feedback[]> {
    return apiCall<Feedback[]>('/admin/feedbacks');
  },

  getCredits(): Promise<UserCredit> {
    return apiCall<UserCredit>('/credits');
  },

  getPlans(): Promise<SubscriptionPlanDetail[]> {
    return apiCall<SubscriptionPlanDetail[]>('/credits/plans');
  },

  upgradePlan(plan: string): Promise<{ message: string; credits: UserCredit }> {
    return apiCall<{ message: string; credits: UserCredit }>('/credits/upgrade', {
      method: 'POST',
      body: JSON.stringify({ plan })
    });
  }
};
