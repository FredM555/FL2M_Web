# 📋 Synthèse du Projet FLM Services

## 🎯 Vue d'ensemble

**Nom du projet** : FLM Services
**Type** : Application web de gestion de rendez-vous pour services de coaching/accompagnement
**Stack technique** : React + TypeScript + Supabase + Material-UI + Capacitor (mobile)

---

## 🎨 Charte graphique

### Couleurs principales
- **Couleur primaire** : À définir selon votre branding
- **Couleur secondaire** : À définir
- **Fond** : Blanc avec images de fond personnalisées par page
- **Texte** : Gris foncé pour le contenu, noir pour les titres

### Typographie
- **Police principale** : Roboto (Material-UI par défaut)
- **Tailles** :
  - Titres : variant="h4", "h5", "h6"
  - Corps de texte : variant="body1", "body2"

### Composants UI
- Framework : Material-UI (MUI v5+)
- Thème personnalisé avec fond d'écran par page
- Cards avec ombres et bordures arrondies
- Boutons avec variantes "contained", "outlined", "text"

---

## 🏗️ Architecture du Projet

### Structure des dossiers
```
src/
├── components/
│   ├── admin/              # Composants admin
│   ├── appointments/       # Gestion des RDV
│   │   ├── AppointmentDocuments.tsx
│   │   ├── AppointmentComments.tsx
│   │   ├── PDFThumbnail.tsx
│   │   ├── PDFViewer.tsx
│   │   └── AudioPlayer.tsx
│   ├── layout/             # Layouts (Admin, Main)
│   └── profile/            # Gestion profils
├── pages/                  # Pages de l'application
├── services/               # Services (Supabase, etc.)
├── context/                # Contextes React (Auth)
└── main.tsx               # Point d'entrée

public/
├── pdf-worker/            # Worker PDF.js
└── images/                # Images du site

supabase/
├── migrations/            # Migrations SQL
└── tests/                 # Tests Supabase
```

---

## 🗄️ Base de données (Supabase)

### Tables principales

#### `profiles`
Utilisateurs de l'application
- `id` (UUID, PK) - Référence auth.users
- `first_name`, `last_name`, `email`, `phone`
- `user_type` : 'admin' | 'intervenant' | 'client'
- `birth_date`, `pseudo`
- `is_active` (boolean)
- `created_by`, `updated_by` (audit)

