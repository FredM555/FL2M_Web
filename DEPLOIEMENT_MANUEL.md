# 📦 Guide de déploiement manuel

## Étape 1 : Migration de la base de données

### Fichier SQL à exécuter
**Emplacement** : `C:\FLM\flm-services-new\supabase\migrations\20250118_centralize_logs_to_activity.sql`

### Procédure dans le Dashboard Supabase

1. Se connecter à https://supabase.com/dashboard
2. Sélectionner votre projet **phokxjbocljahmbdkrbs**
3. Dans le menu latéral, cliquer sur **SQL Editor**
4. Cliquer sur **New query**
5. Copier-coller **tout le contenu** du fichier `20250118_centralize_logs_to_activity.sql`
6. Cliquer sur **Run** (ou Ctrl + Enter)
7. Vérifier que le message "Success" s'affiche

### ✅ Vérifications après migration

Exécuter ces requêtes pour vérifier que tout est OK :

```sql
-- 1. Vérifier que login_logs est supprimé
SELECT table_name FROM information_schema.tables
WHERE table_name = 'login_logs';
-- Résultat attendu : Aucune ligne

-- 2. Vérifier que les vues existent
SELECT table_name FROM information_schema.views
WHERE table_name IN ('email_logs_view', 'login_logs_view');
-- Résultat attendu : 2 lignes

-- 3. Vérifier que les fonctions existent
SELECT routine_name FROM information_schema.routines
WHERE routine_name IN ('log_email_sent', 'log_email_failed', 'log_user_login', 'log_error');
-- Résultat attendu : 4 lignes

-- 4. Vérifier que user_id est nullable dans activity_logs
SELECT is_nullable FROM information_schema.columns
WHERE table_name = 'activity_logs' AND column_name = 'user_id';
-- Résultat attendu : YES
```

---

## Étape 2 : Mise à jour de la fonction Edge `send-email`

### Procédure dans le Dashboard Supabase

1. Dans le Dashboard Supabase, aller dans **Edge Functions**
2. Cliquer sur la fonction **send-email**
3. Cliquer sur **Edit function**
4. **Remplacer tout le contenu** par le code ci-dessous
5. Cliquer sur **Deploy** ou **Save**

### Code complet de la fonction Edge

```typescript
// =====================================================
// Edge Function: Envoi d'emails avec Resend
// Description: Fonction serverless pour envoyer des emails
//              via l'API Resend avec logging centralisé
// =====================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

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

  try {
    const { to, subject, html, appointmentId, emailType, replyTo } = await req.json();

    // Validation
    if (!to || !subject || !html) {
      return new Response(JSON.stringify({
        error: 'Missing required fields: to, subject, html'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Validation de l'email
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(to)) {
      return new Response(JSON.stringify({
        error: 'Invalid email address'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    console.log(`Sending email to ${to} - Type: ${emailType || 'generic'}`);

    // Vérifier que la clé API est configurée
    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not configured');
      return new Response(JSON.stringify({
        error: 'Email service not configured'
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    console.log('Sending email via Resend API...');

    // Construire le corps de la requête
    const emailPayload: any = {
      from: 'FL2M Services <contact@fl2m.fr>',
      to: [to],
      subject,
      html
    };

    // Ajouter reply_to si fourni
    if (replyTo) {
      emailPayload.reply_to = [replyTo];
      console.log('Reply-To set to:', replyTo);
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify(emailPayload)
    });

    console.log('Resend API response status:', res.status);
    console.log('Resend API response content-type:', res.headers.get('content-type'));

    // Vérifier si la réponse est du JSON
    const contentType = res.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const textResponse = await res.text();
      console.error('Resend API returned non-JSON response:', textResponse.substring(0, 500));
      return new Response(JSON.stringify({
        error: 'Failed to send email - Invalid API response',
        details: {
          status: res.status,
          contentType,
          preview: textResponse.substring(0, 200)
        }
      }), {
        status: 502,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    const data = await res.json();

    if (!res.ok) {
      console.error('Resend API error:', data);

      // Logger l'échec dans activity_logs
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // Récupérer le user_id si on a un appointmentId
        let userId = null;
        if (appointmentId) {
          const { data: appointment } = await supabase
            .from('appointments')
            .select('client_id')
            .eq('id', appointmentId)
            .single();

          if (appointment) {
            userId = appointment.client_id;
          }
        }

        // Logger l'échec d'email
        await supabase.rpc('log_email_failed', {
          p_user_id: userId,
          p_recipient: to,
          p_subject: subject,
          p_email_type: emailType || 'generic',
          p_error_message: JSON.stringify(data),
          p_appointment_id: appointmentId || null
        });
      } catch (logError) {
        console.error('Erreur lors du logging de l\'échec:', logError);
      }

      return new Response(JSON.stringify({
        error: 'Failed to send email',
        details: data
      }), {
        status: res.status,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    console.log('Email sent successfully:', data);

    // Logger l'envoi dans activity_logs
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      // Récupérer le user_id si on a un appointmentId
      let userId = null;
      if (appointmentId) {
        const { data: appointment } = await supabase
          .from('appointments')
          .select('client_id')
          .eq('id', appointmentId)
          .single();

        if (appointment) {
          userId = appointment.client_id;
        }
      }

      // Logger l'email envoyé
      await supabase.rpc('log_email_sent', {
        p_user_id: userId,
        p_recipient: to,
        p_subject: subject,
        p_email_type: emailType || 'generic',
        p_resend_id: data.id,
        p_appointment_id: appointmentId || null
      });
    } catch (logError) {
      console.error('Erreur lors du logging de l\'email:', logError);
      // Ne pas bloquer l'envoi si le logging échoue
    }

    return new Response(JSON.stringify({
      success: true,
      data
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
```

