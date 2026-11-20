import { useState } from 'react';
import type { DbHealth, StoreSettings } from '../types.ts';
import { api } from '../lib/api.ts';

interface SettingsViewProps {
  settings: StoreSettings;
  health: DbHealth;
  onSaveSettings: (updated: StoreSettings) => Promise<void>;
  onNotify: (msg: string, tone?: 'success' | 'info' | 'error') => void;
}

const SECTIONS = [
  { id: 'profile', label: '1. Profile Settings', icon: 'person' },
  { id: 'store', label: '2. Store Information', icon: 'storefront' },
  { id: 'inventory', label: '3. Inventory Rules', icon: 'inventory' },
  { id: 'notifications', label: '4. Notifications & Alerts', icon: 'notifications' },
  { id: 'security', label: '5. Security & Access', icon: 'shield' },
  { id: 'language', label: '6. Language & Appearance', icon: 'translate' },
  { id: 'backups', label: '7. Data & Supabase Sync', icon: 'database' },
];

export function SettingsView({
  settings,
  health,
  onSaveSettings,
  onNotify,
}: SettingsViewProps) {
  const [draft, setDraft] = useState<StoreSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [schemaModalOpen, setSchemaModalOpen] = useState(false);
  const [schemaSql, setSchemaSql] = useState('');

  // Supabase Configuration State
  const [supabaseUrl, setSupabaseUrl] = useState(health.supabaseUrl || '');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [testingSupabase, setTestingSupabase] = useState(false);
  const [savingSupabase, setSavingSupabase] = useState(false);
  const [syncingSupabase, setSyncingSupabase] = useState(false);
  const [supabaseTestFeedback, setSupabaseTestFeedback] = useState<{
    ok: boolean;
    status: string;
    message: string;
    missingTables?: string[];
    rowCounts?: Record<string, number>;
  } | null>(null);

  const handleTestSupabase = async () => {
    setTestingSupabase(true);
    setSupabaseTestFeedback(null);
    try {
      const res = await api.testSupabase(supabaseUrl.trim() || undefined, supabaseKey.trim() || undefined);
      setSupabaseTestFeedback(res);
      if (res.ok) {
        onNotify('Supabase connected successfully! All 7 tables verified.', 'success');
      } else if (res.status === 'missing_tables') {
        onNotify('Connected, but tables are missing. Please run schema.sql in Supabase SQL editor.', 'info');
      } else {
        onNotify(res.message, 'error');
      }
    } catch (err: any) {
      setSupabaseTestFeedback({
        ok: false,
        status: 'error',
        message: err?.message || 'Connection test failed',
      });
      onNotify(err?.message || 'Connection test failed', 'error');
    } finally {
      setTestingSupabase(false);
    }
  };

  const handleSaveSupabase = async () => {
    if (!supabaseUrl.trim() || !supabaseKey.trim()) {
      onNotify('Please enter both Supabase Project URL and Key.', 'error');
      return;
    }
    setSavingSupabase(true);
    try {
      const res = await api.configureSupabase(supabaseUrl.trim(), supabaseKey.trim());
      setSupabaseTestFeedback(res.test);
      if (res.ok) {
        onNotify('Supabase credentials saved and connected! Backend switched to cloud database.', 'success');
        setTimeout(() => window.location.reload(), 1500);
      } else {
        onNotify(res.message, 'info');
      }
    } catch (err: any) {
      onNotify(err?.message || 'Failed to save Supabase credentials', 'error');
    } finally {
      setSavingSupabase(false);
    }
  };

  const handleSyncSupabase = async () => {
    setSyncingSupabase(true);
    try {
      const res = await api.syncSupabase();
      if (res.ok) {
        onNotify(res.message, 'success');
      } else {
        onNotify(res.message, 'error');
      }
    } catch (err: any) {
      onNotify(err?.message || 'Sync failed', 'error');
    } finally {
      setSyncingSupabase(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    await onSaveSettings(draft);
    setSaving(false);
  };

  const handleOpenSchema = async () => {
    try {
      const sql = await api.fetchSupabaseSchema();
      setSchemaSql(sql);
      setSchemaModalOpen(true);
    } catch (err: any) {
      onNotify(err?.message || 'Failed to load Supabase schema SQL.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-label-sm uppercase tracking-[0.12em] text-[#715b33] mb-1">
            Atelier Configuration &amp; Governance
          </p>
          <h1 className="text-headline-lg text-[#251b14]">Settings &amp; Preferences</h1>
          <p className="text-body-md text-[#4e453f] mt-1">
            Configure GSTIN compliance, autonomous reorder rules, alerts, and Supabase database
            synchronization.
          </p>
        </div>

        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className="px-5 py-2.5 rounded-xl bg-[#251b14] hover:bg-[#3b3028] text-[#fcf9f3] text-xs font-semibold shadow-sm cursor-pointer self-start"
        >
          {saving ? 'Saving Preferences...' : 'Save All Changes'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Sticky 7-Domain Index */}
        <aside className="lg:col-span-3 bg-[#ffffff] rounded-2xl border border-[#d1c4bc]/40 p-3 space-y-1 lg:sticky lg:top-24">
          {SECTIONS.map((sec) => (
            <a
              key={sec.id}
              href={`#settings-${sec.id}`}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium text-[#4e453f] hover:bg-[#f6f3ed] hover:text-[#251b14] transition-colors"
            >
              <span className="material-symbols-outlined text-[17px] text-[#715b33]">
                {sec.icon}
              </span>
              {sec.label}
            </a>
          ))}
        </aside>

        {/* Settings Forms */}
        <div className="lg:col-span-9 space-y-6">
          {/* 1. Profile Settings */}
          <section
            id="settings-profile"
            className="bg-[#ffffff] rounded-2xl border border-[#d1c4bc]/40 p-6 space-y-4"
          >
            <h2 className="text-headline-sm text-[#251b14]">1. Profile Settings</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-[#4e453f] mb-1">Curator Name</label>
                <input
                  value={draft.curatorName}
                  onChange={(e) => setDraft({ ...draft, curatorName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#f6f3ed] border border-[#d1c4bc]/60"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#4e453f] mb-1">Designation</label>
                <input
                  value={draft.curatorDesignation}
                  onChange={(e) => setDraft({ ...draft, curatorDesignation: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#f6f3ed] border border-[#d1c4bc]/60"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#4e453f] mb-1">Email Address</label>
                <input
                  value={draft.curatorEmail}
                  onChange={(e) => setDraft({ ...draft, curatorEmail: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#f6f3ed] border border-[#d1c4bc]/60"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#4e453f] mb-1">Mobile / WhatsApp</label>
                <input
                  value={draft.curatorPhone}
                  onChange={(e) => setDraft({ ...draft, curatorPhone: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#f6f3ed] border border-[#d1c4bc]/60 font-numeric-data"
                />
              </div>
            </div>
          </section>

          {/* 2. Store Information */}
          <section
            id="settings-store"
            className="bg-[#ffffff] rounded-2xl border border-[#d1c4bc]/40 p-6 space-y-4"
          >
            <h2 className="text-headline-sm text-[#251b14]">2. Store Information &amp; GSTIN</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-[#4e453f] mb-1">Store Display Name</label>
                <input
                  value={draft.storeName}
                  onChange={(e) => setDraft({ ...draft, storeName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#f6f3ed] border border-[#d1c4bc]/60"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#4e453f] mb-1">Store Code</label>
                <input
                  value={draft.storeCode}
                  onChange={(e) => setDraft({ ...draft, storeCode: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#f6f3ed] border border-[#d1c4bc]/60 font-numeric-data"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#4e453f] mb-1">Registered GSTIN</label>
                <input
                  value={draft.gstin}
                  onChange={(e) => setDraft({ ...draft, gstin: e.target.value.toUpperCase() })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#f6f3ed] border border-[#d1c4bc]/60 font-numeric-data"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#4e453f] mb-1">HSN Tax Bindings</label>
                <input
                  value={draft.hsnClasses}
                  onChange={(e) => setDraft({ ...draft, hsnClasses: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#f6f3ed] border border-[#d1c4bc]/60"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-semibold text-[#4e453f] mb-1">Outlet Address</label>
                <input
                  value={draft.storeAddress}
                  onChange={(e) => setDraft({ ...draft, storeAddress: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#f6f3ed] border border-[#d1c4bc]/60"
                />
              </div>
            </div>
          </section>

          {/* 3. Inventory Rules */}
          <section
            id="settings-inventory"
            className="bg-[#ffffff] rounded-2xl border border-[#d1c4bc]/40 p-6 space-y-4"
          >
            <h2 className="text-headline-sm text-[#251b14]">3. Inventory &amp; Reorder Rules</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-[#4e453f] mb-1">
                  Default Low-Stock Floor
                </label>
                <input
                  type="number"
                  value={draft.lowStockDefault}
                  onChange={(e) =>
                    setDraft({ ...draft, lowStockDefault: Number(e.target.value) })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#f6f3ed] border border-[#d1c4bc]/60 font-numeric-data"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#4e453f] mb-1">
                  Critical Buffer (Days)
                </label>
                <input
                  type="number"
                  value={draft.criticalBufferDays}
                  onChange={(e) =>
                    setDraft({ ...draft, criticalBufferDays: Number(e.target.value) })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#f6f3ed] border border-[#d1c4bc]/60 font-numeric-data"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#4e453f] mb-1">Metric System</label>
                <input
                  value={draft.baseMetricFamily}
                  onChange={(e) => setDraft({ ...draft, baseMetricFamily: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#f6f3ed] border border-[#d1c4bc]/60"
                />
              </div>
            </div>
            <label className="flex items-center justify-between p-4 rounded-xl bg-[#fcf9f3] border border-[#d1c4bc]/40 cursor-pointer">
              <div>
                <span className="text-xs font-semibold text-[#251b14] block">
                  Autonomous Draft PO Generation
                </span>
                <span className="text-[11px] text-[#4e453f]">
                  Allow SmartStock AI to pre-stage draft POs when stock drops below safety buffer
                </span>
              </div>
              <input
                type="checkbox"
                checked={draft.autonomousPoEnabled}
                onChange={(e) =>
                  setDraft({ ...draft, autonomousPoEnabled: e.target.checked })
                }
                className="w-4 h-4 accent-[#251b14]"
              />
            </label>
          </section>

          {/* 4. Notifications & Alerts */}
          <section
            id="settings-notifications"
            className="bg-[#ffffff] rounded-2xl border border-[#d1c4bc]/40 p-6 space-y-3"
          >
            <h2 className="text-headline-sm text-[#251b14] mb-2">4. Notifications &amp; Alerts</h2>
            {[
              {
                key: 'alertsLowStock' as const,
                title: 'Critical Low-Stock WhatsApp & Floor Alerts',
              },
              {
                key: 'alertsMorningBriefing' as const,
                title: '7:30 AM Morning Store Briefing Digest',
              },
              {
                key: 'alertsSupplierDelays' as const,
                title: 'Distributor Dispatch & SLA Delay Alerts',
              },
              {
                key: 'alertsAiCopilot' as const,
                title: 'SmartStock Concierge Proactive Suggestions',
              },
              {
                key: 'alertsNightDigest' as const,
                title: '10:00 PM EOD Closing Ledger Summary',
              },
            ].map((item) => (
              <label
                key={item.key}
                className="flex items-center justify-between p-3.5 rounded-xl bg-[#fcf9f3] border border-[#d1c4bc]/40 cursor-pointer"
              >
                <span className="text-xs font-medium text-[#1c1c18]">{item.title}</span>
                <input
                  type="checkbox"
                  checked={draft[item.key]}
                  onChange={(e) => setDraft({ ...draft, [item.key]: e.target.checked })}
                  className="w-4 h-4 accent-[#251b14]"
                />
              </label>
            ))}
          </section>

          {/* 5. Security & Access */}
          <section
            id="settings-security"
            className="bg-[#ffffff] rounded-2xl border border-[#d1c4bc]/40 p-6 space-y-4"
          >
            <h2 className="text-headline-sm text-[#251b14]">5. Security &amp; Access</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-[#4e453f] mb-1">
                  Terminal Inactivity Lock
                </label>
                <select
                  value={draft.inactivityTimeout}
                  onChange={(e) => setDraft({ ...draft, inactivityTimeout: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#f6f3ed] border border-[#d1c4bc]/60"
                >
                  <option value="15 minutes (Strict Vault)">15 minutes (Strict Vault)</option>
                  <option value="30 minutes (Standard Retail Floor)">
                    30 minutes (Standard Retail Floor)
                  </option>
                  <option value="60 minutes (Extended Shift)">
                    60 minutes (Extended Shift)
                  </option>
                </select>
              </div>
              <label className="flex items-center justify-between p-3.5 rounded-xl bg-[#fcf9f3] border border-[#d1c4bc]/40 cursor-pointer">
                <span className="font-semibold text-[#251b14]">Two-Factor PO Approval</span>
                <input
                  type="checkbox"
                  checked={draft.twoFactorEnabled}
                  onChange={(e) =>
                    setDraft({ ...draft, twoFactorEnabled: e.target.checked })
                  }
                  className="w-4 h-4 accent-[#251b14]"
                />
              </label>
            </div>
          </section>

          {/* 6. Language & Appearance */}
          <section
            id="settings-language"
            className="bg-[#ffffff] rounded-2xl border border-[#d1c4bc]/40 p-6 space-y-4"
          >
            <h2 className="text-headline-sm text-[#251b14]">6. Language &amp; Appearance</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-[#4e453f] mb-1">
                  Primary Console Language
                </label>
                <select
                  value={draft.language}
                  onChange={(e) =>
                    setDraft({ ...draft, language: e.target.value as 'en' | 'ta' | 'hi' })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#f6f3ed] border border-[#d1c4bc]/60"
                >
                  <option value="en">English (India)</option>
                  <option value="hi">हिन्दी (Hindi)</option>
                  <option value="ta">தமிழ் (Tamil)</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-[#4e453f] mb-1">Atelier Surface</label>
                <select
                  value={draft.themeMode}
                  onChange={(e) =>
                    setDraft({ ...draft, themeMode: e.target.value as 'ivory' | 'espresso' })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#f6f3ed] border border-[#d1c4bc]/60"
                >
                  <option value="ivory">Warm Ivory &amp; Linen (Default)</option>
                  <option value="espresso">Heritage Espresso Contrast</option>
                </select>
              </div>
            </div>
          </section>

          {/* 7. Data & Supabase PostgreSQL Integration Status */}
          <section
            id="settings-backups"
            className="bg-[#251b14] text-[#fcf9f3] rounded-3xl p-6 space-y-6 shadow-md"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[10px] uppercase tracking-widest text-[#fddfab] font-semibold">
                  7. Data Persistence &amp; Supabase PostgreSQL
                </span>
                <h2 className="font-serif text-xl text-white mt-0.5">
                  Cloud Database &amp; Backend Storage Integration
                </h2>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  health.storageMode === 'supabase'
                    ? 'bg-[#dbe7cb] text-[#17200f]'
                    : 'bg-[#fddfab] text-[#251b14]'
                }`}
              >
                {health.storageMode === 'supabase'
                  ? '● Supabase PostgreSQL Live'
                  : '○ Local Persistent Ledger Active'}
              </span>
            </div>

            <p className="text-xs text-[#d5c3b8] leading-relaxed">
              {health.storageMode === 'supabase'
                ? 'All products, suppliers, stock movements, purchase orders, notifications, and store settings are persisted in your cloud Supabase PostgreSQL database.'
                : 'Your changes are currently persisted locally in data/smartstock-db.json. Connect your Supabase project below to enable high-availability cloud database storage.'}
            </p>

            {health.supabaseError && (
              <div className="p-3.5 rounded-2xl bg-[#5c2a1e] border border-[#a84d3b] text-xs text-[#ffd2cc]">
                <strong className="font-semibold block mb-0.5">Supabase Connection Warning:</strong>
                {health.supabaseError}. Running on local ledger fallback.
              </div>
            )}

            {/* Supabase Connection Credentials Form */}
            <div className="p-5 rounded-2xl bg-[#34271f] border border-[#4d3c32] space-y-4">
              <h3 className="text-sm font-semibold text-[#fddfab] flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">key</span>
                Supabase Connection Settings
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-[#d5c3b8] mb-1">
                    Supabase Project URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://xyzcompany.supabase.co"
                    value={supabaseUrl}
                    onChange={(e) => setSupabaseUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#251b14] border border-[#4d3c32] text-xs text-white placeholder-[#78665a] focus:outline-hidden focus:border-[#fddfab]"
                  />
                  <span className="text-[10px] text-[#9a8678] mt-1 block">
                    Found in Supabase Dashboard → Project Settings → API → Project URL
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#d5c3b8] mb-1">
                    Supabase API Key (service_role or anon)
                  </label>
                  <div className="relative">
                    <input
                      type={showKey ? 'text' : 'password'}
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      value={supabaseKey}
                      onChange={(e) => setSupabaseKey(e.target.value)}
                      className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-[#251b14] border border-[#4d3c32] text-xs text-white placeholder-[#78665a] focus:outline-hidden focus:border-[#fddfab] font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9a8678] hover:text-white cursor-pointer text-xs"
                    >
                      {showKey ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <span className="text-[10px] text-[#9a8678] mt-1 block">
                    service_role secret key recommended for backend, or anon public key
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleTestSupabase}
                  disabled={testingSupabase}
                  className="px-4 py-2 rounded-xl bg-[#4d3c32] text-white text-xs font-semibold hover:bg-[#5f4b3f] disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">sync</span>
                  {testingSupabase ? 'Testing...' : 'Test Connection'}
                </button>

                <button
                  type="button"
                  onClick={handleSaveSupabase}
                  disabled={savingSupabase}
                  className="px-4 py-2 rounded-xl bg-[#fddfab] text-[#251b14] text-xs font-semibold hover:bg-[#dfc392] disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">save</span>
                  {savingSupabase ? 'Connecting...' : 'Save & Connect to Supabase'}
                </button>

                <button
                  type="button"
                  onClick={handleSyncSupabase}
                  disabled={syncingSupabase}
                  className="px-4 py-2 rounded-xl bg-[#3b3028] text-[#d5c3b8] text-xs font-semibold hover:bg-[#4e453f] hover:text-white disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                  title="Upload all local catalog, suppliers, and ledger items into Supabase"
                >
                  <span className="material-symbols-outlined text-[16px]">cloud_upload</span>
                  {syncingSupabase ? 'Syncing...' : 'Sync Local Data to Supabase'}
                </button>
              </div>

              {/* Live Test Feedback Banner */}
              {supabaseTestFeedback && (
                <div
                  className={`p-3.5 rounded-xl text-xs space-y-1.5 ${
                    supabaseTestFeedback.ok
                      ? 'bg-[#273a1c] border border-[#4e7438] text-[#dbe7cb]'
                      : supabaseTestFeedback.status === 'missing_tables'
                      ? 'bg-[#473418] border border-[#85612e] text-[#fddfab]'
                      : 'bg-[#5c2a1e] border border-[#a84d3b] text-[#ffd2cc]'
                  }`}
                >
                  <div className="font-semibold flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">
                      {supabaseTestFeedback.ok
                        ? 'check_circle'
                        : supabaseTestFeedback.status === 'missing_tables'
                        ? 'warning'
                        : 'error'}
                    </span>
                    {supabaseTestFeedback.message}
                  </div>
                  {supabaseTestFeedback.rowCounts && Object.keys(supabaseTestFeedback.rowCounts).length > 0 && (
                    <div className="text-[11px] opacity-90 pt-1 flex flex-wrap gap-x-4 gap-y-1 font-mono">
                      {Object.entries(supabaseTestFeedback.rowCounts).map(([table, count]) => (
                        <span key={table}>
                          {table}: <strong>{count}</strong> rows
                        </span>
                      ))}
                    </div>
                  )}
                  {supabaseTestFeedback.missingTables && supabaseTestFeedback.missingTables.length > 0 && (
                    <div className="text-[11px] pt-1">
                      Run the SQL script using the <strong>View Supabase SQL Schema</strong> button below to provision missing tables.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quick Actions & Utilities */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleOpenSchema}
                className="px-4 py-2 rounded-xl bg-[#fddfab] text-[#251b14] text-xs font-semibold hover:bg-[#dfc392] cursor-pointer flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">terminal</span>
                View Supabase SQL Schema
              </button>
              <a
                href="/api/export/inventory?format=csv"
                className="px-4 py-2 rounded-xl bg-[#3b3028] text-[#fcf9f3] text-xs font-semibold hover:bg-[#4e453f] flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">download</span>
                Export CSV Ledger
              </a>
              <a
                href="/api/export/inventory?format=json"
                className="px-4 py-2 rounded-xl bg-[#3b3028] text-[#fcf9f3] text-xs font-semibold hover:bg-[#4e453f] flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">data_object</span>
                Download JSON Snapshot
              </a>
            </div>
          </section>
        </div>
      </div>

      {/* Supabase Schema SQL Modal */}
      {schemaModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#251b14]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#fcf9f3] rounded-3xl max-w-2xl w-full p-6 border border-[#d1c4bc] shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-headline-sm text-[#251b14]">
                Supabase PostgreSQL Schema (supabase/schema.sql)
              </h3>
              <button
                type="button"
                onClick={() => setSchemaModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-[#ebe8e2] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <pre className="max-h-96 overflow-auto p-4 rounded-2xl bg-[#251b14] text-[#f2dfd3] text-[11px] leading-relaxed font-mono">
              {schemaSql}
            </pre>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard?.writeText(schemaSql);
                  onNotify('Supabase SQL schema copied to clipboard.', 'success');
                }}
                className="px-4 py-2 rounded-xl bg-[#251b14] text-[#fcf9f3] text-xs font-semibold cursor-pointer"
              >
                Copy SQL Schema
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
