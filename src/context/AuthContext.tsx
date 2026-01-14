// src/context/AuthContext.tsx - Solution modifiée sans awaits
import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { supabase, Profile, getProfile, logActivity } from '../services/supabase';
import { logger } from '../utils/logger';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signInWithApple: () => Promise<{ error: Error | null }>;
  signUpWithEmail: (email: string, password: string, userData: Partial<Profile>) => Promise<{ error: Error | null; data: any }>;
  signOut: () => Promise<{ error: Error | null }>;
  updateProfile: (profileData: Partial<Profile>) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signInWithEmail: async () => ({ error: null }),
  signInWithGoogle: async () => ({ error: null }),
  signInWithApple: async () => ({ error: null }),
  signUpWithEmail: async () => ({ error: null }),
  signOut: async () => ({ error: null }),
  updateProfile: async () => ({ error: null }),
});

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const isMounted = useRef(true);
  const authInitialized = useRef(false);
  
  // Debug log pour chaque changement d'état
  useEffect(() => {
    logger.debug("[AUTH_STATE] État actuel:", {
      userExists: !!user,
      profileExists: !!profile,
      loading,
      time: new Date().toISOString()
    });
  }, [user, profile, loading]);

  // Fonction sécurisée pour mettre à jour l'état
  const safeSetState = (setter: any, value: any, stateName: string) => {
    if (isMounted.current) {
      logger.debug(`[SAFE_STATE] Mise à jour de ${stateName}:`, value);
      setter(value);
    } else {
      logger.debug(`[SAFE_STATE] Ignoré: ${stateName} - composant démonté`);
    }
  };

  // Récupération du profil sans await
  const fetchUserProfile = (userId: string): Promise<Profile | null> => {
    logger.debug('[FETCH_PROFILE] Début récupération profil pour ID:', userId);

    // Attendre 500ms pour donner le temps aux politiques RLS de s'appliquer
    return new Promise(resolve => setTimeout(resolve, 500))
      .then(() => {
        // Récupérer le profil et le bénéficiaire "self" en parallèle
        return Promise.all([
          getProfile(userId),
          // Récupérer le bénéficiaire "self" pour les données de numérologie
          supabase
            .from('beneficiary_access')
            .select(`
              beneficiary:beneficiaries(
                tronc,
                racine_1,
                racine_2,
                dynamique_de_vie
              )
            `)
            .eq('user_id', userId)
            .eq('relationship', 'self')
            .limit(1)
            .single()
        ]);
      })
      .then(([profileResult, beneficiaryResult]) => {
        const { data: profileData, error } = profileResult;

        if (error) {
          logger.error('[FETCH_PROFILE] Erreur récupération profil:', error);
          return null;
        }

        if (!profileData) {
          logger.warn('[FETCH_PROFILE] Aucun profil trouvé pour l\'utilisateur:', userId);
          return null;
        }

        // Ajouter les données de numérologie du bénéficiaire "self" au profil
        if (beneficiaryResult.data?.beneficiary) {
          // beneficiary peut être un objet ou un tableau selon le retour de Supabase
          const beneficiaryData = Array.isArray(beneficiaryResult.data.beneficiary)
            ? beneficiaryResult.data.beneficiary[0]
            : beneficiaryResult.data.beneficiary;

          if (beneficiaryData) {
            logger.debug('[FETCH_PROFILE] Données numérologie récupérées:', beneficiaryData);
            profileData.racine1 = beneficiaryData.racine_1 || undefined;
            profileData.racine2 = beneficiaryData.racine_2 || undefined;
            profileData.tronc = beneficiaryData.tronc || undefined;
            profileData.dynamique_de_vie = beneficiaryData.dynamique_de_vie || undefined;
          }
        } else {
          logger.debug('[FETCH_PROFILE] Aucun bénéficiaire "self" trouvé');
        }

        logger.debug('[FETCH_PROFILE] Profil récupéré avec succès:', profileData);
        return profileData;
      })
      .catch(e => {
        logger.error('[FETCH_PROFILE] Exception lors de la récupération du profil:', e);
        return null;
      });
  };

