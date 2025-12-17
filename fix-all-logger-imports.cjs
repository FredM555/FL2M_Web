#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Fonction pour corriger un fichier
function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;

    // Pattern: import {\nimport { logger } from ...
    const badPattern = /^(import\s+(?:type\s+)?{)\s*\n\s*import\s+{\s*logger\s*}\s+from\s+['"]([^'"]+)['"];\s*\n/gm;

    if (badPattern.test(content)) {
      // Extraire le chemin de l'import du logger
      const match = content.match(/import\s+{\s*logger\s*}\s+from\s+['"]([^'"]+)['"];/);
      if (!match) {
        console.log(`⚠️  Impossible d'extraire l'import logger de: ${filePath}`);
        return false;
      }

      const loggerImportPath = match[1];
      const loggerImportLine = `import { logger } from '${loggerImportPath}';`;

      // Supprimer tous les imports du logger mal placés
      content = content.replace(/import\s+{\s*logger\s*}\s+from\s+['"][^'"]+['"];\s*\n/g, '');

      // Trouver le bon endroit pour insérer l'import du logger
      const lines = content.split('\n');
      let insertIndex = -1;

      // Trouver la première ligne d'import
      for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim();
        if (trimmed.startsWith('import ') && !trimmed.startsWith('import {')) {
          insertIndex = i + 1;
        } else if (trimmed.startsWith('import {') || trimmed.startsWith('import type {')) {
          // On est dans un import multi-lignes, trouver la fin
          let j = i;
          while (j < lines.length && !lines[j].includes('};') && !lines[j].includes("};")) {
            j++;
          }
          if (j < lines.length) {
            insertIndex = j + 1;
            i = j;
          }
        }
      }

      // Si on n'a pas trouvé d'import, insérer après les commentaires du début
      if (insertIndex === -1) {
        for (let i = 0; i < lines.length; i++) {
          const trimmed = lines[i].trim();
          if (trimmed !== '' && !trimmed.startsWith('//') && !trimmed.startsWith('/*') && !trimmed.startsWith('*')) {
            insertIndex = i;
            break;
          }
        }
      }

      // Insérer l'import du logger
      if (insertIndex >= 0) {
        lines.splice(insertIndex, 0, loggerImportLine);
      } else {
        lines.unshift(loggerImportLine);
      }

      content = lines.join('\n');

      // Vérifier si le contenu a changé
      if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Corrigé: ${filePath}`);
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error(`❌ Erreur lors du traitement de ${filePath}:`, error.message);
    return false;
  }
}

// Fonction pour trouver tous les fichiers TypeScript/TSX
function findAllTsFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (!['node_modules', 'dist', 'build', '.git'].includes(file)) {
        findAllTsFiles(filePath, fileList);
      }
    } else if (file.match(/\.(ts|tsx)$/)) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

console.log('🔧 Recherche et correction des imports du logger...\n');

const srcDir = path.join(process.cwd(), 'src');
const allFiles = findAllTsFiles(srcDir);

let fixedCount = 0;

for (const file of allFiles) {
  if (fixFile(file)) {
    fixedCount++;
  }
}

console.log(`\n✅ Correction terminée! ${fixedCount} fichiers corrigés.`);
