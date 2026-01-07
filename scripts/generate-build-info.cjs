#!/usr/bin/env node
/**
 * Génère un fichier build-info.json avec les informations de build
 * - Commit hash (court)
 * - Date et heure du build
 * - Branch Git
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
  // Récupérer le hash du commit (court)
  const commitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();

  // Récupérer la branche courante
  const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();

  // Récupérer la date du dernier commit
  const commitDate = execSync('git log -1 --format=%cd --date=iso', { encoding: 'utf-8' }).trim();

  // Date et heure actuelle du build
  const buildDate = new Date().toISOString();

  // Créer l'objet d'informations de build
  const buildInfo = {
    commitHash,
    branch,
    commitDate,
    buildDate,
    version: process.env.npm_package_version || '1.0.0'
  };

  // Écrire dans public/build-info.json
  const outputPath = path.join(__dirname, '..', 'public', 'build-info.json');
  fs.writeFileSync(outputPath, JSON.stringify(buildInfo, null, 2));

  console.log('✅ Build info generated successfully:');
  console.log(`   Commit: ${commitHash} (${branch})`);
  console.log(`   Build date: ${buildDate}`);
  console.log(`   Output: ${outputPath}`);
} catch (error) {
  console.error('❌ Error generating build info:', error.message);

  // En cas d'erreur (ex: pas de git), créer un fichier par défaut
  const fallbackInfo = {
    commitHash: 'unknown',
    branch: 'unknown',
    commitDate: new Date().toISOString(),
    buildDate: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  };

  const outputPath = path.join(__dirname, '..', 'public', 'build-info.json');
  fs.writeFileSync(outputPath, JSON.stringify(fallbackInfo, null, 2));
  console.log('⚠️  Fallback build info created');
}
