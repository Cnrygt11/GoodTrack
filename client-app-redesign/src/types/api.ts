/**
 * API sözleşmesi (domain) tipleri — tek kaynak. apiClient bu tipleri yeniden
 * dışa aktarır; yeni kodda doğrudan '../types' üzerinden import edilmesi tercih edilir.
 */

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

/** Etsy mağaza bağlantısı özeti. Secret istemciye asla dönmez; yalnız kayıtlı olup olmadığı bildirilir. */
export interface EtsyConnectionInfo {
  shopId: string;
  shopName: string;
  isActive: boolean;
  tokenExpiresAt: string;
  hasWebhookSecret: boolean;
}
