import { useState } from 'react';
import type { ConciergeMessage, Product, PurchaseOrder, Supplier } from '../types.ts';
import { api, APP_IMAGES, formatINR } from '../lib/api.ts';
import { SafeImage } from './SafeImage.tsx';

interface ConciergeViewProps {
  products: Product[];
  suppliers: Supplier[];
  language: 'en' | 'hi' | 'ta' | 'kn';
  onChangeLanguage: (lang: 'en' | 'hi' | 'ta' | 'kn') => void;
  onApproveDraftPo: (po: PurchaseOrder) => Promise<void>;
  onNotify: (msg: string, tone?: 'success' | 'info' | 'error') => void;
}

export function ConciergeView({
  products,
  suppliers,
  language,
  onChangeLanguage,
  onApproveDraftPo,
  onNotify,
}: ConciergeViewProps) {
  const [messages, setMessages] = useState<ConciergeMessage[]>([
    {
      id: 'c-1',
      role: 'user',
      content:
        'Which snacks and staples are at risk of stockout before tonight’s Koramangala rush, and should we bundle Ugadi hampers?',
      timestamp: '11:24 AM',
      source: 'voice',
    },
    {
      id: 'c-2',
      role: 'assistant',
      content:
        'Parle-G 200g has 8 packs left (under 11 hours of cover before 4:30 PM chai rush) and Dettol 250ml has 5 bottles. I have staged a GST-verified draft PO for Parle-G and prepared two high-margin festival hamper bundles below.',
      timestamp: '11:24 AM',
      badge: 'Restock & Bundle Strategy',
      draftPo: {
        id: 'draft-init',
        poNumber: 'PO-8842-DRAFT',
        supplierId: 'sup-par-007',
        supplierName: 'Parle Agro Depot',
        gstin: '29AABCP4412K1Z3',
        productId: 'prod-parle-200',
        productName: 'Parle-G Original Glucose Biscuits 200g',
        sku: 'PRL-GLU-200',
        qty: 60,
        unitLabel: 'packs',
        unitPrice: 22,
        gstRate: 5,
        totalAmount: 1386,
        status: 'Draft',
        expectedAt: '24h Express Dispatch',
        createdAt: new Date().toISOString(),
        notes: 'Staged by SmartStock Concierge',
      },
      bundles: [
        {
          title: 'Diwali & Ugadi Spice & Chai Hamper',
          price: 799,
          marginPct: 31,
          readyKits: 14,
          subtitle: 'Tata Tea Gold + Parle-G + Cardamom',
          imageUrl: APP_IMAGES.chaiHamper,
        },
        {
          title: 'Auspicious Pure Ghee & Dryfruit Trio',
          price: 1450,
          marginPct: 26,
          readyKits: 9,
          subtitle: 'Amul Cow Ghee 1L + Aashirvaad 5kg',
          imageUrl: APP_IMAGES.gheeTrio,
        },
      ],
    },
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [speechRate, setSpeechRate] = useState<1 | 1.25 | 1.5>(1);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [approvedPoIds, setApprovedPoIds] = useState<string[]>([]);

  const speakMessage = (msg: ConciergeMessage) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    if (speakingMsgId === msg.id) {
      setSpeakingMsgId(null);
      return;
    }
    const u = new SpeechSynthesisUtterance(msg.content);
    u.rate = speechRate;
    u.lang =
      language === 'hi'
        ? 'hi-IN'
        : language === 'ta'
          ? 'ta-IN'
          : language === 'kn'
            ? 'kn-IN'
            : 'en-IN';
    u.onend = () => setSpeakingMsgId(null);
    setSpeakingMsgId(msg.id);
    window.speechSynthesis.speak(u);
  };

  const sendPrompt = async (text: string) => {
    const clean = text.trim();
    if (!clean || loading) return;
    const nowLabel = new Date().toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });

    setMessages((prev) => [
      ...prev,
      {
        id: `u-${Date.now()}`,
        role: 'user',
        content: clean,
        timestamp: nowLabel,
        source: 'text',
      },
    ]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.queryConcierge(clean, language);
      const assistantMsg: ConciergeMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: res.reply,
        timestamp: new Date().toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        badge: res.badge,
        draftPo: res.draftPo,
        bundles: res.suggestedBundle
          ? [
              {
                title: 'Diwali & Ugadi Spice & Chai Hamper',
                price: 799,
                marginPct: 31,
                readyKits: 14,
                subtitle: 'Tata Tea Gold + Parle-G + Cardamom',
                imageUrl: APP_IMAGES.chaiHamper,
              },
              {
                title: 'Auspicious Pure Ghee & Dryfruit Trio',
                price: 1450,
                marginPct: 26,
                readyKits: 9,
                subtitle: 'Amul Cow Ghee 1L + Aashirvaad 5kg',
                imageUrl: APP_IMAGES.gheeTrio,
              },
            ]
          : undefined,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      onNotify(err?.message || 'SmartStock Concierge failed to respond.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const lowStockCount = products.filter((p) => p.stockUnits <= p.minStock).length;

  return (
    <div className="space-y-6">
      {/* Header Acoustic Strip */}
      <div className="bg-[#251b14] text-[#fcf9f3] rounded-3xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-md">
        <div className="flex items-center gap-4">
          <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
            <span className="w-12 h-12 rounded-full bg-linear-to-tr from-[#715b33] via-[#dfc392] to-[#fddfab] animate-orb-fluid flex items-center justify-center">
              <span className="material-symbols-outlined text-[#251b14] text-[24px]">
                graphic_eq
              </span>
            </span>
          </div>
          <div>
            <span className="text-[11px] uppercase tracking-widest text-[#fddfab] font-semibold">
              SmartStock Neural Concierge • Gemini 4 Hydrogen
            </span>
            <h1 className="text-headline-md text-white">Voice &amp; Operational Co-Pilot</h1>
            <p className="text-xs text-[#d5c3b8]">
              Live store reasoning across {products.length} SKUs &amp; {suppliers.length} suppliers
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-[#3b3028] rounded-full p-1 text-xs">
            {(['en', 'hi', 'ta', 'kn'] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => onChangeLanguage(l)}
                className={`px-3 py-1 rounded-full uppercase cursor-pointer ${
                  language === l ? 'bg-[#fddfab] text-[#251b14] font-bold' : 'text-[#d5c3b8]'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() =>
              setSpeechRate((r) => (r === 1 ? 1.25 : r === 1.25 ? 1.5 : 1))
            }
            className="px-3 py-1.5 rounded-full bg-[#3b3028] text-xs font-semibold text-[#fddfab] font-numeric-data cursor-pointer"
          >
            Playback {speechRate}x
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left 8 Cols: Dialogue Canvas */}
        <div className="xl:col-span-8 bg-[#ffffff] rounded-3xl border border-[#d1c4bc]/40 p-6 shadow-xs space-y-5">
          <div className="space-y-5 max-h-[540px] overflow-y-auto pr-1">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-2xl rounded-2xl p-4 space-y-3 ${
                    msg.role === 'user'
                      ? 'bg-[#251b14] text-[#fcf9f3]'
                      : 'bg-[#fcf9f3] border border-[#d1c4bc]/50 text-[#1c1c18]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[11px] font-semibold uppercase tracking-wider opacity-75">
                      {msg.role === 'user'
                        ? `Ananya Sharma • ${msg.timestamp}`
                        : `SmartStock Concierge • ${msg.badge || 'Live Intelligence'}`}
                    </span>
                    {msg.role === 'assistant' && (
                      <button
                        type="button"
                        onClick={() => speakMessage(msg)}
                        className="flex items-center gap-1 text-[11px] font-semibold text-[#715b33] hover:text-[#251b14] cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[15px]">
                          {speakingMsgId === msg.id ? 'stop_circle' : 'volume_up'}
                        </span>
                        {speakingMsgId === msg.id ? 'Stop' : 'Listen'}
                      </button>
                    )}
                  </div>

                  <p className="text-sm leading-relaxed">{msg.content}</p>

                  {/* Embedded Interactive Draft PO Card */}
                  {msg.draftPo && (
                    <div className="p-4 rounded-2xl bg-[#ffffff] border border-[#715b33]/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#715b33] font-numeric-data">
                          {msg.draftPo.poNumber} • GST Ready
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-[#fddfab] text-[#57441e] text-[10px] font-semibold">
                          {approvedPoIds.includes(msg.draftPo.id) ? 'Dispatched' : 'Draft Staged'}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div>
                          <p className="font-semibold text-[#251b14]">{msg.draftPo.productName}</p>
                          <p className="text-[#4e453f]">
                            {msg.draftPo.supplierName} • {msg.draftPo.qty} {msg.draftPo.unitLabel}
                          </p>
                        </div>
                        <p className="text-base font-bold text-[#17200f] font-numeric-data">
                          {formatINR(msg.draftPo.totalAmount)}
                        </p>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          disabled={approvedPoIds.includes(msg.draftPo.id)}
                          onClick={async () => {
                            await onApproveDraftPo(msg.draftPo!);
                            setApprovedPoIds((ids) => [...ids, msg.draftPo!.id]);
                          }}
                          className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer ${
                            approvedPoIds.includes(msg.draftPo.id)
                              ? 'bg-[#dbe7cb] text-[#17200f]'
                              : 'bg-[#251b14] text-[#fcf9f3] hover:bg-[#3b3028]'
                          }`}
                        >
                          {approvedPoIds.includes(msg.draftPo.id)
                            ? 'Dispatched to Supplier ✓'
                            : 'Approve & Dispatch PO'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Embedded Cross-Sell Festival Bundles */}
                  {msg.bundles && msg.bundles.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {msg.bundles.map((b) => (
                        <div
                          key={b.title}
                          className="p-3 rounded-2xl bg-[#ffffff] border border-[#d1c4bc]/50 flex gap-3 items-center"
                        >
                          <SafeImage
                            src={b.imageUrl}
                            alt={b.title}
                            className="w-14 h-14 rounded-xl object-cover shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-[#251b14] truncate">
                              {b.title}
                            </p>
                            <p className="text-[11px] text-[#4e453f] truncate">{b.subtitle}</p>
                            <div className="flex items-center gap-2 mt-1 text-[11px] font-numeric-data">
                              <strong className="text-[#17200f]">{formatINR(b.price)}</strong>
                              <span className="text-[#715b33] font-semibold">
                                {b.marginPct}% Margin
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="p-4 rounded-2xl bg-[#f6f3ed] text-xs text-[#715b33] font-medium max-w-xs">
                Synthesizing store inventory &amp; supplier SLAs...
              </div>
            )}
          </div>

          {/* Suggested Prompts + Input */}
          <div className="pt-4 border-t border-[#d1c4bc]/40 space-y-3">
            <div className="flex flex-wrap gap-2">
              {[
                'Check Dettol 250ml & Tata Tea Gold stockout hours',
                'Create a PO for 60 packs of Parle-G 200g',
                'Recommend festival hamper bundles for Ugadi',
              ].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => void sendPrompt(chip)}
                  className="px-3 py-1.5 rounded-full bg-[#f6f3ed] hover:bg-[#ebe8e2] text-xs font-medium text-[#251b14] cursor-pointer"
                >
                  {chip}
                </button>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void sendPrompt(input);
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask SmartStock Concierge anything about SKUs, POs, or margins..."
                className="flex-1 px-4 py-3 rounded-xl bg-[#f6f3ed] border border-[#d1c4bc]/60 text-sm focus:outline-none focus:ring-1 focus:ring-[#715b33]"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="px-5 py-3 rounded-xl bg-[#251b14] hover:bg-[#3b3028] text-[#fcf9f3] text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                Send
              </button>
            </form>
          </div>
        </div>

        {/* Right 4 Cols: Telemetry & Indic Commands */}
        <aside className="xl:col-span-4 space-y-4">
          <div className="bg-[#ffffff] rounded-2xl border border-[#d1c4bc]/40 p-5 space-y-3">
            <h3 className="text-headline-sm text-[#251b14]">Live Inventory Telemetry</h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-[#f6f3ed]">
                <span className="text-[#7f756f] block">Active SKUs</span>
                <strong className="text-base text-[#251b14] font-numeric-data">
                  {products.length}
                </strong>
              </div>
              <div className="p-3 rounded-xl bg-[#ffdad6]/50">
                <span className="text-[#93000a] block">Critical Low</span>
                <strong className="text-base text-[#ba1a1a] font-numeric-data">
                  {lowStockCount}
                </strong>
              </div>
            </div>
          </div>

          <div className="bg-[#ffffff] rounded-2xl border border-[#d1c4bc]/40 p-5 space-y-3">
            <h3 className="text-headline-sm text-[#251b14]">Connected Suppliers</h3>
            <div className="space-y-2 text-xs">
              {suppliers.slice(0, 4).map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#fcf9f3]"
                >
                  <span className="font-medium text-[#1c1c18] truncate pr-2">{s.name}</span>
                  <span className="text-[#17200f] font-semibold font-numeric-data shrink-0">
                    {s.leadTimeHours}h SLA
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#f6f3ed] rounded-2xl border border-[#d1c4bc]/50 p-5 space-y-2 text-xs">
            <h3 className="text-headline-sm text-[#251b14]">Indic Voice Commands</h3>
            <p className="text-[#4e453f]">Switch language above to hear localized store guidance:</p>
            <ul className="space-y-1.5 text-[#251b14] pt-1">
              <li>• EN: &ldquo;Stage PO for 50 Parle-G packs&rdquo;</li>
              <li>• हिन्दी: &ldquo;पार्ले-जी स्टॉक की स्थिति बताएं&rdquo;</li>
              <li>• தமிழ்: &ldquo;குறைந்த இருப்பு பொருட்கள் என்ன?&rdquo;</li>
              <li>• ಕನ್ನಡ: &ldquo;ಇಂದಿನ ಸ್ಟಾಕ್ ವರದಿ ನೀಡಿ&rdquo;</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
