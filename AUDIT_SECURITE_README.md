# Audit de Securite FL2M Services - Guide de Mise en Œuvre

## Resume de l'audit

L'audit de securite a ete finalise avec succes. Voici les fichiers generes :

### Fichiers crees

1. **SECURITY_AUDIT_COMPLETE.md** - Audit de la base de donnees Supabase
   - 26 alertes identifiees (3 critiques, 11 moyennes, 12 recommandations)
   - Scripts SQL de correction prepares

2. **fix_all_security_definer_views.sql** - Correction des vues avec SECURITY DEFINER
   - Corrige 3 alertes critiques
   - A executer dans Supabase SQL Editor

3. **fix_functions_search_path.sql** - Correction des fonctions sans search_path
   - Corrige 11 alertes moyennes
   - A executer dans Supabase SQL Editor

4. **SECURITY_AUDIT_CODE_2025.md** - Audit du code applicatif
   - 2 vulnerabilites critiques
   - 4 vulnerabilites moyennes
   - 8 recommandations
   - Score global: 7/10

---

## Actions URGENTES (a faire immediatement)

### 1. Corriger la base de donnees (5 minutes)

#### Etape 1 : Ouvrir Supabase Dashboard
1. Aller sur https://supabase.com/dashboard
2. Selectionner votre projet FL2M
3. Aller dans **SQL Editor**

#### Etape 2 : Executer les scripts SQL

**Script 1 - Vues SECURITY DEFINER (CRITIQUE)**
```sql
-- Copier-coller le contenu de fix_all_security_definer_views.sql
-- Puis cliquer sur "Run"
```

**Script 2 - Fonctions search_path (MOYEN)**
```sql
-- Copier-coller le contenu de fix_functions_search_path.sql
-- Puis cliquer sur "Run"
```

#### Etape 3 : Verifier
1. Aller dans **Security Advisor**
2. Le nombre d'alertes devrait passer de 26 a 12

---

### 2. Corriger le CORS trop permissif (10 minutes)

**Fichier a modifier :** `supabase/functions/stripe-create-appointment-payment/index.ts`

**Ligne 14-17, remplacer :**
```typescript
// AVANT (VULNERABLE)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',  // ❌ Autorise tous les domaines
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

**Par :**
```typescript
// APRES (SECURISE)
const allowedOrigins = [
  'https://votre-domaine-production.com',
  'https://www.votre-domaine-production.com',
  ...(Deno.env.get('ENVIRONMENT') === 'development' ? ['http://localhost:5173'] : [])
];

const getCorsHeaders = (origin: string | null) => {
  const isAllowed = origin && allowedOrigins.includes(origin);
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Credentials': 'true'
  };
};

const corsHeaders = getCorsHeaders(req.headers.get('origin'));
```

**Deploiement :**
```bash
supabase functions deploy stripe-create-appointment-payment
```

---

### 3. Ajouter la verification d'authentification (15 minutes)

**Fichier a modifier :** `supabase/functions/stripe-create-appointment-payment/index.ts`

**Ajouter apres la ligne 24 (apres `req.json()`) :**

```typescript
// VERIFICATION D'AUTHENTIFICATION
const authHeader = req.headers.get('Authorization');
if (!authHeader) {
  return new Response(
    JSON.stringify({ error: 'Non authentifie' }),
    { headers: corsHeaders, status: 401 }
  );
}

const token = authHeader.replace('Bearer ', '');
const { data: { user }, error: authError } = await supabase.auth.getUser(token);

if (authError || !user) {
  return new Response(
    JSON.stringify({ error: 'Token invalide' }),
    { headers: corsHeaders, status: 401 }
  );
}

// Verifier que le clientId correspond a l'utilisateur authentifie
if (user.id !== clientId) {
  return new Response(
    JSON.stringify({ error: 'Non autorise: vous ne pouvez creer un paiement que pour vous-meme' }),
    { headers: corsHeaders, status: 403 }
  );
}

// Verifier que le rendez-vous appartient bien au client
const { data: appointment, error: apptError } = await supabase
  .from('appointments')
  .select('id, client_id, status')
  .eq('id', appointmentId)
  .eq('client_id', clientId)
  .single();

if (apptError || !appointment) {
  return new Response(
    JSON.stringify({ error: 'Rendez-vous non trouve ou non autorise' }),
    { headers: corsHeaders, status: 404 }
  );
}

