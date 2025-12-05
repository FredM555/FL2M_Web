const fs = require('fs');
const path = require('path');

async function applyMigration() {
  const { createClient } = require('@supabase/supabase-js');

  // Charger les variables d'environnement
  require('dotenv').config();

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Variables d\'environnement manquantes:');
    console.error('   VITE_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
    console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Lire le fichier SQL
  const sqlPath = path.join(__dirname, 'supabase', 'migrations', 'create_transaction_stats_functions.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('📝 Application de la migration create_transaction_stats_functions.sql...');

  // Découper le SQL en commandes individuelles (séparées par les commentaires des fonctions)
  const functions = [
    // Fonction 1: get_practitioner_transaction_stats
    sql.substring(
      sql.indexOf('CREATE OR REPLACE FUNCTION get_practitioner_transaction_stats'),
      sql.indexOf('-- =====================================================\n-- Fonction: Statistiques globales')
    ),
    // Fonction 2: get_global_transaction_stats
    sql.substring(
      sql.indexOf('CREATE OR REPLACE FUNCTION get_global_transaction_stats'),
      sql.indexOf('-- =====================================================\n-- Fonction: Statistiques par période')
    ),
    // Fonction 3: get_transaction_stats_by_period
    sql.substring(
      sql.indexOf('CREATE OR REPLACE FUNCTION get_transaction_stats_by_period'),
      sql.indexOf('-- =====================================================\n-- Fonction: Statistiques par intervenant')
    ),
    // Fonction 4: get_stats_by_practitioner
    sql.substring(
      sql.indexOf('CREATE OR REPLACE FUNCTION get_stats_by_practitioner'),
      sql.indexOf('-- =====================================================\n-- Permissions')
    ),
    // Permissions
    sql.substring(
      sql.indexOf('GRANT EXECUTE ON FUNCTION get_practitioner_transaction_stats'),
      sql.indexOf('-- =====================================================\n-- IMPORTANT')
    )
  ];

  for (let i = 0; i < functions.length; i++) {
    const funcSql = functions[i].trim();
    if (!funcSql) continue;

    try {
      const { error } = await supabase.rpc('exec_sql', { sql: funcSql });

      if (error) {
        // Fallback: essayer via l'API REST directement
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`
          },
          body: JSON.stringify({ query: funcSql })
        });

        if (!response.ok) {
          console.error(`❌ Erreur fonction ${i + 1}:`, error);
          continue;
        }
      }

      console.log(`✅ Fonction ${i + 1}/5 créée avec succès`);
    } catch (err) {
      console.error(`❌ Erreur fonction ${i + 1}:`, err.message);
    }
  }

  // Vérifier que les fonctions ont été créées
  console.log('\n🔍 Vérification des fonctions créées...');

  try {
    const { data, error } = await supabase.rpc('get_global_transaction_stats');

    if (error) {
      console.log('⚠️  Les fonctions n\'ont pas pu être créées automatiquement.');
      console.log('\n📋 Veuillez copier-coller le SQL suivant dans Supabase Dashboard:');
      console.log('   https://supabase.com/dashboard/project/' + supabaseUrl.split('.')[0].split('//')[1] + '/sql\n');
      console.log('------ DÉBUT DU SQL ------');
      console.log(sql);
      console.log('------ FIN DU SQL ------\n');
    } else {
      console.log('✅ Toutes les fonctions RPC ont été créées avec succès !');
      console.log('   - get_practitioner_transaction_stats()');
      console.log('   - get_global_transaction_stats()');
      console.log('   - get_transaction_stats_by_period()');
      console.log('   - get_stats_by_practitioner()');
      console.log('\n✨ Migration terminée ! Vous pouvez rafraîchir la page admin.');
    }
  } catch (err) {
    console.log('⚠️  Impossible de vérifier automatiquement.');
    console.log('\n📋 Méthode manuelle recommandée:');
    console.log('1. Aller sur: https://supabase.com/dashboard/project/' + supabaseUrl.split('.')[0].split('//')[1] + '/sql');
    console.log('2. Copier-coller le contenu de: supabase/migrations/create_transaction_stats_functions.sql');
    console.log('3. Cliquer sur "Run"\n');
  }
}

applyMigration().catch(console.error);
