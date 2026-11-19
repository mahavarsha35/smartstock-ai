import { useState } from 'react';
import type { DbHealth, NavPage } from '../types.ts';
import { APP_IMAGES } from '../lib/api.ts';
import { SafeImage } from './SafeImage.tsx';

interface TopBarProps {
  onOpenMobileMenu: () => void;
  onOpenCommandSearch: () => void;
  onNavigate: (page: NavPage) => void;
  onQuickAction: (action: 'stock-in' | 'add-product' | 'add-supplier' | 'ai-concierge') => void;
  onSendWhatsAppBriefing: () => void;
  language: 'en' | 'hi' | 'ta' | 'kn';
  onChangeLanguage: (lang: 'en' | 'hi' | 'ta' | 'kn') => void;
  unreadNotifications: number;
  health: DbHealth;
  curatorName: string;
}

export function TopBar({
  onOpenMobileMenu,
  onOpenCommandSearch,
  onNavigate,
  onQuickAction,
  onSendWhatsAppBriefing,
  language,
  onChangeLanguage,
  unreadNotifications,
  health,
  curatorName,
}: TopBarProps) {
  const [quickMenuOpen, setQuickMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  const langOptions: Array<{ id: 'en' | 'hi' | 'ta' | 'kn'; label: string }> = [
    { id: 'en', label: 'English' },
    { id: 'hi', label: 'हिन्दी' },
    { id: 'ta', label: 'தமிழ்' },
    { id: 'kn', label: 'ಕನ್ನಡ' },
  ];

  const currentLangLabel =
    langOptions.find((l) => l.id === language)?.label || 'English';

  return (
    <header className="fixed top-0 left-0 lg:left-72 right-0 h-16 bg-[#fcf9f3]/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(59,48,40,0.04)] z-30 px-4 sm:px-8 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 flex-1 max-w-md min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-lg bg-[#f6f3ed] text-[#251b14] hover:bg-[#ebe8e2] cursor-pointer"
          aria-label="Open menu"
        >
          <span className="material-symbols-outlined text-[20px]">menu</span>
        </button>

        <button
          type="button"
          onClick={onOpenCommandSearch}
          className="relative w-full pl-9 pr-12 py-1.5 bg-[#f6f3ed] hover:bg-[#ffffff] rounded-lg text-[12px] text-[#7f756f] text-left transition-all cursor-pointer truncate border border-transparent hover:border-[#d1c4bc]/50"
        >
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#7f756f] text-[18px]">
            search
          </span>
          <span className="truncate block">
            Search SKU, product, supplier, or commands...
          </span>
          <kbd className="hidden sm:inline-block absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded bg-[#f0eee8] font-numeric-data text-[11px] font-semibold text-[#4e453f]">
            ⌘K
          </kbd>
        </button>
      </div>

      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
        <div className="relative">
          <button
            type="button"
            onClick={() => setQuickMenuOpen((prev) => !prev)}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#251b14] text-[#ffffff] rounded-lg hover:bg-[#3b3028] transition-colors shadow-[0_1px_8px_rgba(59,48,40,0.04)] cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span className="hidden sm:inline text-[12px] font-medium">Quick Action</span>
          </button>

          {quickMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setQuickMenuOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-56 bg-[#ffffff] border border-[#d1c4bc]/60 rounded-2xl shadow-xl py-2 z-50">
                <div className="px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#7f756f]">
                  Quick Entry
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setQuickMenuOpen(false);
                    onQuickAction('stock-in');
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-[#1c1c18] hover:bg-[#f6f3ed] flex items-center gap-2.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px] text-[#17200f]">
                    arrow_downward
                  </span>
                  Record Stock In / Out
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setQuickMenuOpen(false);
                    onQuickAction('add-product');
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-[#1c1c18] hover:bg-[#f6f3ed] flex items-center gap-2.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px] text-[#715b33]">
                    inventory_2
                  </span>
                  Add New Product SKU
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setQuickMenuOpen(false);
                    onQuickAction('add-supplier');
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-[#1c1c18] hover:bg-[#f6f3ed] flex items-center gap-2.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px] text-[#715b33]">
                    domain_add
                  </span>
                  Onboard New Supplier
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setQuickMenuOpen(false);
                    onQuickAction('ai-concierge');
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-[#1c1c18] hover:bg-[#f6f3ed] flex items-center gap-2.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px] text-[#251b14]">
                    graphic_eq
                  </span>
                  Open SmartStock Concierge
                </button>
              </div>
            </>
          )}
        </div>

        <div className="hidden xl:block h-6 w-px bg-[#e5e2dc]" />

        <button
          type="button"
          onClick={() => onNavigate('settings')}
          title={
            health.storageMode === 'supabase'
              ? 'Connected to Supabase PostgreSQL'
              : 'Local Ledger Active (Configure Supabase in Settings)'
          }
          className="hidden xl:flex items-center gap-1.5 px-3 py-1 bg-[#f6f3ed] hover:bg-[#ebe8e2] rounded-full cursor-pointer transition-colors"
        >
          <span className="w-2 h-2 rounded-full bg-[#bfcab0]" />
          <span className="text-[11px] font-semibold text-[#1c1c18] font-numeric-data">
            {health.storageMode === 'supabase' ? 'Supabase Live' : '94% Health'}
          </span>
          <span className="text-[11px] text-[#7f756f]">•</span>
          <span className="text-[11px] font-medium text-[#4e453f]">Excellent</span>
        </button>

        {/* Language Dropdown */}
        <div className="relative hidden md:block">
          <button
            type="button"
            onClick={() => setLangOpen((o) => !o)}
            className="flex items-center gap-2 px-2.5 py-1 bg-[#f6f3ed] hover:bg-[#ebe8e2] rounded-lg cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px] text-[#715b33]">
              language
            </span>
            <span className="text-[11px] text-[#1c1c18] font-medium">
              {currentLangLabel}
            </span>
            <span className="material-symbols-outlined text-[16px] text-[#7f756f]">
              expand_more
            </span>
          </button>
          {langOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setLangOpen(false)} />
              <div className="absolute right-0 mt-1.5 w-32 bg-[#ffffff] border border-[#d1c4bc]/60 rounded-xl shadow-lg py-1 z-50 text-xs">
                {langOptions.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => {
                      onChangeLanguage(l.id);
                      setLangOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left hover:bg-[#f6f3ed] cursor-pointer ${
                      language === l.id ? 'font-bold text-[#251b14]' : 'text-[#4e453f]'
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onSendWhatsAppBriefing}
            aria-label="WhatsApp Stock Alerts"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-[#4e453f] hover:bg-[#f0eee8] hover:text-[#1c1c18] transition-colors relative cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">chat</span>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#715b33]" />
          </button>

          <button
            type="button"
            onClick={() => onNavigate('notifications')}
            aria-label="Notifications"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-[#4e453f] hover:bg-[#f0eee8] hover:text-[#1c1c18] transition-colors relative cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            {unreadNotifications > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#ba1a1a] text-[#ffffff] text-[10px] flex items-center justify-center font-numeric-data font-bold leading-none">
                {unreadNotifications}
              </span>
            )}
          </button>
        </div>

        <div className="hidden sm:block h-6 w-px bg-[#e5e2dc]" />

        <button
          type="button"
          onClick={() => onNavigate('settings')}
          className="flex items-center gap-3 pl-1 cursor-pointer text-left"
        >
          <SafeImage
            src={APP_IMAGES.avatarAnanya}
            alt={curatorName}
            className="w-8 h-8 rounded-full object-cover shadow-[0_1px_8px_rgba(59,48,40,0.04)]"
            fallbackLabel="AS"
          />
          <div className="hidden xl:flex flex-col text-left">
            <span className="text-[12px] text-[#1c1c18] font-semibold leading-tight">
              {curatorName}
            </span>
            <span className="text-[11px] text-[#7f756f]">Silk &amp; Spice Atelier, BLR</span>
          </div>
        </button>
      </div>
    </header>
  );
}