// Verifier que le RDV n'a pas deja ete paye
if (appointment.payment_status === 'paid') {
  return new Response(
    JSON.stringify({ error: 'Ce rendez-vous a deja ete paye' }),
    { headers: corsHeaders, status: 400 }
  );
}
```

**Deploiement :**
```bash
supabase functions deploy stripe-create-appointment-payment
```

---

## Actions IMPORTANTES (a faire cette semaine)

### 4. Activer HaveIBeenPwned (2 minutes)

1. Aller dans **Supabase Dashboard** → **Authentication** → **Policies**
2. Activer **"Check for leaked passwords"**
3. Les 12 dernieres alertes disparaitront

### 5. Configurer les logs en production

**Fichier a modifier :** `.env.local` (production)

```bash
# En production, logger seulement les erreurs
VITE_LOG_LEVEL=error

# En developpement, garder debug
# VITE_LOG_LEVEL=debug
```

### 6. Ajouter les en-tetes de securite HTTP

**Fichier a modifier ou creer :** `vercel.json`

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
          "key": "Strict-Transport-Security",
          "value": "max-age=63072000; includeSubDomains; preload"
        }
      ]
    }
  ]
}
```

---

## Actions RECOMMANDEES (a faire ce mois-ci)

### 7. Implementer le rate limiting

Voir le fichier **SECURITY_AUDIT_CODE_2025.md** section 2.3 pour le code complet.

### 8. Masquer les donnees sensibles dans les logs

Voir le fichier **SECURITY_AUDIT_CODE_2025.md** section 2.2 pour le code complet.

### 9. Chiffrer les IBANs

Voir le fichier **SECURITY_AUDIT_CODE_2025.md** section 3.4 pour le code complet.

---

## Verification finale

### Checklist de verification

- [ ] Scripts SQL executes (fix_all_security_definer_views.sql)
- [ ] Scripts SQL executes (fix_functions_search_path.sql)
- [ ] Security Advisor Supabase affiche 12 alertes (au lieu de 26)
- [ ] HaveIBeenPwned active
- [ ] Security Advisor Supabase affiche 0 alerte
- [ ] CORS corrige sur stripe-create-appointment-payment
- [ ] Verification d'authentification ajoutee
- [ ] Fonction stripe-create-appointment-payment redeployee
- [ ] Tests de paiement fonctionnent toujours
- [ ] VITE_LOG_LEVEL=error configure en production
- [ ] En-tetes de securite HTTP configures

### Tests a effectuer

1. **Test de paiement** - Verifier qu'un paiement fonctionne toujours
2. **Test CORS** - Essayer d'appeler la fonction depuis un autre domaine (doit echouer)
3. **Test d'auth** - Essayer de creer un paiement pour un autre utilisateur (doit echouer)
4. **Test des logs** - Verifier qu'aucune donnee sensible n'apparait dans les logs

---

## Score de securite

### Avant l'audit
- **Base de donnees:** 26 alertes
- **Code applicatif:** Vulnerabilites non identifiees
- **Score global:** 4/10 🔴

### Apres corrections urgentes
- **Base de donnees:** 0 alerte ✅
- **Code applicatif:** 2 vulnerabilites critiques corrigees ✅
- **Score global:** 7/10 🟡

### Apres toutes les corrections
- **Base de donnees:** 0 alerte ✅
- **Code applicatif:** Toutes vulnerabilites corrigees ✅
- **Score global:** 9/10 ✅

---

## Documentation complete

Pour plus de details sur chaque vulnerabilite et sa correction :
- **SECURITY_AUDIT_COMPLETE.md** - Audit base de donnees
- **SECURITY_AUDIT_CODE_2025.md** - Audit code applicatif

---

## Support

En cas de probleme lors de l'application des corrections :
1. Consulter les fichiers d'audit detailles
2. Verifier les logs Supabase
3. Tester en environnement de developpement d'abord

---

**Date de l'audit :** 2025-01-18
**Prochaine revue recommandee :** 2025-04-18 (tous les 3 mois)
**Temps estime pour les corrections urgentes :** 30 minutes
**Temps estime pour toutes les corrections :** 4-6 heures

---

**Genere par Claude Code - Audit de securite FL2M Services**