### ✅ Vérification après déploiement

1. Dans l'onglet **Logs** de la fonction, vérifier qu'il n'y a pas d'erreurs
2. Tester en envoyant un email de contact depuis l'application
3. Vérifier les logs de la fonction pour voir :
   ```
   Sending email to xxx@xxx.com - Type: contact
   Sending email via Resend API...
   Reply-To set to: utilisateur@example.com
   Resend API response status: 200
   Email sent successfully: {...}
   ```

---

## Étape 3 : Déploiement de l'application React

Après avoir appliqué les changements côté base de données et fonction Edge, il faut redéployer l'application.

### Build local

```bash
npm run build
```

### Déploiement sur Vercel (si vous utilisez Vercel)

1. Commiter vos changements :
```bash
git add .
git commit -m "feat: centralisation logs + email commentaires publics + reply-to"
git push
```

2. Vercel redéploiera automatiquement

OU déployer manuellement :
```bash
vercel --prod
```

---

## 🧪 Tests à effectuer après déploiement

### Test 1 : Email de contact avec Reply-To
1. Aller sur la page Contact
2. Remplir le formulaire avec votre email
3. Envoyer le message
4. Vérifier que vous recevez un AR
5. Vérifier que `contact@fl2m.fr` reçoit le message
6. **IMPORTANT** : Dans l'email reçu à `contact@fl2m.fr`, cliquer sur "Répondre" et vérifier que l'adresse de réponse est celle de l'utilisateur (pas `contact@fl2m.fr`)
7. Vérifier le log dans `email_logs_view` :
```sql
SELECT * FROM email_logs_view
WHERE email_type = 'contact'
ORDER BY created_at DESC
LIMIT 5;
```

### Test 2 : Email pour commentaire public
1. Se connecter en tant qu'admin ou intervenant
2. Aller sur un rendez-vous
3. Ajouter un commentaire public
4. Vérifier que le client reçoit un email de notification
5. Vérifier le log :
```sql
SELECT * FROM email_logs_view
WHERE email_type = 'comment'
ORDER BY created_at DESC
LIMIT 5;
```

### Test 3 : Logging centralisé
1. Vérifier que les anciens logs de connexion ont été migrés :
```sql
SELECT COUNT(*) FROM activity_logs WHERE action_type = 'login';
```

2. Se connecter avec un utilisateur et vérifier le nouveau log :
```sql
SELECT * FROM login_logs_view ORDER BY login_time DESC LIMIT 5;
```

3. Vérifier les logs d'emails :
```sql
-- Tous les emails
SELECT * FROM email_logs_view ORDER BY created_at DESC LIMIT 10;

-- Statistiques
SELECT
  email_type,
  COUNT(*) as total,
  SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
FROM email_logs_view
GROUP BY email_type;
```

---

## 🆘 En cas de problème

### Erreur "function log_email_sent does not exist"
- La migration SQL n'a pas été appliquée correctement
- Retourner dans SQL Editor et réexécuter la migration

### Les emails ne sont pas loggés
- Vérifier que la fonction Edge a bien été mise à jour
- Consulter les logs de la fonction Edge
- Vérifier les permissions sur les fonctions RPC

### Les anciens logs de connexion ont disparu
- Les données ont été migrées vers `activity_logs`
- Utiliser la vue `login_logs_view` pour les consulter

### L'application ne compile pas
- Vérifier qu'il n'y a pas d'erreurs TypeScript
- Exécuter `npm install` pour s'assurer que toutes les dépendances sont installées

---

## 📞 Support

Pour toute question ou problème :
1. Vérifier les logs dans Supabase Dashboard > Edge Functions > Logs
2. Vérifier les logs dans la console du navigateur (F12)
3. Consulter la documentation dans `MIGRATION_LOGS_CENTRALISÉS.md`
