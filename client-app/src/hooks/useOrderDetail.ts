import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { api, Product } from '../services/api';

export default function useOrderDetail(id: string | undefined) {
  const { user } = useAuth();
  const { language, t } = useSettings();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;

    const fetchOrder = async () => {
      try {
        setLoading(true);
        setError('');
        const data = await api.getProductById(id);
        setProduct(data);
      } catch (err: unknown) {
        console.error(err);
        setError(t('failedToLoadOrderDetails'));
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [id, language, t]);

  return {
    product,
    loading,
    error,
    user,
    language,
    t,
    setProduct,
  };
}
