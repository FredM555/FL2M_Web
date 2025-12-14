// Script pour appliquer les politiques RLS SELECT pour appointments
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
    const value = match[2].trim().replace(/^["]|["]$/g, '');
    envVars[key] = value;
  }
});

const migrationSQL = fs.readFileSync(
  path.join(__dirname, 'supabase', 'migrations', '20241214150000_add_appointments_rls_select.sql'),
  'utf8'
);

const supabaseUrl = envVars.VITE_SUPABASE_URL || 'https://phokxjbocljahmbdkrbs.supabase.co';

console.log('========================================');
console.log(migrationSQL);
console.log('========================================\n');
console.log('🔗 SQL Editor de Supabase:');
console.log(`   ${supabaseUrl.replace('/rest/v1', '').replace('https://', 'https://supabase.com/dashboard/project/')}/sql/new\n`);
console.log('📋 Copiez-collez le SQL ci-dessus pour permettre aux utilisateurs de voir les rendez-vous disponibles.\n');
