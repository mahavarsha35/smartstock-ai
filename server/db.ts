import fs from 'fs';
import path from 'path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type {
  BootstrapData,
  DbHealth,
  NotificationItem,
  Product,
  PurchaseOrder,
  StaffMember,
  StockMovement,
  StoreSettings,
  Supplier,
} from '../src/types.ts';
import {
  INITIAL_NOTIFICATIONS,
  INITIAL_PRODUCTS,
  INITIAL_PURCHASE_ORDERS,
  INITIAL_SETTINGS,
  INITIAL_STAFF,
  INITIAL_SUPPLIERS,
  INITIAL_MOVEMENTS,
} from './seed.ts';

interface LocalDbSchema {
  products: Product[];
  suppliers: Supplier[];
  movements: StockMovement[];
  purchaseOrders: PurchaseOrder[];
  notifications: NotificationItem[];
  staff: StaffMember[];
  settings: StoreSettings;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const LOCAL_DB_PATH = path.join(DATA_DIR, 'smartstock-db.json');

function getSupabaseClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL?.trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)?.trim();
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function readLocalDb(): LocalDbSchema {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(LOCAL_DB_PATH)) {
    const initial: LocalDbSchema = {
      products: INITIAL_PRODUCTS,
      suppliers: INITIAL_SUPPLIERS,
      movements: INITIAL_MOVEMENTS,
      purchaseOrders: INITIAL_PURCHASE_ORDERS,
      notifications: INITIAL_NOTIFICATIONS,
      staff: INITIAL_STAFF,
      settings: INITIAL_SETTINGS,
    };
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }
  try {
    const raw = fs.readFileSync(LOCAL_DB_PATH, 'utf8');
    return JSON.parse(raw) as LocalDbSchema;
  } catch {
    const fallback: LocalDbSchema = {
      products: INITIAL_PRODUCTS,
      suppliers: INITIAL_SUPPLIERS,
      movements: INITIAL_MOVEMENTS,
      purchaseOrders: INITIAL_PURCHASE_ORDERS,
      notifications: INITIAL_NOTIFICATIONS,
      staff: INITIAL_STAFF,
      settings: INITIAL_SETTINGS,
    };
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(fallback, null, 2), 'utf8');
    return fallback;
  }
}

function writeLocalDb(db: LocalDbSchema): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(db, null, 2), 'utf8');
}

function mapProductFromRow(row: Record<string, any>): Product {
  return {
    id: row.id,
    sku: row.sku,
    barcode: row.barcode,
    name: row.name,
    category: row.category,
    stockUnits: Number(row.stock_units),
    minStock: Number(row.min_stock),
    unitLabel: row.unit_label,
    costPrice: Number(row.cost_price),
    sellingPrice: Number(row.selling_price),
    supplierId: row.supplier_id,
    supplierName: row.supplier_name,
    bayLocation: row.bay_location,
    dailyVelocity: Number(row.daily_velocity),
    leadTimeHours: Number(row.lead_time_hours),
    expiryDate: row.expiry_date ?? undefined,
    batchNo: row.batch_no ?? undefined,
    imageUrl: row.image_url,
    monthlyFamilies: row.monthly_families ?? undefined,
    weeklyRevenue: row.weekly_revenue ? Number(row.weekly_revenue) : undefined,
    weeklyGrowthPct: row.weekly_growth_pct ? Number(row.weekly_growth_pct) : undefined,
    aisleNote: row.aisle_note ?? undefined,
  };
}

function mapSupplierFromRow(row: Record<string, any>): Supplier {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    cityHub: row.city_hub,
    contactPerson: row.contact_person,
    phone: row.phone,
    email: row.email,
    gstin: row.gstin,
    address: row.address,
    categories: Array.isArray(row.categories) ? row.categories : [],
    keyLines: Array.isArray(row.key_lines) ? row.key_lines : [],
    completedOrders: Number(row.completed_orders),
    leadTimeHours: Number(row.lead_time_hours),
    paymentTerms: row.payment_terms,
    pendingAmount: Number(row.pending_amount),
    rating: Number(row.rating),
    status: row.status,
    tier: row.tier,
    inwardBay: row.inward_bay,
    fulfillmentRate: Number(row.fulfillment_rate),
    gstrMatched: Boolean(row.gstr_matched),
  };
}

