import { useMemo } from 'react';
import type {
  NotificationItem,
  Product,
  PurchaseOrder,
  StaffMember,
  StockMovement,
} from '../types.ts';
import { formatINR } from '../lib/api.ts';
import { SafeImage } from './SafeImage.tsx';

export function ReportsAnalyticsView({
  products,
  movements,
  purchaseOrders,
}: {
  products: Product[];
  movements: StockMovement[];
  purchaseOrders: PurchaseOrder[];
}) {
  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, { value: number; units: number }>();
    for (const p of products) {
      const cur = map.get(p.category) || { value: 0, units: 0 };
      cur.value += p.stockUnits * p.sellingPrice;
      cur.units += p.stockUnits;
      map.set(p.category, cur);
    }
    const entries = Array.from(map.entries());
    const maxVal = Math.max(1, ...entries.map(([, v]) => v.value));
    return entries.map(([cat, v]) => ({
      cat,
      value: v.value,
      units: v.units,
      pct: Math.round((v.value / maxVal) * 100),
    }));
  }, [products]);

  const totalPoSpend = purchaseOrders.reduce((sum, po) => sum + po.totalAmount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-label-sm uppercase tracking-[0.12em] text-[#715b33] mb-1">
            Executive Retail Telemetry
          </p>
          <h1 className="text-headline-lg text-[#251b14]">Reports &amp; Analytics</h1>
          <p className="text-body-md text-[#4e453f] mt-1">
            Category capital allocation, turnover ratios, and GST procurement spend.
          </p>
        </div>
        <a
          href="/api/export/inventory?format=csv"
          className="px-4 py-2.5 rounded-xl bg-[#251b14] text-[#fcf9f3] text-xs font-semibold self-start"
        >
          Download Audit CSV
        </a>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#ffffff] p-5 rounded-2xl border border-[#d1c4bc]/40">
          <span className="text-label-md text-[#4e453f]">Active Purchase Order Spend</span>
          <p className="font-serif text-2xl font-semibold text-[#251b14] font-numeric-data mt-1">
            {formatINR(totalPoSpend)}
          </p>
        </div>
        <div className="bg-[#ffffff] p-5 rounded-2xl border border-[#d1c4bc]/40">
          <span className="text-label-md text-[#4e453f]">Audit Ledger Movements</span>
          <p className="font-serif text-2xl font-semibold text-[#17200f] font-numeric-data mt-1">
            {movements.length} Entries
          </p>
        </div>
        <div className="bg-[#ffffff] p-5 rounded-2xl border border-[#d1c4bc]/40">
          <span className="text-label-md text-[#4e453f]">Floor GMROI Index</span>
          <p className="font-serif text-2xl font-semibold text-[#715b33] font-numeric-data mt-1">
            3.84x
          </p>
        </div>
      </div>

      <section className="bg-[#ffffff] rounded-2xl border border-[#d1c4bc]/40 p-6 space-y-4">
        <h2 className="text-headline-sm text-[#251b14]">Category Capital Allocation</h2>
        <div className="space-y-3">
          {categoryBreakdown.map((row) => (
            <div key={row.cat} className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-[#251b14]">
                  {row.cat} ({row.units} units)
                </span>
                <span className="font-bold text-[#17200f] font-numeric-data">
                  {formatINR(row.value)}
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-[#f0eee8] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#715b33]"
                  style={{ width: `${row.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export function NotificationsView({
  notifications,
  onMarkRead,
  onQuickReorder,
}: {
  notifications: NotificationItem[];
  onMarkRead: (id: string | 'all') => Promise<void>;
  onQuickReorder: (productId: string) => Promise<void>;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-label-sm uppercase tracking-[0.12em] text-[#715b33] mb-1">
            Real-Time Floor Alerts
          </p>
          <h1 className="text-headline-lg text-[#251b14]">Notifications &amp; Action Queue</h1>
        </div>
        <button
          type="button"
          onClick={() => onMarkRead('all')}
          className="px-4 py-2 rounded-xl bg-[#f0eee8] hover:bg-[#e5e2dc] text-xs font-semibold text-[#251b14] cursor-pointer self-start"
        >
          Mark All Read
        </button>
      </div>

      <div className="space-y-3">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              n.read
                ? 'bg-[#fcf9f3] border-[#d1c4bc]/40 opacity-80'
                : 'bg-[#ffffff] border-[#715b33]/40 shadow-xs'
            }`}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    n.severity === 'critical'
                      ? 'bg-[#ffdad6] text-[#93000a]'
                      : 'bg-[#fddfab] text-[#57441e]'
                  }`}
                >
                  {n.category}
                </span>
                <span className="text-xs text-[#7f756f]">{n.createdAt}</span>
                {!n.read && <span className="w-2 h-2 rounded-full bg-[#ba1a1a]" />}
              </div>
              <h3 className="text-sm font-semibold text-[#251b14]">{n.title}</h3>
              <p className="text-xs text-[#4e453f]">{n.message}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!n.read && (
                <button
                  type="button"
                  onClick={() => onMarkRead(n.id)}
                  className="px-3 py-1.5 rounded-xl bg-[#f0eee8] text-xs font-semibold text-[#251b14] cursor-pointer"
                >
                  Acknowledge
                </button>
              )}
              {n.productId && (
                <button
                  type="button"
                  onClick={() => onQuickReorder(n.productId!)}
                  className="px-3.5 py-1.5 rounded-xl bg-[#251b14] text-[#fcf9f3] text-xs font-semibold cursor-pointer"
                >
                  {n.actionLabel || 'Take Action'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function StaffManagementView({
  staff,
  onToggleStatus,
}: {
  staff: StaffMember[];
  onToggleStatus: (member: StaffMember) => Promise<void>;
}) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-label-sm uppercase tracking-[0.12em] text-[#715b33] mb-1">
          Koramangala Atelier 04 Roster
        </p>
        <h1 className="text-headline-lg text-[#251b14]">Staff Management &amp; Shift Access</h1>
        <p className="text-body-md text-[#4e453f] mt-1">
          Manage floor shift status and role permissions across POS counters and inward bays.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {staff.map((m) => (
          <div
            key={m.id}
            className="bg-[#ffffff] rounded-2xl border border-[#d1c4bc]/40 p-5 shadow-xs space-y-4"
          >
            <div className="flex items-center gap-3">
              <SafeImage
                src={m.avatarUrl}
                alt={m.name}
                className="w-12 h-12 rounded-full object-cover border border-[#d1c4bc]"
                fallbackLabel={m.name}
              />
              <div>
                <h3 className="text-sm font-semibold text-[#251b14]">{m.name}</h3>
                <p className="text-xs text-[#715b33]">{m.role}</p>
              </div>
            </div>

            <div className="text-xs space-y-1 text-[#4e453f]">
              <p>Shift: {m.shift}</p>
              <p className="font-numeric-data">{m.phone}</p>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {m.permissions.map((perm) => (
                <span
                  key={perm}
                  className="px-2 py-0.5 rounded-full bg-[#f6f3ed] text-[10px] font-semibold text-[#4e453f]"
                >
                  {perm}
                </span>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#d1c4bc]/30">
              <span
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                  m.status === 'On Shift'
                    ? 'bg-[#dbe7cb] text-[#17200f]'
                    : 'bg-[#f0eee8] text-[#4e453f]'
                }`}
              >
                {m.status}
              </span>
              <button
                type="button"
                onClick={() => onToggleStatus(m)}
                className="px-3 py-1.5 rounded-xl bg-[#251b14] text-[#fcf9f3] text-xs font-semibold cursor-pointer"
              >
                Toggle Shift
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
