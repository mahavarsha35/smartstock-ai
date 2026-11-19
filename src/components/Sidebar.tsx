import type { NavPage } from '../types.ts';
import { APP_IMAGES } from '../lib/api.ts';
import { SafeImage } from './SafeImage.tsx';

interface SidebarProps {
  activePage: NavPage;
  onNavigate: (page: NavPage) => void;
  unreadNotifications: number;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

interface NavItemConfig {
  id: NavPage;
  label: string;
  icon: string;
  rightText?: string;
  aiPill?: boolean;
  badge?: number;
}

export function Sidebar({
  activePage,
  onNavigate,
  unreadNotifications,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const navItems: NavItemConfig[] = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'products', label: 'Products', icon: 'inventory_2' },
    { id: 'stock-movement', label: 'Stock Movement', icon: 'sync_alt', rightText: 'In/Out' },
    { id: 'ai-insights', label: 'AI Insights', icon: 'auto_awesome', aiPill: true },
    { id: 'suppliers', label: 'Suppliers', icon: 'local_shipping' },
    { id: 'reports-analytics', label: 'Reports & Analytics', icon: 'monitoring' },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: 'notifications',
      badge: unreadNotifications > 0 ? unreadNotifications : undefined,
    },
    { id: 'staff-management', label: 'Staff Management', icon: 'badge' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
  ];

  const handleSelect = (page: NavPage) => {
    onNavigate(page);
    onCloseMobile();
  };

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#251b14]/40 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
        />
      )}
      <aside
        className={`fixed left-0 top-0 h-full w-72 bg-[#f6f3ed] shadow-[0_1px_8px_rgba(59,48,40,0.04)] z-50 flex flex-col justify-between pt-6 pb-6 transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col min-h-0 overflow-y-auto">
          <div className="px-6 mb-6 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => handleSelect('dashboard')}
              className="flex items-center gap-3 text-left cursor-pointer group"
            >
              <SafeImage
                src={APP_IMAGES.logo}
                alt="SmartStock AI Logo"
                className="h-8 w-auto object-contain rounded-md"
                fallbackLabel="SS"
              />
              <div className="flex flex-col">
                <span className="font-serif text-[20px] font-medium text-[#251b14] leading-tight group-hover:text-[#715b33] transition-colors">
                  SmartStock AI
                </span>
                <span className="text-[11px] font-semibold text-[#715b33] uppercase tracking-wider">
                  Inventory Atelier
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-lg text-[#4e453f] hover:bg-[#ebe8e2]"
              aria-label="Close navigation"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          <div className="px-4 mb-2">
            <p className="px-3 mb-2 text-[11px] font-semibold text-[#7f756f] uppercase tracking-wider">
              Operational Ledger
            </p>
            <nav className="flex flex-col gap-1">
              {navItems.map((item) => {
                const isActive = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelect(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#3b3028] text-[#ffffff] font-semibold shadow-xs'
                        : 'text-[#4e453f] hover:bg-[#ebe8e2] hover:text-[#1c1c18] font-medium'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span
                        className={`material-symbols-outlined text-[20px] ${
                          item.aiPill && !isActive ? 'text-[#715b33]' : ''
                        }`}
                      >
                        {item.icon}
                      </span>
                      <span className="text-[14px] leading-5">{item.label}</span>
                    </span>

                    {item.rightText && (
                      <span
                        className={`text-[11px] font-numeric-data ${
                          isActive ? 'text-[#d5c3b8]' : 'text-[#7f756f]'
                        }`}
                      >
                        {item.rightText}
                      </span>
                    )}

                    {item.aiPill && (
                      <span className="px-1.5 py-0.5 rounded bg-[#fddfab] text-[#776138] text-[11px] font-semibold">
                        AI
                      </span>
                    )}

                    {item.badge !== undefined && (
                      <span className="w-5 h-5 flex items-center justify-center rounded-full bg-[#ffdad6] text-[#93000a] text-[11px] font-bold font-numeric-data">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Daily Store Concierge Sidebar Card */}
        <div className="px-4 pt-3">
          <div
            className={`p-4 rounded-xl bg-[#f0eee8] shadow-[0_1px_8px_rgba(59,48,40,0.04)] flex flex-col gap-3 ${
              activePage === 'ai-concierge' ? 'ring-1 ring-[#715b33]' : ''
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#715b33] text-[20px]">
                storefront
              </span>
              <span className="text-[12px] text-[#251b14] font-semibold">
                Daily Store Concierge
              </span>
            </div>
            <p className="text-[12px] leading-[18px] text-[#4e453f]">
              Ready for today&apos;s evening footfall? 42 fast-moving grocery &amp; lifestyle SKUs
              monitored.
            </p>
            <button
              type="button"
              onClick={() => handleSelect('ai-concierge')}
              className="w-full py-2 px-3 rounded-lg bg-[#ffffff] text-[#251b14] hover:bg-[#251b14] hover:text-[#ffffff] transition-colors flex items-center justify-center gap-2 shadow-[0_1px_8px_rgba(59,48,40,0.04)] cursor-pointer group"
            >
              <span className="material-symbols-outlined text-[16px] text-[#715b33] group-hover:text-[#fddfab]">
                chat_spark
              </span>
              <span className="text-[12px] font-semibold">Ask Store Concierge</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
