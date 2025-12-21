// Script pour appliquer les migrations des bénéficiaires
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Charger les variables d'environnement depuis .env.local
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement manquantes');
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigrations() {
  console.log('📦 Application des migrations des bénéficiaires...\n');

  try {
    // Lire le fichier SQL
    const sqlPath = path.join(__dirname, 'apply_beneficiary_updates.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('📄 Lecture du fichier SQL...');
    console.log(`📏 Taille: ${sql.length} caractères\n`);

    // Diviser en plusieurs requêtes (séparées par des commentaires de section)
    const sections = sql.split('-- ============================================================================');

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i].trim();
      if (!section) continue;

      const sectionTitle = section.split('\n')[0].replace('--', '').trim();
      console.log(`⚙️  ${sectionTitle || `Section ${i + 1}`}...`);

      try {
        const { data, error } = await supabase.rpc('exec_sql', { sql_query: section });

        // Si la fonction RPC n'existe pas, on essaie directement
        if (error && error.message.includes('function')) {
          console.log('   ⚠️  Tentative d\'exécution directe via l\'API...');

          // On va devoir utiliser une approche différente
          // Créer une Edge Function temporaire ou utiliser psql
          console.log('   ℹ️  L\'exécution via l\'API Supabase a des limitations.');
          console.log('   ℹ️  Veuillez copier le contenu de apply_beneficiary_updates.sql');
          console.log('   ℹ️  et l\'exécuter dans le SQL Editor de Supabase Dashboard.');
          console.log('   ℹ️  URL: ' + supabaseUrl.replace('/rest/v1', '') + '/project/_/sql');
          process.exit(1);
        }

        if (error) throw error;

        console.log(`   ✅ Section appliquée avec succès\n`);
      } catch (err) {
        console.error(`   ❌ Erreur:`, err.message);
        throw err;
      }
    }

    console.log('\n✅ Toutes les migrations ont été appliquées avec succès!');
    console.log('\n📋 Résumé:');
    console.log('   • Table beneficiary_notes créée');
    console.log('   • Politiques RLS configurées');
    console.log('   • Champs legacy supprimés de appointments');
    console.log('   • Vue appointments_with_beneficiaries recréée');
    console.log('   • Index optimisés');

  } catch (error) {
    console.error('\n❌ Erreur lors de l\'application des migrations:', error);
    process.exit(1);
  }
}

// Exécuter
applyMigrations();