function mapMovementFromRow(row: Record<string, any>): StockMovement {
  return {
    id: row.id,
    txnCode: row.txn_code,
    createdAt: row.created_at,
    displayTime: row.display_time,
    displayDate: row.display_date,
    productId: row.product_id,
    productName: row.product_name,
    sku: row.sku,
    imageUrl: row.image_url ?? undefined,
    type: row.type,
    qtyChanged: Number(row.qty_changed),
    previousStock: Number(row.previous_stock),
    newStock: Number(row.new_stock),
    reasonTitle: row.reason_title,
    referenceNote: row.reference_note,
    handledBy: row.handled_by,
    handledRole: row.handled_role,
    unitCost: row.unit_cost ? Number(row.unit_cost) : undefined,
  };
}

function mapPoFromRow(row: Record<string, any>): PurchaseOrder {
  return {
    id: row.id,
    poNumber: row.po_number,
    supplierId: row.supplier_id,
    supplierName: row.supplier_name,
    gstin: row.gstin,
    productId: row.product_id,
    productName: row.product_name,
    sku: row.sku,
    qty: Number(row.qty),
    unitLabel: row.unit_label,
    unitPrice: Number(row.unit_price),
    gstRate: Number(row.gst_rate),
    totalAmount: Number(row.total_amount),
    status: row.status,
    expectedAt: row.expected_at,
    createdAt: row.created_at,
    notes: row.notes ?? undefined,
  };
}

export async function getHealth(): Promise<DbHealth> {
  const client = getSupabaseClient();
  let supabaseReady = false;
  if (client) {
    const { error } = await client.from('products').select('id').limit(1);
    supabaseReady = !error;
  }
  return {
    storageMode: supabaseReady ? 'supabase' : 'local',
    supabaseConfigured: Boolean(client),
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY?.trim()),
    lastSyncedAt: new Date().toISOString(),
  };
}

