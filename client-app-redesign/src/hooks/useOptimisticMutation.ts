import { useCallback, useEffect, useRef, useState } from 'react';
import { useToast } from '../context/ToastContext';
import { extractErrorMessage } from '../utils/errorUtils';

/** Mutasyonun çalıştığı cache ortamı: anlık görüntü al, geri sar, sunucudan tazele. */
export interface MutationEnv<TSnapshot> {
  snapshot: () => TSnapshot;
  rollback: (prev: TSnapshot) => void;
  refresh: () => Promise<void>;
}

interface RunOptions<TData extends { message?: string }> {
  /** Cache'e iyimser değişikliği uygular (istek atılmadan önce). */
  optimistic?: () => void;
  /** Asıl API çağrısı. */
  action: () => Promise<TData>;
  /** Başarı toast metni (genelde sunucu mesajı + çeviri fallback'i). */
  successToast: (data: TData) => string;
  /** Başarı sonrası ek iş (ör. kredi bakiyesini tazele). */
  onSuccess?: (data: TData) => void | Promise<void>;
  /**
   * Hata işleyici; verilirse varsayılan toast (extractErrorMessage) YERİNE çağrılır.
   * Rollback her durumda sarmalayıcı tarafından yapılır.
   */
  onError?: (err: unknown) => void;
  /** İsteğe bağlı ek loading bayrağı (ör. form hook'uyla paylaşılan). */
  extraLoading?: (v: boolean) => void;
}

/**
 * İyimser mutasyon kalıbının tek kaynağı: snapshot → optimistic → istek →
 * toast + refresh, hatada rollback + hata toast'ı; re-entrancy guard ve
 * actionLoading yönetimi içeride. Sipariş ve katalog hook'larındaki elle
 * yazılmış try/catch/finally bloklarının yerini alır.
 */
export function useOptimisticMutation<TSnapshot>(env: MutationEnv<TSnapshot>) {
  const { showToast } = useToast();
  const [actionLoading, setActionLoading] = useState(false);
  const isRunning = useRef(false);

  // Env her render'da yeni nesne olabilir; run'ın kimliğini sabit tutmak için ref'te taşınır.
  // Yazma render sırasında değil commit sonrası yapılır; run yalnız olay işleyicilerinden
  // (yani commit'ten sonra) çağrıldığından hep en güncel env'i görür.
  const envRef = useRef(env);
  useEffect(() => {
    envRef.current = env;
  });

  const run = useCallback(
    async <TData extends { message?: string }>(opts: RunOptions<TData>): Promise<boolean> => {
      if (isRunning.current) return false;
      const prev = envRef.current.snapshot();
      opts.optimistic?.();
      try {
        isRunning.current = true;
        setActionLoading(true);
        opts.extraLoading?.(true);
        const data = await opts.action();
        showToast(opts.successToast(data));
        await envRef.current.refresh();
        await opts.onSuccess?.(data);
        return true;
      } catch (err: unknown) {
        envRef.current.rollback(prev);
        if (opts.onError) opts.onError(err);
        else showToast(extractErrorMessage(err));
        return false;
      } finally {
        isRunning.current = false;
        setActionLoading(false);
        opts.extraLoading?.(false);
      }
    },
    [showToast],
  );

  return { run, actionLoading, isRunning };
}
