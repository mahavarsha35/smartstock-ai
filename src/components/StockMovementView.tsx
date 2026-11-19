import { useMemo, useState } from 'react';
import type { Product, StockMovement } from '../types.ts';
import { SafeImage } from './SafeImage.tsx';

interface StockMovementViewProps {
  products: Product[];
  movements: StockMovement[];
  onRecordMovement: (input: {
    productId: string;
    type: StockMovement['type'];
    qty: number;
    reasonTitle: string;
    referenceNote: string;
    unitCost?: number;
  }) => Promise<void>;
  onNotify: (msg: string, tone?: 'success' | 'info' | 'error') => void;
}

export function StockMovementView({
  products,
  movements,
  onRecordMovement,
  onNotify,
}: StockMovementViewProps) {
  const [scannerExpanded, setScannerExpanded] = useState(true);
  const [barcodeText, setBarcodeText] = useState('8901725123456');
  const [filterType, setFilterType] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [receiptMovement, setReceiptMovement] = useState<StockMovement | null>(null);

  // Stock In form
  const [inProductId, setInProductId] = useState(products[0]?.id || '');
  const [inQty, setInQty] = useState(25);
  const [inInvoice, setInInvoice] = useState('Invoice #ITC-9984');
  const [inNote, setInNote] = useState('Gate Inward Verified');
  const [submittingIn, setSubmittingIn] = useState(false);

  // Stock Out form
  const [outProductId, setOutProductId] = useState(products[1]?.id || products[0]?.id || '');
  const [outQty, setOutQty] = useState(6);
  const [outType, setOutType] = useState<'Stock Out' | 'Damage Write-Off'>('Stock Out');
  const [outReason, setOutReason] = useState('POS Counter Sale');
  const [outNote, setOutNote] = useState('Bill #POS-1089');
  const [submittingOut, setSubmittingOut] = useState(false);

  const todayStats = useMemo(() => {
    const todayIn = movements
      .filter((m) => m.displayDate === 'Today' && m.qtyChanged > 0)
      .reduce((acc, m) => acc + m.qtyChanged, 0);
    const todayOut = movements
      .filter((m) => m.displayDate === 'Today' && m.qtyChanged < 0)
      .reduce((acc, m) => acc + Math.abs(m.qtyChanged), 0);
    const total = Math.max(1, todayIn + todayOut);
    return {
      todayIn,
      todayOut,
      inPct: Math.round((todayIn / total) * 100),
      txCount: movements.length,
    };
  }, [movements]);

  const filteredMovements = useMemo(() => {
    const q = search.trim().toLowerCase();
    return movements.filter((m) => {
      if (filterType !== 'All' && m.type !== filterType) return false;
      if (!q) return true;
      return (
        m.productName.toLowerCase().includes(q) ||
        m.txnCode.toLowerCase().includes(q) ||
        m.reasonTitle.toLowerCase().includes(q) ||
        m.sku.toLowerCase().includes(q)
      );
    });
  }, [movements, filterType, search]);

  const handleSimulateScan = () => {
    const matched = products.find(
      (p) => p.barcode === barcodeText.trim() || p.sku === barcodeText.trim(),
    );
    const target = matched || products[Math.floor(Math.random() * products.length)];
    if (!target) return;
    setInProductId(target.id);
    setOutProductId(target.id);
    setBarcodeText(target.barcode);
    onNotify(`Scanned ${target.name} (${target.sku}) — ready in Stock In & Out desks.`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-label-sm uppercase tracking-[0.12em] text-[#715b33] mb-1">
            Inward Gate &amp; Checkout Audit
          </p>
          <h1 className="text-headline-lg text-[#251b14]">Stock Movement (In &amp; Out)</h1>
          <p className="text-body-md text-[#4e453f] mt-1">
            Log supplier inward consignments, POS counter dispatches, and shelf write-offs.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setScannerExpanded((s) => !s)}
          className="px-4 py-2.5 rounded-xl bg-[#251b14] text-[#fcf9f3] text-xs font-semibold flex items-center gap-2 self-start cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px] text-[#fddfab]">
            barcode_scanner
          </span>
          {scannerExpanded ? 'Hide Handheld Scanner' : 'Open Handheld Scanner'}
        </button>
      </div>

      {/* Collapsible Optical & Laser Scan Engine */}
      {scannerExpanded && (
        <section className="bg-[#251b14] text-[#fcf9f3] rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-md">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#3b3028] flex items-center justify-center text-[#fddfab] shrink-0">
              <span className="material-symbols-outlined text-[26px]">qr_code_scanner</span>
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-widest text-[#dfc392] font-semibold">
                Handheld Scanner Sync • Active
              </span>
              <h2 className="font-serif text-lg text-white">Optical &amp; Laser Scan Engine</h2>
              <p className="text-xs text-[#d5c3b8]">
                Scan an EAN-13 barcode to auto-populate both Stock Inward &amp; Dispatch desks.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <input
              type="text"
              value={barcodeText}
              onChange={(e) => setBarcodeText(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl bg-[#3b3028] border border-[#715b33]/50 text-xs text-white font-numeric-data w-48 focus:outline-none"
              placeholder="EAN-13 or SKU"
            />
            <button
              type="button"
              onClick={handleSimulateScan}
              className="px-4 py-2.5 rounded-xl bg-[#fddfab] text-[#251b14] text-xs font-semibold hover:bg-[#dfc392] cursor-pointer"
            >
              Simulate Scan
            </button>
          </div>
        </section>
      )}

      {/* Dual Entry Forms: Stock In & Stock Out */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Record Stock In */}
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!inProductId || inQty <= 0) return;
            setSubmittingIn(true);
            const p = products.find((item) => item.id === inProductId);
            await onRecordMovement({
              productId: inProductId,
              type: 'Stock In',
              qty: inQty,
              reasonTitle: inInvoice,
              referenceNote: inNote,
              unitCost: p?.costPrice,
            });
            setSubmittingIn(false);
          }}
          className="bg-[#ffffff] rounded-2xl border border-[#17200f]/25 p-6 shadow-xs space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-xl bg-[#dbe7cb] text-[#17200f] flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">arrow_downward</span>
              </span>
              <div>
                <h3 className="text-headline-sm text-[#251b14]">Record Stock In</h3>
                <p className="text-xs text-[#4e453f]">Supplier consignment &amp; gate inward</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-[#dbe7cb]/70 text-[#17200f] text-[11px] font-semibold">
              + Inward
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="sm:col-span-2">
              <label className="block font-semibold text-[#4e453f] mb-1">Select Product SKU</label>
              <select
                value={inProductId}
                onChange={(e) => setInProductId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#f6f3ed] border border-[#d1c4bc]/60 text-[#1c1c18]"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.stockUnits} {p.unitLabel} on floor)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-[#4e453f] mb-1">Quantity Received</label>
              <input
                type="number"
                min={1}
                value={inQty}
                onChange={(e) => setInQty(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-xl bg-[#f6f3ed] border border-[#d1c4bc]/60 font-numeric-data"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#4e453f] mb-1">
                Invoice / GRN Reference
              </label>
              <input
                type="text"
                value={inInvoice}
                onChange={(e) => setInInvoice(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#f6f3ed] border border-[#d1c4bc]/60"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-semibold text-[#4e453f] mb-1">Inward Bay Notes</label>
              <input
                type="text"
                value={inNote}
                onChange={(e) => setInNote(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#f6f3ed] border border-[#d1c4bc]/60"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submittingIn}
            className="w-full py-2.5 rounded-xl bg-[#17200f] hover:bg-[#2b3522] text-white text-xs font-semibold cursor-pointer transition-colors"
          >
            {submittingIn ? 'Recording Inward...' : 'Commit Stock Inward Entry'}
          </button>
        </form>

        {/* Record Stock Out */}
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!outProductId || outQty <= 0) return;
            setSubmittingOut(true);
            await onRecordMovement({
              productId: outProductId,
              type: outType,
              qty: outQty,
              reasonTitle: outReason,
              referenceNote: outNote,
            });
            setSubmittingOut(false);
          }}
          className="bg-[#ffffff] rounded-2xl border border-[#715b33]/25 p-6 shadow-xs space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-xl bg-[#fddfab] text-[#57441e] flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">arrow_upward</span>
              </span>
              <div>
                <h3 className="text-headline-sm text-[#251b14]">Record Stock Out</h3>
                <p className="text-xs text-[#4e453f]">Counter checkout or damage write-off</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-[#fddfab]/70 text-[#57441e] text-[11px] font-semibold">
              - Outward
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="sm:col-span-2">
              <label className="block font-semibold text-[#4e453f] mb-1">Select Product SKU</label>
              <select
                value={outProductId}
                onChange={(e) => setOutProductId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#f6f3ed] border border-[#d1c4bc]/60 text-[#1c1c18]"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.stockUnits} {p.unitLabel} available)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-[#4e453f] mb-1">Dispatch Type</label>
              <select
                value={outType}
                onChange={(e) => setOutType(e.target.value as any)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#f6f3ed] border border-[#d1c4bc]/60"
              >
                <option value="Stock Out">POS Counter Sale</option>
                <option value="Damage Write-Off">Damage Write-Off</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-[#4e453f] mb-1">Quantity Deducted</label>
              <input
                type="number"
                min={1}
                value={outQty}
                onChange={(e) => setOutQty(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-xl bg-[#f6f3ed] border border-[#d1c4bc]/60 font-numeric-data"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#4e453f] mb-1">Reason Title</label>
              <input
                type="text"
                value={outReason}
                onChange={(e) => setOutReason(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#f6f3ed] border border-[#d1c4bc]/60"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#4e453f] mb-1">POS / Audit Note</label>
              <input
                type="text"
                value={outNote}
                onChange={(e) => setOutNote(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#f6f3ed] border border-[#d1c4bc]/60"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submittingOut}
            className="w-full py-2.5 rounded-xl bg-[#251b14] hover:bg-[#3b3028] text-[#fcf9f3] text-xs font-semibold cursor-pointer transition-colors"
          >
            {submittingOut ? 'Logging Dispatch...' : 'Commit Stock Outward Entry'}
          </button>
        </form>
      </div>

      {/* Today's Atelier Velocity Ratio & Summary */}
      <section className="bg-[#ffffff] rounded-2xl border border-[#d1c4bc]/40 p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-headline-sm text-[#251b14]">Today&apos;s Atelier Velocity</h3>
            <p className="text-xs text-[#4e453f]">
              Real-time ratio of inward gate receipts vs outward checkout units
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold font-numeric-data">
            <span className="text-[#17200f]">+{todayStats.todayIn} Units Inward</span>
            <span className="text-[#715b33]">-{todayStats.todayOut} Units Outward</span>
            <span className="text-[#251b14]">{todayStats.txCount} Ledger Entries</span>
          </div>
        </div>
        <div className="h-3 w-full rounded-full bg-[#fddfab] overflow-hidden flex">
          <div
            className="bg-[#17200f] h-full transition-all"
            style={{ width: `${todayStats.inPct}%` }}
          />
        </div>
      </section>

      {/* Comprehensive Movement Audit Log */}
      <section className="bg-[#ffffff] rounded-2xl border border-[#d1c4bc]/40 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-[#d1c4bc]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {['All', 'Stock In', 'Stock Out', 'Damage Write-Off'].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilterType(tab)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer ${
                  filterType === tab
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
            placeholder="Search TXN code, product, invoice..."
            className="px-3.5 py-2 rounded-xl bg-[#f6f3ed] text-xs w-full sm:w-64 focus:outline-none"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f6f3ed] text-[11px] uppercase tracking-wider text-[#4e453f] font-semibold">
                <th className="py-3 px-5">TXN / Timestamp</th>
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4">Movement</th>
                <th className="py-3 px-4">Stock Transition</th>
                <th className="py-3 px-4">Reference / Reason</th>
                <th className="py-3 px-4">Handled By</th>
                <th className="py-3 px-5 text-right">Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#d1c4bc]/30 text-sm">
              {filteredMovements.map((m) => (
                <tr key={m.id} className="hover:bg-[#fcf9f3]">
                  <td className="py-3.5 px-5">
                    <p className="text-xs font-semibold text-[#251b14] font-numeric-data">
                      {m.txnCode}
                    </p>
                    <p className="text-[11px] text-[#7f756f]">{m.displayTime}</p>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2.5">
                      <SafeImage
                        src={m.imageUrl}
                        alt={m.productName}
                        className="w-8 h-8 rounded-lg object-cover shrink-0"
                      />
                      <div>
                        <p className="text-xs font-semibold text-[#1c1c18]">{m.productName}</p>
                        <p className="text-[11px] text-[#7f756f] font-numeric-data">{m.sku}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold font-numeric-data ${
                        m.type === 'Stock In'
                          ? 'bg-[#dbe7cb] text-[#17200f]'
                          : m.type === 'Damage Write-Off'
                            ? 'bg-[#ffdad6] text-[#93000a]'
                            : 'bg-[#fddfab] text-[#57441e]'
                      }`}
                    >
                      {m.qtyChanged > 0 ? `+${m.qtyChanged}` : m.qtyChanged} ({m.type})
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-xs font-numeric-data text-[#4e453f]">
                    {m.previousStock} → <strong className="text-[#251b14]">{m.newStock}</strong>
                  </td>
                  <td className="py-3.5 px-4">
                    <p className="text-xs font-medium text-[#1c1c18]">{m.reasonTitle}</p>
                    <p className="text-[11px] text-[#7f756f]">{m.referenceNote}</p>
                  </td>
                  <td className="py-3.5 px-4 text-xs text-[#4e453f]">
                    <p className="font-medium text-[#1c1c18]">{m.handledBy}</p>
                    <p className="text-[11px] text-[#7f756f]">{m.handledRole}</p>
                  </td>
                  <td className="py-3.5 px-5 text-right">
                    <button
                      type="button"
                      onClick={() => setReceiptMovement(m)}
                      className="px-2.5 py-1 rounded-lg bg-[#f0eee8] hover:bg-[#e5e2dc] text-[11px] font-semibold text-[#251b14] cursor-pointer"
                    >
                      Receipt
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Receipt Audit Modal */}
      {receiptMovement && (
        <div className="fixed inset-0 z-50 bg-[#251b14]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#ffffff] rounded-3xl max-w-md w-full p-6 border border-[#d1c4bc] shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-headline-sm text-[#251b14]">Movement Audit Receipt</h3>
              <button
                type="button"
                onClick={() => setReceiptMovement(null)}
                className="p-1.5 rounded-lg hover:bg-[#f0eee8] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="p-4 rounded-2xl bg-[#fcf9f3] border border-[#d1c4bc]/50 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#4e453f]">Transaction Code</span>
                <strong className="font-numeric-data">{receiptMovement.txnCode}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#4e453f]">Product</span>
                <strong>{receiptMovement.productName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#4e453f]">Delta</span>
                <strong className="font-numeric-data">
                  {receiptMovement.qtyChanged > 0
                    ? `+${receiptMovement.qtyChanged}`
                    : receiptMovement.qtyChanged}{' '}
                  ({receiptMovement.type})
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#4e453f]">Ledger Transition</span>
                <strong className="font-numeric-data">
                  {receiptMovement.previousStock} → {receiptMovement.newStock}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#4e453f]">Handled By</span>
                <strong>{receiptMovement.handledBy}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#4e453f]">Note</span>
                <strong>{receiptMovement.referenceNote}</strong>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReceiptMovement(null)}
                className="px-4 py-2 rounded-xl bg-[#251b14] text-[#fcf9f3] text-xs font-semibold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