async function seedSupabaseIfEmpty(client: SupabaseClient): Promise<boolean> {
  const { data: existing, error } = await client.from('products').select('id').limit(1);
  if (error) {
    return false;
  }
  if (existing && existing.length > 0) {
    return true;
  }
  await client.from('suppliers').upsert(
    INITIAL_SUPPLIERS.map((s) => ({
      id: s.id,
      code: s.code,
      name: s.name,
      city_hub: s.cityHub,
      contact_person: s.contactPerson,
      phone: s.phone,
      email: s.email,
      gstin: s.gstin,
      address: s.address,
      categories: s.categories,
      key_lines: s.keyLines,
      completed_orders: s.completedOrders,
      lead_time_hours: s.leadTimeHours,
      payment_terms: s.paymentTerms,
      pending_amount: s.pendingAmount,
      rating: s.rating,
      status: s.status,
      tier: s.tier,
      inward_bay: s.inwardBay,
      fulfillment_rate: s.fulfillmentRate,
      gstr_matched: s.gstrMatched,
    })),
  );
  await client.from('products').upsert(
    INITIAL_PRODUCTS.map((p) => ({
      id: p.id,
      sku: p.sku,
      barcode: p.barcode,
      name: p.name,
      category: p.category,
      stock_units: p.stockUnits,
      min_stock: p.minStock,
      unit_label: p.unitLabel,
      cost_price: p.costPrice,
      selling_price: p.sellingPrice,
      supplier_id: p.supplierId,
      supplier_name: p.supplierName,
      bay_location: p.bayLocation,
      daily_velocity: p.dailyVelocity,
      lead_time_hours: p.leadTimeHours,
      expiry_date: p.expiryDate ?? null,
      batch_no: p.batchNo ?? null,
      image_url: p.imageUrl,
      monthly_families: p.monthlyFamilies ?? 0,
      weekly_revenue: p.weeklyRevenue ?? 0,
      weekly_growth_pct: p.weeklyGrowthPct ?? 0,
      aisle_note: p.aisleNote ?? null,
    })),
  );
  await client.from('stock_movements').upsert(
    INITIAL_MOVEMENTS.map((m) => ({
      id: m.id,
      txn_code: m.txnCode,
      created_at: m.createdAt,
      display_time: m.displayTime,
      display_date: m.displayDate,
      product_id: m.productId,
      product_name: m.productName,
      sku: m.sku,
      image_url: m.imageUrl ?? null,
      type: m.type,
      qty_changed: m.qtyChanged,
      previous_stock: m.previousStock,
      new_stock: m.newStock,
      reason_title: m.reasonTitle,
      reference_note: m.referenceNote,
      handled_by: m.handledBy,
      handled_role: m.handledRole,
      unit_cost: m.unitCost ?? null,
    })),
  );
  await client.from('purchase_orders').upsert(
    INITIAL_PURCHASE_ORDERS.map((po) => ({
      id: po.id,
      po_number: po.poNumber,
      supplier_id: po.supplierId,
      supplier_name: po.supplierName,
      gstin: po.gstin,
      product_id: po.productId,
      product_name: po.productName,
      sku: po.sku,
      qty: po.qty,
      unit_label: po.unitLabel,
      unit_price: po.unitPrice,
      gst_rate: po.gstRate,
      total_amount: po.totalAmount,
      status: po.status,
      expected_at: po.expectedAt,
      created_at: po.createdAt,
      notes: po.notes ?? null,
    })),
  );
  await client.from('notifications').upsert(
    INITIAL_NOTIFICATIONS.map((n) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      severity: n.severity,
      category: n.category,
      created_at: n.createdAt,
      read: n.read,
      product_id: n.productId ?? null,
      action_label: n.actionLabel ?? null,
    })),
  );
  await client.from('staff_members').upsert(
    INITIAL_STAFF.map((st) => ({
      id: st.id,
      name: st.name,
      role: st.role,
      branch: st.branch,
      phone: st.phone,
      email: st.email,
      shift: st.shift,
      status: st.status,
      permissions: st.permissions,
      avatar_url: st.avatarUrl ?? null,
    })),
  );
  await client.from('store_settings').upsert({
    id: 'default',
    payload: INITIAL_SETTINGS,
  });
  return true;
}

export async function getBootstrapData(): Promise<BootstrapData> {
  const client = getSupabaseClient();
  if (client) {
    const ok = await seedSupabaseIfEmpty(client);
    if (ok) {
      const [prodRes, supRes, movRes, poRes, notifRes, staffRes, setRes] = await Promise.all([
        client.from('products').select('*').order('name'),
        client.from('suppliers').select('*').order('completed_orders', { ascending: false }),
        client.from('stock_movements').select('*').order('created_at', { ascending: false }).limit(50),
        client.from('purchase_orders').select('*').order('created_at', { ascending: false }),
        client.from('notifications').select('*'),
        client.from('staff_members').select('*'),
        client.from('store_settings').select('payload').eq('id', 'default').maybeSingle(),
      ]);

      if (!prodRes.error && !supRes.error && !movRes.error) {
        return {
          products: (prodRes.data ?? []).map(mapProductFromRow),
          suppliers: (supRes.data ?? []).map(mapSupplierFromRow),
          movements: (movRes.data ?? []).map(mapMovementFromRow),
          purchaseOrders: (poRes.data ?? []).map(mapPoFromRow),
          notifications: (notifRes.data ?? []).map((n: Record<string, any>) => ({
            id: n.id,
            title: n.title,
            message: n.message,
            severity: n.severity,
            category: n.category,
            createdAt: n.created_at,
            read: Boolean(n.read),
            productId: n.product_id ?? undefined,
            actionLabel: n.action_label ?? undefined,
          })),
          staff: (staffRes.data ?? []).map((st: Record<string, any>) => ({
            id: st.id,
            name: st.name,
            role: st.role,
            branch: st.branch,
            phone: st.phone,
            email: st.email,
            shift: st.shift,
            status: st.status,
            permissions: Array.isArray(st.permissions) ? st.permissions : [],
            avatarUrl: st.avatar_url ?? undefined,
          })),
          settings: (setRes.data?.payload as StoreSettings) ?? INITIAL_SETTINGS,
          health: {
            storageMode: 'supabase',
            supabaseConfigured: true,
            geminiConfigured: Boolean(process.env.GEMINI_API_KEY?.trim()),
            lastSyncedAt: new Date().toISOString(),
          },
        };
      }
    }
  }

  const local = readLocalDb();
  return {
    ...local,
    health: {
      storageMode: 'local',
      supabaseConfigured: Boolean(client),
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY?.trim()),
      lastSyncedAt: new Date().toISOString(),
    },
  };
}

