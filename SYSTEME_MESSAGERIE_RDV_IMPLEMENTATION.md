# Système de messagerie pour les rendez-vous - Implémentation terminée

## Vue d'ensemble

Le système de messagerie unifié a été implémenté avec succès. Il permet maintenant d'avoir des conversations directes liées aux rendez-vous, en utilisant la table `messages` existante avec une nouvelle catégorie `'appointment'`.

## Fonctionnalités implémentées

### 1. Composant MessagesPanel réutilisable

**Fichier**: `src/components/messages/MessagesPanel.tsx`

Composant générique qui affiche :
- Liste des messages avec avatar, nom, date et contenu
- Champ de saisie pour envoyer un nouveau message
- Badge pour le nombre de messages non lus
- Marquage automatique des messages comme lus
- Support pour les messages de rendez-vous ET les threads généraux

**Utilisation**:
```tsx
<MessagesPanel
  appointmentId={appointment.id}
  userType="client" // ou "practitioner"
  onMessageSent={() => {}}
/>
```

### 2. Intégration dans AppointmentDetailsDialog

**Fichier**: `src/components/appointments/AppointmentDetailsDialog.tsx`

Un nouvel onglet "Messages" a été ajouté à la modale de détails du rendez-vous :
- Position : 6ème onglet (après Bénéficiaire, Intervenant, Visio, Documents, Commentaires)
- Affiche le composant MessagesPanel
- Accessible au client ET à l'intervenant
- Messages visibles uniquement aux personnes concernées par le RDV

### 3. Page Messages améliorée

**Fichier**: `src/pages/MessagesPage.tsx`

La page Messages a été réorganisée avec deux onglets :

**Onglet 1 - Messages généraux** :
- Tous les messages de contact, support, facturation, etc.
- Fonctionnement identique à avant

**Onglet 2 - Rendez-vous** :
- Liste des rendez-vous confirmés/terminés/validés
- Affichage du service, date/heure, intervenant
- Sélection d'un RDV pour voir ses messages
- Utilise le composant MessagesPanel

### 4. Services de messagerie pour RDV

**Fichier**: `src/services/messaging.ts`

Nouvelles fonctions ajoutées :

```typescript
// Créer un message lié à un rendez-vous
createAppointmentMessage(appointmentId: string, message: string, senderType?: 'user' | 'admin' | 'system')

// Récupérer tous les messages d'un rendez-vous
getAppointmentMessages(appointmentId: string)

// Compter les messages non lus d'un rendez-vous
countUnreadAppointmentMessages(appointmentId: string, userType: 'client' | 'practitioner')

// Marquer les messages d'un rendez-vous comme lus
markAppointmentMessagesAsRead(appointmentId: string, isAdmin: boolean)

// Récupérer la liste des rendez-vous avec messages non lus
getAppointmentsWithUnreadMessages(userType: 'client' | 'practitioner')
```

### 5. Types TypeScript mis à jour

**Fichier**: `src/types/messaging.ts`

```typescript
// Nouvelle catégorie
export type MessageCategory =
  | 'contact'
  | 'practitioner_request'
  | 'support'
  | 'billing'
  | 'technical'
  | 'appointment'  // ✅ NOUVEAU
  | 'other';

// Nouvelles fonctions helper
getMessageCategoryLabel('appointment') // → 'Rendez-vous'
getMessageCategoryColor('appointment') // → '#345995' (couleur FL2M)
getMessageCategoryIcon('appointment')  // → '📅'
```

## Migration SQL

**Fichier**: `supabase/migrations/20251221_add_appointment_message_category.sql`

### Changements apportés :

1. **Ajout de la catégorie 'appointment'** :
   ```sql
   ALTER TABLE messages
   ADD CONSTRAINT messages_category_check
   CHECK (category IN (
     'contact',
     'practitioner_request',
     'support',
     'billing',
     'technical',
     'appointment',  -- ✅ NOUVEAU
     'other'
   ));
   ```

2. **Index pour optimiser les performances** :
   ```sql
   -- Index pour les requêtes de messages de RDV
   CREATE INDEX idx_messages_appointment_ref
   ON messages(reference_type, reference_id)
   WHERE reference_type = 'appointment';

   -- Index pour les messages non lus
   CREATE INDEX idx_messages_appointment_unread
   ON messages(reference_id, read_by_user)
   WHERE reference_type = 'appointment' AND read_by_user = false;
   ```

3. **Fonctions SQL** :

   **`count_unread_appointment_messages()`** :
   - Paramètres : appointment_id, user_id, user_type
   - Compte les messages non lus pour un RDV selon le type d'utilisateur
   - Retourne : INTEGER

   **`get_appointments_with_unread_messages()`** :
   - Paramètres : user_id, user_type
   - Retourne la liste des RDV avec messages non lus
   - Retourne : TABLE(appointment_id, unread_count, last_message_at)

4. **Politiques RLS (Row Level Security)** :

   **Lecture** : Les utilisateurs peuvent voir les messages de leurs rendez-vous
   - Le client du RDV (user_id = auth.uid())
   - L'intervenant du RDV (via join avec practitioners)
   - Les admins

   **Création** : Les utilisateurs peuvent créer des messages pour leurs RDV
   - Le client envoie en tant que 'user'
   - L'intervenant envoie en tant que 'admin'
   - Les admins peuvent envoyer en tant que 'admin' ou 'system'

   **Mise à jour** : Les utilisateurs peuvent marquer les messages comme lus
   - Le client marque `read_by_user`
   - L'intervenant marque `read_by_admin`

