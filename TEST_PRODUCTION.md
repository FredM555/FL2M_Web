# Guide de test en production

## ✅ Prérequis (déjà fait)

- [x] Webhook stripe-webhook corrigé et déployé
- [x] Virements automatiques Stripe désactivés
- [x] CRON job process-payouts configuré (à vérifier)

## 🧪 Scénario de test complet

### Étape 1 : Créer un nouveau rendez-vous payant

1. **Créer un rendez-vous** avec un client (via l'interface)
2. **Payer le rendez-vous** (en production = vraie carte bancaire)
3. **Noter l'heure** du rendez-vous

### Étape 2 : Vérifier la transaction après paiement

Exécutez ce SQL immédiatement après le paiement :

```sql
-- Vérifier la dernière transaction créée
SELECT
  id,
  appointment_id,
  status,
  transfer_status,
  eligible_for_transfer_at,
  amount_practitioner,
  created_at
FROM transactions
ORDER BY created_at DESC
LIMIT 1;
```

**Attendu** :
- ✅ `status = 'succeeded'` (webhook corrigé)
- ✅ `transfer_status = 'eligible'` (webhook corrigé)
- ✅ `eligible_for_transfer_at` = heure de fin du RDV + 48h

### Étape 3 : Vérifier que le RDV devient "completed"

**Attendre** : 1 heure après la fin du rendez-vous

Vérifier :

```sql
SELECT
  id,
  start_time,
  end_time,
  status,
  payment_status
FROM appointments
WHERE id = 'VOTRE_APPOINTMENT_ID'
```

**Attendu** :
- ✅ `status = 'completed'` (CRON auto_complete_appointments)
- ✅ `payment_status = 'paid'`

### Étape 4 : Vérifier le transfert après 48h

**Attendre** : 48h + 1h après la fin du rendez-vous

Vérifier :

```sql
SELECT
  t.id,
  t.appointment_id,
  t.transfer_status,
  t.stripe_transfer_id,
  t.transferred_at,
  t.amount_practitioner,
  a.end_time,
  EXTRACT(EPOCH FROM (NOW() - a.end_time))/3600 as heures_depuis_fin
FROM transactions t
JOIN appointments a ON a.id = t.appointment_id
WHERE t.appointment_id = 'VOTRE_APPOINTMENT_ID';
```

**Attendu** :
- ✅ `transfer_status = 'completed'`
- ✅ `stripe_transfer_id` rempli (commence par `tr_...`)
- ✅ `transferred_at` rempli
- ✅ Heures depuis fin > 48

### Étape 5 : Vérifier dans Stripe Dashboard

Allez sur : https://dashboard.stripe.com/balance/overview

**Vérifier** :
1. **Payments** : Le paiement du client apparaît
2. **Transfers** : Le transfert vers l'intervenant apparaît
3. **Balance** : Votre commission reste dans le solde

## 🚀 Test rapide (sans attendre 48h)

Pour tester immédiatement sans attendre 48h :

```sql
-- 1. Créer un rendez-vous de test qui s'est terminé il y a 49h
-- (Modifier manuellement les dates)
UPDATE appointments
SET
  start_time = NOW() - INTERVAL '50 hours',
  end_time = NOW() - INTERVAL '49 hours',
  status = 'completed'
WHERE id = 'VOTRE_APPOINTMENT_ID';

-- 2. Forcer la date d'éligibilité à maintenant
UPDATE transactions
SET eligible_for_transfer_at = NOW() - INTERVAL '1 hour'
WHERE appointment_id = 'VOTRE_APPOINTMENT_ID';

-- 3. Lancer process-payouts manuellement
SELECT net.http_post(
  'https://phokxjbocljahmbdkrbs.supabase.co/functions/v1/process-payouts',
  '{}'::jsonb,
  '{}'::jsonb,
  '{"Content-Type": "application/json", "Authorization": "Bearer VOTRE_SERVICE_ROLE_KEY"}'::jsonb
);

-- 4. Vérifier le résultat
SELECT
  id,
  transfer_status,
  stripe_transfer_id,
  transferred_at
FROM transactions
WHERE appointment_id = 'VOTRE_APPOINTMENT_ID';
```

## 📊 Scripts de monitoring

### Voir toutes les transactions en attente de transfert

```sql
SELECT
  COUNT(*) as nb_transactions,
  SUM(amount_practitioner) as total_a_transferer_euros,
  MIN(eligible_for_transfer_at) as prochaine_eligibilite
FROM transactions
WHERE transfer_status = 'eligible'
  AND status = 'succeeded'
  AND eligible_for_transfer_at > NOW();
```

### Voir les derniers transferts effectués

```sql
SELECT
  id,
  appointment_id,
  stripe_transfer_id,
  transferred_at,
  amount_practitioner
FROM transactions
WHERE transfer_status = 'completed'
ORDER BY transferred_at DESC
LIMIT 10;
```

### Vérifier les CRON jobs

```sql
-- Voir les jobs actifs
SELECT jobname, schedule, active
FROM cron.job
ORDER BY jobname;

-- Voir l'historique récent
SELECT
  j.jobname,
  r.status,
  r.start_time,
  LEFT(r.return_message, 100) as message
FROM cron.job_run_details r
JOIN cron.job j ON j.jobid = r.jobid
WHERE r.start_time > NOW() - INTERVAL '24 hours'
ORDER BY r.start_time DESC
LIMIT 20;
```

## ⚠️ Points de vigilance

### 1. Solde Stripe

Vérifiez régulièrement que votre solde Stripe est suffisant :

```sql
-- Calculer le solde nécessaire
SELECT
  COUNT(*) as nb_rdv_a_payer,
  SUM(amount_practitioner) as reserve_necessaire_euros
FROM transactions
WHERE transfer_status = 'eligible'
  AND status = 'succeeded';
```

Comparez avec votre solde disponible sur : https://dashboard.stripe.com/balance

### 2. CRON job process-payouts

Vérifiez qu'il s'exécute bien toutes les heures :

```sql
SELECT
  r.start_time,
  r.status,
  r.return_message
FROM cron.job_run_details r
JOIN cron.job j ON j.jobid = r.jobid
WHERE j.jobname = 'process-payouts-hourly'
ORDER BY r.start_time DESC
LIMIT 5;
```

Si `status = 'failed'`, voir `GUIDE_CORRECTION_CRON.md`

### 3. Logs des Edge Functions

Consultez régulièrement les logs :

- **stripe-webhook** : https://supabase.com/dashboard/project/phokxjbocljahmbdkrbs/functions/stripe-webhook/logs
- **process-payouts** : https://supabase.com/dashboard/project/phokxjbocljahmbdkrbs/functions/process-payouts/logs

## ✅ Checklist de validation

- [ ] Paiement créé → `status='succeeded'` et `transfer_status='eligible'`
- [ ] RDV terminé → `status='completed'` après 1h
- [ ] Transfert effectué → `transfer_status='completed'` après 48h
- [ ] CRON s'exécute toutes les heures sans erreur
- [ ] Solde Stripe suffisant pour les transferts
- [ ] Logs sans erreur

## 🎉 Succès

Si tous les points sont verts ✅, votre système de validation automatique après 48h fonctionne parfaitement !

## 🆘 En cas de problème

1. Consultez les logs des fonctions
2. Vérifiez le statut des CRON jobs
3. Exécutez `debug_process_payouts_query.sql`
4. Consultez `RÉSUMÉ_CORRECTION.md` pour le diagnostic complet
