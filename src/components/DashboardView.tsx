import { useMemo, useState } from 'react';
import type {
  NavPage,
  NotificationItem,
  Product,
  PurchaseOrder,
  StockMovement,
  Supplier,
} from '../types.ts';
import { APP_IMAGES, formatINR } from '../lib/api.ts';
import { SafeImage } from './SafeImage.tsx';

interface DashboardViewProps {
  products: Product[];
  suppliers: Supplier[];
  movements: StockMovement[];
  purchaseOrders: PurchaseOrder[];
  notifications: NotificationItem[];
  onNavigate: (page: NavPage) => void;
  onQuickCreatePo: (productId: string, qty: number, notes?: string) => Promise<void>;
  onOpenStockEntryModal: () => void;
  onOpenVoiceDock: () => void;
  onAskConciergePrompt: (prompt: string) => void;
  onSendWhatsAppBriefing: () => void;
  onReviewFloorSetup: () => void;
}

const FLOW_DAYS = [
  { day: 'Mon', inflow: '1.9', outflow: '2.4', inflowNum: 1.9, outflowNum: 2.4 },
  { day: 'Tue', inflow: '3.0', outflow: '1.8', inflowNum: 3.0, outflowNum: 1.8 },
  { day: 'Wed', inflow: '1.4', outflow: '2.1', inflowNum: 1.4, outflowNum: 2.1 },
  { day: 'Thu', inflow: '3.4', outflow: '2.8', inflowNum: 3.4, outflowNum: 2.8, highlight: true },
  { day: 'Fri', inflow: '1.6', outflow: '3.3', inflowNum: 1.6, outflowNum: 3.3 },
  { day: 'Sat ⭐', inflow: '2.6', outflow: '3.8', inflowNum: 2.6, outflowNum: 3.8, peak: true },
  { day: 'Today', inflow: '1.0', outflow: '3.5', inflowNum: 1.0, outflowNum: 3.5, today: true },
];

