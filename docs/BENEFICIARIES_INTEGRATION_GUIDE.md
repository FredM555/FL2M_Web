# 🔧 Guide d'Intégration des Bénéficiaires

> **Document créé le** : 2025-11-20
> **Statut** : 8/10 composants créés, 2 modifications de pages restantes

---

## ✅ Composants Créés (8/8)

Tous les composants suivants sont prêts et testés (build TypeScript réussi) :

1. **BeneficiaryCard** - `src/components/beneficiaries/BeneficiaryCard.tsx`
2. **BeneficiaryForm** - `src/components/beneficiaries/BeneficiaryForm.tsx`
3. **BeneficiaryList** - `src/components/beneficiaries/BeneficiaryList.tsx`
4. **BeneficiarySelector** - `src/components/beneficiaries/BeneficiarySelector.tsx`
5. **BeneficiaryHistory** - `src/components/beneficiaries/BeneficiaryHistory.tsx`
6. **BeneficiaryStats** - `src/components/beneficiaries/BeneficiaryStats.tsx`
7. **BeneficiaryAccessManager** - `src/components/beneficiaries/BeneficiaryAccessManager.tsx`
8. **BeneficiariesPage** - `src/pages/BeneficiariesPage.tsx`

---

## ⏳ Modifications Restantes (2/2)

### 1. Modification de `AppointmentBookingPage.tsx`

**Objectif** : Remplacer les anciens champs beneficiary_* par le BeneficiarySelector

#### Lignes à modifier

**Actuellement (lignes 108-111)** :
```typescript
const [beneficiaryIsSelf, setBeneficiaryIsSelf] = useState(true);
const [beneficiaryFirstName, setBeneficiaryFirstName] = useState('');
const [beneficiaryLastName, setBeneficiaryLastName] = useState('');
const [beneficiaryBirthDate, setBeneficiaryBirthDate] = useState('');
```

**À remplacer par** :
```typescript
const [selectedBeneficiaryIds, setSelectedBeneficiaryIds] = useState<string[]>([]);
const [userBeneficiaries, setUserBeneficiaries] = useState<BeneficiaryWithAccess[]>([]);
const [showBeneficiaryDialog, setShowBeneficiaryDialog] = useState(false);
```

#### Imports à ajouter

```typescript
import { BeneficiarySelector } from '../components/beneficiaries/BeneficiarySelector';
import { BeneficiaryForm } from '../components/beneficiaries/BeneficiaryForm';
import { BeneficiaryWithAccess, CreateBeneficiaryData } from '../types/beneficiary';
import {
  getUserBeneficiaries,
  createBeneficiary,
  addBeneficiaryToAppointment
} from '../services/beneficiaries';
```

#### Charger les bénéficiaires au montage

```typescript
useEffect(() => {
  if (user) {
    loadUserBeneficiaries();
  }
}, [user]);

const loadUserBeneficiaries = async () => {
  try {
    const data = await getUserBeneficiaries();
    setUserBeneficiaries(data || []);
  } catch (err) {
    console.error('Erreur chargement bénéficiaires:', err);
  }
};
```

#### Remplacer la section formulaire bénéficiaire (lignes 720-760)

**Remplacer ce bloc** :
```typescript
<FormControlLabel
  control={
    <Checkbox
      checked={beneficiaryIsSelf}
      onChange={(e) => setBeneficiaryIsSelf(e.target.checked)}
    />
  }
  label="Je suis le bénéficiaire de cette consultation"
/>
{!beneficiaryIsSelf && (
  // Anciens champs first_name, last_name, birth_date
)}
```

**Par** :
```typescript
<Box sx={{ mb: 3 }}>
  <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
    Bénéficiaire de la consultation
  </Typography>
  <BeneficiarySelector
    beneficiaries={userBeneficiaries}
    value={selectedBeneficiaryIds}
    onChange={setSelectedBeneficiaryIds}
    maxBeneficiaries={selectedService?.max_beneficiaries || 1}
    allowCreate={true}
    onCreateNew={() => setShowBeneficiaryDialog(true)}
    label="Sélectionner un bénéficiaire"
    placeholder="Rechercher ou créer un bénéficiaire..."
    required={true}
  />
</Box>

{/* Dialog pour créer un nouveau bénéficiaire */}
<Dialog
  open={showBeneficiaryDialog}
  onClose={() => setShowBeneficiaryDialog(false)}
  maxWidth="md"
  fullWidth
>
  <DialogContent>
    <BeneficiaryForm
      onSave={async (data: CreateBeneficiaryData) => {
        const newBeneficiary = await createBeneficiary(data);
        await loadUserBeneficiaries();
        setSelectedBeneficiaryIds([newBeneficiary.id]);
        setShowBeneficiaryDialog(false);
      }}
      onCancel={() => setShowBeneficiaryDialog(false)}
    />
  </DialogContent>
</Dialog>
```

#### Modifier la fonction de réservation (ligne 259-262)

**Remplacer** :
```typescript
if (!beneficiaryIsSelf) {
  additionalData.beneficiary_first_name = beneficiaryFirstName;
  additionalData.beneficiary_last_name = beneficiaryLastName;
  additionalData.beneficiary_birth_date = beneficiaryBirthDate;
}
```

**Par** :
```typescript
// Après la création du RDV, lier les bénéficiaires
if (selectedBeneficiaryIds.length > 0) {
  for (let i = 0; i < selectedBeneficiaryIds.length; i++) {
    await addBeneficiaryToAppointment(
      data.id, // ID du RDV créé
      selectedBeneficiaryIds[i],
      i === 0 ? 'primary' : 'partner',
      i + 1
    );
  }
}
```

