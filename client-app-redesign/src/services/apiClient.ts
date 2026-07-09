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
  profilePicture: string;
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
  sellerId: string;
  sellerName: string;
  createdAt?: string;
  completedAt?: string;
  isReadBySeller?: boolean;
  isReadByMfr?: boolean;
}

export interface UserCredit {
  id: string;
  userId: string;
  plan: string;
  credits: number;
  planStartedAt: string;
  renewsAt: string;
}

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
  confirmPassword: string;
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

export interface EtsyWebhookMockTransaction {
  listing_id: number;
  quantity: number;
  title: string;
  variations: { formatted_name: string; formatted_value: string }[];
  personalization: string;
}

export interface EtsyWebhookMockPayload {
  event_type: string;
  shop_id: string;
  mock_receipt: {
    receipt_id: number;
    name: string;
    first_line: string;
    second_line: string;
    city: string;
    country_iso: string;
    transactions: EtsyWebhookMockTransaction[];
  };
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

interface ApiResponseEnvelope<T> {
  success: boolean;
  data?: T;
  message?: string;
}

export async function apiCall<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token');
  const headers = new Headers(options.headers);

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers
  });

  if (response.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/login';
    throw new Error('Oturum süresi doldu. Lütfen tekrar giriş yapın.');
  }

  if (response.status === 204) {
    return {} as T;
  }

  const text = await response.text();
  if (!text) {
    return {} as T;
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new ApiError('Sunucudan geçersiz veri biçimi alındı.', response.status);
  }

  if (parsed && typeof parsed === 'object' && 'success' in parsed) {
    const envelope = parsed as ApiResponseEnvelope<T>;
    if (envelope.success) {
      return envelope.data !== undefined ? envelope.data : parsed as T;
    } else {
      throw new ApiError(envelope.message || 'İşlem başarısız oldu.', response.status);
    }
  }

  return parsed as T;
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
  },

  // ── Etsy Entegrasyonu API Çağrıları ────────────────────────────────────────
  connectEtsy(payload: { keystring: string; sharedSecret: string; callbackUrl: string; frontendUrl: string }): Promise<{ oauthUrl: string }> {
    return apiCall<{ oauthUrl: string }>('/etsyauth/connect', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  getEtsyConnections(): Promise<{ shopId: string; shopName: string; isActive: boolean; tokenExpiresAt: string; webhookSigningSecret: string | null }[]> {
    return apiCall<{ shopId: string; shopName: string; isActive: boolean; tokenExpiresAt: string; webhookSigningSecret: string | null }[]>('/etsysync/connections');
  },

  updateEtsyWebhookSecret(shopId: string, webhookSigningSecret: string | null): Promise<{ message: string }> {
    return apiCall<{ message: string }>('/etsysync/connection/webhook-secret', {
      method: 'POST',
      body: JSON.stringify({ etsyShopId: shopId, webhookSigningSecret })
    });
  },

  disconnectEtsyShop(shopId: string): Promise<{ message: string }> {
    return apiCall<{ message: string }>('/etsysync/connection/disconnect', {
      method: 'POST',
      body: JSON.stringify({ etsyShopId: shopId })
    });
  },

  syncEtsyListings(): Promise<{ count: number; message: string }> {
    return apiCall<{ count: number; message: string }>('/etsysync/sync-listings', {
      method: 'POST'
    });
  },

  syncEtsyOrders(): Promise<{ message: string }> {
    return apiCall<{ message: string }>('/etsysync/sync-orders', {
      method: 'POST'
    });
  },

  testMockEtsyWebhook(payload: any): Promise<{ message: string }> {
    return apiCall<{ message: string }>('/etsysync/webhook/test-mock', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }
};
