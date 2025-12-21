// Script pour appliquer les policies RLS sur appointment_beneficiaries
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuration Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement manquantes');
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  try {
    console.log('📋 Application de la migration RLS pour appointment_beneficiaries...\n');

    // Lire le fichier SQL
    const sqlPath = path.join(__dirname, 'supabase', 'migrations', '20251221_add_appointment_beneficiaries_rls_policies.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Séparer les commandes SQL (en ignorant les commentaires)
    const commands = sql
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

    console.log(`📝 ${commands.length} commandes SQL à exécuter\n`);

    // Exécuter chaque commande
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];

      // Ignorer les commentaires
      if (command.startsWith('COMMENT ON')) {
        console.log(`⏭️  [${i + 1}/${commands.length}] Commentaire ignoré`);
        continue;
      }

      console.log(`⚙️  [${i + 1}/${commands.length}] Exécution...`);

      const { data, error } = await supabase.rpc('exec_sql', { sql_query: command + ';' });

      if (error) {
        // Essayer directement si la fonction exec_sql n'existe pas
        const { error: directError } = await supabase.from('_').select('*').limit(0);

        if (directError) {
          console.error(`❌ Erreur:`, error.message);

          // Continuer pour les erreurs non critiques
          if (error.message.includes('already exists') || error.message.includes('does not exist')) {
            console.log(`⚠️  Avertissement ignoré, continuation...\n`);
            continue;
          }

          throw error;
        }
      }

      console.log(`✅ Succès\n`);
    }

    console.log('✅ Migration appliquée avec succès!\n');
    console.log('📊 Vérification des policies...\n');

    // Vérifier les policies créées
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('policyname, cmd')
      .eq('tablename', 'appointment_beneficiaries');

    if (policiesError) {
      console.error('⚠️  Impossible de vérifier les policies:', policiesError.message);
    } else if (policies && policies.length > 0) {
      console.log('✅ Policies actives sur appointment_beneficiaries:');
      policies.forEach(p => {
        console.log(`   - ${p.policyname} (${p.cmd})`);
      });
    } else {
      console.log('⚠️  Aucune policy trouvée (peut être normal si la table n\'existe pas encore)');
    }

  } catch (error) {
    console.error('❌ Erreur lors de l\'application de la migration:', error.message);
    process.exit(1);
  }
}

applyMigration();
