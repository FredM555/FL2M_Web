# Architecture Bénéficiaires - Documentation Complète

## 📋 Table des matières

- [Vue d'ensemble](#vue-densemble)
- [Architecture](#architecture)
- [Cas d'usage](#cas-dusage)
- [Plan de migration](#plan-de-migration)
- [Utilisation](#utilisation)
- [API Reference](#api-reference)
- [Exemples de code](#exemples-de-code)

---

## 📖 Vue d'ensemble

Cette architecture introduit un système complet de gestion des bénéficiaires avec :

✅ **Propriété hybride** : Un propriétaire principal + partage optionnel
✅ **Multi-bénéficiaires** : Support natif des couples et équipes
✅ **Données de numérologie** : Stockage centralisé et réutilisable
✅ **Historique global** : Suivi complet des rendez-vous par bénéficiaire
✅ **Permissions granulaires** : Contrôle précis des accès

### Problèmes résolus

| Avant | Après |
|-------|-------|
| ❌ Données dupliquées dans chaque RDV | ✅ Un bénéficiaire = une entrée unique |
| ❌ Impossible de gérer plusieurs bénéficiaires | ✅ Support couples/équipes natif |
| ❌ Pas de suivi global | ✅ Historique complet par bénéficiaire |
| ❌ Données numérologie perdues | ✅ Stockage permanent et réutilisable |
| ❌ Pas de co-gestion | ✅ Partage/délégation flexible |

---

## 🏗️ Architecture

### Schéma des tables

```
┌─────────────┐         ┌──────────────────┐         ┌─────────────────┐
│  profiles   │────────▶│  beneficiaries   │◀────────│ beneficiary_    │
│             │ owner   │                  │ shared  │ access          │
└─────────────┘         └──────────────────┘         └─────────────────┘
       │                         │                            │
       │                         │                            │
       │                         ▼                            │
       │              ┌──────────────────────┐                │
       │              │ appointment_         │                │
       └─────────────▶│ beneficiaries        │◀───────────────┘
        (optionnel)   │                      │
                      └──────────────────────┘
                                │
                                ▼
                      ┌──────────────────┐
                      │  appointments    │
                      └──────────────────┘
```

### 1. Table `beneficiaries`

**Fonction** : Stockage principal des bénéficiaires

**Champs principaux** :
- `id` : UUID unique
- `owner_id` : Propriétaire principal (obligatoire)
- `first_name`, `middle_names`, `last_name` : Identité
- `birth_date` : Date de naissance
- `email`, `phone` : Contact (optionnel)
- `chemin_de_vie`, `racine_1`, `racine_2`, etc. : Numérologie
- `metadata` : JSONB pour futures extensions

**Contraintes** :
- Unicité : `(first_name, last_name, birth_date)`
- Le propriétaire ne peut pas être supprimé tant qu'il possède des bénéficiaires

### 2. Table `beneficiary_access`

**Fonction** : Gestion des accès partagés (co-gestion, délégation)

**Champs principaux** :
- `beneficiary_id` : Bénéficiaire concerné
- `user_id` : Utilisateur ayant l'accès
- `relationship` : Type de relation ('child', 'spouse', 'parent', etc.)
- `access_level` : Niveau global ('view', 'book', 'edit', 'admin')
- `can_book`, `can_view`, `can_edit`, `can_share` : Permissions détaillées
- `expires_at` : Date d'expiration (optionnel)

**Exemples** :
```typescript
// Parent séparé qui peut voir et prendre RDV pour son enfant
{
  relationship: 'parent',
  access_level: 'book',
  can_view: true,
  can_book: true,
  can_edit: false
}

// Grand-parent qui peut uniquement consulter
{
  relationship: 'grandparent',
  access_level: 'view',
  can_view: true,
  can_book: false,
  can_edit: false
}
```

### 3. Table `appointment_beneficiaries`

**Fonction** : Liaison many-to-many entre rendez-vous et bénéficiaires

**Champs principaux** :
- `appointment_id` : Rendez-vous
- `beneficiary_id` : Bénéficiaire
- `role` : Rôle dans le RDV ('primary', 'partner', 'team_member')
- `role_order` : Ordre d'affichage (1, 2, 3...)
- `receives_notifications` : Recevoir les emails pour ce RDV

**Exemples** :
```typescript
// RDV Individuel
[{ beneficiary_id: 'ben-1', role: 'primary', role_order: 1 }]

// RDV Couple
[
  { beneficiary_id: 'ben-1', role: 'partner', role_order: 1 },
  { beneficiary_id: 'ben-2', role: 'partner', role_order: 2 }
]

// RDV Équipe (3 personnes)
[
  { beneficiary_id: 'ben-1', role: 'team_member', role_order: 1 },
  { beneficiary_id: 'ben-2', role: 'team_member', role_order: 2 },
  { beneficiary_id: 'ben-3', role: 'team_member', role_order: 3 }
]
```

### 4. Modification `profiles`

**Ajout** : `beneficiary_id` (optionnel)

**Fonction** : Lier un utilisateur à son propre profil bénéficiaire

**Cas d'usage** :
- Utilisateur qui consulte pour lui-même → `beneficiary_id` renseigné
- Utilisateur qui consulte uniquement pour d'autres (enfants) → `beneficiary_id` null

---

## 🎯 Cas d'usage

### Cas 1 : Parent avec plusieurs enfants

**Acteurs** :
- Marie (utilisateur, parent)
- Paul (bénéficiaire, enfant 1)
- Julie (bénéficiaire, enfant 2)

**Structure** :
```typescript
// Marie (profiles)
{
  id: 'user-marie',
  email: 'marie@example.com',
  beneficiary_id: null  // Ne consulte pas pour elle-même
}

// Paul (beneficiaries)
{
  id: 'ben-paul',
  owner_id: 'user-marie',
  first_name: 'Paul',
  last_name: 'Dupont',
  birth_date: '2019-05-10'
}

// Julie (beneficiaries)
{
  id: 'ben-julie',
  owner_id: 'user-marie',
  first_name: 'Julie',
  last_name: 'Dupont',
  birth_date: '2016-03-15'
}
```

**Résultat** :
- Marie voit Paul et Julie dans sa liste de bénéficiaires
- Marie peut prendre des RDV pour Paul OU Julie
- Historique complet de chaque enfant conservé

### Cas 2 : Parents séparés co-gérant un enfant

**Acteurs** :
- Pierre (utilisateur, père)
- Sophie (utilisateur, mère)
- Lucas (bénéficiaire, enfant)

**Structure** :
```typescript
// Lucas (beneficiaries)
{
  id: 'ben-lucas',
  owner_id: 'user-pierre',  // Pierre est le propriétaire principal
  first_name: 'Lucas',
  last_name: 'Martin'
}

// Accès partagé pour Sophie (beneficiary_access)
{
  beneficiary_id: 'ben-lucas',
  user_id: 'user-sophie',
  relationship: 'parent',
  access_level: 'book',
  can_view: true,
  can_book: true,
  can_edit: false
}
```

**Résultat** :
- Pierre (propriétaire) : peut tout faire
- Sophie (accès partagé) : peut voir et prendre RDV, mais pas modifier les infos
- Les deux voient l'historique complet de Lucas

### Cas 3 : Couple consultant ensemble

**Acteurs** :
- Marc (utilisateur, bénéficiaire)
- Anne (utilisateur, bénéficiaire)

**Structure** :
```typescript
// Profil Marc
{
  id: 'user-marc',
  beneficiary_id: 'ben-marc'
}

// Bénéficiaire Marc
{
  id: 'ben-marc',
  owner_id: 'user-marc',
  first_name: 'Marc'
}

// Bénéficiaire Anne
{
  id: 'ben-anne',
  owner_id: 'user-anne',
  first_name: 'Anne'
}

// Accès partagé : Marc peut gérer Anne
{
  beneficiary_id: 'ben-anne',
  user_id: 'user-marc',
  relationship: 'spouse',
  access_level: 'book'
}

// Accès partagé : Anne peut gérer Marc
{
  beneficiary_id: 'ben-marc',
  user_id: 'user-anne',
  relationship: 'spouse',
  access_level: 'book'
}

// RDV Couple (appointment_beneficiaries)
{
  appointment_id: 'rdv-123',
  beneficiaries: [
    { beneficiary_id: 'ben-marc', role: 'partner', role_order: 1 },
    { beneficiary_id: 'ben-anne', role: 'partner', role_order: 2 }
  ]
}
```

**Résultat** :
- Marc et Anne peuvent chacun prendre RDV pour l'autre
- Un seul RDV peut avoir les deux bénéficiaires (module couple)

### Cas 4 : Équipe sportive

**Acteurs** :
- Coach (utilisateur)
- Joueur 1, 2, 3, ... (bénéficiaires)

**Structure** :
```typescript
// RDV Équipe
{
  appointment_id: 'rdv-team',
  service: 'Module Équipe Sportive',
  beneficiaries: [
    { beneficiary_id: 'joueur-1', role: 'team_member', role_order: 1 },
    { beneficiary_id: 'joueur-2', role: 'team_member', role_order: 2 },
    { beneficiary_id: 'joueur-3', role: 'team_member', role_order: 3 },
    // ... jusqu'à n joueurs
  ]
}
```

---

## 📝 Plan de migration

### Phase 1 : Préparation (1 jour)

**Objectif** : Créer les nouvelles structures sans toucher aux données

**Actions** :
1. ✅ Exécuter `20250120_beneficiaries_architecture.sql`
2. ✅ Vérifier que les tables sont créées
3. ✅ Vérifier que les fonctions SQL fonctionnent
4. ✅ Vérifier que le RLS est actif

**Commandes** :
```bash
# Connexion à Supabase
supabase db push

# Vérifier les tables
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'benefic%';
```

**Résultat attendu** :
- 3 nouvelles tables : `beneficiaries`, `beneficiary_access`, `appointment_beneficiaries`
- 1 nouvelle colonne : `profiles.beneficiary_id`
- Anciennes colonnes `appointments.beneficiary_*` toujours présentes

### Phase 2 : Migration des données (1 heure)

**Objectif** : Transférer les données existantes vers la nouvelle structure

**Actions** :
1. ✅ **BACKUP DE LA BASE** (obligatoire !)
2. ✅ Exécuter `20250120_migrate_beneficiaries_data.sql`
3. ✅ Vérifier les logs de migration
4. ✅ Comparer les compteurs

**Commandes** :
```bash
# Backup
pg_dump your_database > backup_before_migration.sql

# Migration
supabase db push

# Vérification
SELECT
  (SELECT COUNT(*) FROM appointments WHERE beneficiary_first_name IS NOT NULL) as old_count,
  (SELECT COUNT(*) FROM beneficiaries) as beneficiaries_count,
  (SELECT COUNT(*) FROM appointment_beneficiaries) as links_count;
```

**Résultat attendu** :
```
old_count | beneficiaries_count | links_count
----------|---------------------|------------
   150    |        87           |    150
```
- `old_count` = RDV avec bénéficiaire dans anciennes colonnes
- `beneficiaries_count` = Bénéficiaires uniques créés (< old_count car dédupliqués)
- `links_count` = Liaisons RDV-Bénéficiaires (= old_count)

### Phase 3 : Développement front-end (2-3 jours)

**Objectif** : Adapter l'interface pour utiliser la nouvelle architecture

**À faire** :
1. ✅ Créer composant `BeneficiarySelector` (sélection/création)
2. ✅ Créer composant `BeneficiaryManagement` (CRUD)
3. ✅ Créer composant `BeneficiaryAccessManagement` (partage)
4. ✅ Modifier formulaire de réservation de RDV
5. ✅ Modifier affichage des RDV (montrer tous les bénéficiaires)
6. ✅ Ajouter page "Mes bénéficiaires"

**Détails** : Voir section [Composants UI](#composants-ui)

### Phase 4 : Tests (1 jour)

**Scénarios à tester** :
- [ ] Créer un bénéficiaire
- [ ] Prendre un RDV pour un bénéficiaire (module individuel)
- [ ] Prendre un RDV pour 2 bénéficiaires (module couple)
- [ ] Partager l'accès à un bénéficiaire
- [ ] Voir l'historique d'un bénéficiaire
- [ ] Modifier les données de numérologie
- [ ] Bénéficiaire sans compte utilisateur

### Phase 5 : Déploiement (1 jour)

1. **Staging** :
   - Déployer sur environnement de test
   - Tester avec données réelles clonées
   - Valider avec utilisateurs test

2. **Production** :
   - Backup complet
   - Exécuter migrations
   - Déployer front-end
   - Surveiller les erreurs

3. **Post-déploiement** (après 1 semaine) :
   - Vérifier que tout fonctionne
   - Exécuter `20250120_cleanup_old_beneficiary_columns.sql`
   - Supprimer les anciennes colonnes

---

## 💻 Utilisation

### Import des services

```typescript
import {
  getUserBeneficiaries,
  createBeneficiary,
  updateBeneficiary,
  shareBeneficiaryAccess,
  getAppointmentBeneficiaries,
  addBeneficiaryToAppointment
} from '@/services/beneficiaries';

import type {
  Beneficiary,
  CreateBeneficiaryData,
  BeneficiaryWithAccess
} from '@/types/beneficiary';
```

### Récupérer les bénéficiaires de l'utilisateur

```typescript
const { data: beneficiaries, error } = await getUserBeneficiaries();

if (error) {
  console.error('Erreur:', error);
} else {
  console.log('Mes bénéficiaires:', beneficiaries);
  // beneficiaries contient les bénéficiaires propriétaires ET partagés
}
```

### Créer un nouveau bénéficiaire

```typescript
const newBeneficiary: CreateBeneficiaryData = {
  first_name: 'Paul',
  middle_names: 'Jean Marie',
  last_name: 'Dupont',
  birth_date: '2019-05-10',
  email: 'paul.dupont@example.com',
  phone: '0612345678',
  notifications_enabled: true,
  // Données numérologie
  chemin_de_vie: 7,
  racine_1: 3,
  racine_2: 4,
  notes: 'Enfant très actif'
};

const { data, error } = await createBeneficiary(newBeneficiary);
```

### Partager l'accès à un bénéficiaire

```typescript
// Parent séparé qui peut voir et prendre RDV
const shareData: ShareBeneficiaryAccessData = {
  beneficiary_id: 'ben-123',
  user_email: 'autre.parent@example.com',
  relationship: 'parent',
  access_level: 'book',
  can_view: true,
  can_book: true,
  can_edit: false,
  notes: 'Accès pour co-parentalité',
  expires_at: null  // Permanent
};

const { data, error } = await shareBeneficiaryAccess(shareData);
```

### Créer un RDV avec bénéficiaires

```typescript
// 1. Créer le RDV normalement
const { data: appointment, error } = await createAppointment({
  practitioner_id: 'prat-123',
  service_id: 'service-couple',
  start_time: '2025-02-15T14:00:00Z',
  end_time: '2025-02-15T15:30:00Z',
  client_id: 'user-123',
  status: 'pending'
});

// 2. Ajouter les bénéficiaires
if (appointment) {
  // Module couple : 2 bénéficiaires
  await addBeneficiaryToAppointment(
    appointment.id,
    'ben-marc',
    'partner',
    1  // Ordre 1
  );

  await addBeneficiaryToAppointment(
    appointment.id,
    'ben-anne',
    'partner',
    2  // Ordre 2
  );
}
```

### Afficher les bénéficiaires d'un RDV

```typescript
const { data: appointmentBeneficiaries, error } =
  await getAppointmentBeneficiaries('rdv-123');

if (appointmentBeneficiaries) {
  appointmentBeneficiaries.forEach(ab => {
    console.log(`${ab.role} (${ab.role_order}):`,
                ab.beneficiary?.first_name,
                ab.beneficiary?.last_name);
  });
}

// Résultat :
// partner (1): Marc Durand
// partner (2): Anne Durand
```

### Obtenir les statistiques d'un bénéficiaire

```typescript
const { data: stats, error } = await getBeneficiaryStats('ben-123');

console.log(`
  Total RDV : ${stats.total_appointments}
  Terminés : ${stats.completed_appointments}
  À venir : ${stats.upcoming_appointments}
  Intervenants consultés : ${stats.practitioners_count}
  Premier RDV : ${stats.first_appointment_date}
`);
```

---

## 📚 API Reference

Voir le fichier `src/services/beneficiaries.ts` pour la documentation complète.

**Principales fonctions** :

| Fonction | Description |
|----------|-------------|
| `getUserBeneficiaries()` | Liste complète des bénéficiaires accessibles |
| `createBeneficiary()` | Créer un nouveau bénéficiaire |
| `updateBeneficiary()` | Modifier un bénéficiaire |
| `deleteBeneficiary()` | Supprimer un bénéficiaire |
| `shareBeneficiaryAccess()` | Partager l'accès avec un autre utilisateur |
| `revokeBeneficiaryAccess()` | Révoquer un accès partagé |
| `addBeneficiaryToAppointment()` | Ajouter un bénéficiaire à un RDV |
| `getAppointmentBeneficiaries()` | Liste des bénéficiaires d'un RDV |
| `getBeneficiaryStats()` | Statistiques d'un bénéficiaire |

---

## 🎨 Composants UI

### Composants à créer

1. **`BeneficiarySelector`** : Sélection ou création rapide
2. **`BeneficiaryCard`** : Carte affichant un bénéficiaire
3. **`BeneficiaryForm`** : Formulaire CRUD complet
4. **`BeneficiaryAccessManager`** : Gestion des partages
5. **`BeneficiaryHistory`** : Historique des RDV
6. **`BeneficiaryStats`** : Statistiques et graphiques

### Exemple : BeneficiarySelector

```typescript
interface BeneficiarySelectorProps {
  value: string[];  // IDs des bénéficiaires sélectionnés
  onChange: (beneficiaryIds: string[]) => void;
  maxBeneficiaries?: number;  // Ex: 2 pour module couple
  allowCreate?: boolean;
}

const BeneficiarySelector: React.FC<BeneficiarySelectorProps> = ({
  value,
  onChange,
  maxBeneficiaries = 1,
  allowCreate = true
}) => {
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);

  // Charger les bénéficiaires disponibles
  useEffect(() => {
    getUserBeneficiaries().then(({ data }) => {
      if (data) setBeneficiaries(data);
    });
  }, []);

  // Rendu : autocomplete + bouton créer
  return (
    <Box>
      <Autocomplete
        multiple={maxBeneficiaries > 1}
        options={beneficiaries}
        value={value}
        onChange={(_, newValue) => onChange(newValue)}
        getOptionLabel={(b) => `${b.first_name} ${b.last_name}`}
        renderInput={(params) => (
          <TextField {...params} label="Bénéficiaire(s)" />
        )}
      />
      {allowCreate && (
        <Button onClick={handleCreateNew}>
          + Nouveau bénéficiaire
        </Button>
      )}
    </Box>
  );
};
```

---

## ⚠️ Points d'attention

### Sécurité

- **RLS activé** : Vérifier que Row Level Security est bien configuré
- **Validation côté serveur** : Ne jamais faire confiance uniquement au front
- **Données sensibles** : Numérologie = données personnelles → RGPD

### Performance

- **Index** : Bien utilisés pour les recherches fréquentes
- **Jointures** : Attention aux requêtes N+1, utiliser les joins Supabase
- **Cache** : Envisager un cache pour les bénéficiaires fréquemment consultés

### UX

- **Recherche** : Permettre recherche par nom partiel
- **Création rapide** : Formulaire simplifié vs formulaire complet
- **Feedback** : Toujours indiquer si un bénéficiaire est partagé
- **Permissions** : Afficher clairement ce que l'utilisateur peut faire

---

## 🔄 Rollback

En cas de problème en production :

### Rollback complet

```sql
-- 1. Supprimer les nouvelles données
DELETE FROM appointment_beneficiaries;
DELETE FROM beneficiary_access;
DELETE FROM beneficiaries;

-- 2. Restaurer la colonne profiles
UPDATE profiles SET beneficiary_id = NULL;

-- 3. Restaurer depuis backup
-- psql < backup_before_migration.sql
```

### Rollback partiel (garder les données)

```sql
-- Désactiver les contraintes temporairement
ALTER TABLE appointment_beneficiaries DISABLE TRIGGER ALL;
ALTER TABLE beneficiary_access DISABLE TRIGGER ALL;
ALTER TABLE beneficiaries DISABLE TRIGGER ALL;

-- Revenir à l'ancien code front-end
-- Les anciennes colonnes beneficiary_* sont toujours présentes
```

---

## 📞 Support

Pour toute question ou problème :
1. Vérifier les logs Supabase
2. Consulter cette documentation
3. Vérifier les permissions RLS
4. Contacter l'équipe de développement

---

**Date de création** : 2025-01-20
**Dernière mise à jour** : 2025-01-20
**Version** : 1.0.0
