# Migration vers un système de logs centralisé

## 📋 Résumé des changements

Ce document décrit la centralisation de tous les logs dans la table `activity_logs` pour une meilleure traçabilité.

### ✅ Ce qui a été fait

1. **Migration de `login_logs` vers `activity_logs`**
   - Données migrées automatiquement
   - Table `login_logs` supprimée
   - Vue `login_logs_view` créée pour compatibilité

2. **Intégration du logging des emails**
   - Les emails sont maintenant loggés dans `activity_logs`
   - Vue `email_logs_view` créée pour consultation
   - Logging des succès ET des échecs

3. **Nouvelles fonctions RPC créées**
   - `log_email_sent()` - Logger un email envoyé
   - `log_email_failed()` - Logger un échec d'email
   - `log_user_login()` - Logger une connexion
   - `log_error()` - Logger une erreur applicative

4. **Ajout de l'envoi d'email pour les commentaires publics**
   - Email envoyé au client quand un commentaire public est ajouté
   - Email envoyé au bénéficiaire si applicable

## 🚀 Déploiement

### Étape 1 : Appliquer la migration

```bash
# Option 1 : Via Supabase CLI (recommandé)
npx supabase db push

# Option 2 : Manuellement dans le Dashboard Supabase
# Aller dans SQL Editor et exécuter le fichier :
# supabase/migrations/20250118_centralize_logs_to_activity.sql
```

### Étape 2 : Redéployer la fonction Edge

```bash
npx supabase functions deploy send-email
```

### Étape 3 : Redéployer l'application

```bash
npm run build
# Puis déployer sur Vercel ou votre hébergeur
```

## 📊 Nouvelles vues disponibles

### 1. `email_logs_view` - Historique des emails

```sql
SELECT * FROM email_logs_view
ORDER BY created_at DESC
LIMIT 20;
```

Colonnes disponibles :
- `id`, `user_id`, `first_name`, `last_name`, `user_email`
- `recipient`, `subject`, `email_type`, `resend_id`
- `status` (sent/failed), `error_message`
- `appointment_id`, `created_at`

### 2. `login_logs_view` - Historique des connexions

```sql
SELECT * FROM login_logs_view
ORDER BY login_time DESC
LIMIT 20;
```

Colonnes disponibles :
- `id`, `user_id`, `first_name`, `last_name`, `email`, `user_type`
- `ip_address`, `user_agent`
- `country`, `city`, `region`, `latitude`, `longitude`
- `login_time`

## 📧 Types d'emails maintenant loggés

| Type d'email | Description | Déclenché par |
|--------------|-------------|---------------|
| `contact` | Message de contact + AR | Formulaire de contact |
| `confirmation` | Confirmation de RDV | Réservation d'un rendez-vous |
| `document` | Nouveau document disponible | Upload d'un document visible client |
| `comment` | Nouveau commentaire public | Ajout d'un commentaire non privé |

## 🔍 Exemples d'utilisation

### Consulter tous les emails d'un utilisateur

```typescript
import { supabase } from './services/supabase';

const { data: emails } = await supabase
  .from('email_logs_view')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false });
```

### Consulter les échecs d'envoi d'emails

```typescript
const { data: failures } = await supabase
  .from('email_logs_view')
  .select('*')
  .eq('status', 'failed')
  .order('created_at', { ascending: false });
```

### Consulter les logs de connexion avec géolocalisation

```typescript
const { data: logins } = await supabase
  .from('login_logs_view')
  .select('*')
  .not('country', 'is', null)
  .order('login_time', { ascending: false });
```

### Logger manuellement une erreur

```typescript
const { data } = await supabase.rpc('log_error', {
  p_user_id: userId,
  p_error_type: 'ValidationError',
  p_error_message: 'Email invalide',
  p_stack_trace: error.stack,
  p_entity_type: 'appointment',
  p_entity_id: appointmentId
});
```

## 🧪 Tests à effectuer

### 1. Test d'envoi d'email de contact
- [ ] Envoyer un message via le formulaire de contact
- [ ] Vérifier la réception de l'email à `contact@fl2m.fr`
- [ ] Vérifier la réception de l'AR par l'utilisateur
- [ ] Vérifier le log dans `email_logs_view`

