import { useState, useCallback, useMemo, FormEvent } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useProductsQuery } from './useProductsData';
import { useCatalogProducts, useExtraFieldDefs } from './useCatalogData';
import { useConnectionsQuery } from './useConnectionsData';
import { useSettings } from '../context/SettingsContext';
import { Product } from '../services/apiClient';
import { ListFilter, SellerTabId, LIST_FILTER_TABS } from '../types/orders';
import { ORDER_STATUS } from '../utils/constants';
import { deriveStatus } from '../utils/orderStatus';
import useSellerOrderBadges from './useSellerOrderBadges';
import useSellerOrderForm from './useSellerOrderForm';
import useSellerOrderActions from './useSellerOrderActions';

/**
 * Top-level coordinator hook for the Seller Orders page.
 *
 * Delegates to three focused sub-hooks:
 *   - useSellerOrderBadges  → badge / unseen notification tracking
 *   - useSellerOrderForm    → form state, catalog autofill, field & CRUD management
 *   - useSellerOrderActions → cancel, verify, ship, defect report handlers
 *
 * This hook keeps only cross-cutting concerns:
 *   - Active tab + URL-synced list filter
 *   - Dropdown state
 *   - Derived filteredProducts computation
 *   - Passing context values up to consumers
 */
export default function useSellerOrders() {
  const { products } = useProductsQuery();
  const { connections } = useConnectionsQuery();
  const { catalogProducts } = useCatalogProducts();
  const { extraFieldDefs } = useExtraFieldDefs();
  const { language, t } = useSettings();
  const navigate = useNavigate();

  // --- Tab & Filter State ---
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');

  const activeTab: SellerTabId =
    tabParam === 'create' ? 'create' : tabParam === 'catalog' ? 'catalog' : 'list';

  const listFilter: ListFilter =
    tabParam && LIST_FILTER_TABS.includes(tabParam as ListFilter)
      ? (tabParam as ListFilter)
      : ORDER_STATUS.AWAITING;

  const setActiveTab = useCallback(
    (tab: SellerTabId) => {
      setSearchParams((prev) => {
        if (tab === 'create') {
          prev.set('tab', 'create');
        } else if (tab === 'catalog') {
          prev.set('tab', 'catalog');
        } else {
          prev.set('tab', listFilter);
        }
        return prev;
      });
    },
    [setSearchParams, listFilter],
  );

  const setListFilter = useCallback(
    (tab: ListFilter) =>
      setSearchParams((prev) => {
        prev.set('tab', tab);
        return prev;
      }),
    [setSearchParams],
  );
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // --- Search State (client-side; mevcut yüklü liste üzerinde) ---
  const [orderSearch, setOrderSearch] = useState('');

  // --- Dropdown State ---
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);

  // --- Broken Order Modal State ---
  const [selectedBrokenProduct, setSelectedBrokenProduct] = useState<Product | null>(null);
  const [isBrokenModalOpen, setIsBrokenModalOpen] = useState(false);

  const openBrokenDetails = useCallback((p: Product) => {
    setSelectedBrokenProduct(p);
    setIsBrokenModalOpen(true);
  }, []);

  const closeBrokenDetails = useCallback(() => {
    setIsBrokenModalOpen(false);
    setSelectedBrokenProduct(null);
  }, []);

  // --- Sub-hooks ---
  const badges = useSellerOrderBadges(products, listFilter);

  const form = useSellerOrderForm();

  const actions = useSellerOrderActions({
    isRef: form.isActionLoadingRef,
    set: form.setActionLoading,
  });

  // --- Navigation helper ---
  const openTimeline = useCallback(
    (p: Product) => {
      navigate(`/seller/orders/${p.id}`);
    },
    [navigate],
  );

  // --- Derived filteredProducts ---
  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => {
      const dA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return sortOrder === 'desc' ? dB - dA : dA - dB;
    });
  }, [products, sortOrder]);

  const filteredProducts = useMemo(() => {
    const q = orderSearch.trim().toLowerCase();
    const matchesSearch = (p: Product) =>
      !q ||
      [p.code, p.text, p.customerName, p.mfrName, p.sellerName].some((f) =>
        (f || '').toLowerCase().includes(q),
      );

    return sortedProducts.filter((p) => {
      const status = deriveStatus(p);
      let statusMatch: boolean;
      if (listFilter === ORDER_STATUS.AWAITING)
        statusMatch = status === ORDER_STATUS.AWAITING || status === ORDER_STATUS.CORRECTED;
      else if (listFilter === ORDER_STATUS.BROKEN) statusMatch = status === ORDER_STATUS.BROKEN;
      else if (listFilter === ORDER_STATUS.PRODUCTION)
        statusMatch = status === ORDER_STATUS.PRODUCTION;
      else if (listFilter === ORDER_STATUS.COMPLETED)
        statusMatch = status === ORDER_STATUS.COMPLETED;
      else if (listFilter === ORDER_STATUS.DELIVERED)
        statusMatch = status === ORDER_STATUS.DELIVERED;
      else if (listFilter === ORDER_STATUS.DEFECTIVE)
        statusMatch = status === ORDER_STATUS.DEFECTIVE || status === ORDER_STATUS.MISSING;
      else if (listFilter === ORDER_STATUS.TO_SHIP) statusMatch = status === ORDER_STATUS.TO_SHIP;
      else if (listFilter === ORDER_STATUS.SHIPPED)
        statusMatch = status === ORDER_STATUS.SHIPPED || status === ORDER_STATUS.CANCELLED;
      else statusMatch = true;

      return statusMatch && matchesSearch(p);
    });
  }, [sortedProducts, listFilter, orderSearch]);

  // Wrap handleEditClick so it receives setActiveTab from this scope
  const handleEditClick = useCallback(
    (product: Product) => form.handleEditClick(product, setActiveTab),
    [form, setActiveTab],
  );

  // Wrap handleSubmit so it receives setActiveTab from this scope
  const handleSubmit = useCallback(
    (e: FormEvent) => form.handleSubmit(e, setActiveTab),
    [form, setActiveTab],
  );

  return {
    // Context pass-through
    language,
    t,
    connections,
    extraFieldDefs,
    catalogProducts,

    // Tab & filter
    activeTab,
    setActiveTab,
    listFilter,
    setListFilter,
    sortOrder,
    setSortOrder,
    orderSearch,
    setOrderSearch,

    // Form (from useSellerOrderForm)
    productCode: form.productCode,
    setProductCode: form.setProductCode,
    orderText: form.orderText,
    setOrderText: form.setOrderText,
    mfrId: form.mfrId,
    setMfrId: form.setMfrId,
    orderImage: form.orderImage,
    imageFileName: form.imageFileName,
    autofillSuccess: form.autofillSuccess,
    extraValues: form.extraValues,
    editingProduct: form.editingProduct,
    actionLoading: form.actionLoading || actions.actionLoading,
    isFieldModalOpen: form.isFieldModalOpen,
    setIsFieldModalOpen: form.setIsFieldModalOpen,
    newFieldName: form.newFieldName,
    setNewFieldName: form.setNewFieldName,
    newFieldType: form.newFieldType,
    setNewFieldType: form.setNewFieldType,
    newFieldOptions: form.newFieldOptions,
    setNewFieldOptions: form.setNewFieldOptions,
    handleImageChange: form.handleImageChange,
    handleClearForm: form.handleClearForm,
    handleEditClick,
    handleExtraValueChange: form.handleExtraValueChange,
    handleSubmit,
    handleAddFieldSubmit: form.handleAddFieldSubmit,
    handleRemoveField: form.handleRemoveField,
    handleDeleteClick: form.handleDeleteClick,

    // Actions (from useSellerOrderActions)
    isDefectModalOpen: actions.isDefectModalOpen,
    setIsDefectModalOpen: actions.setIsDefectModalOpen,
    defectType: actions.defectType,
    setDefectType: actions.setDefectType,
    defectNote: actions.defectNote,
    setDefectNote: actions.setDefectNote,
    defectImage: actions.defectImage,
    defectImageFileName: actions.defectImageFileName,
    handleCancelOrder: actions.handleCancelOrder,
    handleRequestCancel: actions.handleRequestCancel,
    handleVerifyOrder: actions.handleVerifyOrder,
    handleShipOrder: actions.handleShipOrder,
    handleDefectClick: actions.handleDefectClick,
    handleDefectImageChange: actions.handleDefectImageChange,
    handleDefectReportSubmit: actions.handleDefectReportSubmit,

    // Badges (from useSellerOrderBadges)
    unseenIds: badges.unseenIds,
    badgeCounts: badges.badgeCounts,
    handleMarkSingleAsSeen: badges.handleMarkSingleAsSeen,

    // Derived
    filteredProducts,

    // Navigation
    openTimeline,

    // Dropdown
    activeDropdownId,
    setActiveDropdownId,

    // Broken details modal
    isBrokenModalOpen,
    selectedBrokenProduct,
    openBrokenDetails,
    closeBrokenDetails,
  };
}