export function DashboardView({
  products,
  movements,
  onNavigate,
  onQuickCreatePo,
  onOpenStockEntryModal,
  onOpenVoiceDock,
  onAskConciergePrompt,
  onSendWhatsAppBriefing,
  onReviewFloorSetup,
}: DashboardViewProps) {
  const [chartMode, setChartMode] = useState<'curves' | 'pillars'>('curves');
  const [selectedDayIdx, setSelectedDayIdx] = useState<number>(5);
  const [parleDismissed, setParleDismissed] = useState(false);
  const [parleOrdered, setParleOrdered] = useState(false);
  const [busyPoId, setBusyPoId] = useState<string | null>(null);

  const metrics = useMemo(() => {
    const lowStockList = products.filter((p) => p.stockUnits <= p.minStock);
    const dynamicStockUnits =
      14450 + products.reduce((sum, p) => sum + p.stockUnits, 0);
    const dynamicValue =
      1800000 + products.reduce((sum, p) => sum + p.stockUnits * p.sellingPrice, 0) * 0.45;
    const wholeRupees = Math.floor(dynamicValue);
    return {
      formattedValue: wholeRupees.toLocaleString('en-IN'),
      lowStockList,
      catalogCount: 832 + products.length,
      unitsOnDisplay: dynamicStockUnits.toLocaleString('en-IN'),
    };
  }, [products]);

  const watchlistItems = useMemo(() => {
    const low = products.filter((p) => p.stockUnits <= p.minStock);
    if (low.length >= 3) return low.slice(0, 3);
    return products.slice(0, 3);
  }, [products]);

  const bestSellers = useMemo(() => {
    const featured = products.filter((p) => p.weeklyRevenue && p.weeklyRevenue > 0);
    return (featured.length >= 3 ? featured : products).slice(0, 3);
  }, [products]);

  const handleOrderParle = async () => {
    const parle = products.find((p) => p.sku === 'PRL-GLU-200') || products[1];
    if (!parle) return;
    setBusyPoId(parle.id);
    await onQuickCreatePo(parle.id, 50, 'Evening chai rush Parle-G depot order');
    setParleOrdered(true);
    setBusyPoId(null);
  };

  return (
    <div className="flex flex-col w-full pb-12 space-y-8">
      {/* 1. Editorial Welcome Banner */}
      <section className="relative overflow-hidden rounded-xl bg-[#ffffff] p-6 sm:p-8 shadow-sm border border-[#e5e2dc]/40">
        <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-[#fddfab]/30 blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 w-64 h-64 rounded-full bg-[#dbe7cb]/30 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col xl:flex-row xl:items-end justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#fddfab] text-[#776138] text-[11px] font-semibold">
                <span className="w-2 h-2 rounded-full bg-[#715b33] animate-pulse" />
                KORAMANGALA ATELIER 04
              </span>
              <span className="font-numeric-data text-[12px] text-[#7f756f]">
                100ft Road, Bengaluru
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#dbe7cb] text-[#151e0d] text-[11px] font-medium">
                ✨ Verified by Ananya
              </span>
            </div>

            <h1 className="font-serif text-[28px] sm:text-[32px] leading-10 font-semibold text-[#251b14] tracking-tight">
              Good Morning, Ananya. Let&apos;s make today delightful!
            </h1>

            <p className="text-[14px] leading-5 text-[#4e453f] flex items-center flex-wrap gap-x-2 gap-y-1">
              <span>Silk &amp; Spice Atelier • Daily Shift Open</span>
              <span className="text-[#7f756f]">•</span>
              <span className="inline-flex items-center gap-1 text-[#17200f] font-medium">
                <span className="material-symbols-outlined text-[16px] text-[#715b33]">
                  store
                </span>
                Store Registers Balanced
              </span>
              <span className="text-[#7f756f]">•</span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#ffdad6] text-[#93000a] text-[11px] font-semibold">
                ⚠️ {metrics.lowStockList.length} items need reordering before evening rush
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => window.print()}
              className="group flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#f6f3ed] text-[#251b14] hover:bg-[#ebe8e2] transition-all shadow-sm cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px] text-[#715b33] group-hover:scale-110 transition-transform">
                receipt_long
              </span>
              <span className="text-[13px] font-semibold">Today&apos;s Day Sheet (PDF)</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('stock-movement')}
              className="group flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#f6f3ed] text-[#251b14] hover:bg-[#ebe8e2] transition-all shadow-sm cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px] text-[#715b33] group-hover:rotate-12 transition-transform">
                qr_code_scanner
              </span>
              <span className="text-[13px] font-semibold">Scan Goods Inward</span>
            </button>
            <button
              type="button"
              onClick={onOpenStockEntryModal}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#251b14] text-[#ffffff] hover:bg-[#3b3028] transition-all shadow-md cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px] text-[#fddfab]">
                add_circle
              </span>
              <span className="text-[13px] font-semibold tracking-wide">+ New Stock Entry</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. Executive KPI Grid (7-column Atelier Cards) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        <div className="xl:col-span-2 relative p-5 rounded-xl bg-[#ffffff] shadow-sm border border-[#e5e2dc]/40 flex flex-col justify-between overflow-hidden hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-semibold text-[#7f756f] uppercase tracking-widest">
                Total Store Stock Value
              </span>
              <p className="font-serif text-[24px] leading-8 font-medium text-[#251b14] mt-1 font-numeric-data">
                ₹{metrics.formattedValue}
                <span className="text-[12px] font-sans font-normal text-[#7f756f]">.00</span>
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#fddfab]/30 flex items-center justify-center text-[#715b33]">
              <span className="material-symbols-outlined text-[20px]">
                account_balance_wallet
              </span>
            </div>
          </div>
          <div className="mt-4 pt-3 flex items-center justify-between border-t border-[#e5e2dc]/40">
            <span className="inline-flex items-center gap-1 font-numeric-data text-[11px] font-semibold text-[#17200f] bg-[#dbe7cb]/40 px-2 py-0.5 rounded">
              <span className="material-symbols-outlined text-[14px]">trending_up</span> +4.2%
              this month
            </span>
            <span className="text-[12px] text-[#7f756f]">Morning audit completed</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('products')}
          className="text-left p-5 rounded-xl bg-[#ffffff] shadow-sm border border-[#e5e2dc]/40 flex flex-col justify-between hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-semibold text-[#7f756f] uppercase tracking-wider">
                Curated Catalog
              </span>
              <p className="font-serif text-[24px] leading-8 font-medium text-[#251b14] mt-1 font-numeric-data">
                {metrics.catalogCount}
              </p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-[#f6f3ed] flex items-center justify-center text-[#251b14]">
              <span className="material-symbols-outlined text-[18px]">category</span>
            </div>
          </div>
          <div className="mt-4 pt-2 border-t border-[#e5e2dc]/40 flex items-center justify-between">
            <span className="text-[12px] text-[#4e453f]">14 Aisle Shelves</span>
            <span className="text-[11px] text-[#715b33] font-numeric-data font-medium">
              100% In Stock
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('products')}
          className="text-left p-5 rounded-xl bg-[#ffffff] shadow-sm border border-[#e5e2dc]/40 flex flex-col justify-between hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-semibold text-[#7f756f] uppercase tracking-wider">
                Units on Display
              </span>
              <p className="font-serif text-[24px] leading-8 font-medium text-[#251b14] mt-1 font-numeric-data">
                {metrics.unitsOnDisplay}
              </p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-[#f6f3ed] flex items-center justify-center text-[#251b14]">
              <span className="material-symbols-outlined text-[18px]">inventory_2</span>
            </div>
          </div>
          <div className="mt-4 pt-2 border-t border-[#e5e2dc]/40 flex items-center justify-between">
            <span className="text-[12px] text-[#4e453f]">Front Floor &amp; Back</span>
            <span className="text-[11px] text-[#7f756f] font-numeric-data">Packs</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('reports-analytics')}
          className="text-left p-5 rounded-xl bg-[#ffffff] shadow-sm border border-[#e5e2dc]/40 flex flex-col justify-between hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-semibold text-[#7f756f] uppercase tracking-wider">
                Today&apos;s Sales
              </span>
              <p className="font-serif text-[24px] leading-8 font-medium text-[#251b14] mt-1 font-numeric-data">
                ₹1,24,600
              </p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-[#fddfab]/40 flex items-center justify-center text-[#776138]">
              <span className="material-symbols-outlined text-[18px]">point_of_sale</span>
            </div>
          </div>
          <div className="mt-4 pt-2 border-t border-[#e5e2dc]/40 flex items-center justify-between">
            <span className="text-[12px] text-[#4e453f]">48 Happy Shoppers</span>
            <span className="text-[11px] text-[#17200f] font-numeric-data font-semibold">
              UPI &amp; Cards
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('ai-insights')}
          className="text-left p-5 rounded-xl bg-[#ffffff] shadow-sm border border-[#e5e2dc]/40 flex flex-col justify-between hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-semibold text-[#7f756f] uppercase tracking-wider">
                Reorder Watch
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="font-serif text-[24px] leading-8 font-medium text-[#ba1a1a] font-numeric-data">
                  {metrics.lowStockList.length}
                </span>
                <span className="text-[12px] text-[#7f756f]">Low</span>
                <span className="text-[#7f756f]">•</span>
                <span className="font-serif text-[24px] leading-8 font-medium text-[#93000a] font-numeric-data">
                  1
                </span>
                <span className="text-[12px] text-[#7f756f]">Empty</span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-[#ffdad6] flex items-center justify-center text-[#ba1a1a]">
              <span className="material-symbols-outlined text-[18px]">shopping_basket</span>
            </div>
          </div>
          <div className="mt-4 pt-2 border-t border-[#e5e2dc]/40 flex items-center justify-between">
            <span className="text-[11px] text-[#ba1a1a] font-medium">Order before 2 PM</span>
            <span className="material-symbols-outlined text-[16px] text-[#ba1a1a]">
              arrow_forward
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={onOpenVoiceDock}
          className="text-left relative p-5 rounded-xl bg-[#251b14] text-[#ffffff] shadow-sm flex flex-col justify-between overflow-hidden cursor-pointer hover:bg-[#3b3028] transition-colors"
        >
          <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-[#fddfab]/20 blur-xl pointer-events-none" />
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-semibold text-[#d5c3b8] uppercase tracking-widest">
                Store Warmth Index
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="font-serif text-[24px] leading-8 font-medium text-[#ffffff] font-numeric-data">
                  94
                </span>
                <span className="text-[12px] text-[#d5c3b8] font-numeric-data">/ 100</span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-[#ffffff]/10 flex items-center justify-center text-[#fddfab]">
              <span className="material-symbols-outlined text-[18px]">spa</span>
            </div>
          </div>
          <div className="mt-4 pt-2 border-t border-[#ffffff]/10 flex items-center justify-between">
            <span className="text-[11px] text-[#fddfab]">98% On-Shelf Availability</span>
            <span className="w-2 h-2 rounded-full bg-[#dbe7cb] animate-ping" />
          </div>
        </button>
      </section>

      {/* 3. Main Content Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column (8 cols) */}
        <div className="lg:col-span-8 space-y-8 min-w-0">
          {/* a) Morning Store Catch-up & Daily Checklist */}
          <div className="rounded-xl bg-[#ffffff] p-6 shadow-sm border border-[#e5e2dc]/40 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#fddfab]/60 flex items-center justify-center text-[#776138]">
                  <span className="material-symbols-outlined text-[22px]">
                    tips_and_updates
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-serif text-[20px] leading-7 font-medium text-[#251b14]">
                      Morning Store Catch-up &amp; Daily Checklist
                    </h2>
                    <span className="px-2 py-0.5 rounded-full bg-[#fddfab] text-[#776138] text-[11px] font-semibold">
                      Today&apos;s Action
                    </span>
                  </div>
                  <p className="text-[12px] text-[#7f756f]">
                    Hand-picked recommendations based on Bangalore festival footfall and
                    distributor cutoffs
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-[#ebe8e2] text-[#4e453f] text-[11px] font-semibold font-numeric-data">
                {parleDismissed ? '1 Quick Decision' : '2 Quick Decisions'}
              </span>
            </div>

            <div className="space-y-3 pt-2">
              {!parleDismissed && (
                <div className="p-5 rounded-xl bg-[#f6f3ed] transition-all hover:bg-[#f0eee8] border border-[#e5e2dc]/40">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <SafeImage
                        src={APP_IMAGES.parleG}
                        alt="Chai biscuits and tea packets"
                        className="w-24 h-24 rounded-lg object-cover shrink-0 shadow-sm border border-[#e5e2dc]/40"
                        fallbackLabel="PG"
                      />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[14px] text-[#251b14] font-semibold">
                            Evening Rush Alert: Parle-G &amp; Chai Biscuits Running Low
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-[#ffdad6] text-[#93000a] text-[11px] font-semibold">
                            8 packs left
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-[#f0eee8] text-[#7f756f] text-[11px] font-numeric-data">
                            Aisle 2 • Tea Counter
                          </span>
                        </div>
                        <p className="text-[14px] text-[#4e453f]">
                          Parle-G 200g sells out fastest between 4:30 PM and 7:00 PM for office
                          evening tea. We recommend restocking{' '}
                          <strong className="text-[#251b14] font-medium">
                            50 packs (₹1,400)
                          </strong>{' '}
                          before the 2:00 PM Yeshwanthpur depot truck leaves.
                        </p>
                        <div className="flex items-center gap-3 pt-1 text-[11px] text-[#7f756f]">
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px] text-[#715b33]">
                              local_shipping
                            </span>{' '}
                            Britannia &amp; Parle Depot (Yeshwanthpur)
                          </span>
                          <span>•</span>
                          <span>Delivery in ~2 hrs</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => setParleDismissed(true)}
                        className="px-3 py-1.5 rounded-lg text-[#7f756f] hover:text-[#251b14] text-[12px] font-medium transition-colors cursor-pointer"
                      >
                        Later
                      </button>
                      <button
                        type="button"
                        disabled={parleOrdered || busyPoId !== null}
                        onClick={handleOrderParle}
                        className={`px-4 py-2 rounded-lg text-[12px] font-semibold shadow-sm flex items-center gap-1.5 transition-all cursor-pointer ${
                          parleOrdered
                            ? 'bg-[#dbe7cb] text-[#17200f]'
                            : 'bg-[#251b14] text-[#ffffff] hover:bg-[#3b3028]'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[16px] text-[#fddfab]">
                          shopping_bag
                        </span>
                        <span>{parleOrdered ? 'PO Dispatched ✓' : 'Order 50 Packs'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-5 rounded-xl bg-[#f6f3ed] transition-all hover:bg-[#f0eee8] border border-[#e5e2dc]/40">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <SafeImage
                      src={APP_IMAGES.gheeFestive}
                      alt="Artisanal Cow Ghee Festive Display"
                      className="w-24 h-24 rounded-lg object-cover shrink-0 shadow-sm border border-[#e5e2dc]/40"
                      fallbackLabel="UG"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[14px] text-[#251b14] font-semibold">
                          Festive Rush Alert: Customers Prepping for Ugadi Weekend
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-[#dbe7cb] text-[#151e0d] text-[11px] font-semibold">
                          🔥 High Demand
                        </span>
                      </div>
                      <p className="text-[14px] text-[#4e453f]">
                        Local households in Koramangala are picking up{' '}
                        <strong className="text-[#251b14]">Aashirvaad Chakki Atta 5kg</strong>{' '}
                        &amp; <strong className="text-[#251b14]">Amul Pure Ghee</strong> early.
                        Keep an extra 75 bags ready on the main entryway display podium.
                      </p>
                      <div className="flex items-center gap-3 pt-1 text-[11px] text-[#7f756f]">
                        <span className="flex items-center gap-1 text-[#715b33] font-medium">
                          <span className="material-symbols-outlined text-[14px]">store</span>{' '}
                          Feature on Koramangala Front Display
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={onReviewFloorSetup}
                      className="px-4 py-2 rounded-lg bg-[#ffffff] text-[#251b14] hover:bg-[#251b14] hover:text-[#ffffff] text-[12px] font-semibold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px] text-[#715b33]">
                        visibility
                      </span>
                      <span>View Floor Setup</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* b) Weekly Flow Velocity (INR ₹ Lakhs) */}
          <div className="rounded-xl bg-[#ffffff] p-6 shadow-sm border border-[#e5e2dc]/40 space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-[#e5e2dc]/30">
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="font-serif text-[20px] leading-7 font-medium text-[#251b14] tracking-tight">
                    Weekly Flow Velocity
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#fddfab]/50 text-[#776138] text-[11px] font-semibold border border-[#fddfab]/40">
                    INR (₹ Lakhs)
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#dbe7cb]/40 text-[#151e0d] text-[11px] font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#715b33] animate-pulse" />
                    ⚡ Saturday Peak: ₹3.80L Outflow
                  </span>
                </div>
                <p className="text-[12px] text-[#7f756f] mt-1">
                  Harmonized comparative cadence: Inventory Procurement vs Retail Counter Outflow
                </p>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <div className="inline-flex p-1 rounded-lg bg-[#f6f3ed] border border-[#e5e2dc]/40">
                  <button
                    type="button"
                    onClick={() => setChartMode('curves')}
                    className={`px-3 py-1 rounded text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      chartMode === 'curves'
                        ? 'bg-[#ffffff] text-[#251b14] shadow-sm'
                        : 'text-[#7f756f] hover:text-[#251b14]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[13px] text-[#715b33]">
                      show_chart
                    </span>
                    <span>Flux Curves</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartMode('pillars')}
                    className={`px-3 py-1 rounded text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      chartMode === 'pillars'
                        ? 'bg-[#ffffff] text-[#251b14] shadow-sm'
                        : 'text-[#7f756f] hover:text-[#251b14]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[13px] text-[#715b33]">
                      bar_chart
                    </span>
                    <span>Day Pillars</span>
                  </button>
                </div>

                <div className="flex items-center gap-3 pl-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#715b33] shadow-sm" />
                    <span className="font-medium text-[#251b14] text-[12px]">Inflow</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#251b14] shadow-sm" />
                    <span className="font-medium text-[#251b14] text-[12px]">Outflow</span>
                  </div>
                  <div className="px-2.5 py-1 rounded-md bg-[#f0eee8] font-numeric-data text-[11px] text-[#4e453f] font-medium border border-[#e5e2dc]/30">
                    Wk 14 • 2025
                  </div>
                </div>
              </div>
            </div>

            <div className="relative w-full rounded-xl bg-[#f6f3ed]/50 p-4 border border-[#e5e2dc]/30 overflow-hidden">
              <div className="hidden sm:block absolute right-12 top-0 bottom-0 w-28 bg-[#fddfab]/20 pointer-events-none rounded-lg border-x border-[#fddfab]/30" />
              <div className="hidden sm:flex absolute right-14 top-2 text-[10px] uppercase font-numeric-data tracking-widest text-[#715b33] font-semibold pointer-events-none items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#715b33]" />
                Ugadi Weekend Surge
              </div>

              {chartMode === 'curves' ? (
                <div className="relative w-full h-56 pt-2">
                  <svg
                    className="w-full h-full overflow-visible"
                    preserveAspectRatio="none"
                    viewBox="0 0 700 200"
                  >
                    <defs>
                      <linearGradient id="inflowGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#715b33" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#715b33" stopOpacity="0.0" />
                      </linearGradient>
                      <linearGradient id="outflowGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#251b14" stopOpacity="0.30" />
                        <stop offset="100%" stopColor="#251b14" stopOpacity="0.02" />
                      </linearGradient>
                      <pattern
                        id="wovenDots"
                        width="12"
                        height="12"
                        patternUnits="userSpaceOnUse"
                      >
                        <circle cx="2" cy="2" r="1" fill="#715b33" fillOpacity="0.15" />
                      </pattern>
                    </defs>
                    <line
                      x1="0"
                      y1="40"
                      x2="700"
                      y2="40"
                      stroke="#d1c4bc"
                      strokeWidth="1"
                      strokeDasharray="3 3"
                      opacity="0.5"
                    />
                    <line
                      x1="0"
                      y1="90"
                      x2="700"
                      y2="90"
                      stroke="#d1c4bc"
                      strokeWidth="1"
                      strokeDasharray="3 3"
                      opacity="0.5"
                    />
                    <line
                      x1="0"
                      y1="140"
                      x2="700"
                      y2="140"
                      stroke="#d1c4bc"
                      strokeWidth="1"
                      strokeDasharray="3 3"
                      opacity="0.5"
                    />
                    <line
                      x1="0"
                      y1="185"
                      x2="700"
                      y2="185"
                      stroke="#7f756f"
                      strokeWidth="1"
                      opacity="0.3"
                    />
                    <text
                      x="690"
                      y="36"
                      fill="#7f756f"
                      fontSize="10"
                      textAnchor="end"
                      fontWeight="500"
                    >
                      ₹4.0L
                    </text>
                    <text
                      x="690"
                      y="86"
                      fill="#7f756f"
                      fontSize="10"
                      textAnchor="end"
                      fontWeight="500"
                    >
                      ₹2.8L
                    </text>
                    <text
                      x="690"
                      y="136"
                      fill="#7f756f"
                      fontSize="10"
                      textAnchor="end"
                      fontWeight="500"
                    >
                      ₹1.5L
                    </text>
                    <rect x="495" y="15" width="185" height="170" fill="url(#wovenDots)" />
                    <path
                      d="M 40,110 C 95,50 145,50 195,65 C 245,80 295,130 345,35 C 395,60 445,120 495,75 C 545,90 595,150 645,155 L 645,185 L 40,185 Z"
                      fill="url(#inflowGradient)"
                    />
                    <path
                      d="M 40,110 C 95,50 145,50 195,65 C 245,80 295,130 345,35 C 395,60 445,120 495,75 C 545,90 595,150 645,155"
                      fill="none"
                      stroke="#715b33"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                    <path
                      d="M 40,90 C 95,100 145,115 195,100 C 245,90 295,65 345,60 C 395,55 445,40 495,45 C 545,5 595,18 645,28 L 645,185 L 40,185 Z"
                      fill="url(#outflowGradient)"
                    />
                    <path
                      d="M 40,90 C 95,100 145,115 195,100 C 245,90 295,65 345,60 C 395,55 445,40 495,45 C 545,5 595,18 645,28"
                      fill="none"
                      stroke="#251b14"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                    <circle cx="40" cy="110" r="4" fill="#fcf9f3" stroke="#715b33" strokeWidth="2.5" />
                    <circle cx="195" cy="65" r="4" fill="#fcf9f3" stroke="#715b33" strokeWidth="2.5" />
                    <circle cx="345" cy="35" r="5" fill="#fddfab" stroke="#715b33" strokeWidth="2.5" />
                    <circle cx="495" cy="75" r="4" fill="#fcf9f3" stroke="#715b33" strokeWidth="2.5" />
                    <circle cx="645" cy="155" r="4" fill="#fcf9f3" stroke="#715b33" strokeWidth="2.5" />
                    <circle cx="40" cy="90" r="4" fill="#fcf9f3" stroke="#251b14" strokeWidth="2.5" />
                    <circle cx="195" cy="100" r="4" fill="#fcf9f3" stroke="#251b14" strokeWidth="2.5" />
                    <circle cx="345" cy="60" r="4" fill="#fcf9f3" stroke="#251b14" strokeWidth="2.5" />
                    <circle cx="495" cy="45" r="4" fill="#fcf9f3" stroke="#251b14" strokeWidth="2.5" />
                    <circle cx="570" cy="14" r="6" fill="#ba1a1a" stroke="#ffffff" strokeWidth="2" />
                    <circle cx="645" cy="28" r="4.5" fill="#251b14" stroke="#fddfab" strokeWidth="2" />
                  </svg>

                  <div className="hidden sm:flex absolute left-[45%] top-[10px] -translate-x-1/2 px-2.5 py-1 rounded-md bg-[#ffffff]/95 backdrop-blur-md shadow-sm border border-[#fddfab]/60 items-center gap-1.5 pointer-events-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#715b33]" />
                    <span className="text-[11px] font-semibold text-[#251b14] font-numeric-data">
                      Thu Restock: ₹3.40L
                    </span>
                  </div>
                  <div className="hidden sm:flex absolute right-[14%] top-[2px] px-2.5 py-1 rounded-md bg-[#251b14] text-[#ffffff] shadow-md border border-[#fddfab]/30 items-center gap-1.5 pointer-events-none">
                    <span className="material-symbols-outlined text-[12px] text-[#fddfab]">
                      bolt
                    </span>
                    <span className="text-[11px] font-semibold font-numeric-data">
                      Sat Outflow: ₹3.80L
                    </span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-3 h-56 items-end pt-8 pb-2">
                  {FLOW_DAYS.map((d, idx) => (
                    <button
                      key={d.day}
                      type="button"
                      onClick={() => setSelectedDayIdx(idx)}
                      className={`flex flex-col items-center justify-end h-full rounded-xl p-2 cursor-pointer transition-colors ${
                        selectedDayIdx === idx
                          ? 'bg-[#ffffff] shadow-sm ring-1 ring-[#715b33]/30'
                          : 'hover:bg-[#ffffff]/60'
                      }`}
                    >
                      <div className="flex items-end gap-1.5 h-36">
                        <div
                          className="w-3.5 rounded-t-md bg-[#715b33]"
                          style={{ height: `${Math.round((d.inflowNum / 4) * 100)}%` }}
                          title={`Inflow: ₹${d.inflow}L`}
                        />
                        <div
                          className="w-3.5 rounded-t-md bg-[#251b14]"
                          style={{ height: `${Math.round((d.outflowNum / 4) * 100)}%` }}
                          title={`Outflow: ₹${d.outflow}L`}
                        />
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* 7-Day Interactive Legend Strip */}
              <div className="grid grid-cols-7 gap-2 pt-2 px-2 border-t border-[#e5e2dc]/40">
                {FLOW_DAYS.map((d, idx) => (
                  <button
                    key={d.day}
                    type="button"
                    onClick={() => setSelectedDayIdx(idx)}
                    className={`flex flex-col items-center gap-1 rounded py-0.5 cursor-pointer transition-colors ${
                      selectedDayIdx === idx || d.peak
                        ? 'bg-[#fddfab]/30'
                        : d.today
                          ? 'bg-[#fddfab]/20'
                          : ''
                    }`}
                  >
                    <span
                      className={`text-[12px] ${
                        d.peak
                          ? 'text-[#251b14] font-bold'
                          : d.highlight
                            ? 'text-[#251b14] font-semibold'
                            : d.today
                              ? 'text-[#715b33] font-semibold'
                              : 'text-[#7f756f] font-medium'
                      }`}
                    >
                      {d.day}
                    </span>
                    <div className="flex items-center gap-1">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          d.peak
                            ? 'bg-[#251b14]'
                            : d.today
                              ? 'bg-[#715b33] animate-pulse'
                              : 'bg-[#715b33]/80'
                        }`}
                      />
                      <span
                        className={`font-numeric-data text-[10px] ${
                          d.peak
                            ? 'text-[#251b14] font-bold'
                            : d.highlight || d.today
                              ? 'text-[#715b33] font-semibold'
                              : 'text-[#7f756f]'
                        }`}
                      >
                        {d.inflow} / {d.outflow}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 3 KPI Micro-Capsules */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="p-3 rounded-lg bg-[#f6f3ed] border border-[#e5e2dc]/40 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-md bg-[#fddfab]/50 flex items-center justify-center text-[#715b33]">
                    <span className="material-symbols-outlined text-[16px]">speed</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#7f756f] uppercase tracking-wider font-semibold">
                      Peak Outflow
                    </span>
                    <p className="font-numeric-data font-semibold text-[#251b14] text-[14px]">
                      Saturday ₹3.80L
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-[#dbe7cb]/50 text-[#17200f] text-[10px] font-semibold font-numeric-data">
                  +32% Surge
                </span>
              </div>

              <div className="p-3 rounded-lg bg-[#f6f3ed] border border-[#e5e2dc]/40 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-md bg-[#ebe8e2] flex items-center justify-center text-[#251b14]">
                    <span className="material-symbols-outlined text-[16px]">account_balance</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#7f756f] uppercase tracking-wider font-semibold">
                      Weekly Inflow Buffer
                    </span>
                    <p className="font-numeric-data font-semibold text-[#251b14] text-[14px]">
                      +₹5.24L Buffer
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-[#ebe8e2] text-[#4e453f] text-[10px] font-medium">
                  Healthy
                </span>
              </div>

              <div className="p-3 rounded-lg bg-[#f6f3ed] border border-[#e5e2dc]/40 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-md bg-[#fddfab]/50 flex items-center justify-center text-[#776138]">
                    <span className="material-symbols-outlined text-[16px]">autorenew</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#7f756f] uppercase tracking-wider font-semibold">
                      Turnover Velocity
                    </span>
                    <p className="font-numeric-data font-semibold text-[#251b14] text-[14px]">
                      1.32x{' '}
                      <span className="text-[11px] font-normal text-[#7f756f]">
                        (Target 1.25x)
                      </span>
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-[#dbe7cb] text-[#151e0d] text-[10px] font-semibold">
                  Exceeding
                </span>
              </div>
            </div>
          </div>

          {/* c) Store Register & Live Stock Ledger */}
          <div className="rounded-xl bg-[#ffffff] p-6 shadow-sm border border-[#e5e2dc]/40 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-serif text-[20px] leading-7 font-medium text-[#251b14]">
                    Store Register &amp; Live Stock Ledger
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-[#ebe8e2] text-[#1c1c18] text-[11px] font-medium">
                    Verified by Ananya
                  </span>
                </div>
                <p className="text-[12px] text-[#7f756f]">
                  Counter receipts, inward delivery challans, and shelf transfers
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('stock-movement')}
                className="self-start sm:self-center text-[12px] font-semibold text-[#715b33] hover:text-[#251b14] flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>Open Full Store Ledger</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>

            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#e5e2dc]/60">
                    <th className="py-3 px-3 text-[11px] font-semibold text-[#7f756f] uppercase tracking-wider">
                      Time
                    </th>
                    <th className="py-3 px-3 text-[11px] font-semibold text-[#7f756f] uppercase tracking-wider">
                      Product &amp; Category
                    </th>
                    <th className="py-3 px-3 text-[11px] font-semibold text-[#7f756f] uppercase tracking-wider">
                      Type
                    </th>
                    <th className="py-3 px-3 text-[11px] font-semibold text-[#7f756f] uppercase tracking-wider text-right">
                      Qty
                    </th>
                    <th className="py-3 px-3 text-[11px] font-semibold text-[#7f756f] uppercase tracking-wider">
                      Channel / Notes
                    </th>
                    <th className="py-3 px-3 text-[11px] font-semibold text-[#7f756f] uppercase tracking-wider text-right">
                      Store Balance
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e2dc]/30 text-[12px]">
                  {movements.slice(0, 5).map((m) => {
                    const isIn = m.type === 'Stock In';
                    return (
                      <tr key={m.id} className="hover:bg-[#f6f3ed] transition-colors">
                        <td className="py-3.5 px-3 whitespace-nowrap text-[#4e453f] font-numeric-data">
                          {m.displayTime}
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="flex flex-col">
                            <span className="font-medium text-[#251b14]">{m.productName}</span>
                            <span className="font-numeric-data text-[11px] text-[#7f756f]">
                              SKU: {m.sku}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                              isIn
                                ? 'text-[#17200f] bg-[#dbe7cb]/40'
                                : 'text-[#4e453f] bg-[#ebe8e2]'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[13px]">
                              {isIn ? 'local_shipping' : 'shopping_bag'}
                            </span>
                            {isIn ? 'INWARD DOCK' : 'BILLING DESK'}
                          </span>
                        </td>
                        <td
                          className={`py-3.5 px-3 text-right font-numeric-data font-semibold ${
                            m.qtyChanged > 0 ? 'text-[#17200f]' : 'text-[#ba1a1a]'
                          }`}
                        >
                          {m.qtyChanged > 0 ? `+${m.qtyChanged}` : m.qtyChanged}
                        </td>
                        <td className="py-3.5 px-3 text-[#4e453f]">
                          {m.reasonTitle} • {m.referenceNote}
                        </td>
                        <td className="py-3.5 px-3 text-right font-numeric-data font-medium text-[#251b14]">
                          {m.newStock} units
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column (4 cols) */}
        <div className="lg:col-span-4 space-y-8 min-w-0">
          {/* Low-Stock Watchlist */}
          <div className="rounded-xl bg-[#ffffff] p-6 shadow-sm border border-[#e5e2dc]/40 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ba1a1a] animate-pulse" />
                <h2 className="font-serif text-[20px] leading-7 font-medium text-[#251b14]">
                  Low-Stock Watchlist
                </h2>
              </div>
              <span className="text-[11px] text-[#7f756f] font-numeric-data font-semibold">
                {watchlistItems.length} Needs Restocking
              </span>
            </div>

            <div className="space-y-3">
              {watchlistItems.map((item, idx) => {
                const ratio = Math.min(
                  100,
                  Math.round((item.stockUnits / Math.max(1, item.minStock)) * 100),
                );
                const isFirst = idx === 0;
                return (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl bg-[#f6f3ed] flex flex-col gap-2.5 border border-[#e5e2dc]/40"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-[14px] text-[#251b14] font-semibold">
                            {item.name}
                          </p>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              idx === 2
                                ? 'bg-[#fddfab]/50 text-[#715b33] font-semibold'
                                : 'bg-[#f0eee8] text-[#7f756f]'
                            }`}
                          >
                            {item.category}
                          </span>
                        </div>
                        <p className="text-[12px] text-[#7f756f]">
                          Min safe stock: {item.minStock} {item.unitLabel}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold font-numeric-data shrink-0 ${
                          ratio <= 35
                            ? 'bg-[#ffdad6] text-[#93000a]'
                            : 'bg-[#fddfab] text-[#776138]'
                        }`}
                      >
                        {item.stockUnits} left
                      </span>
                    </div>

                    <div className="w-full bg-[#f0eee8] h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          ratio <= 35 ? 'bg-[#ba1a1a]' : 'bg-[#715b33]'
                        }`}
                        style={{ width: `${Math.max(12, ratio)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span
                        className={`text-[12px] font-medium ${
                          isFirst ? 'text-[#ba1a1a]' : 'text-[#7f756f]'
                        }`}
                      >
                        {isFirst ? '⏳ Will empty by 4 PM' : item.supplierName}
                      </span>
                      <button
                        type="button"
                        disabled={busyPoId === item.id}
                        onClick={async () => {
                          setBusyPoId(item.id);
                          await onQuickCreatePo(
                            item.id,
                            Math.max(30, item.minStock * 2),
                            'Watchlist Reorder',
                          );
                          setBusyPoId(null);
                        }}
                        className={`px-3 py-1 rounded-lg transition-colors text-[11px] font-medium cursor-pointer ${
                          isFirst
                            ? 'bg-[#715b33] text-[#ffffff] hover:bg-[#776138]'
                            : 'bg-[#ebe8e2] text-[#251b14] hover:bg-[#e5e2dc]'
                        }`}
                      >
                        {busyPoId === item.id
                          ? 'Staging...'
                          : isFirst
                            ? 'Quick Reorder'
                            : idx === 1
                              ? 'WhatsApp PO'
                              : 'Prepare PO'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Store Best-Sellers */}
          <div className="rounded-xl bg-[#ffffff] p-6 shadow-sm border border-[#e5e2dc]/40 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-[20px] leading-7 font-medium text-[#251b14]">
                  Store Best-Sellers
                </h2>
                <span className="text-[14px]">🔥</span>
              </div>
              <span className="text-[11px] text-[#715b33] uppercase font-semibold">
                Koramangala Favorites
              </span>
            </div>

            <div className="space-y-3.5">
              {bestSellers.map((prod, idx) => (
                <div
                  key={prod.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-[#f6f3ed] hover:bg-[#f0eee8] transition-colors border border-[#e5e2dc]/30"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <SafeImage
                        src={prod.imageUrl}
                        alt={prod.name}
                        className="w-10 h-10 rounded-lg object-cover border border-[#e5e2dc]/40 shadow-sm"
                      />
                      <span
                        className={`w-4 h-4 rounded-full font-numeric-data font-bold text-[10px] flex items-center justify-center absolute -top-1 -left-1 shadow-sm ${
                          idx === 0
                            ? 'bg-[#fddfab] text-[#776138]'
                            : 'bg-[#f0eee8] text-[#4e453f]'
                        }`}
                      >
                        {idx + 1}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-medium text-[#251b14] text-[13px] truncate">
                          {prod.name}
                        </p>
                      </div>
                      <p className="text-[11px] text-[#7f756f] font-numeric-data">
                        {formatINR(prod.sellingPrice)} • {prod.monthlyFamilies || 84} units sold
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className="font-numeric-data font-semibold text-[#251b14] text-[13px]">
                      {formatINR(prod.weeklyRevenue || 48000)}
                    </p>
                    <span className="text-[11px] text-[#17200f] font-semibold">
                      +{prod.weeklyGrowthPct || 12}% this week
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Merchandising Spotlight */}
          <div className="rounded-xl bg-[#ffffff] p-5 shadow-sm border border-[#e5e2dc]/40 space-y-3 overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-[#715b33]">
                  photo_camera
                </span>
                <h3 className="font-serif text-[18px] font-medium text-[#251b14]">
                  Merchandising Spotlight
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-[#dbe7cb] text-[#151e0d] text-[10px] font-semibold">
                Audited 9:15 AM
              </span>
            </div>

            <div className="relative rounded-lg overflow-hidden group shadow-sm">
              <SafeImage
                src={APP_IMAGES.aashirvaadStore}
                alt="Silk & Spice Atelier Koramangala Store Interior"
                className="w-full h-36 object-cover group-hover:scale-105 transition-transform duration-300"
                fallbackLabel="KA"
              />
              <div className="absolute inset-0 bg-linear-to-t from-[#251b14]/80 via-[#251b14]/20 to-transparent flex flex-col justify-end p-3 text-[#ffffff]">
                <p className="font-serif text-[16px] leading-tight text-white">
                  Koramangala Atelier • Main Bay
                </p>
                <p className="text-[11px] text-[#d5c3b8]">
                  98.4% On-Shelf Planogram Compliance
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[12px] text-[#7f756f] flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#bfcab0]" />
                Ugadi Entryway Display Active
              </span>
              <button
                type="button"
                onClick={onReviewFloorSetup}
                className="text-[11px] text-[#715b33] hover:text-[#251b14] font-semibold flex items-center gap-0.5 transition-colors cursor-pointer"
              >
                <span>Audit Photos</span>
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </button>
            </div>
          </div>

          {/* WhatsApp Store Briefing */}
          <div className="rounded-xl bg-[#ffffff] p-6 shadow-sm border border-[#e5e2dc]/40 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#dbe7cb] text-[#151e0d] flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">send_to_mobile</span>
              </div>
              <div>
                <h3 className="text-[14px] text-[#251b14] font-semibold">
                  WhatsApp Store Briefing
                </h3>
                <p className="text-[12px] text-[#7f756f]">Morning dispatch to Store Manager</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#f6f3ed] space-y-2 text-[12px] border border-[#e5e2dc]/40">
              <div className="flex items-center justify-between text-[#7f756f]">
                <span className="text-[11px] font-semibold uppercase tracking-wider">
                  Store Manager
                </span>
                <span className="font-numeric-data text-[#251b14] font-medium">
                  +91 98450 12345 (Ramesh K.)
                </span>
              </div>
              <p className="text-[#4e453f] bg-[#ffffff] p-3 rounded-lg font-numeric-data text-[12px] leading-relaxed border border-[#e5e2dc]/30">
                &ldquo;Namaskara Ramesh! 3 items need urgent attention before the 4 PM rush
                (Parle-G, Dettol, Tata Tea). Yesterday&apos;s counter total was ₹1.24L across 48
                customer bills. Please confirm supplier PO before 2 PM.&rdquo;
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onSendWhatsAppBriefing}
                className="flex-1 py-2 rounded-lg bg-[#17200f] text-[#ffffff] hover:bg-[#2b3522] transition-all text-[12px] font-semibold flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">send</span>
                <span>Send to Ramesh via WhatsApp</span>
              </button>
              <button
                type="button"
                onClick={onSendWhatsAppBriefing}
                className="px-3 py-2 rounded-lg bg-[#f6f3ed] text-[#251b14] hover:bg-[#f0eee8] transition-colors text-[12px] font-medium cursor-pointer"
              >
                Preview
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Floating Assistant Docked Chip Bar */}
      <div className="rounded-xl bg-[#f0eee8] p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#251b14] text-[#fddfab] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[18px]">storefront</span>
          </div>
          <div>
            <p className="text-[12px] text-[#251b14] font-semibold">
              Silk &amp; Spice Store Concierge
            </p>
            <p className="text-[12px] text-[#7f756f]">
              Ask about festival stock lists, supplier arrival times, or counter sales trends
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { icon: 'schedule', label: 'Which items will run out by 4 PM?' },
            { icon: 'festival', label: 'Ugadi festive checklist & ghee demand' },
            { icon: 'call', label: 'Has Britannia depot truck dispatched?' },
          ].map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={() => onAskConciergePrompt(chip.label)}
              className="px-3 py-1.5 rounded-full bg-[#ffffff] text-[#251b14] hover:bg-[#251b14] hover:text-[#ffffff] transition-all text-[11px] font-semibold shadow-sm flex items-center gap-1.5 cursor-pointer group"
            >
              <span className="material-symbols-outlined text-[14px] text-[#715b33] group-hover:text-[#fddfab]">
                {chip.icon}
              </span>
              {chip.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
