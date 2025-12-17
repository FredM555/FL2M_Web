#!/usr/bin/env node
const fs = require('fs');

const files = [
  'src/pages/ProfilePage.tsx',
  'src/pages/RendezVousPage.tsx',
  'src/pages/ResetPasswordPage.tsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // Supprimer l'import du logger mal placé
  const lines = content.split('\n');
  const filteredLines = lines.filter(line => !line.match(/^import { logger } from/));

  // Trouver la ligne après useAuth ou après le dernier import
  let insertIndex = -1;
  for (let i = 0; i < filteredLines.length; i++) {
    if (filteredLines[i].includes("from '../context/AuthContext'") ||
        filteredLines[i].includes('from react-router-dom')) {
      insertIndex = i + 1;
      break;
    }
  }

  // Insérer l'import du logger
  if (insertIndex > 0) {
    filteredLines.splice(insertIndex, 0, "import { logger } from '../utils/logger';");
  }

  fs.writeFileSync(file, filteredLines.join('\n'), 'utf8');
  console.log(`✅ Corrigé: ${file}`);
});

console.log('\n✅ Tous les imports restants ont été corrigés!');
