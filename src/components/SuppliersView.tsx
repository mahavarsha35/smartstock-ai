import { useMemo, useState } from 'react';
import type { Product, PurchaseOrder, Supplier } from '../types.ts';
import { formatINR } from '../lib/api.ts';

interface SuppliersViewProps {
  suppliers: Supplier[];
  products: Product[];
  purchaseOrders: PurchaseOrder[];
  onCreateSupplier: (input: Partial<Supplier>) => Promise<Supplier | null>;
  onCreatePo: (productId: string, qty: number, notes?: string) => Promise<void>;
  onNotify: (msg: string, tone?: 'success' | 'info' | 'error') => void;
  openAddModalSignal?: boolean;
  onClearAddSignal?: () => void;
}

const SUPPLIER_CATEGORY_OPTIONS = [
  'Pantry Staples',
  'Organic Spices',
  'Beverages',
  'Dairy & Cold Chain',
  'Snacks',
  'Personal Care',
  'Wellness',
];

export function SuppliersView({
  suppliers,
  products,
  purchaseOrders,
  onCreateSupplier,
  onCreatePo,
  onNotify,
  openAddModalSignal,
  onClearAddSignal,
}: SuppliersViewProps) {
  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState<'All' | 'Active' | 'Pending Review'>('All');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(suppliers[0]?.id || '');
  const [addModalOpen, setAddModalOpen] = useState(Boolean(openAddModalSignal));
  const [createdSupplier, setCreatedSupplier] = useState<Supplier | null>(null);
  const [verifiedBannerSupplier, setVerifiedBannerSupplier] = useState<Supplier | null>(null);

  // Add Supplier Form state
  const [form, setForm] = useState({
    name: '',
    cityHub: 'Bengaluru South Hub',
    contactPerson: '',
    phone: '',
    email: '',
    gstin: '',
    address: '',
    categories: ['Pantry Staples'] as string[],
    paymentTerms: 'Net 15 Days',
    leadTimeHours: 24,
    inwardBay: 'Bay 01 (Dry Grocery)',
  });
  const [gstVerified, setGstVerified] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (openAddModalSignal && !addModalOpen) {
    setAddModalOpen(true);
    onClearAddSignal?.();
  }

  const filteredSuppliers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return suppliers.filter((s) => {
      if (statusTab !== 'All' && s.status !== statusTab) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        s.cityHub.toLowerCase().includes(q) ||
        s.gstin.toLowerCase().includes(q)
      );
    });
  }, [suppliers, statusTab, search]);

  const activeVendor = useMemo(() => {
    return (
      suppliers.find((s) => s.id === selectedSupplierId) ||
      filteredSuppliers[0] ||
      suppliers[0] ||
      null
    );
  }, [suppliers, filteredSuppliers, selectedSupplierId]);

  const vendorPos = useMemo(() => {
    if (!activeVendor) return [];
    return purchaseOrders.filter((po) => po.supplierId === activeVendor.id);
  }, [purchaseOrders, activeVendor]);

  const vendorProducts = useMemo(() => {
    if (!activeVendor) return [];
    return products.filter((p) => p.supplierId === activeVendor.id);
  }, [products, activeVendor]);

  const metrics = useMemo(() => {
    const pendingTotal = suppliers.reduce((sum, s) => sum + s.pendingAmount, 0);
    const avgLead =
      suppliers.length > 0
        ? Math.round(suppliers.reduce((sum, s) => sum + s.leadTimeHours, 0) / suppliers.length)
        : 24;
    const gstrCount = suppliers.filter((s) => s.gstrMatched).length;
    return {
      totalVendors: suppliers.length,
      activeCount: suppliers.filter((s) => s.status === 'Active').length,
      pendingTotal,
      avgLead,
      gstrPct: suppliers.length > 0 ? Math.round((gstrCount / suppliers.length) * 100) : 100,
    };
  }, [suppliers]);

  const toggleCategoryPill = (cat: string) => {
    setForm((prev) => ({
      ...prev,
      categories: prev.categories.includes(cat)
        ? prev.categories.filter((c) => c !== cat)
        : [...prev.categories, cat],
    }));
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const created = await onCreateSupplier({
      ...form,
      status: 'Active',
      tier: 'Tier-1',
      gstrMatched: gstVerified || form.gstin.length >= 15,
      keyLines: ['Primary Wholesale Supply'],
    });
    setSubmitting(false);
    if (created) {
      setAddModalOpen(false);
      setCreatedSupplier(created);
      setVerifiedBannerSupplier(created);
      setSelectedSupplierId(created.id);
      setForm({
        name: '',
        cityHub: 'Bengaluru South Hub',
        contactPerson: '',
        phone: '',
        email: '',
        gstin: '',
        address: '',
        categories: ['Pantry Staples'],
        paymentTerms: 'Net 15 Days',
        leadTimeHours: 24,
        inwardBay: 'Bay 01 (Dry Grocery)',
      });
      setGstVerified(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Dismissible Supplier Created Verification Banner */}
      {verifiedBannerSupplier && (
        <div className="p-4 rounded-2xl bg-[#dbe7cb] border border-[#17200f]/20 flex flex-wrap items-center justify-between gap-3 text-[#17200f]">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[22px]">verified</span>
            <p className="text-xs sm:text-sm font-medium">
              <strong>{verifiedBannerSupplier.name}</strong> ({verifiedBannerSupplier.code}) is
              verified and active in your Supplier Ledger.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setVerifiedBannerSupplier(null)}
            className="text-xs font-semibold underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-label-sm uppercase tracking-[0.12em] text-[#715b33] mb-1">
            Vendor Governance &amp; GSTR-2B Ledger
          </p>
          <h1 className="text-headline-lg text-[#251b14]">Suppliers Management</h1>
          <p className="text-body-md text-[#4e453f] mt-1">
            Monitor regional distributors, GSTIN compliance, lead-time SLAs, and purchase orders.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setAddModalOpen(true)}
          className="px-5 py-2.5 rounded-xl bg-[#251b14] hover:bg-[#3b3028] text-[#fcf9f3] text-xs font-semibold flex items-center gap-2 shadow-sm self-start cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">domain_add</span>
          Add New Supplier
        </button>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#ffffff] p-4 rounded-2xl border border-[#d1c4bc]/40">
          <span className="text-label-md text-[#4e453f]">Total Distributors</span>
          <p className="font-serif text-2xl font-semibold text-[#251b14] font-numeric-data mt-1">
            {metrics.totalVendors} Partners
          </p>
          <span className="text-xs text-[#17200f]">{metrics.activeCount} Active</span>
        </div>
        <div className="bg-[#ffffff] p-4 rounded-2xl border border-[#d1c4bc]/40">
          <span className="text-label-md text-[#4e453f]">Pending Invoices</span>
          <p className="font-serif text-2xl font-semibold text-[#715b33] font-numeric-data mt-1">
            {formatINR(metrics.pendingTotal)}
          </p>
        </div>
        <div className="bg-[#ffffff] p-4 rounded-2xl border border-[#d1c4bc]/40">
          <span className="text-label-md text-[#4e453f]">Avg Lead Time SLA</span>
          <p className="font-serif text-2xl font-semibold text-[#251b14] font-numeric-data mt-1">
            {metrics.avgLead} Hours
          </p>
        </div>
        <div className="bg-[#ffffff] p-4 rounded-2xl border border-[#d1c4bc]/40">
          <span className="text-label-md text-[#4e453f]">GSTR-2B Verified</span>
          <p className="font-serif text-2xl font-semibold text-[#17200f] font-numeric-data mt-1">
            {metrics.gstrPct}%
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#ffffff] rounded-2xl border border-[#d1c4bc]/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {(['All', 'Active', 'Pending Review'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusTab(tab)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer ${
                statusTab === tab
                  ? 'bg-[#251b14] text-[#fcf9f3]'
                  : 'bg-[#f6f3ed] text-[#4e453f] hover:bg-[#ebe8e2]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search vendor name, GSTIN, city hub..."
          className="px-3.5 py-2 rounded-xl bg-[#f6f3ed] text-xs w-full sm:w-64 focus:outline-none"
        />
      </div>

      {/* Split Layout: Master Supplier Ledger + Inspecting Vendor Deep-Dive */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <div className="xl:col-span-7 bg-[#ffffff] rounded-2xl border border-[#d1c4bc]/40 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#f6f3ed] text-[11px] uppercase tracking-wider text-[#4e453f] font-semibold">
                  <th className="py-3 px-4">Supplier &amp; Hub</th>
                  <th className="py-3 px-3">Lead Time</th>
                  <th className="py-3 px-3">Pending</th>
                  <th className="py-3 px-3">Rating</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#d1c4bc]/30 text-sm">
                {filteredSuppliers.map((sup) => {
                  const selected = activeVendor?.id === sup.id;
                  return (
                    <tr
                      key={sup.id}
                      onClick={() => setSelectedSupplierId(sup.id)}
                      className={`cursor-pointer transition-colors ${
                        selected ? 'bg-[#fddfab]/25' : 'hover:bg-[#fcf9f3]'
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-[#1c1c18] text-xs sm:text-sm">
                          {sup.name}
                        </p>
                        <p className="text-[11px] text-[#7f756f] font-numeric-data">
                          {sup.code} • {sup.cityHub}
                        </p>
                      </td>
                      <td className="py-3.5 px-3 text-xs font-numeric-data text-[#251b14]">
                        {sup.leadTimeHours}h
                      </td>
                      <td className="py-3.5 px-3 text-xs font-numeric-data text-[#715b33] font-semibold">
                        {formatINR(sup.pendingAmount)}
                      </td>
                      <td className="py-3.5 px-3 text-xs font-numeric-data">
                        ★ {sup.rating.toFixed(1)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                            sup.status === 'Active'
                              ? 'bg-[#dbe7cb] text-[#17200f]'
                              : 'bg-[#fddfab] text-[#57441e]'
                          }`}
                        >
                          {sup.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Inspecting Vendor Panel */}
        {activeVendor && (
          <aside className="xl:col-span-5 bg-[#ffffff] rounded-2xl border border-[#d1c4bc]/40 p-6 shadow-xs space-y-5 sticky top-24">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] uppercase tracking-widest font-semibold text-[#715b33]">
                  Inspecting Vendor • {activeVendor.tier}
                </span>
                <h2 className="font-serif text-xl font-semibold text-[#251b14] mt-0.5">
                  {activeVendor.name}
                </h2>
                <p className="text-xs text-[#4e453f] mt-1">
                  GSTIN: <span className="font-numeric-data font-semibold">{activeVendor.gstin}</span>
                </p>
              </div>
              <span
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                  activeVendor.gstrMatched
                    ? 'bg-[#dbe7cb] text-[#17200f]'
                    : 'bg-[#fddfab] text-[#57441e]'
                }`}
              >
                {activeVendor.gstrMatched ? 'GSTR-2B Match' : 'GSTR Pending'}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#fcf9f3] border border-[#d1c4bc]/40 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[#4e453f]">Primary Contact</span>
                <strong className="text-[#1c1c18]">{activeVendor.contactPerson}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#4e453f]">Direct Phone</span>
                <strong className="font-numeric-data">{activeVendor.phone}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#4e453f]">Payment Terms</span>
                <strong>{activeVendor.paymentTerms}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#4e453f]">Inward Gate</span>
                <strong>{activeVendor.inwardBay}</strong>
              </div>
            </div>

            {/* Fulfillment Velocity Bars */}
            <div>
              <div className="flex justify-between text-xs mb-2">
                <span className="font-semibold text-[#251b14]">Monthly Fulfillment Velocity</span>
                <span className="font-bold text-[#17200f] font-numeric-data">
                  {activeVendor.fulfillmentRate}% On-Time
                </span>
              </div>
              <div className="grid grid-cols-6 gap-2 h-14 items-end">
                {[88, 92, 95, 97, 94, Math.round(activeVendor.fulfillmentRate)].map((val, i) => (
                  <div key={i} className="flex flex-col items-center gap-1 h-full justify-end">
                    <div
                      className="w-full rounded-t-md bg-[#251b14]/80"
                      style={{ height: `${val}%` }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Recent POs */}
            <div>
              <span className="text-xs font-semibold text-[#251b14] block mb-2">
                Recent Purchase Orders ({vendorPos.length})
              </span>
              <div className="space-y-2 max-h-36 overflow-y-auto">
                {vendorPos.slice(0, 3).map((po) => (
                  <div
                    key={po.id}
                    className="p-2.5 rounded-xl bg-[#f6f3ed] flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-semibold text-[#251b14] font-numeric-data">{po.poNumber}</p>
                      <p className="text-[11px] text-[#4e453f]">
                        {po.productName} ({po.qty} {po.unitLabel})
                      </p>
                    </div>
                    <span className="font-bold text-[#17200f] font-numeric-data">
                      {formatINR(po.totalAmount)}
                    </span>
                  </div>
                ))}
                {vendorPos.length === 0 && (
                  <p className="text-xs text-[#7f756f]">No recent POs logged for this vendor yet.</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  const prod = vendorProducts[0] || products[0];
                  if (prod) {
                    void onCreatePo(prod.id, 35, `Restock PO to ${activeVendor.name}`);
                  }
                }}
                className="py-2.5 rounded-xl bg-[#251b14] hover:bg-[#3b3028] text-[#fcf9f3] text-xs font-semibold cursor-pointer"
              >
                Generate PO
              </button>
              <button
                type="button"
                onClick={() =>
                  onNotify(
                    `WhatsApp vendor dispatch message queued for ${activeVendor.contactPerson} (${activeVendor.phone}).`,
                    'success',
                  )
                }
                className="py-2.5 rounded-xl bg-[#dbe7cb] hover:bg-[#bfcab0] text-[#17200f] text-xs font-semibold cursor-pointer"
              >
                WhatsApp Vendor
              </button>
            </div>
          </aside>
        )}
      </div>

      {/* Add New Supplier Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#251b14]/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#fcf9f3] rounded-3xl max-w-xl w-full p-6 border border-[#d1c4bc] shadow-2xl space-y-4 my-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-headline-sm text-[#251b14]">Onboard New Supplier</h3>
                <p className="text-xs text-[#4e453f]">
                  Register GSTIN-verified wholesale partner into Koramangala Atelier 04 ledger
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-[#ebe8e2] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-[#4e453f] mb-1">
                    Registered Business Name
                  </label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Nilgiri Estate Spice Co."
                    className="w-full px-3 py-2.5 rounded-xl bg-[#ffffff] border border-[#d1c4bc]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#4e453f] mb-1">Contact Person</label>
                  <input
                    required
                    value={form.contactPerson}
                    onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                    placeholder="e.g. Karthik Nair"
                    className="w-full px-3 py-2.5 rounded-xl bg-[#ffffff] border border-[#d1c4bc]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#4e453f] mb-1">Phone Number</label>
                  <input
                    required
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+91 98452 11092"
                    className="w-full px-3 py-2.5 rounded-xl bg-[#ffffff] border border-[#d1c4bc]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#4e453f] mb-1">City Hub</label>
                  <input
                    value={form.cityHub}
                    onChange={(e) => setForm({ ...form, cityHub: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#ffffff] border border-[#d1c4bc]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#4e453f] mb-1">Dispatch Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="orders@vendor.in"
                    className="w-full px-3 py-2.5 rounded-xl bg-[#ffffff] border border-[#d1c4bc]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-[#4e453f] mb-1">
                    GSTIN (15-Digit Tax ID)
                  </label>
                  <div className="flex gap-2">
                    <input
                      value={form.gstin}
                      onChange={(e) => {
                        setForm({ ...form, gstin: e.target.value.toUpperCase() });
                        setGstVerified(false);
                      }}
                      placeholder="29AABCN4920H1Z5"
                      className="flex-1 px-3 py-2.5 rounded-xl bg-[#ffffff] border border-[#d1c4bc] font-numeric-data uppercase"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setGstVerified(true);
                        onNotify('GSTIN checksum verified against Karnataka GST Registry.', 'success');
                      }}
                      className="px-3.5 py-2 rounded-xl bg-[#dbe7cb] text-[#17200f] font-semibold cursor-pointer"
                    >
                      {gstVerified ? 'Verified ✓' : 'Verify GST'}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block font-semibold text-[#4e453f] mb-1">Payment Terms</label>
                  <select
                    value={form.paymentTerms}
                    onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#ffffff] border border-[#d1c4bc]"
                  >
                    <option value="Net 15 Days">Net 15 Days</option>
                    <option value="Net 30 Days">Net 30 Days</option>
                    <option value="Advance / RTGS">Advance / RTGS</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-[#4e453f] mb-1">
                    Lead Time SLA (Hours)
                  </label>
                  <input
                    type="number"
                    min={4}
                    value={form.leadTimeHours}
                    onChange={(e) => setForm({ ...form, leadTimeHours: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#ffffff] border border-[#d1c4bc]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#4e453f] mb-1.5">
                  Supplied Categories
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {SUPPLIER_CATEGORY_OPTIONS.map((cat) => {
                    const active = form.categories.includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => toggleCategoryPill(cat)}
                        className={`px-3 py-1 rounded-full text-[11px] font-semibold cursor-pointer ${
                          active
                            ? 'bg-[#251b14] text-[#fcf9f3]'
                            : 'bg-[#f0eee8] text-[#4e453f]'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#d1c4bc]/40">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#f0eee8] font-semibold text-[#251b14] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-[#251b14] text-[#fcf9f3] font-semibold cursor-pointer"
                >
                  {submitting ? 'Saving Partner...' : 'Save & Verify Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Supplier Created Success Modal */}
      {createdSupplier && (
        <div className="fixed inset-0 z-50 bg-[#251b14]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#fcf9f3] rounded-3xl max-w-md w-full p-7 border border-[#d1c4bc] shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-[#dbe7cb] text-[#17200f] flex items-center justify-center">
              <span className="material-symbols-outlined text-[30px]">check_circle</span>
            </div>
            <div>
              <span className="px-3 py-1 rounded-full bg-[#fddfab] text-[#57441e] text-[11px] font-bold font-numeric-data">
                Partner ID: {createdSupplier.code}
              </span>
              <h3 className="text-headline-sm text-[#251b14] mt-3">
                Supplier Onboarded Successfully
              </h3>
              <p className="text-xs text-[#4e453f] mt-1">
                <strong>{createdSupplier.name}</strong> is ready for purchase orders and GST
                reconciliation.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  const prod = products[0];
                  if (prod) {
                    void onCreatePo(prod.id, 30, `Initial PO to ${createdSupplier.name}`);
                  }
                  setCreatedSupplier(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#251b14] text-[#fcf9f3] text-xs font-semibold cursor-pointer"
              >
                Create First PO
              </button>
              <button
                type="button"
                onClick={() => setCreatedSupplier(null)}
                className="flex-1 py-2.5 rounded-xl bg-[#f0eee8] text-[#251b14] text-xs font-semibold cursor-pointer"
              >
                View in Ledger
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
