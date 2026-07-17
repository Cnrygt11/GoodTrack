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
  /** Kullanıcı kimliği. Dizin sonuçlarında galeriyi talep üzerine çekmek için kullanılır. */
  id?: string;
  username: string;
  email: string;
  phoneNumber: string;
  firstName: string;
  lastName: string;
  role: string;
  profilePicture: string;
  /** Dizin/listelerde gösterilen küçük avatar thumbnail'i; tam avatar profil detayında. */
  profileThumbnail?: string;
  address: string;
  city: string;
  bio: string;
  /** Dizin/arama sonuçlarında boş döner; galeri talep üzerine getManufacturerGallery ile çekilir. */
  productImages: string[];
  keywords: string[];
  isVisibleToSellers: boolean;
  /** Galerideki görsel sayısı (dizin sonuçlarında dolu; "Galeriyi gör (N)" için). */
  galleryCount?: number;
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
  /** Liste yanıtında null; tam görsel yalnız detayda (getCatalogById) gelir. */
  image: string | null;
  thumbnailImage?: string | null;
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
  /** Liste/kartlarda gösterilen küçük thumbnail; tam görsel yalnız detayda (getProductById) gelir. */
  thumbnailImage?: string | null;
  /** Görsel katalog referansıysa katalog ürününün id'si; siparişe özel görselde null. */
  catalogProductId?: string | null;
  text: string;
  length: string;
  extras: { [fieldId: string]: ExtraFieldValue };
  quantity?: number;
  /** Etsy sipariş numarası (varsa). Manuel siparişlerde yok. */
  etsyReceiptId?: number | null;
  /** Yalnızca satıcıya döner; üretici yanıtlarında daima null. */
  customerName?: string | null;
  /** Yalnızca satıcıya döner; üretici yanıtlarında daima null. */
  shippingAddress?: string | null;
  completed: boolean;
  isDefective?: boolean;
  defectNote?: string;
  /** Liste yanıtında null (ağır base64 taşınmaz); tam görsel getProductById detayından gelir. */
  defectImage?: string | null;
  /** Kusur görseli var mı? Liste görseli taşımadığından varlık bu bayrakla bildirilir. */
  hasDefectImage?: boolean;
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
  /** Siparişin arşive (kargolandı/iptal) düştüğü an; aktif siparişte yok. */
  archivedAt?: string | null;
  /** Doluysa kayıt küçültülmüş: görseller ve müşteri bilgisi kalıcı temizlenmiştir. */
  slimmedAt?: string | null;
  isReadBySeller?: boolean;
  isReadByMfr?: boolean;
}

/** Sunucu tarafı sayfalı liste yanıtı (ör. arşiv). */
export interface PagedResult<T> {
  items: T[];
  totalCount?: number | null;
  hasMore: boolean;
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

/** Tek seferlik kredi paketi (dolum). */
export interface CreditPackage {
  id: string;
  credits: number;
  price: number;
  /** "En Popüler" rozeti gösterilecek paket. */
  popular: boolean;
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
  thumbnailImage?: string | null;
  /** Görsel katalogtan geliyorsa katalog ürününün id'si; base64 kopya yerine referans gönderilir. */
  catalogProductId?: string | null;
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
  thumbnailImage?: string | null;
  mfrId: string;
  mfrName: string;
  text?: string;
  length?: string;
  extras?: Record<string, ExtraFieldValue>;
}

export interface UpdateCatalogProductPayload {
  productCode: string;
  /** null = "görsel değişmedi" (mevcut görsel korunur); yalnız dolu ve farklı değer değiştirir. */
  image: string | null;
  thumbnailImage?: string | null;
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
    headers,
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
      if (envelope.data === undefined) {
        return parsed as T;
      }
      // Zarfın başarı mesajını data nesnesine iliştir: çağıranlar `data.message` ile
      // sunucu mesajına tekdüze erişir (data'nın kendi message alanı varsa dokunulmaz).
      if (
        envelope.message &&
        typeof envelope.data === 'object' &&
        !Array.isArray(envelope.data) &&
        !('message' in (envelope.data as object))
      ) {
        return { ...(envelope.data as object), message: envelope.message } as T;
      }
      return envelope.data;
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

  /** Arşivlenmiş (kargolandı/iptal) siparişlerin sunucu tarafı sayfalı listesi. */
  getArchivedProducts(page: number, pageSize: number): Promise<PagedResult<Product>> {
    return apiCall<PagedResult<Product>>(`/products/archived?page=${page}&pageSize=${pageSize}`);
  },

  getProductById(productId: string): Promise<Product> {
    return apiCall<Product>(`/products/${productId}`);
  },

  /** Yanıt: oluşturulan sipariş (+ zarf mesajı apiCall tarafından iliştirilir). */
  createProduct(productData: CreateProductPayload): Promise<Product & { message?: string }> {
    return apiCall<Product & { message?: string }>('/products', {
      method: 'POST',
      body: JSON.stringify(productData),
    });
  },

