# Audit de Securite du Code Applicatif - FL2M Services

## Informations generales

- **Date de l'audit:** 2025-01-18
- **Auditeur:** Claude Code Security Analysis
- **Perimetre:** Code applicatif React/TypeScript + Fonctions Edge Supabase
- **Niveau:** OWASP Top 10 + Best Practices

---

## Sommaire executif

**Vulnerabilites critiques:** 2
**Vulnerabilites moyennes:** 4
**Recommandations:** 8
**Points positifs:** 5

---

## 1. VULNERABILITES CRITIQUES

### 1.1 CORS trop permissif sur les fonctions Edge

**Fichier:** `supabase/functions/stripe-create-appointment-payment/index.ts:14-17`

**Probleme:**
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',  // CRITIQUE: Autorise tous les domaines
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

**Impact:**
- Permet a n'importe quel site web d'appeler cette fonction
- Risque d'attaques CSRF (Cross-Site Request Forgery)
- Un attaquant pourrait creer un site malveillant qui declenche des paiements

**Solution:**
```typescript
// Remplacer par votre domaine de production
const allowedOrigins = [
  'https://votre-domaine.com',
  'https://www.votre-domaine.com',
  ...(Deno.env.get('ENVIRONMENT') === 'development' ? ['http://localhost:5173'] : [])
];

const corsHeaders = (origin: string | null) => {
  const isAllowed = origin && allowedOrigins.includes(origin);
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Credentials': 'true'
  };
};
```

**Priorite:** 🔴 CRITIQUE - A corriger immediatement

---

### 1.2 Absence de verification d'authentification dans certaines fonctions Edge

**Fichier:** `supabase/functions/stripe-create-appointment-payment/index.ts:19-34`

**Probleme:**
La fonction ne verifie pas si l'utilisateur qui appelle est bien authentifie et autorise a creer un paiement pour cet appointment.

```typescript
const {
  appointmentId,
  amount,
  practitionerId,
  clientId,
  description,
  successUrl,
  cancelUrl
} = await req.json();

if (!appointmentId || !amount || !practitionerId || !clientId) {
  throw new Error('Parametres manquants');
}
// MANQUE: Verification que l'utilisateur authentifie est bien clientId
```

**Impact:**
- Un utilisateur malveillant pourrait creer un paiement pour un rendez-vous qui ne lui appartient pas
- Manipulation des montants possibles
- Usurpation d'identite

**Solution:**
```typescript
// Ajouter au debut de la fonction
const authHeader = req.headers.get('Authorization');
if (!authHeader) {
  throw new Error('Non authentifie');
}

const token = authHeader.replace('Bearer ', '');
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const { data: { user }, error: authError } = await supabase.auth.getUser(token);
if (authError || !user) {
  throw new Error('Token invalide');
}

// Verifier que le clientId correspond a l'utilisateur authentifie
if (user.id !== clientId) {
  throw new Error('Non autorise: vous ne pouvez creer un paiement que pour vous-meme');
}

// Verifier que le rendez-vous appartient bien au client
const { data: appointment, error: apptError } = await supabase
  .from('appointments')
  .select('id, client_id')
  .eq('id', appointmentId)
  .eq('client_id', clientId)
  .single();

if (apptError || !appointment) {
  throw new Error('Rendez-vous non trouve ou non autorise');
}
```

**Priorite:** 🔴 CRITIQUE - A corriger immediatement

---

## 2. VULNERABILITES MOYENNES

### 2.1 Variables d'environnement exposees cote client

**Fichier:** `src/services/supabase.ts:224-225`

**Probleme:**
```typescript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
```

**Analyse:**
- L'exposition de `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` est **NORMALE** pour Supabase
- Ces cles sont concues pour etre publiques
- La securite repose sur les RLS (Row Level Security) dans Supabase

**Verification a faire:**
1. S'assurer qu'aucune cle secrete (SERVICE_ROLE_KEY, STRIPE_SECRET_KEY) n'est jamais utilisee cote client
2. Verifier que les RLS sont bien configurees sur toutes les tables sensibles

**Fichiers a verifier:**
```bash
# Rechercher les variables secretes exposees
grep -r "SERVICE_ROLE" src/
grep -r "SECRET_KEY" src/
```

**Priorite:** 🟡 MOYEN - Verification necessaire

---

### 2.2 Logs contenant des donnees sensibles

**Fichier:** `src/services/supabase.ts` (lignes multiples avec logger.debug/info)

