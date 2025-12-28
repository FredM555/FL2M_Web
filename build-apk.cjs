const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Couleurs pour la console
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  red: '\x1b[31m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function execCommand(command, description) {
  log(`\n${description}...`, 'blue');
  try {
    execSync(command, { stdio: 'inherit', shell: true });
    log(`✓ ${description} terminé`, 'green');
  } catch (error) {
    log(`✗ Erreur lors de: ${description}`, 'red');
    process.exit(1);
  }
}

function getVersion() {
  const envPath = path.join(__dirname, '.env.local');
  if (!fs.existsSync(envPath)) {
    log('✗ Fichier .env.local introuvable', 'red');
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const versionMatch = envContent.match(/VITE_APP_VERSION=(.+)/);

  if (!versionMatch) {
    log('✗ VITE_APP_VERSION introuvable dans .env.local', 'red');
    process.exit(1);
  }

  return versionMatch[1].trim();
}

function cleanPublicFolder() {
  log('\n🧹 Nettoyage du dossier public...', 'blue');

  // Supprimer backup images
  const backupDir = path.join(__dirname, 'public', 'images-backup');
  if (fs.existsSync(backupDir)) {
    fs.rmSync(backupDir, { recursive: true, force: true });
    log('  ✓ Images backup supprimées', 'green');
  }

  // Supprimer les anciens APK dans public/downloads
  const downloadsDir = path.join(__dirname, 'public', 'downloads');
  if (fs.existsSync(downloadsDir)) {
    const files = fs.readdirSync(downloadsDir);
    files.forEach(file => {
      if (file.endsWith('.apk')) {
        fs.unlinkSync(path.join(downloadsDir, file));
        log(`  ✓ ${file} supprimé`, 'green');
      }
    });
  } else {
    fs.mkdirSync(downloadsDir, { recursive: true });
    log('  ✓ Dossier downloads créé', 'green');
  }

  log('✓ Nettoyage du dossier public terminé', 'green');
}

function getApkSize(apkPath) {
  const stats = fs.statSync(apkPath);
  const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
  return sizeInMB;
}

async function main() {
  console.clear();
  log('═══════════════════════════════════════════════════════', 'bright');
  log('     🚀 COMPILATION APK ANDROID OPTIMISÉE', 'bright');
  log('═══════════════════════════════════════════════════════', 'bright');

  const version = getVersion();
  log(`\n📦 Version: ${version}`, 'yellow');

  // Étape 1: Nettoyer public
  cleanPublicFolder();

  // Étape 2: Nettoyer les builds
  log('\n🧹 Nettoyage des builds précédents...', 'blue');
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true, force: true });
  }
  const androidApkDir = path.join(__dirname, 'android', 'app', 'build', 'outputs', 'apk');
  if (fs.existsSync(androidApkDir)) {
    fs.rmSync(androidApkDir, { recursive: true, force: true });
  }
  log('✓ Builds nettoyés', 'green');

  // Étape 3: Compiler Vite
  execCommand('npm run build', 'Compilation Vite en production');

  // Étape 4: Synchroniser Capacitor
  execCommand('npx cap sync android', 'Synchronisation Capacitor Android');

  // Étape 5: Compiler APK Release
  execCommand('cd android && .\\gradlew assembleRelease', 'Compilation APK Release optimisée');

  // Étape 6: Copier l'APK
  log('\n📋 Copie de l\'APK...', 'blue');
  const sourceApk = path.join(__dirname, 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-universal-release-unsigned.apk');
  const targetApk = path.join(__dirname, 'public', 'downloads', `fl2m-app-v${version}.apk`);

  if (!fs.existsSync(sourceApk)) {
    log('✗ APK source introuvable!', 'red');
    process.exit(1);
  }

  fs.copyFileSync(sourceApk, targetApk);
  const apkSize = getApkSize(targetApk);
  log(`✓ APK copiée: fl2m-app-v${version}.apk (${apkSize} MB)`, 'green');

  // Résumé final
  log('\n═══════════════════════════════════════════════════════', 'bright');
  log('     ✅ COMPILATION TERMINÉE AVEC SUCCÈS!', 'green');
  log('═══════════════════════════════════════════════════════', 'bright');
  log(`\n📦 Fichier: public/downloads/fl2m-app-v${version}.apk`, 'yellow');
  log(`📊 Taille: ${apkSize} MB`, 'yellow');
  log(`\n💡 L'APK est prête à être distribuée!\n`, 'blue');
}

main().catch(error => {
  log(`\n✗ Erreur fatale: ${error.message}`, 'red');
  process.exit(1);
});
