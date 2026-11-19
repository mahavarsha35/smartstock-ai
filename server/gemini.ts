import { GoogleGenAI, Type } from '@google/genai';
import type { Product, PurchaseOrder, Supplier } from '../src/types.ts';

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    const err = new Error(
      'GEMINI_API_KEY is not configured. Please add your Gemini API key in the Settings > Secrets panel.',
    );
    (err as any).statusCode = 503;
    throw err;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export interface ConciergeAiResult {
  reply: string;
  badge: string;
  suggestedPo?: {
    productId: string;
    qty: number;
    notes: string;
  };
  suggestedBundle: boolean;
}

export async function queryConcierge(params: {
  message: string;
  language: 'en' | 'hi' | 'ta' | 'kn';
  products: Product[];
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
}): Promise<ConciergeAiResult> {
  const ai = getAiClient();

  const langMap: Record<string, string> = {
    en: 'English (refined Indian retail boutique tone, concise and actionable)',
    hi: 'Hindi (Hinglish or clean Devanagari Hindi with clear SKU/INR figures)',
    ta: 'Tamil (polite store operations Tamil with English SKU codes and INR amounts)',
    kn: 'Kannada (polite Bengaluru store operations Kannada with English SKU codes and INR amounts)',
  };

  const inventorySnapshot = params.products.map((p) => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    category: p.category,
    stockUnits: p.stockUnits,
    minStock: p.minStock,
    unitLabel: p.unitLabel,
    costPrice: p.costPrice,
    sellingPrice: p.sellingPrice,
    supplierName: p.supplierName,
    dailyVelocity: p.dailyVelocity,
    leadTimeHours: p.leadTimeHours,
    expiryDate: p.expiryDate || null,
  }));

  const supplierSnapshot = params.suppliers.map((s) => ({
    code: s.code,
    name: s.name,
    cityHub: s.cityHub,
    leadTimeHours: s.leadTimeHours,
    status: s.status,
    pendingAmount: s.pendingAmount,
  }));

  const systemInstruction = `You are SmartStock Concierge, the ambient voice and operational intelligence assistant for "Silk & Spice Atelier — Koramangala Atelier 04" (Proprietor: Ananya Sharma, Bengaluru).
Respond in ${langMap[params.language] || langMap.en}.
Keep replies under 80 words, crisp, authoritative, and grounded strictly in the live inventory and supplier data provided.
Always use Indian Rupees (₹) for currency.
If the user asks about restocking, ordering, stockouts, or specific low-stock SKUs (such as Parle-G, Dettol, Tata Tea Gold, Aashirvaad Atta, Amul Ghee), set suggestedPo with the exact matching product id from inventory and a recommended reorder qty.
If the user asks about festival bundles, cross-selling, Ugadi, Diwali hampers, or pairing ghee/chai/atta, set suggestedBundle to true.`;

  const prompt = `User query: "${params.message}"

Live Store Products:
${JSON.stringify(inventorySnapshot)}

Suppliers:
${JSON.stringify(supplierSnapshot)}

Recent Purchase Orders:
${JSON.stringify(params.purchaseOrders.slice(0, 5))}`;

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: prompt,
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          reply: {
            type: Type.STRING,
            description: 'Concise spoken/chat answer grounded in the live inventory.',
          },
          badge: {
            type: Type.STRING,
            description: 'Short 2-4 word status badge e.g. "Restock Analysis" or "Margin Insight".',
          },
          suggestedBundle: {
            type: Type.BOOLEAN,
            description: 'True if festival/cross-sell hamper cards should accompany the answer.',
          },
          suggestedPo: {
            type: Type.OBJECT,
            description: 'Optional recommended Purchase Order if a SKU needs restock.',
            properties: {
              productId: { type: Type.STRING },
              qty: { type: Type.INTEGER },
              notes: { type: Type.STRING },
            },
          },
        },
        required: ['reply', 'badge', 'suggestedBundle'],
      },
    },
  });

  const rawText = (response.text ?? '{}').trim();
  const parsed = JSON.parse(rawText) as ConciergeAiResult;
  return {
    reply: parsed.reply || 'Inventory ledger checked. All priority thresholds are synchronized.',
    badge: parsed.badge || 'Live Telemetry',
    suggestedBundle: Boolean(parsed.suggestedBundle),
    suggestedPo:
      parsed.suggestedPo && parsed.suggestedPo.productId && parsed.suggestedPo.qty > 0
        ? parsed.suggestedPo
        : undefined,
  };
}

export interface ForecastSyncResult {
  executiveSummary: string;
  urgentSkus: Array<{
    sku: string;
    recommendedQty: number;
    rationale: string;
  }>;
  festivalInsight: string;
}

export async function syncDemandForecast(
  products: Product[],
  suppliers: Supplier[],
): Promise<ForecastSyncResult> {
  const ai = getAiClient();

  const prompt = `Analyze this Indian retail store inventory and generate a refreshed demand forecast and restock brief:
Products: ${JSON.stringify(
    products.map((p) => ({
      sku: p.sku,
      name: p.name,
      stockUnits: p.stockUnits,
      minStock: p.minStock,
      dailyVelocity: p.dailyVelocity,
      leadTimeHours: p.leadTimeHours,
      costPrice: p.costPrice,
      sellingPrice: p.sellingPrice,
      expiryDate: p.expiryDate || null,
    })),
  )}
Suppliers: ${JSON.stringify(suppliers.map((s) => ({ name: s.name, leadTimeHours: s.leadTimeHours, status: s.status })))}`;

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: prompt,
    config: {
      systemInstruction:
        'You are SmartStock AI Demand Forecasting Engine for Silk & Spice Atelier (Koramangala 04, Bengaluru). Return crisp retail intelligence grounded in the exact SKUs and INR prices provided.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          executiveSummary: {
            type: Type.STRING,
            description: '2-sentence morning executive summary with INR opportunity value.',
          },
          festivalInsight: {
            type: Type.STRING,
            description: '1-sentence weekend/festival demand tip.',
          },
          urgentSkus: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                sku: { type: Type.STRING },
                recommendedQty: { type: Type.INTEGER },
                rationale: { type: Type.STRING },
              },
              required: ['sku', 'recommendedQty', 'rationale'],
            },
          },
        },
        required: ['executiveSummary', 'festivalInsight', 'urgentSkus'],
      },
    },
  });

  const rawText = (response.text ?? '{}').trim();
  return JSON.parse(rawText) as ForecastSyncResult;
}
