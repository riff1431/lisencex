'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Tag,
  Layers,
  Globe2,
  X,
  ExternalLink,
  Edit2,
  Trash2,
  Download,
  Calendar,
  Sparkles,
  Filter,
  ShoppingBag,
  DollarSign,
  ShieldCheck,
  Zap,
  Server,
  Code2,
  FileCode,
  Image as ImageIcon,
  Check,
  Sliders,
  RefreshCw,
  UploadCloud,
  FileArchive,
  Copy,
  Archive,
  Lock,
  Unlock,
  AlertTriangle,
  FileText,
  Eye,
  KeyRound,
  Wand2,
  Award,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api';
import { IntegrationPackageModal } from '@/components/integration-package-modal';
import { LicenseVerificationModal } from '@/components/license-verification-modal';
import { ProductImage } from '@/components/product-image';
import { ProductMediaUploader } from '@/components/product-media-uploader';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  // Available License Plans, Categories & Tags
  const [availablePlans, setAvailablePlans] = useState<any[]>([]);
  const [availableCategories, setAvailableCategories] = useState<any[]>([]);
  const [availableTags, setAvailableTags] = useState<any[]>([]);

  // Active form section tab inside Product Modal
  const [modalTab, setModalTab] = useState<'basic' | 'marketplace' | 'licensing' | 'technical'>('basic');

  // Create / Edit Product Modal State
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productForm, setProductForm] = useState({
    name: '',
    slug: '',
    sku: '',
    shortDescription: '',
    description: '',
    productType: 'wordpress_plugin',
    status: 'active',
    marketplaceSource: 'own_marketplace', // 'own_marketplace' | 'envato' | 'both'
    
    // Category & Tagging
    primaryCategoryId: '',
    categoryIds: [] as string[],
    tags: [] as string[],
    isFeatured: false,
    isPopular: false,
    isNewRelease: false,
    isBestSeller: false,
    badgeLabel: '',

    // Own Marketplace Pricing & Commercials
    price: 49,
    extendedPrice: 199,
    currency: 'USD',
    defaultLicenseType: 'regular',
    licenseDurationDays: 0, // 0 = Lifetime
    supportDurationDays: 180, // 6 Months

    // Media & Downloads
    thumbnailUrl: '',
    iconUrl: '',
    logoUrl: '',
    bannerUrl: '',
    screenshots: [] as string[],
    packageFileUrl: '',
    currentVersion: '1.0.0',

    // Envato Settings
    envatoItemId: '',
    envatoMarket: 'codecanyon',
    envatoProductUrl: '',

    // Licensing & Activation Rules
    licenseRequired: true,
    defaultActivationLimit: 1,
    domainBinding: true,
    installationBinding: true,
    allowDeactivation: true,
    deactivationCooldownHours: 0,
    periodicValidation: true,
    validationIntervalHours: 24,
    offlineGracePeriodDays: 7,
    downloadsEnabled: true,
    automaticUpdatesEnabled: true,

    allowLocalhost: true,
    countLocalhost: false,
    allowStaging: true,
    countStaging: false,

    // License Plan Assignment
    defaultLicensePlanId: '',
    envatoLicensePlanId: '',

    // System Requirements
    minPhpVersion: '7.4',
    minWordPressVersion: '6.0',
    minNodeVersion: '18.0.0',
  });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // Add Version / Package Upload Modal State
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [versionForm, setVersionForm] = useState({
    version: '',
    releaseName: '',
    releaseNotes: '',
    releaseChannel: 'stable',
    minPhpVersion: '7.4',
    minWordPressVersion: '6.0',
    minNodeVersion: '18.0.0',
    publishImmediately: true,
  });
  const [packageFile, setPackageFile] = useState<File | null>(null);
  const [publishingVersion, setPublishingVersion] = useState(false);
  const [versionModalError, setVersionModalError] = useState('');
  const [validationResult, setValidationResult] = useState<any | null>(null);

  // View Versions Drawer / Modal State
  const [showVersionHistoryModal, setShowVersionHistoryModal] = useState(false);
  const [productVersions, setProductVersions] = useState<any[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [downloadingVersionId, setDownloadingVersionId] = useState<string | null>(null);
  const [copiedChecksum, setCopiedChecksum] = useState<string | null>(null);

  // Replace Package File Modal
  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [replaceTargetVersion, setReplaceTargetVersion] = useState<any | null>(null);
  const [replaceFile, setReplaceFile] = useState<File | null>(null);
  const [replacingFile, setReplacingFile] = useState(false);
  const [replaceError, setReplaceError] = useState('');

  // API Credentials Modal State
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [credentialsProduct, setCredentialsProduct] = useState<any | null>(null);
  const [credentials, setCredentials] = useState<any[]>([]);
  const [loadingCredentials, setLoadingCredentials] = useState(false);
  const [showCreateCredForm, setShowCreateCredForm] = useState(false);
  const [newCredName, setNewCredName] = useState('');
  const [newCredScopes, setNewCredScopes] = useState<string[]>(['activate', 'validate', 'update', 'download']);
  const [savingCred, setSavingCred] = useState(false);
  const [credError, setCredError] = useState('');
  const [copiedCredId, setCopiedCredId] = useState<string | null>(null);

  // Integration Package Modal State
  const [selectedPackageProduct, setSelectedPackageProduct] = useState<any | null>(null);
  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);

  // License Verification Modal State
  const [selectedVerifyProduct, setSelectedVerifyProduct] = useState<any | null>(null);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);

  const fetchCredentials = async (productId: string) => {
    setLoadingCredentials(true);
    setCredError('');
    try {
      const res = await apiRequest(`/admin/products/${productId}/credentials`);
      setCredentials(res.data || res || []);
    } catch (err: any) {
      setCredError(err.message || 'Failed to fetch API credentials');
    } finally {
      setLoadingCredentials(false);
    }
  };

  const openCredentialsModal = (prod: any) => {
    setCredentialsProduct(prod);
    setCredentials([]);
    setShowCreateCredForm(false);
    setNewCredName('');
    setNewCredScopes(['activate', 'validate', 'update', 'download']);
    setCredError('');
    setShowCredentialsModal(true);
    fetchCredentials(prod._id);
  };

  const handleCreateCredential = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!credentialsProduct || !newCredName.trim()) return;
    setSavingCred(true);
    setCredError('');

    try {
      await apiRequest(`/admin/products/${credentialsProduct._id}/credentials`, {
        method: 'POST',
        body: JSON.stringify({
          name: newCredName,
          scopes: newCredScopes,
        }),
      });
      setNewCredName('');
      setShowCreateCredForm(false);
      fetchCredentials(credentialsProduct._id);
    } catch (err: any) {
      setCredError(err.message || 'Failed to create credential');
    } finally {
      setSavingCred(false);
    }
  };

  const handleRotateCredential = async (credId: string) => {
    if (!credentialsProduct) return;
    if (!confirm('Are you sure you want to rotate this credential? Existing installations will have 30 days to update to the new credentials before this key is invalidated.')) return;
    
    setLoadingCredentials(true);
    setCredError('');
    try {
      await apiRequest(`/admin/products/${credentialsProduct._id}/credentials/${credId}/rotate`, {
        method: 'POST',
      });
      fetchCredentials(credentialsProduct._id);
    } catch (err: any) {
      setCredError(err.message || 'Failed to rotate credential');
      setLoadingCredentials(false);
    }
  };

  const handleToggleCredential = async (credId: string) => {
    if (!credentialsProduct) return;
    setLoadingCredentials(true);
    setCredError('');
    try {
      await apiRequest(`/admin/products/${credentialsProduct._id}/credentials/${credId}/toggle`, {
        method: 'POST',
      });
      fetchCredentials(credentialsProduct._id);
    } catch (err: any) {
      setCredError(err.message || 'Failed to update credential status');
      setLoadingCredentials(false);
    }
  };

  const handleDeleteCredential = async (credId: string) => {
    if (!credentialsProduct) return;
    if (!confirm('Are you sure you want to permanently delete this credential? This cannot be undone and will break installations instantly.')) return;

    setLoadingCredentials(true);
    setCredError('');
    try {
      await apiRequest(`/admin/products/${credentialsProduct._id}/credentials/${credId}`, {
        method: 'DELETE',
      });
      fetchCredentials(credentialsProduct._id);
    } catch (err: any) {
      setCredError(err.message || 'Failed to delete credential');
      setLoadingCredentials(false);
    }
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCredId(id);
    setTimeout(() => setCopiedCredId(null), 2000);
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await apiRequest(`/admin/products?search=${encodeURIComponent(search)}`);
      setProducts(res.data?.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [search]);

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [plansRes, catsRes, tagsRes] = await Promise.all([
          apiRequest('/admin/license-plans/active'),
          apiRequest('/admin/categories'),
          apiRequest('/admin/tags'),
        ]);
        const plansList = Array.isArray(plansRes.data) ? plansRes.data : (plansRes.data?.data || []);
        const catsList = Array.isArray(catsRes.data) ? catsRes.data : (catsRes.data?.data || []);
        const tagsList = Array.isArray(tagsRes.data) ? tagsRes.data : (tagsRes.data?.data || []);
        setAvailablePlans(Array.isArray(plansList) ? plansList : []);
        setAvailableCategories(Array.isArray(catsList) ? catsList : []);
        setAvailableTags(Array.isArray(tagsList) ? tagsList : []);
      } catch (err) {
        console.error('Failed to fetch plans/categories/tags', err);
      }
    };
    fetchMetadata();
  }, []);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const openCreateModal = () => {
    setEditingProductId(null);
    setModalTab('basic');
    setProductForm({
      name: '',
      slug: '',
      sku: `SKU-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      shortDescription: '',
      description: '',
      productType: 'wordpress_plugin',
      status: 'active',
      marketplaceSource: 'own_marketplace',
      primaryCategoryId: '',
      categoryIds: [],
      tags: [],
      isFeatured: false,
      isPopular: false,
      isNewRelease: false,
      isBestSeller: false,
      badgeLabel: '',
      price: 49,
      extendedPrice: 199,
      currency: 'USD',
      defaultLicenseType: 'regular',
      licenseDurationDays: 0,
      supportDurationDays: 180,
      thumbnailUrl: '',
      iconUrl: '',
      logoUrl: '',
      bannerUrl: '',
      screenshots: [],
      packageFileUrl: '',
      currentVersion: '1.0.0',
      envatoItemId: '',
      envatoMarket: 'codecanyon',
      envatoProductUrl: '',
      licenseRequired: true,
      defaultActivationLimit: 1,
      domainBinding: true,
      installationBinding: true,
      allowDeactivation: true,
      deactivationCooldownHours: 0,
      periodicValidation: true,
      validationIntervalHours: 24,
      offlineGracePeriodDays: 7,
      downloadsEnabled: true,
      automaticUpdatesEnabled: true,
      allowLocalhost: true,
      countLocalhost: false,
      allowStaging: true,
      countStaging: false,
      defaultLicensePlanId: '',
      envatoLicensePlanId: '',
      minPhpVersion: '7.4',
      minWordPressVersion: '6.0',
      minNodeVersion: '18.0.0',
    });
    setFormError('');
    setShowProductModal(true);
  };

  const openEditModal = (prod: any) => {
    setEditingProductId(prod._id);
    setModalTab('basic');
    const envatoChannel = prod.distributionChannels?.find((c: any) => c.provider === 'envato');
    
    // Determine source
    let source = prod.marketplaceSource || 'own_marketplace';
    if (!prod.marketplaceSource) {
      const hasEnvato = Boolean(envatoChannel?.enabled);
      const hasInternal = prod.distributionChannels?.some((c: any) => c.provider === 'internal' && c.enabled);
      if (hasEnvato && hasInternal) source = 'both';
      else if (hasEnvato) source = 'envato';
      else source = 'own_marketplace';
    }

    setProductForm({
      name: prod.name || '',
      slug: prod.slug || '',
      sku: prod.sku || '',
      shortDescription: prod.shortDescription || '',
      description: prod.description || '',
      productType: prod.productType || 'wordpress_plugin',
      status: prod.status || 'active',
      marketplaceSource: source,
      primaryCategoryId: prod.primaryCategoryId?._id || prod.primaryCategoryId || '',
      categoryIds: (prod.categoryIds || []).map((c: any) => c._id || c),
      tags: prod.tags || [],
      isFeatured: !!prod.isFeatured,
      isPopular: !!prod.isPopular,
      isNewRelease: !!prod.isNewRelease,
      isBestSeller: !!prod.isBestSeller,
      badgeLabel: prod.badgeLabel || '',
      price: prod.price ?? 49,
      extendedPrice: prod.extendedPrice ?? 199,
      currency: prod.currency || 'USD',
      defaultLicenseType: prod.licenseSettings?.defaultLicenseType || 'regular',
      licenseDurationDays: prod.licenseSettings?.licenseDurationDays ?? 0,
      supportDurationDays: prod.licenseSettings?.supportDurationDays ?? 180,
      thumbnailUrl: prod.thumbnailUrl || '',
      iconUrl: prod.iconUrl || '',
      logoUrl: prod.logoUrl || '',
      bannerUrl: prod.bannerUrl || '',
      screenshots: prod.screenshots || [],
      packageFileUrl: prod.packageFileUrl || '',
      currentVersion: prod.currentVersion || '1.0.0',
      envatoItemId: envatoChannel?.externalItemId || '',
      envatoMarket: envatoChannel?.market || 'codecanyon',
      envatoProductUrl: envatoChannel?.productUrl || '',
      licenseRequired: prod.licenseSettings?.licenseRequired ?? true,
      defaultActivationLimit: prod.licenseSettings?.defaultActivationLimit ?? 1,
      domainBinding: prod.licenseSettings?.domainBinding ?? true,
      installationBinding: prod.licenseSettings?.installationBinding ?? true,
      allowDeactivation: prod.licenseSettings?.allowDeactivation ?? true,
      deactivationCooldownHours: prod.licenseSettings?.deactivationCooldownHours ?? 0,
      periodicValidation: prod.licenseSettings?.periodicValidation ?? true,
      validationIntervalHours: prod.licenseSettings?.validationIntervalHours ?? 24,
      offlineGracePeriodDays: prod.licenseSettings?.offlineGracePeriodDays ?? 7,
      downloadsEnabled: prod.licenseSettings?.downloadsEnabled ?? true,
      automaticUpdatesEnabled: prod.licenseSettings?.automaticUpdatesEnabled ?? true,
      allowLocalhost: prod.licenseSettings?.allowLocalhost ?? true,
      countLocalhost: prod.licenseSettings?.countLocalhost ?? false,
      allowStaging: prod.licenseSettings?.allowStaging ?? true,
      countStaging: prod.licenseSettings?.countStaging ?? false,
      defaultLicensePlanId: prod.defaultLicensePlanId || '',
      envatoLicensePlanId: prod.envatoLicensePlanId || '',
      minPhpVersion: '7.4',
      minWordPressVersion: '6.0',
      minNodeVersion: '18.0.0',
    });
    setFormError('');
    setShowProductModal(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);

    try {
      const channels = [];

      if (productForm.marketplaceSource === 'own_marketplace' || productForm.marketplaceSource === 'both') {
        channels.push({
          provider: 'internal',
          enabled: true,
          price: Number(productForm.price),
          extendedPrice: Number(productForm.extendedPrice),
        });
      }

      if (productForm.marketplaceSource === 'envato' || productForm.marketplaceSource === 'both') {
        channels.push({
          provider: 'envato',
          enabled: true,
          externalItemId: productForm.envatoItemId,
          market: productForm.envatoMarket,
          productUrl: productForm.envatoProductUrl,
        });
      }

      const payload = {
        name: productForm.name,
        slug: productForm.slug,
        sku: productForm.sku,
        shortDescription: productForm.shortDescription,
        description: productForm.description,
        productType: productForm.productType,
        status: productForm.status,
        marketplaceSource: productForm.marketplaceSource,
        primaryCategoryId: productForm.primaryCategoryId || null,
        categoryIds: productForm.categoryIds || [],
        tags: productForm.tags || [],
        isFeatured: productForm.isFeatured,
        isPopular: productForm.isPopular,
        isNewRelease: productForm.isNewRelease,
        isBestSeller: productForm.isBestSeller,
        badgeLabel: productForm.badgeLabel,
        price: Number(productForm.price),
        extendedPrice: Number(productForm.extendedPrice),
        currency: productForm.currency,
        thumbnailUrl: productForm.thumbnailUrl,
        iconUrl: productForm.iconUrl,
        logoUrl: productForm.logoUrl,
        bannerUrl: productForm.bannerUrl,
        screenshots: productForm.screenshots,
        packageFileUrl: productForm.packageFileUrl,
        currentVersion: productForm.currentVersion,
        licenseSettings: {
          licenseRequired: productForm.licenseRequired,
          defaultLicenseType: productForm.defaultLicenseType,
          licenseDurationDays: Number(productForm.licenseDurationDays),
          supportDurationDays: Number(productForm.supportDurationDays),
          defaultActivationLimit: Number(productForm.defaultActivationLimit),
          domainBinding: productForm.domainBinding,
          installationBinding: productForm.installationBinding,
          allowDeactivation: productForm.allowDeactivation,
          deactivationCooldownHours: Number(productForm.deactivationCooldownHours),
          periodicValidation: productForm.periodicValidation,
          validationIntervalHours: Number(productForm.validationIntervalHours),
          offlineGracePeriodDays: Number(productForm.offlineGracePeriodDays),
          downloadsEnabled: productForm.downloadsEnabled,
          automaticUpdatesEnabled: productForm.automaticUpdatesEnabled,
          allowLocalhost: productForm.allowLocalhost,
          countLocalhost: productForm.countLocalhost,
          allowStaging: productForm.allowStaging,
          countStaging: productForm.countStaging,
        },
        distributionChannels: channels,
        defaultLicensePlanId: productForm.defaultLicensePlanId || null,
        envatoLicensePlanId: productForm.envatoLicensePlanId || null,
      };

      if (editingProductId) {
        await apiRequest(`/admin/products/${editingProductId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest('/admin/products', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      setShowProductModal(false);
      fetchProducts();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async (prod: any) => {
    if (!confirm(`Are you sure you want to archive "${prod.name}"? Active licenses and client installations will remain active.`)) return;

    try {
      await apiRequest(`/admin/products/${prod._id}`, {
        method: 'DELETE',
      });
      fetchProducts();
    } catch (err: any) {
      alert(err.message || 'Failed to archive product');
    }
  };

  const handleAddVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setPublishingVersion(true);
    setVersionModalError('');
    setValidationResult(null);

    try {
      if (packageFile) {
        // Upload with real ZIP file
        const formData = new FormData();
        formData.append('file', packageFile);
        formData.append('version', versionForm.version);
        if (versionForm.releaseName) formData.append('releaseName', versionForm.releaseName);
        if (versionForm.releaseNotes) formData.append('releaseNotes', versionForm.releaseNotes);
        formData.append('releaseChannel', versionForm.releaseChannel);
        if (versionForm.minPhpVersion) formData.append('minPhpVersion', versionForm.minPhpVersion);
        if (versionForm.minWordPressVersion) formData.append('minWordPressVersion', versionForm.minWordPressVersion);
        if (versionForm.minNodeVersion) formData.append('minNodeVersion', versionForm.minNodeVersion);
        formData.append('publishImmediately', String(versionForm.publishImmediately));

        const res = await apiRequest(`/admin/products/${selectedProduct._id}/packages`, {
          method: 'POST',
          body: formData,
        });
        setValidationResult(res.data || res);
        setShowVersionModal(false);
        setPackageFile(null);
        fetchProducts();
      } else {
        // Fallback: create metadata-only version
        await apiRequest(`/admin/products/${selectedProduct._id}/versions`, {
          method: 'POST',
          body: JSON.stringify(versionForm),
        });
        setShowVersionModal(false);
        fetchProducts();
      }
    } catch (err: any) {
      setVersionModalError(err.message || 'Failed to upload/publish package');
    } finally {
      setPublishingVersion(false);
    }
  };

  const openVersionHistory = async (prod: any) => {
    setSelectedProduct(prod);
    setShowVersionHistoryModal(true);
    setLoadingVersions(true);
    try {
      const res = await apiRequest(`/admin/products/${prod._id}/packages`);
      setProductVersions(res.data?.versions || res.data || []);
    } catch {
      // Fallback
      try {
        const fallbackRes = await apiRequest(`/admin/products/${prod._id}/versions`);
        setProductVersions(fallbackRes.data || []);
      } catch {
        setProductVersions([]);
      }
    } finally {
      setLoadingVersions(false);
    }
  };

  const handlePackageAction = async (versionId: string, action: string, reason?: string) => {
    if (!selectedProduct) return;
    setActionLoadingId(versionId);
    try {
      await apiRequest(`/admin/products/${selectedProduct._id}/packages/${versionId}/action`, {
        method: 'PATCH',
        body: JSON.stringify({ action, reason }),
      });
      // Refresh versions
      const res = await apiRequest(`/admin/products/${selectedProduct._id}/packages`);
      setProductVersions(res.data?.versions || res.data || []);
      fetchProducts();
    } catch (err: any) {
      alert(err.message || `Failed to ${action} package`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDownloadPackage = async (versionId: string) => {
    setDownloadingVersionId(versionId);
    try {
      const res = await apiRequest(`/admin/packages/${versionId}/download-token`, {
        method: 'POST',
      });
      if (res.data?.downloadUrl) {
        window.open(res.data.downloadUrl, '_blank');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to generate download link');
    } finally {
      setDownloadingVersionId(null);
    }
  };

  const handleReplaceFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !replaceTargetVersion || !replaceFile) return;
    setReplacingFile(true);
    setReplaceError('');

    try {
      const formData = new FormData();
      formData.append('file', replaceFile);

      await apiRequest(`/admin/products/${selectedProduct._id}/packages/${replaceTargetVersion._id}/replace`, {
        method: 'POST',
        body: formData,
      });

      setShowReplaceModal(false);
      setReplaceFile(null);
      setReplaceTargetVersion(null);

      // Refresh version history
      const res = await apiRequest(`/admin/products/${selectedProduct._id}/packages`);
      setProductVersions(res.data?.versions || res.data || []);
    } catch (err: any) {
      setReplaceError(err.message || 'Failed to replace package file');
    } finally {
      setReplacingFile(false);
    }
  };

  const copyChecksum = (checksum: string) => {
    navigator.clipboard.writeText(checksum);
    setCopiedChecksum(checksum);
    setTimeout(() => setCopiedChecksum(null), 2000);
  };

  const filteredProducts = products.filter((p) => {
    if (typeFilter !== 'all' && p.productType !== typeFilter) return false;
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (sourceFilter !== 'all') {
      const src = p.marketplaceSource || (p.distributionChannels?.some((c: any) => c.provider === 'envato') ? 'envato' : 'own_marketplace');
      if (sourceFilter === 'own_marketplace' && src !== 'own_marketplace' && src !== 'both') return false;
      if (sourceFilter === 'envato' && src !== 'envato' && src !== 'both') return false;
      if (sourceFilter === 'both' && src !== 'both') return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Products & Marketplace Catalog</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your Own Marketplace digital items, Envato CodeCanyon items, pricing, package files, and licensing
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={fetchProducts} disabled={loading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Link href="/admin/products/wizard">
            <Button size="sm" className="gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-xs">
              <Wand2 className="h-4 w-4" />
              Integration Wizard
            </Button>
          </Link>
          <Button onClick={openCreateModal} className="gap-2 shadow-xs">
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by product name, slug, or SKU..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-border bg-card text-xs font-semibold"
          >
            <option value="all">All Sources</option>
            <option value="own_marketplace">🛒 Own Marketplace Only</option>
            <option value="envato">🌐 Envato Only</option>
            <option value="both">⚡ Both Own + Envato</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-border bg-card text-xs font-semibold"
          >
            <option value="all">All Types</option>
            <option value="wordpress_plugin">WordPress Plugin</option>
            <option value="wordpress_theme">WordPress Theme</option>
            <option value="php_script">PHP Script</option>
            <option value="nextjs_app">Next.js App</option>
            <option value="saas">SaaS Application</option>
            <option value="api">API Service</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-border bg-card text-xs font-semibold"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="paused">Paused</option>
            <option value="deprecated">Deprecated</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="rounded-3xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-secondary/40 text-xs font-semibold uppercase text-muted-foreground">
              <tr>
                <th className="px-6 py-4">Product / SKU</th>
                <th className="px-6 py-4">Marketplace Source</th>
                <th className="px-6 py-4">Pricing</th>
                <th className="px-6 py-4">Type / Version</th>
                <th className="px-6 py-4">Active Slots</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground text-xs">
                    Loading product catalog...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground text-xs">
                    No products found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((prod) => {
                  const envatoChannel = prod.distributionChannels?.find((c: any) => c.provider === 'envato');
                  const source = prod.marketplaceSource || (envatoChannel?.enabled ? 'envato' : 'own_marketplace');

                  return (
                    <tr key={prod._id} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <ProductImage
                            src={prod.iconUrl || prod.logoUrl || prod.thumbnailUrl}
                            alt={prod.name}
                            productType={prod.productType}
                            variant="icon"
                            className="h-9 w-9 rounded-xl shrink-0"
                          />
                          <div>
                            <div className="font-bold text-foreground flex items-center gap-2 flex-wrap">
                              <span>{prod.name}</span>
                              {prod.sku && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-secondary text-muted-foreground">
                                  {prod.sku}
                                </span>
                              )}
                              {prod.isFeatured && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-500 uppercase">
                                  ⭐ Featured
                                </span>
                              )}
                              {prod.isBestSeller && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-500/20 text-purple-500 uppercase">
                                  👑 Best Seller
                                </span>
                              )}
                              {prod.badgeLabel && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-500/20 text-indigo-500 uppercase">
                                  {prod.badgeLabel}
                                </span>
                              )}
                            </div>
                            <div className="text-xs font-mono text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                              <span>{prod.slug}</span>
                              {prod.primaryCategoryId && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] bg-secondary text-foreground font-semibold">
                                  📁 {(Array.isArray(availableCategories) ? availableCategories : []).find((c) => c._id === (prod.primaryCategoryId?._id || prod.primaryCategoryId))?.name || 'Category'}
                                </span>
                              )}
                            </div>
                            {(prod.defaultLicensePlanId || prod.envatoLicensePlanId) && (
                              <div className="flex gap-1.5 mt-1 items-center flex-wrap">
                                {prod.defaultLicensePlanId && (
                                  <span className="px-1.5 py-0.5 rounded-sm bg-indigo-500/10 text-indigo-500 text-[10px] font-bold">
                                    Own Plan: {(Array.isArray(availablePlans) ? availablePlans : []).find((p: any) => p._id === prod.defaultLicensePlanId)?.name || 'Assigned'}
                                  </span>
                                )}
                                {prod.envatoLicensePlanId && (
                                  <span className="px-1.5 py-0.5 rounded-sm bg-emerald-500/10 text-emerald-500 text-[10px] font-bold">
                                    Envato Plan: {(Array.isArray(availablePlans) ? availablePlans : []).find((p: any) => p._id === prod.envatoLicensePlanId)?.name || 'Assigned'}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        {source === 'both' ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[11px] font-bold">
                              🛒 Own Store
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold">
                              🌐 Envato
                            </span>
                          </div>
                        ) : source === 'envato' ? (
                          <div className="space-y-0.5">
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold">
                              🌐 Envato Market
                            </span>
                            {envatoChannel?.externalItemId && (
                              <p className="text-[10px] font-mono text-muted-foreground">ID: {envatoChannel.externalItemId}</p>
                            )}
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[11px] font-bold">
                            🛒 Own Marketplace
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 font-mono text-xs">
                        {source === 'envato' ? (
                          <span className="text-muted-foreground">Envato Pricing</span>
                        ) : (
                          <div>
                            <span className="font-bold text-foreground">${prod.price || 49}</span>
                            <span className="text-[10px] text-muted-foreground ml-1">{prod.currency || 'USD'}</span>
                            {prod.extendedPrice && (
                              <div className="text-[10px] text-muted-foreground">Ext: ${prod.extendedPrice}</div>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <div className="capitalize text-xs font-semibold text-foreground">
                          {prod.productType?.replace(/_/g, ' ')}
                        </div>
                        <button
                          onClick={() => openVersionHistory(prod)}
                          className="inline-flex items-center gap-1 font-mono text-[11px] text-indigo-500 hover:underline mt-0.5 font-bold"
                          title="View version history"
                        >
                          <span>v{prod.currentVersion}</span>
                          <Layers className="h-2.5 w-2.5" />
                        </button>
                      </td>

                      <td className="px-6 py-4 font-mono text-xs">
                        <span className="font-bold text-emerald-500">{prod.activeActivations || 0}</span>
                        <span className="text-muted-foreground"> / {prod.totalLicenses || 0} lic</span>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                            prod.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : prod.status === 'draft'
                              ? 'bg-amber-500/10 text-amber-500'
                              : 'bg-secondary text-muted-foreground'
                          }`}
                        >
                          {prod.status || 'Active'}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right space-x-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedProduct(prod);
                            setVersionForm({
                              version: '',
                              releaseName: '',
                              releaseNotes: '',
                              releaseChannel: 'stable',
                              minPhpVersion: '7.4',
                              minWordPressVersion: '6.0',
                              minNodeVersion: '18.0.0',
                              publishImmediately: true,
                            });
                            setPackageFile(null);
                            setVersionModalError('');
                            setShowVersionModal(true);
                          }}
                          className="text-xs h-8 gap-1"
                        >
                          <Plus className="h-3 w-3" />
                          Release
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openCredentialsModal(prod)}
                          className="text-xs h-8 gap-1 border-border/80"
                          title="Manage API client credentials"
                        >
                          <KeyRound className="h-3.5 w-3.5 text-amber-500" />
                          Keys
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedPackageProduct(prod);
                            setIsPackageModalOpen(true);
                          }}
                          className="text-xs h-8 gap-1 border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10"
                          title="Generate Integration Package (.ZIP)"
                        >
                          <Download className="h-3.5 w-3.5" />
                          SDK
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedVerifyProduct(prod);
                            setIsVerifyModalOpen(true);
                          }}
                          className="text-xs h-8 gap-1 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                          title="Run License Verification & Certification (13 Tests)"
                        >
                          <Award className="h-3.5 w-3.5" />
                          Verify
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditModal(prod)}
                          className="text-xs h-8 px-2"
                          title="Edit product"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteProduct(prod)}
                          className="text-xs h-8 px-2 text-destructive hover:bg-destructive/10"
                          title="Archive product"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT PRODUCT MODAL */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-border bg-card shadow-2xl p-6 sm:p-8 space-y-5 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 className="text-lg font-bold">
                  {editingProductId ? 'Edit Product & Distribution Channels' : 'Add New Licensed Product'}
                </h2>
                <p className="text-xs text-muted-foreground">
                  Configure catalog details, Own Marketplace sales, Envato binding, and licensing engine
                </p>
              </div>
              <button onClick={() => setShowProductModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
                {formError}
              </div>
            )}

            {/* Modal Tabs Navigation */}
            <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-secondary/60 border border-border text-xs font-semibold">
              <button
                type="button"
                onClick={() => setModalTab('basic')}
                className={`flex-1 py-1.5 rounded-xl transition-all ${
                  modalTab === 'basic' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                1. General Identity
              </button>
              <button
                type="button"
                onClick={() => setModalTab('marketplace')}
                className={`flex-1 py-1.5 rounded-xl transition-all ${
                  modalTab === 'marketplace' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                2. Marketplace & Pricing
              </button>
              <button
                type="button"
                onClick={() => setModalTab('licensing')}
                className={`flex-1 py-1.5 rounded-xl transition-all ${
                  modalTab === 'licensing' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                3. Licensing & Activations
              </button>
              <button
                type="button"
                onClick={() => setModalTab('technical')}
                className={`flex-1 py-1.5 rounded-xl transition-all ${
                  modalTab === 'technical' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                4. Technical & Rules
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              {/* TAB 1: BASIC IDENTITY */}
              {modalTab === 'basic' && (
                <div className="space-y-4">
                  <div>
                    <label className="font-semibold text-foreground block mb-1">Product Name *</label>
                    <input
                      type="text"
                      required
                      value={productForm.name}
                      onChange={(e) => {
                        const name = e.target.value;
                        setProductForm({
                          ...productForm,
                          name,
                          slug: editingProductId ? productForm.slug : generateSlug(name),
                        });
                      }}
                      placeholder="e.g. Booking Engine Pro"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-foreground block mb-1">Slug (Unique Identifier) *</label>
                      <input
                        type="text"
                        required
                        value={productForm.slug}
                        onChange={(e) => setProductForm({ ...productForm, slug: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-border bg-background font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-foreground block mb-1">Internal Product ID / SKU</label>
                      <input
                        type="text"
                        value={productForm.sku}
                        onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                        placeholder="e.g. SKU-BEP-001"
                        className="w-full px-3 py-2 rounded-xl border border-border bg-background font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="font-semibold text-foreground block mb-1">Product Type</label>
                      <select
                        value={productForm.productType}
                        onChange={(e) => setProductForm({ ...productForm, productType: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs font-semibold"
                      >
                        <option value="wordpress_plugin">WordPress Plugin</option>
                        <option value="wordpress_theme">WordPress Theme</option>
                        <option value="php_script">PHP Script</option>
                        <option value="nextjs_app">Next.js Application</option>
                        <option value="nextjs_theme">Next.js Theme</option>
                        <option value="saas">SaaS Application</option>
                        <option value="api">API Service</option>
                        <option value="other">Other Software</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-semibold text-foreground block mb-1">Product Status</label>
                      <select
                        value={productForm.status}
                        onChange={(e) => setProductForm({ ...productForm, status: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs font-semibold"
                      >
                        <option value="active">Active (Selling & Validating)</option>
                        <option value="draft">Draft (Unpublished)</option>
                        <option value="paused">Paused</option>
                        <option value="deprecated">Deprecated</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-semibold text-foreground block mb-1">Current Version</label>
                      <input
                        type="text"
                        value={productForm.currentVersion}
                        onChange={(e) => setProductForm({ ...productForm, currentVersion: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-border bg-background font-mono text-xs"
                      />
                    </div>
                  </div>

                  {/* Category & Tags Selector */}
                  <div className="p-4 rounded-2xl border border-border bg-secondary/20 space-y-3.5">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                      Category & Tagging Classification
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="font-semibold text-foreground block mb-1">Primary Category</label>
                        <select
                          value={productForm.primaryCategoryId}
                          onChange={(e) => setProductForm({ ...productForm, primaryCategoryId: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs font-semibold"
                        >
                          <option value="">-- Select Primary Category --</option>
                          {(availableCategories || []).map((cat) => (
                            <option key={cat._id} value={cat._id}>
                              {cat.parentId ? `↳ ${cat.name}` : cat.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="font-semibold text-foreground block mb-1">Custom Promo Badge Label</label>
                        <input
                          type="text"
                          value={productForm.badgeLabel}
                          onChange={(e) => setProductForm({ ...productForm, badgeLabel: e.target.value })}
                          placeholder="e.g. HOT, 50% OFF, NEW 2026"
                          className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs"
                        />
                      </div>
                    </div>

                    {/* Promotional Flags */}
                    <div>
                      <label className="font-semibold text-foreground block mb-1.5">Marketplace Highlight Badges</label>
                      <div className="flex flex-wrap items-center gap-4">
                        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                          <input
                            type="checkbox"
                            checked={productForm.isFeatured}
                            onChange={(e) => setProductForm({ ...productForm, isFeatured: e.target.checked })}
                            className="rounded text-indigo-600"
                          />
                          <span className="font-bold text-amber-500">⭐ Featured</span>
                        </label>
                        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                          <input
                            type="checkbox"
                            checked={productForm.isPopular}
                            onChange={(e) => setProductForm({ ...productForm, isPopular: e.target.checked })}
                            className="rounded text-indigo-600"
                          />
                          <span className="font-bold text-rose-500">🔥 Popular</span>
                        </label>
                        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                          <input
                            type="checkbox"
                            checked={productForm.isNewRelease}
                            onChange={(e) => setProductForm({ ...productForm, isNewRelease: e.target.checked })}
                            className="rounded text-indigo-600"
                          />
                          <span className="font-bold text-emerald-500">🚀 New Release</span>
                        </label>
                        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                          <input
                            type="checkbox"
                            checked={productForm.isBestSeller}
                            onChange={(e) => setProductForm({ ...productForm, isBestSeller: e.target.checked })}
                            className="rounded text-indigo-600"
                          />
                          <span className="font-bold text-purple-500">👑 Best Seller</span>
                        </label>
                      </div>
                    </div>

                    {/* Tags Multi-selector */}
                    <div>
                      <label className="font-semibold text-foreground block mb-1.5">Product Tags</label>
                      <div className="flex flex-wrap gap-1.5">
                        {(availableTags || []).map((tag) => {
                          const isSelected = productForm.tags?.includes(tag.slug);
                          return (
                            <button
                              type="button"
                              key={tag._id}
                              onClick={() => {
                                const current = productForm.tags || [];
                                const updated = isSelected
                                  ? current.filter((t) => t !== tag.slug)
                                  : [...current, tag.slug];
                                setProductForm({ ...productForm, tags: updated });
                              }}
                              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 border ${
                                isSelected
                                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                  : 'bg-secondary/40 text-muted-foreground border-border hover:text-foreground'
                              }`}
                            >
                              <span>#{tag.name}</span>
                              {isSelected && <Check className="h-3 w-3" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="font-semibold text-foreground block mb-1">Full Description</label>
                    <textarea
                      rows={3}
                      value={productForm.description}
                      onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                      placeholder="Detailed features, system requirements, and documentation links..."
                      className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs"
                    />
                  </div>

                  {/* Dedicated Media & Artwork Uploader */}
                  <ProductMediaUploader
                    initialMedia={{
                      thumbnailUrl: productForm.thumbnailUrl,
                      iconUrl: productForm.iconUrl,
                      logoUrl: productForm.logoUrl,
                      bannerUrl: productForm.bannerUrl,
                      screenshots: productForm.screenshots,
                    }}
                    onChange={(mediaState) => {
                      setProductForm((prev) => ({
                        ...prev,
                        ...mediaState,
                      }));
                    }}
                  />
                </div>
              )}

              {/* TAB 2: MARKETPLACE & PRICING */}
              {modalTab === 'marketplace' && (
                <div className="space-y-5">
                  {/* Distribution Source Selection */}
                  <div>
                    <label className="font-bold text-foreground block mb-2">Marketplace Availability *</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div
                        onClick={() => setProductForm({ ...productForm, marketplaceSource: 'own_marketplace' })}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                          productForm.marketplaceSource === 'own_marketplace'
                            ? 'border-indigo-500 bg-indigo-500/10 ring-2 ring-indigo-500/20'
                            : 'border-border bg-secondary/30 hover:bg-secondary/60'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <ShoppingBag className="h-4 w-4 text-indigo-500" />
                          {productForm.marketplaceSource === 'own_marketplace' && (
                            <Check className="h-3.5 w-3.5 text-indigo-500" />
                          )}
                        </div>
                        <p className="font-bold text-xs mt-2">Own Marketplace Only</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Sold directly on our store</p>
                      </div>

                      <div
                        onClick={() => setProductForm({ ...productForm, marketplaceSource: 'envato' })}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                          productForm.marketplaceSource === 'envato'
                            ? 'border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/20'
                            : 'border-border bg-secondary/30 hover:bg-secondary/60'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <Globe2 className="h-4 w-4 text-emerald-500" />
                          {productForm.marketplaceSource === 'envato' && (
                            <Check className="h-3.5 w-3.5 text-emerald-500" />
                          )}
                        </div>
                        <p className="font-bold text-xs mt-2">Envato Only</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">CodeCanyon / ThemeForest</p>
                      </div>

                      <div
                        onClick={() => setProductForm({ ...productForm, marketplaceSource: 'both' })}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                          productForm.marketplaceSource === 'both'
                            ? 'border-purple-500 bg-purple-500/10 ring-2 ring-purple-500/20'
                            : 'border-border bg-secondary/30 hover:bg-secondary/60'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <Zap className="h-4 w-4 text-purple-500" />
                          {productForm.marketplaceSource === 'both' && (
                            <Check className="h-3.5 w-3.5 text-purple-500" />
                          )}
                        </div>
                        <p className="font-bold text-xs mt-2">Both Marketplaces</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Own Store + Envato claim</p>
                      </div>
                    </div>
                  </div>

                  {/* Own Marketplace Pricing Section */}
                  {(productForm.marketplaceSource === 'own_marketplace' || productForm.marketplaceSource === 'both') && (
                    <div className="p-4 rounded-2xl border border-border bg-secondary/30 space-y-3">
                      <div className="flex items-center gap-2 font-bold text-foreground text-xs">
                        <ShoppingBag className="h-4 w-4 text-indigo-500" />
                        <span>Own Marketplace Commercial Settings</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="font-semibold text-foreground block mb-1">Regular Price ($)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={productForm.price}
                            onChange={(e) => setProductForm({ ...productForm, price: Number(e.target.value) })}
                            className="w-full px-3 py-2 rounded-xl border border-border bg-background font-mono text-xs font-bold"
                          />
                        </div>

                        <div>
                          <label className="font-semibold text-foreground block mb-1">Extended Price ($)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={productForm.extendedPrice}
                            onChange={(e) => setProductForm({ ...productForm, extendedPrice: Number(e.target.value) })}
                            className="w-full px-3 py-2 rounded-xl border border-border bg-background font-mono text-xs font-bold"
                          />
                        </div>

                        <div>
                          <label className="font-semibold text-foreground block mb-1">Currency</label>
                          <select
                            value={productForm.currency}
                            onChange={(e) => setProductForm({ ...productForm, currency: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs font-semibold"
                          >
                            <option value="USD">USD ($)</option>
                            <option value="EUR">EUR (€)</option>
                            <option value="GBP">GBP (£)</option>
                            <option value="AUD">AUD ($)</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="font-semibold text-foreground block mb-1">Default License Tier</label>
                          <select
                            value={productForm.defaultLicenseType}
                            onChange={(e) => setProductForm({ ...productForm, defaultLicenseType: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs font-semibold"
                          >
                            <option value="regular">Regular License</option>
                            <option value="extended">Extended License</option>
                            <option value="lifetime">Lifetime License</option>
                            <option value="subscription">Subscription</option>
                            <option value="developer">Developer</option>
                            <option value="agency">Agency</option>
                          </select>
                        </div>

                        <div>
                          <label className="font-semibold text-foreground block mb-1">License Duration (Days)</label>
                          <input
                            type="number"
                            min="0"
                            value={productForm.licenseDurationDays}
                            onChange={(e) => setProductForm({ ...productForm, licenseDurationDays: Number(e.target.value) })}
                            placeholder="0 for Lifetime"
                            className="w-full px-3 py-2 rounded-xl border border-border bg-background font-mono text-xs"
                          />
                          <span className="text-[10px] text-muted-foreground mt-0.5 block">0 = Lifetime</span>
                        </div>

                        <div>
                          <label className="font-semibold text-foreground block mb-1">Included Support (Days)</label>
                          <input
                            type="number"
                            min="0"
                            value={productForm.supportDurationDays}
                            onChange={(e) => setProductForm({ ...productForm, supportDurationDays: Number(e.target.value) })}
                            placeholder="180 (6 Months)"
                            className="w-full px-3 py-2 rounded-xl border border-border bg-background font-mono text-xs"
                          />
                          <span className="text-[10px] text-muted-foreground mt-0.5 block">180 = 6 Months</span>
                        </div>
                      </div>

                      <div>
                        <label className="font-semibold text-foreground block mb-1">Initial Package File / ZIP URL</label>
                        <input
                          type="url"
                          value={productForm.packageFileUrl}
                          onChange={(e) => setProductForm({ ...productForm, packageFileUrl: e.target.value })}
                          placeholder="https://storage.company.com/packages/plugin-v1.0.0.zip"
                          className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs"
                        />
                      </div>
                    </div>
                  )}

                  {/* Envato Market Settings Section */}
                  {(productForm.marketplaceSource === 'envato' || productForm.marketplaceSource === 'both') && (
                    <div className="p-4 rounded-2xl border border-border bg-secondary/30 space-y-3">
                      <div className="flex items-center gap-2 font-bold text-foreground text-xs">
                        <Globe2 className="h-4 w-4 text-emerald-500" />
                        <span>Envato Market Configuration</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="font-semibold text-foreground block mb-1">Envato Item ID *</label>
                          <input
                            type="text"
                            required={productForm.marketplaceSource === 'envato' || productForm.marketplaceSource === 'both'}
                            value={productForm.envatoItemId}
                            onChange={(e) => setProductForm({ ...productForm, envatoItemId: e.target.value })}
                            placeholder="e.g. 28491048"
                            className="w-full px-3 py-2 rounded-xl border border-border bg-background font-mono text-xs"
                          />
                        </div>

                        <div>
                          <label className="font-semibold text-foreground block mb-1">Envato Platform</label>
                          <select
                            value={productForm.envatoMarket}
                            onChange={(e) => setProductForm({ ...productForm, envatoMarket: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs font-semibold"
                          >
                            <option value="codecanyon">CodeCanyon (Plugins & Scripts)</option>
                            <option value="themeforest">ThemeForest (Themes & Templates)</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="font-semibold text-foreground block mb-1">Item Purchase / Landing Page URL</label>
                        <input
                          type="url"
                          value={productForm.envatoProductUrl}
                          onChange={(e) => setProductForm({ ...productForm, envatoProductUrl: e.target.value })}
                          placeholder="https://codecanyon.net/item/booking-engine-pro/28491048"
                          className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: LICENSING & ACTIVATIONS */}
              {modalTab === 'licensing' && (
                <div className="space-y-4">
                  {/* License Plan Assignment */}
                  <div className="p-4 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 space-y-3">
                    <h4 className="text-xs font-bold text-indigo-500 uppercase flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5" />
                      License Plan Assignment
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(productForm.marketplaceSource === 'own_marketplace' || productForm.marketplaceSource === 'both') && (
                        <div>
                          <label className="font-semibold text-foreground block mb-1">Own Marketplace Plan</label>
                          <select
                            value={productForm.defaultLicensePlanId}
                            onChange={(e) => setProductForm({ ...productForm, defaultLicensePlanId: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs"
                          >
                            <option value="">None (use product defaults)</option>
                            {(availablePlans || []).map((p: any) => (
                              <option key={p._id} value={p._id}>
                                {p.name} — {p.activationLimit === 0 ? 'Unlimited' : `${p.activationLimit} Sites`}
                                {p.licenseDurationDays === 0 ? ' / Lifetime' : ` / ${p.licenseDurationDays}d`}
                              </option>
                            ))}
                          </select>
                          <span className="text-[10px] text-muted-foreground mt-0.5 block">Default plan for own marketplace licenses</span>
                        </div>
                      )}
                      {(productForm.marketplaceSource === 'envato' || productForm.marketplaceSource === 'both') && (
                        <div>
                          <label className="font-semibold text-foreground block mb-1">Envato Plan</label>
                          <select
                            value={productForm.envatoLicensePlanId}
                            onChange={(e) => setProductForm({ ...productForm, envatoLicensePlanId: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs"
                          >
                            <option value="">None (use product defaults)</option>
                            {(availablePlans || []).map((p: any) => (
                              <option key={p._id} value={p._id}>
                                {p.name} — {p.activationLimit === 0 ? 'Unlimited' : `${p.activationLimit} Sites`}
                                {p.licenseDurationDays === 0 ? ' / Lifetime' : ` / ${p.licenseDurationDays}d`}
                              </option>
                            ))}
                          </select>
                          <span className="text-[10px] text-muted-foreground mt-0.5 block">Default plan for Envato marketplace licenses</span>
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      When a plan is assigned, new licenses will use the plan&apos;s activation limit, duration, and support settings. Product-level overrides below still take priority.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="font-semibold text-foreground block mb-1">Default Activation Limit</label>
                      <input
                        type="number"
                        min="1"
                        value={productForm.defaultActivationLimit}
                        onChange={(e) => setProductForm({ ...productForm, defaultActivationLimit: Number(e.target.value) })}
                        className="w-full px-3 py-2 rounded-xl border border-border bg-background font-mono text-xs font-bold"
                      />
                      <span className="text-[10px] text-muted-foreground mt-0.5 block">Max domain slots</span>
                    </div>

                    <div>
                      <label className="font-semibold text-foreground block mb-1">Validation Interval (Hours)</label>
                      <input
                        type="number"
                        min="1"
                        value={productForm.validationIntervalHours}
                        onChange={(e) => setProductForm({ ...productForm, validationIntervalHours: Number(e.target.value) })}
                        className="w-full px-3 py-2 rounded-xl border border-border bg-background font-mono text-xs font-bold"
                      />
                      <span className="text-[10px] text-muted-foreground mt-0.5 block">Heartbeat frequency</span>
                    </div>

                    <div>
                      <label className="font-semibold text-foreground block mb-1">Offline Grace Period (Days)</label>
                      <input
                        type="number"
                        min="1"
                        value={productForm.offlineGracePeriodDays}
                        onChange={(e) => setProductForm({ ...productForm, offlineGracePeriodDays: Number(e.target.value) })}
                        className="w-full px-3 py-2 rounded-xl border border-border bg-background font-mono text-xs font-bold"
                      />
                      <span className="text-[10px] text-muted-foreground mt-0.5 block">Offline validity</span>
                    </div>
                  </div>

                  {/* Binding Rules */}
                  <div className="p-4 rounded-2xl border border-border bg-secondary/30 space-y-3">
                    <p className="font-bold text-foreground text-xs">Security & Cryptographic Binding</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <label className="flex items-center gap-2 font-medium cursor-pointer">
                        <input
                          type="checkbox"
                          checked={productForm.domainBinding}
                          onChange={(e) => setProductForm({ ...productForm, domainBinding: e.target.checked })}
                          className="rounded"
                        />
                        <span>Enforce Domain Binding</span>
                      </label>

                      <label className="flex items-center gap-2 font-medium cursor-pointer">
                        <input
                          type="checkbox"
                          checked={productForm.installationBinding}
                          onChange={(e) => setProductForm({ ...productForm, installationBinding: e.target.checked })}
                          className="rounded"
                        />
                        <span>Enforce Installation ID Binding</span>
                      </label>

                      <label className="flex items-center gap-2 font-medium cursor-pointer">
                        <input
                          type="checkbox"
                          checked={productForm.allowDeactivation}
                          onChange={(e) => setProductForm({ ...productForm, allowDeactivation: e.target.checked })}
                          className="rounded"
                        />
                        <span>Allow Customer Self-Deactivation</span>
                      </label>

                      <label className="flex items-center gap-2 font-medium cursor-pointer">
                        <input
                          type="checkbox"
                          checked={productForm.periodicValidation}
                          onChange={(e) => setProductForm({ ...productForm, periodicValidation: e.target.checked })}
                          className="rounded"
                        />
                        <span>Enable Periodic Validation Check</span>
                      </label>
                    </div>
                  </div>

                  {/* Downloads & Updates Availability */}
                  <div className="p-4 rounded-2xl border border-border bg-secondary/30 space-y-3">
                    <p className="font-bold text-foreground text-xs">Customer Deliverables & Updates</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <label className="flex items-center gap-2 font-medium cursor-pointer">
                        <input
                          type="checkbox"
                          checked={productForm.downloadsEnabled}
                          onChange={(e) => setProductForm({ ...productForm, downloadsEnabled: e.target.checked })}
                          className="rounded"
                        />
                        <span>Enable ZIP Package Downloads</span>
                      </label>

                      <label className="flex items-center gap-2 font-medium cursor-pointer">
                        <input
                          type="checkbox"
                          checked={productForm.automaticUpdatesEnabled}
                          onChange={(e) => setProductForm({ ...productForm, automaticUpdatesEnabled: e.target.checked })}
                          className="rounded"
                        />
                        <span>Enable Automatic Updates Stream</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: TECHNICAL & STAGING RULES */}
              {modalTab === 'technical' && (
                <div className="space-y-4">
                  {/* Staging & Localhost Rules */}
                  <div className="p-4 rounded-2xl border border-border bg-secondary/30 space-y-3">
                    <p className="font-bold text-foreground text-xs">Staging & Localhost Environment Rules</p>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between p-2 rounded-xl bg-background/60 border border-border">
                        <label className="flex items-center gap-2 font-semibold cursor-pointer">
                          <input
                            type="checkbox"
                            checked={productForm.allowLocalhost}
                            onChange={(e) => setProductForm({ ...productForm, allowLocalhost: e.target.checked })}
                          />
                          <span>Allow Localhost Development (.test, .local, localhost)</span>
                        </label>
                        <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer">
                          <input
                            type="checkbox"
                            checked={productForm.countLocalhost}
                            onChange={(e) => setProductForm({ ...productForm, countLocalhost: e.target.checked })}
                          />
                          <span>Count against slot</span>
                        </label>
                      </div>

                      <div className="flex items-center justify-between p-2 rounded-xl bg-background/60 border border-border">
                        <label className="flex items-center gap-2 font-semibold cursor-pointer">
                          <input
                            type="checkbox"
                            checked={productForm.allowStaging}
                            onChange={(e) => setProductForm({ ...productForm, allowStaging: e.target.checked })}
                          />
                          <span>Allow Staging Servers (staging.*, dev.*, test.*)</span>
                        </label>
                        <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer">
                          <input
                            type="checkbox"
                            checked={productForm.countStaging}
                            onChange={(e) => setProductForm({ ...productForm, countStaging: e.target.checked })}
                          />
                          <span>Count against slot</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Compatibility Requirements */}
                  <div className="p-4 rounded-2xl border border-border bg-secondary/30 space-y-3">
                    <p className="font-bold text-foreground text-xs">Auto-Update Compatibility Bounds</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <label className="font-semibold text-foreground block mb-1">Min PHP Version</label>
                        <input
                          type="text"
                          value={productForm.minPhpVersion}
                          onChange={(e) => setProductForm({ ...productForm, minPhpVersion: e.target.value })}
                          placeholder="e.g. 7.4"
                          className="w-full px-3 py-2 rounded-xl border border-border bg-background font-mono text-xs"
                        />
                      </div>
                      <div>
                        <label className="font-semibold text-foreground block mb-1">Min WP / App Version</label>
                        <input
                          type="text"
                          value={productForm.minWordPressVersion}
                          onChange={(e) => setProductForm({ ...productForm, minWordPressVersion: e.target.value })}
                          placeholder="e.g. 6.0"
                          className="w-full px-3 py-2 rounded-xl border border-border bg-background font-mono text-xs"
                        />
                      </div>
                      <div>
                        <label className="font-semibold text-foreground block mb-1">Min Node Version</label>
                        <input
                          type="text"
                          value={productForm.minNodeVersion}
                          onChange={(e) => setProductForm({ ...productForm, minNodeVersion: e.target.value })}
                          placeholder="e.g. 18.0.0"
                          className="w-full px-3 py-2 rounded-xl border border-border bg-background font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-border">
                <div className="flex items-center gap-2">
                  {modalTab !== 'basic' && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (modalTab === 'technical') setModalTab('licensing');
                        else if (modalTab === 'licensing') setModalTab('marketplace');
                        else if (modalTab === 'marketplace') setModalTab('basic');
                      }}
                    >
                      Back
                    </Button>
                  )}
                  {modalTab !== 'technical' && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (modalTab === 'basic') setModalTab('marketplace');
                        else if (modalTab === 'marketplace') setModalTab('licensing');
                        else if (modalTab === 'licensing') setModalTab('technical');
                      }}
                    >
                      Next Step
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <Button type="button" variant="outline" onClick={() => setShowProductModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Saving...' : editingProductId ? 'Update Product' : 'Create Product'}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD VERSION / PACKAGE UPLOAD MODAL */}
      {showVersionModal && selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl border border-border bg-card shadow-2xl p-6 sm:p-8 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 className="text-base font-bold flex items-center gap-2">
                  <UploadCloud className="h-5 w-5 text-indigo-500" />
                  Upload Package &amp; Release Version
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {selectedProduct.name} &bull; <span className="capitalize font-semibold text-foreground">{selectedProduct.productType?.replace(/_/g, ' ')}</span>
                </p>
              </div>
              <button onClick={() => setShowVersionModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            {versionModalError && (
              <div className="p-3.5 rounded-2xl bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold">Upload / Validation Error</p>
                  <p>{versionModalError}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleAddVersion} className="space-y-4 text-xs">
              {/* ZIP File Upload Zone */}
              <div className="space-y-1.5">
                <label className="font-bold text-foreground block">Package ZIP File *</label>
                <div className="border-2 border-dashed border-border hover:border-indigo-500/40 rounded-2xl p-4 text-center transition-colors bg-secondary/20 relative">
                  <input
                    type="file"
                    accept=".zip,application/zip"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setPackageFile(e.target.files[0]);
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  {packageFile ? (
                    <div className="flex items-center justify-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                        <FileArchive className="h-5 w-5" />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-foreground text-xs">{packageFile.name}</p>
                        <p className="text-[11px] text-muted-foreground font-mono">
                          {(packageFile.size / (1024 * 1024)).toFixed(2)} MB &bull; Ready for upload &amp; structure validation
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5 py-2">
                      <UploadCloud className="h-8 w-8 text-indigo-500 mx-auto opacity-70" />
                      <p className="font-semibold text-foreground">Click or Drag &amp; Drop .zip package file</p>
                      <p className="text-[11px] text-muted-foreground">
                        Structure will be verified automatically for {selectedProduct.productType?.replace(/_/g, ' ')}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Version & Channel */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-foreground block mb-1">Version Number *</label>
                  <input
                    type="text"
                    required
                    value={versionForm.version}
                    onChange={(e) => setVersionForm({ ...versionForm, version: e.target.value })}
                    placeholder="e.g. 1.3.0"
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-background font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-foreground block mb-1">Release Channel</label>
                  <select
                    value={versionForm.releaseChannel}
                    onChange={(e) => setVersionForm({ ...versionForm, releaseChannel: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-xs font-semibold"
                  >
                    <option value="stable">Stable (Production)</option>
                    <option value="beta">Beta Channel</option>
                    <option value="alpha">Alpha Channel</option>
                    <option value="dev">Dev Channel</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">Release Title</label>
                <input
                  type="text"
                  value={versionForm.releaseName}
                  onChange={(e) => setVersionForm({ ...versionForm, releaseName: e.target.value })}
                  placeholder="e.g. Major Feature Update & Security Fixes"
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">Changelog / Release Notes</label>
                <textarea
                  rows={3}
                  value={versionForm.releaseNotes}
                  onChange={(e) => setVersionForm({ ...versionForm, releaseNotes: e.target.value })}
                  placeholder="• Added new features&#10;• Fixed bug with activations&#10;• Performance improvements"
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs leading-relaxed"
                />
              </div>

              {/* Compatibility */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-semibold text-muted-foreground block mb-1 text-[11px]">Min PHP</label>
                  <input
                    type="text"
                    value={versionForm.minPhpVersion}
                    onChange={(e) => setVersionForm({ ...versionForm, minPhpVersion: e.target.value })}
                    placeholder="7.4"
                    className="w-full px-2.5 py-2 rounded-xl border border-border bg-background font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-muted-foreground block mb-1 text-[11px]">Min WP</label>
                  <input
                    type="text"
                    value={versionForm.minWordPressVersion}
                    onChange={(e) => setVersionForm({ ...versionForm, minWordPressVersion: e.target.value })}
                    placeholder="6.0"
                    className="w-full px-2.5 py-2 rounded-xl border border-border bg-background font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-muted-foreground block mb-1 text-[11px]">Min Node</label>
                  <input
                    type="text"
                    value={versionForm.minNodeVersion}
                    onChange={(e) => setVersionForm({ ...versionForm, minNodeVersion: e.target.value })}
                    placeholder="18.0.0"
                    className="w-full px-2.5 py-2 rounded-xl border border-border bg-background font-mono text-xs"
                  />
                </div>
              </div>

              {/* Publish toggle */}
              <div className="p-3.5 rounded-2xl bg-secondary/40 border border-border flex items-center justify-between">
                <div>
                  <p className="font-bold text-foreground">Publish Immediately</p>
                  <p className="text-[11px] text-muted-foreground">Make this version live in update checks immediately</p>
                </div>
                <input
                  type="checkbox"
                  checked={versionForm.publishImmediately}
                  onChange={(e) => setVersionForm({ ...versionForm, publishImmediately: e.target.checked })}
                  className="h-4 w-4 rounded accent-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setShowVersionModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={publishingVersion || (!packageFile && !versionForm.version)}>
                  {publishingVersion ? (
                    <span className="flex items-center gap-2">
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      Validating &amp; Uploading...
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <UploadCloud className="h-4 w-4" />
                      Upload &amp; Release
                    </span>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VERSION HISTORY & PACKAGE MANAGEMENT MODAL */}
      {showVersionHistoryModal && selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-border bg-card shadow-2xl p-6 sm:p-8 space-y-5 max-h-[88vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 className="text-base font-bold flex items-center gap-2">
                  <Layers className="h-5 w-5 text-indigo-500" />
                  Product Packages &amp; Version History
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {selectedProduct.name} &bull; <span className="font-mono text-indigo-500 font-bold">{selectedProduct.slug}</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    setShowVersionHistoryModal(false);
                    setShowVersionModal(true);
                  }}
                  className="h-8 text-xs font-semibold gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Upload New Version
                </Button>
                <button onClick={() => setShowVersionHistoryModal(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {loadingVersions ? (
                <div className="py-12 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                  <RefreshCw className="h-5 w-5 animate-spin text-indigo-500" />
                  <span>Loading package releases...</span>
                </div>
              ) : productVersions.length === 0 ? (
                <div className="py-12 text-center rounded-2xl border border-dashed border-border bg-secondary/20 space-y-3">
                  <FileArchive className="h-8 w-8 text-muted-foreground mx-auto opacity-50" />
                  <p className="text-sm font-semibold">No release packages uploaded yet</p>
                  <p className="text-xs text-muted-foreground">Click &quot;Upload New Version&quot; to upload your first .zip package.</p>
                </div>
              ) : (
                productVersions.map((ver) => {
                  const status = ver.packageStatus || 'approved';
                  const isApproved = status === 'approved';
                  const isArchived = status === 'archived';
                  const isDisabled = status === 'disabled';
                  const isPending = status === 'pending';

                  return (
                    <div
                      key={ver._id}
                      className={`p-5 rounded-2xl border transition-all space-y-3.5 ${
                        isArchived
                          ? 'border-border/40 bg-secondary/10 opacity-70'
                          : isDisabled
                          ? 'border-destructive/30 bg-destructive/5'
                          : 'border-border bg-secondary/30'
                      }`}
                    >
                      {/* Version Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-base font-black text-indigo-500">v{ver.version}</span>
                          {ver.releaseName && (
                            <span className="text-xs font-bold text-foreground">({ver.releaseName})</span>
                          )}
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-secondary text-muted-foreground border border-border">
                            {ver.releaseChannel || 'stable'}
                          </span>

                          {/* Status Badge */}
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                              isApproved
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                : isPending
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                                : isArchived
                                ? 'bg-purple-500/10 text-purple-600 border-purple-500/20'
                                : 'bg-destructive/10 text-destructive border-destructive/20'
                            }`}
                          >
                            {status}
                          </span>

                          {ver.isPublic && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-500">
                              Live on Updates API
                            </span>
                          )}
                        </div>

                        <span className="text-[11px] text-muted-foreground font-mono">
                          {new Date(ver.publishedAt || ver.createdAt).toLocaleDateString()}
                          {ver.uploadedByEmail && ` by ${ver.uploadedByEmail}`}
                        </span>
                      </div>

                      {/* Release Notes */}
                      {ver.releaseNotes && (
                        <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line bg-background/50 p-2.5 rounded-xl border border-border/50">
                          {ver.releaseNotes}
                        </p>
                      )}

                      {/* File Metadata & Checksum */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                        <div className="p-2.5 rounded-xl bg-background border border-border flex items-center justify-between">
                          <span className="text-muted-foreground font-semibold">Package Size</span>
                          <span className="font-mono font-bold">
                            {ver.fileSize ? `${(ver.fileSize / 1024).toFixed(1)} KB` : 'External Package'}
                          </span>
                        </div>

                        <div className="p-2.5 rounded-xl bg-background border border-border flex items-center justify-between">
                          <span className="text-muted-foreground font-semibold">Validation</span>
                          <span className={`font-semibold flex items-center gap-1 ${ver.validationPassed ? 'text-emerald-500' : 'text-amber-500'}`}>
                            {ver.validationPassed ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                            {ver.validationPassed ? 'Passed' : 'Standard'}
                          </span>
                        </div>
                      </div>

                      {/* SHA-256 Checksum */}
                      {ver.fileChecksum && (
                        <div className="p-2.5 rounded-xl bg-background border border-border flex items-center justify-between gap-2 text-xs">
                          <div className="min-w-0 flex-1">
                            <span className="text-[10px] font-bold uppercase text-muted-foreground block">SHA-256 Checksum</span>
                            <span className="font-mono text-[11px] truncate block text-foreground select-all">
                              {ver.fileChecksum}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyChecksum(ver.fileChecksum)}
                            className="text-indigo-500 hover:underline text-xs font-semibold flex items-center gap-1 shrink-0"
                          >
                            <Copy className="h-3 w-3" />
                            {copiedChecksum === ver.fileChecksum ? 'Copied!' : 'Copy'}
                          </button>
                        </div>
                      )}

                      {/* Actions Bar */}
                      <div className="pt-2 border-t border-border flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Approve action */}
                          {isPending && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handlePackageAction(ver._id, 'approve')}
                              disabled={actionLoadingId === ver._id}
                              className="h-7 text-xs font-semibold text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
                            >
                              Approve
                            </Button>
                          )}

                          {/* Publish / Unpublish */}
                          {isApproved && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handlePackageAction(ver._id, ver.isPublic ? 'unpublish' : 'publish')}
                              disabled={actionLoadingId === ver._id}
                              className="h-7 text-xs font-semibold"
                            >
                              {ver.isPublic ? 'Unpublish' : 'Publish to Updates'}
                            </Button>
                          )}

                          {/* Disable / Enable */}
                          {!isArchived && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handlePackageAction(ver._id, isDisabled ? 'enable' : 'disable')}
                              disabled={actionLoadingId === ver._id}
                              className="h-7 text-xs font-semibold"
                            >
                              {isDisabled ? 'Enable Downloads' : 'Disable Downloads'}
                            </Button>
                          )}

                          {/* Archive */}
                          {!isArchived && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                const reason = prompt('Archival reason (optional):');
                                if (reason !== null) handlePackageAction(ver._id, 'archive', reason);
                              }}
                              disabled={actionLoadingId === ver._id}
                              className="h-7 text-xs text-muted-foreground hover:text-foreground"
                            >
                              <Archive className="h-3 w-3 mr-1" />
                              Archive
                            </Button>
                          )}

                          {/* Replace File */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setReplaceTargetVersion(ver);
                              setReplaceFile(null);
                              setReplaceError('');
                              setShowReplaceModal(true);
                            }}
                            className="h-7 text-xs text-indigo-500 hover:bg-indigo-500/10"
                          >
                            <UploadCloud className="h-3 w-3 mr-1" />
                            Replace ZIP
                          </Button>
                        </div>

                        {/* Download button */}
                        <Button
                          size="sm"
                          onClick={() => handleDownloadPackage(ver._id)}
                          disabled={downloadingVersionId === ver._id || (!ver.storagePath && !ver.downloadPackageUrl)}
                          className="h-7 text-xs font-semibold gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                          <Download className="h-3 w-3" />
                          {downloadingVersionId === ver._id ? 'Generating Link...' : 'Download (Signed URL)'}
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-3 border-t border-border flex justify-end">
              <Button onClick={() => setShowVersionHistoryModal(false)} variant="outline" size="sm">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* REPLACE PACKAGE FILE MODAL */}
      {showReplaceModal && selectedProduct && replaceTargetVersion && (
        <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card shadow-2xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 className="text-base font-bold">Replace Package File</h2>
                <p className="text-xs text-muted-foreground">
                  {selectedProduct.name} &bull; <span className="font-mono text-indigo-500 font-bold">v{replaceTargetVersion.version}</span>
                </p>
              </div>
              <button onClick={() => setShowReplaceModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            {replaceError && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{replaceError}</span>
              </div>
            )}

            <form onSubmit={handleReplaceFile} className="space-y-4 text-xs">
              <div className="border-2 border-dashed border-border hover:border-indigo-500/40 rounded-2xl p-4 text-center transition-colors bg-secondary/20 relative">
                <input
                  type="file"
                  accept=".zip,application/zip"
                  required
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setReplaceFile(e.target.files[0]);
                    }
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                {replaceFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileArchive className="h-6 w-6 text-indigo-500" />
                    <div className="text-left">
                      <p className="font-bold text-foreground">{replaceFile.name}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">
                        {(replaceFile.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1 py-3">
                    <UploadCloud className="h-7 w-7 text-indigo-500 mx-auto" />
                    <p className="font-semibold text-foreground">Select Replacement ZIP Archive</p>
                    <p className="text-[11px] text-muted-foreground">Old package file will be replaced safely on server</p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setShowReplaceModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={replacingFile || !replaceFile}>
                  {replacingFile ? 'Replacing...' : 'Confirm & Replace Package'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRODUCT API CREDENTIALS MANAGEMENT MODAL */}
      {showCredentialsModal && credentialsProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-3xl rounded-3xl border border-border bg-card shadow-2xl p-6 sm:p-8 space-y-5 max-h-[88vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 className="text-base font-bold flex items-center gap-2">
                  <KeyRound className="h-5 w-5 text-amber-500" />
                  Product Client API Credentials
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {credentialsProduct.name} &bull; <span className="font-mono text-indigo-500 font-bold">{credentialsProduct.slug}</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => setShowCreateCredForm(!showCreateCredForm)}
                  className="h-8 text-xs font-semibold gap-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Generate API Client Key
                </Button>
                <button onClick={() => setShowCredentialsModal(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {credError && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{credError}</span>
              </div>
            )}

            {/* Create form */}
            {showCreateCredForm && (
              <form onSubmit={handleCreateCredential} className="p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 space-y-3 text-xs">
                <h3 className="font-bold text-foreground">Generate New Client API Key</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-foreground block mb-1">Key Label / Name</label>
                    <input
                      type="text"
                      required
                      value={newCredName}
                      onChange={(e) => setNewCredName(e.target.value)}
                      placeholder="e.g. WP Plugin v1 Client Key"
                      className="w-full px-3 py-2 rounded-xl border border-border bg-background"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-foreground block mb-1">Scopes</label>
                    <div className="flex flex-wrap gap-2 mt-1.5">
                      {['activate', 'validate', 'update', 'download'].map((scope) => {
                        const hasScope = newCredScopes.includes(scope);
                        return (
                          <label key={scope} className="flex items-center gap-1.5 cursor-pointer bg-background px-2.5 py-1 rounded-lg border border-border">
                            <input
                              type="checkbox"
                              checked={hasScope}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setNewCredScopes([...newCredScopes, scope]);
                                } else {
                                  setNewCredScopes(newCredScopes.filter((s) => s !== scope));
                                }
                              }}
                              className="rounded"
                            />
                            <span className="font-mono text-[10px] font-bold text-muted-foreground uppercase">{scope}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowCreateCredForm(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={savingCred} className="bg-amber-500 hover:bg-amber-600 text-white font-bold">
                    {savingCred ? 'Generating...' : 'Confirm Generate'}
                  </Button>
                </div>
              </form>
            )}

            <div className="space-y-4">
              {loadingCredentials ? (
                <div className="py-12 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                  <RefreshCw className="h-5 w-5 animate-spin text-amber-500" />
                  <span>Loading product keys...</span>
                </div>
              ) : credentials.length === 0 ? (
                <div className="py-12 text-center rounded-2xl border border-dashed border-border bg-secondary/20 space-y-3">
                  <KeyRound className="h-8 w-8 text-muted-foreground mx-auto opacity-50" />
                  <p className="text-sm font-semibold">No Client API Keys generated yet</p>
                  <p className="text-xs text-muted-foreground">Ship a Client API Key in your distributed plugin to verify product authenticity.</p>
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {credentials.map((cred) => {
                    const isActive = cred.status === 'active';
                    const isRotated = cred.status === 'rotated';
                    const isDisabled = cred.status === 'disabled';

                    return (
                      <div key={cred._id} className="py-4 first:pt-0 last:pb-0 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-foreground text-sm">{cred.name}</span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                                isActive
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                  : isRotated
                                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                                  : 'bg-destructive/10 text-destructive border-destructive/20'
                              }`}
                            >
                              {cred.status}
                            </span>
                            {isRotated && cred.expiresAt && (
                              <span className="text-[10px] text-amber-600 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded-sm">
                                Grace Expiry: {new Date(cred.expiresAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            Created: {new Date(cred.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        {/* Credentials Data Display */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div className="p-2.5 rounded-xl bg-background border border-border space-y-1 relative group">
                            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Client ID (Public)</span>
                            <div className="font-mono text-xs font-semibold text-foreground flex items-center justify-between gap-2">
                              <span className="truncate">{cred.clientId}</span>
                              <button
                                onClick={() => handleCopyText(cred.clientId, cred._id + '-cid')}
                                className="text-muted-foreground hover:text-foreground shrink-0"
                                title="Copy Client ID"
                              >
                                {copiedCredId === cred._id + '-cid' ? (
                                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>
                          </div>

                          <div className="p-2.5 rounded-xl bg-background border border-border space-y-1 relative group">
                            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">API Key / Token (Public client key)</span>
                            <div className="font-mono text-xs font-semibold text-foreground flex items-center justify-between gap-2">
                              <span className="truncate">{cred.apiKey}</span>
                              <button
                                onClick={() => handleCopyText(cred.apiKey, cred._id + '-key')}
                                className="text-muted-foreground hover:text-foreground shrink-0"
                                title="Copy API Key"
                              >
                                {copiedCredId === cred._id + '-key' ? (
                                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Scopes & Actions */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] text-muted-foreground font-bold uppercase shrink-0">Scopes:</span>
                            {cred.scopes?.map((s: string) => (
                              <span key={s} className="px-1.5 py-0.5 rounded bg-secondary font-mono text-[9px] font-semibold text-muted-foreground border border-border/40">
                                {s}
                              </span>
                            ))}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {/* Rotate Key */}
                            {!isDisabled && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRotateCredential(cred._id)}
                                className="h-7 text-[10px] font-bold gap-1"
                                title="Generate a new key pair and set this key to expire in 30 days"
                              >
                                <RefreshCw className="h-3 w-3 text-indigo-500" />
                                Rotate Key
                              </Button>
                            )}

                            {/* Enable/Disable Toggle */}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleToggleCredential(cred._id)}
                              className="h-7 text-[10px] font-bold"
                            >
                              {isDisabled ? 'Enable Key' : 'Disable Key'}
                            </Button>

                            {/* Permanently delete */}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteCredential(cred._id)}
                              className="h-7 text-[10px] font-bold text-destructive hover:bg-destructive/10"
                              title="Delete immediately"
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-border flex justify-end">
              <Button onClick={() => setShowCredentialsModal(false)} variant="outline" size="sm">
                Close Panel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* GENERATE INTEGRATION PACKAGE MODAL */}
      {selectedPackageProduct && (
        <IntegrationPackageModal
          productId={selectedPackageProduct._id}
          productName={selectedPackageProduct.name}
          initialFramework={
            selectedPackageProduct.productType === 'wordpress_theme'
              ? 'wordpress_theme'
              : selectedPackageProduct.productType === 'php_script'
              ? 'php_script'
              : selectedPackageProduct.productType === 'nextjs_app'
              ? 'nextjs_app'
              : selectedPackageProduct.productType === 'nextjs_plugin'
              ? 'nextjs_plugin'
              : 'wordpress_plugin'
          }
          isOpen={isPackageModalOpen}
          onClose={() => {
            setIsPackageModalOpen(false);
            setSelectedPackageProduct(null);
          }}
        />
      )}

      {/* LICENSE VERIFICATION & CERTIFICATION MODAL */}
      {selectedVerifyProduct && (
        <LicenseVerificationModal
          productId={selectedVerifyProduct._id}
          productName={selectedVerifyProduct.name}
          isOpen={isVerifyModalOpen}
          onClose={() => {
            setIsVerifyModalOpen(false);
            setSelectedVerifyProduct(null);
          }}
          onStatusChanged={(newStatus) => {
            setProducts((prev) =>
              prev.map((p) => (p._id === selectedVerifyProduct._id ? { ...p, integrationStatus: newStatus } : p))
            );
          }}
        />
      )}
    </div>
  );
}
