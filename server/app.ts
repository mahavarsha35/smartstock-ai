import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  bulkAdjustPrices,
  configureSupabaseCredentials,
  createProduct,
  createPurchaseOrder,
  createSupplier,
  deleteProduct,
  getBootstrapData,
  getHealth,
  markNotificationRead,
  recordStockMovement,
  saveSettings,
  syncLocalToSupabase,
  testSupabaseConnection,
  updateProduct,
  updatePurchaseOrderStatus,
  updateStaffMember,
} from './db.ts';
import { queryConcierge, syncDemandForecast } from './gemini.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApiApp() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  // CORS support
  app.use((_req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (_req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  const router = express.Router();

  // ==========================================================================
  // Health & Bootstrap Endpoints
  // ==========================================================================

  router.get('/health', async (_req, res) => {
    try {
      const health = await getHealth();
      res.json(health);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to read server health' });
    }
  });

  router.get('/bootstrap', async (_req, res) => {
    try {
      const data = await getBootstrapData();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to bootstrap store ledger' });
    }
  });

  // ==========================================================================
  // Supabase Configuration & Management Endpoints
  // ==========================================================================

  router.get('/supabase/status', async (_req, res) => {
    try {
      const test = await testSupabaseConnection();
      const health = await getHealth();
      res.json({ test, health });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to check Supabase status' });
    }
  });

  router.post('/supabase/test', async (req, res) => {
    try {
      const { url, key } = req.body || {};
      const result = await testSupabaseConnection(url, key);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Supabase connection test failed' });
    }
  });

  router.post('/supabase/configure', async (req, res) => {
    try {
      const { url, key } = req.body || {};
      if (!url || !key) {
        res.status(400).json({ error: 'Both Supabase URL and API Key are required.' });
        return;
      }
      const result = await configureSupabaseCredentials(String(url), String(key));
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to configure Supabase credentials' });
    }
  });

  router.post('/supabase/sync', async (_req, res) => {
    try {
      const result = await syncLocalToSupabase();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to sync local data to Supabase' });
    }
  });

  router.get('/supabase/schema', (_req, res) => {
    try {
      const candidates = [
        path.resolve(process.cwd(), 'supabase', 'schema.sql'),
        path.resolve(process.cwd(), 'smartstock-ai', 'supabase', 'schema.sql'),
        path.resolve(__dirname, '..', 'supabase', 'schema.sql'),
      ];
      let schemaPath = candidates.find((p) => fs.existsSync(p));
      if (!schemaPath) schemaPath = candidates[0];
      const sql = fs.readFileSync(schemaPath, 'utf8');
      res.type('text/plain').send(sql);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Could not read supabase/schema.sql' });
    }
  });

  // ==========================================================================
  // Product Endpoints
  // ==========================================================================

  router.post('/products', async (req, res) => {
    try {
      const body = req.body;
      if (!body?.name || !body?.sku) {
        res.status(400).json({ error: 'Product name and SKU are required.' });
        return;
      }
      const created = await createProduct({
        sku: String(body.sku).trim().toUpperCase(),
        barcode: String(body.barcode || `890${Math.floor(1000000000 + Math.random() * 8999999999)}`),
        name: String(body.name).trim(),
        category: body.category || 'Staples',
        stockUnits: Number(body.stockUnits ?? 0),
        minStock: Number(body.minStock ?? 15),
        unitLabel: body.unitLabel || 'units',
        costPrice: Number(body.costPrice ?? 0),
        sellingPrice: Number(body.sellingPrice ?? 0),
        supplierId: body.supplierId || 'sup-itc-001',
        supplierName: body.supplierName || 'ITC Foods & Logistics Ltd.',
        bayLocation: body.bayLocation || 'Bay A-05',
        dailyVelocity: Number(body.dailyVelocity ?? 4),
        leadTimeHours: Number(body.leadTimeHours ?? 24),
        expiryDate: body.expiryDate || undefined,
        batchNo: body.batchNo || undefined,
        imageUrl:
          body.imageUrl ||
          'https://lh3.googleusercontent.com/aida-public/AB6AXuD04d_rlpok7l3pDnHr9ryLy2ulNDrOL3opG7wntkLintfruH80KKbkutyBjtELIbrFS3NwDuKMy4_4eIB-1IDutxQYlRKmQ0DnmNGM7uK6umicpfwTX4qMenkeK8-jptwmX5rbseldAYl17fSO7xMA0Y5tIEi2Eo0PTO40JJMuBctZTmknMqQwvcVuBn69sW0VXb2nvRtE5ePPwDd7GdIq80AsuvngWhxhxsCIlw',
      });
      res.status(201).json(created);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to create product' });
    }
  });

  router.patch('/products/:id', async (req, res) => {
    try {
      const updated = await updateProduct(req.params.id, req.body);
      if (!updated) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to update product' });
    }
  });

  router.delete('/products/:id', async (req, res) => {
    try {
      const ok = await deleteProduct(req.params.id);
      if (!ok) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }
      res.json({ success: true, id: req.params.id });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to delete product' });
    }
  });

  router.post('/products/bulk-price', async (req, res) => {
    try {
      const percentage = Number(req.body?.percentage ?? 0);
      const category = req.body?.category ? String(req.body.category) : undefined;
      if (Number.isNaN(percentage) || percentage < -50 || percentage > 100) {
        res.status(400).json({ error: 'Percentage must be between -50% and +100%.' });
        return;
      }
      const products = await bulkAdjustPrices(percentage, category);
      res.json({ products });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to adjust catalog prices' });
    }
  });

  // ==========================================================================
  // Supplier Endpoints
  // ==========================================================================

  router.post('/suppliers', async (req, res) => {
    try {
      const body = req.body;
      if (!body?.name || !body?.contactPerson || !body?.phone) {
        res.status(400).json({ error: 'Supplier name, contact person, and phone are required.' });
        return;
      }
      const created = await createSupplier({
        name: String(body.name).trim(),
        cityHub: String(body.cityHub || 'Bengaluru Hub').trim(),
        contactPerson: String(body.contactPerson).trim(),
        phone: String(body.phone).trim(),
        email: String(body.email || 'dispatch@vendor-atelier.in').trim(),
        gstin: String(body.gstin || '29AABCS1429B1Z8').trim().toUpperCase(),
        address: String(body.address || 'Bengaluru Logistics Hub, Karnataka').trim(),
        categories: Array.isArray(body.categories) && body.categories.length > 0 ? body.categories : ['Pantry Staples'],
        keyLines: Array.isArray(body.keyLines) ? body.keyLines : ['Primary Wholesale Line'],
        leadTimeHours: Number(body.leadTimeHours ?? 24),
        paymentTerms: String(body.paymentTerms || 'Net 15 Days'),
        status: body.status || 'Active',
        tier: body.tier || 'Tier-1',
        inwardBay: body.inwardBay || 'Bay 01 (Dry Grocery)',
        gstrMatched: Boolean(body.gstrMatched ?? true),
      });
      res.status(201).json(created);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to onboard supplier' });
    }
  });

  // ==========================================================================
  // Stock Movement & Purchase Order Endpoints
  // ==========================================================================

  router.post('/movements', async (req, res) => {
    try {
      const { productId, type, qty, reasonTitle, referenceNote, handledBy, unitCost } = req.body || {};
      if (!productId || !type || !qty || Number(qty) <= 0) {
        res.status(400).json({ error: 'Valid productId, movement type, and positive quantity are required.' });
        return;
      }
      const result = await recordStockMovement({
        productId,
        type,
        qty: Number(qty),
        reasonTitle: reasonTitle || (type === 'Stock In' ? 'Supplier Inward Receipt' : 'POS Counter Dispatch'),
        referenceNote: referenceNote || 'Verified via Atelier Ledger',
        handledBy,
        unitCost: unitCost ? Number(unitCost) : undefined,
      });
      if (!result) {
        res.status(404).json({ error: 'Product not found for movement.' });
        return;
      }
      res.status(201).json(result);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to record stock movement' });
    }
  });

  router.post('/purchase-orders', async (req, res) => {
    try {
      const { productId, qty, status, notes } = req.body || {};
      if (!productId || !qty || Number(qty) <= 0) {
        res.status(400).json({ error: 'Product and positive order quantity are required.' });
        return;
      }
      const po = await createPurchaseOrder({
        productId,
        qty: Number(qty),
        status: status || 'Dispatched',
        notes,
      });
      if (!po) {
        res.status(404).json({ error: 'Product not found for purchase order.' });
        return;
      }
      res.status(201).json(po);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to generate purchase order' });
    }
  });

  router.patch('/purchase-orders/:id', async (req, res) => {
    try {
      const po = await updatePurchaseOrderStatus(req.params.id, req.body?.status || 'Dispatched');
      if (!po) {
        res.status(404).json({ error: 'Purchase order not found' });
        return;
      }
      res.json(po);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to update purchase order' });
    }
  });

  // ==========================================================================
  // Notifications, Staff & Settings Endpoints
  // ==========================================================================

  router.post('/notifications/read', async (req, res) => {
    try {
      const id = req.body?.id || 'all';
      const notifications = await markNotificationRead(id);
      res.json({ notifications });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to update notifications' });
    }
  });

  router.patch('/staff/:id', async (req, res) => {
    try {
      const updated = await updateStaffMember(req.params.id, req.body || {});
      if (!updated) {
        res.status(404).json({ error: 'Staff member not found' });
        return;
      }
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to update staff record' });
    }
  });

  router.put('/settings', async (req, res) => {
    try {
      const saved = await saveSettings(req.body);
      res.json(saved);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to save store settings' });
    }
  });

  // ==========================================================================
  // Gemini AI Endpoints
  // ==========================================================================

  router.post('/ai/concierge', async (req, res) => {
    try {
      const { message, language } = req.body || {};
      if (!message || !String(message).trim()) {
        res.status(400).json({ error: 'Message prompt is required.' });
        return;
      }
      const snapshot = await getBootstrapData();
      const result = await queryConcierge({
        message: String(message).trim(),
        language: language || 'en',
        products: snapshot.products,
        suppliers: snapshot.suppliers,
        purchaseOrders: snapshot.purchaseOrders,
      });

      let draftPo = undefined;
      if (result.suggestedPo) {
        const matchedProd = snapshot.products.find(
          (p) => p.id === result.suggestedPo?.productId || p.sku === result.suggestedPo?.productId,
        );
        if (matchedProd) {
          const matchedSupplier = snapshot.suppliers.find((s) => s.id === matchedProd.supplierId);
          const qty = result.suggestedPo.qty;
          const subtotal = matchedProd.costPrice * qty;
          draftPo = {
            id: `draft-${Date.now()}`,
            poNumber: `PO-${Math.floor(8800 + Math.random() * 900)}-DRAFT`,
            supplierId: matchedSupplier?.id || matchedProd.supplierId,
            supplierName: matchedSupplier?.name || matchedProd.supplierName,
            gstin: matchedSupplier?.gstin || '29AAACI1681G1Z0',
            productId: matchedProd.id,
            productName: matchedProd.name,
            sku: matchedProd.sku,
            qty,
            unitLabel: matchedProd.unitLabel,
            unitPrice: matchedProd.costPrice,
            gstRate: 5,
            totalAmount: Math.round(subtotal * 1.05 * 100) / 100,
            status: 'Draft' as const,
            expectedAt: `${matchedProd.leadTimeHours}h Express Dispatch`,
            createdAt: new Date().toISOString(),
            notes: result.suggestedPo.notes,
          };
        }
      }

      res.json({
        reply: result.reply,
        badge: result.badge,
        draftPo,
        suggestedBundle: result.suggestedBundle,
      });
    } catch (err: any) {
      const status = err?.statusCode || (String(err?.message).includes('API_KEY') ? 503 : 500);
      res.status(status).json({
        error: err?.message || 'Gemini Concierge request failed.',
      });
    }
  });

  router.post('/ai/sync-forecast', async (_req, res) => {
    try {
      const snapshot = await getBootstrapData();
      const forecast = await syncDemandForecast(snapshot.products, snapshot.suppliers);
      res.json(forecast);
    } catch (err: any) {
      const status = err?.statusCode || (String(err?.message).includes('API_KEY') ? 503 : 500);
      res.status(status).json({
        error: err?.message || 'Failed to sync demand forecast with Gemini.',
      });
    }
  });

  // ==========================================================================
  // Inventory Export
  // ==========================================================================

  router.get('/export/inventory', async (req, res) => {
    try {
      const format = String(req.query.format || 'csv').toLowerCase();
      const data = await getBootstrapData();
      if (format === 'json') {
        res.setHeader('Content-Disposition', 'attachment; filename="smartstock-atelier-snapshot.json"');
        res.json(data);
        return;
      }
      const header = [
        'SKU',
        'Barcode',
        'Product Name',
        'Category',
        'Stock Units',
        'Min Threshold',
        'Unit',
        'Cost Price (INR)',
        'Selling Price (INR)',
        'Supplier',
        'Bay Location',
      ].join(',');
      const rows = data.products.map((p) =>
        [
          p.sku,
          p.barcode,
          `"${p.name.replace(/"/g, '""')}"`,
          p.category,
          p.stockUnits,
          p.minStock,
          p.unitLabel,
          p.costPrice,
          p.sellingPrice,
          `"${p.supplierName.replace(/"/g, '""')}"`,
          p.bayLocation,
        ].join(','),
      );
      const csv = [header, ...rows].join('\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="smartstock-inventory-ledger.csv"');
      res.send(csv);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Export failed' });
    }
  });

  // Mount router at both `/api` and root `/` so that both `/api/bootstrap` and `/bootstrap` resolve seamlessly
  app.use('/api', router);
  app.use(router);

  return app;
}
