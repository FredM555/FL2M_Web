#!/usr/bin/env node
const fs = require('fs');

const files = [
  'src/pages/Professionnels/ModuleCandidats.tsx',
  'src/pages/Professionnels/ModuleCoequipiers.tsx',
  'src/pages/Professionnels/ModuleEquipe.tsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // Supprimer l'import du logger mal placé
  content = content.replace(/^import { logger } from '\.\.\/\.\.\/utils\/logger';\s*$/gm, '');

  // Trouver où insérer l'import (après le dernier import mais avant le premier code)
  const lines = content.split('\n');
  let insertIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    // Chercher la ligne avec useAuth
    if (trimmed.includes("from '../../context/AuthContext'") ||
        trimmed.includes('from "../../context/AuthContext"')) {
      insertIndex = i + 1;
      break;
    }
  }

  // Insérer l'import du logger
  if (insertIndex > 0) {
    lines.splice(insertIndex, 0, "import { logger } from '../../utils/logger';");
  }

  fs.writeFileSync(file, lines.join('\n'), 'utf8');
  console.log(`✅ Corrigé: ${file}`);
});

console.log('\n✅ Tous les fichiers Professionnels ont été corrigés!');
