import React from 'react';
import { Skeleton } from '../../common/Skeleton';

export function EtsyStoreSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '20px' }}>
      {/* Başlık İskeleti */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <Skeleton width={48} height={48} borderRadius="10px" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
          <Skeleton width="180px" height="18px" />
          <Skeleton width="300px" height="12px" />
        </div>
      </div>

      {/* Mağaza Kartı İskeleti */}
      <div className="card" style={{ padding: '24px', border: '1px solid var(--border)', borderRadius: '12px', backgroundColor: 'var(--bg-card)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <Skeleton width="140px" height="16px" />
        <Skeleton width="100%" height="80px" />
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Skeleton width="120px" height="36px" />
        </div>
      </div>
    </div>
  );
}
