// src/App.tsx
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Box } from '@mui/material';
import './index.css'
import ErrorBoundary from './components/ErrorBoundary';
import ScrollToTop from './components/ScrollToTop';
import LoadingScreen from './components/LoadingScreen';
import { useEffect, useState } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

// Layouts
import MainLayout from './components/layout/MainLayout';
import AdminLayout from './components/layout/AdminLayout';

// Pages publiques
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ProfessionnelsPage from './pages/ProfessionnelsPage';
import SportifsPage from './pages/SportifsPage';
import AppointmentPage from './pages/AppointmentPage';
import AppointmentBookingPage from './pages/AppointmentBookingPage';
import AppointmentPaymentSuccessPage from './pages/AppointmentPaymentSuccessPage';
import ContactPage from './pages/ContactPage';
import AProposPage from './pages/AproposPage';
import ConsultantsPage from './pages/ConsultantsPage';
import ConsultantDetailPage from './pages/ConsultantDetailPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import ProfileCompletionPage from './pages/ProfileCompletionPage';
import MentionsLegalesPage from './pages/MentionsLegalesPage';
import PolitiqueConfidentialitePage from './pages/PolitiqueConfidentialitePage';
import SuppressionComptePage from './pages/SuppressionComptePage';
import CGUPage from './pages/CGUPage';

// Composants Particuliers
import Particuliers from './pages/Particuliers/Particuliers';
import ModuleAdultes from './pages/Particuliers/ModuleAdultes';
import ModuleCouples from './pages/Particuliers/ModuleCouples';
import ModuleEnfants from './pages/Particuliers/ModuleEnfants';
import ModuleSuiviAnnuel from './pages/Particuliers/ModuleSuiviAnnuel';

// Composants Professionnels
import Professionnels from './pages/Professionnels/Professionnels';
import ModuleCoequipiers from './pages/Professionnels/ModuleCoequipiers';
import ModuleEquipe from './pages/Professionnels/ModuleEquipe';
import ModuleCandidats from './pages/Professionnels/ModuleCandidats';
import ModuleAssocies from './pages/Professionnels/ModuleAssocies';
import ModuleStrategies from './pages/Professionnels/ModuleStrategies';

// Composants Sportifs
import Sportifs from './pages/Sportifs/Sportifs';
import ModuleSolo from './pages/Sportifs/ModuleSolo';
import ModuleTeam from './pages/Sportifs/ModuleTeam';

// Pages protégées (nécessitent une connexion)
import ProfilePage from './pages/ProfilePage';
import PractitionerProfilePage from './pages/PractitionerProfilePage';
import PractitionerOnboardingPage from './pages/PractitionerOnboardingPage';
import PractitionerPaymentPage from './pages/PractitionerPaymentPage';
import PractitionerSubscriptionPage from './pages/PractitionerSubscriptionPage';
import MessagesPage from './pages/MessagesPage_NEW';
import MyAppointmentsPage from './pages/MyAppointmentsPage';
import PractitionerSchedulePage from './pages/Practitioner/PractitionerSchedulePage';
import PractitionerAppointmentsPage from './pages/Practitioner/PractitionerAppointmentsPage';
import PractitionerMessagesPage from './pages/Practitioner/PractitionerMessagesPage';
import { BeneficiariesPage } from './pages/BeneficiariesPage';
import PractitionerStripeConnectPage from './pages/PractitionerStripeConnectPage';
import PractitionerStripeConnectSuccessPage from './pages/PractitionerStripeConnectSuccessPage';
import MessageDuJourPage from './pages/MessageDuJourPage';

// Pages admin
import AdminDashboardPage from './pages/Admin/DashboardPage';
import AdminUsersPage from './pages/Admin/UsersPage';
import AdminPractitionersPage from './pages/Admin/PractitionersPage';
import AdminServicesPage from './pages/Admin/ServicesPage';
import AdminDailyDrawsPage from './pages/Admin/DailyDrawsPage';
import AdminAppointmentsPage from './pages/Admin/AppointmentsPage';
import AdminTransactionsPage from './pages/Admin/AdminTransactionsPage';

// Import du nouveau composant
import AdminContactMessagesPage from './pages/Admin/ContactMessagesPage_NEW';
import AdminPractitionerRequestsPage from './pages/Admin/PractitionerRequestsPage';
import AdminActivityLogsPage from './pages/Admin/ActivityLogsPage';
import { logger } from './utils/logger';

