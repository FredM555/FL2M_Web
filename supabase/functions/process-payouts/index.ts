// supabase/functions/process-payouts/index.ts
// Cette fonction doit être appelée par un CRON job (toutes les heures par exemple)
// Elle traite les transactions éligibles pour transfert aux intervenants

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@17.3.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2025-04-30.basil',
  httpClient: Stripe.createFetchHttpClient()
});

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

serve(async (req) => {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[Payouts] Démarrage du traitement des paiements');

    // Récupérer toutes les transactions éligibles pour transfert
    const { data: eligibleTransactions, error: transactionsError } = await supabase
      .from('transactions')
      .select(`
        id,
        appointment_id,
        practitioner_id,
        client_id,
        amount_practitioner,
        amount_platform_commission,
        stripe_payment_intent_id,
        eligible_for_transfer_at,
        practitioners (
          id,
          stripe_account_id,
          profiles (
            id,
            first_name,
            last_name,
            email
          )
        )
      `)
      .eq('transfer_status', 'eligible')
      .lte('eligible_for_transfer_at', new Date().toISOString())
      .eq('status', 'succeeded');

    if (transactionsError) {
      throw new Error(`Erreur récupération transactions: ${transactionsError.message}`);
    }

    if (!eligibleTransactions || eligibleTransactions.length === 0) {
      console.log('[Payouts] Aucune transaction éligible');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Aucune transaction à traiter',
          processed: 0
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Payouts] ${eligibleTransactions.length} transaction(s) éligible(s)`);

    let processedCount = 0;
    let failedCount = 0;

    // Traiter chaque transaction
    for (const transaction of eligibleTransactions) {
      try {
        // Vérifier que le intervenant a un compte Stripe Connect
        if (!transaction.practitioners?.stripe_account_id) {
          console.log(`[Payouts] intervenant ${transaction.practitioner_id} sans compte Stripe Connect - Skip`);

          await supabase
            .from('transactions')
            .update({
              transfer_status: 'failed',
              failure_reason: 'Practitioner has no Stripe Connect account'
            })
            .eq('id', transaction.id);

          failedCount++;
          continue;
        }

        // Créer le transfert Stripe vers le compte Connect du intervenant
        const transfer = await stripe.transfers.create({
          amount: Math.round(transaction.amount_practitioner * 100), // en centimes
          currency: 'eur',
          destination: transaction.practitioners.stripe_account_id,
          description: `Paiement rendez-vous ${transaction.appointment_id}`,
          metadata: {
            transaction_id: transaction.id,
            appointment_id: transaction.appointment_id,
            practitioner_id: transaction.practitioner_id
          }
        });

        console.log(`[Payouts] Transfert créé: ${transfer.id} - ${transaction.amount_practitioner}€`);

        // Mettre à jour la transaction
        await supabase
          .from('transactions')
          .update({
            stripe_transfer_id: transfer.id,
            transfer_status: 'completed',
            transferred_at: new Date().toISOString(),
            transfer_date: new Date().toISOString()
          })
          .eq('id', transaction.id);

        processedCount++;

      } catch (error) {
        console.error(`[Payouts] Erreur transfert transaction ${transaction.id}:`, error);

        // Enregistrer l'échec
        await supabase
          .from('transactions')
          .update({
            transfer_status: 'failed',
            failure_reason: error instanceof Error ? error.message : 'Transfer failed'
          })
          .eq('id', transaction.id);

        failedCount++;
      }
    }

    console.log(`[Payouts] Traitement terminé: ${processedCount} réussis, ${failedCount} échecs`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: processedCount,
        failed: failedCount,
        total: eligibleTransactions.length
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[Payouts] Erreur globale:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
});