export async function createProduct(input: Omit<Product, 'id'>): Promise<Product> {
  const newProduct: Product = {
    ...input,
    id: `prod-${Date.now()}`,
  };
  const client = getSupabaseClient();
  if (client) {
    const { error } = await client.from('products').insert({
      id: newProduct.id,
      sku: newProduct.sku,
      barcode: newProduct.barcode,
      name: newProduct.name,
      category: newProduct.category,
      stock_units: newProduct.stockUnits,
      min_stock: newProduct.minStock,
      unit_label: newProduct.unitLabel,
      cost_price: newProduct.costPrice,
      selling_price: newProduct.sellingPrice,
      supplier_id: newProduct.supplierId || null,
      supplier_name: newProduct.supplierName,
      bay_location: newProduct.bayLocation,
      daily_velocity: newProduct.dailyVelocity,
      lead_time_hours: newProduct.leadTimeHours,
      expiry_date: newProduct.expiryDate ?? null,
      batch_no: newProduct.batchNo ?? null,
      image_url: newProduct.imageUrl,
    });
    if (!error) return newProduct;
  }

  const local = readLocalDb();
  local.products.unshift(newProduct);
  writeLocalDb(local);
  return newProduct;
}

export async function updateProduct(id: string, patch: Partial<Product>): Promise<Product | null> {
  const client = getSupabaseClient();
  if (client) {
    const updateRow: Record<string, any> = { updated_at: new Date().toISOString() };
    if (patch.name !== undefined) updateRow.name = patch.name;
    if (patch.category !== undefined) updateRow.category = patch.category;
    if (patch.stockUnits !== undefined) updateRow.stock_units = patch.stockUnits;
    if (patch.minStock !== undefined) updateRow.min_stock = patch.minStock;
    if (patch.costPrice !== undefined) updateRow.cost_price = patch.costPrice;
    if (patch.sellingPrice !== undefined) updateRow.selling_price = patch.sellingPrice;
    if (patch.bayLocation !== undefined) updateRow.bay_location = patch.bayLocation;
    const { data, error } = await client
      .from('products')
      .update(updateRow)
      .eq('id', id)
      .select()
      .maybeSingle();
    if (!error && data) return mapProductFromRow(data);
  }

  const local = readLocalDb();
  const idx = local.products.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  local.products[idx] = { ...local.products[idx], ...patch };
  writeLocalDb(local);
  return local.products[idx];
}

