import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  bulkAdjustPrices,
  createProduct,
  createPurchaseOrder,
  createSupplier,
  getBootstrapData,
  getHealth,
  markNotificationRead,
  recordStockMovement,
  saveSettings,
  updateProduct,
  updatePurchaseOrderStatus,
  updateStaffMember,
} from './server/db.ts';
import { queryConcierge, syncDemandForecast } from './server/gemini.ts';

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', async (_req, res) => {
    try {
      const health = await getHealth();
      res.json(health);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to read server health' });
    }
  });

  app.get('/api/bootstrap', async (_req, res) => {
    try {
      const data = await getBootstrapData();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to bootstrap store ledger' });
    }
  });

  app.post('/api/products', async (req, res) => {
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

  app.patch('/api/products/:id', async (req, res) => {
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

  app.post('/api/products/bulk-price', async (req, res) => {
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

  app.post('/api/suppliers', async (req, res) => {
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

  app.post('/api/movements', async (req, res) => {
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

  app.post('/api/purchase-orders', async (req, res) => {
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

  app.patch('/api/purchase-orders/:id', async (req, res) => {
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

  app.post('/api/notifications/read', async (req, res) => {
    try {
      const id = req.body?.id || 'all';
      const notifications = await markNotificationRead(id);
      res.json({ notifications });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to update notifications' });
    }
  });

  app.patch('/api/staff/:id', async (req, res) => {
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

  app.put('/api/settings', async (req, res) => {
    try {
      const saved = await saveSettings(req.body);
      res.json(saved);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to save store settings' });
    }
  });

  app.post('/api/ai/concierge', async (req, res) => {
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

  app.post('/api/ai/sync-forecast', async (_req, res) => {
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

  app.get('/api/supabase/schema', (_req, res) => {
    try {
      const schemaPath = path.resolve(process.cwd(), 'supabase', 'schema.sql');
      const sql = fs.readFileSync(schemaPath, 'utf8');
      res.type('text/plain').send(sql);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Could not read supabase/schema.sql' });
    }
  });

  app.get('/api/export/inventory', async (req, res) => {
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

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SmartStock AI Atelier server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start SmartStock AI server:', err);
  process.exit(1);
});
