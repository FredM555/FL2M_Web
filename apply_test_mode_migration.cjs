// Script pour appliquer la migration is_test_mode manuellement
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  console.log('🔧 Application de la migration is_test_mode...\n');

  try {
    // Ajouter la colonne is_test_mode
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE public.transactions
        ADD COLUMN IF NOT EXISTS is_test_mode BOOLEAN DEFAULT FALSE NOT NULL;
      `
    });

    if (alterError) {
      console.log('⚠️  La colonne existe peut-être déjà:', alterError.message);
    } else {
      console.log('✅ Colonne is_test_mode ajoutée');
    }

    // Créer l'index
    const { error: indexError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE INDEX IF NOT EXISTS idx_transactions_test_mode
        ON public.transactions(is_test_mode);
      `
    });

    if (indexError) {
      console.error('❌ Erreur création index:', indexError.message);
    } else {
      console.log('✅ Index créé');
    }

    console.log('\n✅ Migration terminée avec succès !');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

applyMigration();
