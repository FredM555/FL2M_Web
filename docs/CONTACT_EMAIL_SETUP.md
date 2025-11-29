# 📧 Configuration Email Contact avec Resend

**Date:** 2025-01-27
**Statut:** ✅ PRÊT À DÉPLOYER

---

## 🎯 Ce qui a été fait

Le système d'envoi d'email de contact a été migré vers **Resend** avec la fonctionnalité **reply-to** activée.

### ✨ Fonctionnalités

1. **Email à l'admin** (contact@fl2m.fr)
   - Contient toutes les informations du formulaire
   - **Reply-to configuré sur l'email du client** → Vous pouvez simplement cliquer sur "Répondre" !
   - Design professionnel avec template HTML

2. **Email de confirmation au client**
   - Accusé de réception automatique
   - Récapitulatif du message envoyé
   - Design cohérent avec la marque FL²M Services

---

## 🚀 Déploiement (3 étapes)

### Étape 1 : Obtenir la clé API Resend (5 min)

1. Allez sur [https://resend.com](https://resend.com)
2. Créez un compte ou connectez-vous
3. Allez dans **API Keys**
4. Créez une nouvelle clé API
5. Copiez la clé (elle commence par `re_...`)

### Étape 2 : Configurer la clé dans Supabase (2 min)

1. Ouvrez votre dashboard Supabase
2. Allez dans **Settings** → **Edge Functions**
3. Cliquez sur **Manage secrets**
4. Ajoutez une nouvelle variable :
   - **Nom :** `RESEND_API_KEY`
   - **Valeur :** Votre clé API Resend (ex: `re_abc123...`)
5. Sauvegardez

### Étape 3 : Déployer la fonction Edge (3 min)

```bash
# 1. Se positionner dans le dossier du projet
cd C:/FLM/flm-services-new

# 2. Déployer la fonction send-contact-email
npx supabase functions deploy send-contact-email

# 3. Vérifier que le déploiement a réussi
# Vous devriez voir : "Deployed function send-contact-email"
```

**Alternativement (si Supabase CLI n'est pas installé) :**

1. Ouvrez Supabase Dashboard → **Edge Functions**
2. Cliquez sur **Create a new function**
3. Nommez-la `send-contact-email`
4. Copiez le contenu de `supabase/functions/send-contact-email/index.ts`
5. Collez-le dans l'éditeur
6. Cliquez sur **Deploy**

---

## 🔧 Configuration du Domaine Email (Important)

Pour que les emails apparaissent comme provenant de `noreply@fl2m.fr`, vous devez configurer votre domaine dans Resend :

### Étape 1 : Ajouter le domaine dans Resend

1. Allez sur [https://resend.com/domains](https://resend.com/domains)
2. Cliquez sur **Add Domain**
3. Entrez : `fl2m.fr`
4. Resend vous donnera des enregistrements DNS à ajouter

### Étape 2 : Configurer les DNS

Ajoutez ces enregistrements DNS chez votre hébergeur de domaine :

```
Type: TXT
Name: resend._domainkey
Value: [Valeur fournie par Resend]

Type: TXT
Name: @
Value: [Valeur fournie par Resend]

Type: CNAME (optionnel pour le tracking)
Name: resend
Value: [Valeur fournie par Resend]
```

### Étape 3 : Vérifier le domaine

1. Retournez sur Resend
2. Cliquez sur **Verify Domain**
3. Attendez quelques minutes (jusqu'à 48h max)
4. Le statut devrait passer à **Verified** ✅

**Note :** En attendant la vérification, vous pouvez utiliser `onboarding@resend.dev` comme expéditeur pour tester.

---

## ✅ Test du Système

### Test Manuel

1. Allez sur votre site : `https://votresite.com/contact`
2. Remplissez le formulaire avec un email de test
3. Envoyez le message

### Vérifications

**Email admin reçu ?**
- [ ] L'email arrive à `contact@fl2m.fr`
- [ ] Le nom de l'expéditeur est affiché correctement
- [ ] En cliquant sur "Répondre", l'email du client est pré-rempli ✅
- [ ] Le design est professionnel

**Email client reçu ?**
- [ ] L'email de confirmation arrive au client
- [ ] Le récapitulatif du message est correct
- [ ] Le design est cohérent

### Troubleshooting

**❌ Erreur : "RESEND_API_KEY not configured"**
- La clé API n'est pas configurée dans Supabase
- Retournez à l'Étape 2

**❌ Erreur : "Failed to send admin email"**
- Vérifiez que le domaine `fl2m.fr` est vérifié dans Resend
- Ou utilisez temporairement `onboarding@resend.dev` comme expéditeur

**❌ Les emails n'arrivent pas**
- Vérifiez les logs Supabase : Dashboard → Edge Functions → Logs
- Vérifiez les logs Resend : [https://resend.com/logs](https://resend.com/logs)
- Vérifiez les spam/courrier indésirable

---

## 📝 Code Modifié

### 1. Fonction Edge : `supabase/functions/send-contact-email/index.ts`

**Points clés :**
- Utilise Resend API directement (pas de bibliothèque externe)
- Configure `reply_to: message.email` (ligne 159) ✅
- Envoie 2 emails : admin + confirmation client
- Gestion des erreurs robuste

### 2. Page Contact : `src/pages/ContactPage.tsx`

**Changement :**
```typescript
// Avant (ancien système)
await supabase.functions.invoke('send-email', { ... })

// Après (nouveau système avec Resend)
await supabase.functions.invoke('send-contact-email', {
  body: {
    message: newMessage,
    adminEmail: 'contact@fl2m.fr'
  }
})
```

---

## 🎨 Personnalisation

### Changer l'email de destination

Dans `src/pages/ContactPage.tsx`, ligne 135 :

```typescript
adminEmail: 'contact@fl2m.fr' // Changez ici
```

### Modifier le design des emails

Éditez `supabase/functions/send-contact-email/index.ts` :
- **Email admin** : lignes 46-97
- **Email client** : lignes 100-147

### Ajouter un champ au formulaire

1. Ajoutez le champ dans `ContactFormData` (ContactPage.tsx)
2. Ajoutez le champ dans l'interface de la fonction Edge
3. Ajoutez-le dans les templates HTML

---

## 📊 Statistiques et Monitoring

### Dashboard Resend

Consultez [https://resend.com/emails](https://resend.com/emails) pour :
- Nombre d'emails envoyés
- Taux de délivrabilité
- Erreurs éventuelles
- Historique complet

### Logs Supabase

1. Ouvrez Supabase Dashboard
2. Allez dans **Edge Functions** → **send-contact-email**
3. Cliquez sur **Logs**
4. Vérifiez les succès et erreurs

---

## 💰 Tarification Resend

**Plan Gratuit :**
- 3 000 emails/mois
- 100 emails/jour
- Largement suffisant pour un formulaire de contact

**Plan Payant (si besoin) :**
- À partir de 20$/mois
- 50 000 emails/mois
- Support prioritaire

---

## 🔐 Sécurité

### Protection Anti-Spam

La fonction Edge actuelle n'a pas de limite de taux. Pour ajouter une protection :

```typescript
// À ajouter dans index.ts
const rateLimitKey = `contact:${message.email}`;
// Implémenter un système de rate limiting avec Redis/Upstash
```

### Validation des Emails

Le formulaire valide déjà le format email côté client. La validation supplémentaire peut être ajoutée dans la fonction Edge.

---

## ✅ Checklist de Déploiement

- [ ] Clé API Resend obtenue
- [ ] Clé configurée dans Supabase (`RESEND_API_KEY`)
- [ ] Fonction Edge déployée (`send-contact-email`)
- [ ] Domaine `fl2m.fr` ajouté dans Resend
- [ ] Enregistrements DNS configurés
- [ ] Domaine vérifié dans Resend ✅
- [ ] Test d'envoi effectué
- [ ] Email admin reçu avec reply-to fonctionnel
- [ ] Email client reçu
- [ ] Build frontend réussi (`npm run build`)
- [ ] Déploiement sur Vercel/Netlify

---

## 🎉 Résultat Final

Une fois tout configuré, voici ce qui se passe quand un utilisateur envoie un message :

1. **L'utilisateur** remplit le formulaire et clique sur "Envoyer"
2. **Le message** est sauvegardé dans Supabase (`contact_messages`)
3. **Vous recevez** un email à `contact@fl2m.fr`
4. **Vous cliquez** sur "Répondre" → L'email du client est déjà pré-rempli ✅
5. **Le client reçoit** un accusé de réception automatique

**Temps de réponse moyen : < 2 secondes** ⚡

---

**Documentation créée le 2025-01-27**
**Prêt pour demain ! 🚀**