export async function bulkAdjustPrices(percentage: number, category?: string): Promise<Product[]> {
  const factor = 1 + percentage / 100;
  const local = readLocalDb();
  const client = getSupabaseClient();
  if (client) {
    const { data } = await client.from('products').select('*');
    if (data) {
      const updates = data
        .filter((r: any) => !category || category === 'All' || r.category === category)
        .map((r: any) => ({
          id: r.id,
          selling_price: Math.round(Number(r.selling_price) * factor * 100) / 100,
        }));
      for (const u of updates) {
        await client.from('products').update({ selling_price: u.selling_price }).eq('id', u.id);
      }
      const refreshed = await client.from('products').select('*').order('name');
      if (refreshed.data) return refreshed.data.map(mapProductFromRow);
    }
  }

  local.products = local.products.map((p) => {
    if (!category || category === 'All' || p.category === category) {
      return { ...p, sellingPrice: Math.round(p.sellingPrice * factor * 100) / 100 };
    }
    return p;
  });
  writeLocalDb(local);
  return local.products;
}

export async function createSupplier(
  input: Omit<Supplier, 'id' | 'code' | 'completedOrders' | 'pendingAmount' | 'rating' | 'fulfillmentRate'>,
): Promise<Supplier> {
  const prefix = input.name.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'SUP';
  const num = Math.floor(25 + Math.random() * 70);
  const newSupplier: Supplier = {
    ...input,
    id: `sup-${Date.now()}`,
    code: `SUP-${prefix}-0${num}`,
    completedOrders: 0,
    pendingAmount: 0,
    rating: 4.8,
    fulfillmentRate: 99.0,
  };

  const client = getSupabaseClient();
  if (client) {
    const { error } = await client.from('suppliers').insert({
      id: newSupplier.id,
      code: newSupplier.code,
      name: newSupplier.name,
      city_hub: newSupplier.cityHub,
      contact_person: newSupplier.contactPerson,
      phone: newSupplier.phone,
      email: newSupplier.email,
      gstin: newSupplier.gstin,
      address: newSupplier.address,
      categories: newSupplier.categories,
      key_lines: newSupplier.keyLines,
      completed_orders: newSupplier.completedOrders,
      lead_time_hours: newSupplier.leadTimeHours,
      payment_terms: newSupplier.paymentTerms,
      pending_amount: newSupplier.pendingAmount,
      rating: newSupplier.rating,
      status: newSupplier.status,
      tier: newSupplier.tier,
      inward_bay: newSupplier.inwardBay,
      fulfillment_rate: newSupplier.fulfillmentRate,
      gstr_matched: newSupplier.gstrMatched,
    });
    if (!error) return newSupplier;
  }

  const local = readLocalDb();
  local.suppliers.unshift(newSupplier);
  writeLocalDb(local);
  return newSupplier;
}

