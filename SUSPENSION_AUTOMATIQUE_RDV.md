# Système de suspension automatique des rendez-vous concurrents

## Vue d'ensemble

Ce système assure qu'un intervenant ne peut pas avoir plusieurs rendez-vous confirmés sur le même créneau horaire. Lorsqu'un rendez-vous est confirmé (payé), tous les autres rendez-vous du même intervenant sur le même créneau sont automatiquement annulés (suspendus). Si le rendez-vous confirmé est ensuite annulé, les rendez-vous suspendus sont automatiquement réactivés.

## Fonctionnement

### 1. Suspension automatique lors de la confirmation/paiement

Quand un rendez-vous est confirmé (status = 'confirmed'), le système :

1. ✅ Recherche tous les rendez-vous du même intervenant
2. ✅ Qui se chevauchent avec le créneau confirmé (même heure ou heure qui se superpose)
3. ✅ Exclut les rendez-vous du même service (ex: si plusieurs rendez-vous pour un couple)
4. ✅ Les annule automatiquement avec le statut `cancelled`
5. ✅ Ajoute une note : `[AUTO_SUSPENDED:{id_du_rdv_confirmé}] Suspendu automatiquement car un autre rendez-vous a été confirmé sur ce créneau`

### 2. Réactivation automatique lors de l'annulation

Quand un rendez-vous confirmé est annulé, le système :

1. ✅ Recherche tous les rendez-vous qui ont été suspendus par ce rendez-vous (identifiés par `[AUTO_SUSPENDED:{id}]` dans les notes)
2. ✅ Les réactive en changeant leur statut à `pending`
3. ✅ Efface la note d'annulation automatique
4. ✅ Les rend à nouveau disponibles à la réservation

## Implémentation

### Fichiers modifiés

#### 1. Migration SQL - `supabase/migrations/20251220_add_suspend_conflicting_appointments_function.sql`

Création de deux fonctions PostgreSQL :

**`suspend_conflicting_appointments`**
- Paramètres : practitioner_id, start_time, end_time, confirmed_appointment_id
- Retourne : nombre de RDV suspendus et leurs IDs
- Logique :
  - Trouve les RDV qui se chevauchent (start_time < existing_end_time AND end_time > existing_start_time)
  - Exclut le RDV confirmé et les RDV du même service
  - Met le statut à 'cancelled' avec note spéciale

**`reactivate_suspended_appointments`**
- Paramètres : appointment_id
- Retourne : nombre de RDV réactivés et leurs IDs
- Logique :
  - Trouve les RDV avec status='cancelled' et note contenant `[AUTO_SUSPENDED:{appointment_id}]`
  - Remet le statut à 'pending'
  - Efface les notes

#### 2. Webhook Stripe - `supabase/functions/stripe-webhook/index.ts`

Dans la fonction `handleAppointmentPaymentCompleted` (lignes 434-467) :

```typescript
// Mettre à jour le statut ET le payment_status du rendez-vous
const { data: updatedAppointment } = await supabase
  .from('appointments')
  .update({
    status: 'confirmed',
    payment_status: 'paid'
  })
  .eq('id', appointmentId)
  .select('practitioner_id, start_time, end_time')
  .single();

// Suspendre les rendez-vous concurrents automatiquement
if (updatedAppointment) {
  try {
    const { data: suspendResult, error: suspendError } = await supabase.rpc(
      'suspend_conflicting_appointments',
      {
        p_practitioner_id: updatedAppointment.practitioner_id,
        p_start_time: updatedAppointment.start_time,
        p_end_time: updatedAppointment.end_time,
        p_confirmed_appointment_id: appointmentId
      }
    );

    if (suspendError) {
      console.error('[Webhook] Erreur lors de la suspension des RDV concurrents:', suspendError);
    } else if (suspendResult && suspendResult.length > 0) {
      const count = suspendResult[0].suspended_count;
      console.log(`[Webhook] ${count} rendez-vous concurrent(s) suspendu(s) automatiquement`);
    }
  } catch (suspendException) {
    console.error('[Webhook] Exception lors de la suspension des RDV:', suspendException);
  }
}
```

#### 3. Service d'annulation - `src/services/supabase-appointments.ts`

Dans la fonction `cancelAppointment` (lignes 897-1070) :

**Ajout à la ligne 952 :**
```typescript
const wasConfirmed = appointment.status === 'confirmed';
```

**Ajout aux lignes 970-974 (pour RDV payés/keepRecord) :**
```typescript
// Réactiver les rendez-vous qui avaient été suspendus par ce rendez-vous
if (wasConfirmed) {
  reactivateSuspendedAppointments(appointmentId).catch(err =>
    logger.error('Erreur lors de la réactivation des RDV suspendus:', err)
  );
}
```

**Ajout aux lignes 1005-1009 (pour RDV non-payés) :**
```typescript
// Réactiver les rendez-vous qui avaient été suspendus par ce rendez-vous (si il était confirmé)
if (wasConfirmed) {
  reactivateSuspendedAppointments(appointmentId).catch(err =>
    logger.error('Erreur lors de la réactivation des RDV suspendus:', err)
  );
}
```

## Déploiement

### Étape 1 : Appliquer la migration SQL

```bash
# Via la ligne de commande Supabase CLI
npx supabase db push
```

**OU** manuellement via le Dashboard Supabase :
1. Aller dans **SQL Editor**
2. Copier le contenu de `supabase/migrations/20251220_add_suspend_conflicting_appointments_function.sql`
3. Exécuter le script

### Étape 2 : Déployer le webhook Stripe (si pas déjà fait)

```bash
npx supabase functions deploy stripe-webhook
```

### Étape 3 : Tester

#### Test 1 : Suspension lors du paiement