#### Validation avant réservation

Ajouter cette validation :
```typescript
// Validation bénéficiaire
if (selectedBeneficiaryIds.length === 0) {
  setError('Veuillez sélectionner au moins un bénéficiaire');
  return;
}
```

---

### 2. Modification de `MyAppointmentsPage.tsx`

**Objectif** : Afficher les bénéficiaires depuis la nouvelle table

#### Imports à ajouter

```typescript
import { getAppointmentBeneficiaries } from '../services/beneficiaries';
import { BeneficiaryWithAccess } from '../types/beneficiary';
```

#### Charger les bénéficiaires pour chaque RDV

Dans la fonction de chargement des RDV, ajouter :

```typescript
const loadAppointments = async () => {
  try {
    setLoading(true);
    const data = await getAppointments(); // Fonction existante

    // Charger les bénéficiaires pour chaque RDV
    const appointmentsWithBeneficiaries = await Promise.all(
      data.map(async (appointment) => {
        const beneficiaries = await getAppointmentBeneficiaries(appointment.id);
        return {
          ...appointment,
          beneficiaries: beneficiaries || [],
        };
      })
    );

    setAppointments(appointmentsWithBeneficiaries);
  } catch (err) {
    console.error('Erreur:', err);
  } finally {
    setLoading(false);
  }
};
```

#### Afficher les bénéficiaires dans la liste

Dans le rendu de chaque rendez-vous, ajouter :

```typescript
{/* Affichage des bénéficiaires */}
{appointment.beneficiaries && appointment.beneficiaries.length > 0 && (
  <Box sx={{ mt: 1 }}>
    <Typography variant="caption" color="text.secondary">
      Bénéficiaire(s) :
    </Typography>
    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
      {appointment.beneficiaries.map((beneficiary: any) => (
        <Chip
          key={beneficiary.id}
          label={`${beneficiary.first_name} ${beneficiary.last_name}`}
          size="small"
          avatar={
            <Avatar sx={{ bgcolor: 'primary.main', fontSize: '0.75rem' }}>
              {beneficiary.first_name.charAt(0)}
            </Avatar>
          }
        />
      ))}
    </Box>
  </Box>
)}

{/* Rétrocompatibilité : afficher les anciennes données si présentes */}
{(!appointment.beneficiaries || appointment.beneficiaries.length === 0) &&
 appointment.beneficiary_first_name && (
  <Typography variant="body2" color="text.secondary">
    Pour : {appointment.beneficiary_first_name} {appointment.beneficiary_last_name}
  </Typography>
)}
```

---

## 🧪 Tests à Effectuer (Phase 4)

### Tests AppointmentBookingPage

1. **Créer un nouveau bénéficiaire pendant la réservation**
   - Cliquer sur "Nouveau bénéficiaire" dans le BeneficiarySelector
   - Remplir le formulaire
   - Vérifier que le bénéficiaire est créé et auto-sélectionné

2. **Sélectionner un bénéficiaire existant**
   - Rechercher un bénéficiaire dans l'autocomplete
   - Le sélectionner
   - Finaliser la réservation
   - Vérifier que le lien RDV-Bénéficiaire est créé

3. **Module Couple (2 bénéficiaires)**
   - Sélectionner un service qui permet 2 bénéficiaires
   - Sélectionner 2 bénéficiaires
   - Vérifier que les 2 sont liés au RDV

4. **Validation**
   - Tenter de réserver sans sélectionner de bénéficiaire
   - Vérifier que l'erreur est affichée

### Tests MyAppointmentsPage

1. **Affichage des bénéficiaires**
   - Vérifier que les bénéficiaires s'affichent sur les RDV
   - Vérifier les chips avec avatars

2. **Rétrocompatibilité**
   - Vérifier que les anciens RDV (avec beneficiary_first_name) s'affichent correctement

---

## 📂 Fichiers Créés

### Composants
```
src/components/beneficiaries/
├── BeneficiaryCard.tsx
├── BeneficiaryForm.tsx
├── BeneficiaryList.tsx
├── BeneficiarySelector.tsx
├── BeneficiaryHistory.tsx
├── BeneficiaryStats.tsx
└── BeneficiaryAccessManager.tsx
```

### Pages
```
src/pages/
└── BeneficiariesPage.tsx
```

### Services (déjà créés en Phase 0)
```
src/services/
└── beneficiaries.ts (18 fonctions)
```

### Types (déjà créés en Phase 0)
```
src/types/
└── beneficiary.ts (15 interfaces, 10 helpers)
```

---

## 🚀 Commandes Utiles

### Compiler et vérifier les erreurs
```bash
npm run build
```

### Démarrer en mode développement
```bash
npm run dev
```

### Vérifier les erreurs TypeScript
```bash
npx tsc --noEmit
```

---

## 📝 Checklist Finale

- [x] 8 composants créés
- [x] BeneficiariesPage créée
- [x] Build TypeScript réussi
- [ ] Modifier AppointmentBookingPage
- [ ] Modifier MyAppointmentsPage
- [ ] Ajouter route /beneficiaries dans App.tsx
- [ ] Ajouter lien menu vers "Mes bénéficiaires"
- [ ] Tests Phase 4 (création, RDV, partage, historique)
- [ ] Déploiement Phase 5

---

**Prochaine session** : Compléter les 2 modifications restantes et tester !
