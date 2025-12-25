const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuration Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://phokxjbocljahmbdkrbs.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY non trouvée dans l\'environnement');
  console.error('Définissez la variable d\'environnement SUPABASE_SERVICE_ROLE_KEY avec votre service role key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigration() {
  console.log('📦 Application de la migration pour corriger les RLS du bucket documents...\n');

  try {
    // Lire le fichier de migration
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20251225_fix_documents_bucket_rls.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Exécution de la migration...');

    // Exécuter le SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: migrationSQL }).catch(async () => {
      // Si la fonction exec_sql n'existe pas, essayons d'exécuter directement
      // Note: cela nécessite des permissions appropriées
      const { error: execError } = await supabase.from('_migrations').insert({
        version: '20251225_fix_documents_bucket_rls',
        name: 'fix_documents_bucket_rls'
      });

      if (execError) {
        console.error('Impossible d\'enregistrer la migration:', execError);
      }

      // Essayer d'exécuter via l'API REST directement
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({ query: migrationSQL })
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status} ${response.statusText}`);
      }

      return { data: await response.json(), error: null };
    });

    if (error) {
      console.error('❌ Erreur lors de l\'exécution de la migration:', error);
      console.error('\n⚠️  Veuillez copier le contenu du fichier suivant et l\'exécuter manuellement dans le SQL Editor de Supabase:');
      console.error(`   ${migrationPath}`);
      console.error('\n📍 SQL Editor: https://supabase.com/dashboard/project/phokxjbocljahmbdkrbs/sql/new');
      process.exit(1);
    }

    console.log('✅ Migration appliquée avec succès!');
    console.log('\n📁 Structure: documents/beneficiaries/{beneficiary_id}/fichier.pdf');
    console.log('🔐 Documents publics: visibles par les bénéficiaires');
    console.log('🔒 Documents privés: visibles uniquement par les intervenants et admins');
    console.log('\n✨ Les documents devraient maintenant être accessibles!');
    console.log('\n💡 Testez en rafraîchissant la page des bénéficiaires');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error('\n⚠️  Veuillez exécuter manuellement la migration dans le SQL Editor de Supabase:');
    console.error('   supabase/migrations/20251225_fix_documents_bucket_rls.sql');
    console.error('\n📍 SQL Editor: https://supabase.com/dashboard/project/phokxjbocljahmbdkrbs/sql/new');
    process.exit(1);
  }
}

applyMigration();