  updateOrderStatus(
    productId: string,
    status: string,
    defectNote?: string | null,
    defectImage?: string | null,
  ): Promise<{ message: string }> {
    return apiCall<{ message: string }>(`/products/${productId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, defectNote, defectImage }),
    });
  },

  markStatusAsRead(status: string): Promise<{ message: string }> {
    return apiCall<{ message: string }>('/products/read-status', {
      method: 'POST',
      body: JSON.stringify({ status }),
    });
  },

  /** Yanıt: güncellenen sipariş (+ zarf mesajı apiCall tarafından iliştirilir). */
  updateProduct(productId: string, productData: Product): Promise<Product & { message?: string }> {
    return apiCall<Product & { message?: string }>(`/products/${productId}`, {
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

  /** Tek katalog ürününü TAM görseliyle döner (liste yanıtı image taşımaz). */
  getCatalogById(id: string): Promise<CatalogProduct> {
    return apiCall<CatalogProduct>(`/catalog/${id}`);
  },

  addCatalogProduct(
    catalogData: CreateCatalogProductPayload,
  ): Promise<{ product: CatalogProduct; message: string }> {
    return apiCall<{ product: CatalogProduct; message: string }>('/catalog', {
      method: 'POST',
      body: JSON.stringify(catalogData),
    });
  },

  updateCatalogProduct(
    id: string,
    catalogData: UpdateCatalogProductPayload,
  ): Promise<{ product: CatalogProduct; message: string }> {
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
      body: JSON.stringify({ password }),
    });
  },

  changePassword(
    oldPassword: string,
    newPassword: string,
    confirmNewPassword: string,
  ): Promise<{ message: string }> {
    return apiCall<{ message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ oldPassword, newPassword, confirmNewPassword }),
    });
  },

  updateProfile(profileData: Partial<UserProfile>): Promise<{ message: string }> {
    return apiCall<{ message: string }>('/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  },

  deactivateAccount(password: string): Promise<{ message: string }> {
    return apiCall<{ message: string }>('/profile/deactivate', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
  },

  searchManufacturers(opts: {
    city?: string;
    keyword?: string;
    name?: string;
    sort?: string;
    page?: number;
    limit?: number;
    mustHaveGallery?: boolean;
    mustHaveAvatar?: boolean;
  }): Promise<{ items: UserProfile[]; totalCount: number; hasMore: boolean }> {
    const params = new URLSearchParams();
    if (opts.city) params.append('city', opts.city);
    if (opts.keyword) params.append('keyword', opts.keyword);
    if (opts.name) params.append('name', opts.name);
    if (opts.sort) params.append('sort', opts.sort);
    if (opts.page) params.append('page', opts.page.toString());
    if (opts.limit) params.append('limit', opts.limit.toString());
    if (opts.mustHaveGallery) params.append('mustHaveGallery', 'true');
    if (opts.mustHaveAvatar) params.append('mustHaveAvatar', 'true');
    return apiCall<{ items: UserProfile[]; totalCount: number; hasMore: boolean }>(
      `/manufacturers/search?${params.toString()}`,
    );
  },

  /** Bir üreticinin ürün galerisini talep üzerine çeker (dizin listesinde galeri taşınmaz). */
  getManufacturerGallery(manufacturerId: string): Promise<string[]> {
    return apiCall<string[]>(`/manufacturers/${encodeURIComponent(manufacturerId)}/gallery`);
  },

  submitFeedback(payload: FeedbackInput): Promise<{ message: string }> {
    return apiCall<{ message: string }>('/feedback', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getAdminUsers(): Promise<AdminUser[]> {
    return apiCall<AdminUser[]>('/admin/users');
  },

  deleteUser(userId: string): Promise<{ message: string }> {
    return apiCall<{ message: string }>(`/admin/users/${userId}`, {
      method: 'DELETE',
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

  /** Yanıt: güncel UserCredit kaydı (önceki {credits: UserCredit} tipi yanlıştı — cache'i bozuyordu). */
  upgradePlan(plan: string): Promise<UserCredit & { message?: string }> {
    return apiCall<UserCredit & { message?: string }>('/credits/upgrade', {
      method: 'POST',
      body: JSON.stringify({ plan }),
    });
  },

  getCreditPackages(): Promise<CreditPackage[]> {
    return apiCall<CreditPackage[]>('/credits/packages');
  },

  /** Kredi paketi satın alımı; güncel UserCredit kaydını döner. */
  topUpCredits(packageId: string): Promise<UserCredit & { message?: string }> {
    return apiCall<UserCredit & { message?: string }>('/credits/topup', {
      method: 'POST',
      body: JSON.stringify({ packageId }),
    });
  },

  // ── Etsy Entegrasyonu API Çağrıları ────────────────────────────────────────
  connectEtsy(payload: {
    keystring: string;
    sharedSecret: string;
    callbackUrl: string;
    frontendUrl: string;
  }): Promise<{ oauthUrl: string }> {
    return apiCall<{ oauthUrl: string }>('/etsyauth/connect', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getEtsyConnections(): Promise<
    {
      shopId: string;
      shopName: string;
      isActive: boolean;
      tokenExpiresAt: string;
      /** Secret istemciye dönmez; yalnız kayıtlı olup olmadığı bildirilir. */
      hasWebhookSecret: boolean;
    }[]
  > {
    return apiCall<
      {
        shopId: string;
        shopName: string;
        isActive: boolean;
        tokenExpiresAt: string;
        hasWebhookSecret: boolean;
      }[]
    >('/etsysync/connections');
  },

  disconnectEtsyShop(shopId: string): Promise<{ message: string }> {
    return apiCall<{ message: string }>('/etsysync/connection/disconnect', {
      method: 'POST',
      body: JSON.stringify({ etsyShopId: shopId }),
    });
  },

  syncEtsyListings(): Promise<{ count: number; message: string }> {
    return apiCall<{ count: number; message: string }>('/etsysync/sync-listings', {
      method: 'POST',
    });
  },

  syncEtsyOrders(): Promise<{ message: string }> {
    return apiCall<{ message: string }>('/etsysync/sync-orders', {
      method: 'POST',
    });
  },
};
