import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useStore } from '../store';
import {
  DiscountType,
  GstTaxMode,
  LedgerItemMaster,
  MasterRecordKind,
  OpeningBalanceType,
  UserRole,
  WorkspaceUser,
} from '../types';
import { ClickablePath } from '../components/ClickablePath';
import {
  GST_RATE_OPTIONS,
  GST_MODE_OPTIONS,
  computeItemPricing,
} from '../utils/itemPricing';
import {
  Check,
  Download,
  Eye,
  FileSpreadsheet,
  Lock,
  Pencil,
  Plus,
  Printer,
  RotateCcw,
  Search,
  Shield,
  Trash2,
  Upload,
  UserPlus,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

type SettingsTab = 'items' | 'users' | 'company' | 'security' | 'backup';
type MasterFilter = 'all' | 'item' | 'ledger';

const CURRENCY_OPTIONS = [
  { symbol: '$', label: 'USD ($)' },
  { symbol: '₹', label: 'INR (₹)' },
  { symbol: '€', label: 'EUR (€)' },
  { symbol: '£', label: 'GBP (£)' },
  { symbol: 'KES', label: 'KES' },
  { symbol: '₦', label: 'NGN (₦)' },
  { symbol: '¥', label: 'JPY (¥)' },
];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const ACCOUNT_GROUPS = [
  'Revenue Account',
  'Inventory Asset Account',
  'Operating Expense Account',
  'Sundry Income Account',
  'Cost of Goods Sold (COGS)',
  'GST Tax Expense Account',
  'Fixed Asset Cost Account',
  'Corporate Bank Account',
];

const Settings: React.FC = () => {
  const {
    companySettings,
    updateCompanySettings,
    ledgerItems,
    addLedgerItem,
    updateLedgerItem,
    deleteLedgerItem,
    workspaceUsers,
    activeUser,
    realUser,
    activeRole,
    isRealAdmin,
    isPreviewingRole,
    permissions,
    setActingUserId,
    addWorkspaceUser,
    updateWorkspaceUser,
    deleteWorkspaceUser,
    hasPasscode,
    setupSecurityPasscode,
    removePasscode,
    lockNow,
    exportBackup,
    importBackup,
    clearAllData,
    resetDatabase,
    formatMoney,
  } = useStore();

  const outletCtx =
    useOutletContext<{
      openSheetsSync?: () => void;
      openPrintPreview?: () => void;
    }>() || {};

  const [tab, setTab] = useState<SettingsTab>('items');

  // --- Item / Ledger Creation Form State ---
  const [editingId, setEditingId] = useState<string | null>(null);
  const [recordKind, setRecordKind] = useState<MasterRecordKind>('item');
  const [itemName, setItemName] = useState('');
  const [gstRate, setGstRate] = useState<number>(18);
  const [gstMode, setGstMode] = useState<GstTaxMode>('excluding');
  const [discount, setDiscount] = useState<string>('0');
  const [discountType, setDiscountType] = useState<DiscountType>('percentage');
  const [defaultPrice, setDefaultPrice] = useState<string>('');
  const [openingBalance, setOpeningBalance] = useState<string>('');
  const [openingBalanceType, setOpeningBalanceType] = useState<OpeningBalanceType>('dr');
  const [hsnOrCode, setHsnOrCode] = useState<string>('');
  const [accountGroup, setAccountGroup] = useState<string>('Revenue Account');

  // Register filters
  const [masterSearch, setMasterSearch] = useState('');
  const [masterFilter, setMasterFilter] = useState<MasterFilter>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // --- Multi-User & Roles State ---
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState<UserRole>('user');
  const [userStatus, setUserStatus] = useState<'active' | 'inactive'>('active');
  const [userSubmitting, setUserSubmitting] = useState(false);
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState('');

  // --- Company Settings State ---
  const [companyName, setCompanyName] = useState(companySettings.name);
  const [subtitle, setSubtitle] = useState(companySettings.subtitle);
  const [currencySymbol, setCurrencySymbol] = useState(companySettings.currencySymbol);
  const [fiscalYearStart, setFiscalYearStart] = useState(companySettings.fiscalYearStart);

  // --- Security & Backup State ---
  const [pinInput, setPinInput] = useState('');
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCompanyName(companySettings.name);
    setSubtitle(companySettings.subtitle);
    setCurrencySymbol(companySettings.currencySymbol);
    setFiscalYearStart(companySettings.fiscalYearStart);
  }, [companySettings]);

  const parsedPriceForPreview = useMemo(() => {
    const val = parseFloat(defaultPrice);
    return !isNaN(val) && val > 0 ? val : 1000;
  }, [defaultPrice]);

  const isPreviewSample = useMemo(() => {
    const val = parseFloat(defaultPrice);
    return isNaN(val) || val <= 0;
  }, [defaultPrice]);

  const pricingPreview = useMemo(() => {
    const discVal = parseFloat(discount);
    return computeItemPricing(
      parsedPriceForPreview,
      gstRate,
      gstMode,
      isNaN(discVal) ? 0 : discVal,
      discountType
    );
  }, [parsedPriceForPreview, gstRate, gstMode, discount, discountType]);

  const filteredMasters = useMemo(() => {
    const q = masterSearch.trim().toLowerCase();
    return ledgerItems.filter(item => {
      if (masterFilter !== 'all' && item.kind !== masterFilter) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        (item.hsnOrCode && item.hsnOrCode.toLowerCase().includes(q)) ||
        (item.accountGroup && item.accountGroup.toLowerCase().includes(q)) ||
        `${item.gstRate}%`.includes(q) ||
        item.gstMode.includes(q)
      );
    });
  }, [ledgerItems, masterFilter, masterSearch]);

  const duplicateMaster = useMemo(() => {
    const key = itemName.trim().replace(/\s+/g, ' ').toLowerCase();
    if (!key) return null;
    return (
      ledgerItems.find(
        item =>
          item.id !== editingId &&
          item.name.trim().replace(/\s+/g, ' ').toLowerCase() === key
      ) || null
    );
  }, [ledgerItems, itemName, editingId]);

  const resetItemForm = () => {
    setEditingId(null);
    setItemName('');
    setGstRate(18);
    setGstMode('excluding');
    setDiscount('0');
    setDiscountType('percentage');
    setDefaultPrice('');
    setOpeningBalance('');
    setOpeningBalanceType('dr');
    setHsnOrCode('');
    setAccountGroup('Revenue Account');
  };

  const handleStartEdit = (entry: LedgerItemMaster) => {
    setEditingId(entry.id);
    setRecordKind(entry.kind);
    setItemName(entry.name);
    setGstRate(entry.gstRate);
    setGstMode(entry.gstMode);
    setDiscount(String(entry.discount ?? 0));
    setDiscountType(entry.discountType || 'percentage');
    setDefaultPrice(entry.defaultPrice !== undefined ? String(entry.defaultPrice) : '');
    setOpeningBalance(
      entry.openingBalance !== undefined && entry.openingBalance > 0
        ? String(entry.openingBalance)
        : ''
    );
    setOpeningBalanceType(entry.openingBalanceType || 'dr');
    setHsnOrCode(entry.hsnOrCode || '');
    setAccountGroup(entry.accountGroup || 'Revenue Account');
  };

  const handleSubmitMaster = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = itemName.trim();
    if (!trimmedName) {
      toast.error(`Please enter ${recordKind === 'item' ? 'an item' : 'a ledger'} name.`);
      return;
    }

    const parsedDiscount = parseFloat(discount || '0');
    if (isNaN(parsedDiscount) || parsedDiscount < 0) {
      toast.error('Discount must be 0 or greater.');
      return;
    }
    if (discountType === 'percentage' && parsedDiscount > 100) {
      toast.error('Percentage discount cannot exceed 100%.');
      return;
    }

    const parsedDefaultPrice = defaultPrice.trim() ? parseFloat(defaultPrice) : undefined;
    if (
      parsedDefaultPrice !== undefined &&
      (isNaN(parsedDefaultPrice) || parsedDefaultPrice < 0)
    ) {
      toast.error('Default rate must be a valid positive number.');
      return;
    }

    const parsedOpeningBalance = openingBalance.trim() ? parseFloat(openingBalance) : undefined;
    if (
      parsedOpeningBalance !== undefined &&
      (isNaN(parsedOpeningBalance) || parsedOpeningBalance < 0)
    ) {
      toast.error('Opening balance must be 0 or greater.');
      return;
    }

    const effectiveOpeningBalance =
      parsedOpeningBalance !== undefined && parsedOpeningBalance > 0
        ? Math.round((parsedOpeningBalance + Number.EPSILON) * 100) / 100
        : undefined;

    const payload: Omit<LedgerItemMaster, 'id' | 'createdAt'> = {
      kind: recordKind,
      name: trimmedName,
      gstRate,
      gstMode,
      discount: parsedDiscount,
      discountType,
      defaultPrice: parsedDefaultPrice,
      openingBalance: effectiveOpeningBalance,
      openingBalanceType: effectiveOpeningBalance !== undefined ? openingBalanceType : undefined,
      hsnOrCode: hsnOrCode.trim() || undefined,
      accountGroup: accountGroup.trim() || undefined,
    };

    const res = editingId
      ? updateLedgerItem(editingId, payload)
      : addLedgerItem(payload);

    if (!res.ok) {
      toast.error(res.error || 'A ledger or item with this name already exists.');
      return;
    }

    toast.success(
      `${recordKind === 'item' ? 'Item' : 'Ledger'} ${editingId ? 'updated' : 'created'}.`
    );

    resetItemForm();
  };

  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    updateCompanySettings({
      name: companyName.trim() || 'Tunzua',
      subtitle: subtitle.trim() || 'Simple Double-Entry Ledger',
      currencySymbol: currencySymbol.trim() || '$',
      fiscalYearStart,
    });
    toast.success('Company settings saved.');
  };

  const handleSetPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(pinInput)) {
      toast.error('Please enter a 4-digit numeric PIN.');
      return;
    }
    setupSecurityPasscode(pinInput);
    setPinInput('');
    toast.success('4-digit workspace PIN enabled.');
  };

  const handleDownloadBackup = () => {
    const payload = exportBackup();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tunzua-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Backup JSON downloaded.');
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const res = importBackup(parsed);
        if (res.ok) {
          toast.success('Backup restored cleanly.');
        } else {
          toast.error(res.error || 'Could not restore backup file.');
        }
      } catch {
        toast.error('Selected file is not valid JSON.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleClearAllData = async () => {
    const res = await clearAllData();
    setConfirmClearAll(false);
    if (!res.ok) {
      toast.error(res.error || 'Could not clear workspace data.');
      return;
    }
    toast.success('All demo and ledger entries cleared. Your workspace is now blank.');
  };

  const handleResetWorkspace = async () => {
    await resetDatabase();
    setConfirmReset(false);
    toast.success('Workspace restored to clean sample ledger.');
  };

  // --- Multi-User Handlers ---
  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    return workspaceUsers.filter(u => {
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q) ||
        u.status.toLowerCase().includes(q)
      );
    });
  }, [workspaceUsers, userSearch]);

  const activeAdminCount = useMemo(
    () => workspaceUsers.filter(u => u.role === 'admin' && u.status === 'active').length,
    [workspaceUsers]
  );

  const resetUserForm = () => {
    setEditingUserId(null);
    setUserName('');
    setUserEmail('');
    setUserRole('user');
    setUserStatus('active');
  };

  const handleStartEditUser = (u: WorkspaceUser) => {
    setEditingUserId(u.id);
    setUserName(u.name);
    setUserEmail(u.email);
    setUserRole(u.role);
    setUserStatus(u.status);
  };

  const handleSubmitUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isRealAdmin) {
      toast.error('Only Admins can manage workspace users.');
      return;
    }
    setUserSubmitting(true);
    try {
      if (editingUserId) {
        const res = await updateWorkspaceUser(editingUserId, {
          name: userName,
          email: userEmail,
          role: userRole,
          status: userStatus,
        });
        if (!res.ok) {
          toast.error(res.error || 'Could not update user.');
          return;
        }
        toast.success('Workspace user updated.');
      } else {
        const res = await addWorkspaceUser({
          name: userName,
          email: userEmail,
          role: userRole,
          status: userStatus,
        });
        if (!res.ok) {
          toast.error(res.error || 'Could not add user.');
          return;
        }
        toast.success('Workspace user added.');
      }
      resetUserForm();
    } finally {
      setUserSubmitting(false);
    }
  };

  const handleInlineRoleChange = async (u: WorkspaceUser, nextRole: UserRole) => {
    const res = await updateWorkspaceUser(u.id, { role: nextRole });
    if (!res.ok) {
      toast.error(res.error || 'Could not change role.');
      return;
    }
    toast.success(`${u.name} is now ${nextRole === 'admin' ? 'an Admin' : 'a User'}.`);
  };

  const handleDeleteUser = async (u: WorkspaceUser) => {
    const res = await deleteWorkspaceUser(u.id);
    if (!res.ok) {
      toast.error(res.error || 'Could not remove user.');
      return;
    }
    if (editingUserId === u.id) resetUserForm();
    setConfirmDeleteUserId(null);
    toast.success('Workspace user removed.');
  };

  const itemCount = ledgerItems.filter(i => i.kind === 'item').length;
  const ledgerCount = ledgerItems.filter(i => i.kind === 'ledger').length;
  const totalOpeningDr = useMemo(
    () =>
      ledgerItems.reduce(
        (sum, item) =>
          sum +
          (item.openingBalance && item.openingBalance > 0 && (item.openingBalanceType || 'dr') === 'dr'
            ? item.openingBalance
            : 0),
        0
      ),
    [ledgerItems]
  );
  const totalOpeningCr = useMemo(
    () =>
      ledgerItems.reduce(
        (sum, item) =>
          sum +
          (item.openingBalance && item.openingBalance > 0 && item.openingBalanceType === 'cr'
            ? item.openingBalance
            : 0),
        0
      ),
    [ledgerItems]
  );
  const totalAdmins = workspaceUsers.filter(u => u.role === 'admin').length;
  const totalStandardUsers = workspaceUsers.filter(u => u.role === 'user').length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-[#E5E0D5]">
        <div>
          <ClickablePath variant="page" />
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#1F1D1A] tracking-tight">
            Settings
          </h1>
          <p className="text-sm text-[#6B655C] mt-1">
            Configure items and ledgers with GST and discounts, company profile, PIN lock, and data backups.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto no-print">
          <button
            type="button"
            onClick={() => (outletCtx.openPrintPreview ? outletCtx.openPrintPreview() : window.print())}
            className="px-3.5 py-2 bg-[#FFFDF9] hover:bg-[#F2EFE9] text-[#1F1D1A] border border-[#E5E0D5] font-medium text-xs rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0"
          >
            <Printer className="w-3.5 h-3.5 text-[#1B4D3E]" />
            Print Preview
          </button>
        </div>
      </div>

      {/* Primary Settings Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1 p-1 bg-[#F2EFE9] border border-[#E5E0D5] rounded-lg w-fit no-print">
        {[
          { id: 'items', label: 'Item / Ledger Creation' },
          { id: 'users', label: 'Users & Roles' },
          { id: 'company', label: 'Company Profile' },
          { id: 'security', label: 'PIN Lock' },
          { id: 'backup', label: 'Backup & Reset' },
        ].map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id as SettingsTab)}
            className={`px-3.5 py-2 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              tab === t.id
                ? 'bg-[#FFFDF9] text-[#1B4D3E] font-semibold border border-[#D5CEBF]'
                : 'text-[#6B655C] hover:text-[#1F1D1A]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB 1: ITEM / LEDGER CREATION */}
      {tab === 'items' && (
        <div className="space-y-6">
          {/* Creation Form Card */}
          <div className="bg-[#FFFDF9] rounded-xl border border-[#E5E0D5] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E5E0D5] bg-[#F8F6F1] flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-semibold text-[#1F1D1A]">
                  {editingId
                    ? `Edit ${recordKind === 'item' ? 'Item' : 'Ledger'}`
                    : 'Item / Ledger Creation'}
                </h2>
                <p className="text-xs text-[#6B655C] mt-0.5">
                  Define reusable items or ledger heads with default GST rate (Including or Excluding) and discount rules.
                </p>
              </div>

              {/* Record Kind Segmented Control */}
              <div className="inline-flex items-center gap-1 p-1 bg-[#EFECE4] border border-[#E5E0D5] rounded-lg no-print">
                <button
                  type="button"
                  onClick={() => setRecordKind('item')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    recordKind === 'item'
                      ? 'bg-[#FFFDF9] text-[#1B4D3E] font-semibold border border-[#D5CEBF]'
                      : 'text-[#6B655C] hover:text-[#1F1D1A]'
                  }`}
                >
                  Item
                </button>
                <button
                  type="button"
                  onClick={() => setRecordKind('ledger')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    recordKind === 'ledger'
                      ? 'bg-[#FFFDF9] text-[#1B4D3E] font-semibold border border-[#D5CEBF]'
                      : 'text-[#6B655C] hover:text-[#1F1D1A]'
                  }`}
                >
                  Ledger
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmitMaster} className="p-6 space-y-5">
              {/* Core Fields Row: Item/Ledger Name, GST Rate Dropdown, GST Mode (Including/Excluding) Dropdown, Discount */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-5">
                  <label
                    htmlFor="master-name"
                    className="block text-xs font-medium text-[#6B655C] mb-1.5"
                  >
                    {recordKind === 'item' ? 'Item Name' : 'Ledger Name'}
                  </label>
                  <input
                    id="master-name"
                    type="text"
                    required
                    value={itemName}
                    onChange={e => setItemName(e.target.value)}
                    placeholder={
                      recordKind === 'item'
                        ? 'e.g. Ergonomic Desk Lamp or Consulting Retainer'
                        : 'e.g. Local Sales — 18% GST or Office Supplies Ledger'
                    }
                    className={`w-full px-3 py-2 bg-[#F8F6F1] border rounded-lg text-sm text-[#1F1D1A] placeholder:text-[#968E82] focus:outline-none focus:bg-[#FFFDF9] ${
                      duplicateMaster
                        ? 'border-[#B91C1C] focus:border-[#B91C1C]'
                        : 'border-[#E5E0D5] focus:border-[#1B4D3E]'
                    }`}
                  />
                  {duplicateMaster && (
                    <p className="mt-1 text-xs text-[#B91C1C]">
                      A {duplicateMaster.kind} named &ldquo;{duplicateMaster.name}&rdquo; already exists. Duplicate names are not allowed.
                    </p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label
                    htmlFor="master-gst-rate"
                    className="block text-xs font-medium text-[#6B655C] mb-1.5"
                  >
                    GST Rate
                  </label>
                  <select
                    id="master-gst-rate"
                    value={gstRate}
                    onChange={e => setGstRate(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg text-sm font-mono tabular-nums text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E] focus:bg-[#FFFDF9]"
                  >
                    {GST_RATE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-3">
                  <label
                    htmlFor="master-gst-mode"
                    className="block text-xs font-medium text-[#6B655C] mb-1.5"
                  >
                    Tax Type (Including / Excluding)
                  </label>
                  <select
                    id="master-gst-mode"
                    value={gstMode}
                    onChange={e => setGstMode(e.target.value as GstTaxMode)}
                    className="w-full px-3 py-2 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg text-sm text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E] focus:bg-[#FFFDF9]"
                  >
                    {GST_MODE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label
                    htmlFor="master-discount"
                    className="block text-xs font-medium text-[#6B655C] mb-1.5"
                  >
                    Discount
                  </label>
                  <div className="flex">
                    <input
                      id="master-discount"
                      type="number"
                      step="0.01"
                      min="0"
                      max={discountType === 'percentage' ? 100 : undefined}
                      value={discount}
                      onChange={e => setDiscount(e.target.value)}
                      placeholder="0"
                      className="w-full min-w-0 px-3 py-2 bg-[#F8F6F1] border border-r-0 border-[#E5E0D5] rounded-l-lg text-sm font-mono tabular-nums text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E] focus:bg-[#FFFDF9]"
                    />
                    <select
                      aria-label="Discount type"
                      value={discountType}
                      onChange={e => setDiscountType(e.target.value as DiscountType)}
                      className="px-2 py-2 bg-[#EFECE4] border border-[#E5E0D5] rounded-r-lg text-xs font-mono font-medium text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E]"
                    >
                      <option value="percentage">%</option>
                      <option value="flat">{companySettings.currencySymbol || '$'}</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Optional Supporting Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label
                    htmlFor="master-opening-balance"
                    className="block text-xs font-medium text-[#6B655C] mb-1.5"
                  >
                    Opening Balance ({companySettings.currencySymbol}) — Optional
                  </label>
                  <div className="flex">
                    <input
                      id="master-opening-balance"
                      type="number"
                      step="0.01"
                      min="0"
                      value={openingBalance}
                      onChange={e => setOpeningBalance(e.target.value)}
                      placeholder="0.00"
                      className="w-full min-w-0 px-3 py-2 bg-[#F8F6F1] border border-r-0 border-[#E5E0D5] rounded-l-lg text-sm font-mono tabular-nums text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E] focus:bg-[#FFFDF9]"
                    />
                    <select
                      aria-label="Opening balance side (Debit or Credit)"
                      value={openingBalanceType}
                      onChange={e => setOpeningBalanceType(e.target.value as OpeningBalanceType)}
                      className="px-2.5 py-2 bg-[#EFECE4] border border-[#E5E0D5] rounded-r-lg text-xs font-mono font-medium text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E]"
                    >
                      <option value="dr">Dr</option>
                      <option value="cr">Cr</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="master-price"
                    className="block text-xs font-medium text-[#6B655C] mb-1.5"
                  >
                    Default Rate / Price ({companySettings.currencySymbol}) — Optional
                  </label>
                  <input
                    id="master-price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={defaultPrice}
                    onChange={e => setDefaultPrice(e.target.value)}
                    placeholder="e.g. 1000.00"
                    className="w-full px-3 py-2 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg text-sm font-mono tabular-nums text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E] focus:bg-[#FFFDF9]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="master-code"
                    className="block text-xs font-medium text-[#6B655C] mb-1.5"
                  >
                    {recordKind === 'item' ? 'HSN / SAC Code — Optional' : 'Ledger Code — Optional'}
                  </label>
                  <input
                    id="master-code"
                    type="text"
                    value={hsnOrCode}
                    onChange={e => setHsnOrCode(e.target.value)}
                    placeholder={recordKind === 'item' ? 'e.g. 998313' : 'e.g. LED-401'}
                    className="w-full px-3 py-2 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg text-sm font-mono text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E] focus:bg-[#FFFDF9]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="master-group"
                    className="block text-xs font-medium text-[#6B655C] mb-1.5"
                  >
                    Linked Account Head — Optional
                  </label>
                  <select
                    id="master-group"
                    value={accountGroup}
                    onChange={e => setAccountGroup(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg text-sm text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E] focus:bg-[#FFFDF9]"
                  >
                    {ACCOUNT_GROUPS.map(group => (
                      <option key={group} value={group}>
                        {group}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Live GST & Discount Calculation Preview */}
              <div className="p-4 rounded-lg bg-[#F8F6F1] border border-[#E5E0D5]">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-3 border-b border-[#E5E0D5] text-xs">
                  <span className="font-medium text-[#1F1D1A]">
                    Tax &amp; Discount Preview
                  </span>
                  <span className="text-[#6B655C]">
                    {isPreviewSample
                      ? `Calculated on sample rate ${formatMoney(1000)}`
                      : `Calculated on default rate ${formatMoney(parsedPriceForPreview)}`}{' '}
                    · {gstRate}% {gstMode === 'including' ? 'Including GST' : 'Excluding GST'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                  <div>
                    <div className="text-[#6B655C]">Base Price</div>
                    <div className="mt-1 font-mono tabular-nums font-medium text-[#1F1D1A]">
                      {formatMoney(pricingPreview.baseAmount)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[#6B655C]">Discount</div>
                    <div className="mt-1 font-mono tabular-nums font-medium text-[#B45309]">
                      -{formatMoney(pricingPreview.discountAmount)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[#6B655C]">Taxable Value</div>
                    <div className="mt-1 font-mono tabular-nums font-medium text-[#1F1D1A]">
                      {formatMoney(pricingPreview.taxableValue)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[#6B655C]">GST ({gstRate}%)</div>
                    <div className="mt-1 font-mono tabular-nums font-medium text-[#1B4D3E]">
                      +{formatMoney(pricingPreview.gstAmount)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[#6B655C]">Final Amount</div>
                    <div className="mt-1 font-mono tabular-nums font-semibold text-[#1F1D1A]">
                      {formatMoney(pricingPreview.finalTotal)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="pt-2 border-t border-[#E5E0D5] flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-[#6B655C]">
                  Saved items and ledgers can be picked directly when recording vouchers.
                </span>
                <div className="flex items-center gap-2">
                  {editingId && (
                    <button
                      type="button"
                      onClick={resetItemForm}
                      className="px-4 py-2 text-xs font-medium text-[#6B655C] hover:text-[#1F1D1A] hover:bg-[#F2EFE9] rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      Cancel Edit
                    </button>
                  )}
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#1B4D3E] hover:bg-[#143B2F] text-[#FFFDF9] text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    {editingId ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                    {editingId
                      ? `Update ${recordKind === 'item' ? 'Item' : 'Ledger'}`
                      : `Save ${recordKind === 'item' ? 'Item' : 'Ledger'}`}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Saved Items & Ledgers Register */}
          <div className="bg-[#FFFDF9] rounded-xl border border-[#E5E0D5] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E5E0D5] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F8F6F1]">
              <div>
                <h2 className="font-display text-base font-semibold text-[#1F1D1A]">
                  Saved Items &amp; Ledgers
                </h2>
                <div className="text-xs text-[#6B655C] mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="font-mono tabular-nums">{itemCount} items</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">{ledgerCount} ledgers</span>
                  {(totalOpeningDr > 0 || totalOpeningCr > 0) && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums text-[#1F1D1A]">
                        Opening Dr {formatMoney(totalOpeningDr)} / Cr {formatMoney(totalOpeningCr)}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 no-print">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[#968E82] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={masterSearch}
                    onChange={e => setMasterSearch(e.target.value)}
                    placeholder="Filter items or ledgers..."
                    className="pl-8 pr-3 py-1.5 bg-[#FFFDF9] border border-[#E5E0D5] rounded-lg text-xs text-[#1F1D1A] placeholder:text-[#968E82] focus:outline-none focus:border-[#1B4D3E] w-52"
                  />
                </div>

                <div className="inline-flex items-center gap-1 p-1 bg-[#EFECE4] border border-[#E5E0D5] rounded-lg">
                  {(
                    [
                      { id: 'all', label: 'All' },
                      { id: 'item', label: 'Items' },
                      { id: 'ledger', label: 'Ledgers' },
                    ] as const
                  ).map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setMasterFilter(opt.id)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        masterFilter === opt.id
                          ? 'bg-[#FFFDF9] text-[#1B4D3E] font-semibold'
                          : 'text-[#6B655C] hover:text-[#1F1D1A]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#E5E0D5] bg-[#F8F6F1]/70 text-xs font-medium text-[#6B655C]">
                    <th className="py-3 px-4">Item / Ledger Name</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">GST Rate &amp; Mode</th>
                    <th className="py-3 px-4 text-right">Discount</th>
                    <th className="py-3 px-4 text-right">Default Rate</th>
                    <th className="py-3 px-4 text-right">Opening Balance</th>
                    <th className="py-3 px-4 text-right no-print">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E0D5] text-[#1F1D1A]">
                  {filteredMasters.map(entry => (
                    <tr
                      key={entry.id}
                      className={`hover:bg-[#F8F6F1]/60 transition-colors ${
                        editingId === entry.id ? 'bg-[#EBF3F0]/50' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-[#1F1D1A]">{entry.name}</div>
                        {(entry.hsnOrCode || entry.accountGroup) && (
                          <div className="text-xs text-[#6B655C] mt-0.5 flex items-center gap-1.5">
                            {entry.hsnOrCode && (
                              <span className="font-mono text-[11px]">{entry.hsnOrCode}</span>
                            )}
                            {entry.hsnOrCode && entry.accountGroup && (
                              <span aria-hidden="true">·</span>
                            )}
                            {entry.accountGroup && <span>{entry.accountGroup}</span>}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-[#6B655C] capitalize whitespace-nowrap">
                        {entry.kind}
                      </td>
                      <td className="py-3.5 px-4 text-xs whitespace-nowrap">
                        <span className="font-mono tabular-nums font-semibold text-[#1B4D3E]">
                          {entry.gstRate}%
                        </span>
                        <span className="text-[#968E82] mx-1.5" aria-hidden="true">
                          ·
                        </span>
                        <span className="text-[#6B655C]">
                          {entry.gstMode === 'including' ? 'Including GST' : 'Excluding GST'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums text-xs text-[#1F1D1A] whitespace-nowrap">
                        {entry.discount > 0
                          ? entry.discountType === 'percentage'
                            ? `${entry.discount}%`
                            : formatMoney(entry.discount)
                          : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums text-xs font-medium text-[#1F1D1A] whitespace-nowrap">
                        {entry.defaultPrice !== undefined ? formatMoney(entry.defaultPrice) : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums text-xs whitespace-nowrap">
                        {entry.openingBalance !== undefined && entry.openingBalance > 0 ? (
                          <span className="font-medium text-[#1F1D1A]">
                            {formatMoney(entry.openingBalance)}{' '}
                            <span
                              className={
                                entry.openingBalanceType === 'cr'
                                  ? 'text-[#1B4D3E] font-semibold'
                                  : 'text-[#6B655C] font-semibold'
                              }
                            >
                              {entry.openingBalanceType === 'cr' ? 'Cr' : 'Dr'}
                            </span>
                          </span>
                        ) : (
                          <span className="text-[#968E82]">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap no-print">
                        {permissions.canDelete && confirmDeleteId === entry.id ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                deleteLedgerItem(entry.id);
                                if (editingId === entry.id) resetItemForm();
                                setConfirmDeleteId(null);
                                toast.success('Master entry deleted.');
                              }}
                              className="px-2 py-1 bg-[#B91C1C] text-white text-xs font-medium rounded-md cursor-pointer"
                            >
                              Delete
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1 text-xs text-[#6B655C] hover:text-[#1F1D1A] cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(entry)}
                              className="p-1.5 text-[#6B655C] hover:text-[#1B4D3E] hover:bg-[#F2EFE9] rounded-md transition-colors cursor-pointer"
                              title="Edit entry"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            {permissions.canDelete && (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(entry.id)}
                                className="p-1.5 text-[#6B655C] hover:text-[#B91C1C] hover:bg-[#FEF2F2] rounded-md transition-colors cursor-pointer"
                                title="Delete entry"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredMasters.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 px-4 text-center text-sm text-[#6B655C]">
                        No items or ledgers match this filter yet. Create one using the form above.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MULTI-USER & ROLES */}
      {tab === 'users' && (
        <div className="space-y-6">
          {/* Active Session Summary */}
          <div className="bg-[#FFFDF9] rounded-xl border border-[#E5E0D5] px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <Shield className="w-4 h-4 text-[#1B4D3E] mt-0.5 shrink-0" />
              <div>
                <div className="text-sm font-semibold text-[#1F1D1A]">
                  Active Access:{' '}
                  <span className="text-[#1B4D3E]">
                    {activeRole === 'admin' ? 'Admin' : 'User'}
                  </span>
                </div>
                <div className="text-xs text-[#6B655C] mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span>{activeUser.name}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono">{activeUser.email}</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {activeRole === 'admin'
                      ? 'Create, Edit, Print, Export, Delete & User Management'
                      : 'Create, Edit, Print & Export (Delete restricted)'}
                  </span>
                </div>
              </div>
            </div>

            {isPreviewingRole && (
              <button
                type="button"
                onClick={() => {
                  setActingUserId(null);
                  toast.success(`Switched back to Admin (${realUser.email}).`);
                }}
                className="px-3.5 py-2 bg-[#1B4D3E] hover:bg-[#143B2F] text-[#FFFDF9] text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 self-start sm:self-auto"
              >
                Return to Admin
              </button>
            )}
          </div>

          {/* Role Permission Matrix */}
          <div className="bg-[#FFFDF9] rounded-xl border border-[#E5E0D5] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E5E0D5] bg-[#F8F6F1]">
              <h2 className="font-display text-base font-semibold text-[#1F1D1A]">
                Role Permission Matrix
              </h2>
              <p className="text-xs text-[#6B655C] mt-0.5">
                Standard users can record, edit, print, and export ledger data. Delete actions and user management are reserved for Admins.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E5E0D5] bg-[#F8F6F1]/70 font-medium text-[#6B655C]">
                    <th className="py-3 px-6">Action / Permission</th>
                    <th className="py-3 px-6">User</th>
                    <th className="py-3 px-6">Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E0D5] text-[#1F1D1A]">
                  {[
                    { label: 'Make new entries (vouchers, journal, contra, bills, items, parties)', user: true, admin: true },
                    { label: 'Edit existing entries, bills, items & directory records', user: true, admin: true },
                    { label: 'Print & Print Preview ledger views and reports', user: true, admin: true },
                    { label: 'Export data (PDF, CSV, GST JSON/CSV, Google Sheets, JSON backup)', user: true, admin: true },
                    { label: 'Delete entries, bills, items & parties', user: false, admin: true },
                    { label: 'Manage users, assign roles & reset workspace data', user: false, admin: true },
                  ].map(row => (
                    <tr key={row.label} className="hover:bg-[#F8F6F1]/60">
                      <td className="py-3 px-6 font-medium text-[#1F1D1A]">{row.label}</td>
                      <td className="py-3 px-6 whitespace-nowrap">
                        <span className={row.user ? 'text-[#157347] font-semibold' : 'text-[#968E82]'}>
                          {row.user ? 'Allowed' : 'Not allowed'}
                        </span>
                      </td>
                      <td className="py-3 px-6 whitespace-nowrap">
                        <span className={row.admin ? 'text-[#157347] font-semibold' : 'text-[#968E82]'}>
                          {row.admin ? 'Allowed' : 'Not allowed'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add / Edit Workspace User Form (Admin-only) */}
          {isRealAdmin ? (
            <div className="bg-[#FFFDF9] rounded-xl border border-[#E5E0D5] overflow-hidden">
              <div className="px-6 py-4 border-b border-[#E5E0D5] bg-[#F8F6F1]">
                <h2 className="font-display text-lg font-semibold text-[#1F1D1A]">
                  {editingUserId ? 'Edit Workspace Member' : 'Add Workspace Member'}
                </h2>
                <p className="text-xs text-[#6B655C] mt-0.5">
                  Assign each team member's Google sign-in email to either User or Admin access.
                </p>
              </div>

              <form onSubmit={handleSubmitUser} className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-4">
                    <label htmlFor="user-name" className="block text-xs font-medium text-[#6B655C] mb-1.5">
                      Full Name
                    </label>
                    <input
                      id="user-name"
                      type="text"
                      required
                      value={userName}
                      onChange={e => setUserName(e.target.value)}
                      placeholder="e.g. Priya Sharma"
                      className="w-full px-3 py-2 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg text-sm text-[#1F1D1A] placeholder:text-[#968E82] focus:outline-none focus:border-[#1B4D3E] focus:bg-[#FFFDF9]"
                    />
                  </div>

                  <div className="md:col-span-4">
                    <label htmlFor="user-email" className="block text-xs font-medium text-[#6B655C] mb-1.5">
                      Email Address
                    </label>
                    <input
                      id="user-email"
                      type="email"
                      required
                      value={userEmail}
                      onChange={e => setUserEmail(e.target.value)}
                      placeholder="name@company.com"
                      className="w-full px-3 py-2 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg text-sm font-mono text-[#1F1D1A] placeholder:text-[#968E82] focus:outline-none focus:border-[#1B4D3E] focus:bg-[#FFFDF9]"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label htmlFor="user-role" className="block text-xs font-medium text-[#6B655C] mb-1.5">
                      Role
                    </label>
                    <select
                      id="user-role"
                      value={userRole}
                      onChange={e => setUserRole(e.target.value as UserRole)}
                      className="w-full px-3 py-2 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg text-sm text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E] focus:bg-[#FFFDF9]"
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label htmlFor="user-status" className="block text-xs font-medium text-[#6B655C] mb-1.5">
                      Status
                    </label>
                    <select
                      id="user-status"
                      value={userStatus}
                      onChange={e => setUserStatus(e.target.value as 'active' | 'inactive')}
                      className="w-full px-3 py-2 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg text-sm text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E] focus:bg-[#FFFDF9]"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#E5E0D5] flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs text-[#6B655C]">
                    {userRole === 'admin'
                      ? 'Admin: Make new entry, edit, print, export, delete, and manage users.'
                      : 'User: Make new entry, edit, print, and export (cannot delete).'}
                  </span>
                  <div className="flex items-center gap-2">
                    {editingUserId && (
                      <button
                        type="button"
                        onClick={resetUserForm}
                        className="px-4 py-2 text-xs font-medium text-[#6B655C] hover:text-[#1F1D1A] hover:bg-[#F2EFE9] rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        Cancel Edit
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={userSubmitting}
                      className="px-5 py-2 bg-[#1B4D3E] hover:bg-[#143B2F] disabled:opacity-50 text-[#FFFDF9] text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                    >
                      {editingUserId ? <Check className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
                      {editingUserId ? 'Update Member' : 'Add Member'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-[#FFFDF9] rounded-xl border border-[#E5E0D5] px-6 py-4 text-xs text-[#6B655C]">
              You are signed in with <span className="font-semibold text-[#1F1D1A]">User</span> access. Contact a workspace Admin to add team members or change role assignments.
            </div>
          )}

          {/* Team Members Directory Table */}
          <div className="bg-[#FFFDF9] rounded-xl border border-[#E5E0D5] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E5E0D5] bg-[#F8F6F1] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-base font-semibold text-[#1F1D1A]">
                  Workspace Members
                </h2>
                <div className="text-xs text-[#6B655C] mt-0.5 flex items-center gap-2">
                  <span className="font-mono tabular-nums">{totalAdmins} admin{totalAdmins === 1 ? '' : 's'}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">{totalStandardUsers} user{totalStandardUsers === 1 ? '' : 's'}</span>
                </div>
              </div>

              <div className="relative no-print">
                <Search className="w-3.5 h-3.5 text-[#968E82] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  placeholder="Search members..."
                  className="pl-8 pr-3 py-1.5 bg-[#FFFDF9] border border-[#E5E0D5] rounded-lg text-xs text-[#1F1D1A] placeholder:text-[#968E82] focus:outline-none focus:border-[#1B4D3E] w-56"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#E5E0D5] bg-[#F8F6F1]/70 text-xs font-medium text-[#6B655C]">
                    <th className="py-3 px-4">Member</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Permissions</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right no-print">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E0D5] text-[#1F1D1A]">
                  {filteredUsers.map(member => {
                    const isLastActiveAdmin =
                      member.role === 'admin' && member.status === 'active' && activeAdminCount <= 1;
                    const isCurrentlyActive = activeUser.id === member.id;
                    const isSignedInSelf = realUser.email.toLowerCase() === member.email.toLowerCase();

                    return (
                      <tr
                        key={member.id}
                        className={`hover:bg-[#F8F6F1]/60 transition-colors ${
                          isCurrentlyActive ? 'bg-[#EBF3F0]/40' : ''
                        }`}
                      >
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-[#1F1D1A] flex items-center gap-2">
                            <span>{member.name}</span>
                            {isSignedInSelf && (
                              <span className="text-[11px] font-medium text-[#1B4D3E]">· You</span>
                            )}
                            {isPreviewingRole && isCurrentlyActive && (
                              <span className="text-[11px] font-medium text-[#B45309]">· Active Preview</span>
                            )}
                          </div>
                          <div className="text-xs font-mono text-[#6B655C] mt-0.5">{member.email}</div>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {isRealAdmin ? (
                            <select
                              aria-label={`Role for ${member.name}`}
                              value={member.role}
                              disabled={isLastActiveAdmin}
                              onChange={e => handleInlineRoleChange(member, e.target.value as UserRole)}
                              className="px-2.5 py-1 bg-[#F8F6F1] border border-[#E5E0D5] rounded-md text-xs font-medium text-[#1F1D1A] disabled:opacity-60 focus:outline-none focus:border-[#1B4D3E]"
                            >
                              <option value="user">User</option>
                              <option value="admin">Admin</option>
                            </select>
                          ) : (
                            <span className="text-xs font-medium text-[#1F1D1A] capitalize">
                              {member.role}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-[#6B655C]">
                          {member.role === 'admin'
                            ? 'New Entry · Edit · Print · Export · Delete'
                            : 'New Entry · Edit · Print · Export'}
                        </td>
                        <td className="py-3.5 px-4 text-xs whitespace-nowrap">
                          <span
                            className={
                              member.status === 'active'
                                ? 'text-[#157347] font-medium'
                                : 'text-[#968E82] font-medium'
                            }
                          >
                            {member.status === 'active' ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap no-print">
                          {isRealAdmin ? (
                            confirmDeleteUserId === member.id ? (
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteUser(member)}
                                  className="px-2 py-1 bg-[#B91C1C] text-white text-xs font-medium rounded-md cursor-pointer"
                                >
                                  Remove
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteUserId(null)}
                                  className="px-2 py-1 text-xs text-[#6B655C] hover:text-[#1F1D1A] cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1.5">
                                {member.status === 'active' && !isCurrentlyActive && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActingUserId(member.id);
                                      toast.success(
                                        `Switched active view to ${member.name} (${member.role === 'admin' ? 'Admin' : 'User'}).`
                                      );
                                    }}
                                    className="px-2.5 py-1 bg-[#F8F6F1] hover:bg-[#EAE5DB] text-[#1F1D1A] border border-[#E5E0D5] text-xs font-medium rounded-md transition-colors inline-flex items-center gap-1 cursor-pointer"
                                    title={`Preview workspace as ${member.role}`}
                                  >
                                    <Eye className="w-3 h-3 text-[#1B4D3E]" />
                                    Switch
                                  </button>
                                )}
                                {isPreviewingRole && isCurrentlyActive && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActingUserId(null);
                                      toast.success('Returned to Admin access.');
                                    }}
                                    className="px-2.5 py-1 bg-[#EBF3F0] hover:bg-[#1B4D3E] text-[#1B4D3E] hover:text-[#FFFDF9] border border-[#C7DFD6] text-xs font-medium rounded-md transition-colors cursor-pointer"
                                  >
                                    Return to Admin
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleStartEditUser(member)}
                                  className="p-1.5 text-[#6B655C] hover:text-[#1B4D3E] hover:bg-[#F2EFE9] rounded-md transition-colors cursor-pointer"
                                  title="Edit member"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                {!isLastActiveAdmin && !isSignedInSelf && (
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteUserId(member.id)}
                                    className="p-1.5 text-[#6B655C] hover:text-[#B91C1C] hover:bg-[#FEF2F2] rounded-md transition-colors cursor-pointer"
                                    title="Remove member"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            )
                          ) : (
                            <span className="text-xs text-[#968E82]">View only</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-10 px-4 text-center text-sm text-[#6B655C]">
                        No team members match this search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: COMPANY PROFILE */}
      {tab === 'company' && (
        <div className="bg-[#FFFDF9] rounded-xl border border-[#E5E0D5] max-w-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E5E0D5] bg-[#F8F6F1]">
            <h2 className="font-display text-lg font-semibold text-[#1F1D1A]">
              Company Profile
            </h2>
            <p className="text-xs text-[#6B655C] mt-0.5">
              Displayed on ledger letterheads, print previews, and exported financial reports.
            </p>
          </div>
          <form onSubmit={handleSaveCompany} className="p-6 space-y-4">
            <div>
              <label htmlFor="set-name" className="block text-xs font-medium text-[#6B655C] mb-1.5">
                Ledger / Company Name
              </label>
              <input
                id="set-name"
                type="text"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                placeholder="Tunzua"
                className="w-full px-3 py-2 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg text-sm text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E] focus:bg-[#FFFDF9]"
              />
            </div>

            <div>
              <label htmlFor="set-sub" className="block text-xs font-medium text-[#6B655C] mb-1.5">
                Subtitle / Note
              </label>
              <input
                id="set-sub"
                type="text"
                value={subtitle}
                onChange={e => setSubtitle(e.target.value)}
                placeholder="Simple Double-Entry Ledger"
                className="w-full px-3 py-2 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg text-sm text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E] focus:bg-[#FFFDF9]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="set-curr" className="block text-xs font-medium text-[#6B655C] mb-1.5">
                  Currency Symbol
                </label>
                <select
                  id="set-curr"
                  value={currencySymbol}
                  onChange={e => setCurrencySymbol(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg text-sm text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E] focus:bg-[#FFFDF9]"
                >
                  {CURRENCY_OPTIONS.map(c => (
                    <option key={c.symbol} value={c.symbol}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="set-fy" className="block text-xs font-medium text-[#6B655C] mb-1.5">
                  Fiscal Year Starts
                </label>
                <select
                  id="set-fy"
                  value={fiscalYearStart}
                  onChange={e => setFiscalYearStart(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg text-sm text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E] focus:bg-[#FFFDF9]"
                >
                  {MONTHS.map(m => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-3 border-t border-[#E5E0D5] flex justify-end">
              <button
                type="submit"
                className="px-5 py-2 bg-[#1B4D3E] hover:bg-[#143B2F] text-[#FFFDF9] text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: SECURITY / PIN LOCK */}
      {tab === 'security' && (
        <div className="bg-[#FFFDF9] rounded-xl border border-[#E5E0D5] max-w-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E5E0D5] bg-[#F8F6F1]">
            <h2 className="font-display text-lg font-semibold text-[#1F1D1A]">
              Workspace PIN Lock
            </h2>
            <p className="text-xs text-[#6B655C] mt-0.5">
              Protect your local ledger screen with an optional 4-digit PIN.
            </p>
          </div>

          <div className="p-6 space-y-4">
            {hasPasscode ? (
              <div className="p-4 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg space-y-3">
                <div className="text-xs font-medium text-[#157347]">
                  4-digit PIN lock is currently active.
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={lockNow}
                    className="px-4 py-2 bg-[#1B4D3E] hover:bg-[#143B2F] text-[#FFFDF9] text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    Lock Screen Now
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      removePasscode();
                      toast.success('Workspace PIN removed.');
                    }}
                    className="px-4 py-2 bg-[#FFFDF9] hover:bg-[#FEF2F2] text-[#B91C1C] border border-[#E5E0D5] text-xs font-medium rounded-lg transition-colors cursor-pointer"
                  >
                    Remove PIN
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSetPin} className="space-y-3">
                <div>
                  <label htmlFor="set-pin" className="block text-xs font-medium text-[#6B655C] mb-1.5">
                    Choose a 4-Digit PIN
                  </label>
                  <input
                    id="set-pin"
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={pinInput}
                    onChange={e => setPinInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••"
                    className="w-40 px-3 py-2 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg text-sm font-mono tracking-[0.4em] text-center text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E] focus:bg-[#FFFDF9]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={pinInput.length !== 4}
                  className="px-4 py-2 bg-[#1B4D3E] hover:bg-[#143B2F] disabled:opacity-40 text-[#FFFDF9] text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Enable PIN Lock
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: BACKUP & RESET */}
      {tab === 'backup' && (
        <div className="bg-[#FFFDF9] rounded-xl border border-[#E5E0D5] max-w-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E5E0D5] bg-[#F8F6F1]">
            <h2 className="font-display text-lg font-semibold text-[#1F1D1A]">
              Backup &amp; Reset
            </h2>
            <p className="text-xs text-[#6B655C] mt-0.5">
              Export portable JSON backups, sync with Google Sheets, or reset sample records.
            </p>
          </div>

          <div className="p-6 space-y-5">
            <div className="space-y-2.5">
              <h3 className="text-xs font-semibold text-[#1F1D1A]">Portable JSON Backup</h3>
              <p className="text-xs text-[#6B655C] leading-relaxed">
                Export all ledger entries, item and ledger masters, recurring bills, fixed assets, parties, and settings into a single JSON file, or restore a previous backup.
              </p>
              <div className="flex flex-wrap gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleDownloadBackup}
                  className="px-4 py-2 bg-[#1B4D3E] hover:bg-[#143B2F] text-[#FFFDF9] text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Backup
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-[#F8F6F1] hover:bg-[#EAE5DB] text-[#1F1D1A] border border-[#E5E0D5] text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Restore JSON File
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json,.json"
                  onChange={handleImportFile}
                  className="hidden"
                />
              </div>
            </div>

            {outletCtx.openSheetsSync && (
              <div className="pt-4 border-t border-[#E5E0D5] space-y-2.5">
                <h3 className="text-xs font-semibold text-[#1F1D1A]">Google Sheets Cloud Backup</h3>
                <p className="text-xs text-[#6B655C] leading-relaxed">
                  Save your ledger, recurring bills, fixed assets, and partner summary into a Google Sheet linked to your Google email.
                </p>
                <button
                  type="button"
                  onClick={outletCtx.openSheetsSync}
                  className="px-4 py-2 bg-[#EBF3F0] hover:bg-[#1B4D3E] text-[#1B4D3E] hover:text-[#FFFDF9] border border-[#C7DFD6] text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  Open Google Sheet Sync
                </button>
              </div>
            )}

            <div className="pt-4 border-t border-[#E5E0D5] space-y-2.5">
              <h3 className="text-xs font-semibold text-[#B91C1C]">Clear All Demo Data (Start Blank)</h3>
              <p className="text-xs text-[#6B655C] leading-relaxed">
                Permanently removes all transactions, recurring bills, items/ledgers, fixed assets, partners, and sundry parties so you can start with an empty ledger. Your company profile and user roles are kept.
              </p>
              {!permissions.canDelete ? (
                <p className="text-xs text-[#968E82]">
                  Only Admins can clear workspace data.
                </p>
              ) : !confirmClearAll ? (
                <button
                  type="button"
                  onClick={() => setConfirmClearAll(true)}
                  className="px-4 py-2 bg-[#B91C1C] hover:bg-[#991B1B] text-[#FFFDF9] text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear All Demo Data
                </button>
              ) : (
                <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-lg flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-medium text-[#B91C1C]">
                    Remove all transactions, bills, items, and parties? This starts a clean blank ledger.
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmClearAll(false)}
                      className="px-3 py-1.5 bg-[#FFFDF9] text-[#1F1D1A] border border-[#E5E0D5] text-xs font-medium rounded-md cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleClearAllData}
                      className="px-3 py-1.5 bg-[#B91C1C] hover:bg-[#991B1B] text-white text-xs font-semibold rounded-md cursor-pointer"
                    >
                      Yes, Clear Everything
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-[#E5E0D5] space-y-2.5">
              <h3 className="text-xs font-semibold text-[#1F1D1A]">Restore Sample Ledger</h3>
              <p className="text-xs text-[#6B655C] leading-relaxed">
                Replaces current records with the built-in sample demo entries. Download a backup first if you want to keep your records.
              </p>
              {!permissions.canDelete ? (
                <p className="text-xs text-[#968E82]">
                  Only Admins can restore sample workspace data.
                </p>
              ) : !confirmReset ? (
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  className="px-4 py-2 bg-[#FFFDF9] hover:bg-[#FEF2F2] text-[#B91C1C] border border-[#E5E0D5] text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Restore Sample Data
                </button>
              ) : (
                <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-lg flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-medium text-[#B91C1C]">
                    Confirm restore? Current changes will be replaced with sample records.
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmReset(false)}
                      className="px-3 py-1.5 bg-[#FFFDF9] text-[#1F1D1A] border border-[#E5E0D5] text-xs font-medium rounded-md cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleResetWorkspace}
                      className="px-3 py-1.5 bg-[#B91C1C] hover:bg-[#991B1B] text-white text-xs font-semibold rounded-md cursor-pointer"
                    >
                      Yes, Restore Sample
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
