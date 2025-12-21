# Debug : Système de messagerie pour les rendez-vous

## Problème identifié et corrigé

### ❌ Problème 1 : Intervenant utilisait le mauvais sender_type
**Cause** : La fonction `createAppointmentMessage` vérifiait `profile.user_type === 'practitioner'` alors que dans votre système c'est `'intervenant'`

**Conséquence** : Les messages de l'intervenant étaient créés avec `sender_type = 'user'` au lieu de `sender_type = 'admin'`, ce qui affectait la visibilité et le marquage des messages comme lus.

**Correction** :
```typescript
// AVANT
actualSenderType = profile?.user_type === 'admin' || profile?.user_type === 'practitioner'
  ? 'admin'
  : 'user';

// APRÈS
actualSenderType = profile?.user_type === 'admin' || profile?.user_type === 'intervenant'
  ? 'admin'
  : 'user';
```

### ✅ Problème 2 : Politique RLS ne permettait pas de voir les messages de l'autre partie
**Cause** : La politique SELECT vérifiait seulement `user_id = auth.uid()`, ce qui ne permettait de voir que SES propres messages

**Correction** : La politique vérifie maintenant si l'utilisateur est :
- Le client du rendez-vous (`appointments.client_id = auth.uid()`)
- L'intervenant du rendez-vous (via `practitioners.user_id = auth.uid()`)

## Comment vérifier que tout fonctionne

### Test 1 : Vérifier le type de données dans la table

Exécutez dans le SQL Editor de Supabase :
```sql
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'messages'
  AND column_name IN ('reference_id', 'reference_type', 'user_id', 'category', 'sender_type');
```

**Attendu** :
- `reference_id` : `text` ou `character varying`
- `reference_type` : `text` ou `character varying`
- `user_id` : `uuid`
- `category` : `text` ou type ENUM
- `sender_type` : `text` ou type ENUM

### Test 2 : Créer un message test

1. **En tant que CLIENT** :
   - Ouvrir un rendez-vous confirmé
   - Aller dans l'onglet "Messages"
   - Envoyer : "Bonjour, j'ai une question"
   - Vérifier dans la console (F12) qu'il n'y a pas d'erreur

2. **Vérifier dans la base de données** :
```sql
SELECT
  id,
  user_id,
  sender_type,
  reference_type,
  reference_id,
  category,
  message,
  read_by_user,
  read_by_admin,
  created_at
FROM messages
WHERE category = 'appointment'
ORDER BY created_at DESC
LIMIT 1;
```

**Attendu** :
- `sender_type` = `'user'`
- `category` = `'appointment'`
- `reference_type` = `'appointment'`
- `reference_id` = ID du rendez-vous (UUID sous forme de texte)
- `read_by_user` = `true`
- `read_by_admin` = `false`

3. **En tant qu'INTERVENANT** :
   - Se connecter avec le compte de l'intervenant
   - Ouvrir le même rendez-vous
   - Aller dans l'onglet "Messages"
   - **VÉRIFIER** : Le message du client doit être visible
   - Répondre : "Bonjour, je vous écoute"
   - Vérifier dans la console qu'il n'y a pas d'erreur

4. **Vérifier dans la base de données** :
```sql
SELECT
  id,
  user_id,
  sender_type,
  reference_type,
  reference_id,
  category,
  message,
  read_by_user,
  read_by_admin,
  created_at
FROM messages
WHERE category = 'appointment'
ORDER BY created_at DESC
LIMIT 2;
```

**Attendu pour le message de l'intervenant** :
- `sender_type` = `'admin'` ✅ (corrigé)
- `category` = `'appointment'`
- `reference_id` = même ID que le message du client
- `read_by_user` = `false`
- `read_by_admin` = `true`

5. **Retour au CLIENT** :
   - Rafraîchir la page
   - Ouvrir le rendez-vous > Messages
   - **VÉRIFIER** : Le message de l'intervenant doit être visible

### Test 3 : Vérifier la politique RLS