// Enregistrer la tentative de connexion (uniquement pour de vraies connexions)
const logUserLogin = (userId: string, isDirectAuth = false, email?: string) => {
  // Ne logger que les vraies connexions, pas les restaurations de session
  if (!isDirectAuth) {
    logger.debug('[LOG_LOGIN] Rafraîchissement de page détecté, pas de journalisation');
    return Promise.resolve();
  }

  logger.info('[LOG_LOGIN] Nouvelle connexion détectée, début enregistrement pour:', userId);

  // Utiliser le nouveau système de logging
  logActivity({
    userId,
    actionType: 'login',
    actionDescription: `Connexion réussie${email ? ` - ${email}` : ''}`
  }).catch(error => {
    logger.warn('[LOG_LOGIN] Non critique - Erreur log connexion:', error);
  });

  return Promise.resolve();
};

// Enregistrer la déconnexion
const logUserLogout = (userId: string) => {
  logger.info('[LOG_LOGOUT] Enregistrement déconnexion pour:', userId);

  // Utiliser le nouveau système de logging
  logActivity({
    userId,
    actionType: 'logout',
    actionDescription: 'Déconnexion'
  }).catch(error => {
    logger.warn('[LOG_LOGOUT] Non critique - Erreur log déconnexion:', error);
  });

  return Promise.resolve();
};

