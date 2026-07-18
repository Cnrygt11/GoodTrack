import { Skeleton } from '../../common/Skeleton';

export function EtsyStoreSkeleton() {
  return (
    <div className="etsy-skeleton">
      {/* Başlık İskeleti */}
      <div className="etsy-skeleton-header">
        <Skeleton width={48} height={48} borderRadius="10px" />
        <div className="etsy-skeleton-header-text">
          <Skeleton width="180px" height="18px" />
          <Skeleton width="300px" height="12px" />
        </div>
      </div>

      {/* Mağaza Kartı İskeleti */}
      <div className="card etsy-skeleton-card">
        <Skeleton width="140px" height="16px" />
        <Skeleton width="100%" height="80px" />
        <div className="etsy-skeleton-actions">
          <Skeleton width="120px" height="36px" />
        </div>
      </div>
    </div>
  );
}