**Probleme:**
Les logs contiennent potentiellement des donnees sensibles :
- Emails des utilisateurs
- IPs
- User agents
- Donnees de geolocalisation

**Exemples:**
```typescript
// Ligne 240
logger.debug('[GET_PROFILE] Debut recuperation profil pour utilisateur:', userId);

// Ligne 1484
const { data, error } = await supabase.rpc('log_user_login', {
  p_user_id: userId,
  p_ip_address: ipAddress || null,
  p_user_agent: userAgent || null,
  p_country: geoData?.country || null,
  p_city: geoData?.city || null,
  // ...
});
```

**Impact:**
- Fuite de donnees personnelles dans les logs
- Non-conformite RGPD potentielle
- Si les logs sont stockes indefiniment sans securite adequate

**Solution:**
1. Configurer le niveau de log en production
2. Masquer les donnees sensibles dans les logs
3. Implementer une rotation des logs
4. S'assurer que les tables de logs ont des RLS appropriees

```typescript
// Dans .env.example (deja present)
VITE_LOG_LEVEL=error  // En production, log seulement les erreurs

// Dans logger.ts, ajouter un masquage des donnees sensibles
const maskSensitiveData = (data: any) => {
  if (typeof data === 'string' && data.includes('@')) {
    // Masquer les emails: user@example.com -> u***@e***.com
    return data.replace(/(.{1})[^@]*(@[^.]*\.)/, '$1***$2***');
  }
  if (typeof data === 'object' && data !== null) {
    // Masquer les IPs, phones, etc.
    if (data.ip_address) data.ip_address = '***';
    if (data.phone) data.phone = '***';
    if (data.email) data.email = maskSensitiveData(data.email);
  }
  return data;
};
```

**Priorite:** 🟡 MOYEN - A corriger pour conformite RGPD

---

### 2.3 Pas de rate limiting sur les fonctions Edge

**Fichier:** Toutes les fonctions dans `supabase/functions/`

**Probleme:**
Aucune limitation du nombre de requetes par utilisateur/IP n'est implementee.

**Impact:**
- Attaques par force brute possibles
- Attaques DoS (Denial of Service)
- Couts eleves si un attaquant spam les fonctions

**Solution:**
Implementer un rate limiting avec Supabase Edge Functions :

```typescript
// Creer un middleware de rate limiting
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

const checkRateLimit = (identifier: string, maxRequests = 10, windowMs = 60000) => {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  if (!record || now > record.resetAt) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetAt: now + windowMs
    });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
};

// Dans chaque fonction Edge
const clientIp = req.headers.get('x-forwarded-for') || 'unknown';
if (!checkRateLimit(clientIp, 10, 60000)) {
  return new Response(
    JSON.stringify({ error: 'Trop de requetes, veuillez reessayer plus tard' }),
    { status: 429 }
  );
}
```

**Priorite:** 🟡 MOYEN - Recommande pour la production

---

### 2.4 Validation insuffisante des entrees utilisateur

**Fichiers:** Multiples (src/services/, supabase/functions/)

**Probleme:**
Certaines fonctions ne valident pas suffisamment les donnees d'entree.

**Exemples a risque:**
1. **Montants de paiement** - Pas de validation stricte
2. **IDs** - Pas de validation du format UUID
3. **Emails** - Pas de validation du format
4. **Dates** - Pas de validation des dates futures/passees

**Solution:**
Creer des fonctions de validation :

```typescript
// src/utils/validators.ts
export const validators = {
  uuid: (value: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  },

  email: (value: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  },

  amount: (value: number): boolean => {
    return typeof value === 'number' && value > 0 && value < 10000 && !isNaN(value);
  },

  phone: (value: string): boolean => {
    const phoneRegex = /^(\+33|0)[1-9](\d{8})$/;
    return phoneRegex.test(value.replace(/\s/g, ''));
  },

  futureDate: (value: string): boolean => {
    const date = new Date(value);
    return !isNaN(date.getTime()) && date > new Date();
  }
};

// Utilisation dans les fonctions
if (!validators.uuid(appointmentId)) {
  throw new Error('ID de rendez-vous invalide');
}

if (!validators.amount(amount)) {
  throw new Error('Montant invalide');
}
```

**Priorite:** 🟡 MOYEN - Recommande pour la robustesse

---

## 3. BONNES PRATIQUES MANQUANTES

### 3.1 Content Security Policy (CSP)

**Probleme:** Absence d'en-tetes de securite HTTP

