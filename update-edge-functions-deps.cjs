// Script pour mettre à jour les dépendances des edge functions vers des versions compatibles Deno 2.x
const fs = require('fs');
const path = require('path');

const functionsDir = path.join(__dirname, 'supabase', 'functions');

// Versions à mettre à jour
const updates = [
  {
    old: /https:\/\/deno\.land\/std@0\.192\.0/g,
    new: 'https://deno.land/std@0.224.0'
  },
  {
    old: /https:\/\/esm\.sh\/stripe@14\.11\.0/g,
    new: 'https://esm.sh/stripe@17.3.0'
  },
  {
    old: /https:\/\/esm\.sh\/@supabase\/supabase-js@2\.39\.0/g,
    new: 'https://esm.sh/@supabase/supabase-js@2.45.0'
  },
  {
    old: /apiVersion: '2025-04-30\.basil'/g,
    new: "apiVersion: '2024-11-20.acacia'"
  }
];

function updateFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    updates.forEach(({ old, new: replacement }) => {
      if (old.test(content)) {
        content = content.replace(old, replacement);
        modified = true;
      }
    });

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✓ Updated: ${path.relative(process.cwd(), filePath)}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`✗ Error updating ${filePath}:`, error.message);
    return false;
  }
}

function processDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let totalUpdated = 0;

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      totalUpdated += processDirectory(fullPath);
    } else if (entry.isFile() && entry.name === 'index.ts') {
      if (updateFile(fullPath)) {
        totalUpdated++;
      }
    }
  }

  return totalUpdated;
}

console.log('Mise à jour des dépendances des edge functions...\n');
const updated = processDirectory(functionsDir);
console.log(`\n✓ ${updated} fichier(s) mis à jour avec succès`);
