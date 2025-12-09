# Système d'envoi d'emails de réponse aux messages de contact

## Vue d'ensemble

Ce système permet aux administrateurs de répondre aux messages de contact directement depuis l'interface admin, et envoie automatiquement un email à l'utilisateur avec la réponse.

## Composants

### 1. Fonction Edge Supabase

**Fichier**: `supabase/functions/send-contact-response/index.ts`

Cette fonction Edge:
- Vérifie l'authentification de l'utilisateur (doit être admin)
- Récupère le message de contact depuis la base de données
- Crée un email HTML formaté avec le message original et la réponse
- Envoie l'email via Resend
- Retourne une confirmation de l'envoi

**Endpoint**: `https://[PROJECT_URL]/functions/v1/send-contact-response`

**Paramètres**:
```json
{
  "messageId": "uuid-du-message",
  "response": "Texte de la réponse"
}
```

**Authentification**: Requiert un token Bearer d'un utilisateur admin

### 2. Interface Admin

**Fichier**: `src/pages/Admin/ContactMessagesPage.tsx`

L'interface permet:
- De visualiser tous les messages de contact
- De filtrer par statut (nouveau, en cours, répondu)
- De voir les détails d'un message
- De rédiger une réponse
- D'envoyer la réponse par email automatiquement

**Fonction modifiée**: `handleSendResponse`
- Met à jour le message dans la base de données (statut, réponse, date)
- Appelle la fonction Edge pour envoyer l'email
- Gère les erreurs et affiche les messages appropriés

## Configuration requise

### Variables d'environnement Supabase

Les variables suivantes doivent être configurées dans les secrets Supabase:

- `SUPABASE_URL`: URL de votre projet Supabase
- `SUPABASE_SERVICE_ROLE_KEY`: Clé de rôle service de Supabase
- `RESEND_API_KEY`: Clé API Resend pour l'envoi d'emails

### Configurer les variables

```bash
# Depuis le dashboard Supabase
# Project Settings > Edge Functions > Manage secrets

# Ou via CLI
npx supabase secrets set RESEND_API_KEY=re_xxxxxxxxx
```

## Déploiement

Pour déployer la fonction Edge:

```bash
npx supabase@latest functions deploy send-contact-response
```

## Format de l'email envoyé

L'email envoyé contient:
- **Header**: Design avec gradient bleu FL²M
- **Greeting**: Salutation personnalisée avec nom du destinataire
- **Message original**: Rappel du message envoyé par l'utilisateur
- **Réponse**: La réponse de l'administrateur dans un encadré bleu
- **Footer**: Signature de l'équipe FL²M avec lien vers le site

**Détails**:
- **From**: `FL2M Services <contact@fl2m.fr>`
- **Reply-To**: `contact@fl2m.fr`
- **Subject**: `Re: [Sujet original]`

## Flux de travail

1. Un utilisateur envoie un message via le formulaire de contact
2. Le message apparaît dans l'admin avec le statut "Nouveau"
3. L'admin ouvre le message et clique sur "Répondre"
4. L'admin rédige sa réponse dans le champ texte
5. L'admin clique sur "Envoyer la réponse"
6. Le système:
   - Met à jour le statut du message à "répondu"
   - Enregistre la réponse et la date
   - Appelle la fonction Edge pour envoyer l'email
   - Affiche une confirmation ou une erreur
7. L'utilisateur reçoit l'email de réponse à son adresse

## Gestion des erreurs

Le système gère plusieurs types d'erreurs:

- **Authentification**: Vérifie que l'utilisateur est connecté et est admin
- **Message non trouvé**: Vérifie que le message existe
- **Erreur d'envoi email**: Capture les erreurs de l'API Resend
- **Erreur réseau**: Gère les problèmes de connexion

Toutes les erreurs sont affichées à l'utilisateur via une Alert Material-UI.

## Logs

Les logs sont disponibles dans:
- **Console navigateur**: Logs de l'interface admin
- **Supabase Dashboard**: Logs de la fonction Edge
  - Project > Edge Functions > send-contact-response > Logs

## Tests

Pour tester la fonctionnalité:

1. Créer un message de contact de test dans la base de données
2. Se connecter en tant qu'admin
3. Aller sur la page "Messages de contact"
4. Sélectionner le message de test
5. Cliquer sur "Répondre"
6. Rédiger une réponse et envoyer
7. Vérifier la réception de l'email

## Sécurité

- Seuls les administrateurs peuvent envoyer des réponses
- La vérification du rôle est faite côté serveur dans la fonction Edge
- Les tokens d'authentification sont requis pour toutes les opérations

## Intégration avec Resend

Resend est le service d'emailing utilisé. Configuration:

- **Domaine vérifié**: `fl2m.fr`
- **Email expéditeur**: `contact@fl2m.fr`
- **API**: https://api.resend.com/emails

Pour vérifier votre domaine et configurer Resend:
1. Aller sur https://resend.com/domains
2. Ajouter `fl2m.fr` et configurer les enregistrements DNS
3. Générer une clé API et l'ajouter aux secrets Supabase

## Notes importantes

- Les réponses sont stockées dans la base de données même si l'envoi d'email échoue
- Le statut du message passe à "répondu" après l'envoi
- Les contestations ont un traitement spécial (voir `EMAIL_CONTESTATION_SETUP.md`)
- Le format HTML de l'email est responsive et s'adapte aux mobiles

## Améliorations futures possibles

- Ajouter des templates de réponses pré-remplies
- Permettre des pièces jointes dans les réponses
- Ajouter un système de suivi des conversations
- Implémenter des notifications pour les nouveaux messages
- Ajouter des statistiques sur les temps de réponse
