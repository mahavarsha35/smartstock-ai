import { useCallback, useEffect, useState } from 'react';
import type {
  BootstrapData,
  NavPage,
  Product,
  PurchaseOrder,
  StaffMember,
  StockMovement,
  StoreSettings,
  Supplier,
} from './types.ts';
import { api, APP_IMAGES, formatINR } from './lib/api.ts';
import { Sidebar } from './components/Sidebar.tsx';
import { TopBar } from './components/TopBar.tsx';
import { AmbientVoiceDock } from './components/AmbientVoiceDock.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { ProductsView } from './components/ProductsView.tsx';
import { StockMovementView } from './components/StockMovementView.tsx';
import { AiInsightsView } from './components/AiInsightsView.tsx';
import { SuppliersView } from './components/SuppliersView.tsx';
import { ConciergeView } from './components/ConciergeView.tsx';
import { SettingsView } from './components/SettingsView.tsx';
import {
  NotificationsView,
  ReportsAnalyticsView,
  StaffManagementView,
} from './components/SecondaryViews.tsx';
import { SafeImage } from './components/SafeImage.tsx';

interface ToastBanner {
  id: number;
  message: string;
  tone: 'success' | 'info' | 'error';
}

export default function App() {
  const [data, setData] = useState<BootstrapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activePage, setActivePage] = useState<NavPage>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [voiceDockOpen, setVoiceDockOpen] = useState(false);
  const [queuedPrompt, setQueuedPrompt] = useState<string | null>(null);
  const [language, setLanguage] = useState<'en' | 'hi' | 'ta' | 'kn'>('en');
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);
  const [floorSetupOpen, setFloorSetupOpen] = useState(false);
  const [openSupplierAddModal, setOpenSupplierAddModal] = useState(false);
  const [toast, setToast] = useState<ToastBanner | null>(null);

  const notify = useCallback(
    (message: string, tone: 'success' | 'info' | 'error' = 'success') => {
      const id = Date.now();
      setToast({ id, message, tone });
      window.setTimeout(() => {
        setToast((prev) => (prev?.id === id ? null : prev));
      }, 4500);
    },
    [],
  );

  const refreshData = useCallback(async () => {
    try {
      setLoadError(null);
      const res = await api.bootstrap();
      setData(res);
      if (res.settings?.language) {
        setLanguage(res.settings.language);
      }
    } catch (err: any) {
      setLoadError(err?.message || 'Unable to connect to SmartStock backend.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshData();
  }, [refreshData]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleQuickCreatePo = async (productId: string, qty: number, notes?: string) => {
    try {
      const po = await api.createPurchaseOrder({
        productId,
        qty,
        status: 'Dispatched',
        notes,
      });
      setData((prev) =>
        prev ? { ...prev, purchaseOrders: [po, ...prev.purchaseOrders] } : prev,
      );
      notify(
        `${po.poNumber} dispatched to ${po.supplierName} (${po.qty} ${po.unitLabel}, ${formatINR(po.totalAmount)}).`,
        'success',
      );
    } catch (err: any) {
      notify(err?.message || 'Failed to dispatch Purchase Order.', 'error');
    }
  };

  const handleApproveDraftPo = async (draft: PurchaseOrder) => {
    await handleQuickCreatePo(
      draft.productId,
      draft.qty,
      draft.notes || 'Approved via SmartStock Concierge',
    );
  };

  const handleCreateProduct = async (input: Partial<Product>) => {
    try {
      const created = await api.createProduct(input);
      setData((prev) => (prev ? { ...prev, products: [created, ...prev.products] } : prev));
      notify(`Added ${created.name} (${created.sku}) to catalog.`, 'success');
    } catch (err: any) {
      notify(err?.message || 'Failed to add product.', 'error');
    }
  };

  const handleUpdateProduct = async (id: string, patch: Partial<Product>) => {
    try {
      const updated = await api.updateProduct(id, patch);
      setData((prev) =>
        prev
          ? { ...prev, products: prev.products.map((p) => (p.id === id ? updated : p)) }
          : prev,
      );
      notify(`Updated specifications for ${updated.name}.`, 'success');
    } catch (err: any) {
      notify(err?.message || 'Failed to update SKU.', 'error');
    }
  };

  const handleBulkAdjustPrice = async (percentage: number, category?: string) => {
    try {
      const res = await api.bulkAdjustPrices(percentage, category);
      setData((prev) => (prev ? { ...prev, products: res.products } : prev));
      notify(`Bulk price adjustment (${percentage}%) applied.`, 'success');
    } catch (err: any) {
      notify(err?.message || 'Bulk price update failed.', 'error');
    }
  };

  const handleRecordMovement = async (input: {
    productId: string;
    type: StockMovement['type'];
    qty: number;
    reasonTitle: string;
    referenceNote: string;
    unitCost?: number;
  }) => {
    try {
      const res = await api.recordMovement(input);
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          movements: [res.movement, ...prev.movements],
          products: prev.products.map((p) => (p.id === res.product.id ? res.product : p)),
        };
      });
      notify(
        `${res.movement.txnCode}: ${res.product.name} updated to ${res.product.stockUnits} ${res.product.unitLabel}.`,
        'success',
      );
    } catch (err: any) {
      notify(err?.message || 'Failed to record movement.', 'error');
    }
  };

  const handleCreateSupplier = async (input: Partial<Supplier>): Promise<Supplier | null> => {
    try {
      const created = await api.createSupplier(input);
      setData((prev) =>
        prev ? { ...prev, suppliers: [created, ...prev.suppliers] } : prev,
      );
      return created;
    } catch (err: any) {
      notify(err?.message || 'Failed to onboard supplier.', 'error');
      return null;
    }
  };

  const handleMarkNotificationRead = async (id: string | 'all') => {
    try {
      const res = await api.markNotificationRead(id);
      setData((prev) => (prev ? { ...prev, notifications: res.notifications } : prev));
    } catch (err: any) {
      notify(err?.message || 'Could not update notifications.', 'error');
    }
  };

  const handleToggleStaffStatus = async (member: StaffMember) => {
    const nextStatus = member.status === 'On Shift' ? 'Off Duty' : 'On Shift';
    try {
      const updated = await api.updateStaff(member.id, { status: nextStatus });
      setData((prev) =>
        prev
          ? { ...prev, staff: prev.staff.map((s) => (s.id === member.id ? updated : s)) }
          : prev,
      );
      notify(`${member.name} marked as ${nextStatus}.`, 'info');
    } catch (err: any) {
      notify(err?.message || 'Could not update staff status.', 'error');
    }
  };

  const handleSaveSettings = async (updated: StoreSettings) => {
    try {
      const saved = await api.saveSettings(updated);
      setData((prev) => (prev ? { ...prev, settings: saved } : prev));
      notify('Store settings & governance preferences saved.', 'success');
    } catch (err: any) {
      notify(err?.message || 'Failed to save settings.', 'error');
    }
  };

  const handleAskConciergeFromDock = async (prompt: string) => {
    try {
      return await api.queryConcierge(prompt, language);
    } catch (err: any) {
      notify(err?.message || 'SmartStock Concierge request failed.', 'error');
      return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fcf9f3] flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#251b14] flex items-center justify-center animate-pulse">
            <span className="material-symbols-outlined text-[#fddfab] text-[28px]">
              inventory_2
            </span>
          </div>
          <p className="font-serif text-xl text-[#251b14]">Loading Silk &amp; Spice Atelier...</p>
          <p className="text-xs text-[#4e453f]">Synchronizing Koramangala Store 04 ledger</p>
        </div>
      </div>
    );
  }

  if (loadError || !data) {
    return (
      <div className="min-h-screen bg-[#fcf9f3] flex items-center justify-center p-6">
        <div className="bg-[#ffffff] border border-[#d1c4bc] rounded-3xl p-8 max-w-md text-center space-y-4">
          <h1 className="font-serif text-2xl text-[#251b14]">Unable to Connect</h1>
          <p className="text-sm text-[#4e453f]">{loadError}</p>
          <button
            type="button"
            onClick={() => void refreshData()}
            className="px-5 py-2.5 rounded-xl bg-[#251b14] text-[#fcf9f3] text-xs font-semibold cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const unreadCount = data.notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-[#fcf9f3] text-[#1c1c18]">
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        unreadNotifications={unreadCount}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <TopBar
        onOpenMobileMenu={() => setMobileMenuOpen(true)}
        onOpenCommandSearch={() => setCommandOpen(true)}
        onNavigate={setActivePage}
        onQuickAction={(action) => {
          if (action === 'stock-in') setActivePage('stock-movement');
          if (action === 'add-product') setActivePage('products');
          if (action === 'add-supplier') {
            setOpenSupplierAddModal(true);
            setActivePage('suppliers');
          }
          if (action === 'ai-concierge') setActivePage('ai-concierge');
        }}
        onSendWhatsAppBriefing={() => setWhatsappModalOpen(true)}
        language={language}
        onChangeLanguage={setLanguage}
        unreadNotifications={unreadCount}
        health={data.health}
        curatorName={data.settings.curatorName}
      />

      {/* Toast Notification Banner */}
      {toast && (
        <div className="fixed top-24 right-6 z-50 max-w-md animate-in fade-in slide-in-from-top-2">
          <div
            className={`px-4 py-3 rounded-2xl shadow-lg border text-xs font-semibold flex items-center gap-3 ${
              toast.tone === 'error'
                ? 'bg-[#ffdad6] text-[#93000a] border-[#ba1a1a]/30'
                : toast.tone === 'info'
                  ? 'bg-[#fddfab] text-[#271900] border-[#715b33]/30'
                  : 'bg-[#17200f] text-[#fcf9f3] border-[#2b3522]'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">
              {toast.tone === 'error' ? 'error' : toast.tone === 'info' ? 'info' : 'check_circle'}
            </span>
            <span className="flex-1">{toast.message}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="opacity-70 hover:opacity-100 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content Stage */}
      <main className="pt-22 pb-28 px-4 sm:px-8 lg:pl-80 lg:pr-8 max-w-[1600px] mx-auto">
        {activePage === 'dashboard' && (
          <DashboardView
            products={data.products}
            suppliers={data.suppliers}
            movements={data.movements}
            purchaseOrders={data.purchaseOrders}
            notifications={data.notifications}
            onNavigate={setActivePage}
            onQuickCreatePo={handleQuickCreatePo}
            onOpenStockEntryModal={() => setActivePage('stock-movement')}
            onOpenVoiceDock={() => setVoiceDockOpen(true)}
            onAskConciergePrompt={(q) => {
              setVoiceDockOpen(true);
              setQueuedPrompt(q);
            }}
            onSendWhatsAppBriefing={() => setWhatsappModalOpen(true)}
            onReviewFloorSetup={() => setFloorSetupOpen(true)}
          />
        )}

        {activePage === 'products' && (
          <ProductsView
            products={data.products}
            suppliers={data.suppliers}
            onCreateProduct={handleCreateProduct}
            onUpdateProduct={handleUpdateProduct}
            onBulkAdjustPrice={handleBulkAdjustPrice}
            onCreatePo={handleQuickCreatePo}
            onNotify={notify}
          />
        )}

        {activePage === 'stock-movement' && (
          <StockMovementView
            products={data.products}
            movements={data.movements}
            onRecordMovement={handleRecordMovement}
            onNotify={notify}
          />
        )}

        {activePage === 'ai-insights' && (
          <AiInsightsView
            products={data.products}
            onCreatePo={handleQuickCreatePo}
            onSendWhatsAppBriefing={() => setWhatsappModalOpen(true)}
            onNotify={notify}
          />
        )}

        {activePage === 'suppliers' && (
          <SuppliersView
            suppliers={data.suppliers}
            products={data.products}
            purchaseOrders={data.purchaseOrders}
            onCreateSupplier={handleCreateSupplier}
            onCreatePo={handleQuickCreatePo}
            onNotify={notify}
            openAddModalSignal={openSupplierAddModal}
            onClearAddSignal={() => setOpenSupplierAddModal(false)}
          />
        )}

        {activePage === 'ai-concierge' && (
          <ConciergeView
            products={data.products}
            suppliers={data.suppliers}
            language={language}
            onChangeLanguage={setLanguage}
            onApproveDraftPo={handleApproveDraftPo}
            onNotify={notify}
          />
        )}

        {activePage === 'reports-analytics' && (
          <ReportsAnalyticsView
            products={data.products}
            movements={data.movements}
            purchaseOrders={data.purchaseOrders}
          />
        )}

        {activePage === 'notifications' && (
          <NotificationsView
            notifications={data.notifications}
            onMarkRead={handleMarkNotificationRead}
            onQuickReorder={(pid) => handleQuickCreatePo(pid, 40, 'Triggered from Notifications')}
          />
        )}

        {activePage === 'staff-management' && (
          <StaffManagementView
            staff={data.staff}
            onToggleStatus={handleToggleStaffStatus}
          />
        )}

        {activePage === 'settings' && (
          <SettingsView
            settings={data.settings}
            health={data.health}
            onSaveSettings={handleSaveSettings}
            onNotify={notify}
          />
        )}
      </main>

      {/* Persistent Non-Blocking Ambient Voice Assistant Dock */}
      {activePage !== 'ai-concierge' && (
        <AmbientVoiceDock
          isOpen={voiceDockOpen}
          onToggleOpen={setVoiceDockOpen}
          language={language}
          onChangeLanguage={setLanguage}
          queuedPrompt={queuedPrompt}
          onClearQueuedPrompt={() => setQueuedPrompt(null)}
          onAskConcierge={handleAskConciergeFromDock}
          onApproveDraftPo={handleApproveDraftPo}
          onOpenFullConcierge={() => {
            setVoiceDockOpen(false);
            setActivePage('ai-concierge');
          }}
          onNotify={notify}
        />
      )}

      {/* Global ⌘K Command Search Modal */}
      {commandOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#251b14]/50 backdrop-blur-xs flex items-start justify-center pt-24 p-4"
          onClick={() => setCommandOpen(false)}
        >
          <div
            className="bg-[#fcf9f3] rounded-3xl max-w-xl w-full border border-[#d1c4bc] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-[#d1c4bc]/50 flex items-center gap-3">
              <span className="material-symbols-outlined text-[#715b33]">search</span>
              <input
                autoFocus
                value={commandQuery}
                onChange={(e) => setCommandQuery(e.target.value)}
                placeholder="Jump to SKU, Supplier, or SmartStock Screen..."
                className="flex-1 bg-transparent text-sm focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setCommandOpen(false)}
                className="text-xs text-[#7f756f] px-2 py-1 rounded bg-[#f0eee8] cursor-pointer"
              >
                ESC
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto p-3 space-y-1 text-xs">
              {data.products
                .filter(
                  (p) =>
                    !commandQuery ||
                    p.name.toLowerCase().includes(commandQuery.toLowerCase()) ||
                    p.sku.toLowerCase().includes(commandQuery.toLowerCase()),
                )
                .slice(0, 5)
                .map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setActivePage('products');
                      setCommandOpen(false);
                    }}
                    className="w-full px-3 py-2.5 rounded-xl hover:bg-[#ebe8e2] flex items-center justify-between text-left cursor-pointer"
                  >
                    <span className="font-semibold text-[#251b14]">
                      {p.name} <span className="text-[#7f756f] font-normal">({p.sku})</span>
                    </span>
                    <span className="font-numeric-data text-[#715b33] font-semibold">
                      {p.stockUnits} {p.unitLabel}
                    </span>
                  </button>
                ))}
              {data.suppliers
                .filter(
                  (s) =>
                    !commandQuery || s.name.toLowerCase().includes(commandQuery.toLowerCase()),
                )
                .slice(0, 3)
                .map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setActivePage('suppliers');
                      setCommandOpen(false);
                    }}
                    className="w-full px-3 py-2.5 rounded-xl hover:bg-[#ebe8e2] flex items-center justify-between text-left cursor-pointer"
                  >
                    <span className="font-semibold text-[#251b14]">Supplier: {s.name}</span>
                    <span className="text-[#17200f]">{s.cityHub}</span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Store Briefing Modal */}
      {whatsappModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#251b14]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#fcf9f3] rounded-3xl max-w-md w-full p-6 border border-[#d1c4bc] shadow-2xl space-y-4">
            <h3 className="text-headline-sm text-[#251b14]">WhatsApp Store Briefing Preview</h3>
            <div className="p-4 rounded-2xl bg-[#dbe7cb]/50 border border-[#17200f]/15 text-xs space-y-2 text-[#17200f]">
              <p className="font-bold">Silk &amp; Spice Atelier • Koramangala 04</p>
              <p>
                • Critical Low: Parle-G 200g (8 left), Dettol 250ml (5 left), Tata Tea Gold 500g
                (12 left)
              </p>
              <p>• Expiry Watch: Amul Taaza Milk 1L (24 cartons — 48h ₹5 clearance ready)</p>
              <p>• Expected Gate Inward: ITC PO-2025-0928 arriving 4:30 PM</p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setWhatsappModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#f0eee8] text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setWhatsappModalOpen(false);
                  notify(
                    `WhatsApp Store Briefing dispatched to ${data.settings.curatorPhone}.`,
                    'success',
                  );
                }}
                className="px-5 py-2 rounded-xl bg-[#17200f] text-white text-xs font-semibold cursor-pointer"
              >
                Send to Floor WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ugadi Floor Setup Modal */}
      {floorSetupOpen && (
        <div className="fixed inset-0 z-50 bg-[#251b14]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#fcf9f3] rounded-3xl max-w-md w-full p-6 border border-[#d1c4bc] shadow-2xl space-y-4">
            <SafeImage
              src={APP_IMAGES.gheeFestive}
              alt="Ugadi Floor Display"
              className="w-full h-40 object-cover rounded-2xl"
            />
            <h3 className="text-headline-sm text-[#251b14]">Ugadi Entrance Endcap Planogram</h3>
            <p className="text-xs text-[#4e453f] leading-relaxed">
              Stage 18 tins of Amul Pure Cow Ghee 1L on Eye-Level Shelf 2 beside 24 bags of
              Aashirvaad Superior MP Atta 5kg. Historical festive pairing lifts basket margin by
              +24%.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setFloorSetupOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#f0eee8] text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setFloorSetupOpen(false);
                  notify('Ugadi Entrance Endcap planogram assigned to Floor Desk.', 'success');
                }}
                className="px-5 py-2 rounded-xl bg-[#251b14] text-[#fcf9f3] text-xs font-semibold cursor-pointer"
              >
                Confirm Floor Planogram
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
