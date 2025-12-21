// Script pour créer la fonction de suppression de rendez-vous
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement manquantes');
  console.error('Assurez-vous que VITE_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont définis dans .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  try {
    console.log('📦 Lecture du fichier SQL...');

    const sqlPath = path.join(__dirname, 'supabase', 'migrations', '20251219_create_delete_appointment_function.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('🚀 Application de la migration...');

    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql }).catch(async () => {
      // Si la fonction exec_sql n'existe pas, essayer directement
      console.log('ℹ️  Tentative d\'exécution directe...');
      return await supabase.from('_migrations').select('*').limit(0); // Juste pour tester la connexion
    });

    // Exécution manuelle via des requêtes séparées
    console.log('📝 Création de la fonction delete_appointment_by_practitioner...');

    const createFunctionSQL = `
CREATE OR REPLACE FUNCTION delete_appointment_by_practitioner(
  appointment_id UUID,
  practitioner_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM appointments
  WHERE id = appointment_id
    AND appointments.practitioner_id = delete_appointment_by_practitioner.practitioner_id;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_appointment_by_practitioner TO authenticated;
    `;

    // Utiliser l'API Supabase Management pour exécuter du SQL
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`
      },
      body: JSON.stringify({ query: createFunctionSQL })
    });

    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }

    console.log('✅ Migration appliquée avec succès !');
    console.log('✅ La fonction delete_appointment_by_practitioner est maintenant disponible');

  } catch (error) {
    console.error('❌ Erreur lors de l\'application de la migration:', error);
    console.error('\n💡 Solution alternative:');
    console.error('1. Ouvrez le Dashboard Supabase');
    console.error('2. Allez dans SQL Editor');
    console.error('3. Copiez-collez le contenu de supabase/migrations/20251219_create_delete_appointment_function.sql');
    console.error('4. Exécutez le SQL');
    process.exit(1);
  }
}

applyMigration();
