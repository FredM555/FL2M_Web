// Script pour créer la fonction RPC get_public_practitioner_numerology
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuration Supabase depuis les variables d'environnement
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://mknedawtavpxkcphxkuh.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ ERREUR: SUPABASE_SERVICE_ROLE_KEY non définie');
  console.error('Définissez la variable d\'environnement SUPABASE_SERVICE_ROLE_KEY avec votre clé service role');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  try {
    console.log('📝 Lecture du fichier SQL...');
    const sqlPath = path.join(__dirname, 'get_public_practitioner_numerology.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('🚀 Application de la fonction RPC...');

    // Exécuter le SQL via RPC (méthode recommandée pour Supabase)
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql }).catch(async () => {
      // Si exec_sql n'existe pas, utiliser la méthode directe
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({ query: sql })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return { data: await response.json(), error: null };
    });

    if (error) {
      console.error('❌ Erreur lors de l\'application de la fonction:', error);
      process.exit(1);
    }

    console.log('✅ Fonction get_public_practitioner_numerology créée avec succès!');
    console.log('');
    console.log('📋 Résumé:');
    console.log('   - Fonction: get_public_practitioner_numerology(user_id)');
    console.log('   - Rôle: Récupère les données de numérologie des intervenants publics');
    console.log('   - Sécurité: Expose uniquement les données des profils publics (is_active + profile_visible)');
    console.log('');
    console.log('⚠️  IMPORTANT: Si vous voyez une erreur, exécutez le SQL manuellement dans le SQL Editor de Supabase');
    console.log('   Fichier: get_public_practitioner_numerology.sql');

  } catch (err) {
    console.error('❌ Erreur:', err.message);
    console.error('');
    console.error('💡 Solution alternative:');
    console.error('   1. Ouvrez le Dashboard Supabase (https://supabase.com/dashboard)');
    console.error('   2. Allez dans SQL Editor');
    console.error('   3. Copiez le contenu de get_public_practitioner_numerology.sql');
    console.error('   4. Exécutez-le manuellement');
    process.exit(1);
  }
}

applyMigration();