Exécutez cette requête en étant connecté en tant qu'intervenant :
```sql
-- Remplacer <appointment_id> par un vrai ID de rendez-vous
-- La requête doit retourner TOUS les messages du RDV (client + intervenant)
SELECT
  m.id,
  m.sender_type,
  m.message,
  m.created_at
FROM messages m
WHERE m.reference_type = 'appointment'
  AND m.reference_id = '<appointment_id>'
ORDER BY m.created_at ASC;
```

Si la politique fonctionne, vous devriez voir :
- Les messages avec `sender_type = 'user'` (du client)
- Les messages avec `sender_type = 'admin'` (de l'intervenant)

### Test 4 : Marquage automatique comme lu

1. **En tant que CLIENT**, envoyer un message
2. **En tant qu'INTERVENANT** :
   - Ouvrir le RDV > Messages
   - Attendre 1-2 secondes
   - Vérifier dans la BDD :
   ```sql
   SELECT read_by_admin, read_at
   FROM messages
   WHERE id = '<id_du_message_du_client>'
   ```
   **Attendu** : `read_by_admin` devrait passer à `true` après quelques secondes

## Débogage en cas de problème

### Problème : "L'intervenant ne voit pas les messages du client"

**Vérifications** :
1. La politique RLS est-elle bien créée ?
   ```sql
   SELECT policyname, cmd, qual
   FROM pg_policies
   WHERE tablename = 'messages'
     AND policyname = 'Users can view appointment messages';
   ```

2. Le `reference_id` est-il bien un UUID valide ?
   ```sql
   SELECT
     reference_id,
     reference_id::uuid as uuid_cast
   FROM messages
   WHERE category = 'appointment'
   LIMIT 1;
   ```
   Si erreur → Le `reference_id` n'est pas un UUID valide

3. La jointure fonctionne-t-elle ?
   ```sql
   SELECT
     m.id,
     m.reference_id,
     a.id as appointment_id,
     a.client_id,
     p.user_id as practitioner_user_id
   FROM messages m
   LEFT JOIN appointments a ON a.id = m.reference_id::uuid
   LEFT JOIN practitioners p ON a.practitioner_id = p.id
   WHERE m.category = 'appointment'
   LIMIT 5;
   ```
   Si `appointment_id` est NULL → Problème de jointure

### Problème : "Les messages de l'intervenant ont sender_type = 'user'"

**Vérification** :
```sql
SELECT
  m.id,
  m.sender_type,
  pr.user_type
FROM messages m
JOIN profiles pr ON m.user_id = pr.id
WHERE m.category = 'appointment'
  AND pr.user_type = 'intervenant';
```

**Attendu** : `sender_type` devrait être `'admin'`

Si `sender_type = 'user'` → Le code TypeScript n'a pas été mis à jour ou le profil a un autre `user_type`

### Problème : "Erreur de type UUID lors de la création"

Si vous voyez une erreur comme "invalid input syntax for type uuid", vérifiez :
1. Que `appointmentId` est bien un UUID valide (format : `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)
2. Que la table `messages.reference_id` accepte les UUID en format texte

## Résumé des fichiers modifiés

1. ✅ `supabase/migrations/20251221_add_appointment_message_category.sql`
   - Politique RLS SELECT corrigée pour permettre aux deux parties de voir tous les messages

2. ✅ `src/services/messaging.ts`
   - Correction de `'practitioner'` → `'intervenant'` pour déterminer le sender_type

3. ✅ `src/components/messages/MessagesPanel.tsx`
   - Correction de l'import : `contexts` → `context`

## Points de vigilance

1. **Type de user_type dans profiles** :
   - Admin : `'admin'`
   - Intervenant : `'intervenant'` (pas `'practitioner'`)
   - Client : `'client'`

2. **Type de sender_type dans messages** :
   - Messages du client : `'user'`
   - Messages de l'intervenant : `'admin'`
   - Messages système : `'system'`

3. **Champs de lecture** :
   - Client lit : `read_by_user`
   - Intervenant/Admin lit : `read_by_admin`
