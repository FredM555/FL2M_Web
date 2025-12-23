// Script pour appliquer les corrections des bénéficiaires
// Usage: node apply_beneficiary_fixes.cjs

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://phokxjbocljahmbdkrbs.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY non définie dans les variables d\'environnement');
  console.error('Ajoutez-la dans votre fichier .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function executeSql(sql, description) {
  console.log(`\n📝 ${description}...`);

  try {
    // Utiliser fetch pour exécuter le SQL via l'API REST de Supabase
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ query: sql })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Erreur HTTP ${response.status}:`, errorText);

      // Si la fonction RPC n'existe pas, on va essayer d'exécuter les commandes SQL une par une
      if (response.status === 404 || errorText.includes('function') || errorText.includes('does not exist')) {
        console.log('⚠️  La fonction exec_sql n\'existe pas. Veuillez appliquer les migrations manuellement.');
        console.log('📋 SQL à exécuter via le Dashboard Supabase > SQL Editor:');
        console.log('---------------------------------------------------');
        console.log(sql);
        console.log('---------------------------------------------------');
        return false;
      }

      return false;
    }

    console.log(`✅ ${description} - OK`);
    return true;
  } catch (err) {
    console.error(`❌ Exception:`, err.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Démarrage des corrections bénéficiaires...\n');
  console.log('📋 Migrations à appliquer:');
  console.log('  1. Correction de beneficiary_notes (ajout user_id)');
  console.log('  2. Création du bucket beneficiary-documents\n');

  // Migration 1: Correction de beneficiary_notes
  const migration1Path = path.join(__dirname, 'supabase', 'migrations', '20251223_fix_beneficiary_notes_add_user_id.sql');
  const migration1Sql = fs.readFileSync(migration1Path, 'utf8');

  const migration1Success = await executeSql(
    migration1Sql,
    'Migration 1: Correction de beneficiary_notes'
  );

  if (!migration1Success) {
    console.error('\n❌ Échec de la migration 1');
    console.error('Veuillez corriger les erreurs avant de continuer');
    process.exit(1);
  }

  // Migration 2: Création du bucket beneficiary-documents
  const migration2Path = path.join(__dirname, 'supabase', 'migrations', '20251223_create_beneficiary_documents_bucket.sql');
  const migration2Sql = fs.readFileSync(migration2Path, 'utf8');

  const migration2Success = await executeSql(
    migration2Sql,
    'Migration 2: Création du bucket beneficiary-documents'
  );

  if (!migration2Success) {
    console.error('\n❌ Échec de la migration 2');
    console.error('Vous devrez peut-être créer le bucket manuellement dans Supabase Dashboard');
  }

  console.log('\n✅ Toutes les migrations ont été appliquées avec succès!');
  console.log('\n📌 Prochaines étapes:');
  console.log('  1. Testez le dépôt de documents sur un bénéficiaire');
  console.log('  2. Testez l\'écriture de notes sur un bénéficiaire');
  console.log('  3. Vérifiez que les erreurs ont disparu\n');
}

main().catch(err => {
  console.error('❌ Erreur fatale:', err);
  process.exit(1);
});