**Solution:**
Ajouter des en-tetes de securite dans `vercel.json` ou `index.html` :

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline' https://js.stripe.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co https://api.stripe.com"
        }
      ]
    }
  ]
}
```

**Priorite:** 🟢 RECOMMANDE - Amelioration de la securite

---

### 3.2 Sanitization des donnees avant affichage

**Probleme:** Risque XSS si des donnees utilisateur sont affichees sans echappement

**Verification a faire:**
```bash
# Rechercher dangerouslySetInnerHTML
grep -r "dangerouslySetInnerHTML" src/

# Rechercher les interpolations directes de donnees utilisateur
grep -r "{.*\..*}" src/ | grep -v "className\|style"
```

**Solution:**
Utiliser DOMPurify pour nettoyer les donnees HTML :

```typescript
import DOMPurify from 'dompurify';

// Pour afficher du contenu HTML utilisateur
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userContent) }} />

// Pour afficher du texte simple
<div>{userText}</div>  // React echappe automatiquement
```

**Priorite:** 🟢 RECOMMANDE - Verification necessaire

---

### 3.3 Gestion des secrets

**Verification actuelle:** ✅ BONNE

**Points positifs:**
- Aucun secret hardcode dans le code
- Utilisation correcte des variables d'environnement
- Fichier `.env.example` bien structure
- Les cles secretes ne sont jamais exposees cote client

**Recommandations:**
1. Ajouter `.env.local` dans `.gitignore` (deja fait)
2. Rotation reguliere des secrets Stripe et Supabase
3. Utiliser des secrets differents pour dev/staging/production
4. Implementer un systeme de gestion des secrets (ex: HashiCorp Vault, AWS Secrets Manager)

**Priorite:** 🟢 RECOMMANDE - Maintenir les bonnes pratiques

---

### 3.4 Chiffrement des donnees sensibles en base

**Probleme:** Certaines donnees sensibles ne sont pas chiffrees

**Donnees sensibles identifiees:**
- `practitioners.iban` - Donnees bancaires
- `beneficiaries.birth_date` - Donnees personnelles
- `activity_logs.ip_address` - Donnees de tracking

**Solution:**
Utiliser le chiffrement au niveau de Supabase ou au niveau applicatif :

```typescript
// Chiffrement cote application avec crypto-js
import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = Deno.env.get('ENCRYPTION_KEY');

const encrypt = (text: string): string => {
  return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
};

const decrypt = (ciphertext: string): string => {
  const bytes = CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
};

// Avant d'inserer l'IBAN
const encryptedIban = encrypt(iban);
await supabase.from('practitioners').update({ iban: encryptedIban });

// Avant de lire l'IBAN
const { data } = await supabase.from('practitioners').select('iban');
const decryptedIban = decrypt(data.iban);
```

**Priorite:** 🟡 MOYEN - Conformite RGPD et securite bancaire

---

## 4. POINTS POSITIFS

### ✅ 4.1 Webhook Stripe correctement securise

**Fichier:** `supabase/functions/stripe-webhook/index.ts:16-29`

```typescript
const signature = req.headers.get('stripe-signature');

if (!signature) {
  return new Response(JSON.stringify({ error: 'No signature' }), { status: 400 });
}

