import type {
  BootstrapData,
  NotificationItem,
  Product,
  PurchaseOrder,
  StaffMember,
  StockMovement,
  StoreSettings,
  Supplier,
} from '../types.ts';

export const APP_IMAGES = {
  logo: 'https://lh3.googleusercontent.com/aida/ALJJyrD9PFrs3qX9YJ_OeQt9R0BvEdC2X1hoYrFTadKGO_Kr-ncAqhAjHE4zZhc7bbLKz64yUbG5sABG6cT6WlmBz9nJpR5LKQ21q9hI6EivnswSbwvcpT8jjoOiyBv6KicKOMZW1-p2_3KOgF2hWdVmxthYDIT0b_0tQTMJJ9GR1qPbHPGLTRQ5eDJBp8kR6l-20H9SgksZyki2Hd2Cx2Xvm1E3DPCQ7tSstXXn0YJSYw',
  avatarAnanya:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuC6UPmsdOsbKsSJRzczM0eLfT6a-IRGBkFVPoozvVpTOaqwHSUSab11pWEvqVKp1uNDscJwgov8Odbk2DvfFAWj6sCjqYS4fVQokZvw5c4XnNmq-ftmtmz4BlyAbaSFidHzd9qD_mNeuRxXOeI-ewlKqFPyrBCuzembSbCoGl9RuOAr7V9zu3lyYSsY-v1flQbY6LW78ABDchpQ0YBcErDtZlwRjtUStogbnjbNfQ',
  parleG:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuALIivgH9hxop-A0wvmSBPHeISgbzy5quj7c7l2V5S4zKLzk010lopfy4uB1edjRcNKyugJzlXwyezYq0ImUnssagdWEs__3AxSpiOvPiXoSyPAUmSG-VDne-wvKLhKQfoP6TNOu5iFh1SRwCp_wI9oW8urrQsS1sTd5dmumRmW4hZZdbslQAQk4eF74D_VPUKQg5jrPttTaJ1S4C9IQmSV16PpU4RjznDlwJ7M8g',
  parleGPack:
    'https://lh3.googleusercontent.com/aida/ALJJyrB4TJRwDra6LE3XRP7uaaEoPEVMUxLgF92Pab0F5TMHJjVuScYTF3rY2GhmUTdn_DXJD9QpPfnWduBZ1Df3kzA0PlbcUyZQNaeobFKuZ5MPZFw9BIYzwVKhWeewzv_kuG_FZsHyZBgNQsGgf4zsengI7RyEaFKhJfIBJpoLK4W5-vGJZ6xdULJP-rLrYV4U8JD5-QQsMorVFGnIfBRL_YTkHtagoHPfSadgT9LKZVY',
  gheeFestive:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBK7WNulqpM7KXCoSRTKY3vWFuAp-6gTcM8F2GHLKXxA-YzL1Ii-soSjeJcxpKELDaPlWoJk_9cCyjLKuCA7fRSWk5F8no-NBZce8fx0nphcBcUV_jqs4WUvHVsxuZvaIhPxw-omeAUStcCunptIWTJ5rKkv13p99WDoGMAqs61CTl_QjuMHPlVzee3DWotXJNej4cXqV9YCotQTZvTDcdzNfBpr-4o5aNmxTAKCw',
  amulGhee:
    'https://lh3.googleusercontent.com/aida/ALJJyrAzv_-uB2M4HiUzgMe4DcHjdrRkV0HqHQpHHz13GxtkuG94F45f_I-eQsqsZvAsAFnGGDJAB4UalicB4-UzQJlUK0DurszwUTNY3AP3CFEpInmSugPNZ_sGqmh2jlb8YRLUDrpDl5U497I0klSnoPoEae7Xmhewb4Xe72wa2gEMdDZhxs3ElAPOb0gRNm9mL0jhTKdXLz1q26pZbbr4ewNfRngYtdvcngyAcGmivPk',
  aashirvaadStore:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBqjCdpyqKp09SnZDrDX48GDEPNqJEo3VNpfCOgpi7bAPxD_XyM1RvbQZOuhSDDoExW87Mm4Z8Xufroo_qplq7fN1Y8945b_H6r49ztBLKuY8oScwjOV8r6J3g37zZOrOAYtBDw91wQpTuGWnGH3x4UQrHciqObbryLoXAwdG0L1Hmwrkv3j-WcVm37VRjBd0lcOW9UzBW7OYq3L1D1L9VLFZz3KpC3-nsOYtBCWA',
  aashirvaadPack:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuD04d_rlpok7l3pDnHr9ryLy2ulNDrOL3opG7wntkLintfruH80KKbkutyBjtELIbrFS3NwDuKMy4_4eIB-1IDutxQYlRKmQ0DnmNGM7uK6umicpfwTX4qMenkeK8-jptwmX5rbseldAYl17fSO7xMA0Y5tIEi2Eo0PTO40JJMuBctZTmknMqQwvcVuBn69sW0VXb2nvRtE5ePPwDd7GdIq80AsuvngWhxhxsCIlw',
  herbalElixir:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDKe0tnc5TocPEcczQruH-B4u2zjK4E63E-h3k9F7PFwyLWHq7Ald9Ek1TId9M1EjWO5erjdEwWqVEHubt_i729elkjxVOGkUHRMBDFsOrdEh7RBtIzYPWCtQpYNmq_TjpAYYHM4_6cVjvKfiLO3lTYdiytg_PvM_E2PPSFGjoGEk9ZRlK0iDqwIVbPImeKYxS_76z7hj9x0pI0gGOM1raGvqhjT1NRROLwTbxe0Q',
  dettol:
    'https://lh3.googleusercontent.com/aida/ALJJyrAnAIdRsR7GtPOTGaynILMIdj_1_p0rhzUYIQPvpNzQGt0725uh5USbJRwjzbGMmKRwTTc2M4IBhR9qb1FtWYARW4HVN3jI_s7zSI970FUscm1MdLuzC2zOiek-KDAU3Y1k1pNzbyS2El5Ww9cJa0hLEKvx0AgK4qmf9rSQOU6ZoUz72JONwUtkt-oLYUgyrjuCXO9V4YRLdpmL8O6IigM3nlyCkrYoWGtHCNzivWM',
  tataTea:
    'https://lh3.googleusercontent.com/aida/ALJJyrClskmopC2rBOEaPVpV9rYVjD_53hVHuYWTn8rnFOJ04GGzRe-VKwpRfeWN3KFw2tyK7--V0AqawW9xbJs6e4Ofex2ztB7If4qnq4phsRjTxTmJBaMuWdFugt_n1chDthDWe8yLnPgwQ6X3azOT0DmQAZc0-JXBpcDDFCUbjjyspFTZrSemGAD0OVjfeOVD3ZcZsKMUq5Amq6mRRS_ESwtn27zCZBONSbjS14WQ4Y0',
  chaiHamper:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuB4R8mMsb4_bxM1pX1tO0t6ivZWym9DyB2yAYg0qKIKJDwrUHk7FiF_2sABMYvMA4EQ7eq1yE4kc5jbCFccO6wwHb8VFQZLcBq4AYPC0bjPDQsU35jRixt1xAU-HudonAon6KFrhNxGYBk6oO_4uezaQnYKluCluxQqigoWaZhNb8KgZSdhnfS1nNqd_Gq__ktXEFaNZJ5nrXz1lGCuZpJtZQUfronmAUqi9MPHyQ',
  gheeTrio:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAQQ4Z6FbBcZkq9c_U-0e3nBra9jrAjtMnoSMQzJhrlIzbFKwVN2aSybBDwzwp5PqqsozsaOaN_7HOsrC_FqecrXqTIv9bnWE_eNKuYAhvcxwJyY_EHsYxkG2yiOn7KzsYfzFRnaIk4lKKLSWNA-IXeYWw1aXWCsTKsXQ4JYWo5z2u5HmjKSgwZnCNEJZ51jSmdzVs4DJ0EsCuvq0h3eyMkBOIHFlssxelSvTQQ9A',
  storeInterior:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDJM3qavk9HIhaxWMQVKyqgVbMB7CVrXjKVw7NHwrcIoFs8hxf9-y_M-zA91vnkiZB1QThu9eVnXoOf6ydDrx4Whq88mt-aMgRnql6glg-toGxa9YwoicT8HINbQFQp9jV0vN-MFlqQHkDXS-KwMbwM626mBGVTs1zC1vmNTMi_WViWpn2oAmuTSS4AJiGvxL7fSXUrqsVGM3GyKHveQW9lK5P5RDssXLch428wvA',
};

