import { useState, useCallback, ChangeEvent, FormEvent } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useSettings } from '../context/SettingsContext';
import { Product } from '../services/api';
import { TranslationKey } from '../services/translations';
import { ListFilter, SellerTabId, LIST_FILTER_TABS } from '../types/orders';
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
  const { connections, products, extraFieldDefs, catalogProducts } = useData();
  const { language, t } = useSettings();
  const navigate = useNavigate();

  // --- Tab & Filter State ---
  const [activeTab, setActiveTab] = useState<SellerTabId>('list');
  const [searchParams, setSearchParams] = useSearchParams();
  const listFilter = (searchParams.get('tab') as ListFilter) || 'awaiting';
  const setListFilter = useCallback(
    (tab: ListFilter) => setSearchParams((prev) => { prev.set('tab', tab); return prev; }),
    [setSearchParams],
  );
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

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
  const openTimeline = useCallback((p: Product) => { navigate(`/seller/orders/${p.id}`); }, [navigate]);

  // --- Derived filteredProducts ---
  const sortedProducts = [...products].sort((a, b) => {
    const dA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return sortOrder === 'desc' ? dB - dA : dA - dB;
  });

  const filteredProducts = sortedProducts.filter((p) => {
    const status = p.status || (p.isDefective ? 'defective' : p.completed ? 'completed' : p.isPendingApproval ? 'awaiting' : 'production');
    if (listFilter === 'awaiting') return status === 'awaiting' || status === 'corrected';
    if (listFilter === 'broken') return status === 'broken';
    if (listFilter === 'production') return status === 'production';
    if (listFilter === 'completed') return status === 'completed';
    if (listFilter === 'delivered') return status === 'delivered';
    if (listFilter === 'defective') return status === 'defective' || status === 'missing';
    if (listFilter === 'to_ship') return status === 'to_ship';
    if (listFilter === 'shipped') return status === 'shipped' || status === 'cancelled';
    return true;
  });

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
    language, t, connections, extraFieldDefs, catalogProducts,

    // Tab & filter
    activeTab, setActiveTab, listFilter, setListFilter, sortOrder, setSortOrder,

    // Form (from useSellerOrderForm)
    productCode: form.productCode, setProductCode: form.setProductCode,
    orderText: form.orderText, setOrderText: form.setOrderText,
    orderLength: form.orderLength, setOrderLength: form.setOrderLength,
    mfrId: form.mfrId, setMfrId: form.setMfrId,
    orderImage: form.orderImage, imageFileName: form.imageFileName,
    autofillSuccess: form.autofillSuccess, extraValues: form.extraValues,
    editingProduct: form.editingProduct,
    actionLoading: form.actionLoading || actions.actionLoading,
    isFieldModalOpen: form.isFieldModalOpen, setIsFieldModalOpen: form.setIsFieldModalOpen,
    newFieldName: form.newFieldName, setNewFieldName: form.setNewFieldName,
    newFieldType: form.newFieldType, setNewFieldType: form.setNewFieldType,
    newFieldOptions: form.newFieldOptions, setNewFieldOptions: form.setNewFieldOptions,
    handleImageChange: form.handleImageChange,
    handleClearForm: form.handleClearForm,
    handleEditClick,
    handleExtraValueChange: form.handleExtraValueChange,
    handleSubmit,
    handleAddFieldSubmit: form.handleAddFieldSubmit,
    handleRemoveField: form.handleRemoveField,
    handleDeleteClick: form.handleDeleteClick,

    // Actions (from useSellerOrderActions)
    isDefectModalOpen: actions.isDefectModalOpen, setIsDefectModalOpen: actions.setIsDefectModalOpen,
    defectType: actions.defectType, setDefectType: actions.setDefectType,
    defectNote: actions.defectNote, setDefectNote: actions.setDefectNote,
    defectImage: actions.defectImage, defectImageFileName: actions.defectImageFileName,
    handleCancelOrder: actions.handleCancelOrder,
    handleVerifyOrder: actions.handleVerifyOrder,
    handleShipOrder: actions.handleShipOrder,
    handleDefectClick: actions.handleDefectClick,
    handleDefectImageChange: actions.handleDefectImageChange,
    handleDefectReportSubmit: actions.handleDefectReportSubmit,

    // Badges (from useSellerOrderBadges)
    unseenIds: badges.unseenIds, badgeCounts: badges.badgeCounts,
    handleMarkSingleAsSeen: badges.handleMarkSingleAsSeen,

    // Derived
    filteredProducts,

    // Navigation
    openTimeline,

    // Dropdown
    activeDropdownId, setActiveDropdownId,

    // Broken details modal
    isBrokenModalOpen, selectedBrokenProduct, openBrokenDetails, closeBrokenDetails,
  };
}
