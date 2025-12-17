#!/usr/bin/env node
/**
 * Script pour corriger les imports du logger mal placés
 * Corrige les cas où l'import a été inséré au milieu d'un import multi-lignes
 */

const fs = require('fs');
const path = require('path');

const filesToFix = [
  'src/pages/SignupPage.tsx',
  'src/pages/Sportifs/ModuleSolo.tsx',
  'src/pages/Sportifs/ModuleTeam.tsx',
  'src/services/beneficiaries.ts',
  'src/services/commission-calculator.ts',
  'src/services/contracts.ts'
];

function fixFile(filePath) {
  const fullPath = path.join(process.cwd(), filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  Fichier non trouvé: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');

  // Pattern pour détecter un import du logger mal placé dans un import multi-lignes
  // Exemple :
  // import {
  // import { logger } from '../utils/logger';
  //   SomeType,
  const badPattern = /^(import\s+{)\s*\nimport\s+{\s*logger\s*}\s+from\s+['"][^'"]+['"];\s*\n/m;

  if (badPattern.test(content)) {
    // Extraire l'import du logger
    const loggerImportMatch = content.match(/import\s+{\s*logger\s*}\s+from\s+['"]([^'"]+)['"];/);
    if (!loggerImportMatch) {
      console.log(`⚠️  Impossible de trouver l'import logger dans: ${filePath}`);
      return;
    }

    const loggerImportLine = loggerImportMatch[0];

    // Retirer l'import du logger de son emplacement actuel
    content = content.replace(/import\s+{\s*logger\s*}\s+from\s+['"][^'"]+['"];\s*\n/, '');

    // Trouver le dernier import avant le premier import multi-lignes
    const lines = content.split('\n');
    let lastSingleImportIndex = -1;
    let inMultiLineImport = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith('import ')) {
        if (line.includes(' from ') && (line.endsWith(';') || line.endsWith(';'))) {
          // Import sur une seule ligne
          if (!inMultiLineImport) {
            lastSingleImportIndex = i;
          }
        } else if (line.includes('{') && !line.includes('}')) {
          // Début d'un import multi-lignes
          inMultiLineImport = true;
        }
      } else if (line.includes('}') && line.includes(';')) {
        // Fin d'un import multi-lignes
        inMultiLineImport = false;
      } else if (line !== '' && !line.startsWith('//') && !inMultiLineImport) {
        // Première ligne qui n'est pas un import ou commentaire
        break;
      }
    }

    // Insérer l'import du logger après le dernier import sur une ligne
    if (lastSingleImportIndex >= 0) {
      lines.splice(lastSingleImportIndex + 1, 0, loggerImportLine);
    } else {
      // Si aucun import sur une ligne n'a été trouvé, ajouter au début
      lines.unshift(loggerImportLine);
    }

    content = lines.join('\n');

    // Écrire le fichier corrigé
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✅ Corrigé: ${filePath}`);
  } else {
    console.log(`ℹ️  Pas de problème détecté dans: ${filePath}`);
  }
}

console.log('🔧 Correction des imports du logger...\n');

for (const file of filesToFix) {
  try {
    fixFile(file);
  } catch (error) {
    console.error(`❌ Erreur lors du traitement de ${file}:`, error.message);
  }
}

console.log('\n✅ Correction terminée!');