const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
```

La verification de la signature Stripe est correctement implementee, ce qui empeche les attaques par rejeu.

---

### ✅ 4.2 Pas de secrets hardcodes

Toutes les cles sensibles utilisent des variables d'environnement :
- `STRIPE_SECRET_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_WEBHOOK_SECRET`

---

### ✅ 4.3 Utilisation de HTTPS

Toutes les fonctions Edge Supabase sont automatiquement servies en HTTPS.

---

### ✅ 4.4 Authentification via Supabase Auth

L'authentification est geree par Supabase Auth qui est securisee et eprouvee.

---

### ✅ 4.5 Pas d'injection SQL

Toutes les requetes utilisent le client Supabase qui protege contre les injections SQL.

---

## 5. PLAN D'ACTION RECOMMANDE

### Phase 1 - URGENT (Cette semaine)

1. ✅ **Appliquer les scripts SQL de correction de la base de donnees**
   - Executer `fix_all_security_definer_views.sql`
   - Executer `fix_functions_search_path.sql`

2. 🔴 **Corriger CORS sur les fonctions Edge**
   - Fichier: `supabase/functions/stripe-create-appointment-payment/index.ts`
   - Remplacer `'Access-Control-Allow-Origin': '*'` par la liste des domaines autorises

3. 🔴 **Ajouter verification d'authentification**
   - Fichier: `supabase/functions/stripe-create-appointment-payment/index.ts`
   - Verifier que l'utilisateur authentifie correspond au clientId

### Phase 2 - IMPORTANT (Ce mois-ci)

4. 🟡 **Implementer le rate limiting**
   - Ajouter un middleware de rate limiting sur toutes les fonctions Edge

5. 🟡 **Masquer les donnees sensibles dans les logs**
   - Implementer la fonction de masquage dans `src/utils/logger.ts`
   - Configurer `VITE_LOG_LEVEL=error` en production

6. 🟡 **Chiffrer les IBANs**
   - Implementer le chiffrement pour la colonne `practitioners.iban`

### Phase 3 - RECOMMANDE (Trimestre)

7. 🟢 **Ajouter les en-tetes de securite HTTP**
   - Configurer CSP dans `vercel.json`

8. 🟢 **Implementer la validation stricte des entrees**
   - Creer `src/utils/validators.ts`
   - Ajouter la validation dans toutes les fonctions critiques

9. 🟢 **Audit de conformite RGPD**
   - Documenter la retention des logs
   - Implementer le droit a l'oubli
   - Ajouter les mentions legales sur la collecte de donnees

---

## 6. CHECKLIST DE SECURITE

### Base de donnees
- [ ] Scripts SQL de correction executes
- [ ] RLS activees sur toutes les tables sensibles
- [ ] Vues utilisent SECURITY INVOKER
- [ ] Fonctions ont search_path defini
- [ ] HaveIBeenPwned active

### Fonctions Edge
- [ ] CORS restreint aux domaines autorises
- [ ] Verification d'authentification sur toutes les fonctions
- [ ] Rate limiting implemente
- [ ] Validation des entrees utilisateur
- [ ] Gestion des erreurs sans exposition de details sensibles

### Code applicatif
- [ ] Aucun secret hardcode
- [ ] Logs masquent les donnees sensibles
- [ ] Niveau de log configure pour la production
- [ ] Sanitization des donnees HTML
- [ ] Validation des entrees utilisateur

### Infrastructure
- [ ] En-tetes de securite HTTP configures
- [ ] HTTPS active partout
- [ ] Secrets stockes de maniere securisee
- [ ] Rotation des secrets planifiee

---

## 7. OUTILS RECOMMANDES

### Pour les tests de securite

1. **OWASP ZAP** - Scanner de vulnerabilites web
2. **npm audit** - Audit des dependances npm
3. **Snyk** - Scan de vulnerabilites dans les dependances
4. **SonarQube** - Analyse statique du code

### Commandes a executer

```bash
# Audit des dependances npm
npm audit

# Fix automatique des vulnerabilites mineures
npm audit fix

# Scan avec Snyk (apres installation)
npx snyk test

# Verifier les secrets exposes (apres installation)
npx gitguardian scan
```

---

## 8. SCORE DE SECURITE GLOBAL

| Categorie | Score | Note |
|-----------|-------|------|
| Gestion des secrets | 9/10 | ✅ Excellente |
| Authentification | 8/10 | ✅ Bonne |
| Autorisation | 7/10 | 🟡 A ameliorer |
| Protection des donnees | 6/10 | 🟡 A ameliorer |
| Validation des entrees | 5/10 | 🟡 Insuffisante |
| Logs et monitoring | 6/10 | 🟡 A ameliorer |
| Infrastructure | 8/10 | ✅ Bonne |
| **SCORE GLOBAL** | **7/10** | **🟡 Acceptable avec ameliorations necessaires** |

---

## 9. CONFORMITE RGPD

### Points d'attention

1. **Logs de connexion** - Retention indefinie ?
   - Implementer une suppression automatique apres 90 jours

2. **Donnees de geolocalisation** - Base legale ?
   - Ajouter un consentement explicite

3. **Droit a l'oubli** - Non implemente
   - Creer une fonction de suppression complete des donnees utilisateur

4. **Chiffrement des donnees sensibles** - Partiel
   - Chiffrer IBANs, dates de naissance

---

## 10. CONTACT ET SUIVI

Pour toute question sur cet audit :
- **Date de l'audit:** 2025-01-18
- **Prochaine revue recommandee:** 2025-04-18 (3 mois)
- **Responsable securite:** A designer

---

**Document genere par Claude Code - Audit de securite automatise**
**Version:** 1.0
**Confidentialite:** INTERNE UNIQUEMENT
