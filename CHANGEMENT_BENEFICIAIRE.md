# Fonctionnalité : Changement de bénéficiaire

## 📋 Vue d'ensemble

Cette fonctionnalité permet aux clients et aux intervenants de **changer le bénéficiaire** d'un rendez-vous existant.

## ✅ Qui peut changer le bénéficiaire ?

### Clients 👤
- ✅ **Peuvent changer** : Si le rendez-vous est **dans plus de 48 heures**
- ❌ **Ne peuvent pas changer** : Si le rendez-vous est **dans moins de 48 heures**
- 📝 Raison : Éviter les changements de dernière minute

### Intervenants 💼
- ✅ **Peuvent toujours changer** : Pas de restriction de délai
- 📝 Raison : Ils communiquent par chat avec les clients et peuvent gérer les demandes directement

### Admins 👔
- ✅ **Peuvent toujours changer** : Accès complet

## 🎯 Comment ça marche

### Pour les clients

1. **Accéder au rendez-vous**
   - Aller dans "Mes rendez-vous"
   - Ouvrir le détail du rendez-vous

2. **Vérifier la possibilité de changement**
   - Si > 48h avant le RDV → Bouton "Changer" visible ✅
   - Si < 48h avant le RDV → Bouton "Changer" masqué ❌

3. **Changer le bénéficiaire**
   - Cliquer sur "Changer"
   - Sélectionner un nouveau bénéficiaire dans la liste
   - Confirmer

4. **Résultat**
   - L'ancien bénéficiaire est retiré
   - Le nouveau bénéficiaire est ajouté avec les mêmes attributs (rôle, notifications, etc.)

### Pour les intervenants

1. **Accéder au rendez-vous**
   - Via le calendrier hebdomadaire
   - Ou via la liste des rendez-vous

2. **Changer le bénéficiaire**
   - Bouton "Changer" toujours visible ✅
   - Sélectionner le nouveau bénéficiaire
   - Confirmer

3. **Communication**
   - Les intervenants peuvent communiquer avec les clients via le chat
   - Permet de gérer les demandes de changement même à la dernière minute

## 📝 Règles de gestion

### Conditions pour afficher le bouton "Changer"

```typescript
✅ Bouton visible si :
- Le rendez-vous n'est pas terminé (status != 'completed' && status != 'validated')
- L'utilisateur a les droits de modification
- Pour les clients : > 48h avant le RDV
- Pour les intervenants : Toujours
- Il n'y a qu'un seul bénéficiaire (pour éviter la confusion)
```

### Calcul des 48 heures

```typescript
const appointmentStartTime = parseISO(appointment.start_time);
const hoursUntilAppointment = differenceInHours(appointmentStartTime, new Date());

if (hoursUntilAppointment > 48) {
  // Client peut changer ✅
} else {
  // Client ne peut pas changer ❌
}
```

### Préservation des attributs

Quand un bénéficiaire est remplacé, **tous ses attributs sont conservés** :
- ✅ Rôle (primary, partner, child, etc.)
- ✅ Ordre du rôle (role_order)
- ✅ Préférence de notifications (receives_notifications)

## 🔧 Implémentation technique

### Fichiers modifiés

1. **`src/services/beneficiaries.ts`**
   - Nouvelle fonction : `replaceBeneficiaryInAppointment()`
   - Gère le remplacement en 3 étapes :
     1. Récupérer les attributs de l'ancien bénéficiaire
     2. Supprimer l'ancien bénéficiaire
     3. Ajouter le nouveau avec les mêmes attributs

2. **`src/components/appointments/ChangeBeneficiaryDialog.tsx`** (NOUVEAU)
   - Dialog de sélection du nouveau bénéficiaire
   - Affiche la liste des bénéficiaires du client
   - Exclut le bénéficiaire actuel

3. **`src/components/appointments/AppointmentBeneficiaryList.tsx`**
   - Bouton "Changer" ajouté
   - Logique des 48h implémentée
   - Gestion du dialog de changement

### Fonction principale : `replaceBeneficiaryInAppointment`

```typescript
export const replaceBeneficiaryInAppointment = async (
  appointmentId: string,
  oldBeneficiaryId: string,
  newBeneficiaryId: string
): Promise<{ success: boolean; error: any }> => {
  try {
    // 1. Récupérer les informations de l'ancien bénéficiaire
    const { data: oldBeneficiary } = await supabase
      .from('appointment_beneficiaries')
      .select('role, role_order, receives_notifications')
      .eq('appointment_id', appointmentId)
      .eq('beneficiary_id', oldBeneficiaryId)
      .single();

    // 2. Supprimer l'ancien
    await supabase
      .from('appointment_beneficiaries')
      .delete()
      .eq('appointment_id', appointmentId)
      .eq('beneficiary_id', oldBeneficiaryId);

    // 3. Ajouter le nouveau avec les mêmes attributs
    await supabase
      .from('appointment_beneficiaries')
      .insert({
        appointment_id: appointmentId,
        beneficiary_id: newBeneficiaryId,
        role: oldBeneficiary?.role || 'primary',
        role_order: oldBeneficiary?.role_order || 1,
        receives_notifications: oldBeneficiary?.receives_notifications ?? true
      });

    return { success: true, error: null };
  } catch (error) {
    return { success: false, error };
  }
};
```

### Logique des 48h