## Comment appliquer la migration

### Option 1 : Via le Dashboard Supabase (RECOMMANDÉ)

1. Aller sur le Dashboard Supabase : https://supabase.com/dashboard
2. Sélectionner votre projet
3. Aller dans **SQL Editor**
4. Cliquer sur **New Query**
5. Copier le contenu de `supabase/migrations/20251221_add_appointment_message_category.sql`
6. Coller dans l'éditeur
7. Cliquer sur **Run** ou appuyer sur Ctrl+Enter

### Option 2 : Via psql (ligne de commande)

```bash
# Se connecter à la base de données
psql "<votre_connection_string>"

# Exécuter le fichier
\i supabase/migrations/20251221_add_appointment_message_category.sql
```

### Option 3 : Via Supabase CLI (si les migrations sont synchronisées)

```bash
npx supabase db push
```

⚠️ **Note** : Cette option peut nécessiter de résoudre les problèmes de synchronisation des migrations d'abord.

## Vérification après migration

### 1. Vérifier que la catégorie est ajoutée

```sql
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'messages_category_check';
```

Devrait afficher : `category IN ('contact', 'practitioner_request', 'support', 'billing', 'technical', 'appointment', 'other')`

### 2. Vérifier les fonctions SQL

```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_name LIKE '%appointment_message%';
```

Devrait afficher :
- `count_unread_appointment_messages`
- `get_appointments_with_unread_messages`

### 3. Vérifier les index

```sql
SELECT indexname
FROM pg_indexes
WHERE indexname LIKE '%appointment%';
```

Devrait afficher :
- `idx_messages_appointment_ref`
- `idx_messages_appointment_unread`

### 4. Vérifier les politiques RLS

```sql
SELECT policyname
FROM pg_policies
WHERE tablename = 'messages'
  AND policyname LIKE '%appointment%';
```

Devrait afficher :
- `Users can view appointment messages`
- `Users can create appointment messages`
- `Users can mark appointment messages as read`

## Utilisation

### Pour le client

1. **Via le rendez-vous** :
   - Ouvrir un rendez-vous confirmé
   - Cliquer sur l'onglet "Messages"
   - Écrire un message à l'intervenant
   - Les messages sont marqués comme lus automatiquement

2. **Via le menu Messages** :
   - Aller dans "Mes messages"
   - Cliquer sur l'onglet "Rendez-vous"
   - Sélectionner un rendez-vous dans la liste
   - Voir et répondre aux messages

### Pour l'intervenant

1. **Via le rendez-vous** :
   - Ouvrir un rendez-vous dans le planning
   - Cliquer sur l'onglet "Messages"
   - Écrire un message au client
   - Les messages sont marqués comme lus automatiquement

2. **Via le menu Messages** :
   - Aller dans "Messages"
   - Cliquer sur l'onglet "Rendez-vous"
   - Voir tous les rendez-vous avec conversations
   - Répondre aux messages

## Avantages du système

### 1. Architecture unifiée
- Une seule table `messages` pour tous les types de messages
- Pas de duplication de code
- Maintenance facilitée

### 2. Flexibilité
- Les messages peuvent être consultés depuis 2 endroits :
  - Directement dans le RDV (contexte)
  - Page Messages (vue centralisée)
- Le composant MessagesPanel est réutilisable

### 3. Sécurité
- Politiques RLS strictes
- Seuls le client, l'intervenant et les admins peuvent voir les messages d'un RDV
- Traçabilité complète (qui a envoyé quoi et quand)

### 4. UX cohérente
- Interface identique pour tous les messages
- Badge de messages non lus
- Marquage automatique comme lu
- Notifications possibles (future amélioration)

### 5. Séparation des préoccupations
- **Messages** : pour les conversations
- **Commentaires** : pour les notes/résumés professionnels du RDV
- **Notes bénéficiaire** : pour les observations cliniques

## Prochaines améliorations possibles

1. **Notifications en temps réel** :
   - Utiliser Supabase Realtime pour recevoir les nouveaux messages
   - Badge dans le menu principal

2. **Badge de messages non lus** :
   - Afficher le nombre de messages non lus sur la page d'accueil
   - Badge sur l'icône Messages dans le menu

3. **Notifications par email** :
   - Envoyer un email quand un nouveau message est reçu
   - Configurable dans les préférences utilisateur

4. **Pièces jointes** :
   - Permettre d'attacher des fichiers aux messages
   - Utiliser Supabase Storage

5. **Messages système automatiques** :
   - Message de bienvenue à la confirmation du RDV
   - Rappel 24h avant le RDV
   - Message de remerciement après le RDV

## Fichiers modifiés/créés

### Créés
- `src/components/messages/MessagesPanel.tsx`
- `supabase/migrations/20251221_add_appointment_message_category.sql`
- `SYSTEME_MESSAGERIE_RDV_IMPLEMENTATION.md` (ce fichier)

### Modifiés
- `src/types/messaging.ts`
- `src/services/messaging.ts`
- `src/components/appointments/AppointmentDetailsDialog.tsx`
- `src/pages/MessagesPage.tsx`

## Support

En cas de problème :
1. Vérifier que la migration a bien été appliquée (voir section "Vérification")
2. Vérifier les logs du navigateur (F12 > Console)
3. Vérifier les logs Supabase (Dashboard > Logs)
4. Vérifier que les politiques RLS sont actives

---

✅ **Implémentation terminée avec succès !**

Le système de messagerie pour les rendez-vous est maintenant prêt à être utilisé. Il ne reste plus qu'à appliquer la migration SQL sur Supabase.
