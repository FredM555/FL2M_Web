# Correction : Suspension automatique des RDV concurrents

## 🔴 Problème identifié

Lorsqu'un paiement est effectué via Stripe, les rendez-vous concurrents ne sont pas annulés automatiquement.

**Erreur dans les logs** :
```
Could not find the function public.suspend_conflicting_appointments
```

## ✅ Solution

La fonction existe dans la migration mais n'a **pas été appliquée** sur la base de données.

### Étape unique : Appliquer la migration

1. Allez sur : https://supabase.com/dashboard/project/phokxjbocljahmbdkrbs/sql/new

2. Copiez-collez le contenu du fichier **`apply_suspend_function.sql`**

3. Cliquez sur **Run** (Exécuter)

4. Vérifiez que vous voyez :
   ```
   ✅ Fonction créée avec succès : reactivate_suspended_appointments
   ✅ Fonction créée avec succès : suspend_conflicting_appointments
   ```

## 🧪 Test

Après l'application de la migration :

1. **Créez 2 rendez-vous** au même créneau horaire pour le même intervenant
2. **Payez le premier** rendez-vous
3. **Vérifiez** que le deuxième passe automatiquement en `status='cancelled'`

### SQL de vérification

```sql
-- Voir les RDV annulés automatiquement
SELECT
  id,
  start_time,
  end_time,
  status,
  notes
FROM appointments
WHERE status = 'cancelled'
  AND notes LIKE '%AUTO_SUSPENDED%'
ORDER BY created_at DESC
LIMIT 10;
```

## 📋 Comment ça fonctionne

### Logique de suspension

Quand un rendez-vous est **confirmé et payé** :

1. La fonction `suspend_conflicting_appointments` est appelée
2. Elle cherche tous les RDV du même intervenant qui :
   - Se chevauchent dans le temps
   - Sont d'un **module différent** (service_id)
   - Ne sont pas déjà annulés
3. Ces RDV passent en `status='cancelled'`
4. Une note est ajoutée : `[AUTO_SUSPENDED:xxx] Suspendu automatiquement...`

### Logique de réactivation

Si le rendez-vous confirmé est **annulé** :

1. La fonction `reactivate_suspended_appointments` peut être appelée
2. Elle cherche tous les RDV annulés automatiquement par ce RDV
3. Ces RDV repassent en `status='pending'`

## ⚠️ Note importante

La suspension automatique **NE FONCTIONNE PAS** si :
- Les 2 RDV sont du **même module** (service_id identique)
  - Exemple : 2 séances du module "Adulte" → PAS de suspension
  - Raison : C'est normal d'avoir plusieurs séances du même module

Elle fonctionne si :
- Les 2 RDV sont de **modules différents**
  - Exemple : 1 séance "Adulte" + 1 séance "Couple" → Suspension ✅

## 🐛 Correction du texte de debug

✅ Le texte `[Debug: Rendez-vous payé - paid]` a été **supprimé** du fichier :
- `src/components/practitioner/PractitionerWeeklyCalendar.tsx:1412`

## 📊 Monitoring

Pour voir combien de RDV ont été suspendus automatiquement :

```sql
SELECT
  COUNT(*) as nb_rdv_suspendus,
  MIN(created_at) as premier,
  MAX(created_at) as dernier
FROM appointments
WHERE status = 'cancelled'
  AND notes LIKE '%AUTO_SUSPENDED%';
```

## 🎉 Résultat final

Après cette correction :
- ✅ Les RDV concurrents seront annulés automatiquement lors du paiement Stripe
- ✅ Le texte de debug n'apparaîtra plus
- ✅ Les logs ne montreront plus d'erreur "function not found"