export async function recordStockMovement(params: {
  productId: string;
  type: StockMovement['type'];
  qty: number;
  reasonTitle: string;
  referenceNote: string;
  handledBy?: string;
  unitCost?: number;
}): Promise<{ movement: StockMovement; product: Product } | null> {
  const now = new Date();
  const displayTime = `Today ${now.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
  const txnCode = `TXN-2025-${Math.floor(1000 + Math.random() * 9000)}`;
  const signedDelta = params.type === 'Stock In' ? Math.abs(params.qty) : -Math.abs(params.qty);

  const client = getSupabaseClient();
  if (client) {
    const { data: prodRow } = await client
      .from('products')
      .select('*')
      .eq('id', params.productId)
      .maybeSingle();
    if (prodRow) {
      const prev = Number(prodRow.stock_units);
      const next = Math.max(0, prev + signedDelta);
      await client
        .from('products')
        .update({ stock_units: next, updated_at: now.toISOString() })
        .eq('id', params.productId);

      const movement: StockMovement = {
        id: `mov-${Date.now()}`,
        txnCode,
        createdAt: now.toISOString(),
        displayTime,
        displayDate: 'Today',
        productId: prodRow.id,
        productName: prodRow.name,
        sku: prodRow.sku,
        imageUrl: prodRow.image_url,
        type: params.type,
        qtyChanged: signedDelta,
        previousStock: prev,
        newStock: next,
        reasonTitle: params.reasonTitle,
        referenceNote: params.referenceNote,
        handledBy: params.handledBy || 'Ananya Sharma',
        handledRole: 'Lead Atelier',
        unitCost: params.unitCost,
      };

      const { error } = await client.from('stock_movements').insert({
        id: movement.id,
        txn_code: movement.txnCode,
        created_at: movement.createdAt,
        display_time: movement.displayTime,
        display_date: movement.displayDate,
        product_id: movement.productId,
        product_name: movement.productName,
        sku: movement.sku,
        image_url: movement.imageUrl ?? null,
        type: movement.type,
        qty_changed: movement.qtyChanged,
        previous_stock: movement.previousStock,
        new_stock: movement.newStock,
        reason_title: movement.reasonTitle,
        reference_note: movement.referenceNote,
        handled_by: movement.handledBy,
        handled_role: movement.handledRole,
        unit_cost: movement.unitCost ?? null,
      });

      if (!error) {
        return {
          movement,
          product: mapProductFromRow({ ...prodRow, stock_units: next }),
        };
      }
    }
  }

  const local = readLocalDb();
  const prodIdx = local.products.findIndex((p) => p.id === params.productId);
  if (prodIdx === -1) return null;
  const prod = local.products[prodIdx];
  const prev = prod.stockUnits;
  const next = Math.max(0, prev + signedDelta);
  const updatedProduct: Product = { ...prod, stockUnits: next };
  local.products[prodIdx] = updatedProduct;

  const movement: StockMovement = {
    id: `mov-${Date.now()}`,
    txnCode,
    createdAt: now.toISOString(),
    displayTime,
    displayDate: 'Today',
    productId: prod.id,
    productName: prod.name,
    sku: prod.sku,
    imageUrl: prod.imageUrl,
    type: params.type,
    qtyChanged: signedDelta,
    previousStock: prev,
    newStock: next,
    reasonTitle: params.reasonTitle,
    referenceNote: params.referenceNote,
    handledBy: params.handledBy || 'Ananya Sharma',
    handledRole: 'Lead Atelier',
    unitCost: params.unitCost,
  };

  local.movements.unshift(movement);
  writeLocalDb(local);
  return { movement, product: updatedProduct };
}

export async function createPurchaseOrder(params: {
  productId: string;
  qty: number;
  status?: PurchaseOrder['status'];
  notes?: string;
}): Promise<PurchaseOrder | null> {
  const local = readLocalDb();
  const client = getSupabaseClient();

  let product: Product | undefined;
  let supplier: Supplier | undefined;

  if (client) {
    const { data: prodRow } = await client
      .from('products')
      .select('*')
      .eq('id', params.productId)
      .maybeSingle();
    if (prodRow) {
      product = mapProductFromRow(prodRow);
      const { data: supRow } = await client
        .from('suppliers')
        .select('*')
        .eq('id', product.supplierId)
        .maybeSingle();
      if (supRow) supplier = mapSupplierFromRow(supRow);
    }
  }

  if (!product) {
    product = local.products.find((p) => p.id === params.productId);
    supplier = product ? local.suppliers.find((s) => s.id === product!.supplierId) : undefined;
  }

  if (!product) return null;

  const subtotal = product.costPrice * params.qty;
  const gstRate = 5;
  const totalAmount = Math.round(subtotal * (1 + gstRate / 100) * 100) / 100;
  const po: PurchaseOrder = {
    id: `po-${Date.now()}`,
    poNumber: `PO-2025-${Math.floor(1000 + Math.random() * 8999)}`,
    supplierId: supplier?.id || product.supplierId,
    supplierName: supplier?.name || product.supplierName,
    gstin: supplier?.gstin || '29AAACI1681G1Z0',
    productId: product.id,
    productName: product.name,
    sku: product.sku,
    qty: params.qty,
    unitLabel: product.unitLabel,
    unitPrice: product.costPrice,
    gstRate,
    totalAmount,
    status: params.status || 'Dispatched',
    expectedAt: `${product.leadTimeHours}h Express Dispatch`,
    createdAt: new Date().toISOString(),
    notes: params.notes || 'Authorized via SmartStock AI',
  };

  if (client) {
    const { error } = await client.from('purchase_orders').insert({
      id: po.id,
      po_number: po.poNumber,
      supplier_id: po.supplierId,
      supplier_name: po.supplierName,
      gstin: po.gstin,
      product_id: po.productId,
      product_name: po.productName,
      sku: po.sku,
      qty: po.qty,
      unit_label: po.unitLabel,
      unit_price: po.unitPrice,
      gst_rate: po.gstRate,
      total_amount: po.totalAmount,
      status: po.status,
      expected_at: po.expectedAt,
      created_at: po.createdAt,
      notes: po.notes ?? null,
    });
    if (!error) return po;
  }

  local.purchaseOrders.unshift(po);
  writeLocalDb(local);
  return po;
}

export async function markNotificationRead(id: string | 'all'): Promise<NotificationItem[]> {
  const client = getSupabaseClient();
  if (client) {
    if (id === 'all') {
      await client.from('notifications').update({ read: true }).neq('id', '');
    } else {
      await client.from('notifications').update({ read: true }).eq('id', id);
    }
    const { data } = await client.from('notifications').select('*');
    if (data) {
      return data.map((n: Record<string, any>) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        severity: n.severity,
        category: n.category,
        createdAt: n.created_at,
        read: Boolean(n.read),
        productId: n.product_id ?? undefined,
        actionLabel: n.action_label ?? undefined,
      }));
    }
  }

  const local = readLocalDb();
  local.notifications = local.notifications.map((n) =>
    id === 'all' || n.id === id ? { ...n, read: true } : n,
  );
  writeLocalDb(local);
  return local.notifications;
}

export async function saveSettings(settings: StoreSettings): Promise<StoreSettings> {
  const updated = { ...settings, lastBackupAt: 'Just now' };
  const client = getSupabaseClient();
  if (client) {
    const { error } = await client.from('store_settings').upsert({
      id: 'default',
      payload: updated,
      updated_at: new Date().toISOString(),
    });
    if (!error) return updated;
  }

  const local = readLocalDb();
  local.settings = updated;
  writeLocalDb(local);
  return updated;
}

export async function updateStaffMember(
  id: string,
  patch: Partial<StaffMember>,
): Promise<StaffMember | null> {
  const client = getSupabaseClient();
  if (client) {
    const updateRow: Record<string, any> = {};
    if (patch.status !== undefined) updateRow.status = patch.status;
    if (patch.shift !== undefined) updateRow.shift = patch.shift;
    if (patch.permissions !== undefined) updateRow.permissions = patch.permissions;
    const { data, error } = await client
      .from('staff_members')
      .update(updateRow)
      .eq('id', id)
      .select()
      .maybeSingle();
    if (!error && data) {
      return {
        id: data.id,
        name: data.name,
        role: data.role,
        branch: data.branch,
        phone: data.phone,
        email: data.email,
        shift: data.shift,
        status: data.status,
        permissions: Array.isArray(data.permissions) ? data.permissions : [],
        avatarUrl: data.avatar_url ?? undefined,
      };
    }
  }

  const local = readLocalDb();
  const idx = local.staff.findIndex((s) => s.id === id);
  if (idx === -1) return null;
  local.staff[idx] = { ...local.staff[idx], ...patch };
  writeLocalDb(local);
  return local.staff[idx];
}

export async function updatePurchaseOrderStatus(
  id: string,
  status: PurchaseOrder['status'],
): Promise<PurchaseOrder | null> {
  const client = getSupabaseClient();
  if (client) {
    const { data, error } = await client
      .from('purchase_orders')
      .update({ status })
      .eq('id', id)
      .select()
      .maybeSingle();
    if (!error && data) return mapPoFromRow(data);
  }

  const local = readLocalDb();
  const idx = local.purchaseOrders.findIndex((po) => po.id === id);
  if (idx === -1) return null;
  local.purchaseOrders[idx] = { ...local.purchaseOrders[idx], status };
  writeLocalDb(local);
  return local.purchaseOrders[idx];
}

