# Système de Messagerie FL2M Services

Ce document explique le fonctionnement du système de messagerie intégré pour permettre la communication entre les utilisateurs et les administrateurs.

## Vue d'ensemble

Le système de messagerie permet aux utilisateurs de :
- Communiquer directement avec l'administration
- Suivre leurs demandes (notamment les demandes d'intervenant)
- Recevoir des réponses et des mises à jour

## Architecture

### Tables de base de données

#### `conversations`
Regroupe les messages par sujet/thème.

**Colonnes principales** :
- `id` : UUID de la conversation
- `user_id` : Utilisateur concerné
- `subject` : Sujet de la conversation
- `category` : Type de conversation (practitioner_request, support, billing, technical, other)
- `status` : Statut (open, closed, archived)
- `reference_type` / `reference_id` : Référence optionnelle (ex: practitioner_request_id)
- `unread_count_user` : Nombre de messages non lus par l'utilisateur
- `unread_count_admin` : Nombre de messages non lus par l'admin
- `message_count` : Nombre total de messages
- `last_message_at` : Date du dernier message

#### `messages`
Les messages individuels dans chaque conversation.

**Colonnes principales** :
- `id` : UUID du message
- `conversation_id` : Référence à la conversation
- `sender_id` : Auteur du message
- `content` : Contenu du message
- `sender_type` : Type d'expéditeur (user, admin, system)
- `read_by_user` / `read_by_admin` : Statut de lecture
- `created_at` : Date de création

### Catégories de conversations

| Catégorie | Description | Icône | Couleur |
|-----------|-------------|-------|---------|
| `practitioner_request` | Demande d'intervenant | 👤 | Bleu |
| `support` | Support général | 💬 | Vert |
| `billing` | Facturation | 💰 | Orange |
| `technical` | Problème technique | 🔧 | Rouge |
| `other` | Autre | 📋 | Gris |

## Fonctionnalités

### Création automatique de conversation

Lors d'une demande d'intervenant, une conversation est automatiquement créée :

```typescript
// Dans createPractitionerRequest (supabase.ts)
await createPractitionerRequestConversation(user.id, request.id, userName);
```

La conversation est créée avec :
- **Sujet** : "Demande d'intervenant - [Nom de l'utilisateur]"
- **Catégorie** : `practitioner_request`
- **Référence** : Lien vers la demande (`practitioner_request_id`)
- **Message initial** : Message automatique de l'utilisateur

### Page Messages utilisateur

**Route** : `/messages`

**Fonctionnalités** :
- ✅ Liste des conversations avec badge de messages non lus
- ✅ Vue des messages en temps réel
- ✅ Envoi de messages
- ✅ Marquage automatique comme lu
- ✅ Fermeture/réouverture de conversation
- ✅ Interface style messagerie instantanée (WhatsApp/Messenger)

### API et services

**`src/services/messaging.ts`** expose les fonctions suivantes :

| Fonction | Description |
|----------|-------------|
| `createConversation()` | Créer une nouvelle conversation |
| `createMessage()` | Envoyer un message |
| `getUserConversations()` | Récupérer les conversations d'un utilisateur |
| `getConversationMessages()` | Récupérer les messages d'une conversation |
| `markConversationAsRead()` | Marquer les messages comme lus |
| `closeConversation()` | Fermer une conversation |
| `reopenConversation()` | Rouvrir une conversation |
| `getUnreadMessageCount()` | Compter les messages non lus |
| `createPractitionerRequestConversation()` | Créer une conversation pour une demande d'intervenant |
| `sendSystemMessage()` | Envoyer un message système |

## Installation

### 1. Appliquer la migration SQL

```bash
supabase db push
```

Ou exécutez manuellement :
```bash
psql [CONNECTION_STRING] < supabase/migrations/create_messaging_system.sql
```

### 2. Vérifier les tables

```sql
SELECT * FROM conversations LIMIT 5;
SELECT * FROM messages LIMIT 5;
```

### 3. Tester la création de conversation

Soumettez une demande d'intervenant et vérifiez qu'une conversation est créée automatiquement.

## Utilisation pour l'admin

### TODO : Vue Admin (à implémenter)

Créer une page admin pour :
- Voir toutes les conversations
- Filtrer par catégorie/statut
- Répondre aux messages
- Assigner des conversations à des admins
- Fermer/archiver des conversations

**Route suggérée** : `/admin/messages`

**Fonctionnalités suggérées** :
```typescript
// Liste des conversations avec filtres
- Filtre par catégorie
- Filtre par statut (open, closed, archived)
- Filtre par messages non lus
- Recherche par utilisateur
- Tri par date de dernier message

// Vue de conversation
- Affichage des messages
- Réponse avec sender_type='admin'
- Boutons d'action (fermer, archiver, assigner)
- Informations sur l'utilisateur
- Lien vers la référence (ex: demande d'intervenant)
```

## Messages système

Pour envoyer des messages automatiques lors d'événements :

```typescript
import { sendSystemMessage } from '../services/messaging';

// Exemple : Notifier l'utilisateur quand sa demande est approuvée
await sendSystemMessage(
  conversationId,
  `✅ Votre demande d'intervenant a été approuvée !

  Vous pouvez maintenant finaliser votre inscription en choisissant votre abonnement.`
);
```

## Notifications (à implémenter)

### Badge de messages non lus

Afficher le nombre total de messages non lus dans la navigation :

```typescript
import { getUnreadMessageCount } from '../services/messaging';

const { count } = await getUnreadMessageCount(user.id);
// Afficher <Badge badgeContent={count} color="error" />
```

### Notifications temps réel (optionnel)

Utiliser Supabase Realtime pour recevoir les nouveaux messages :

```typescript
const channel = supabase
  .channel('public:messages')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `conversation_id=eq.${conversationId}`
    },
    (payload) => {
      // Nouveau message reçu
      console.log('Nouveau message:', payload.new);
      // Mettre à jour l'UI
    }
  )
  .subscribe();
```

## Sécurité (RLS)

Les politiques Row Level Security sont en place :

**Conversations** :
- ✅ Les utilisateurs voient uniquement leurs propres conversations
- ✅ Les utilisateurs peuvent créer et mettre à jour leurs conversations
- ❌ Les utilisateurs ne peuvent pas supprimer de conversations

**Messages** :
- ✅ Les utilisateurs voient uniquement les messages de leurs conversations
- ✅ Les utilisateurs peuvent créer des messages dans leurs conversations
- ✅ Les utilisateurs peuvent mettre à jour les messages (marquage lu)
- ❌ Les utilisateurs ne peuvent pas supprimer de messages

**Admin** : Les admins ont accès à toutes les conversations et messages via le service role key.

## Exemples de code

### Créer une conversation support

```typescript
import { createConversation } from '../services/messaging';

const { data, error } = await createConversation({
  user_id: user.id,
  subject: 'Problème de connexion',
  category: 'technical',
  initial_message: 'Je n\'arrive pas à me connecter à mon compte...'
});
```

### Envoyer un message

```typescript
import { createMessage } from '../services/messaging';

const { data, error } = await createMessage({
  conversation_id: 'abc-123',
  sender_id: user.id,
  content: 'Merci pour votre réponse !',
  sender_type: 'user'
});
```

### Récupérer les conversations

```typescript
import { getUserConversations } from '../services/messaging';

const { data: conversations, error } = await getUserConversations(user.id);
```

## TODO et améliorations futures

- [ ] Page admin pour gérer les messages
- [ ] Notifications en temps réel avec Supabase Realtime
- [ ] Badge de messages non lus dans la navigation
- [ ] Pièces jointes (images, documents)
- [ ] Recherche dans les messages
- [ ] Archivage automatique des conversations closes depuis X jours
- [ ] Templates de réponses pour les admins
- [ ] Statistiques (temps de réponse moyen, nombre de conversations par catégorie, etc.)
- [ ] Email de notification pour les nouveaux messages (optionnel)
- [ ] Assignation de conversations à des admins spécifiques

## Support

Pour toute question sur le système de messagerie, consultez :
- Code source : `src/services/messaging.ts`, `src/pages/MessagesPage.tsx`
- Types : `src/types/messaging.ts`
- Migration SQL : `supabase/migrations/create_messaging_system.sql`

---

**Dernière mise à jour** : 2025-12-10
