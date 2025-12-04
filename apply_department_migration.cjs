// Script pour appliquer la migration du champ département
// Ce script ajoute la colonne department à la table profiles

const fs = require('fs');
const path = require('path');

// Charger les variables depuis .env manuellement
const envPath = path.join(__dirname, '.env');
let supabaseUrl, supabaseKey;

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');

  for (const line of lines) {
    if (line.startsWith('VITE_SUPABASE_URL=')) {
      supabaseUrl = line.split('=')[1].trim();
    }
    if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) {
      supabaseKey = line.split('=')[1].trim();
    }
  }
}

function applyMigration() {
  console.log('🔄 Migration : Ajout du champ département aux profils utilisateurs\n');

  try {
    // Lire le fichier SQL
    const sqlPath = path.join(__dirname, 'add_department_to_profiles.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    console.log('📄 Contenu de la migration:');
    console.log('═'.repeat(80));
    console.log(sqlContent);
    console.log('═'.repeat(80));
    console.log('');

    console.log('📝 Instructions pour appliquer la migration:\n');
    console.log('   1. Allez sur https://app.supabase.com');
    console.log('   2. Sélectionnez votre projet FLM Services');
    console.log('   3. Dans le menu latéral, cliquez sur "SQL Editor"');
    console.log('   4. Créez une nouvelle requête');
    console.log('   5. Copiez-collez le SQL ci-dessus');
    console.log('   6. Cliquez sur "Run" pour exécuter la migration\n');

    console.log('✅ Ce que cette migration ajoute:\n');
    console.log('   • Colonne "department" (VARCHAR(3)) dans la table profiles');
    console.log('   • Index sur la colonne pour améliorer les performances');
    console.log('   • Commentaire descriptif sur la colonne\n');

    console.log('💡 Après avoir appliqué la migration:\n');
    console.log('   • Le champ "Département" apparaîtra dans le formulaire de profil utilisateur');
    console.log('   • Les utilisateurs pourront renseigner leur code département (ex: 75, 59, 2A)');
    console.log('   • Les intervenants pourront utiliser cette information pour mieux cibler leur audience');
    console.log('   • Le champ est optionnel, aucun utilisateur existant ne sera affecté\n');

    if (supabaseUrl) {
      console.log(`🔗 URL de votre projet: ${supabaseUrl.replace('//', '//')}\n`);
    }

    console.log('📚 Pour plus d\'informations, consultez README_MIGRATION_DEPARTMENT.md\n');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

applyMigration();