#### `practitioners`
Intervenants/Consultants
- `id` (UUID, PK)
- `user_id` (FK → profiles)
- `bio`, `display_name`, `title`, `summary`
- `priority` (ordre d'affichage)
- `is_active` (boolean)

#### `services`
Services proposés
- `id` (UUID, PK)
- `code`, `name`, `category`, `subcategory`
- `price` (numeric), `duration` (minutes)
- `description`, `is_on_demand`
- `caracteristiques`, `objectifs`, `methodes` (JSONB)

#### `appointments`
Rendez-vous
- `id` (UUID, PK)
- `client_id` (FK → profiles)
- `practitioner_id` (FK → practitioners)
- `service_id` (FK → services)
- `start_time`, `end_time`
- `status` : 'pending' | 'confirmed' | 'cancelled' | 'completed'
- `payment_status` : 'unpaid' | 'paid' | 'refunded'
- `beneficiary_first_name`, `beneficiary_last_name`, `beneficiary_birth_date`
- `meeting_link` (URL visioconférence)
- `custom_price` (prix personnalisé, NULL = prix du service)
- `rating`, `review`

#### `appointment_documents`
Documents (PDF, MP3, MP4) liés aux rendez-vous
- `id` (UUID, PK)
- `appointment_id` (FK → appointments)
- `file_name`, `file_path`, `file_size`, `file_type`
- `uploaded_by` (FK → profiles)
- `description`
- `visible_to_client`, `visible_to_consultant` (boolean)
- `created_by`, `updated_by` (audit)

#### `appointment_comments`
Commentaires et notes sur les rendez-vous
- `id` (UUID, PK)
- `appointment_id` (FK → appointments)
- `author_id` (FK → profiles)
- `content` (text)
- `is_private` (boolean) - true = note privée consultant

#### `practitioner_requests`
Demandes pour devenir intervenant
- `id` (UUID, PK)
- `user_id` (FK → profiles)
- `motivation`, `experience`, `certifications`, `specialties`
- `proposed_display_name`, `proposed_title`, `proposed_bio`
- `status` : 'pending' | 'approved' | 'rejected'
- `admin_notes`, `reviewed_by`, `reviewed_at`

#### `availability`
Disponibilités des intervenants
- `id` (UUID, PK)
- `practitioner_id` (FK → practitioners)
- `day_of_week` (0-6)
- `start_time`, `end_time`

#### `login_logs`
Logs de connexion
- `id` (UUID, PK)
- `user_id` (FK → profiles)
- `login_time`, `ip_address`, `user_agent`
- `country`, `city`, `region`, `latitude`, `longitude`

---

## 🔒 Sécurité & Permissions (RLS)

### Row Level Security (RLS)
Toutes les tables ont RLS activé avec politiques spécifiques :
- **Admins** : Accès complet à tout
- **Intervenants** : Accès à leurs propres données et rendez-vous
- **Clients** : Accès à leurs propres rendez-vous et profil

### Storage (Supabase)
Bucket `documents` (privé) :
- Politiques RLS pour upload/download
- Admins et intervenants peuvent uploader
- Clients peuvent voir selon `visible_to_client`

### Content Security Policy (CSP)
Configuration dans `vite.config.ts` et `index.html` :
- Autorisation Supabase, Google OAuth, Apple OAuth
- Support des blob URLs pour PDF.js
- Workers autorisés pour react-pdf

---

## 🚀 Fonctionnalités principales

### Gestion des rendez-vous
- ✅ Création de RDV par admin ou client
- ✅ Attribution à un intervenant
- ✅ Gestion du statut (pending, confirmed, cancelled, completed)
- ✅ Informations bénéficiaire (si différent du client)
- ✅ Prix personnalisé par RDV
- ✅ Lien de visioconférence
- ✅ Notes et évaluations

### Documents et commentaires
- ✅ Upload de documents (PDF, MP3, MP4)
- ✅ Aperçu miniature des PDFs
- ✅ Visualiseur PDF plein écran avec navigation
- ✅ Lecteur audio intégré
- ✅ Gestion de la visibilité (client/consultant)
- ✅ Commentaires publics et notes privées

### Système d'intervenants
- ✅ Demande pour devenir intervenant
- ✅ Validation par admin
- ✅ Profil intervenant personnalisable
- ✅ Gestion des disponibilités
- ✅ Activation/désactivation

### Authentification
- ✅ Email/Password (Supabase Auth)
- ✅ Google OAuth
- ✅ Apple OAuth
- ✅ Récupération mot de passe
- ✅ Logs de connexion avec géolocalisation

### Administration
- ✅ Dashboard admin
- ✅ Gestion utilisateurs/profils
- ✅ Gestion intervenants
- ✅ Gestion services
- ✅ Vue calendrier des RDV
- ✅ Validation demandes intervenants

---

## 📱 Mobile (Capacitor)

### Configuration
- Android : `capacitor.config.ts`
- Plugins :
  - `@capacitor/browser` - Ouverture navigateur externe
  - `@capacitor/device` - Info appareil
  - `@codetrix-studio/capacitor-google-auth` - Google OAuth

### Build Android
```bash
npm run build
npx cap sync
npx cap open android
```

---

## 🛠️ Technologies et dépendances

### Core
- **React** 19.0+ avec TypeScript
- **Vite** 6.2+ (build tool)
- **Material-UI** (@mui/material) 6+
- **React Router** 7+ (navigation)

### Backend & Auth
- **Supabase** (BaaS)
  - Authentication
  - PostgreSQL Database
  - Storage
  - Row Level Security

### PDF & Documents
- **react-pdf** 10.2+ (visualisation PDF)
- **pdfjs-dist** 5.4.296 (worker PDF.js)

### Mobile
- **Capacitor** 7.4+ (iOS/Android)
- **Capacitor Google Auth** 3.4+

---

## 📝 Scripts NPM

```json
{
  "start": "npm run copy-pdf-worker && vite",
  "dev": "npm run copy-pdf-worker && vite",
  "build": "npm run copy-pdf-worker && tsc -b && vite build",
  "copy-pdf-worker": "Copie le worker PDF.js dans public/",
  "lint": "eslint .",
  "preview": "vite preview"
}
```

---

## 🔧 Configuration importante

### Variables d'environnement (.env)
```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
```

### CSP (Content Security Policy)
**IMPORTANT** : Le CSP est défini dans **`vite.config.ts`** (pas seulement index.html)

Directives critiques pour react-pdf :
- `script-src` : doit inclure `blob:` et `https://unpkg.com`
- `connect-src` : doit inclure `blob:`
- `worker-src` : doit inclure `'self' blob:`
- `img-src` : doit inclure `blob:` et `data:`

### Worker PDF.js
Le worker est **copié automatiquement** depuis `node_modules/react-pdf/node_modules/pdfjs-dist/build/` vers `public/pdf-worker/` avant chaque démarrage.

**Version** : 5.4.296 (doit correspondre à celle de react-pdf)

---

## 🐛 Problèmes connus et solutions

### Problème : Aperçu PDF ne fonctionne pas
**Cause** : CSP bloque les blob URLs ou le worker PDF.js
**Solution** : Vérifier que `vite.config.ts` contient bien `blob:` dans toutes les directives nécessaires

### Problème : "record has no field created_by"
**Cause** : Triggers d'audit sur les tables sans colonnes `created_by`/`updated_by`
**Solution** : Ajouter ces colonnes à toutes les tables avec triggers d'audit

### Problème : Conflit de versions pdfjs-dist
**Cause** : Deux versions installées (racine + react-pdf)
**Solution** : Le script `copy-pdf-worker` copie depuis la bonne version (react-pdf)

### Problème : Google OAuth ne fonctionne pas en dev
**Cause** : Redirect URI non configuré
**Solution** : Ajouter `http://localhost:5173` dans Google Cloud Console

---

## 📊 Flux utilisateur

### Client
1. Inscription/Connexion
2. Navigation des services
3. Prise de rendez-vous
4. Consultation de ses RDV
5. Accès aux documents (si visibles)
6. Notation post-RDV

### Intervenant
1. Connexion (ou demande d'accès)
2. Gestion profil intervenant
3. Consultation calendrier
4. Accès détails RDV
5. Upload documents
6. Ajout commentaires/notes

### Admin
1. Connexion
2. Dashboard complet
3. Gestion utilisateurs
4. Validation demandes intervenants
5. Gestion services/intervenants
6. Vue globale des RDV

---

## 🔄 Migrations importantes exécutées

### Structure de base
- `create_profile_trigger.sql` - Auto-création profil lors inscription
- `update_profiles_rls_policies.sql` - Politiques de sécurité profils

### Fonctionnalités RDV
- `20250115_add_meeting_link.sql` - Lien visio
- `20250115_add_custom_price.sql` - Prix personnalisé
- `20250115_fix_appointments_rls.sql` - Permissions RDV

### Documents et commentaires
- `20250115_add_documents_and_comments.sql` - Tables principales
- `20250115_setup_storage_documents.sql` - Bucket et politiques
- `20250115_update_appointment_documents.sql` - Ajout colonnes
- `20250116_add_audit_columns_to_appointment_documents.sql` - Colonnes audit

### Système intervenants
- `20250115_create_practitioner_requests.sql` - Demandes intervenant
- `20250115_update_practitioner_rls.sql` - Permissions intervenants

---

## 📞 Informations de contact projet

**Client** : FLM
**Domaine** : Services d'accompagnement
**URL prod** : À définir
**Supabase Project** : Configurer dans .env

---

## 🎓 Pour reprendre le projet

### 1. Installation
```bash
git clone [repository]
cd flm-services-new
npm install
```

### 2. Configuration
- Copier `.env.example` vers `.env`
- Remplir les clés Supabase

### 3. Lancement
```bash
npm run dev
```

### 4. Build production
```bash
npm run build
```

### 5. Migrations Supabase
- Se connecter au dashboard Supabase
- SQL Editor → Exécuter les migrations si nécessaire

---

## 🔮 Améliorations futures possibles

- [ ] Mode sombre
- [ ] Notifications push (RDV confirmés, rappels)
- [ ] Paiement en ligne (Stripe)
- [ ] Synchronisation calendrier externe (Google Calendar)
- [ ] Chatbot support
- [ ] Statistiques intervenants (nb RDV, revenus)
- [ ] Export PDF des factures
- [ ] Multilingue (i18n)
- [ ] PWA (Progressive Web App)
- [ ] Miniatures pré-générées pour PDFs

---

**Dernière mise à jour** : 16 novembre 2025
**Version** : 1.0.0
