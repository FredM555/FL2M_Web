const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Lire le fichier .env.example pour obtenir les infos de connexion
const envPath = path.join(__dirname, '.env.example');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};

envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

// Configuration - REMPLACER PAR VOS VRAIES CREDENTIALS
const supabaseUrl = 'https://ynvvysmtvzgfdzakyqzf.supabase.co';
const supabaseServiceKey = 'VOTRE_SERVICE_ROLE_KEY'; // Vous devez fournir cette clé

console.log('⚠️  ATTENTION: Ce script nécessite la clé SERVICE_ROLE_KEY');
console.log('📝 Pour l\'obtenir: Supabase Dashboard → Settings → API → service_role key\n');

// Lecture de la migration
const migrationPath = path.join(__dirname, 'supabase', 'migrations', 'add_rls_practitioner_contracts.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

console.log('📄 Migration à appliquer:');
console.log('─'.repeat(80));
console.log(migrationSQL);
console.log('─'.repeat(80));
console.log('\n✋ Cette migration va:');
console.log('   1. Activer RLS sur practitioner_contracts');
console.log('   2. Permettre aux praticiens de voir leurs propres contrats');
console.log('   3. Permettre aux praticiens de mettre à jour leurs propres contrats');
console.log('   4. Permettre aux praticiens de supprimer leurs contrats en pending_payment');
console.log('   5. Donner tous les droits aux admins\n');

console.log('💡 Pour appliquer manuellement:');
console.log('   1. Allez sur https://supabase.com/dashboard/project/ynvvysmtvzgfdzakyqzf/editor');
console.log('   2. Cliquez sur "SQL Editor"');
console.log('   3. Créez une nouvelle requête');
console.log('   4. Copiez-collez le contenu de: supabase/migrations/add_rls_practitioner_contracts.sql');
console.log('   5. Exécutez la requête\n');
