// Script pour appliquer la correction RLS pour les appointments
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Lire les variables d'environnement depuis .env.local
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split(/\r?\n/).forEach(line => {
  line = line.trim();
  if (!line || line.startsWith('#')) return;
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const value = match[2].trim().replace(/^["']|["']$/g, '');
    envVars[key] = value;
    // console.log(`Loaded: ${key} = ${value.substring(0, 20)}...`); // Debug
  }
});

const migrationSQL = `
-- =====================================================
-- Migration: Correction des politiques RLS pour appointments
-- Description: Permet aux intervenants et admins de créer des rendez-vous
-- =====================================================

-- Supprimer les anciennes politiques INSERT si elles existent
DROP POLICY IF EXISTS "Practitioners can insert appointments" ON public.appointments;
DROP POLICY IF EXISTS "Admins can insert appointments" ON public.appointments;
DROP POLICY IF EXISTS "Intervenants can insert appointments" ON public.appointments;
DROP POLICY IF EXISTS "Admins and practitioners can insert appointments" ON public.appointments;

-- Politique: Les intervenants peuvent créer des rendez-vous pour eux-mêmes
CREATE POLICY "Practitioners can create appointments for themselves"
  ON public.appointments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.practitioners p
      WHERE p.id = practitioner_id
      AND p.user_id = auth.uid()
    )
  );

-- Politique: Les admins peuvent créer n'importe quel rendez-vous
CREATE POLICY "Admins can create any appointment"
  ON public.appointments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );
`;

function printSQL() {
  const supabaseUrl = envVars.VITE_SUPABASE_URL || 'https://phokxjbocljahmbdkrbs.supabase.co';
  console.log('========================================');
  console.log(migrationSQL);
  console.log('========================================\n');
  console.log('🔗 SQL Editor de Supabase:');
  console.log(`   ${supabaseUrl.replace('/rest/v1', '').replace('https://', 'https://supabase.com/dashboard/project/')}/sql/new\n`);
}

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error('❌ VITE_SUPABASE_URL manquante dans .env.local');
  process.exit(1);
}

if (!supabaseServiceKey) {
  console.log('\n⚠️  SUPABASE_SERVICE_ROLE_KEY non trouvée dans .env.local\n');
  console.log('📋 Veuillez exécuter le SQL ci-dessous manuellement dans le SQL Editor de Supabase:\n');
  printSQL();
  process.exit(0);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigration() {
  console.log('🚀 Application de la correction RLS pour appointments...\n');

  try {
    // Exécuter le SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      // Si la fonction exec_sql n'existe pas, utiliser une autre méthode
      console.log('⚠️  La fonction exec_sql n\'existe pas. Essai avec une requête directe...\n');

      // Diviser le SQL en plusieurs requêtes
      const queries = migrationSQL
        .split(';')
        .map(q => q.trim())
        .filter(q => q.length > 0 && !q.startsWith('--'));

      for (const query of queries) {
        if (query.trim()) {
          const { error: queryError } = await supabase.rpc('exec', { query });
          if (queryError && !queryError.message.includes('does not exist')) {
            console.error('❌ Erreur lors de l\'exécution de la requête:', queryError);
            console.error('Requête:', query);
          }
        }
      }

      console.log('\n⚠️  Impossible d\'appliquer automatiquement la migration.');
      console.log('\n📋 Veuillez copier le SQL ci-dessous et l\'exécuter manuellement');
      console.log('   dans le SQL Editor de Supabase:\n');
      console.log('----------------------------------------');
      console.log(migrationSQL);
      console.log('----------------------------------------\n');
      console.log('🔗 URL du SQL Editor:');
      console.log(`   ${supabaseUrl.replace('/rest/v1', '')}/project/_/sql\n`);
      return;
    }

    console.log('✅ Migration appliquée avec succès!');
    console.log('\nLes intervenants peuvent maintenant créer des rendez-vous.\n');

  } catch (err) {
    console.error('❌ Erreur:', err.message);
    console.log('\n📋 Veuillez copier le SQL ci-dessous et l\'exécuter manuellement');
    console.log('   dans le SQL Editor de Supabase:\n');
    console.log('----------------------------------------');
    console.log(migrationSQL);
    console.log('----------------------------------------\n');
  }
}

applyMigration();
