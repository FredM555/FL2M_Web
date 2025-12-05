// Script pour mettre à jour la version API Stripe dans toutes les Edge Functions
const fs = require('fs');
const path = require('path');

const functionsDir = path.join(__dirname, 'supabase', 'functions');

// Nouvelle version API Stripe
const oldApiVersion = "2024-11-20.acacia";
const newApiVersion = "2025-04-30.basil";

function updateFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');

    if (content.includes(oldApiVersion)) {
      content = content.replace(
        new RegExp(oldApiVersion, 'g'),
        newApiVersion
      );

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
      totalUpdated += scanDirectory(fullPath);
    } else if (entry.isFile() && entry.name === 'index.ts') {
      if (updateFile(fullPath)) {
        totalUpdated++;
      }
    }
  });

  return totalUpdated;
}

console.log(`🔄 Mise à jour de l'API Stripe: ${oldApiVersion} → ${newApiVersion}\n`);
const updated = scanDirectory(functionsDir);
console.log(`\n✨ ${updated} fonction(s) mise(s) à jour avec succès!`);
