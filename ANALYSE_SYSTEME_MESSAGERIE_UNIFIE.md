# Analyse : Système de messagerie unifié avec support des rendez-vous

## 📊 État actuel du système

### Table `messages` existante

La table `messages` existe déjà et supporte :

```typescript
interface Message {
  // Identifiants et hiérarchie
  id: string;
  thread_id: string | null;        // Groupe la conversation
  parent_id: string | null;         // Permet les réponses
  user_id: string | null;           // Utilisateur authentifié (NULL pour public)

  // Données publiques (formulaire contact)
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;

  // Contenu
  subject: string | null;
  message: string;

  // Classification
  category: MessageCategory;        // contact, practitioner_request, support, billing, technical, other
  sender_type: SenderType;          // public, user, admin, system
  status: MessageStatus;            // new, read, responded, closed

  // Référence optionnelle ⭐ CLÉ POUR LES RDV
  reference_type: string | null;    // 'appointment'
  reference_id: string | null;      // ID du rendez-vous

  // Lecture
  read_by_user: boolean;
  read_by_admin: boolean;
  read_at: string | null;

  // Pièces jointes
  attachments: JSONB | null;

  // Audit
  created_at: string;
  updated_at: string;
}
```

### Fonctionnalités existantes

✅ **Déjà implémenté :**
- Threads de conversation (regroupement par `thread_id`)
- Réponses en arborescence (`parent_id`)
- Comptage des messages non lus
- Vue agrégée `message_threads`
- Trigger auto pour `thread_id`
- RLS (Row Level Security)
- Fonctions SQL : `count_unread_messages()`, `count_unread_threads()`

## 🎯 Solution proposée : Ajouter 'appointment' comme catégorie

### Modification minimale requise

**1. Ajouter la catégorie 'appointment'**

```sql
-- Migration: Ajouter 'appointment' aux catégories de messages
ALTER TABLE messages
DROP CONSTRAINT IF EXISTS messages_category_check;

ALTER TABLE messages
ADD CONSTRAINT messages_category_check
CHECK (category IN (
  'contact',
  'practitioner_request',
  'support',
  'billing',
  'technical',
  'appointment',  -- ⭐ NOUVEAU
  'other'
));
```

**2. Mettre à jour les types TypeScript**

```typescript
export type MessageCategory =
  | 'contact'
  | 'practitioner_request'
  | 'support'
  | 'billing'
  | 'technical'
  | 'appointment'  // ⭐ NOUVEAU
  | 'other';
```

**C'est tout !** 🎉

## 🏗️ Architecture unifiée

### Schéma conceptuel

```
┌─────────────────────────────────────────────────┐
│                 Table: messages                  │
├─────────────────────────────────────────────────┤
│                                                 │
│  Thread 1 (Contact général)                    │
│  ├─ category: 'contact'                         │
│  ├─ reference_type: null                        │
│  └─ reference_id: null                          │
│                                                 │
│  Thread 2 (Support)                             │
│  ├─ category: 'support'                         │
│  ├─ reference_type: null                        │
│  └─ reference_id: null                          │
│                                                 │
│  Thread 3 (RDV #123) ⭐                         │
│  ├─ category: 'appointment'                     │
│  ├─ reference_type: 'appointment'               │
│  ├─ reference_id: '123'                         │
│  ├─ Message 1: "Bonjour, comment accéder..."   │
│  ├─ Message 2: "Voici le lien: ..."            │
│  └─ Message 3: "Merci !"                       │
│                                                 │
│  Thread 4 (RDV #456) ⭐                         │
│  ├─ category: 'appointment'                     │
│  ├─ reference_type: 'appointment'               │
│  ├─ reference_id: '456'                         │
│  └─ ...                                         │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Flux de données

```
CLIENT                    TABLE MESSAGES              INTERVENANT
  │                             │                          │
  │  1. Depuis RDV             │                          │
  │────"Question sur le RDV"──>│                          │
  │  category='appointment'    │                          │
  │  reference_id='rdv-123'    │                          │
  │                            │                          │
  │                            │  2. Visible dans         │
  │                            │     Menu Messages        │
  │                            │<─────(filtre: user)──────│
  │                            │                          │
  │                            │  3. Réponse              │
  │                            │<─────"Voici le lien"─────│
  │                            │  parent_id=msg_1_id      │
  │                            │                          │
  │  4. Notification           │                          │
  │<────Badge (1 non lu)───────│                          │
  │                            │                          │
  │  5. Visible aussi dans     │                          │
  │     l'onglet Messages      │                          │
  │     du RDV                 │                          │
  │<───(filtre: ref_id)────────│                          │
  │                            │                          │
