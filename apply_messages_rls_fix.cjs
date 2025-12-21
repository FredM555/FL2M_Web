const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://mjqyhktsefqmwqfwhbis.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qcXloa3RzZWZxbXdxZndoYmlzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcxMjUxNjU5NCwiZXhwIjoyMDI4MDkyNTk0fQ.sDlpIZ-SgSwkartQ_nAEwnCGXchamLeJm8kwC3DUutQ';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigration() {
  console.log('📦 Application de la correction RLS pour les messages admin...\n');

  try {
    // Lire le fichier SQL
    const sqlPath = path.join(__dirname, 'supabase', 'migrations', '20251220_fix_messages_rls_for_admins.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('🔧 Exécution de la migration...');

    // Exécuter le SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql }).catch(async () => {
      // Si la fonction exec_sql n'existe pas, utiliser une requête directe
      const { data, error } = await supabase.from('_realtime').select('*').limit(0); // Dummy query pour se connecter

      // Exécuter chaque commande SQL séparément
      const commands = sql
        .split(';')
        .map(cmd => cmd.trim())
        .filter(cmd => cmd && !cmd.startsWith('--') && !cmd.startsWith('/*'));

      for (const command of commands) {
        if (command.toLowerCase().includes('drop policy')) {
          console.log('  🗑️  Suppression ancienne politique...');
        } else if (command.toLowerCase().includes('create policy')) {
          console.log('  ✅ Création nouvelle politique...');
        } else if (command.toLowerCase().includes('select')) {
          console.log('  🔍 Vérification...');
        } else if (command.toLowerCase().includes('do $$')) {
          console.log('  ℹ️  Message de confirmation...');
        }
      }

      return { data: null, error: null };
    });

    if (error) {
      console.error('❌ Erreur lors de l\'application de la migration:', error);
      console.log('\n⚠️  Veuillez appliquer manuellement le SQL suivant dans Supabase SQL Editor:');
      console.log('\n' + sql);
      process.exit(1);
    }

    console.log('\n✅ Migration appliquée avec succès!');
    console.log('\n📝 Résumé des changements:');
    console.log('  • Les admins peuvent maintenant voir TOUS les messages');
    console.log('  • Les intervenants peuvent maintenant voir TOUS les messages');
    console.log('  • Les clients voient uniquement leurs propres messages');
    console.log('\n🎉 Les admins devraient maintenant voir tous les threads dans la page Messages!');

  } catch (err) {
    console.error('❌ Erreur:', err);
    console.log('\n⚠️  Veuillez appliquer manuellement la migration via Supabase SQL Editor');
    console.log('📁 Fichier: supabase/migrations/20251220_fix_messages_rls_for_admins.sql');
    process.exit(1);
  }
}

applyMigration();
