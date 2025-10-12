// src/context/AuthContext.tsx - Solution modifiée sans awaits
import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, Profile, getProfile } from '../services/supabase';

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

// Fonction utilitaire pour créer un timeout
const createTimeout = (ms: number): Promise<never> => {
  return new Promise((_, reject) => 
    setTimeout(() => reject(new Error(`Opération expirée après ${ms}ms`)), ms)
  );
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const isMounted = useRef(true);
  const authInitialized = useRef(false);
  
  // Debug log pour chaque changement d'état
  useEffect(() => {
    console.log("[AUTH_STATE] État actuel:", { 
      userExists: !!user, 
      profileExists: !!profile, 
      loading,
      time: new Date().toISOString()
    });
  }, [user, profile, loading]);

  // Fonction sécurisée pour mettre à jour l'état
  const safeSetState = (setter: any, value: any, stateName: string) => {
    if (isMounted.current) {
      console.log(`[SAFE_STATE] Mise à jour de ${stateName}:`, value);
      setter(value);
    } else {
      console.log(`[SAFE_STATE] Ignoré: ${stateName} - composant démonté`);
    }
  };

  // Récupération du profil sans await
  const fetchUserProfile = (userId: string): Promise<Profile | null> => {
    console.log('[FETCH_PROFILE] Début récupération profil pour ID:', userId);
    
    // Attendre 500ms pour donner le temps aux politiques RLS de s'appliquer
    return new Promise(resolve => setTimeout(resolve, 500))
      .then(() => {
        // Utiliser une promesse race avec un timeout de 5 secondes
        return Promise.race([
          getProfile(userId),
          createTimeout(5000)
        ]);
      })
      .then(profileResult => {
        const { data: profileData, error } = profileResult;
        
        if (error) {
          console.error('[FETCH_PROFILE] Erreur récupération profil:', error);
          return null;
        }
        
        if (!profileData) {
          console.warn('[FETCH_PROFILE] Aucun profil trouvé pour l\'utilisateur:', userId);
          return null;
        }
        
        console.log('[FETCH_PROFILE] Profil récupéré avec succès:', profileData);
        return profileData;
      })
      .catch(e => {
        console.error('[FETCH_PROFILE] Exception lors de la récupération du profil:', e);
        return null;
      });
  };

// Enregistrer la tentative de connexion (uniquement pour de vraies connexions)
const logUserLogin = (userId: string, isDirectAuth = false) => {
  // Ne logger que les vraies connexions, pas les restaurations de session
  if (!isDirectAuth) {
    console.log('[LOG_LOGIN] Rafraîchissement de page détecté, pas de journalisation');
    return Promise.resolve();
  }
  
  console.log('[LOG_LOGIN] Nouvelle connexion détectée, début enregistrement pour:', userId);
  
  // Récupérer l'IP sans await
  return fetch('https://api.ipify.org?format=json')
    .then(response => response.json())
    .then(ipData => {
      const ip = ipData.ip;
      
      // Appeler la fonction RPC
      return supabase.rpc('log_user_login', {
        client_ip: ip,
        user_agent: navigator.userAgent
      });
    })
    .then(() => {
      console.log('[LOG_LOGIN] Connexion enregistrée avec succès');
    })
    .catch(error => {
      console.warn('[LOG_LOGIN] Non critique - Erreur log connexion:', error);
      // Ne pas bloquer sur les erreurs de log
      return Promise.resolve();
    });
};

  // Initialiser l'authentification sans awaits
  const initializeAuth = () => {
    if (authInitialized.current) {
      console.log('[AUTH_INIT] Déjà initialisé, ignoré');
      return;
    }
    
    authInitialized.current = true;
    console.log('[AUTH_INIT] Début initialisation authentification');
    
    // Créer un timeout global pour l'initialisation
    const authInitTimeout = setTimeout(() => {
      console.warn('[AUTH_INIT] TIMEOUT - Initialisation trop longue, force loading=false');
      if (isMounted.current) {
        safeSetState(setLoading, false, 'loading (timeout)');
      }
    }, 10000); // 10 secondes max pour initialiser
    
    // Obtenir la session sans await
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (!isMounted.current) {
          console.log('[AUTH_INIT] Composant démonté pendant l\'initialisation');
          return;
        }
        
        if (session) {
          console.log('[AUTH_INIT] Session existante trouvée:', session.user.id);
          safeSetState(setUser, session.user, 'user');
          
          // Récupération du profil
          return Promise.race([
            fetchUserProfile(session.user.id),
            createTimeout(5000)
          ])
            .then(profileData => {
              if (!isMounted.current) return;
              
              if (profileData) {
                safeSetState(setProfile, profileData, 'profile');
              } else {
                console.warn('[AUTH_INIT] Aucun profil trouvé ou erreur');
              }
            })
            .catch(profileError => {
              console.error('[AUTH_INIT] Erreur profil avec timeout:', profileError);
            })
            .finally(() => {
              // Toujours terminer le chargement, même en cas d'erreur
              safeSetState(setLoading, false, 'loading (après session)');
              clearTimeout(authInitTimeout);
            });
        } else {
          console.log('[AUTH_INIT] Aucune session existante');
          safeSetState(setLoading, false, 'loading (pas de session)');
          clearTimeout(authInitTimeout);
        }
      })
      .catch(error => {
        console.error('[AUTH_INIT] Erreur initialisation auth:', error);
        safeSetState(setLoading, false, 'loading (erreur)');
        clearTimeout(authInitTimeout);
      });
  };

  // Hook principal d'authentification
  useEffect(() => {
    console.log('[AUTH_EFFECT] Début du hook d\'authentification');
    isMounted.current = true;
    
    // Configurer l'écouteur d'événements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('[AUTH_EVENT] Événement auth reçu:', event, 'Session:', session ? 'présente' : 'absente');
        
        if (!isMounted.current) {
          console.log('[AUTH_EVENT] Ignoré - composant démonté');
          return;
        }
        
        // Mettre à jour l'état de l'utilisateur
        safeSetState(setUser, session?.user || null, 'user (event)');
        
        // Timeout global pour l'événement
        const eventTimeout = setTimeout(() => {
          console.warn(`[AUTH_EVENT] TIMEOUT - Traitement de l'événement ${event} trop long`);
          if (isMounted.current && loading) {
            //safeSetState(setLoading, false, 'loading (event timeout)');
            setLoading(false);
          }
        }, 8000);
        
        // Traiter l'événement
        if (event === 'SIGNED_IN' && session) {
          console.log('[HANDLE_SIGNED_IN] Traitement SIGNED_IN');
          
          // Log non bloquant en parallèle
          logUserLogin(session.user.id, true).catch(e => 
            console.warn('[HANDLE_SIGNED_IN] Erreur log:', e)
          );
          
          // Récupérer le profil sans await
          Promise.race([
            fetchUserProfile(session.user.id),
            createTimeout(5000)
          ])
            .then(profileData => {
              if (!isMounted.current) return;
              
              if (profileData) {
                safeSetState(setProfile, profileData, 'profile (signed_in)');
              } else {
                console.warn('[HANDLE_SIGNED_IN] Aucun profil trouvé ou erreur');
              }
            })
            .catch(profileError => {
              console.error('[HANDLE_SIGNED_IN] Erreur profil avec timeout:', profileError);
            })
            .finally(() => {
              safeSetState(setLoading, false, 'loading (après signed_in)');
              clearTimeout(eventTimeout);
            });
        } else if (event === 'SIGNED_OUT') {
          console.log('[AUTH_EVENT] Traitement SIGNED_OUT');
          safeSetState(setProfile, null, 'profile (signed_out)');
          safeSetState(setLoading, false, 'loading (après signed_out)');
          clearTimeout(eventTimeout);
        } else if (event === 'INITIAL_SESSION') {
          console.log('[AUTH_EVENT] Traitement INITIAL_SESSION');
          // Gérer la session initiale - typiquement déjà traitée par initializeAuth
          // Mais au cas où, forcer loading=false
          safeSetState(setLoading, false, 'loading (après INITIAL_SESSION)');
          clearTimeout(eventTimeout);
        } else if (event === 'USER_UPDATED') {
          console.log('[AUTH_EVENT] Traitement USER_UPDATED');
          // Recharger le profil si l'utilisateur est mis à jour
          if (session?.user) {
            fetchUserProfile(session.user.id)
              .then(updatedProfile => {
                if (updatedProfile && isMounted.current) {
                  safeSetState(setProfile, updatedProfile, 'profile (user_updated)');
                }
              })
              .catch(e => {
                console.error('[AUTH_EVENT] Erreur lors du rechargement du profil:', e);
              });
          }
          safeSetState(setLoading, false, 'loading (après USER_UPDATED)');
          clearTimeout(eventTimeout);
        } else {
          // Pour tous les autres événements
          console.log(`[AUTH_EVENT] Fin traitement ${event}`);
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
      console.log('[AUTH_EFFECT] Démontage AuthProvider');
      isMounted.current = false;
      subscription?.unsubscribe();
    };
  }, []); // Dépendances vides pour n'exécuter qu'une fois
  
  // Forcer loading=false après 15 secondes quoi qu'il arrive
  useEffect(() => {
    const globalTimeout = setTimeout(() => {
      if (loading && isMounted.current) {
        console.warn('[GLOBAL_TIMEOUT] Force désactivation loading après timeout global');
        safeSetState(setLoading, false, 'loading (timeout global)');
      }
    }, 15000);
    
    return () => clearTimeout(globalTimeout);
  }, [loading]);

  const signInWithEmail = (email: string, password: string) => {
    console.log('[SIGNIN_EMAIL] Tentative de connexion avec email');
    return supabase.auth.signInWithPassword({ email, password })
      .then(({ data, error }) => {
        if (error) {
          console.error('[SIGNIN_EMAIL] Erreur connexion:', error.message);
        } else {
          console.log('[SIGNIN_EMAIL] Connexion réussie');
          // Ici, c'est une vraie connexion
          if (data?.user) {
            logUserLogin(data.user.id, true);
          }
        }
        return { error: error ? new Error(error.message) : null };
      })
      .catch(error => {
        console.error('[SIGNIN_EMAIL] Exception lors de la connexion:', error);
        return { error: error as Error };
      });
  };

  const signInWithGoogle = () => {
    console.log('[SIGNIN_GOOGLE] Tentative de connexion avec Google');

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
        console.error('[SIGNIN_GOOGLE] Exception lors de la connexion:', error);
        return { error: error as Error };
      });
  };

  const signInWithApple = () => {
    console.log('[SIGNIN_APPLE] Tentative de connexion avec Apple');

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
        console.error('[SIGNIN_APPLE] Exception lors de la connexion:', error);
        return { error: error as Error };
      });
  };

  const signUpWithEmail = (email: string, password: string, userData: Partial<Profile>) => {
    console.log('[SIGNUP_EMAIL] Tentative d\'inscription avec email');
    return supabase.auth.signUp({ email, password })
      .then(({ data, error }) => {
        if (!error && data?.user) {
          console.log('[SIGNUP_EMAIL] Inscription réussie, création du profil');
          
          return supabase
            .from('profiles')
            .update(userData)
            .eq('id', data.user.id)
            .select()
            .single()
            .then(({ error: profileError }) => {
              if (profileError) {
                console.error('[SIGNUP_EMAIL] Erreur création profil:', profileError.message);
              } else {
                console.log('[SIGNUP_EMAIL] Profil créé avec succès');
              }
              
              return { error: profileError ? new Error(profileError.message) : null };
            });
        }
        
        if (error) {
          console.error('[SIGNUP_EMAIL] Erreur inscription:', error.message);
        }
        
        return { error: error ? new Error(error.message) : null };
      })
      .catch(error => {
        console.error('[SIGNUP_EMAIL] Exception lors de l\'inscription:', error);
        return { error: error as Error };
      });
  };

  const signOut = () => {
    console.log('[SIGNOUT] Tentative de déconnexion');
    return supabase.auth.signOut()
      .then(({ error }) => {
        if (error) {
          console.error('[SIGNOUT] Erreur déconnexion:', error.message);
        } else {
          console.log('[SIGNOUT] Déconnexion réussie');
        }
        return { error: error ? new Error(error.message) : null };
      })
      .catch(error => {
        console.error('[SIGNOUT] Exception lors de la déconnexion:', error);
        return { error: error as Error };
      });
  };

  const updateProfile = (profileData: Partial<Profile>) => {
    if (!user) {
      console.error('[UPDATE_PROFILE] Tentative de mise à jour du profil sans être authentifié');
      return Promise.resolve({ error: new Error('Non authentifié') });
    }
    
    console.log('[UPDATE_PROFILE] Tentative de mise à jour du profil');
    return (supabase.from('profiles').update(profileData).eq('id', user.id) as any)
      .then(({ error }: any) => {
        if (error) {
          console.error('[UPDATE_PROFILE] Erreur mise à jour profil:', error.message);
        } else {
          console.log('[UPDATE_PROFILE] Profil mis à jour avec succès');
          safeSetState(setProfile, (prev: any) => {
            const updated = prev ? { ...prev, ...profileData } : null;
            console.log('[UPDATE_PROFILE] Nouvel état profil:', updated);
            return updated;
          }, 'profile (update)');
        }

        return { error: error ? new Error(error.message) : null };
      })
      .catch((error: any) => {
        console.error('[UPDATE_PROFILE] Exception lors de la mise à jour du profil:', error);
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

  console.log("[RENDER] AuthProvider:", { 
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