export function formatINR(amount: number, decimals = 0): string {
  return `₹${amount.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

export function formatLakhs(amount: number): string {
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(2)}L`;
  }
  return formatINR(amount);
}

async function apiRequest<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
    ...options,
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(payload?.error || `Request failed with status ${res.status}`);
  }
  return payload as T;
}

export const api = {
  bootstrap: () => apiRequest<BootstrapData>('/api/bootstrap'),

  createProduct: (input: Partial<Product>) =>
    apiRequest<Product>('/api/products', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  updateProduct: (id: string, patch: Partial<Product>) =>
    apiRequest<Product>(`/api/products/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),

  bulkAdjustPrices: (percentage: number, category?: string) =>
    apiRequest<{ products: Product[] }>('/api/products/bulk-price', {
      method: 'POST',
      body: JSON.stringify({ percentage, category }),
    }),

  createSupplier: (input: Partial<Supplier>) =>
    apiRequest<Supplier>('/api/suppliers', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  recordMovement: (input: {
    productId: string;
    type: StockMovement['type'];
    qty: number;
    reasonTitle: string;
    referenceNote: string;
    handledBy?: string;
    unitCost?: number;
  }) =>
    apiRequest<{ movement: StockMovement; product: Product }>('/api/movements', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  createPurchaseOrder: (input: {
    productId: string;
    qty: number;
    status?: PurchaseOrder['status'];
    notes?: string;
  }) =>
    apiRequest<PurchaseOrder>('/api/purchase-orders', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  updatePurchaseOrderStatus: (id: string, status: PurchaseOrder['status']) =>
    apiRequest<PurchaseOrder>(`/api/purchase-orders/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  markNotificationRead: (id: string | 'all') =>
    apiRequest<{ notifications: NotificationItem[] }>('/api/notifications/read', {
      method: 'POST',
      body: JSON.stringify({ id }),
    }),

  updateStaff: (id: string, patch: Partial<StaffMember>) =>
    apiRequest<StaffMember>(`/api/staff/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),

  saveSettings: (settings: StoreSettings) =>
    apiRequest<StoreSettings>('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    }),

  queryConcierge: (message: string, language: 'en' | 'hi' | 'ta' | 'kn') =>
    apiRequest<{
      reply: string;
      badge: string;
      draftPo?: PurchaseOrder;
      suggestedBundle: boolean;
    }>('/api/ai/concierge', {
      method: 'POST',
      body: JSON.stringify({ message, language }),
    }),

  syncDemandForecast: () =>
    apiRequest<{
      executiveSummary: string;
      festivalInsight: string;
      urgentSkus: Array<{ sku: string; recommendedQty: number; rationale: string }>;
    }>('/api/ai/sync-forecast', {
      method: 'POST',
    }),

  fetchSupabaseSchema: async (): Promise<string> => {
    const res = await fetch('/api/supabase/schema');
    if (!res.ok) throw new Error('Unable to fetch Supabase SQL schema.');
    return res.text();
  },
};
