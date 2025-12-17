#!/usr/bin/env node
/**
 * Script de migration automatique : console.* -> logger.*
 *
 * Ce script remplace tous les appels à console.log, console.error, etc.
 * par des appels au logger personnalisé qui masque les données sensibles.
 *
 * Usage:
 *   node migrate-to-logger.js [--dry-run] [--path <chemin>]
 *
 * Options:
 *   --dry-run  Affiche les changements sans modifier les fichiers
 *   --path     Chemin spécifique à traiter (par défaut: src/)
 */

const fs = require('fs');
const path = require('path');

// Configuration
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const pathIndex = args.indexOf('--path');
const targetPath = pathIndex >= 0 ? args[pathIndex + 1] : 'src';

// Statistiques
const stats = {
  filesProcessed: 0,
  filesModified: 0,
  replacements: {
    'console.log': 0,
    'console.error': 0,
    'console.warn': 0,
    'console.info': 0,
    'console.debug': 0,
    'console.table': 0,
    'console.group': 0,
    'console.groupCollapsed': 0,
    'console.groupEnd': 0,
    'console.trace': 0,
    'console.time': 0,
    'console.timeEnd': 0
  }
};

/**
 * Vérifie si un fichier doit être traité
 */
function shouldProcessFile(filePath) {
  const ext = path.extname(filePath);
  return ['.ts', '.tsx', '.js', '.jsx'].includes(ext);
}

/**
 * Vérifie si le fichier importe déjà le logger
 */
function hasLoggerImport(content) {
  return /import\s+{\s*logger\s*}\s+from\s+['"].*logger['"]/.test(content);
}

/**
 * Ajoute l'import du logger en haut du fichier
 */
function addLoggerImport(content, filePath) {
  // Déterminer le chemin relatif vers logger.ts
  const fileDir = path.dirname(filePath);
  const loggerPath = path.join(process.cwd(), 'src', 'utils', 'logger.ts');
  const relativePath = path.relative(fileDir, loggerPath)
    .replace(/\\/g, '/')
    .replace(/\.ts$/, '');

  // Si le chemin ne commence pas par . ou .., ajouter ./
  const importPath = relativePath.startsWith('.') ? relativePath : `./${relativePath}`;

  // Trouver le dernier import
  const lines = content.split('\n');
  let lastImportIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('import ')) {
      lastImportIndex = i;
    } else if (lastImportIndex >= 0 && lines[i].trim() !== '') {
      // On a trouvé la fin des imports
      break;
    }
  }

  // Insérer l'import du logger après le dernier import
  if (lastImportIndex >= 0) {
    lines.splice(lastImportIndex + 1, 0, `import { logger } from '${importPath}';`);
  } else {
    // Pas d'import trouvé, ajouter au début du fichier
    lines.unshift(`import { logger } from '${importPath}';`);
  }

  return lines.join('\n');
}

/**
 * Remplace les appels console.* par logger.*
 */
function replaceConsoleCalls(content) {
  let modified = content;
  let hasReplacements = false;

  const replacements = [
    { from: /console\.log\(/g, to: 'logger.debug(', key: 'console.log' },
    { from: /console\.error\(/g, to: 'logger.error(', key: 'console.error' },
    { from: /console\.warn\(/g, to: 'logger.warn(', key: 'console.warn' },
    { from: /console\.info\(/g, to: 'logger.info(', key: 'console.info' },
    { from: /console\.debug\(/g, to: 'logger.debug(', key: 'console.debug' },
    { from: /console\.table\(/g, to: 'logger.table(', key: 'console.table' },
    { from: /console\.group\(/g, to: 'logger.group(', key: 'console.group' },
    { from: /console\.groupCollapsed\(/g, to: 'logger.groupCollapsed(', key: 'console.groupCollapsed' },
    { from: /console\.groupEnd\(\)/g, to: 'logger.groupEnd()', key: 'console.groupEnd' },
    { from: /console\.trace\(/g, to: 'logger.trace(', key: 'console.trace' },
    { from: /console\.time\(/g, to: 'logger.time(', key: 'console.time' },
    { from: /console\.timeEnd\(/g, to: 'logger.timeEnd(', key: 'console.timeEnd' }
  ];

  for (const { from, to, key } of replacements) {
    const matches = modified.match(from);
    if (matches) {
      stats.replacements[key] += matches.length;
      modified = modified.replace(from, to);
      hasReplacements = true;
    }
  }

  return { content: modified, hasReplacements };
}

/**
 * Traite un fichier
 */
function processFile(filePath) {
  stats.filesProcessed++;

  const content = fs.readFileSync(filePath, 'utf8');
  const { content: modifiedContent, hasReplacements } = replaceConsoleCalls(content);

  if (!hasReplacements) {
    return; // Aucun changement nécessaire
  }

  // Ajouter l'import du logger si nécessaire
  let finalContent = modifiedContent;
  if (!hasLoggerImport(modifiedContent)) {
    finalContent = addLoggerImport(modifiedContent, filePath);
  }

  if (isDryRun) {
    console.log(`[DRY RUN] Modifierait: ${filePath}`);
  } else {
    fs.writeFileSync(filePath, finalContent, 'utf8');
    console.log(`✅ Modifié: ${filePath}`);
  }

  stats.filesModified++;
}

/**
 * Traite récursivement un répertoire
 */
function processDirectory(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      // Ignorer node_modules, dist, build, etc.
      if (['node_modules', 'dist', 'build', '.git'].includes(entry.name)) {
        continue;
      }
      processDirectory(fullPath);
    } else if (entry.isFile() && shouldProcessFile(fullPath)) {
      try {
        processFile(fullPath);
      } catch (error) {
        console.error(`❌ Erreur lors du traitement de ${fullPath}:`, error.message);
      }
    }
  }
}

/**
 * Point d'entrée principal
 */
function main() {
  console.log('🔄 Migration console.* -> logger.*\n');
  console.log(`Mode: ${isDryRun ? 'DRY RUN (aucune modification)' : 'MODIFICATION'}`);
  console.log(`Chemin: ${targetPath}\n`);

  const targetFullPath = path.join(process.cwd(), targetPath);

  if (!fs.existsSync(targetFullPath)) {
    console.error(`❌ Le chemin ${targetFullPath} n'existe pas`);
    process.exit(1);
  }

  const stat = fs.statSync(targetFullPath);
  if (stat.isDirectory()) {
    processDirectory(targetFullPath);
  } else if (stat.isFile() && shouldProcessFile(targetFullPath)) {
    processFile(targetFullPath);
  }

  // Afficher les statistiques
  console.log('\n📊 Statistiques de migration:\n');
  console.log(`Fichiers traités: ${stats.filesProcessed}`);
  console.log(`Fichiers modifiés: ${stats.filesModified}`);
  console.log('\nRemplacements par type:');

  let totalReplacements = 0;
  for (const [key, count] of Object.entries(stats.replacements)) {
    if (count > 0) {
      console.log(`  ${key.padEnd(25)} → logger.${key.replace('console.', '').padEnd(15)} (${count})`);
      totalReplacements += count;
    }
  }

  console.log(`\nTotal de remplacements: ${totalReplacements}`);

  if (isDryRun) {
    console.log('\n⚠️  Mode DRY RUN: Aucun fichier n\'a été modifié');
    console.log('   Exécutez sans --dry-run pour appliquer les changements');
  } else {
    console.log('\n✅ Migration terminée avec succès!');
  }
}

// Exécuter le script
main();
