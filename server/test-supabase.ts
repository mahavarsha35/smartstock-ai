import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  getSupabaseCredentials,
  getSupabaseClient,
  testSupabaseConnection,
  seedSupabaseIfEmpty,
} from './db.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function main() {
  console.log('\n============================================================');
  console.log('       SmartStock AI — Supabase Integration Diagnostic      ');
  console.log('============================================================\n');

  const creds = getSupabaseCredentials();

  if (!creds) {
    console.log('❌ Supabase credentials NOT found in environment.');
    console.log('\nTo configure Supabase:');
    console.log('1. Open your Supabase Dashboard: https://supabase.com/dashboard');
    console.log('2. Create or select a project.');
    console.log('3. Go to Project Settings > API.');
    console.log('4. Copy "Project URL" and "service_role" (or "anon") secret key.');
    console.log('5. Add them to your .env file:');
    console.log('     SUPABASE_URL=https://xyzcompany.supabase.co');
    console.log('     SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...\n');
    console.log('   (Or configure them directly in the UI under Settings > 7. Data Persistence)\n');
    process.exit(1);
  }

  const maskedKey = creds.key.length > 12
    ? `${creds.key.substring(0, 6)}...${creds.key.substring(creds.key.length - 4)}`
    : '***';

  console.log(`📡 Supabase URL: ${creds.url}`);
  console.log(`🔑 Key Type:     ${creds.isServiceRole ? 'Service Role Key (Full Admin)' : 'Anon / Public Key'}`);
  console.log(`🔒 Key Masked:   ${maskedKey}\n`);
  console.log('⏳ Connecting to Supabase and checking PostgreSQL schema...\n');

  const test = await testSupabaseConnection();

  console.log('------------------------------------------------------------');
  console.log('Table Verification:');
  console.log('------------------------------------------------------------');

  const allTables = [
    'suppliers',
    'products',
    'stock_movements',
    'purchase_orders',
    'notifications',
    'staff_members',
    'store_settings',
  ];

  for (const table of allTables) {
    const isReady = test.tablesFound.includes(table);
    const count = test.rowCounts[table] ?? 0;
    const statusIcon = isReady ? '✅ OK' : '❌ MISSING';
    console.log(`  ${table.padEnd(20)} [${statusIcon}] (${count} rows)`);
  }
  console.log('------------------------------------------------------------\n');

  if (test.missingTables.length > 0) {
    console.log(`⚠️  Warning: ${test.missingTables.length} tables are missing from your database:`);
    console.log(`   ${test.missingTables.join(', ')}\n`);
    console.log('👉 ACTION REQUIRED:');
    console.log('1. Open your Supabase Dashboard: https://supabase.com/dashboard');
    console.log('2. Click on "SQL Editor" in the left navigation.');
    console.log('3. Paste the contents of "supabase/schema.sql" and click "Run".');
    console.log('4. Re-run this check: npm run test:supabase\n');
    process.exit(1);
  }

  console.log('✨ All 7 tables verified successfully!');

  // Check if seeding is needed
  const client = getSupabaseClient();
  if (client) {
    const productsCount = test.rowCounts['products'] ?? 0;
    if (productsCount === 0) {
      console.log('🌱 Database is empty. Seeding initial catalog and ledger...');
      const seeded = await seedSupabaseIfEmpty(client);
      if (seeded) {
        console.log('✅ Initial inventory, suppliers, and ledger successfully seeded!');
      } else {
        console.log('⚠️ Automatic seeding failed. Check your Supabase RLS policies.');
      }
    } else {
      console.log(`📦 Database contains ${productsCount} products. Ready for live operations!`);
    }
  }

  console.log('\n============================================================');
  console.log('🎉 Supabase integration is READY and operational!');
  console.log('============================================================\n');
}

main().catch((err) => {
  console.error('\n❌ Unexpected error running diagnostic:', err);
  process.exit(1);
});
