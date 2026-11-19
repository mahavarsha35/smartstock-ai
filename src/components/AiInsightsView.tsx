import { useMemo, useState } from 'react';
import type { Product, PurchaseOrder } from '../types.ts';
import { api, APP_IMAGES, formatINR } from '../lib/api.ts';
import { SafeImage } from './SafeImage.tsx';

interface AiInsightsViewProps {
  products: Product[];
  onCreatePo: (productId: string, qty: number, notes?: string) => Promise<void>;
  onSendWhatsAppBriefing: () => void;
  onNotify: (msg: string, tone?: 'success' | 'info' | 'error') => void;
}

export function AiInsightsView({
  products,
  onCreatePo,
  onSendWhatsAppBriefing,
  onNotify,
}: AiInsightsViewProps) {
  const [syncing, setSyncing] = useState(false);
  const [executiveNote, setExecutiveNote] = useState(
    'Ugadi weekend demand surge (+28%) places Parle-G 200g, Dettol 250ml, and Tata Tea Gold 500g at immediate stockout risk before Saturday rush. Authorizing 3 express POs preserves ₹42,800 in high-margin basket revenue.',
  );
  const [festivalTip, setFestivalTip] = useState(
    'Pair Amul Cow Ghee 1L with Aashirvaad 5kg Atta near Entrance Bay for +24% festive basket lift.',
  );
  const [snoozedIds, setSnoozedIds] = useState<string[]>([]);
  const [customQtys, setCustomQtys] = useState<Record<string, number>>({});
  const [batchApproved, setBatchApproved] = useState(false);

  // Mini embedded concierge state
  const [miniPrompt, setMiniPrompt] = useState('');
  const [miniLoading, setMiniLoading] = useState(false);
  const [miniHistory, setMiniHistory] = useState<
    Array<{ role: 'user' | 'assistant'; text: string; draftPo?: PurchaseOrder }>
  >([
    {
      role: 'assistant',
      text: 'Demand telemetry synced. Ask me to adjust Parle-G buffer, analyze slow-moving SKUs, or model weekend festival bundles.',
    },
  ]);

  const urgentProducts = useMemo(() => {
    return products
      .filter((p) => p.stockUnits <= p.minStock && !snoozedIds.includes(p.id))
      .sort((a, b) => a.stockUnits / Math.max(1, a.dailyVelocity) - b.stockUnits / Math.max(1, b.dailyVelocity));
  }, [products, snoozedIds]);

  const highVelocityStars = useMemo(() => {
    return [...products].sort((a, b) => b.dailyVelocity - a.dailyVelocity).slice(0, 3);
  }, [products]);

  const slowMovingCapital = useMemo(() => {
    return [...products].sort((a, b) => a.dailyVelocity - b.dailyVelocity).slice(0, 3);
  }, [products]);

  const expiringProducts = useMemo(() => {
    return products.filter((p) => Boolean(p.expiryDate));
  }, [products]);

  const handleSyncEngine = async () => {
    setSyncing(true);
    try {
      const res = await api.syncDemandForecast();
      setExecutiveNote(res.executiveSummary);
      setFestivalTip(res.festivalInsight);
      onNotify('Gemini Demand Forecasting Engine synchronized with live SKU velocities.', 'success');
    } catch (err: any) {
      onNotify(err?.message || 'Unable to sync Gemini Demand Engine.', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const handleAuthorizeAll = async () => {
    const targets = urgentProducts.slice(0, 3);
    if (targets.length === 0) {
      onNotify('All critical stockout risks are already covered.', 'info');
      return;
    }
    for (const p of targets) {
      const qty = customQtys[p.id] ?? Math.max(25, p.minStock * 2);
      await onCreatePo(p.id, qty, 'Batch authorized via AI Insights Engine');
    }
    setBatchApproved(true);
  };

  const handleMiniAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = miniPrompt.trim();
    if (!q) return;
    setMiniHistory((h) => [...h, { role: 'user', text: q }]);
    setMiniPrompt('');
    setMiniLoading(true);
    try {
      const res = await api.queryConcierge(q, 'en');
      setMiniHistory((h) => [
        ...h,
        { role: 'assistant', text: res.reply, draftPo: res.draftPo },
      ]);
    } catch (err: any) {
      setMiniHistory((h) => [
        ...h,
        { role: 'assistant', text: err?.message || 'Unable to reach Gemini backend.' },
      ]);
    } finally {
      setMiniLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <p className="text-label-sm uppercase tracking-[0.12em] text-[#715b33] mb-1">
            Predictive Demand &amp; Margin Intelligence
          </p>
          <h1 className="text-headline-lg text-[#251b14]">AI Insights &amp; Restock Planner</h1>
          <p className="text-body-md text-[#4e453f] mt-1">
            Real-time stockout horizon modeling, slow-mover clearance, and batch PO generation.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onSendWhatsAppBriefing}
            className="px-4 py-2.5 rounded-xl bg-[#dbe7cb] text-[#17200f] text-xs font-semibold flex items-center gap-2 hover:bg-[#bfcab0] cursor-pointer"
          >
            <span className="material-symbols-outlined text-[17px]">chat</span>
            Share WhatsApp Digest
          </button>
          <button
            type="button"
            disabled={syncing}
            onClick={handleSyncEngine}
            className="px-4 py-2.5 rounded-xl bg-[#251b14] hover:bg-[#3b3028] text-[#fcf9f3] text-xs font-semibold flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-[17px] text-[#fddfab]">
              {syncing ? 'sync' : 'auto_awesome'}
            </span>
            {syncing ? 'Syncing Gemini...' : 'Sync Demand Engine'}
          </button>
        </div>
      </div>

      {/* Executive AI Summary Banner */}
      <section className="bg-[#251b14] text-[#fcf9f3] rounded-3xl p-6 md:p-7 shadow-lg flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2.5 max-w-3xl">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-[#fddfab] text-[#251b14] text-[10px] font-bold uppercase tracking-wider">
              SmartStock Neural Briefing
            </span>
            <span className="text-xs text-[#dfc392]">Koramangala Atelier 04</span>
          </div>
          <h2 className="font-serif text-xl md:text-2xl text-white leading-snug">
            {executiveNote}
          </h2>
          <p className="text-xs text-[#d5c3b8]">Merchandising Tip: {festivalTip}</p>
        </div>

        <div className="shrink-0 flex flex-col gap-2">
          <button
            type="button"
            disabled={batchApproved || urgentProducts.length === 0}
            onClick={handleAuthorizeAll}
            className={`px-5 py-3 rounded-xl text-xs font-bold shadow-md cursor-pointer transition-colors ${
              batchApproved
                ? 'bg-[#dbe7cb] text-[#17200f]'
                : 'bg-[#fddfab] hover:bg-[#dfc392] text-[#251b14]'
            }`}
          >
            {batchApproved
              ? 'Batch POs Dispatched ✓'
              : `Authorize All ${Math.min(3, urgentProducts.length)} Priority POs`}
          </button>
        </div>
      </section>

      {/* 4 Demand Spark Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#ffffff] p-4 rounded-2xl border border-[#d1c4bc]/40">
          <span className="text-label-md text-[#4e453f]">Stockout Horizon (&lt;48h)</span>
          <p className="font-serif text-2xl font-semibold text-[#ba1a1a] font-numeric-data mt-1">
            {urgentProducts.length} Urgent SKUs
          </p>
        </div>
        <div className="bg-[#ffffff] p-4 rounded-2xl border border-[#d1c4bc]/40">
          <span className="text-label-md text-[#4e453f]">Revenue Protected</span>
          <p className="font-serif text-2xl font-semibold text-[#17200f] font-numeric-data mt-1">
            ₹42,800
          </p>
        </div>
        <div className="bg-[#ffffff] p-4 rounded-2xl border border-[#d1c4bc]/40">
          <span className="text-label-md text-[#4e453f]">Festive Surge Index</span>
          <p className="font-serif text-2xl font-semibold text-[#715b33] font-numeric-data mt-1">
            +28.4%
          </p>
        </div>
        <div className="bg-[#ffffff] p-4 rounded-2xl border border-[#d1c4bc]/40">
          <span className="text-label-md text-[#4e453f]">Perishable Clearance Window</span>
          <p className="font-serif text-2xl font-semibold text-[#251b14] font-numeric-data mt-1">
            48 Hours
          </p>
        </div>
      </div>

      {/* Predictive Stockout & Restock Engine + Mini Concierge */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-8 bg-[#ffffff] rounded-2xl border border-[#d1c4bc]/40 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-headline-sm text-[#251b14]">
                Predictive Stockout &amp; Restock Engine
              </h2>
              <p className="text-xs text-[#4e453f]">
                Adjust recommended order quantities or snooze alerts before dispatching supplier POs
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {urgentProducts.map((p) => {
              const defaultQty = Math.max(25, p.minStock * 2);
              const qty = customQtys[p.id] ?? defaultQty;
              const hoursLeft = Math.max(
                4,
                Math.round((p.stockUnits / Math.max(0.5, p.dailyVelocity)) * 24),
              );
              return (
                <div
                  key={p.id}
                  className="p-4 rounded-2xl bg-[#fcf9f3] border border-[#d1c4bc]/50 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3.5">
                    <SafeImage
                      src={p.imageUrl}
                      alt={p.name}
                      className="w-12 h-12 rounded-xl object-cover shrink-0 border border-[#d1c4bc]/40"
                    />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-[#1c1c18]">{p.name}</span>
                        <span className="px-2 py-0.5 rounded-full bg-[#ffdad6] text-[#93000a] text-[10px] font-bold font-numeric-data">
                          {hoursLeft}h until stockout
                        </span>
                      </div>
                      <p className="text-xs text-[#4e453f] mt-0.5 font-numeric-data">
                        On floor: <strong>{p.stockUnits}</strong> {p.unitLabel} • Velocity:{' '}
                        {p.dailyVelocity}/day • Supplier: {p.supplierName}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      type="number"
                      min={5}
                      value={qty}
                      onChange={(e) =>
                        setCustomQtys({ ...customQtys, [p.id]: Number(e.target.value) })
                      }
                      className="w-20 px-2.5 py-2 rounded-xl bg-[#ffffff] border border-[#d1c4bc] text-xs font-semibold font-numeric-data text-center"
                    />
                    <button
                      type="button"
                      onClick={() => setSnoozedIds((s) => [...s, p.id])}
                      className="px-3 py-2 rounded-xl bg-[#f0eee8] hover:bg-[#e5e2dc] text-xs font-medium text-[#4e453f] cursor-pointer"
                    >
                      Snooze
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onCreatePo(p.id, qty, 'Approved via Predictive Restock Engine')
                      }
                      className="px-3.5 py-2 rounded-xl bg-[#251b14] hover:bg-[#3b3028] text-[#fcf9f3] text-xs font-semibold cursor-pointer"
                    >
                      Approve PO ({formatINR(qty * p.costPrice)})
                    </button>
                  </div>
                </div>
              );
            })}
            {urgentProducts.length === 0 && (
              <div className="p-6 text-center rounded-2xl bg-[#f6f3ed] text-sm text-[#17200f] font-medium">
                All urgent stockout alerts have been addressed or snoozed for this shift.
              </div>
            )}
          </div>
        </div>

        {/* Embedded SmartStock AI Concierge Widget */}
        <aside className="xl:col-span-4 bg-[#ffffff] rounded-2xl border border-[#d1c4bc]/40 p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2.5 h-2.5 rounded-full bg-[#715b33] animate-pulse" />
              <h3 className="text-headline-sm text-[#251b14]">AI Restock Co-Pilot</h3>
            </div>
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {miniHistory.map((m, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-2xl text-xs leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-[#251b14] text-[#fcf9f3] ml-6'
                      : 'bg-[#f6f3ed] text-[#1c1c18] mr-4'
                  }`}
                >
                  <p>{m.text}</p>
                  {m.draftPo && (
                    <button
                      type="button"
                      onClick={() =>
                        onCreatePo(
                          m.draftPo!.productId,
                          m.draftPo!.qty,
                          m.draftPo!.notes || 'Approved from AI Insights Co-Pilot',
                        )
                      }
                      className="mt-2 px-3 py-1.5 rounded-lg bg-[#dbe7cb] text-[#17200f] font-semibold cursor-pointer"
                    >
                      Dispatch {m.draftPo.qty} {m.draftPo.unitLabel} PO
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleMiniAsk} className="flex gap-2">
            <input
              type="text"
              value={miniPrompt}
              onChange={(e) => setMiniPrompt(e.target.value)}
              placeholder="Ask about reorder buffer..."
              className="flex-1 px-3 py-2 rounded-xl bg-[#f6f3ed] border border-[#d1c4bc]/60 text-xs focus:outline-none"
            />
            <button
              type="submit"
              disabled={miniLoading}
              className="px-3.5 py-2 rounded-xl bg-[#251b14] text-[#fcf9f3] text-xs font-semibold cursor-pointer disabled:opacity-50"
            >
              {miniLoading ? '...' : 'Ask'}
            </button>
          </form>
        </aside>
      </div>

      {/* Velocity Matrix & Expiry Tracker */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-[#ffffff] rounded-2xl border border-[#d1c4bc]/40 p-6 shadow-xs space-y-4">
          <h2 className="text-headline-sm text-[#251b14]">SKU Velocity Matrix</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-[#dbe7cb]/35 border border-[#17200f]/15 space-y-2.5">
              <span className="text-xs font-bold text-[#17200f] uppercase tracking-wider">
                High-Velocity Stars
              </span>
              {highVelocityStars.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-xs">
                  <span className="font-medium text-[#1c1c18] truncate pr-2">{p.name}</span>
                  <span className="font-bold text-[#17200f] font-numeric-data shrink-0">
                    {p.dailyVelocity}/d
                  </span>
                </div>
              ))}
            </div>
            <div className="p-4 rounded-2xl bg-[#fddfab]/35 border border-[#715b33]/15 space-y-2.5">
              <span className="text-xs font-bold text-[#57441e] uppercase tracking-wider">
                Slow-Moving Capital
              </span>
              {slowMovingCapital.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-xs">
                  <span className="font-medium text-[#1c1c18] truncate pr-2">{p.name}</span>
                  <span className="font-bold text-[#715b33] font-numeric-data shrink-0">
                    {p.dailyVelocity}/d
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#ffffff] rounded-2xl border border-[#d1c4bc]/40 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-headline-sm text-[#251b14]">Perishable &amp; Expiry Tracker</h2>
            <span className="px-2.5 py-1 rounded-full bg-[#fddfab] text-[#57441e] text-[11px] font-semibold">
              Markdown Recommended
            </span>
          </div>
          {expiringProducts.map((p) => (
            <div
              key={p.id}
              className="p-4 rounded-2xl bg-[#fcf9f3] border border-[#d1c4bc]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <SafeImage
                  src={APP_IMAGES.amulGhee}
                  alt={p.name}
                  className="w-11 h-11 rounded-xl object-cover"
                />
                <div>
                  <p className="text-sm font-semibold text-[#1c1c18]">{p.name}</p>
                  <p className="text-xs text-[#ba1a1a] font-medium">
                    Batch {p.batchNo || 'BT-9082'} • Expires in {p.expiryDate} • {p.stockUnits}{' '}
                    {p.unitLabel}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  onNotify(
                    `Triggered ₹5 clearance markdown & WhatsApp flash offer for ${p.name}.`,
                    'success',
                  )
                }
                className="px-3.5 py-2 rounded-xl bg-[#251b14] text-[#fcf9f3] text-xs font-semibold cursor-pointer shrink-0"
              >
                Trigger Clearance Sale
              </button>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