```

## ✅ Avantages de l'approche unifiée

### 1. **Une seule source de vérité**

| Aspect | Table unique `messages` | Tables séparées |
|--------|------------------------|-----------------|
| Maintenance | ✅ 1 schéma à gérer | ❌ 2 schémas à synchroniser |
| Cohérence | ✅ Garantie | ⚠️ Risque de divergence |
| Requêtes | ✅ Simples avec filtres | ❌ JOINs multiples |
| Code | ✅ Réutilisation max | ❌ Code dupliqué |

### 2. **Visibilité unifiée**

```typescript
// ✅ UN SEUL composant pour tous les messages
<MessagesPage>
  {/* Filtre automatique selon le contexte */}
  <MessagesList
    filter={{ user_id: currentUserId }}
    // Affiche TOUS les messages de l'utilisateur
    // - Contact
    // - Support
    // - RDV #123
    // - RDV #456
  />
</MessagesPage>

// ✅ Même composant dans le RDV
<AppointmentDetailsDialog>
  <Tab label="Messages">
    <MessagesList
      filter={{
        reference_type: 'appointment',
        reference_id: appointmentId
      }}
      // N'affiche que les messages de CE RDV
    />
  </Tab>
</AppointmentDetailsDialog>
```

### 3. **Réponse depuis n'importe où**

```
Scénario:
1. Client envoie un message depuis RDV #123
   "Je ne trouve pas le lien Zoom"

2. Intervenant voit le message dans:
   - ✅ Menu Messages général (onglet "Messages")
   - ✅ Onglet Messages du RDV #123

3. Intervenant répond depuis Menu Messages
   "Voici le lien: ..."

4. Réponse visible dans:
   - ✅ Menu Messages du client
   - ✅ Onglet Messages du RDV #123
```

### 4. **Historique centralisé**

```sql
-- Voir TOUS les échanges avec un client
SELECT *
FROM messages
WHERE user_id = 'client-123'
ORDER BY created_at DESC;

-- Résultat:
-- - 3 messages de support
-- - 5 messages RDV #123
-- - 2 messages RDV #456
-- - 1 message de facturation
```

### 5. **Notifications intelligentes**

```typescript
// Une seule logique de notification
const unreadCount = await supabase.rpc('count_unread_messages', {
  p_user_id: userId
});

// Badge global: "5 messages non lus"
// Détail:
// - 2 dans Support
// - 3 dans RDV #123
```

## 🎨 Implémentation UI

### Interface Menu Messages (existant à adapter)

```tsx
<MessagesPage>
  <Tabs>
    <Tab label="Tous">
      {/* Tous les messages de l'utilisateur */}
      <MessagesList filter={{ user_id: currentUserId }} />
    </Tab>

    <Tab label="Rendez-vous" badge={appointmentMsgsCount}>
      {/* Filtré par category='appointment' */}
      <MessagesList
        filter={{
          user_id: currentUserId,
          category: 'appointment'
        }}
        groupBy="reference_id"  // Grouper par RDV
      />
    </Tab>

    <Tab label="Support">
      <MessagesList
        filter={{
          user_id: currentUserId,
          category: 'support'
        }}
      />
    </Tab>
  </Tabs>
</MessagesPage>
```

### Affichage groupé pour les RDV

```tsx
// Dans l'onglet "Rendez-vous"
{threads
  .filter(t => t.category === 'appointment')
  .map(thread => {
    const appointment = thread.reference_id;

    return (
      <ThreadCard
        key={thread.thread_id}
        title={`RDV avec ${appointment.practitioner.name}`}
        subtitle={`${formatDate(appointment.start_time)} - ${appointment.service.name}`}
        unreadCount={thread.unread_count_user}
        lastMessage={thread.last_message_at}
        onClick={() => openThread(thread.thread_id)}
      />
    );
  })
}
```

### Interface dans le RDV

```tsx
<AppointmentDetailsDialog>
  <Tabs>
    <Tab label="Détails" />

    <Tab label="Messages" badge={unreadCount}>
      {/* Composant réutilisé ! */}
      <MessagesPanel
        filter={{
          reference_type: 'appointment',
          reference_id: appointmentId
        }}
        context="appointment"  // Pour UI spécifique si besoin
      />
    </Tab>

    <Tab label="Notes" />
    <Tab label="Bénéficiaires" />
    <Tab label="Documents" />
  </Tabs>