1. Créer 2 rendez-vous pour le même intervenant sur le même créneau (services différents)
   - RDV A : Service "Consultation individuelle" - 14h00-15h00
   - RDV B : Service "Consultation couple" - 14h30-15h30 (chevauche RDV A)

2. Payer le RDV A
   - ✅ Le RDV A passe à `status='confirmed', payment_status='paid'`
   - ✅ Le RDV B passe automatiquement à `status='cancelled'`
   - ✅ Les notes du RDV B contiennent `[AUTO_SUSPENDED:...]`

3. Vérifier dans la base de données :
```sql
SELECT id, status, notes
FROM appointments
WHERE practitioner_id = '...'
AND start_time::date = '2025-12-20'
ORDER BY start_time;
```

#### Test 2 : Réactivation lors de l'annulation

1. Annuler le RDV A (confirmé/payé)
   - Aller dans l'interface admin ou intervenant
   - Cliquer sur "Annuler le rendez-vous"

2. Vérifier que le RDV B a été réactivé :
   - ✅ Le RDV B repasse à `status='pending'`
   - ✅ Les notes du RDV B sont effacées (notes=null)
   - ✅ Le créneau est à nouveau disponible

3. Vérifier dans la base de données :
```sql
SELECT id, status, notes
FROM appointments
WHERE id = '<id_du_rdv_b>';
```

## Logs et Monitoring

### Logs du webhook Stripe

Dans les logs de la fonction Edge (`Supabase Dashboard > Edge Functions > stripe-webhook > Logs`) :

```
[Webhook] Paiement rendez-vous: <appointment_id>
[Webhook] 2 rendez-vous concurrent(s) suspendu(s) automatiquement
```

### Logs de l'application

Dans les logs de l'application côté client :

```typescript
// Lors de la suspension
logger.debug(`${count} rendez-vous suspendu(s) automatiquement`);

// Lors de la réactivation
logger.debug(`${count} rendez-vous réactivé(s) automatiquement`);
```

## Cas d'usage

### Cas 1 : Intervenant crée plusieurs créneaux disponibles

**Scénario :**
- L'intervenant Marie crée 3 services différents sur le créneau 14h-15h le lundi :
  - Service A : Consultation individuelle
  - Service B : Consultation couple
  - Service C : Consultation famille

**Comportement :**
1. Tous les 3 créneaux sont disponibles (status='pending')
2. Client 1 réserve et paie le Service A
3. → Service A : status='confirmed', payment_status='paid'
4. → Service B : status='cancelled', notes='[AUTO_SUSPENDED:...]'
5. → Service C : status='cancelled', notes='[AUTO_SUSPENDED:...]'
6. Le créneau 14h-15h de Marie est maintenant bloqué

### Cas 2 : Annulation après paiement

**Scénario :**
- Suite au Cas 1, le Client 1 annule son RDV (empêchement)

**Comportement :**
1. Service A : status='cancelled'
2. → Service B : status='pending' (réactivé)
3. → Service C : status='pending' (réactivé)
4. Le créneau 14h-15h de Marie est à nouveau disponible pour réservation

### Cas 3 : Plusieurs réservations simultanées (edge case)

**Scénario :**
- 2 clients réservent le même créneau en même temps
- Client 1 paie en premier

**Comportement :**
1. Client 1 paie → Service A confirmé
2. → Suspension automatique des autres services (dont celui du Client 2)
3. Client 2 essaie de payer → Erreur (le RDV a été annulé automatiquement)
4. Client 2 doit choisir un autre créneau

## Points importants

### Exclusion des RDV du même service

Le système exclut les RDV du même service pour permettre des réservations multiples pour le même service (ex: plusieurs personnes pour un RDV de couple ou famille).

**Critère d'exclusion :** `service_id != service_id_du_rdv_confirmé`

### Marqueur dans les notes

Le tag `[AUTO_SUSPENDED:{id}]` dans les notes permet :
- D'identifier les RDV annulés automatiquement (vs annulés manuellement)
- De retrouver quel RDV a causé la suspension
- De réactiver uniquement les bons RDV lors de l'annulation

### Gestion des erreurs

Si la suspension/réactivation échoue :
- ✅ Le paiement est quand même confirmé (la transaction ne doit pas échouer)
- ✅ Une erreur est loggée dans les logs
- ✅ Un admin peut manuellement suspendre/réactiver les RDV si nécessaire

## Vérifications SQL

### Vérifier les RDV suspendus automatiquement

```sql
SELECT
  id,
  practitioner_id,
  service_id,
  start_time,
  end_time,
  status,
  notes
FROM appointments
WHERE status = 'cancelled'
  AND notes LIKE '%[AUTO_SUSPENDED:%'
ORDER BY start_time DESC;
```

### Vérifier les conflits potentiels

```sql
-- Trouver les RDV confirmés qui se chevauchent pour le même intervenant
SELECT
  a1.id as rdv1_id,
  a2.id as rdv2_id,
  a1.practitioner_id,
  a1.start_time as rdv1_start,
  a1.end_time as rdv1_end,
  a2.start_time as rdv2_start,
  a2.end_time as rdv2_end
FROM appointments a1
JOIN appointments a2 ON a1.practitioner_id = a2.practitioner_id
  AND a1.id != a2.id
  AND a1.start_time < a2.end_time
  AND a1.end_time > a2.start_time
WHERE a1.status = 'confirmed'
  AND a2.status = 'confirmed'
ORDER BY a1.start_time;
```

## Support

En cas de problème :
1. Vérifier les logs du webhook Stripe
2. Vérifier les logs de l'application
3. Exécuter les requêtes SQL de vérification
4. Vérifier que la migration a bien été appliquée : `SELECT routine_name FROM information_schema.routines WHERE routine_name LIKE '%suspend%';`
