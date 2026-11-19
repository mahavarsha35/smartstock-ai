import { useMemo, useState } from 'react';
import type { Product, Supplier } from '../types.ts';
import { APP_IMAGES, formatINR, formatLakhs } from '../lib/api.ts';
import { SafeImage } from './SafeImage.tsx';

interface ProductsViewProps {
  products: Product[];
  suppliers: Supplier[];
  onCreateProduct: (input: Partial<Product>) => Promise<void>;
  onUpdateProduct: (id: string, patch: Partial<Product>) => Promise<void>;
  onBulkAdjustPrice: (percentage: number, category?: string) => Promise<void>;
  onCreatePo: (productId: string, qty: number, notes?: string) => Promise<void>;
  onNotify: (msg: string, tone?: 'success' | 'info' | 'error') => void;
}

export function ProductsView({
  products,
  suppliers,
  onCreateProduct,
  onUpdateProduct,
  onBulkAdjustPrice,
  onCreatePo,
  onNotify,
}: ProductsViewProps) {
  const [search, setSearch] = useState('');
  const [filterChip, setFilterChip] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'name' | 'stock-asc' | 'value-desc'>('name');
  const [selectedId, setSelectedId] = useState<string>(products[0]?.id || '');

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [eanModalOpen, setEanModalOpen] = useState(false);
  const [scannerModalOpen, setScannerModalOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  // Form states
  const [newForm, setNewForm] = useState({
    name: '',
    sku: '',
    barcode: '',
    category: 'Staples' as Product['category'],
    stockUnits: 40,
    minStock: 15,
    unitLabel: 'packs',
    costPrice: 110,
    sellingPrice: 140,
    supplierId: suppliers[0]?.id || '',
    bayLocation: 'Bay A-06',
  });

  const [bulkPct, setBulkPct] = useState<number>(3);
  const [bulkCat, setBulkCat] = useState<string>('All');
  const [scanInput, setScanInput] = useState('8901719101037');
  const [editPatch, setEditPatch] = useState({
    name: '',
    minStock: 15,
    costPrice: 0,
    sellingPrice: 0,
    bayLocation: '',
  });

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = products.filter((p) => {
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.barcode.includes(q) ||
        p.supplierName.toLowerCase().includes(q);
      if (!matchesSearch) return false;
      if (filterChip === 'All') return true;
      if (filterChip === 'Low Stock') return p.stockUnits <= p.minStock;
      if (filterChip === 'Expiring') return Boolean(p.expiryDate);
      return p.category === filterChip;
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'stock-asc') return a.stockUnits - b.stockUnits;
      if (sortBy === 'value-desc')
        return b.stockUnits * b.sellingPrice - a.stockUnits * a.sellingPrice;
      return a.name.localeCompare(b.name);
    });
  }, [products, search, filterChip, sortBy]);

  const activeSku = useMemo(() => {
    return (
      products.find((p) => p.id === selectedId) ||
      filteredProducts[0] ||
      products[0] ||
      null
    );
  }, [products, filteredProducts, selectedId]);

  const metrics = useMemo(() => {
    const totalValuation = products.reduce((sum, p) => sum + p.stockUnits * p.sellingPrice, 0);
    const lowCount = products.filter((p) => p.stockUnits <= p.minStock).length;
    const avgMargin =
      products.length > 0
        ? products.reduce(
            (sum, p) =>
              sum + ((p.sellingPrice - p.costPrice) / Math.max(1, p.sellingPrice)) * 100,
            0,
          ) / products.length
        : 0;
    return {
      totalSkus: products.length,
      totalValuation,
      lowCount,
      avgMargin: avgMargin.toFixed(1),
    };
  }, [products]);

  const handleOpenEdit = (sku: Product) => {
    setEditPatch({
      name: sku.name,
      minStock: sku.minStock,
      costPrice: sku.costPrice,
      sellingPrice: sku.sellingPrice,
      bayLocation: sku.bayLocation,
    });
    setEditModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Command Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <p className="text-label-sm uppercase tracking-[0.12em] text-[#715b33] mb-1">
            Catalog &amp; Shelf Architecture
          </p>
          <h1 className="text-headline-lg text-[#251b14]">Products &amp; Inventory Matrix</h1>
          <p className="text-body-md text-[#4e453f] mt-1">
            Manage retail SKUs, wholesale cost margins, bay coordinates, and EAN-13 labels.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setBulkModalOpen(true)}
            className="px-3.5 py-2.5 rounded-xl bg-[#f0eee8] hover:bg-[#e5e2dc] text-[#251b14] text-xs font-semibold flex items-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[17px]">sell</span>
            Bulk Price Update
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setExportOpen((o) => !o)}
              className="px-3.5 py-2.5 rounded-xl bg-[#f0eee8] hover:bg-[#e5e2dc] text-[#251b14] text-xs font-semibold flex items-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[17px]">download</span>
              Export
            </button>
            {exportOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setExportOpen(false)} />
                <div className="absolute right-0 mt-2 w-48 bg-[#ffffff] border border-[#d1c4bc]/60 rounded-xl shadow-lg py-1.5 z-40 text-xs">
                  <a
                    href="/api/export/inventory?format=csv"
                    onClick={() => setExportOpen(false)}
                    className="block px-4 py-2 text-[#1c1c18] hover:bg-[#f6f3ed]"
                  >
                    Download Ledger CSV
                  </a>
                  <a
                    href="/api/export/inventory?format=json"
                    onClick={() => setExportOpen(false)}
                    className="block px-4 py-2 text-[#1c1c18] hover:bg-[#f6f3ed]"
                  >
                    Download JSON Snapshot
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setExportOpen(false);
                      window.print();
                    }}
                    className="w-full text-left px-4 py-2 text-[#1c1c18] hover:bg-[#f6f3ed] cursor-pointer"
                  >
                    Print Floor Catalog
                  </button>
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setScannerModalOpen(true)}
            className="px-3.5 py-2.5 rounded-xl bg-[#f0eee8] hover:bg-[#e5e2dc] text-[#251b14] text-xs font-semibold flex items-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[17px]">barcode_scanner</span>
            Barcode Lookup
          </button>

          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-[#251b14] hover:bg-[#3b3028] text-[#fcf9f3] text-xs font-semibold flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-[17px]">add</span>
            Add New Product
          </button>
        </div>
      </div>

      {/* 4-Card Metric Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#ffffff] p-4 rounded-2xl border border-[#d1c4bc]/40">
          <span className="text-label-md text-[#4e453f]">Active Catalog SKUs</span>
          <p className="font-serif text-2xl font-semibold text-[#251b14] font-numeric-data mt-1">
            {metrics.totalSkus} SKUs
          </p>
        </div>
        <div className="bg-[#ffffff] p-4 rounded-2xl border border-[#d1c4bc]/40">
          <span className="text-label-md text-[#4e453f]">Floor Retail Valuation</span>
          <p className="font-serif text-2xl font-semibold text-[#251b14] font-numeric-data mt-1">
            {formatLakhs(metrics.totalValuation)}
          </p>
        </div>
        <div className="bg-[#ffffff] p-4 rounded-2xl border border-[#ba1a1a]/30">
          <span className="text-label-md text-[#4e453f]">Below Safety Stock</span>
          <p className="font-serif text-2xl font-semibold text-[#ba1a1a] font-numeric-data mt-1">
            {metrics.lowCount} Items
          </p>
        </div>
        <div className="bg-[#ffffff] p-4 rounded-2xl border border-[#d1c4bc]/40">
          <span className="text-label-md text-[#4e453f]">Average Gross Margin</span>
          <p className="font-serif text-2xl font-semibold text-[#17200f] font-numeric-data mt-1">
            {metrics.avgMargin}%
          </p>
        </div>
      </div>

      {/* Search & Filter Chips */}
      <div className="bg-[#ffffff] rounded-2xl border border-[#d1c4bc]/40 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {[
            'All',
            'Staples',
            'Snacks',
            'Dairy',
            'Household',
            'Personal Care',
            'Wellness',
            'Low Stock',
            'Expiring',
          ].map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => setFilterChip(chip)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                filterChip === chip
                  ? 'bg-[#251b14] text-[#fcf9f3]'
                  : 'bg-[#f6f3ed] text-[#4e453f] hover:bg-[#ebe8e2]'
              }`}
            >
              {chip}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative flex-1 sm:w-64">
            <span className="material-symbols-outlined text-[18px] text-[#7f756f] absolute left-3 top-2.5">
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter SKU, name, barcode..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#f6f3ed] text-xs text-[#1c1c18] focus:outline-none focus:ring-1 focus:ring-[#715b33]"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-[#f6f3ed] text-xs font-medium text-[#251b14] focus:outline-none"
          >
            <option value="name">Sort: A–Z</option>
            <option value="stock-asc">Lowest Stock First</option>
            <option value="value-desc">Highest Value First</option>
          </select>
        </div>
      </div>

      {/* Master Table + Right Active SKU Inspector */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <div className="xl:col-span-8 bg-[#ffffff] rounded-2xl border border-[#d1c4bc]/40 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#f6f3ed] text-[11px] uppercase tracking-wider text-[#4e453f] font-semibold">
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-3">Bay</th>
                  <th className="py-3 px-3">Stock</th>
                  <th className="py-3 px-3">Cost / MRP</th>
                  <th className="py-3 px-3">Margin</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#d1c4bc]/30 text-sm">
                {filteredProducts.map((p) => {
                  const isSelected = activeSku?.id === p.id;
                  const isLow = p.stockUnits <= p.minStock;
                  const marginPct = Math.round(
                    ((p.sellingPrice - p.costPrice) / Math.max(1, p.sellingPrice)) * 100,
                  );
                  return (
                    <tr
                      key={p.id}
                      onClick={() => setSelectedId(p.id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-[#fddfab]/25' : 'hover:bg-[#fcf9f3]'
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <SafeImage
                            src={p.imageUrl}
                            alt={p.name}
                            className="w-10 h-10 rounded-xl object-cover border border-[#d1c4bc]/40 shrink-0"
                          />
                          <div>
                            <p className="font-semibold text-[#1c1c18] text-xs sm:text-sm">
                              {p.name}
                            </p>
                            <p className="text-[11px] text-[#7f756f] font-numeric-data">
                              {p.sku} • {p.category}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-xs text-[#4e453f]">{p.bayLocation}</td>
                      <td className="py-3.5 px-3 font-semibold font-numeric-data text-[#251b14]">
                        {p.stockUnits} <span className="text-[11px] font-normal">{p.unitLabel}</span>
                      </td>
                      <td className="py-3.5 px-3 text-xs font-numeric-data">
                        <span className="text-[#7f756f]">{formatINR(p.costPrice)}</span> /{' '}
                        <strong className="text-[#1c1c18]">{formatINR(p.sellingPrice)}</strong>
                      </td>
                      <td className="py-3.5 px-3 text-xs font-semibold text-[#17200f] font-numeric-data">
                        {marginPct}%
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                            isLow
                              ? 'bg-[#ffdad6] text-[#93000a]'
                              : 'bg-[#dbe7cb] text-[#17200f]'
                          }`}
                        >
                          {isLow ? 'Low Stock' : 'Healthy'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-sm text-[#7f756f]">
                      No products matched your current filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Active SKU Focus Inspector */}
        {activeSku && (
          <aside className="xl:col-span-4 bg-[#ffffff] rounded-2xl border border-[#d1c4bc]/40 p-6 shadow-xs space-y-5 sticky top-24">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <SafeImage
                  src={activeSku.imageUrl}
                  alt={activeSku.name}
                  className="w-14 h-14 rounded-2xl object-cover border border-[#d1c4bc]/50"
                />
                <div>
                  <span className="text-[10px] uppercase tracking-widest font-semibold text-[#715b33]">
                    Active SKU Focus
                  </span>
                  <h2 className="font-serif text-lg font-semibold text-[#251b14] leading-snug">
                    {activeSku.name}
                  </h2>
                  <p className="text-xs text-[#7f756f] font-numeric-data">
                    {activeSku.sku} • EAN {activeSku.barcode}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div className="p-3 rounded-xl bg-[#f6f3ed]">
                <span className="text-[10px] uppercase text-[#7f756f] block">On Floor</span>
                <span className="text-base font-bold text-[#251b14] font-numeric-data">
                  {activeSku.stockUnits}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[#f6f3ed]">
                <span className="text-[10px] uppercase text-[#7f756f] block">Safety Min</span>
                <span className="text-base font-bold text-[#715b33] font-numeric-data">
                  {activeSku.minStock}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[#f6f3ed]">
                <span className="text-[10px] uppercase text-[#7f756f] block">Cover Days</span>
                <span className="text-base font-bold text-[#17200f] font-numeric-data">
                  {Math.max(
                    0.4,
                    Number((activeSku.stockUnits / Math.max(0.5, activeSku.dailyVelocity)).toFixed(1)),
                  )}
                  d
                </span>
              </div>
            </div>

            {/* 7-Day Depletion Curve SVG */}
            <div className="p-4 rounded-xl bg-[#fcf9f3] border border-[#d1c4bc]/40">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[#251b14]">
                  7-Day Depletion Curve
                </span>
                <span className="text-[11px] text-[#715b33] font-numeric-data">
                  {activeSku.dailyVelocity} {activeSku.unitLabel}/day
                </span>
              </div>
              <svg viewBox="0 0 260 70" className="w-full h-16">
                <path
                  d="M 10 18 Q 65 24, 110 32 T 210 52 L 250 58"
                  fill="none"
                  stroke="#715b33"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <line
                  x1="10"
                  x2="250"
                  y1="48"
                  y2="48"
                  stroke="#ba1a1a"
                  strokeDasharray="3 3"
                  strokeOpacity="0.65"
                />
                <text x="195" y="44" className="text-[9px] fill-[#ba1a1a] font-semibold">
                  Min {activeSku.minStock}
                </text>
              </svg>
            </div>

            <div className="text-xs space-y-2 border-t border-[#d1c4bc]/30 pt-4">
              <div className="flex justify-between">
                <span className="text-[#4e453f]">Primary Supplier</span>
                <span className="font-semibold text-[#1c1c18]">{activeSku.supplierName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#4e453f]">Lead Time / Bay</span>
                <span className="font-semibold text-[#1c1c18]">
                  {activeSku.leadTimeHours}h • {activeSku.bayLocation}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#4e453f]">Profit per Unit</span>
                <span className="font-semibold text-[#17200f] font-numeric-data">
                  {formatINR(activeSku.sellingPrice - activeSku.costPrice, 2)}
                </span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() =>
                  onCreatePo(
                    activeSku.id,
                    Math.max(25, activeSku.minStock * 2),
                    'Generated from Product Matrix Inspector',
                  )
                }
                className="w-full py-2.5 rounded-xl bg-[#251b14] hover:bg-[#3b3028] text-[#fcf9f3] text-xs font-semibold cursor-pointer"
              >
                Generate Purchase Order ({Math.max(25, activeSku.minStock * 2)}{' '}
                {activeSku.unitLabel})
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(activeSku)}
                  className="py-2 rounded-xl bg-[#f0eee8] hover:bg-[#e5e2dc] text-[#251b14] text-xs font-semibold cursor-pointer"
                >
                  Edit SKU Specs
                </button>
                <button
                  type="button"
                  onClick={() => setEanModalOpen(true)}
                  className="py-2 rounded-xl bg-[#f0eee8] hover:bg-[#e5e2dc] text-[#251b14] text-xs font-semibold cursor-pointer"
                >
                  Print EAN Tag
                </button>
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* Add New Product Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#251b14]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#fcf9f3] rounded-3xl max-w-lg w-full p-6 border border-[#d1c4bc] shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-headline-sm text-[#251b14]">Add New Product SKU</h3>
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-[#ebe8e2] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const sup = suppliers.find((s) => s.id === newForm.supplierId);
                await onCreateProduct({
                  ...newForm,
                  supplierName: sup?.name || 'ITC Foods & Logistics Ltd.',
                  imageUrl: APP_IMAGES.aashirvaadPack,
                });
                setAddModalOpen(false);
                setNewForm({
                  name: '',
                  sku: '',
                  barcode: '',
                  category: 'Staples',
                  stockUnits: 40,
                  minStock: 15,
                  unitLabel: 'packs',
                  costPrice: 110,
                  sellingPrice: 140,
                  supplierId: suppliers[0]?.id || '',
                  bayLocation: 'Bay A-06',
                });
              }}
              className="space-y-3 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block font-semibold text-[#4e453f] mb-1">Product Name</label>
                  <input
                    required
                    value={newForm.name}
                    onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
                    placeholder="e.g. Organic Wayanad Black Pepper 200g"
                    className="w-full px-3 py-2 rounded-xl bg-[#ffffff] border border-[#d1c4bc]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#4e453f] mb-1">SKU Code</label>
                  <input
                    required
                    value={newForm.sku}
                    onChange={(e) => setNewForm({ ...newForm, sku: e.target.value })}
                    placeholder="MAL-PEP-200"
                    className="w-full px-3 py-2 rounded-xl bg-[#ffffff] border border-[#d1c4bc]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#4e453f] mb-1">Category</label>
                  <select
                    value={newForm.category}
                    onChange={(e) =>
                      setNewForm({ ...newForm, category: e.target.value as Product['category'] })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#ffffff] border border-[#d1c4bc]"
                  >
                    <option value="Staples">Staples</option>
                    <option value="Snacks">Snacks</option>
                    <option value="Dairy">Dairy</option>
                    <option value="Household">Household</option>
                    <option value="Personal Care">Personal Care</option>
                    <option value="Wellness">Wellness</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-[#4e453f] mb-1">Opening Stock</label>
                  <input
                    type="number"
                    min={0}
                    value={newForm.stockUnits}
                    onChange={(e) => setNewForm({ ...newForm, stockUnits: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-[#ffffff] border border-[#d1c4bc]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#4e453f] mb-1">Safety Min</label>
                  <input
                    type="number"
                    min={1}
                    value={newForm.minStock}
                    onChange={(e) => setNewForm({ ...newForm, minStock: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-[#ffffff] border border-[#d1c4bc]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#4e453f] mb-1">Cost Price (₹)</label>
                  <input
                    type="number"
                    min={1}
                    value={newForm.costPrice}
                    onChange={(e) => setNewForm({ ...newForm, costPrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-[#ffffff] border border-[#d1c4bc]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#4e453f] mb-1">Selling MRP (₹)</label>
                  <input
                    type="number"
                    min={1}
                    value={newForm.sellingPrice}
                    onChange={(e) =>
                      setNewForm({ ...newForm, sellingPrice: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#ffffff] border border-[#d1c4bc]"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#f0eee8] font-semibold text-[#251b14] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#251b14] text-[#fcf9f3] font-semibold cursor-pointer"
                >
                  Save SKU to Ledger
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Price Update Modal */}
      {bulkModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#251b14]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#fcf9f3] rounded-3xl max-w-md w-full p-6 border border-[#d1c4bc] shadow-2xl space-y-4">
            <h3 className="text-headline-sm text-[#251b14]">Bulk Retail Price Adjustment</h3>
            <p className="text-xs text-[#4e453f]">
              Apply percentage adjustment across an entire category or the full store catalog.
            </p>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#4e453f] mb-1">Target Category</label>
                <select
                  value={bulkCat}
                  onChange={(e) => setBulkCat(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#ffffff] border border-[#d1c4bc]"
                >
                  <option value="All">All Store Categories</option>
                  <option value="Staples">Staples</option>
                  <option value="Snacks">Snacks</option>
                  <option value="Dairy">Dairy</option>
                  <option value="Household">Household</option>
                  <option value="Personal Care">Personal Care</option>
                  <option value="Wellness">Wellness</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-[#4e453f] mb-1">
                  Percentage Adjustment (%)
                </label>
                <input
                  type="number"
                  value={bulkPct}
                  onChange={(e) => setBulkPct(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[#ffffff] border border-[#d1c4bc]"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBulkModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#f0eee8] text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await onBulkAdjustPrice(bulkPct, bulkCat);
                  setBulkModalOpen(false);
                }}
                className="px-5 py-2 rounded-xl bg-[#251b14] text-[#fcf9f3] text-xs font-semibold cursor-pointer"
              >
                Apply {bulkPct > 0 ? `+${bulkPct}%` : `${bulkPct}%`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit SKU Modal */}
      {editModalOpen && activeSku && (
        <div className="fixed inset-0 z-50 bg-[#251b14]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#fcf9f3] rounded-3xl max-w-md w-full p-6 border border-[#d1c4bc] shadow-2xl space-y-4">
            <h3 className="text-headline-sm text-[#251b14]">Edit SKU Specifications</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#4e453f] mb-1">Product Name</label>
                <input
                  value={editPatch.name}
                  onChange={(e) => setEditPatch({ ...editPatch, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#ffffff] border border-[#d1c4bc]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#4e453f] mb-1">Safety Min</label>
                  <input
                    type="number"
                    value={editPatch.minStock}
                    onChange={(e) =>
                      setEditPatch({ ...editPatch, minStock: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#ffffff] border border-[#d1c4bc]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#4e453f] mb-1">Bay Location</label>
                  <input
                    value={editPatch.bayLocation}
                    onChange={(e) => setEditPatch({ ...editPatch, bayLocation: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#ffffff] border border-[#d1c4bc]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#4e453f] mb-1">Cost (₹)</label>
                  <input
                    type="number"
                    value={editPatch.costPrice}
                    onChange={(e) =>
                      setEditPatch({ ...editPatch, costPrice: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#ffffff] border border-[#d1c4bc]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#4e453f] mb-1">Selling MRP (₹)</label>
                  <input
                    type="number"
                    value={editPatch.sellingPrice}
                    onChange={(e) =>
                      setEditPatch({ ...editPatch, sellingPrice: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#ffffff] border border-[#d1c4bc]"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#f0eee8] text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await onUpdateProduct(activeSku.id, editPatch);
                  setEditModalOpen(false);
                }}
                className="px-5 py-2 rounded-xl bg-[#251b14] text-[#fcf9f3] text-xs font-semibold cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EAN Label Preview Modal */}
      {eanModalOpen && activeSku && (
        <div className="fixed inset-0 z-50 bg-[#251b14]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#ffffff] rounded-3xl max-w-sm w-full p-6 border border-[#d1c4bc] shadow-2xl space-y-4 text-center">
            <h3 className="text-headline-sm text-[#251b14]">EAN-13 Shelf Label Preview</h3>
            <div className="p-5 rounded-2xl border-2 border-dashed border-[#251b14]/40 bg-[#fcf9f3] space-y-2">
              <p className="text-xs font-semibold text-[#715b33]">SILK &amp; SPICE ATELIER</p>
              <p className="font-serif text-base font-semibold text-[#251b14]">{activeSku.name}</p>
              <div className="h-12 flex items-center justify-center gap-0.5 py-1">
                {activeSku.barcode.split('').map((d, idx) => (
                  <span
                    key={idx}
                    className="bg-[#251b14] h-full inline-block"
                    style={{ width: Number(d) % 2 === 0 ? '3px' : '1.5px', marginRight: '2px' }}
                  />
                ))}
              </div>
              <p className="text-xs tracking-[0.25em] font-numeric-data">{activeSku.barcode}</p>
              <p className="text-lg font-bold text-[#251b14] font-numeric-data">
                MRP {formatINR(activeSku.sellingPrice)}
              </p>
            </div>
            <div className="flex justify-center gap-2">
              <button
                type="button"
                onClick={() => setEanModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#f0eee8] text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  window.print();
                  onNotify(`EAN tag sent to thermal shelf printer for ${activeSku.sku}.`, 'success');
                  setEanModalOpen(false);
                }}
                className="px-5 py-2 rounded-xl bg-[#251b14] text-[#fcf9f3] text-xs font-semibold cursor-pointer"
              >
                Print Label
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal */}
      {scannerModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#251b14]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#fcf9f3] rounded-3xl max-w-md w-full p-6 border border-[#d1c4bc] shadow-2xl space-y-4">
            <h3 className="text-headline-sm text-[#251b14]">Barcode / EAN-13 Lookup</h3>
            <input
              type="text"
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              placeholder="Enter or scan 13-digit barcode..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#ffffff] border border-[#d1c4bc] text-sm font-numeric-data"
            />
            <div className="flex flex-wrap gap-2">
              {products.slice(0, 4).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setScanInput(p.barcode)}
                  className="px-2.5 py-1 rounded-lg bg-[#f0eee8] text-[11px] font-medium cursor-pointer"
                >
                  {p.sku}
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setScannerModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#f0eee8] text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const found = products.find(
                    (p) => p.barcode === scanInput.trim() || p.sku === scanInput.trim(),
                  );
                  if (found) {
                    setSelectedId(found.id);
                    onNotify(`Located ${found.name} (${found.bayLocation}).`, 'success');
                    setScannerModalOpen(false);
                  } else {
                    onNotify('No SKU matched that barcode.', 'error');
                  }
                }}
                className="px-5 py-2 rounded-xl bg-[#251b14] text-[#fcf9f3] text-xs font-semibold cursor-pointer"
              >
                Locate SKU
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