</AppointmentDetailsDialog>
```

## 📝 Comparaison avec les Notes

| Aspect | Messages | Notes |
|--------|----------|-------|
| **Nature** | Conversation bidirectionnelle | Résumé professionnel |
| **Quand** | Avant, pendant, après RDV | Après RDV |
| **Qui écrit** | Client ET Intervenant | Intervenant uniquement |
| **Visibilité** | Les deux parties | Configurable (privé/visible client) |
| **Notifications** | Oui, temps réel | Non |
| **Format** | Chat conversationnel | Note structurée |
| **Exemples** | "Lien Zoom ?", "Je suis en retard" | "Diagnostic: ...", "Recommandations: ..." |
| **Stockage** | Table `messages` | Table `beneficiary_notes` (existante) |

## 🔧 Service layer

```typescript
// src/services/messaging.ts

/**
 * Créer un message pour un rendez-vous
 */
export const createAppointmentMessage = async (
  appointmentId: string,
  message: string,
  userId: string
): Promise<{ data: Message | null; error: any }> => {
  try {
    // Créer un nouveau thread ou réutiliser l'existant
    const { data: existingThread } = await supabase
      .from('messages')
      .select('thread_id')
      .eq('reference_type', 'appointment')
      .eq('reference_id', appointmentId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    const { data, error } = await supabase
      .from('messages')
      .insert({
        thread_id: existingThread?.thread_id || undefined, // Auto-généré si null
        user_id: userId,
        message: message,
        category: 'appointment',
        sender_type: 'user',
        status: 'new',
        reference_type: 'appointment',
        reference_id: appointmentId,
        read_by_user: true,  // L'expéditeur a "lu" son propre message
        read_by_admin: false
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    logger.error('Erreur création message RDV:', error);
    return { data: null, error };
  }
};

/**
 * Récupérer les messages d'un rendez-vous
 */
export const getAppointmentMessages = async (
  appointmentId: string
): Promise<{ data: Message[] | null; error: any }> => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!user_id(
          id,
          first_name,
          last_name,
          email,
          user_type
        )
      `)
      .eq('reference_type', 'appointment')
      .eq('reference_id', appointmentId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    logger.error('Erreur récupération messages RDV:', error);
    return { data: null, error };
  }
};

/**
 * Compter les messages non lus pour un RDV
 */
export const countUnreadAppointmentMessages = async (
  appointmentId: string,
  userId: string,
  userType: 'client' | 'practitioner'
): Promise<number> => {
  try {
    const readField = userType === 'client' ? 'read_by_user' : 'read_by_admin';
    const senderTypeFilter = userType === 'client'
      ? ['admin', 'system']  // Messages envoyés PAR l'admin/intervenant
      : ['user'];             // Messages envoyés PAR le client

    const { count, error } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('reference_type', 'appointment')
      .eq('reference_id', appointmentId)
      .in('sender_type', senderTypeFilter)
      .eq(readField, false);

    if (error) throw error;
    return count || 0;
  } catch (error) {
    logger.error('Erreur comptage messages non lus RDV:', error);
    return 0;
  }
};
```

## 🚀 Migration et déploiement

### Étape 1 : Migration SQL

```sql
-- supabase/migrations/20251221_add_appointment_message_category.sql

-- 1. Ajouter la catégorie 'appointment'
ALTER TABLE messages
DROP CONSTRAINT IF EXISTS messages_category_check;

ALTER TABLE messages
ADD CONSTRAINT messages_category_check
CHECK (category IN (
  'contact',
  'practitioner_request',
  'support',
  'billing',
  'technical',
  'appointment',
  'other'
));

-- 2. Créer un index pour les messages de RDV
CREATE INDEX IF NOT EXISTS idx_messages_appointment_ref
ON messages(reference_type, reference_id)
WHERE reference_type = 'appointment';

-- 3. Mettre à jour la vue message_threads si nécessaire
-- (La vue existante fonctionne déjà !)

-- Commentaire
COMMENT ON CONSTRAINT messages_category_check ON messages IS
'Catégories de messages incluant appointment pour les messages liés aux rendez-vous';
```

### Étape 2 : Types TypeScript

```typescript
// src/types/messaging.ts

export type MessageCategory =
  | 'contact'
  | 'practitioner_request'
  | 'support'
  | 'billing'
  | 'technical'
  | 'appointment'  // ⭐ AJOUTÉ
  | 'other';

// Fonction helper mise à jour
export function getMessageCategoryLabel(category: MessageCategory): string {
  const labels: Record<MessageCategory, string> = {
    contact: 'Contact',
    practitioner_request: 'Demande d\'intervenant',
    support: 'Support',
    billing: 'Facturation',
    technical: 'Problème technique',
    appointment: 'Rendez-vous',  // ⭐ AJOUTÉ
    other: 'Autre'
  };
  return labels[category];
}
```

### Étape 3 : Composants UI

**Créer le composant réutilisable :**

```typescript
// src/components/messages/MessagesPanel.tsx
interface MessagesPanelProps {
  filter: {
    user_id?: string;
    category?: MessageCategory;
    reference_type?: string;
    reference_id?: string;
  };
  context?: 'general' | 'appointment';
  showHeader?: boolean;
}

export const MessagesPanel: React.FC<MessagesPanelProps> = ({
  filter,
  context = 'general',
  showHeader = true
}) => {
  // Logique de messagerie réutilisable
  // - Affichage des messages
  // - Input pour nouveau message
  // - Notifications temps réel via Supabase realtime
  // - Marquage comme lu
};
```

**Utilisation dans le RDV :**

```typescript
// src/components/appointments/AppointmentDetailsDialog.tsx
<Tab label="Messages" badge={unreadMessagesCount}>
  <MessagesPanel
    filter={{
      reference_type: 'appointment',
      reference_id: appointment.id
    }}
    context="appointment"
  />
</Tab>
```

## 📊 Requêtes SQL utiles

### Voir tous les messages d'un RDV

```sql
SELECT
  m.*,
  p.first_name || ' ' || p.last_name as sender_name,
  p.user_type
FROM messages m
LEFT JOIN profiles p ON m.user_id = p.id
WHERE m.reference_type = 'appointment'
  AND m.reference_id = '<appointment_id>'
ORDER BY m.created_at ASC;
```

### Compter les RDV avec messages non lus

```sql
SELECT
  m.reference_id as appointment_id,
  COUNT(*) as unread_count
FROM messages m
WHERE m.reference_type = 'appointment'
  AND m.category = 'appointment'
  AND m.read_by_user = false
  AND m.sender_type IN ('admin', 'system')
  AND m.user_id = '<user_id>'
GROUP BY m.reference_id;
```

### Dernière activité de messagerie par RDV

```sql
SELECT
  a.id,
  a.start_time,
  s.name as service_name,
  COUNT(DISTINCT m.id) as message_count,
  MAX(m.created_at) as last_message_at
FROM appointments a
LEFT JOIN services s ON a.service_id = s.id
LEFT JOIN messages m ON m.reference_type = 'appointment'
  AND m.reference_id = a.id::text
WHERE a.practitioner_id = '<practitioner_id>'
  AND a.status = 'confirmed'
GROUP BY a.id, a.start_time, s.name
HAVING COUNT(DISTINCT m.id) > 0
ORDER BY MAX(m.created_at) DESC;
```

## ⚡ Notifications en temps réel

```typescript
// Écouter les nouveaux messages d'un RDV
const subscription = supabase
  .channel('appointment_messages')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `reference_id=eq.${appointmentId}`
    },
    (payload) => {
      console.log('Nouveau message RDV:', payload.new);
      // Mettre à jour l'UI
      // Afficher une notification
    }
  )
  .subscribe();
```

## 🎯 Recommandation finale

### ✅ UTILISEZ la table `messages` unifiée

**Pourquoi ?**

1. ✅ **Déjà existante** - Infrastructure complète en place
2. ✅ **Bien conçue** - Supporte threads, réponses, références
3. ✅ **Économie de code** - Réutilisation maximale
4. ✅ **UX cohérente** - Même interface pour tous les messages
5. ✅ **Maintenance facile** - Un seul système à maintenir
6. ✅ **Évolutif** - Facilement extensible (ajouter d'autres types)

**Modifications requises :**
- ✅ Ajouter 'appointment' à la contrainte de catégorie (1 ligne SQL)
- ✅ Mettre à jour le type TypeScript (1 ligne)
- ✅ Créer index pour performance (1 ligne SQL)
- ✅ Créer composants UI réutilisables

**Temps estimé :** 2-3 heures de développement

### ❌ NE PAS créer une table séparée `appointment_messages`

Cela créerait :
- Duplication de code
- Complexité de maintenance
- Expérience utilisateur fragmentée
- Plus de bugs potentiels

## 📋 Checklist d'implémentation

- [ ] Migration SQL : Ajouter catégorie 'appointment'
- [ ] Types TS : Mettre à jour MessageCategory
- [ ] Services : Créer fonctions messaging pour RDV
- [ ] Composant : MessagesPanel réutilisable
- [ ] Intégration : Onglet Messages dans AppointmentDetailsDialog
- [ ] Menu : Onglet "Rendez-vous" dans page Messages
- [ ] Notifications : Écoute temps réel
- [ ] Tests : Scénarios client/intervenant

Voulez-vous que je commence l'implémentation ?
