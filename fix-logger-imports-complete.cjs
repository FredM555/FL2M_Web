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
    const lines = content.split('\n');

    // Chercher les imports de logger
    let loggerImportLines = [];
    let hasLoggerImportInTop = false;

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('import') && trimmed.includes('logger')) {
        if (index < 50) {
          hasLoggerImportInTop = true;
        } else {
          loggerImportLines.push(index);
        }
      }
    });

    // Si on trouve des imports mal placés
    if (loggerImportLines.length > 0) {
      console.log(`Fixing ${file}...`);

      // Supprimer les imports mal placés
      const newLines = lines.filter((line, index) => {
        const trimmed = line.trim();
        if (loggerImportLines.includes(index)) {
          if (trimmed.startsWith('import') && trimmed.includes('logger')) {
            return false; // Supprimer cette ligne
          }
        }
        return true;
      });

      // Ajouter l'import en haut si pas déjà présent
      if (!hasLoggerImportInTop) {
        // Trouver la fin des imports
        let lastImportIndex = -1;
        for (let i = 0; i < Math.min(newLines.length, 100); i++) {
          const trimmed = newLines[i].trim();
          if (trimmed.startsWith('import ')) {
            lastImportIndex = i;
          }
        }

        if (lastImportIndex !== -1) {
          // Déterminer le chemin relatif vers logger
          const depth = file.split(path.sep).length - 2; // -2 pour enlever 'src' et le fichier lui-même
          let relativePath = '';

          if (file.includes('pages/Admin/') || file.includes('pages/Practitioner/') ||
              file.includes('pages/Particuliers/') || file.includes('pages/Professionnels/') ||
              file.includes('pages/Sportifs/')) {
            relativePath = '../../utils/logger';
          } else if (file.includes('pages/')) {
            relativePath = '../utils/logger';
          } else if (file.includes('components/admin/') || file.includes('components/practitioner/') ||
                     file.includes('components/beneficiaries/') || file.includes('components/appointments/') ||
                     file.includes('components/layout/') || file.includes('components/profile/')) {
            relativePath = '../../utils/logger';
          } else if (file.includes('components/')) {
            relativePath = '../utils/logger';
          } else if (file.includes('context/')) {
            relativePath = '../utils/logger';
          } else if (file.includes('services/')) {
            relativePath = '../utils/logger';
          } else {
            relativePath = './utils/logger';
          }

          newLines.splice(lastImportIndex + 1, 0, `import { logger } from '${relativePath}';`);
        }
      }

      // Écrire le fichier modifié
      fs.writeFileSync(file, newLines.join('\n'), 'utf8');
      fixedCount++;
      console.log(`  ✓ Fixed ${file}`);
    }

  } catch (err) {
    console.error(`Error processing ${file}:`, err.message);
    errorCount++;
  }
});

console.log(`\nDone! Fixed ${fixedCount} files, ${errorCount} errors.`);
