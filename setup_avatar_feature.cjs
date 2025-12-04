// Script d'assistance pour configurer la fonctionnalité de photo de profil
const fs = require('fs');
const path = require('path');

function displayInstructions() {
  console.log('\n🎨 Configuration : Fonctionnalité de Photo de Profil (Avatar)\n');
  console.log('═'.repeat(80));
  console.log('\n📋 ÉTAPE 1 : Migration SQL\n');

  // Lire et afficher le SQL
  const sqlPath = path.join(__dirname, 'add_avatar_to_profiles.sql');
  const sqlContent = fs.readFileSync(sqlPath, 'utf8');

  console.log('Copiez et exécutez ce SQL dans l\'éditeur Supabase :\n');
  console.log('─'.repeat(80));
  console.log(sqlContent);
  console.log('─'.repeat(80));

  console.log('\n📦 ÉTAPE 2 : Créer le bucket Storage\n');
  console.log('1. Allez sur https://app.supabase.com');
  console.log('2. Sélectionnez votre projet FLM Services');
  console.log('3. Dans le menu latéral, cliquez sur "Storage"');
  console.log('4. Cliquez sur "Create bucket"');
  console.log('5. Configuration :');
  console.log('   ├─ Nom : avatars');
  console.log('   ├─ Public : ✅ OUI');
  console.log('   ├─ File size limit : 5 MB');
  console.log('   └─ Allowed MIME types : image/jpeg, image/png, image/webp\n');

  console.log('🔒 ÉTAPE 3 : Configurer les politiques RLS (Storage)\n');
  console.log('Dans Storage > avatars > Policies, créez 4 politiques :\n');

  console.log('📝 Policy 1 - Upload (INSERT)');
  console.log('   Nom : Users can upload their own avatar');
  console.log('   Policy :');
  console.log('   (bucket_id = \'avatars\'::text) AND');
  console.log('   (auth.uid()::text = (storage.foldername(name))[1])\n');

  console.log('📝 Policy 2 - Update');
  console.log('   Nom : Users can update their own avatar');
  console.log('   Policy : (même que Policy 1)\n');

  console.log('📝 Policy 3 - Delete');
  console.log('   Nom : Users can delete their own avatar');
  console.log('   Policy : (même que Policy 1)\n');

  console.log('📝 Policy 4 - Public Read (SELECT)');
  console.log('   Nom : Anyone can view avatars');
  console.log('   Policy : bucket_id = \'avatars\'::text\n');

  console.log('✨ ÉTAPE 4 : Vérifier l\'installation\n');
  console.log('Une fois les étapes 1-3 complétées :');
  console.log('1. Lancez l\'application : npm run dev');
  console.log('2. Connectez-vous à votre compte');
  console.log('3. Allez sur "Mon profil"');
  console.log('4. Cliquez sur l\'icône caméra 📷 sur votre avatar');
  console.log('5. Uploadez une photo de test');
  console.log('6. Vérifiez qu\'elle s\'affiche correctement\n');

  console.log('📚 INFORMATIONS COMPLÉMENTAIRES\n');
  console.log('├─ Formats acceptés : JPG, PNG, WebP');
  console.log('├─ Taille maximale : 5 MB');
  console.log('├─ Structure Storage : avatars/{user_id}/{timestamp}.{ext}');
  console.log('└─ Documentation complète : README_AVATAR_PROFILE.md\n');

  console.log('⚠️  IMPORTANT\n');
  console.log('• Le bucket doit être PUBLIC pour que les photos soient visibles');
  console.log('• Les politiques RLS protègent l\'upload/suppression (seul le propriétaire)');
  console.log('• Les photos anciennes sont automatiquement supprimées lors du remplacement');
  console.log('• Compatible avec l\'ancien système (fallback Frédéric)\n');

  console.log('🎯 AVANTAGES\n');
  console.log('✓ Photo partagée entre profil utilisateur et présentation intervenant');
  console.log('✓ Upload facile avec drag & drop');
  console.log('✓ Validation automatique (format, taille)');
  console.log('✓ Interface intuitive avec aperçu en temps réel');
  console.log('✓ Sécurité : chaque utilisateur gère sa propre photo\n');

  console.log('═'.repeat(80));
  console.log('\n✅ Prêt à installer ? Suivez les étapes ci-dessus dans l\'ordre !\n');
}

displayInstructions();
