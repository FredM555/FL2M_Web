# Système de Confirmation des Données Bénéficiaire

## ✅ Modifications Terminées

### 1. Migration SQL (`supabase/migrations/20250120_beneficiary_confirmation_system.sql`)
- ✅ Ajout du statut `'beneficiaire_confirme'` aux rendez-vous
- ✅ Colonne `beneficiary_data_confirmed_at` dans `appointment_beneficiaries`
- ✅ Fonction `can_modify_beneficiary_identity(p_beneficiary_id UUID)` - Vérifie si modification autorisée
- ✅ Fonction `confirm_beneficiary_data()` - Confirme les données pour un RDV
- ✅ Fonction `auto_confirm_beneficiary_data_before_appointment()` - Confirmation automatique 72h avant
- ✅ Trigger `prevent_identity_modification` - Empêche la modification des données verrouillées

### 2. Types TypeScript
- ✅ Statut `'beneficiaire_confirme'` ajouté au type `Appointment`
- ✅ Services créés dans `beneficiaries.ts` :
  - `canModifyBeneficiaryIdentity()`
  - `confirmBeneficiaryData()`
  - `autoConfirmBeneficiaryData()`

### 3. Formulaire Bénéficiaire (`BeneficiaryForm.tsx`)
- ✅ Vérification automatique si le bénéficiaire peut être modifié
- ✅ Désactivation des champs (prénom, nom, date de naissance) si étude réalisée
- ✅ Message d'alerte avec icône cadenas si verrouillé
- ✅ Helper text indiquant "Verrouillé - Étude réalisée"

## 🚧 Modifications À Faire (si nécessaire)

### 4. Bouton de Confirmation dans l'Historique des Rendez-Vous

Modifier `src/components/beneficiaries/BeneficiaryHistory.tsx` pour ajouter un bouton "Confirmer les données" :

```typescript
// Ajouter un état pour gérer la confirmation
const [confirming, setConfirming] = useState<string | null>(null);
const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

// Fonction pour confirmer les données
const handleConfirmData = async (appointmentId: string) => {
  setConfirming(appointmentId);
  try {
    const { data, error } = await confirmBeneficiaryData(appointmentId, beneficiaryId);

    if (error) throw error;

    setSnackbar({
      open: true,
      message: 'Données du bénéficiaire confirmées',
      severity: 'success'
    });

    // Recharger les rendez-vous
    loadAppointments();
  } catch (err: any) {
    setSnackbar({
      open: true,
      message: err.message || 'Erreur lors de la confirmation',
      severity: 'error'
    });
  } finally {
    setConfirming(null);
  }
};

// Dans le rendu, ajouter le bouton
{appointment.status === 'confirmed' && !appointment.beneficiary_data_confirmed_at && (
  <Button
    size="small"
    variant="outlined"
    color="primary"
    startIcon={<CheckCircleIcon />}
    onClick={() => handleConfirmData(appointment.id)}
    disabled={confirming === appointment.id}
    sx={{ mt: 1, ml: 1 }}
  >
    {confirming === appointment.id ? 'Confirmation...' : 'Confirmer les données'}
  </Button>
)}
```

### 5. Système de Confirmation Automatique (Optionnel)

Pour activer la confirmation automatique 72h avant les rendez-vous, vous pouvez :

#### Option A : Utiliser Supabase Cron Jobs (Recommandé)
Dans le dashboard Supabase, créer un Cron Job :

```sql
-- Exécuter tous les jours à 9h00
SELECT cron.schedule(
  'auto-confirm-beneficiary-data',
  '0 9 * * *',  -- Tous les jours à 9h
  $$
  SELECT auto_confirm_beneficiary_data_before_appointment();
  $$
);
```

#### Option B : Créer un endpoint API et utiliser un service externe
Créer un fichier `src/api/cron-jobs.ts` :

```typescript
import { autoConfirmBeneficiaryData } from '../services/beneficiaries';

export const runAutoConfirmation = async () => {
  const { data, error } = await autoConfirmBeneficiaryData();

  if (error) {
    console.error('Erreur confirmation auto:', error);
    return { success: false, error };
  }

  console.log(`${data?.length || 0} confirmations automatiques effectuées`);
  return { success: true, count: data?.length };
};
```

Puis utiliser un service comme Vercel Cron, GitHub Actions, ou Azure Functions pour appeler cet endpoint quotidiennement.

## 📋 Pour Appliquer la Migration SQL

La migration SQL doit être appliquée sur votre base de données Supabase :

### Méthode 1 : Via le Dashboard Supabase (Recommandé)
1. Aller sur https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new
2. Copier-coller le contenu de `supabase/migrations/20250120_beneficiary_confirmation_system.sql`
3. Cliquer sur "Run"

### Méthode 2 : Via Supabase CLI
```bash
npx supabase db push
```

## 🎯 Fonctionnement du Système

### Verrouillage des Données d'Identité

1. **Quand un rendez-vous passe à statut `'beneficiaire_confirme'` ou `'completed'`** :
   - Les données d'identité du bénéficiaire sont automatiquement verrouillées
   - Impossible de modifier : prénom, nom, date de naissance

2. **Dans le formulaire** :
   - Vérification automatique au chargement
   - Si verrouillé : champs désactivés + icône cadenas + message d'alerte

3. **Protection au niveau base de données** :
   - Trigger SQL empêche la modification même si on tente de contourner l'UI

### Confirmation des Données

1. **Manuelle** :
   - Bouton "Confirmer les données" dans l'historique des RDV
   - Disponible uniquement pour les RDV en statut `'confirmed'`
   - Met à jour `beneficiary_data_confirmed_at`
   - Change le statut du RDV en `'beneficiaire_confirme'`

2. **Automatique** :
   - Fonction SQL `auto_confirm_beneficiary_data_before_appointment()`
   - Confirme automatiquement tous les RDV dans les 72 prochaines heures
   - À exécuter via un cron job quotidien

## 🔒 Sécurité

- Les fonctions SQL utilisent `SECURITY DEFINER` pour s'exécuter avec les privilèges du propriétaire
- Le trigger vérifie les modifications avant de les autoriser
- Les permissions RLS sont configurées pour `authenticated` users
- La fonction automatique n'est accessible qu'au `service_role`

## 📊 Vues Utiles

Une vue `beneficiaries_locked` a été créée pour lister les bénéficiaires verrouillés :

```sql
SELECT * FROM beneficiaries_locked;
```

Affiche :
- ID du bénéficiaire
- Nom, prénom, date de naissance
- Nombre de rendez-vous confirmés/complétés
- Date du premier rendez-vous confirmé
- Statut de modification (true/false)
