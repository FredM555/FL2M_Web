#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;

    // Vérifier si le fichier contient des utilisations de logger
    if (!content.includes('logger.')) {
      return false;
    }

    // Supprimer TOUS les imports du logger (bien placés ou mal placés)
    content = content.replace(/^import { logger } from ['"][^'"]+logger['"];?\s*$/gm, '');

    // Trouver le bon endroit pour l'import
    const lines = content.split('\n');
    let insertIndex = -1;
    let lastImportIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith('import ') || line.startsWith('import{')) {
        // Si c'est un import multi-lignes, trouver la fin
        if ((line.includes('{') && !line.includes('}')) || line === 'import {' || line=== 'import{') {
          let j = i;
          while (j < lines.length && !lines[j].includes('};') && !lines[j].includes('}from')) {
            j++;
          }
          if (j < lines.length) {
            lastImportIndex = j;
            i = j;
          }
        } else {
          lastImportIndex = i;
        }
      } else if (line !== '' && !line.startsWith('//') && !line.startsWith('/*') && !line.startsWith('*') && lastImportIndex >= 0) {
        // Première ligne non-vide après les imports
        insertIndex = lastImportIndex + 1;
        break;
      }
    }

    // Déterminer le chemin relatif correct pour l'import
    let loggerImportPath;
    if (filePath.includes('src/pages/')) {
      loggerImportPath = '../utils/logger';
    } else if (filePath.includes('src/components/')) {
      loggerImportPath = '../../utils/logger';
    } else if (filePath.includes('src/services/')) {
      loggerImportPath = '../utils/logger';
    } else {
      loggerImportPath = '../utils/logger';
    }

    // Insérer l'import du logger
    if (insertIndex > 0) {
      lines.splice(insertIndex, 0, `import { logger } from '${loggerImportPath}';`);
    } else if (lastImportIndex >= 0) {
      lines.splice(lastImportIndex + 1, 0, `import { logger } from '${loggerImportPath}';`);
    } else {
      // Ajouter au début du fichier
      lines.unshift(`import { logger } from '${loggerImportPath}';`);
    }

    const newContent = lines.join('\n');

    // Sauvegarder seulement si modifié
    if (newContent !== originalContent && newContent !== content) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`✅ Corrigé: ${filePath}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`❌ Erreur sur ${filePath}:`, error.message);
    return false;
  }
}

function findTsFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (!['node_modules', 'dist', 'build', '.git'].includes(file)) {
        findTsFiles(filePath, fileList);
      }
    } else if (file.match(/\.(ts|tsx)$/) && !file.includes('.d.ts')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

console.log('🔧 Correction finale de tous les imports du logger...\n');

const srcDir = path.join(process.cwd(), 'src');
const allFiles = findTsFiles(srcDir);

let fixedCount = 0;
for (const file of allFiles) {
  if (fixFile(file)) {
    fixedCount++;
  }
}

console.log(`\n✅ Correction terminée! ${fixedCount} fichiers corrigés.`);
