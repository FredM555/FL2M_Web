# Guide de test : Changement de bénéficiaire

## 🎯 Objectif

Tester la nouvelle fonctionnalité de changement de bénéficiaire avec les restrictions de délai.

## ✅ Prérequis

1. Avoir au moins **2 bénéficiaires** créés dans votre profil client
2. Avoir un rendez-vous existant avec un bénéficiaire

## 📋 Scénarios de test

### Test 1 : Client avec RDV dans > 48h ✅

**Contexte** :
- Vous êtes connecté en tant que **client**
- Vous avez un RDV prévu **dans 3 jours ou plus**

**Étapes** :
1. Allez dans "Mes rendez-vous"
2. Cliquez sur un rendez-vous futur (>48h)
3. Ouvrez la section "Bénéficiaires du rendez-vous"
4. Cherchez le bouton **"Changer"** (↔️ icône bleue)

**Résultat attendu** :
- ✅ Le bouton "Changer" est **visible**
- ✅ Clic sur "Changer" ouvre le dialog
- ✅ Le dialog affiche la liste de vos bénéficiaires (sauf celui actuel)
- ✅ Sélection d'un nouveau bénéficiaire + "Confirmer" → Changement réussi
- ✅ La liste se rafraîchit avec le nouveau bénéficiaire

### Test 2 : Client avec RDV dans < 48h ❌

**Contexte** :
- Vous êtes connecté en tant que **client**
- Vous avez un RDV prévu **demain ou dans < 48h**

**Option A - Créer un RDV test :**
```sql
-- Créer un RDV pour demain (SQL Editor de Supabase)
-- Remplacez les IDs par les vôtres
INSERT INTO appointments (
  client_id,
  practitioner_id,
  service_id,
  start_time,
  end_time,
  status
) VALUES (
  'VOTRE_CLIENT_ID',
  'UN_PRACTITIONER_ID',
  'UN_SERVICE_ID',
  NOW() + INTERVAL '24 hours',
  NOW() + INTERVAL '25 hours',
  'confirmed'
);
```

**Option B - Modifier un RDV existant :**
```sql
-- Changer la date d'un RDV existant pour demain
UPDATE appointments
SET
  start_time = NOW() + INTERVAL '24 hours',
  end_time = NOW() + INTERVAL '25 hours'
WHERE id = 'VOTRE_APPOINTMENT_ID';
```

**Étapes** :
1. Allez dans "Mes rendez-vous"
2. Cliquez sur le rendez-vous de demain
3. Ouvrez la section "Bénéficiaires du rendez-vous"
4. Cherchez le bouton "Changer"

**Résultat attendu** :
- ❌ Le bouton "Changer" est **masqué / invisible**
- ℹ️ Le client ne peut pas changer le bénéficiaire à moins de 48h

### Test 3 : Intervenant peut changer à tout moment ✅

**Contexte** :
- Vous êtes connecté en tant que **intervenant**
- Vous avez un RDV (peu importe le délai : 1h, 1 jour, 1 semaine)

**Étapes** :
1. Allez dans votre calendrier hebdomadaire
2. Cliquez sur n'importe quel rendez-vous
3. Ouvrez la section "Bénéficiaires du rendez-vous"
4. Cherchez le bouton "Changer"

**Résultat attendu** :
- ✅ Le bouton "Changer" est **toujours visible**
- ✅ Même pour un RDV dans 1 heure
- ✅ Le changement fonctionne sans restriction de délai

### Test 4 : Vérification des attributs préservés

**Contexte** :
- Effectuer un changement de bénéficiaire

**Avant le changement - Vérifiez les attributs :**
```sql
SELECT
  beneficiary_id,
  role,
  role_order,
  receives_notifications
FROM appointment_beneficiaries
WHERE appointment_id = 'VOTRE_APPOINTMENT_ID';
```

Notez les valeurs : `role`, `role_order`, `receives_notifications`

**Après le changement - Vérifiez que tout est préservé :**
```sql
SELECT
  beneficiary_id,
  role,
  role_order,
  receives_notifications
FROM appointment_beneficiaries
WHERE appointment_id = 'VOTRE_APPOINTMENT_ID';
```

