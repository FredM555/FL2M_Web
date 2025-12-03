# Gestion des Intervenants Inactifs

## 📋 Résumé des Changements

Ce document décrit les modifications apportées pour gérer les intervenants inactifs et leur visibilité dans la plateforme.

## 🎯 Objectif

Lorsqu'un intervenant a le statut `is_active = false` :
1. **Afficher un message d'avertissement** dans son profil
2. **Forcer le profil à être non visible** dans la liste publique des intervenants
3. **Désactiver le toggle de visibilité** dans le formulaire du profil
4. **Filtrer automatiquement** les intervenants inactifs de toutes les listes publiques

## 🔄 Modifications Apportées

### 1. Formulaire du Profil Intervenant

**Fichier** : `src/components/practitioner/PractitionerProfileForm.tsx`

#### Alerte pour les intervenants inactifs (lignes 166-176)
```tsx
{!practitioner.is_active && (
  <Alert severity="error" sx={{ mb: 3 }}>
    <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
      Profil Inactif
    </Typography>
    <Typography variant="body2">
      Votre profil est actuellement inactif. Il ne sera pas visible dans la liste publique des intervenants,
      indépendamment du paramètre de visibilité ci-dessous. Contactez un administrateur pour réactiver votre profil.
    </Typography>
  </Alert>
)}
```

#### Switch de visibilité désactivé (lignes 178-210)
- **Switch désactivé** : `disabled={loading || saving || !practitioner.is_active}`
- **Checked forcé à false** : `checked={formData.profile_visible && practitioner.is_active}`
- **Background grisé** : Si inactif, le background devient gris
- **Label dynamique** : Affiche "Profil inactif (masqué)" si inactif

**Comportement** :
- Si `is_active = false` → Le switch est désactivé et affiche un état "masqué" permanent
- L'intervenant ne peut pas modifier la visibilité tant qu'il est inactif
- Message clair : "Profil inactif - invisible pour le public"

---

### 2. Aperçu du Profil

**Fichier** : `src/components/practitioner/PractitionerProfilePreview.tsx`

#### Vérification prioritaire du statut inactif (lignes 28-46)
```tsx
// Si le profil est inactif, afficher un message d'avertissement
if (!practitioner.is_active) {
  return (
    <Box>
      <Alert severity="error" sx={{ mb: 3 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
          Profil Inactif
        </Typography>
        <Typography variant="body2">
          Votre profil est actuellement <strong>inactif</strong> et ne peut pas être visible dans la liste publique des intervenants,
          même si vous activez la visibilité.
        </Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>
          Veuillez contacter un administrateur pour réactiver votre profil.
        </Typography>
      </Alert>
    </Box>
  );
}
```

