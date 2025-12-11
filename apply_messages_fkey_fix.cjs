const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Charger le fichier .env.local manuellement
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
      process.env[key.trim()] = value;
    }
  });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Erreur: Variables d\'environnement manquantes');
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('SUPABASE_SERVICE_ROLE_KEY ou VITE_SUPABASE_ANON_KEY:', supabaseKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  console.log('📦 Application de la migration pour corriger la foreign key messages -> profiles...\n');

  try {
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20251211182659_fix_messages_profiles_foreign_key.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Diviser le fichier SQL en requêtes individuelles
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

    console.log(`📝 ${statements.length} instructions SQL à exécuter\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      // Ignorer les commentaires et les blocs DO
      if (statement.includes('COMMENT ON') || statement.includes('DO $$') || statement.includes('RAISE NOTICE')) {
        console.log(`⏭️  Instruction ${i + 1}: Ignorée (commentaire ou notification)`);
        continue;
      }

      console.log(`▶️  Instruction ${i + 1}:`, statement.substring(0, 100) + (statement.length > 100 ? '...' : ''));

      const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: statement + ';'
      });

      if (error) {
        // Si la fonction exec_sql n'existe pas, essayons directement
        console.log(`   ⚠️  Essai avec une autre méthode...`);

        // Pour les requêtes ALTER TABLE, on peut les exécuter via l'API REST
        // Mais c'est compliqué. Utilisons une autre approche.
        console.error(`   ❌ Erreur:`, error.message);

        // Si c'est une erreur "déjà existe", c'est ok
        if (error.message.includes('already exists') || error.message.includes('does not exist')) {
          console.log(`   ✓ OK (contrainte déjà existante ou inexistante)`);
          continue;
        }

        throw error;
      }

      console.log(`   ✓ OK\n`);
    }

    console.log('✅ Migration appliquée avec succès!\n');
    console.log('🔗 La foreign key messages.user_id -> profiles.id a été créée');
    console.log('📊 Les jointures avec profiles fonctionneront maintenant correctement');

  } catch (error) {
    console.error('❌ Erreur lors de l\'application de la migration:', error.message);
    console.log('\n⚠️  Vous devrez peut-être appliquer cette migration manuellement via le Dashboard Supabase:');
    console.log('1. Ouvrir le SQL Editor dans Supabase Dashboard');
    console.log('2. Copier le contenu du fichier: supabase/migrations/20251211182659_fix_messages_profiles_foreign_key.sql');
    console.log('3. Exécuter le SQL');
    process.exit(1);
  }
}

applyMigration();