// Enregistrer un échec de connexion
const logLoginFailed = (email: string, reason?: string) => {
  logger.info('[LOG_LOGIN_FAILED] Échec de connexion pour:', email);

  // Note: on ne peut pas logger avec userId puisque la connexion a échoué
  // On loggera avec un userId factice ou on pourrait modifier la table pour accepter NULL
  // Pour l'instant, on log juste dans la console
  logger.warn('[LOG_LOGIN_FAILED] Email:', email, 'Raison:', reason);

  return Promise.resolve();
};

  // Initialiser l'authentification sans awaits
  const initializeAuth = () => {
    if (authInitialized.current) {
      logger.debug('[AUTH_INIT] Déjà initialisé, ignoré');
      return;
    }

    authInitialized.current = true;
    logger.debug('[AUTH_INIT] Début initialisation authentification');

    // Créer un timeout global pour l'initialisation
    const authInitTimeout = setTimeout(() => {
      logger.warn('[AUTH_INIT] TIMEOUT - Initialisation trop longue, force loading=false');
      if (isMounted.current) {
        safeSetState(setLoading, false, 'loading (timeout)');
      }
    }, 10000); // 10 secondes max pour initialiser
    
    // Obtenir la session sans await
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (!isMounted.current) {
          logger.debug('[AUTH_INIT] Composant démonté pendant l\'initialisation');
          return;
        }

        if (session) {
          logger.debug('[AUTH_INIT] Session existante trouvée:', session.user.id);
          safeSetState(setUser, session.user, 'user');

          // Récupération du profil
          return fetchUserProfile(session.user.id)
            .then(profileData => {
              if (!isMounted.current) return;

              if (profileData) {
                safeSetState(setProfile, profileData, 'profile');
              } else {
                logger.warn('[AUTH_INIT] Aucun profil trouvé ou erreur');
              }
            })
            .catch(profileError => {
              logger.error('[AUTH_INIT] Erreur profil avec timeout:', profileError);
            })
            .finally(() => {
              // Toujours terminer le chargement, même en cas d'erreur
              safeSetState(setLoading, false, 'loading (après session)');
              clearTimeout(authInitTimeout);
            });
        } else {
          logger.debug('[AUTH_INIT] Aucune session existante');
          safeSetState(setLoading, false, 'loading (pas de session)');
          clearTimeout(authInitTimeout);
        }
      })
      .catch(error => {
        logger.error('[AUTH_INIT] Erreur initialisation auth:', error);
        safeSetState(setLoading, false, 'loading (erreur)');
        clearTimeout(authInitTimeout);
      });
  };

  // Hook principal d'authentification
  useEffect(() => {
    logger.debug('[AUTH_EFFECT] Début du hook d\'authentification');
    isMounted.current = true;

    // Configurer l'écouteur d'événements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        logger.debug('[AUTH_EVENT] Événement auth reçu:', event, 'Session:', session ? 'présente' : 'absente');

        if (!isMounted.current) {
          logger.debug('[AUTH_EVENT] Ignoré - composant démonté');
          return;
        }
        
        // Mettre à jour l'état de l'utilisateur
        safeSetState(setUser, session?.user || null, 'user (event)');
        
        // Timeout global pour l'événement
        const eventTimeout = setTimeout(() => {
          logger.warn(`[AUTH_EVENT] TIMEOUT - Traitement de l'événement ${event} trop long`);
          if (isMounted.current && loading) {
            //safeSetState(setLoading, false, 'loading (event timeout)');
            setLoading(false);
          }
        }, 8000);

        // Traiter l'événement
        if (event === 'SIGNED_IN' && session) {
          logger.debug('[HANDLE_SIGNED_IN] Traitement SIGNED_IN');

          // Log non bloquant en parallèle
          logUserLogin(session.user.id, true, session.user.email).catch(e =>
            logger.warn('[HANDLE_SIGNED_IN] Erreur log:', e)
          );

          // Récupérer le profil sans await
          fetchUserProfile(session.user.id)
            .then(profileData => {
              if (!isMounted.current) return;
              
              if (profileData) {
                safeSetState(setProfile, profileData, 'profile (signed_in)');
              } else {
                logger.warn('[HANDLE_SIGNED_IN] Aucun profil trouvé ou erreur');
              }
            })
            .catch(profileError => {
              logger.error('[HANDLE_SIGNED_IN] Erreur profil avec timeout:', profileError);
            })
            .finally(() => {
              safeSetState(setLoading, false, 'loading (après signed_in)');
              clearTimeout(eventTimeout);
            });
        } else if (event === 'SIGNED_OUT') {
          logger.debug('[AUTH_EVENT] Traitement SIGNED_OUT');
          safeSetState(setProfile, null, 'profile (signed_out)');
          safeSetState(setLoading, false, 'loading (après signed_out)');
          clearTimeout(eventTimeout);
        } else if (event === 'INITIAL_SESSION') {
          logger.debug('[AUTH_EVENT] Traitement INITIAL_SESSION');
          // Gérer la session initiale - typiquement déjà traitée par initializeAuth
          // Mais au cas où, forcer loading=false
          safeSetState(setLoading, false, 'loading (après INITIAL_SESSION)');
          clearTimeout(eventTimeout);
        } else if (event === 'USER_UPDATED') {
          logger.debug('[AUTH_EVENT] Traitement USER_UPDATED');
          // Recharger le profil si l'utilisateur est mis à jour
          if (session?.user) {
            fetchUserProfile(session.user.id)
              .then(updatedProfile => {
                if (updatedProfile && isMounted.current) {
                  safeSetState(setProfile, updatedProfile, 'profile (user_updated)');
                }
              })
              .catch(e => {
                logger.error('[AUTH_EVENT] Erreur lors du rechargement du profil:', e);
              });
          }
          safeSetState(setLoading, false, 'loading (après USER_UPDATED)');
          clearTimeout(eventTimeout);
        } else {
          // Pour tous les autres événements
          logger.debug(`[AUTH_EVENT] Fin traitement ${event}`);
          // Forcer loading=false quoi qu'il arrive
          if (loading) {
            safeSetState(setLoading, false, `loading (après ${event})`);
          }
          clearTimeout(eventTimeout);
        }
      }
    );
    
    // Démarrer l'initialisation
    initializeAuth();
    
    // Fonction de nettoyage
    return () => {
      logger.debug('[AUTH_EFFECT] Démontage AuthProvider');
      isMounted.current = false;
      subscription?.unsubscribe();
    };
  }, []); // Dépendances vides pour n'exécuter qu'une fois

  // Forcer loading=false après 15 secondes quoi qu'il arrive
  useEffect(() => {
    const globalTimeout = setTimeout(() => {
      if (loading && isMounted.current) {
        logger.warn('[GLOBAL_TIMEOUT] Force désactivation loading après timeout global');
        safeSetState(setLoading, false, 'loading (timeout global)');
      }
    }, 15000);

    return () => clearTimeout(globalTimeout);
  }, [loading]);

  const signInWithEmail = (email: string, password: string) => {
    logger.info('[SIGNIN_EMAIL] Tentative de connexion avec email');
    return supabase.auth.signInWithPassword({ email, password })
      .then(({ data, error }) => {
        if (error) {
          logger.error('[SIGNIN_EMAIL] Erreur connexion:', error.message);
          // Logger l'échec de connexion
          logLoginFailed(email, error.message);
        } else {
          logger.info('[SIGNIN_EMAIL] Connexion réussie');
          // Ici, c'est une vraie connexion
          if (data?.user) {
            logUserLogin(data.user.id, true, email);
          }
        }
        return { error: error ? new Error(error.message) : null };
      })
      .catch(error => {
        logger.error('[SIGNIN_EMAIL] Exception lors de la connexion:', error);
        logLoginFailed(email, error.message);
        return { error: error as Error };
      });
  };

  const signInWithGoogle = () => {
    logger.info('[SIGNIN_GOOGLE] Tentative de connexion avec Google');

    // Sauvegarder la page actuelle pour redirection après OAuth
    const currentPath = window.location.pathname;
    if (currentPath !== '/login' && currentPath !== '/signup') {
      sessionStorage.setItem('oauth_redirect', currentPath);
    }

    // Pour mobile ET web, on utilise toujours la même URL HTTPS
    // L'Android App Link interceptera automatiquement sur mobile
    const baseUrl = import.meta.env.VITE_APP_URL || 'https://www.fl2m.fr';
    const redirectTo = `${baseUrl}/auth/callback`;

    const isNative = Capacitor.isNativePlatform();
    logger.info('[SIGNIN_GOOGLE] Plateforme:', isNative ? 'Mobile (native)' : 'Web', 'redirectTo:', redirectTo);

    return supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })
      .then(({ error }) => {
        return { error: error ? new Error(error.message) : null };
      })
      .catch(error => {
        logger.error('[SIGNIN_GOOGLE] Exception lors de la connexion:', error);
        return { error: error as Error };
      });
  };

  const signInWithApple = () => {
    logger.info('[SIGNIN_APPLE] Tentative de connexion avec Apple');

    // Sauvegarder la page actuelle pour redirection après OAuth
    const currentPath = window.location.pathname;
    if (currentPath !== '/login' && currentPath !== '/signup') {
      sessionStorage.setItem('oauth_redirect', currentPath);
    }

    // Pour mobile ET web, on utilise toujours la même URL HTTPS
    // L'Android App Link interceptera automatiquement sur mobile
    const baseUrl = import.meta.env.VITE_APP_URL || 'https://www.fl2m.fr';
    const redirectTo = `${baseUrl}/auth/callback`;

    const isNative = Capacitor.isNativePlatform();
    logger.info('[SIGNIN_APPLE] Plateforme:', isNative ? 'Mobile (native)' : 'Web', 'redirectTo:', redirectTo);

    return supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo,
      },
    })
      .then(({ error }) => {
        return { error: error ? new Error(error.message) : null };
      })
      .catch(error => {
        logger.error('[SIGNIN_APPLE] Exception lors de la connexion:', error);
        return { error: error as Error };
      });
  };

  const signUpWithEmail = async (email: string, password: string, userData: Partial<Profile>) => {
    try {
      logger.info('[SIGNUP_EMAIL] Tentative d\'inscription avec email');

      const { data, error } = await supabase.auth.signUp({ email, password });

      if (error) {
        logger.error('[SIGNUP_EMAIL] Erreur inscription:', error.message);
        return { error: new Error(error.message), data: null };
      }

      if (!data?.user) {
        return { error: new Error('Aucun utilisateur créé'), data: null };
      }

      logger.info('[SIGNUP_EMAIL] Inscription réussie, ID:', data.user.id);

      // Attendre que la session soit établie
      if (data.session) {
        logger.info('[SIGNUP_EMAIL] Session établie, mise à jour du profil');

        // Utiliser upsert pour créer ou mettre à jour le profil
        // Maintenant que la session est établie, le RLS autorisera l'opération
        const profileData = {
          id: data.user.id,
          email: email,
          ...userData
        };

        const { error: profileError } = await supabase
          .from('profiles')
          .upsert(profileData, {
            onConflict: 'id',
            ignoreDuplicates: false
          })
          .select()
          .single();

        if (profileError) {
          logger.error('[SIGNUP_EMAIL] Erreur mise à jour profil:', profileError.message);
          // Ne pas bloquer l'inscription si la mise à jour du profil échoue
          // Le trigger DB a déjà créé le profil de base
          logger.info('[SIGNUP_EMAIL] Profil de base créé par le trigger, mise à jour échouée mais non bloquante');
        } else {
          logger.info('[SIGNUP_EMAIL] Profil mis à jour avec succès');
        }
      } else {
        logger.info('[SIGNUP_EMAIL] Pas de session immédiate, le profil sera créé par le trigger DB');
        // Si pas de session immédiate, le trigger DB créera le profil
        // L'utilisateur devra peut-être vérifier son email d'abord
      }

      return { error: null, data };

    } catch (error: any) {
      logger.error('[SIGNUP_EMAIL] Exception lors de l\'inscription:', error);
      return { error: error as Error, data: null };
    }
  };

  const signOut = () => {
    logger.info('[SIGNOUT] Tentative de déconnexion');

    // Logger la déconnexion avant de déconnecter (car on aura plus accès à user.id après)
    if (user?.id) {
      logUserLogout(user.id);
    }

    return supabase.auth.signOut({ scope: 'local' })
      .then(({ error }) => {
        if (error) {
          // Ignorer l'erreur "Auth session missing!" car cela signifie que l'utilisateur est déjà déconnecté
          if (error.message === 'Auth session missing!' || error.message.includes('session missing')) {
            logger.info('[SIGNOUT] Session déjà expirée - déconnexion locale effectuée');
            return { error: null };
          }
          logger.error('[SIGNOUT] Erreur déconnexion:', error.message);
          // Même en cas d'erreur, on considère la déconnexion locale comme réussie
          return { error: null };
        } else {
          logger.info('[SIGNOUT] Déconnexion réussie');
        }
        return { error: null };
      })
      .catch(error => {
        logger.error('[SIGNOUT] Exception lors de la déconnexion:', error);
        // Même en cas d'exception, on considère la déconnexion locale comme réussie
        return { error: null };
      });
  };

  const updateProfile = async (profileData: Partial<Profile>) => {
    if (!user) {
      logger.error('[UPDATE_PROFILE] Tentative de mise à jour du profil sans être authentifié');
      return { error: new Error('Non authentifié') };
    }

    try {
      logger.info('[UPDATE_PROFILE] Tentative de mise à jour du profil:', profileData);

      // Utiliser upsert pour créer ou mettre à jour le profil
      // Cela fonctionne que le profil existe ou non
      const fullProfileData = {
        id: user.id,
        email: user.email || profileData.email,
        ...profileData
      };

      const { data, error: upsertError } = await supabase
        .from('profiles')
        .upsert(fullProfileData, {
          onConflict: 'id',
          ignoreDuplicates: false
        })
        .select()
        .single();

      if (upsertError) {
        logger.error('[UPDATE_PROFILE] Erreur upsert profil:', upsertError.message);

        // Même si l'upsert échoue, on met à jour le contexte localement
        safeSetState(setProfile, (prev: any) => {
          if (!prev) {
            return fullProfileData as Profile;
          }
          const updated = { ...prev, ...profileData };
          logger.debug('[UPDATE_PROFILE] Nouvel état profil (local après erreur):', updated);
          return updated;
        }, 'profile (update local after error)');

        return { error: new Error(upsertError.message) };
      }

      logger.debug('[UPDATE_PROFILE] Profil upsert avec succès:', data);

      // Mettre à jour le contexte avec les données fraîches de la BDD
      if (data) {
        safeSetState(setProfile, data, 'profile (upsert from DB)');
      }

      return { error: null };

    } catch (error: any) {
      logger.error('[UPDATE_PROFILE] Exception lors de la mise à jour du profil:', error);
      return { error: error as Error };
    }
  };

  const value = {
    user,
    profile,
    loading,
    signInWithEmail,
    signInWithGoogle,
    signInWithApple,
    signUpWithEmail,
    signOut,
    updateProfile,
  };

  logger.debug("[RENDER] AuthProvider:", {
    user: user ? 'Présent' : 'Null',
    profile: profile ? 'Présent' : 'Null',
    loading,
    time: new Date().toISOString()
  });

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth doit être utilisé à l\'intérieur d\'un AuthProvider');
  }
  return context;
};