const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

// Trouve tous les fichiers TypeScript/React
const files = glob.sync('src/**/*.{ts,tsx}', {
  ignore: ['**/node_modules/**']
});

let fixedCount = 0;
let errorCount = 0;

files.forEach(file => {
  try {
    let content = fs.readFileSync(file, 'utf8');

    // Vérifier si le fichier utilise logger
    if (!content.includes('logger.')) {
      return; // Pas de logger utilisé dans ce fichier
    }

    // Supprimer TOUS les imports de logger (peu importe où ils sont)
    const lines = content.split('\n');
    const cleanedLines = lines.filter(line => {
      const trimmed = line.trim();
      // Supprimer les lignes qui sont des imports de logger
      if (trimmed.match(/^import\s*{\s*logger\s*}\s*from\s*['"].*logger['"]\s*;?\s*$/)) {
        return false;
      }
      return true;
    });

    // Calculer le bon chemin relatif
    const relativePath = getRelativeLoggerPath(file);

    // Trouver où insérer l'import (après le dernier import)
    let lastImportIndex = -1;
    for (let i = 0; i < cleanedLines.length && i < 150; i++) {
      const trimmed = cleanedLines[i].trim();
      if (trimmed.startsWith('import ') && !trimmed.includes('logger')) {
        lastImportIndex = i;
      }
    }

    if (lastImportIndex === -1) {
      // Pas d'imports trouvés, chercher après les commentaires du début
      for (let i = 0; i < Math.min(cleanedLines.length, 20); i++) {
        const trimmed = cleanedLines[i].trim();
        if (trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('/*') && !trimmed.startsWith('*')) {
          lastImportIndex = i - 1;
          break;
        }
      }
    }

    if (lastImportIndex >= 0) {
      cleanedLines.splice(lastImportIndex + 1, 0, `import { logger } from '${relativePath}';`);

      const newContent = cleanedLines.join('\n');
      fs.writeFileSync(file, newContent, 'utf8');
      fixedCount++;
      console.log(`✓ Fixed ${file} (path: ${relativePath})`);
    } else {
      console.log(`⚠ Could not find import location in ${file}`);
    }

  } catch (err) {
    console.error(`✗ Error processing ${file}:`, err.message);
    errorCount++;
  }
});

function getRelativeLoggerPath(filePath) {
  const normalized = filePath.replace(/\\/g, '/');

  // Services
  if (normalized.includes('src/services/')) {
    return '../utils/logger';
  }

  // Context
  if (normalized.includes('src/context/')) {
    return '../utils/logger';
  }

  // Pages - subdirectories (Admin, Practitioner, Particuliers, Professionnels, Sportifs)
  if (normalized.match(/src\/pages\/[^/]+\//)) {
    return '../../utils/logger';
  }

  // Pages - root level
  if (normalized.includes('src/pages/')) {
    return '../utils/logger';
  }

  // Components - subdirectories
  if (normalized.match(/src\/components\/[^/]+\//)) {
    return '../../utils/logger';
  }

  // Components - root level
  if (normalized.includes('src/components/')) {
    return '../utils/logger';
  }

  // Root src files
  return './utils/logger';
}

console.log(`\nDone! Fixed ${fixedCount} files, ${errorCount} errors.`);