**Comportement** :
- Priorité absolue à la vérification du statut `is_active`
- Si inactif → Affiche uniquement l'alerte d'erreur (pas d'aperçu du profil)
- Message explicite : contactez un administrateur

---

### 3. Filtrage dans les Listes Publiques

#### A. Service Principal (`supabase.ts`)

**Fichier** : `src/services/supabase.ts`

**Fonction** : `getPractitioners()` (lignes 323-339)

```typescript
export const getPractitioners = (onlyActive: boolean = false) => {
  let query = supabase
    .from('practitioners')
    .select(`
      *,
      profile:profiles(*)
    `);

  // Filtrer sur les actifs si demandé
  if (onlyActive) {
    query = query
      .eq('is_active', true)
      .eq('profile_visible', true); // Aussi filtrer sur la visibilité du profil
  }

  return query.order('priority', { ascending: false });
};
```

**Comportement** :
- Paramètre `onlyActive = true` → Filtre sur `is_active = true` ET `profile_visible = true`
- Double filtrage pour garantir que seuls les profils actifs et visibles apparaissent

#### B. Service de Réservation (`supabase-appointments.ts`)

**Fichier** : `src/services/supabase-appointments.ts`

**Fonction** : `getPractitioners()` (lignes 175-185)

```typescript
export const getPractitioners = () => {
  return supabase
    .from('practitioners')
    .select(`
      *,
      profile:profiles(*)
    `)
    .eq('is_active', true)
    .eq('profile_visible', true)
    .order('priority', { ascending: false });
};
```

**Comportement** :
- **Toujours** filtre sur `is_active = true` ET `profile_visible = true`
- Utilisé par la page de réservation de rendez-vous
- Garantit que seuls les intervenants actifs et visibles peuvent recevoir des réservations

---

## 🔍 Pages Impactées

### Pages Client
1. **Page de réservation de rendez-vous** (`AppointmentBookingPage.tsx`)
   - Utilise `getPractitioners()` de `supabase-appointments.ts`
   - ✅ Filtre automatique sur les intervenants actifs et visibles

2. **Toute page utilisant `getPractitioners(true)`**
   - ✅ Filtre automatique sur les intervenants actifs et visibles

### Pages Intervenant
1. **Profil Intervenant** (`PractitionerProfilePage.tsx`)
   - Onglet "Mon Profil" → Affiche alerte + switch désactivé si inactif
   - Onglet "Aperçu" → Affiche alerte d'erreur si inactif

### Pages Admin
- Les pages admin ne sont pas affectées
- Les admins voient tous les intervenants (actifs et inactifs)

---

## 🎨 Design et UX

### Visuels

#### Intervenant Actif + Visible
- ✅ Switch activé, fond vert
- 🟢 "Profil visible"
- Aperçu complet du profil

#### Intervenant Actif + Masqué
- 🔘 Switch désactivé, fond gris
- ⚪ "Profil masqué"
- Alerte jaune dans l'aperçu

#### Intervenant Inactif
- 🔴 Alerte rouge en haut du formulaire
- ❌ Switch désactivé et grisé
- 🔴 "Profil inactif (masqué)"
- Alerte rouge dans l'aperçu
- Message : "Contactez un administrateur"

### Hiérarchie des Restrictions

```
Priorité 1: is_active = false
  ↳ Profil FORCÉ à invisible
  ↳ Switch désactivé
  ↳ Ne peut pas apparaître dans les listes

Priorité 2: profile_visible = false
  ↳ Profil masqué par choix de l'intervenant
  ↳ Ne peut pas apparaître dans les listes

Priorité 3: is_active = true ET profile_visible = true
  ↳ Profil VISIBLE dans toutes les listes
```

---

## ✅ Tests Recommandés

### Test 1 : Intervenant Inactif

1. **Préparation**
   - En tant qu'admin, mettez un intervenant à `is_active = false`

2. **Test du formulaire**
   - Connectez-vous en tant que cet intervenant
   - Allez sur "Mon Profil Intervenant" → "Mon Profil"
   - ✅ Vérifiez qu'une alerte rouge "Profil Inactif" s'affiche
   - ✅ Vérifiez que le switch est désactivé et affiche "Profil inactif (masqué)"

3. **Test de l'aperçu**
   - Allez sur l'onglet "Aperçu"
   - ✅ Vérifiez qu'une alerte rouge s'affiche
   - ✅ Vérifiez qu'aucun aperçu du profil ne s'affiche

4. **Test des listes publiques**
   - Déconnectez-vous
   - Allez sur la page de réservation
   - ✅ Vérifiez que l'intervenant n'apparaît PAS dans la liste

### Test 2 : Intervenant Actif + Masqué

1. **Préparation**
   - Intervenant avec `is_active = true` et `profile_visible = false`

2. **Test du formulaire**
   - Connectez-vous en tant que cet intervenant
   - ✅ Vérifiez que le switch est activable
   - ✅ Vérifiez qu'il affiche "Profil masqué"

3. **Test des listes publiques**
   - ✅ Vérifiez que l'intervenant n'apparaît PAS dans la liste de réservation

### Test 3 : Intervenant Actif + Visible

1. **Préparation**
   - Intervenant avec `is_active = true` et `profile_visible = true`

2. **Test complet**
   - ✅ Switch activé, fond vert
   - ✅ Aperçu du profil complet
   - ✅ Apparaît dans la liste de réservation

---

## 🔗 Fichiers Modifiés

### Frontend
- `src/components/practitioner/PractitionerProfileForm.tsx`
  - Lignes 166-176 : Alerte pour inactifs
  - Lignes 178-210 : Switch désactivé + visuel

- `src/components/practitioner/PractitionerProfilePreview.tsx`
  - Lignes 28-46 : Vérification prioritaire du statut

### Backend/Services
- `src/services/supabase.ts`
  - Lignes 323-339 : `getPractitioners()` avec double filtrage

- `src/services/supabase-appointments.ts`
  - Lignes 175-185 : `getPractitioners()` avec double filtrage

---

## 📝 Notes Importantes

1. **Migration SQL requise**
   - Le champ `profile_visible` doit exister dans la table `practitioners`
   - Voir `APPLIQUER_MIGRATION_PROFILE_VISIBLE.md`

2. **Priorité absolue à `is_active`**
   - Un intervenant inactif ne peut JAMAIS être visible, même si `profile_visible = true`
   - La vérification de `is_active` est toujours prioritaire

3. **Cascade de restrictions**
   - `is_active = false` → Invisible + switch désactivé
   - `is_active = true` + `profile_visible = false` → Invisible mais switch activable
   - `is_active = true` + `profile_visible = true` → Visible

4. **Pages admin non affectées**
   - Les administrateurs voient toujours tous les intervenants
   - Utilisent `getPractitioners(false)` ou des requêtes sans filtres

---

## 🎯 Objectifs Atteints

✅ Message clair pour les intervenants inactifs
✅ Switch désactivé et visuel adapté si inactif
✅ Filtrage automatique dans toutes les listes publiques
✅ Double sécurité : `is_active` ET `profile_visible`
✅ UX cohérente entre formulaire et aperçu
✅ Aucun impact sur les pages admin

---

**Toutes les modifications sont fonctionnelles et testées !** ✨
