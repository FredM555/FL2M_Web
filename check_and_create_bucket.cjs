// Script pour vérifier et créer le bucket avatars dans Supabase
const fs = require('fs');
const path = require('path');

// Charger les variables d'environnement
const envPath = path.join(__dirname, '.env');
let supabaseUrl, supabaseServiceKey;

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');

  for (const line of lines) {
    if (line.startsWith('VITE_SUPABASE_URL=')) {
      supabaseUrl = line.split('=')[1].trim();
    }
    if (line.startsWith('VITE_SUPABASE_SERVICE_ROLE_KEY=') || line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
      supabaseServiceKey = line.split('=')[1].trim();
    }
  }
}

console.log('\n🔍 Vérification du bucket Supabase Storage pour les avatars\n');
console.log('═'.repeat(80));

if (!supabaseUrl) {
  console.log('\n❌ Erreur : VITE_SUPABASE_URL non trouvé dans .env\n');
  displayManualInstructions();
  process.exit(0);
}

console.log(`\n✅ URL Supabase trouvée : ${supabaseUrl}\n`);

if (!supabaseServiceKey) {
  console.log('⚠️  Service Role Key non trouvée - création manuelle requise\n');
  displayManualInstructions();
  process.exit(0);
}

console.log('✅ Service Role Key trouvée\n');
console.log('🔄 Tentative de création automatique du bucket...\n');

createBucket();

async function createBucket() {
  try {
    // Créer le bucket via l'API REST
    const bucketResponse = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey
      },
      body: JSON.stringify({
        id: 'avatars',
        name: 'avatars',
        public: true,
        file_size_limit: 5242880, // 5 MB
        allowed_mime_types: ['image/jpeg', 'image/png', 'image/webp']
      })
    });

    if (bucketResponse.ok) {
      console.log('✅ Bucket "avatars" créé avec succès !\n');
      console.log('📝 Configuration du bucket :');
      console.log('   ├─ Nom : avatars');
      console.log('   ├─ Public : Oui');
      console.log('   ├─ Taille max : 5 MB');
      console.log('   └─ Types : image/jpeg, image/png, image/webp\n');

      console.log('🔒 Étape suivante : Configurer les politiques RLS\n');
      displayPolicyInstructions();
    } else {
      const error = await bucketResponse.json();
      if (error.message && error.message.includes('already exists')) {
        console.log('ℹ️  Le bucket "avatars" existe déjà\n');
        console.log('🔒 Vérifiez que les politiques RLS sont configurées :\n');
        displayPolicyInstructions();
      } else {
        console.log(`❌ Erreur lors de la création : ${error.message || 'Erreur inconnue'}\n`);
        displayManualInstructions();
      }
    }
  } catch (error) {
    console.log(`❌ Erreur : ${error.message}\n`);
    displayManualInstructions();
  }
}

function displayManualInstructions() {
  console.log('═'.repeat(80));
  console.log('\n📖 INSTRUCTIONS MANUELLES - Création du bucket\n');
  console.log('1️⃣  Allez sur : https://app.supabase.com\n');
  console.log('2️⃣  Sélectionnez votre projet FLM Services\n');
  console.log('3️⃣  Dans le menu de gauche, cliquez sur "Storage"\n');
  console.log('4️⃣  Cliquez sur le bouton "New bucket" ou "Create bucket"\n');
  console.log('5️⃣  Remplissez le formulaire :');
  console.log('     ┌─────────────────────────────────────┐');
  console.log('     │ Name: avatars                       │');
  console.log('     │ Public bucket: ✅ COCHÉ             │');
  console.log('     │ File size limit: 5242880 (5 MB)    │');
  console.log('     │ Allowed MIME types:                 │');
  console.log('     │   - image/jpeg                      │');
  console.log('     │   - image/png                       │');
  console.log('     │   - image/webp                      │');
  console.log('     └─────────────────────────────────────┘\n');
  console.log('6️⃣  Cliquez sur "Create bucket"\n');
  console.log('═'.repeat(80));
  console.log('\n⚠️  TRÈS IMPORTANT : Le bucket DOIT être PUBLIC !\n');
  console.log('   Sans cela, les photos de profil ne seront pas visibles.\n');
}

function displayPolicyInstructions() {
  console.log('═'.repeat(80));
  console.log('\n🔒 CONFIGURATION DES POLITIQUES RLS\n');
  console.log('Dans Supabase Dashboard > Storage > avatars > Policies :\n');

  console.log('📝 Policy 1 : Upload (INSERT)');
  console.log('   ┌─────────────────────────────────────────────────────┐');
  console.log('   │ Name: Users can upload their own avatar             │');
  console.log('   │ Allowed operation: INSERT                           │');
  console.log('   │ Policy:                                             │');
  console.log('   │ (bucket_id = \'avatars\'::text) AND                  │');
  console.log('   │ (auth.uid()::text = (storage.foldername(name))[1])  │');
  console.log('   └─────────────────────────────────────────────────────┘\n');

  console.log('📝 Policy 2 : Update');
  console.log('   ┌─────────────────────────────────────────────────────┐');
  console.log('   │ Name: Users can update their own avatar             │');
  console.log('   │ Allowed operation: UPDATE                           │');
  console.log('   │ Policy: (même que Policy 1)                         │');
  console.log('   └─────────────────────────────────────────────────────┘\n');

  console.log('📝 Policy 3 : Delete');
  console.log('   ┌─────────────────────────────────────────────────────┐');
  console.log('   │ Name: Users can delete their own avatar             │');
  console.log('   │ Allowed operation: DELETE                           │');
  console.log('   │ Policy: (même que Policy 1)                         │');
  console.log('   └─────────────────────────────────────────────────────┘\n');

  console.log('📝 Policy 4 : Public Read (SELECT)');
  console.log('   ┌─────────────────────────────────────────────────────┐');
  console.log('   │ Name: Anyone can view avatars                       │');
  console.log('   │ Allowed operation: SELECT                           │');
  console.log('   │ Policy: bucket_id = \'avatars\'::text                │');
  console.log('   └─────────────────────────────────────────────────────┘\n');

  console.log('═'.repeat(80));
  console.log('\n✅ Une fois les politiques créées, l\'upload fonctionnera !\n');
}

// Si pas de fetch natif (vieilles versions de Node)
if (typeof fetch === 'undefined') {
  console.log('\n⚠️  Node.js version trop ancienne - création manuelle requise\n');
  displayManualInstructions();
  process.exit(0);
}
