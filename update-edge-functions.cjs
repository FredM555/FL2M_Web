// Script pour mettre à jour les versions Deno dans toutes les Edge Functions
const fs = require('fs');
const path = require('path');

const functionsDir = path.join(__dirname, 'supabase', 'functions');

// Mapping des anciennes versions vers les nouvelles
const updates = [
  {
    old: "https://deno.land/std@0.168.0/http/server.ts",
    new: "https://deno.land/std@0.192.0/http/server.ts"
  },
  {
    old: "https://deno.land/std@0.177.1/http/server.ts",
    new: "https://deno.land/std@0.192.0/http/server.ts"
  },
  {
    old: 'https://esm.sh/@supabase/supabase-js@2',
    new: 'https://esm.sh/@supabase/supabase-js@2.39.0'
  }
];

function updateFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    updates.forEach(update => {
      if (content.includes(update.old)) {
        content = content.replaceAll(update.old, update.new);
        modified = true;
      }
    });

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Mis à jour: ${path.relative(functionsDir, filePath)}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`❌ Erreur avec ${filePath}:`, error.message);
    return false;
  }
}

function scanDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let totalUpdated = 0;

  entries.forEach(entry => {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Récursif pour les sous-dossiers
      totalUpdated += scanDirectory(fullPath);
    } else if (entry.isFile() && entry.name === 'index.ts') {
      if (updateFile(fullPath)) {
        totalUpdated++;
      }
    }
  });

  return totalUpdated;
}

console.log('🔄 Mise à jour des Edge Functions...\n');
const updated = scanDirectory(functionsDir);
console.log(`\n✨ ${updated} fonction(s) mise(s) à jour avec succès!`);
