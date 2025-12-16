// src/context/AuthContext.tsx - Solution modifiée sans awaits
import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, Profile, getProfile, logActivity } from '../services/supabase';
import { logger } from '../utils/logger';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signInWithApple: () => Promise<{ error: Error | null }>;
  signUpWithEmail: (email: string, password: string, userData: Partial<Profile>) => Promise<{ error: Error | null }>;
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

    return supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
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

    return supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
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

  const signUpWithEmail = (email: string, password: string, userData: Partial<Profile>) => {
    logger.info('[SIGNUP_EMAIL] Tentative d\'inscription avec email');
    return supabase.auth.signUp({ email, password })
      .then(({ data, error }) => {
        if (!error && data?.user) {
          logger.info('[SIGNUP_EMAIL] Inscription réussie, création du profil');

          return supabase
            .from('profiles')
            .update(userData)
            .eq('id', data.user.id)
            .select()
            .single()
            .then(({ error: profileError }) => {
              if (profileError) {
                logger.error('[SIGNUP_EMAIL] Erreur création profil:', profileError.message);
              } else {
                logger.info('[SIGNUP_EMAIL] Profil créé avec succès');
              }

              return { error: profileError ? new Error(profileError.message) : null };
            });
        }

        if (error) {
          logger.error('[SIGNUP_EMAIL] Erreur inscription:', error.message);
        }

        return { error: error ? new Error(error.message) : null };
      })
      .catch(error => {
        logger.error('[SIGNUP_EMAIL] Exception lors de l\'inscription:', error);
        return { error: error as Error };
      });
  };

  const signOut = () => {
    logger.info('[SIGNOUT] Tentative de déconnexion');

    // Logger la déconnexion avant de déconnecter (car on aura plus accès à user.id après)
    if (user?.id) {
      logUserLogout(user.id);
    }

    return supabase.auth.signOut()
      .then(({ error }) => {
        if (error) {
          logger.error('[SIGNOUT] Erreur déconnexion:', error.message);
        } else {
          logger.info('[SIGNOUT] Déconnexion réussie');
        }
        return { error: error ? new Error(error.message) : null };
      })
      .catch(error => {
        logger.error('[SIGNOUT] Exception lors de la déconnexion:', error);
        return { error: error as Error };
      });
  };

  const updateProfile = (profileData: Partial<Profile>) => {
    if (!user) {
      logger.error('[UPDATE_PROFILE] Tentative de mise à jour du profil sans être authentifié');
      return Promise.resolve({ error: new Error('Non authentifié') });
    }

    logger.info('[UPDATE_PROFILE] Tentative de mise à jour du profil:', profileData);

    // D'abord mettre à jour la BDD
    return (supabase.from('profiles').update(profileData).eq('id', user.id) as any)
      .then(({ error: updateError }: any) => {
        if (updateError) {
          logger.error('[UPDATE_PROFILE] Erreur mise à jour profil:', updateError.message);
          throw updateError;
        }

        logger.debug('[UPDATE_PROFILE] Mise à jour BDD réussie');

        // Ensuite récupérer le profil complet depuis la BDD
        return supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
      })
      .then(({ data, error: fetchError }: any) => {
        if (fetchError) {
          logger.error('[UPDATE_PROFILE] Erreur récupération profil après update:', fetchError.message);
          // Même si on ne peut pas récupérer, on met à jour le contexte localement
          safeSetState(setProfile, (prev: any) => {
            if (!prev) {
              return {
                id: user.id,
                email: user.email,
                ...profileData,
              } as Profile;
            }
            const updated = { ...prev, ...profileData };
            logger.debug('[UPDATE_PROFILE] Nouvel état profil (local):', updated);
            return updated;
          }, 'profile (update local)');

          return { error: null }; // Ne pas bloquer même si la récupération échoue
        }

        logger.debug('[UPDATE_PROFILE] Profil récupéré avec succès:', data);

        // Mettre à jour le contexte avec les données fraîches de la BDD
        if (data) {
          safeSetState(setProfile, data, 'profile (update from DB)');
        }

        return { error: null };
      })
      .catch((error: any) => {
        logger.error('[UPDATE_PROFILE] Exception lors de la mise à jour du profil:', error);
        return { error: error as Error };
      });
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