// src/components/ErrorBoundary.tsx
import { Component, ErrorInfo, ReactNode } from 'react';
import { supabase } from '../services/supabase';
import { logger } from '../utils/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Mettre à jour l'état pour afficher l'UI de secours
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logger.error('Erreur capturée par ErrorBoundary:', error, errorInfo);
    
    // Vérifier si l'erreur est liée à l'authentification ou a une signature spécifique
    const errorMessage = error.message.toLowerCase();
    const isAuthError = 
      errorMessage.includes('authentication') || 
      errorMessage.includes('token') || 
      errorMessage.includes('permission') ||
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('forbidden') ||
      errorMessage.includes('invalid session');
    
    // Si c'est une erreur d'authentification, essayer de se connecter à nouveau
    if (isAuthError) {
      this.handleAuthError();
    }
  }

  handleAuthError = async (): Promise<void> => {
    try {
      // Vérifier l'état de la session actuelle
      const { data } = await supabase.auth.getSession();
      
      if (!data.session) {
        logger.warn('Session invalide détectée, redirection vers la page de connexion...');
        // Rediriger vers la page de connexion
        window.location.href = '/login';
        return;
      }
      
      // Tenter de rafraîchir la session
      const { error } = await supabase.auth.refreshSession();
      
      if (error) {
        logger.error('Échec du rafraîchissement de la session:', error);
        // Se déconnecter et rediriger vers la page de connexion
        await supabase.auth.signOut();
        window.location.href = '/login';
      }
    } catch (error) {
      logger.error('Erreur lors de la gestion d\'erreur d\'authentification:', error);
      // En cas d'erreur, déconnecter l'utilisateur et rediriger
      await supabase.auth.signOut();
      window.location.href = '/login';
    }
  };

  tryAgain = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // UI de secours personnalisée
      return this.props.fallback || (
        <div style={{ 
          padding: '20px', 
          margin: '20px', 
          border: '1px solid #f5c6cb',
          borderRadius: '4px',
          backgroundColor: '#f8d7da', 
          color: '#721c24'
        }}>
          <h2>Quelque chose s'est mal passé.</h2>
          <p>Nous avons rencontré une erreur lors du chargement de cette page.</p>
          <button 
            onClick={this.tryAgain}
            style={{
              padding: '8px 16px',
              backgroundColor: '#0066cc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Réessayer
          </button>
          <button 
            onClick={async () => {
              // Se déconnecter et rediriger vers la page de connexion
              await supabase.auth.signOut();
              window.location.href = '/login';
            }}
            style={{
              padding: '8px 16px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              marginLeft: '10px',
              cursor: 'pointer'
            }}
          >
            Se reconnecter
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;