# FLM Services - Application de gestion de rendez-vous

Application web et mobile de gestion de rendez-vous pour services d'accompagnement et de coaching.

## 🚀 Démarrage rapide

### Installation
```bash
npm install
```

### Configuration
1. Créer un fichier `.env` à la racine :
```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=votre_cle_anon
```

2. Configurer la base de données Supabase :
   - Voir `supabase/ORDRE_MIGRATIONS.md` pour les migrations à exécuter

### Lancement en développement
```bash
npm run dev
```

L'application sera accessible sur `http://localhost:5173`

### Build production
```bash
npm run build
```

## 📱 Build Mobile (Android)

```bash
npm run build
npx cap sync android
npx cap open android
```

## 📚 Documentation complète

Pour une documentation détaillée du projet, consultez :
- **[PROJET_FLM_SYNTHESE.md](./PROJET_FLM_SYNTHESE.md)** - Documentation complète du projet
- **[supabase/ORDRE_MIGRATIONS.md](./supabase/ORDRE_MIGRATIONS.md)** - Ordre d'exécution des migrations
- **[BDD.MD](./BDD.MD)** - Schéma de la base de données

## 🛠️ Stack technique

- **Frontend** : React 19 + TypeScript + Vite
- **UI** : Material-UI (MUI)
- **Backend** : Supabase (BaaS)
- **Mobile** : Capacitor 7
- **PDF Viewer** : react-pdf + pdfjs-dist

## 👥 Types d'utilisateurs

- **Admin** : Gestion complète de l'application
- **Intervenant** : Gestion de son profil et ses rendez-vous
- **Client** : Prise de rendez-vous et consultation

## ✨ Fonctionnalités principales

- ✅ Gestion des rendez-vous (création, modification, annulation)
- ✅ Système d'intervenants avec demandes et validations
- ✅ Upload et visualisation de documents (PDF, MP3, MP4)
- ✅ Commentaires et notes sur les rendez-vous
- ✅ Authentification (Email/Password, Google, Apple)
- ✅ Prix personnalisé par rendez-vous
- ✅ Lien de visioconférence
- ✅ Administration complète

## 🔒 Sécurité

- Row Level Security (RLS) activé sur toutes les tables
- Content Security Policy (CSP) configuré
- Authentification Supabase sécurisée
- Storage privé avec politiques d'accès

## 📝 Scripts disponibles

```bash
npm run dev       # Lancement développement
npm run build     # Build production
npm run preview   # Preview du build
npm run lint      # Vérification code
```

## 🐛 Support

Pour toute question ou problème, consultez la documentation complète dans `PROJET_FLM_SYNTHESE.md`.

---

**Version** : 1.0.0
**Dernière mise à jour** : Novembre 2025
