# 🚀 Redéploiement Rapide de la Fonction send-contact-email

**Problème résolu :** Ajout des headers CORS

---

## 📋 Méthode 1 : Via Dashboard Supabase (5 min) - RECOMMANDÉ

### Étape 1 : Ouvrir le Dashboard

1. Allez sur [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sélectionnez votre projet : `phokxjbocljahmbdkrbs`
3. Dans le menu de gauche, cliquez sur **Edge Functions**

### Étape 2 : Modifier la Fonction

1. Cherchez la fonction `send-contact-email` dans la liste
2. Cliquez dessus pour l'ouvrir
3. Cliquez sur **Edit Function** ou l'icône d'édition ✏️

### Étape 3 : Copier le Nouveau Code

1. Ouvrez le fichier : `C:\FLM\flm-services-new\supabase\functions\send-contact-email\index.ts`
2. Sélectionnez tout le contenu (Ctrl+A)
3. Copiez (Ctrl+C)
4. Retournez dans le Dashboard Supabase
5. Sélectionnez tout le code existant dans l'éditeur
6. Collez le nouveau code (Ctrl+V)

### Étape 4 : Déployer

1. Cliquez sur **Deploy** (en haut à droite)
2. Attendez quelques secondes
3. Vous devriez voir un message de succès ✅

### Étape 5 : Tester

1. Retournez sur votre site : `http://localhost:5173/contact`
2. Remplissez le formulaire
3. Envoyez un message test
4. **Ça devrait fonctionner maintenant !** 🎉

---

## 📋 Méthode 2 : Via CLI Supabase (si Docker est installé)

```bash
# 1. Vérifier que Docker Desktop est lancé
# 2. Déployer la fonction
npx supabase functions deploy send-contact-email

# 3. Tester
```

---

## ✅ Ce Qui a Été Corrigé

### Avant (sans CORS)
```typescript
serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' } // ❌ Pas de CORS
    });
  }
  // ...
});
```

### Après (avec CORS)
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
  // Gérer les requêtes CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: {
        ...corsHeaders, // ✅ CORS ajoutés
        'Content-Type': 'application/json'
      }
    });
  }
  // ...
});
```

---

## 🐛 Troubleshooting

### Si le problème CORS persiste

1. **Vérifier que la fonction est bien déployée**
   - Dashboard Supabase → Edge Functions → send-contact-email
   - Vérifier la date de dernier déploiement

2. **Vider le cache du navigateur**
   - Ctrl + Shift + R (Windows/Linux)
   - Cmd + Shift + R (Mac)

3. **Vérifier les logs**
   - Dashboard Supabase → Edge Functions → send-contact-email → Logs
   - Regarder s'il y a des erreurs

4. **Tester avec curl**
   ```bash
   curl -X POST https://phokxjbocljahmbdkrbs.supabase.co/functions/v1/send-contact-email \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer VOTRE_ANON_KEY" \
     -d '{"message": {"first_name": "Test", "last_name": "User", "email": "test@example.com", "subject": "Test", "message": "Test message", "status": "new"}}'
   ```

---

## 📝 Résumé

**Problème :** Erreur CORS lors de l'envoi d'email depuis le frontend
**Cause :** Headers CORS manquants dans la fonction Edge
**Solution :** Ajout des headers CORS à toutes les réponses
**Action :** Redéployer la fonction via le Dashboard Supabase

**Temps estimé :** 5 minutes

---

**Une fois redéployé, le formulaire de contact fonctionnera parfaitement ! 🚀**