### 2. Test de confirmation de RDV
- [ ] Réserver un rendez-vous
- [ ] Vérifier la réception de l'email de confirmation
- [ ] Vérifier le log dans `email_logs_view`

### 3. Test d'ajout de document
- [ ] Ajouter un document à un RDV (visible client)
- [ ] Vérifier la réception de l'email de notification
- [ ] Vérifier le log dans `email_logs_view`

### 4. Test d'ajout de commentaire public
- [ ] Ajouter un commentaire public sur un RDV
- [ ] Vérifier la réception de l'email
- [ ] Vérifier le log dans `email_logs_view`

### 5. Test de log de connexion
- [ ] Se connecter avec un utilisateur
- [ ] Vérifier le log dans `login_logs_view`
- [ ] Vérifier les données de géolocalisation si disponibles

## 📈 Statistiques disponibles

### Nombre d'emails par type

```sql
SELECT
  metadata->>'email_type' as email_type,
  COUNT(*) as total,
  SUM(CASE WHEN action_type = 'email_sent' THEN 1 ELSE 0 END) as sent,
  SUM(CASE WHEN action_type = 'email_failed' THEN 1 ELSE 0 END) as failed
FROM activity_logs
WHERE action_type IN ('email_sent', 'email_failed')
GROUP BY metadata->>'email_type'
ORDER BY total DESC;
```

### Connexions par jour

```sql
SELECT
  DATE(created_at) as date,
  COUNT(*) as connexions
FROM activity_logs
WHERE action_type = 'login'
GROUP BY DATE(created_at)
ORDER BY date DESC
LIMIT 30;
```

### Taux de réussite des emails

```sql
SELECT
  COUNT(CASE WHEN action_type = 'email_sent' THEN 1 END) as sent,
  COUNT(CASE WHEN action_type = 'email_failed' THEN 1 END) as failed,
  ROUND(
    COUNT(CASE WHEN action_type = 'email_sent' THEN 1 END)::numeric /
    NULLIF(COUNT(*)::numeric, 0) * 100,
    2
  ) as success_rate
FROM activity_logs
WHERE action_type IN ('email_sent', 'email_failed');
```

## 🔐 Sécurité et RGPD

Les logs contiennent des données personnelles (emails, IP, géolocalisation).

**Recommandations** :
- ✅ Les vues sont protégées par RLS (Row Level Security)
- ✅ Seuls les admins peuvent voir tous les logs
- ✅ Les utilisateurs ne voient que leurs propres logs
- ⚠️ Prévoir une politique de rétention des logs (ex: 90 jours)
- ⚠️ Informer les utilisateurs dans la politique de confidentialité

## ⚠️ Points d'attention

1. **Performance** : La table `activity_logs` va grossir rapidement
   - Prévoir une purge automatique des logs anciens
   - Créer des index si nécessaire

2. **Stockage Resend ID** : Permet de consulter les emails sur Resend
   - Utile pour le débogage
   - Conserve la traçabilité complète

3. **Erreurs de logging** : Les erreurs de logging ne bloquent jamais l'application
   - Logging en mode "best effort"
   - Erreurs loggées en console uniquement

## 📝 Prochaines étapes recommandées

1. [ ] Créer une page admin pour visualiser les logs d'emails
2. [ ] Ajouter une politique de purge automatique des logs anciens
3. [ ] Créer des alertes sur les échecs d'emails répétés
4. [ ] Ajouter un dashboard de statistiques des emails
5. [ ] Documenter dans la politique de confidentialité

## 🆘 Dépannage

### Les emails ne sont pas loggés
- Vérifier que la migration est bien appliquée
- Vérifier que la fonction `send-email` est bien redéployée
- Consulter les logs de la fonction Edge dans Supabase

### Les logs de connexion n'apparaissent pas
- Vérifier que `logUserLogin()` est bien appelé lors de la connexion
- Vérifier les permissions RPC sur `log_user_login`
- Consulter la console du navigateur pour les erreurs

### Erreur "function log_email_sent does not exist"
- La migration n'a pas été appliquée correctement
- Réexécuter le fichier de migration manuellement

## 📞 Support

En cas de problème, vérifier :
1. Les logs de la fonction Edge : `npx supabase functions logs send-email`
2. Les logs de l'application dans la console navigateur
3. La table `activity_logs` directement dans Supabase