**Résultat attendu** :
- ✅ `beneficiary_id` a changé (nouveau bénéficiaire)
- ✅ `role` est le même qu'avant
- ✅ `role_order` est le même qu'avant
- ✅ `receives_notifications` est le même qu'avant

## 🔍 Vérifications SQL

### Voir tous les bénéficiaires d'un client

```sql
SELECT
  b.id,
  b.first_name,
  b.last_name,
  b.birth_date,
  b.owner_id
FROM beneficiaries b
WHERE b.owner_id = 'VOTRE_CLIENT_ID'
ORDER BY b.last_name, b.first_name;
```

### Voir le bénéficiaire actuel d'un RDV

```sql
SELECT
  a.id as appointment_id,
  a.start_time,
  b.first_name,
  b.last_name,
  ab.role
FROM appointments a
JOIN appointment_beneficiaries ab ON ab.appointment_id = a.id
JOIN beneficiaries b ON b.id = ab.beneficiary_id
WHERE a.id = 'VOTRE_APPOINTMENT_ID';
```

### Voir le délai avant un RDV (en heures)

```sql
SELECT
  id,
  start_time,
  EXTRACT(EPOCH FROM (start_time - NOW()))/3600 as heures_avant_rdv,
  CASE
    WHEN EXTRACT(EPOCH FROM (start_time - NOW()))/3600 > 48 THEN '✅ Client peut changer'
    ELSE '❌ Client ne peut pas changer'
  END as peut_changer
FROM appointments
WHERE id = 'VOTRE_APPOINTMENT_ID';
```

## 🐛 Problèmes courants

### Le bouton "Changer" n'apparaît jamais

**Causes possibles** :
1. Le RDV est terminé (`status = 'completed'` ou `'validated'`)
2. Le RDV a plusieurs bénéficiaires (condition : `beneficiaries.length === 1`)
3. Vous n'êtes pas le propriétaire du RDV

**Solution** :
```sql
-- Vérifier le statut du RDV
SELECT
  id,
  status,
  client_id,
  start_time
FROM appointments
WHERE id = 'VOTRE_APPOINTMENT_ID';

-- Vérifier le nombre de bénéficiaires
SELECT COUNT(*) as nb_beneficiaires
FROM appointment_beneficiaries
WHERE appointment_id = 'VOTRE_APPOINTMENT_ID';
```

### Le changement échoue avec une erreur

**Causes possibles** :
1. Problème de permissions RLS
2. Le nouveau bénéficiaire n'existe pas
3. Le nouveau bénéficiaire n'appartient pas au client

**Solution** :
Ouvrez la console du navigateur (F12) et regardez l'erreur exacte.

### La liste ne se rafraîchit pas après le changement

**Solution** :
Rafraîchissez la page manuellement (F5) et vérifiez dans la base de données.

## 📊 Checklist de test complète

- [ ] **Test 1** : Client > 48h peut changer ✅
- [ ] **Test 2** : Client < 48h ne peut pas changer ❌
- [ ] **Test 3** : Intervenant peut toujours changer ✅
- [ ] **Test 4** : Attributs préservés après changement ✅
- [ ] **Test 5** : Le nouveau bénéficiaire apparaît dans la liste
- [ ] **Test 6** : L'ancien bénéficiaire n'est plus dans la liste
- [ ] **Test 7** : Le dialog affiche uniquement les bénéficiaires du client
- [ ] **Test 8** : Le bénéficiaire actuel est exclu de la liste du dialog
- [ ] **Test 9** : Le bouton "Annuler" ferme le dialog sans changer
- [ ] **Test 10** : Le bouton "Confirmer" est désactivé si aucun bénéficiaire sélectionné

## 🎉 Test réussi

Si tous les tests passent, la fonctionnalité est opérationnelle ! 🚀

## 📄 Documentation

Pour plus de détails, consultez `CHANGEMENT_BENEFICIAIRE.md`
