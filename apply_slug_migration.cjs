// Script pour appliquer la migration du slug pour les intervenants
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Lire les variables d'environnement depuis .env.local
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split(/\r?\n/).forEach(line => {
  line = line.trim();
  if (!line || line.startsWith('#')) return;
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const value = match[2].trim().replace(/^["']|["']$/g, '');
    envVars[key] = value;
  }
});

let migrationSQL = fs.readFileSync(
  path.join(__dirname, 'supabase', 'migrations', '20241214140000_add_practitioner_slug.sql'),
  'utf8'
);

function printSQL() {
  const supabaseUrl = envVars.VITE_SUPABASE_URL || 'https://phokxjbocljahmbdkrbs.supabase.co';
  console.log('========================================');
  console.log(migrationSQL);
  console.log('========================================\n');
  console.log('🔗 SQL Editor de Supabase:');
  console.log(`   ${supabaseUrl.replace('/rest/v1', '').replace('https://', 'https://supabase.com/dashboard/project/')}/sql/new\n`);
}

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error('❌ VITE_SUPABASE_URL manquante dans .env.local');
  process.exit(1);
}

if (!supabaseServiceKey) {
  console.log('\n⚠️  SUPABASE_SERVICE_ROLE_KEY non trouvée dans .env.local\n');
  console.log('📋 Veuillez exécuter le SQL ci-dessous manuellement dans le SQL Editor de Supabase:\n');
  printSQL();
  process.exit(0);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigration() {
  console.log('🚀 Application de la migration slug pour les intervenants...\n');

  try {
    // La fonction exec_sql n'existe probablement pas, donc afficher le SQL
    console.log('📋 Veuillez copier le SQL ci-dessous et l\'exécuter manuellement');
    console.log('   dans le SQL Editor de Supabase:\n');
    printSQL();
    console.log('✅ Une fois exécuté, les intervenants auront des URLs courtes comme:');
    console.log('   https://fl2m.fr/consultants/frederic-menard\n');

  } catch (err) {
    console.error('❌ Erreur:', err.message);
  }
}

applyMigration();