// Composant pour les routes protégées
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, loading } = useAuth();
  logger.debug("État Auth dans ProtectedRoute:", { user, profile, loading });
  const location = useLocation();

  // Afficher le spinner pendant le chargement
  if (loading) {
    return <LoadingScreen message="Chargement..." />;
  }

  // Rediriger si l'utilisateur n'est pas connecté
  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
};

// Composant pour les routes admin
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, loading } = useAuth();
  logger.debug("État Auth dans AdminRoute:", { user, profile, loading });
  const location = useLocation();

  // Afficher le spinner pendant le chargement
  if (loading) {
    return <LoadingScreen message="Chargement..." />;
  }

  // Rediriger si l'utilisateur n'est pas un admin
  if (!profile || profile.user_type !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

function App() {
  const { user, profile, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  logger.debug("État Auth dans App:", { user, profile, loading, path: location.pathname });
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    // Simplement attendre que l'authentification soit chargée
    if (!loading) {
      // Application prête
      setAppReady(true);
    }
  }, [loading]);

  // Gérer les App Links (deep links) pour OAuth callback
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let listener: any;

    CapacitorApp.addListener('appUrlOpen', (event: { url: string }) => {
      logger.info('[APP_URL_OPEN] Deep link intercepté:', event.url);

      // Extraire le chemin de l'URL
      const url = new URL(event.url);
      const path = url.pathname + url.search + url.hash;

      logger.info('[APP_URL_OPEN] Navigation vers:', path);

      // Naviguer vers le chemin dans l'application
      navigate(path, { replace: true });
    }).then((handle) => {
      listener = handle;
    });

    return () => {
      if (listener) {
        listener.remove();
      }
    };
  }, [navigate]);

  // Protection contre aria-hidden bloqué sur #root (bug MUI Modal)
  useEffect(() => {
    const rootElement = document.getElementById('root');
    if (rootElement && rootElement.getAttribute('aria-hidden') === 'true') {
      logger.warn('[APP] Suppression de aria-hidden=true sur #root (bug MUI Modal)');
      rootElement.removeAttribute('aria-hidden');
    }
  }, [location.pathname]); // Vérifie à chaque changement de route
  
  // Afficher un loader pendant le chargement de l'authentification
  if (loading) {
    logger.debug("Affichage du chargement...");
    return <LoadingScreen message="Chargement..." />;
  }
  
  logger.debug("Prêt à afficher l'application principale");

  // Vérifier si l'utilisateur tente d'accéder à une route protégée sans être connecté
  if (!user) {
    // Liste des chemins qui nécessitent une authentification
    const requiresAuth = ['/profile', '/practitioner-profile', '/mes-rendez-vous', '/intervenant/rendez-vous', '/beneficiaries', '/admin'].some(
      path => location.pathname.startsWith(path)
    );
    
    logger.debug("Vérification redirection:", { 
      requiresAuth,
      path: location.pathname
    });
    
    // Ne rediriger vers la page de connexion que si la route nécessite une authentification
    if (requiresAuth) {
      logger.debug("Redirection vers login (route protégée)");
      return <Navigate to="/login" state={{ from: location.pathname }} replace />;
    }
    
    // Pour les routes publiques, pas de redirection
    logger.debug("Route publique, pas de redirection");
  }

  // Affiche un spinner pendant le chargement initial
  if (!appReady) {
    return (
      <ErrorBoundary>
        <LoadingScreen message="Préparation de l'application..." />
      </ErrorBoundary>
    );
  }
  
  return (
    <ErrorBoundary>
      <ScrollToTop />
      <Box sx={{
        width: '100%',
        maxWidth: '100vw',
        margin: 0,
        padding: 0,
        overflow: 'hidden'
      }}>
        <Routes>
          {/* Routes publiques */}
          <Route path="/" element={<MainLayout />}>
            <Route index element={<HomePage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="signup" element={<SignupPage />} />
            <Route path="forgot-password" element={<ForgotPasswordPage />} />
            <Route path="reset-password" element={<ResetPasswordPage />} />
            <Route path="auth/callback" element={<AuthCallbackPage />} />
            <Route path="complete-profile" element={<ProfileCompletionPage />} />
            <Route path="prendre-rendez-vous" element={<AppointmentBookingPage />} />
            <Route path="appointment-success" element={<AppointmentPaymentSuccessPage />} />
            <Route path="contact" element={<ContactPage />} />
            <Route path="apropos" element={<AProposPage />} />
            <Route path="message-du-jour" element={<MessageDuJourPage />} />
            <Route path="consultants" element={<ConsultantsPage />} />
            <Route path="consultants/:id" element={<ConsultantDetailPage />} />

            {/* Pages légales */}
            <Route path="mentions-legales" element={<MentionsLegalesPage />} />
            <Route path="politique-confidentialite" element={<PolitiqueConfidentialitePage />} />
            <Route path="suppression-compte" element={<SuppressionComptePage />} />
            <Route path="cgu" element={<CGUPage />} />

            {/* Routes Particuliers */}
            <Route path="particuliers" element={<Particuliers />} />
            <Route path="particuliers/module-adultes" element={<ModuleAdultes />} />
            <Route path="particuliers/module-couples" element={<ModuleCouples />} />
            <Route path="particuliers/module-enfants" element={<ModuleEnfants />} />
            <Route path="particuliers/module-suivi-annuel" element={<ModuleSuiviAnnuel />} />
            
            {/* Routes Professionnels */}
            <Route path="professionnels" element={<Professionnels />} />
            <Route path="professionnels/module-coequipiers" element={<ModuleCoequipiers />} />
            <Route path="professionnels/module-equipe" element={<ModuleEquipe />} />
            <Route path="professionnels/module-candidats" element={<ModuleCandidats />} />
            <Route path="professionnels/module-associes" element={<ModuleAssocies />} />
            <Route path="professionnels/module-strategies" element={<ModuleStrategies />} />

            {/* Routes Sportifs */}
            <Route path="sportifs" element={<Sportifs />} />
            <Route path="sportifs/module-solo" element={<ModuleSolo />} />
            <Route path="sportifs/module-team" element={<ModuleTeam />} />    
            


            {/* Routes protégées */}
            <Route path="profile" element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            } />
            <Route path="practitioner-profile" element={
              <ProtectedRoute>
                <PractitionerProfilePage />
              </ProtectedRoute>
            } />
            <Route path="practitioner-onboarding" element={
              <ProtectedRoute>
                <PractitionerOnboardingPage />
              </ProtectedRoute>
            } />
            <Route path="practitioner-payment" element={
              <ProtectedRoute>
                <PractitionerPaymentPage />
              </ProtectedRoute>
            } />
            <Route path="practitioner-subscription" element={
              <ProtectedRoute>
                <PractitionerSubscriptionPage />
              </ProtectedRoute>
            } />
            <Route path="messages" element={
              <ProtectedRoute>
                <MessagesPage />
              </ProtectedRoute>
            } />
            <Route path="mes-rendez-vous" element={
              <ProtectedRoute>
                <MyAppointmentsPage />
              </ProtectedRoute>
            } />
            <Route path="beneficiaries" element={
              <ProtectedRoute>
                <BeneficiariesPage />
              </ProtectedRoute>
            } />
            <Route path="intervenant/planning" element={
              <ProtectedRoute>
                <PractitionerSchedulePage />
              </ProtectedRoute>
            } />
            <Route path="intervenant/rendez-vous" element={
              <ProtectedRoute>
                <PractitionerAppointmentsPage />
              </ProtectedRoute>
            } />
            <Route path="intervenant/messages" element={
              <ProtectedRoute>
                <PractitionerMessagesPage />
              </ProtectedRoute>
            } />
            <Route path="intervenant/stripe-connect" element={
              <ProtectedRoute>
                <PractitionerStripeConnectPage />
              </ProtectedRoute>
            } />
            <Route path="intervenant/stripe-connect-success" element={
              <ProtectedRoute>
                <PractitionerStripeConnectSuccessPage />
              </ProtectedRoute>
            } />
          </Route>
          
          {/* Routes admin avec le nouveau layout */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            }
          >
            <Route index element={<AdminDashboardPage />} />
            <Route path="utilisateurs" element={<AdminUsersPage />} />
            <Route path="intervenants" element={<AdminPractitionersPage />} />
            <Route path="demandes-intervenant" element={<AdminPractitionerRequestsPage />} />
            <Route path="prestations" element={<AdminServicesPage />} />
            <Route path="tirages-quotidiens" element={<AdminDailyDrawsPage />} />
            <Route path="rendez-vous" element={<AdminAppointmentsPage />} />
            <Route path="transactions" element={<AdminTransactionsPage />} />
            <Route path="messages" element={<AdminContactMessagesPage />} />
            <Route path="journaux-activite" element={<AdminActivityLogsPage />} />
          </Route>
          
          {/* Route 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Box>
    </ErrorBoundary>
  );
}

export default App;