// Script pour mettre à jour la version API Stripe pour correspondre au webhook
const fs = require('fs');
const path = require('path');

const functionsDir = path.join(__dirname, 'supabase', 'functions');

const filesToUpdate = [
  'stripe-webhook/index.ts',
  'stripe-create-subscription-checkout/index.ts',
  'stripe-create-connect-account/index.ts',
  'stripe-create-appointment-payment/index.ts',
  'stripe-check-connect-status/index.ts',
  'process-payouts/index.ts'
];

filesToUpdate.forEach(relativePath => {
  const filePath = path.join(functionsDir, relativePath);

  try {
    let content = fs.readFileSync(filePath, 'utf8');

    // Remplacer la version API
    content = content.replace(
      /apiVersion: '2024-11-20\.acacia'/g,
      "apiVersion: '2025-04-30.basil'"
    );

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ Updated: ${relativePath}`);
  } catch (error) {
    console.error(`✗ Error updating ${relativePath}:`, error.message);
  }
});

console.log('\n✓ Stripe API version mise à jour vers 2025-04-30.basil pour correspondre au webhook');