```typescript
// Vérifier si on peut changer de bénéficiaire
const canChangeBeneficiary = React.useMemo(() => {
  if (!profile || !canEdit) return false;

  // Les intervenants peuvent toujours changer (ils communiquent par chat)
  if (isPractitioner) return true;

  // Pour les clients : seulement si > 48h avant le RDV
  if (profile.user_type === 'client') {
    const appointmentStartTime = parseISO(appointment.start_time);
    const hoursUntilAppointment = differenceInHours(appointmentStartTime, new Date());
    return hoursUntilAppointment > 48;
  }

  return false;
}, [profile, appointment, canEdit, isPractitioner]);
```

## 🧪 Tests

### Scénario 1 : Client change > 48h avant
1. **Contexte** : Client avec RDV dans 3 jours
2. **Action** : Clic sur "Changer"
3. **Résultat attendu** : ✅ Dialog s'ouvre, liste des bénéficiaires affichée

### Scénario 2 : Client tente de changer < 48h avant
1. **Contexte** : Client avec RDV demain
2. **Action** : Regarder le bouton
3. **Résultat attendu** : ❌ Bouton "Changer" non visible

### Scénario 3 : Intervenant change à tout moment
1. **Contexte** : Intervenant avec RDV dans 1h
2. **Action** : Clic sur "Changer"
3. **Résultat attendu** : ✅ Dialog s'ouvre, peut changer

### Scénario 4 : Changement réussi
1. **Contexte** : Dialog ouvert, nouveau bénéficiaire sélectionné
2. **Action** : Clic sur "Confirmer"
3. **Résultat attendu** :
   - ✅ Ancien bénéficiaire retiré
   - ✅ Nouveau bénéficiaire ajouté
   - ✅ Attributs préservés (rôle, notifications)
   - ✅ Liste rafraîchie

## 💡 Cas d'usage

### Exemple 1 : Changement planifié
```
Client réserve un RDV pour son fils (10 ans) dans 2 semaines
→ Finalement, c'est sa fille (8 ans) qui ira
→ Client change le bénéficiaire 5 jours avant ✅
```

### Exemple 2 : Changement de dernière minute
```
Client a un empêchement 2h avant le RDV
→ Contacte l'intervenant par chat
→ Intervenant change le bénéficiaire directement ✅
```

### Exemple 3 : Restriction client
```
Client veut changer le bénéficiaire 24h avant le RDV
→ Bouton "Changer" non visible ❌
→ Doit contacter l'intervenant par chat
→ Intervenant fait le changement ✅
```

## 🔒 Sécurité

- ✅ RLS (Row Level Security) : Vérifie les permissions
- ✅ Le client ne peut voir que ses propres bénéficiaires
- ✅ L'intervenant ne peut modifier que ses propres RDV
- ✅ La validation des 48h est faite côté client ET pourrait être ajoutée côté serveur

## 📱 Interface utilisateur

### Bouton "Changer"
- **Icône** : ↔️ (SwapHorizIcon)
- **Couleur** : Bleu (primary)
- **Position** : Entre "Documents" et "Retirer"
- **Condition d'affichage** : `canChangeBeneficiary && beneficiaries.length === 1`

### Dialog de sélection
- **Titre** : "Changer le bénéficiaire"
- **Contenu** : Liste radio des bénéficiaires disponibles
- **Info** : Affiche le bénéficiaire actuel
- **Actions** : "Annuler" / "Confirmer"

## 🎨 Améliorations futures possibles

1. **Validation côté serveur** : Ajouter une fonction RPC pour vérifier les 48h
2. **Notification** : Envoyer un email quand un bénéficiaire est changé
3. **Historique** : Garder une trace des changements dans les notes
4. **Multi-bénéficiaires** : Permettre de changer un bénéficiaire spécifique parmi plusieurs

## 🐛 Dépannage

### Le bouton "Changer" n'apparaît pas

Vérifiez :
1. Le rendez-vous n'est pas terminé (`status != 'completed'`)
2. Vous êtes bien le propriétaire du RDV
3. Pour les clients : Il reste > 48h avant le RDV
4. Il n'y a qu'un seul bénéficiaire

### Le changement échoue

Vérifiez :
1. Les permissions RLS sur `appointment_beneficiaries`
2. Le nouveau bénéficiaire existe et appartient au client
3. Les logs du navigateur pour les erreurs

### Le nouveau bénéficiaire n'apparaît pas

1. Rafraîchissez la page
2. Vérifiez dans la base de données :
   ```sql
   SELECT * FROM appointment_beneficiaries
   WHERE appointment_id = 'VOTRE_APPOINTMENT_ID';
   ```

## ✅ Checklist de déploiement

- [x] Fonction `replaceBeneficiaryInAppointment` créée et exportée
- [x] Composant `ChangeBeneficiaryDialog` créé
- [x] Bouton "Changer" ajouté dans `AppointmentBeneficiaryList`
- [x] Logique des 48h implémentée
- [x] Imports et icônes ajoutés
- [x] Documentation créée
- [ ] Tests manuels effectués
- [ ] Déployé en production

## 📞 Support

Pour toute question ou problème, consulter :
- Le code source dans `src/services/beneficiaries.ts`
- Le composant `ChangeBeneficiaryDialog.tsx`
- Les logs du navigateur en cas d'erreur
