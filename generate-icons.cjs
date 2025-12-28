const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sourceIcon = path.join(__dirname, 'public', 'logo-flm2.png');
const androidResDir = path.join(__dirname, 'android', 'app', 'src', 'main', 'res');

// Tailles d'icônes Android
const sizes = [
  { folder: 'mipmap-mdpi', size: 48 },
  { folder: 'mipmap-hdpi', size: 72 },
  { folder: 'mipmap-xhdpi', size: 96 },
  { folder: 'mipmap-xxhdpi', size: 144 },
  { folder: 'mipmap-xxxhdpi', size: 192 }
];

async function generateIcons() {
  console.log('🎨 Génération des icônes Android à partir de logo-flm2.png...\n');

  if (!fs.existsSync(sourceIcon)) {
    console.error('❌ Erreur: logo-flm2.png introuvable dans public/');
    process.exit(1);
  }

  for (const { folder, size } of sizes) {
    const mipmapDir = path.join(androidResDir, folder);

    // Créer le dossier si nécessaire
    if (!fs.existsSync(mipmapDir)) {
      fs.mkdirSync(mipmapDir, { recursive: true });
    }

    // Générer ic_launcher.png
    const launcherPath = path.join(mipmapDir, 'ic_launcher.png');
    await sharp(sourceIcon)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toFile(launcherPath);

    // Générer ic_launcher_round.png (même chose mais on peut ajouter un masque rond si besoin)
    const launcherRoundPath = path.join(mipmapDir, 'ic_launcher_round.png');
    await sharp(sourceIcon)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toFile(launcherRoundPath);

    console.log(`✓ ${folder}: ${size}x${size} générées`);
  }

  console.log('\n✅ Toutes les icônes Android ont été générées avec succès!');
  console.log('📁 Emplacement: android/app/src/main/res/mipmap-*/');
}

generateIcons().catch(error => {
  console.error('❌ Erreur:', error.message);
  process.exit(1);
});
