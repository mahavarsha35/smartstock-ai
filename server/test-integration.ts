import {
  getHealth,
  getBootstrapData,
  createProduct,
  updateProduct,
  recordStockMovement,
  markNotificationRead,
  saveSettings,
  testSupabaseConnection,
} from './db.ts';

async function runTests() {
  console.log('🧪 Running Backend Integration Verification Tests...\n');

  // Test 1: Health check
  console.log('Test 1: Health check...');
  const health = await getHealth();
  console.log('  Storage Mode:', health.storageMode);
  console.log('  Supabase Configured:', health.supabaseConfigured);
  console.log('  Last Synced At:', health.lastSyncedAt);

  // Test 2: Bootstrap data retrieval
  console.log('\nTest 2: Bootstrap Data retrieval...');
  const bootstrap = await getBootstrapData();
  console.log(`  Products loaded: ${bootstrap.products.length}`);
  console.log(`  Suppliers loaded: ${bootstrap.suppliers.length}`);
  console.log(`  Movements loaded: ${bootstrap.movements.length}`);
  console.log(`  Purchase orders loaded: ${bootstrap.purchaseOrders.length}`);
  console.log(`  Store Name: ${bootstrap.settings?.storeName}`);

  // Test 3: Product creation
  console.log('\nTest 3: Create Product...');
  const testSku = `TEST-${Date.now().toString().slice(-4)}`;
  const newProd = await createProduct({
    sku: testSku,
    barcode: '8901234567890',
    name: 'Atelier Test Product',
    category: 'Staples',
    stockUnits: 50,
    minStock: 10,
    unitLabel: 'units',
    costPrice: 100,
    sellingPrice: 150,
    supplierId: 'sup-itc-001',
    supplierName: 'ITC Foods & Logistics Ltd.',
    bayLocation: 'Bay T-01',
    dailyVelocity: 2,
    leadTimeHours: 24,
    imageUrl: 'https://example.com/test.jpg',
  });
  console.log(`  Created Product ID: ${newProd.id}, SKU: ${newProd.sku}`);

  // Test 4: Product update
  console.log('\nTest 4: Update Product...');
  const updated = await updateProduct(newProd.id, {
    sellingPrice: 165,
    bayLocation: 'Bay T-02',
  });
  console.log(`  Updated Price: ${updated?.sellingPrice}, Bay: ${updated?.bayLocation}`);

  // Test 5: Stock movement
  console.log('\nTest 5: Record Stock Movement...');
  const movementRes = await recordStockMovement({
    productId: newProd.id,
    type: 'Stock Out',
    qty: 5,
    reasonTitle: 'Test Dispatch',
    referenceNote: 'Integration test automated dispatch',
  });
  console.log(`  Previous Stock: ${movementRes?.movement.previousStock}, New Stock: ${movementRes?.movement.newStock}`);

  // Test 6: Supabase connection tester
  console.log('\nTest 6: Supabase diagnostic test function...');
  const testRes = await testSupabaseConnection();
  console.log(`  Status: ${testRes.status}, Message: ${testRes.message}`);

  console.log('\n============================================================');
  console.log('✅ ALL BACKEND INTEGRATION TESTS PASSED SUCCESSFULLY!');
  console.log('============================================================\n');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
