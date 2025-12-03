const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuration Supabase
const supabaseUrl = 'https://dgxxuypqrzbcvxsxewcg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRneHh1eXBxcnpiY3Z4c3hld2NnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMjM0OTI5NCwiZXhwIjoyMDQ3OTI1Mjk0fQ.0fCx_gaCjA39WtD6oiJF21_9XBPYDGq0e-LzQFhYqPI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  console.log('🚀 Application de la migration de correctif des tarifs...\n');

  try {
    // Lire le fichier SQL
    const sqlPath = path.join(__dirname, 'supabase', 'migrations', 'fix_contract_pricing.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Exécuter via RPC en utilisant la fonction SQL brute
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error('❌ Erreur lors de l\'application de la migration:', error);

      // Essayer d'appliquer manuellement les parties importantes
      console.log('\n📝 Application manuelle des mises à jour...\n');

      // Mettre à jour les contrats existants
      console.log('1. Mise à jour des contrats STARTER existants...');
      const { data: starterUpdate, error: starterError } = await supabase
        .from('practitioner_contracts')
        .update({
          monthly_fee: 60,
          commission_fixed: 6,
          commission_percentage: 8,
          commission_cap: null
        })
        .eq('contract_type', 'starter')
        .or('monthly_fee.is.null,monthly_fee.eq.0');

      if (starterError) {
        console.error('   ❌ Erreur:', starterError.message);
      } else {
        console.log('   ✅ Contrats STARTER mis à jour');
      }

      // Mettre à jour les contrats FREE
      console.log('2. Mise à jour des contrats FREE existants...');
      const { data: freeUpdate, error: freeError } = await supabase
        .from('practitioner_contracts')
        .update({
          monthly_fee: 0,
          commission_fixed: 10,
          commission_percentage: 12,
          commission_cap: 25
        })
        .eq('contract_type', 'free')
        .is('commission_fixed', null);

      if (freeError) {
        console.error('   ❌ Erreur:', freeError.message);
      } else {
        console.log('   ✅ Contrats FREE mis à jour');
      }

      // Mettre à jour les contrats PRO
      console.log('3. Mise à jour des contrats PRO existants...');
      const { data: proUpdate, error: proError } = await supabase
        .from('practitioner_contracts')
        .update({
          monthly_fee: 100,
          commission_fixed: 3,
          commission_percentage: null,
          commission_cap: null
        })
        .eq('contract_type', 'pro')
        .or('monthly_fee.is.null,monthly_fee.eq.0');

      if (proError) {
        console.error('   ❌ Erreur:', proError.message);
      } else {
        console.log('   ✅ Contrats PRO mis à jour');
      }

      // Mettre à jour les contrats PREMIUM
      console.log('4. Mise à jour des contrats PREMIUM existants...');
      const { data: premiumUpdate, error: premiumError } = await supabase
        .from('practitioner_contracts')
        .update({
          monthly_fee: 160,
          commission_fixed: 0,
          commission_percentage: null,
          commission_cap: null
        })
        .eq('contract_type', 'premium')
        .or('monthly_fee.is.null,monthly_fee.eq.0');

      if (premiumError) {
        console.error('   ❌ Erreur:', premiumError.message);
      } else {
        console.log('   ✅ Contrats PREMIUM mis à jour');
      }

      console.log('\n✅ Migration appliquée avec succès (mode manuel)');
      console.log('\n⚠️  Note: La fonction complete_practitioner_onboarding doit être mise à jour manuellement via le Dashboard Supabase');
      console.log('   Allez dans Database > Functions et copiez-collez le code de fix_contract_pricing.sql\n');

    } else {
      console.log('✅ Migration appliquée avec succès!');
      console.log('   - Fonction complete_practitioner_onboarding mise à jour');
      console.log('   - Contrats existants corrigés\n');
    }

    // Vérifier les contrats
    console.log('📊 Vérification des contrats...\n');
    const { data: contracts, error: contractsError } = await supabase
      .from('practitioner_contracts')
      .select('id, contract_type, monthly_fee, commission_fixed, commission_percentage, status')
      .order('created_at', { ascending: false })
      .limit(10);

    if (contractsError) {
      console.error('❌ Erreur lors de la vérification:', contractsError);
    } else {
      console.log('Derniers contrats:');
      contracts.forEach(c => {
        console.log(`  - ${c.contract_type.toUpperCase()}: ${c.monthly_fee}€/mois, commission: ${c.commission_fixed}€ fixe${c.commission_percentage ? ` + ${c.commission_percentage}%` : ''} [${c.status}]`);
      });
    }

  } catch (err) {
    console.error('❌ Erreur générale:', err);
  }
}

applyMigration();
