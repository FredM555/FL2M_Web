// src/components/layout/MainLayout.tsx
import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Menu,
  MenuItem,
  Box,
  Container,
  Avatar,
  IconButton,
  Divider,
  useTheme,
  useMediaQuery,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Grid
} from '@mui/material';
import { Link as RouterLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import HomeIcon from '@mui/icons-material/Home';
import PersonIcon from '@mui/icons-material/Person';
import BusinessIcon from '@mui/icons-material/Business';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import EventIcon from '@mui/icons-material/Event';
import PhoneIcon from '@mui/icons-material/Phone';
import InfoIcon from '@mui/icons-material/Info';

const MainLayout: React.FC = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // États pour les menus
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Hauteur totale du bandeau pour décaler le contenu principal
  const headerHeight = isMobile ? '56px' : '136px'; // Ajustez selon la hauteur réelle de votre header

  // Fonctions de gestion des menus
  const handleMenuOpen = (setter: React.Dispatch<React.SetStateAction<HTMLElement | null>>) => 
    (event: React.MouseEvent<HTMLButtonElement>) => {
      setter(event.currentTarget);
    };

  const handleMenuClose = (setter: React.Dispatch<React.SetStateAction<HTMLElement | null>>) => 
    () => {
      setter(null);
    };
    
  // Gestion de la déconnexion
  const handleLogout = async () => {
    handleMenuClose(setUserMenuAnchor)();
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
    }
  };

  // Gestion du menu mobile
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };


  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      minHeight: '100vh',
      width: '100vw',
      maxWidth: '100%',
      margin: 0,
      padding: 0,
      overflow: 'hidden',
    }}>
      {/* Bandeau en deux parties - maintenant en position fixe */}
      <AppBar 
        position="fixed" // Changé en 'fixed' pour rester visible pendant le défilement
        sx={{ 
          zIndex: (theme) => theme.zIndex.drawer + 1,
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)', // Légère ombre pour le distinguer du contenu
          width: '100vw',
          maxWidth: '100%',
          left: 0,
          right: 0,
          margin: 0,
          padding: 0,
          top: 0,
        }}
      >
        {/* Partie supérieure du bandeau */}
        <Box
          sx={{
            bgcolor: theme.palette.primary.main,
            color: 'white',
            py: 3,
            width: '100vw',
            maxWidth: '100%',
            boxSizing: 'border-box',
            margin: 0,
            padding: '1.5rem 0',
          }}
        >
          <Container maxWidth={false} disableGutters sx={{ width: '100%', px: { xs: 2, sm: 3, md: 4 } }}>
            <Box sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%',
            }}>
              {/* Section F L²M avec grandes lettres */}
              <Box sx={{ flexGrow: 1 }}>
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', md: 'row' },
                    gap: { xs: 2, md: 4 },
                    justifyContent: 'center',
                    alignItems: 'center',
                    mb: 2,
                  }}
                >
                  {/* F - Force */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'flex-end',
                      gap: 1.5,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: { xs: '4rem', md: '5rem' },
                        fontWeight: 700,
                        background: 'linear-gradient(45deg, #FFD700, #FFA500)',
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        lineHeight: 1,
                        fontFamily: '"Playfair Display", serif',
                        filter: 'drop-shadow(0 2px 8px rgba(255, 215, 0, 0.15))',
                      }}
                    >
                      F
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: { xs: '0.9rem', md: '1rem' },
                        fontWeight: 400,
                        color: 'rgba(255, 255, 255, 0.8)',
                        lineHeight: 1,
                        pb: 0.5,
                      }}
                    >
                      Force
                    </Typography>
                  </Box>

                  {/* L - Légitimité */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'flex-end',
                      gap: 1.5,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: { xs: '4rem', md: '5rem' },
                        fontWeight: 700,
                        background: 'linear-gradient(45deg, #FFD700, #FFA500)',
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        lineHeight: 1,
                        fontFamily: '"Playfair Display", serif',
                        filter: 'drop-shadow(0 2px 8px rgba(255, 215, 0, 0.15))',
                      }}
                    >
                      L
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: { xs: '0.9rem', md: '1rem' },
                        fontWeight: 400,
                        color: 'rgba(255, 255, 255, 0.8)',
                        lineHeight: 1,
                        pb: 0.5,
                      }}
                    >
                      Légitimité
                    </Typography>
                  </Box>

                  {/* ²M - Mouvement Métamorphose */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'flex-end',
                      gap: 1.5,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: { xs: '4rem', md: '5rem' },
                        fontWeight: 700,
                        background: 'linear-gradient(45deg, #FFD700, #FFA500)',
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        lineHeight: 1,
                        fontFamily: '"Playfair Display", serif',
                        filter: 'drop-shadow(0 2px 8px rgba(255, 215, 0, 0.15))',
                      }}
                    >
                      ²M
                    </Typography>
                    <Box sx={{ pb: 0.5 }}>
                      <Typography
                        sx={{
                          fontSize: { xs: '0.9rem', md: '1rem' },
                          fontWeight: 400,
                          color: 'rgba(255, 255, 255, 0.8)',
                          lineHeight: 1.2,
                        }}
                      >
                        Mouvement
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: { xs: '0.9rem', md: '1rem' },
                          fontWeight: 400,
                          color: 'rgba(255, 255, 255, 0.8)',
                          lineHeight: 1.2,
                        }}
                      >
                        Métamorphose
                      </Typography>
                    </Box>
                  </Box>
                </Box>

             </Box>
                           

              {/* Boutons de connexion/inscription ou menu utilisateur */}
              <Box>
                {isMobile && (
                  <IconButton 
                    color="inherit"
                    onClick={toggleMobileMenu}
                    edge="end"
                    size="large"
                  >
                    <MenuIcon />
                  </IconButton>
                )}

                {!isMobile && (
                  user ? (
                    <>
                      <Box
                        onClick={handleMenuOpen(setUserMenuAnchor)}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1.5,
                          cursor: 'pointer',
                          padding: '8px 16px',
                          borderRadius: '50px',
                          background: 'rgba(255, 255, 255, 0.1)',
                          backdropFilter: 'blur(10px)',
                          border: '1px solid rgba(255, 215, 0, 0.3)',
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            background: 'rgba(255, 255, 255, 0.15)',
                            borderColor: '#FFD700',
                            boxShadow: '0 4px 12px rgba(255, 215, 0, 0.2)',
                          },
                        }}
                      >
                        <Avatar
                          sx={{
                            width: 36,
                            height: 36,
                            background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                            color: '#1D3461',
                            fontWeight: 700,
                            fontSize: '1.1rem',
                            boxShadow: '0 2px 8px rgba(255, 215, 0, 0.3)',
                          }}
                        >
                          {profile?.first_name ? profile.first_name[0].toUpperCase() : <AccountCircleIcon />}
                        </Avatar>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                          <Typography
                            sx={{
                              fontSize: '0.9rem',
                              fontWeight: 600,
                              color: 'white',
                              lineHeight: 1.2,
                            }}
                          >
                            {profile?.first_name} {profile?.last_name}
                          </Typography>
                          <Typography
                            sx={{
                              fontSize: '0.7rem',
                              color: 'rgba(255, 255, 255, 0.7)',
                              lineHeight: 1.2,
                            }}
                          >
                            {profile?.user_type === 'admin' ? 'Administrateur' : 'Mon compte'}
                          </Typography>
                        </Box>
                      </Box>
                      <Menu
                        id="user-menu"
                        anchorEl={userMenuAnchor}
                        open={Boolean(userMenuAnchor)}
                        onClose={handleMenuClose(setUserMenuAnchor)}
                        anchorOrigin={{
                          vertical: 'bottom',
                          horizontal: 'right',
                        }}
                        transformOrigin={{
                          vertical: 'top',
                          horizontal: 'right',
                        }}
                        sx={{
                          mt: 1.5,
                          '& .MuiPaper-root': {
                            borderRadius: '12px',
                            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
                            border: '1px solid rgba(255, 215, 0, 0.1)',
                            minWidth: '280px',
                            overflow: 'visible',
                            '&::before': {
                              content: '""',
                              display: 'block',
                              position: 'absolute',
                              top: 0,
                              right: 20,
                              width: 12,
                              height: 12,
                              bgcolor: 'background.paper',
                              transform: 'translateY(-50%) rotate(45deg)',
                              borderLeft: '1px solid rgba(255, 215, 0, 0.1)',
                              borderTop: '1px solid rgba(255, 215, 0, 0.1)',
                              zIndex: 0,
                            },
                          },
                        }}
                      >
                        <Box
                          sx={{
                            px: 3,
                            py: 2.5,
                            background: 'linear-gradient(135deg, #345995 0%, #1D3461 100%)',
                            color: 'white',
                            position: 'relative',
                            overflow: 'hidden',
                            '&::after': {
                              content: '""',
                              position: 'absolute',
                              top: 0,
                              right: 0,
                              width: '100px',
                              height: '100px',
                              background: 'radial-gradient(circle, rgba(255, 215, 0, 0.15) 0%, transparent 70%)',
                              transform: 'translate(30%, -30%)',
                            },
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, position: 'relative', zIndex: 1 }}>
                            <Avatar
                              sx={{
                                width: 48,
                                height: 48,
                                background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                                color: '#1D3461',
                                fontWeight: 700,
                                fontSize: '1.3rem',
                                boxShadow: '0 4px 12px rgba(255, 215, 0, 0.3)',
                              }}
                            >
                              {profile?.first_name ? profile.first_name[0].toUpperCase() : <AccountCircleIcon />}
                            </Avatar>
                            <Box sx={{ flex: 1 }}>
                              <Typography
                                variant="subtitle1"
                                sx={{
                                  fontWeight: 600,
                                  color: 'white',
                                  lineHeight: 1.2,
                                  mb: 0.5,
                                }}
                              >
                                {profile?.first_name} {profile?.last_name}
                              </Typography>
                              <Typography
                                variant="body2"
                                sx={{
                                  color: 'rgba(255, 255, 255, 0.8)',
                                  fontSize: '0.85rem',
                                  lineHeight: 1.2,
                                }}
                              >
                                {user.email}
                              </Typography>
                              {profile?.user_type === 'admin' && (
                                <Box
                                  sx={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 0.5,
                                    mt: 0.5,
                                    px: 1,
                                    py: 0.25,
                                    borderRadius: '12px',
                                    background: 'rgba(255, 215, 0, 0.2)',
                                    border: '1px solid rgba(255, 215, 0, 0.3)',
                                  }}
                                >
                                  <Typography
                                    sx={{
                                      fontSize: '0.7rem',
                                      fontWeight: 600,
                                      color: '#FFD700',
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.5px',
                                    }}
                                  >
                                    Admin
                                  </Typography>
                                </Box>
                              )}
                            </Box>
                          </Box>
                        </Box>
                        <Divider sx={{ borderColor: 'rgba(0, 0, 0, 0.08)' }} />
                        <Box sx={{ py: 1 }}>
                          <MenuItem
                            component={RouterLink}
                            to="/profile"
                            onClick={handleMenuClose(setUserMenuAnchor)}
                            sx={{
                              px: 3,
                              py: 1.5,
                              transition: 'all 0.2s ease',
                              '&:hover': {
                                backgroundColor: 'rgba(255, 215, 0, 0.08)',
                                '& .MuiSvgIcon-root, & .menu-icon': {
                                  color: '#FFA500',
                                  transform: 'scale(1.1)',
                                },
                              },
                            }}
                          >
                            <AccountCircleIcon
                              fontSize="small"
                              sx={{
                                mr: 2,
                                color: '#345995',
                                transition: 'all 0.2s ease',
                              }}
                            />
                            <Typography sx={{ fontWeight: 500 }}>Mon profil</Typography>
                          </MenuItem>
                          <MenuItem
                            component={RouterLink}
                            to="/mes-rendez-vous"
                            onClick={handleMenuClose(setUserMenuAnchor)}
                            sx={{
                              px: 3,
                              py: 1.5,
                              transition: 'all 0.2s ease',
                              '&:hover': {
                                backgroundColor: 'rgba(255, 215, 0, 0.08)',
                                '& .menu-icon': {
                                  transform: 'scale(1.1)',
                                },
                              },
                            }}
                          >
                            <Box
                              component="span"
                              className="menu-icon"
                              sx={{
                                mr: 2,
                                display: 'inline-flex',
                                fontSize: '1.2rem',
                                transition: 'all 0.2s ease',
                              }}
                            >
                              📅
                            </Box>
                            <Typography sx={{ fontWeight: 500 }}>Mes rendez-vous</Typography>
                          </MenuItem>
                          {profile?.user_type === 'admin' && (
                            <MenuItem
                              component={RouterLink}
                              to="/admin"
                              onClick={handleMenuClose(setUserMenuAnchor)}
                              sx={{
                                px: 3,
                                py: 1.5,
                                transition: 'all 0.2s ease',
                                background: 'rgba(255, 215, 0, 0.05)',
                                borderLeft: '3px solid #FFD700',
                                '&:hover': {
                                  backgroundColor: 'rgba(255, 215, 0, 0.12)',
                                  '& .menu-icon': {
                                    transform: 'scale(1.1) rotate(15deg)',
                                  },
                                },
                              }}
                            >
                              <Box
                                component="span"
                                className="menu-icon"
                                sx={{
                                  mr: 2,
                                  display: 'inline-flex',
                                  fontSize: '1.2rem',
                                  transition: 'all 0.2s ease',
                                }}
                              >
                                🔧
                              </Box>
                              <Typography sx={{ fontWeight: 600, color: '#345995' }}>Administration</Typography>
                            </MenuItem>
                          )}
                        </Box>
                        <Divider sx={{ borderColor: 'rgba(0, 0, 0, 0.08)' }} />
                        <Box sx={{ p: 1 }}>
                          <MenuItem
                            onClick={handleLogout}
                            sx={{
                              px: 3,
                              py: 1.5,
                              borderRadius: '8px',
                              mx: 1,
                              transition: 'all 0.2s ease',
                              '&:hover': {
                                backgroundColor: 'rgba(228, 92, 58, 0.08)',
                                '& .MuiSvgIcon-root': {
                                  color: '#E45C3A',
                                  transform: 'translateX(-3px)',
                                },
                                '& .MuiTypography-root': {
                                  color: '#E45C3A',
                                },
                              },
                            }}
                          >
                            <LogoutIcon
                              fontSize="small"
                              sx={{
                                mr: 2,
                                color: '#666',
                                transition: 'all 0.2s ease',
                              }}
                            />
                            <Typography sx={{ fontWeight: 500, color: '#666', transition: 'all 0.2s ease' }}>
                              Déconnexion
                            </Typography>
                          </MenuItem>
                        </Box>
                      </Menu>
                    </>
                  ) : (
                    <>
                      <Button 
                        color="inherit" 
                        component={RouterLink} 
                        to="/login"
                        variant="outlined"
                        sx={{ 
                          mr: 1,
                          borderColor: 'white',
                          '&:hover': {
                            borderColor: 'white',
                            backgroundColor: 'rgba(255, 255, 255, 0.1)'
                          }
                        }}
                      >
                        Connexion
                      </Button>
                      <Button 
                        color="inherit" 
                        component={RouterLink} 
                        to="/signup"
                        variant="contained"
                        sx={{ 
                          bgcolor: 'white',
                          color: 'primary.main',
                          '&:hover': {
                            bgcolor: 'rgba(255, 255, 255, 0.9)'
                          }
                        }}
                      >
                        Inscription
                      </Button>
                    </>
                  )
                )}
              </Box>
            </Box>
          </Container>
        </Box>

        {/* Partie inférieure du bandeau (menu de navigation) */}
        <Box 
          sx={{ 
            bgcolor: theme.palette.primary.dark,
            color: 'white',
            width: '100vw',
            maxWidth: '100%',
            boxSizing: 'border-box',
            margin: 0,
            padding: 0,
          }}
        >
          {!isMobile && (
            <Container maxWidth={false} disableGutters sx={{ width: '100%' }}>
              <Toolbar 
                variant="dense" 
                disableGutters
                sx={{
                  justifyContent: 'center',
                  minHeight: '48px',
                }}
              >
                {/* Bouton Accueil */}
                <Button
                  color="inherit"
                  component={RouterLink}
                  to="/"
                  sx={{
                    mx: 1,
                    fontSize: '1.1rem',
                    backgroundColor: location.pathname === '/' ? 'rgba(255, 215, 0, 0.15)' : 'transparent',
                    borderBottom: location.pathname === '/' ? '2px solid #FFD700' : 'none',
                    '& span:first-of-type': {
                      background: 'linear-gradient(45deg, #FFD700, #FFA500)',
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      fontWeight: 700,
                    },
                  }}
                >
                  <span>A</span>ccueil
                </Button>

                {/* Bouton Particuliers */}
                <Button
                  color="inherit"
                  component={RouterLink}
                  to="/particuliers"
                  sx={{
                    mx: 1,
                    fontSize: '1.1rem',
                    backgroundColor: location.pathname.startsWith('/particuliers') ? 'rgba(255, 215, 0, 0.15)' : 'transparent',
                    borderBottom: location.pathname.startsWith('/particuliers') ? '2px solid #FFD700' : 'none',
                    '& span:first-of-type': {
                      background: 'linear-gradient(45deg, #FFD700, #FFA500)',
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      fontWeight: 700,
                      fontSize: '1.2rem',
                    },
                  }}
                >
                  <span>P</span>articuliers
                </Button>

                {/* Bouton Professionnels */}
                <Button
                  color="inherit"
                  component={RouterLink}
                  to="/professionnels"
                  sx={{
                    mx: 1,
                    fontSize: '1.1rem',
                    backgroundColor: location.pathname.startsWith('/professionnels') ? 'rgba(100, 149, 237, 0.15)' : 'transparent',
                    borderBottom: location.pathname.startsWith('/professionnels') ? '2px solid #6495ED' : 'none',
                    '& span:first-of-type': {
                      color: '#6495ED',
                      fontWeight: 700,
                      fontSize: '1.2rem',
                    },
                  }}
                >
                  <span>P</span>rofessionnels
                </Button>

                {/* Bouton Sportifs */}
                <Button
                  color="inherit"
                  component={RouterLink}
                  to="/sportifs"
                  sx={{
                    mx: 1,
                    fontSize: '1.1rem',
                    backgroundColor: location.pathname.startsWith('/sportifs') ? 'rgba(17, 153, 142, 0.15)' : 'transparent',
                    borderBottom: location.pathname.startsWith('/sportifs') ? '2px solid #11998e' : 'none',
                    '& span:first-of-type': {
                      color: '#11998e',
                      fontWeight: 700,
                      fontSize: '1.2rem',
                    },
                  }}
                >
                  <span>S</span>portifs
                </Button>
                {/* Bouton Intervenants */}
                <Button
                  color="inherit"
                  component={RouterLink}
                  to="/consultants"
                  sx={{
                    mx: 1,
                    fontSize: '1.1rem',
                    backgroundColor: location.pathname.startsWith('/consultants') ? 'rgba(255, 215, 0, 0.15)' : 'transparent',
                    borderBottom: location.pathname.startsWith('/consultants') ? '2px solid #FFD700' : 'none',
                    '& span:first-of-type': {
                      background: 'linear-gradient(45deg, #FFD700, #FFA500)',
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      fontWeight: 700,
                      fontSize: '1.2rem',
                    },
                  }}
                >
                  <span>I</span>ntervenants
                </Button>
                {/* Autres boutons de navigation */}
                <Button
                  color="inherit"
                  component={RouterLink}
                  to="/prendre-rendez-vous"
                  sx={{
                    mx: 1,
                    fontSize: '1.1rem',
                    backgroundColor: location.pathname === '/prendre-rendez-vous' ? 'rgba(255, 215, 0, 0.15)' : 'transparent',
                    borderBottom: location.pathname === '/prendre-rendez-vous' ? '2px solid #FFD700' : 'none',
                    '& span:first-of-type': {
                      background: 'linear-gradient(45deg, #FFD700, #FFA500)',
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      fontWeight: 700,
                    },
                  }}
                >
                  <span>P</span>rendre RDV
                </Button>

                <Button
                  color="inherit"
                  component={RouterLink}
                  to="/contact"
                  sx={{
                    mx: 1,
                    fontSize: '1.1rem',
                    backgroundColor: location.pathname === '/contact' ? 'rgba(255, 215, 0, 0.15)' : 'transparent',
                    borderBottom: location.pathname === '/contact' ? '2px solid #FFD700' : 'none',
                    '& span:first-of-type': {
                      background: 'linear-gradient(45deg, #FFD700, #FFA500)',
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      fontWeight: 700,
                    },
                  }}
                >
                  <span>C</span>ontact
                </Button>

                <Button
                  color="inherit"
                  component={RouterLink}
                  to="/apropos"
                  sx={{
                    mx: 1,
                    fontSize: '1.1rem',
                    backgroundColor: location.pathname === '/apropos' ? 'rgba(255, 215, 0, 0.15)' : 'transparent',
                    borderBottom: location.pathname === '/apropos' ? '2px solid #FFD700' : 'none',
                    '& span:first-of-type': {
                      background: 'linear-gradient(45deg, #FFD700, #FFA500)',
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      fontWeight: 700,
                    },
                  }}
                >
                  <span>À</span> propos
                </Button>
              </Toolbar>
            </Container>
          )}
        </Box>
      </AppBar>

      {/* Menu mobile */}
      <Drawer
        anchor="right"
        open={isMobile && mobileMenuOpen}
        onClose={toggleMobileMenu}
        sx={{
          '& .MuiDrawer-paper': { 
            width: '80%', 
            maxWidth: '300px',
            boxSizing: 'border-box' 
          },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            p: 2,
            bgcolor: 'primary.main',
            color: 'white'
          }}
        >
          <Typography variant="h6">Menu</Typography>
          <IconButton
            color="inherit"
            onClick={toggleMobileMenu}
            edge="end"
          >
            <CloseIcon />
          </IconButton>
        </Box>

        <Divider />

        {/* Section utilisateur pour mobile */}
        {user ? (
          <Box sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Avatar 
                sx={{ width: 32, height: 32, bgcolor: 'primary.main', mr: 1 }}
              >
                {profile?.first_name ? profile.first_name[0].toUpperCase() : <AccountCircleIcon />}
              </Avatar>
              <Box>
                <Typography variant="subtitle2">
                  {profile?.first_name} {profile?.last_name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {user.email}
                </Typography>
              </Box>
            </Box>
            <Divider sx={{ my: 1 }} />
          </Box>
        ) : (
          <Box sx={{ p: 2, display: 'flex', gap: 1 }}>
            <Button 
              variant="outlined" 
              color="primary" 
              component={RouterLink} 
              to="/login"
              sx={{ flex: 1 }}
              onClick={toggleMobileMenu}
            >
              Connexion
            </Button>
            <Button 
              variant="contained" 
              color="primary" 
              component={RouterLink} 
              to="/signup"
              sx={{ flex: 1 }}
              onClick={toggleMobileMenu}
            >
              Inscription
            </Button>
          </Box>
        )}

        <List>
          {/* Navigation principale */}
          <ListItem 
            button 
            component={RouterLink} 
            to="/"
            onClick={toggleMobileMenu}
          >
            <ListItemIcon>
              <HomeIcon />
            </ListItemIcon>
            <ListItemText primary="Accueil" />
          </ListItem>

          <ListItem 
            button 
            component={RouterLink} 
            to="/particuliers"
            onClick={toggleMobileMenu}
          >
            <ListItemIcon>
              <PersonIcon />
            </ListItemIcon>
            <ListItemText primary="Particuliers" />
          </ListItem>

          <ListItem 
            button 
            component={RouterLink} 
            to="/professionnels"
            onClick={toggleMobileMenu}
          >
            <ListItemIcon>
              <BusinessIcon />
            </ListItemIcon>
            <ListItemText primary="Professionnels" />
          </ListItem>

          <ListItem
            button
            component={RouterLink}
            to="/sportifs"
            onClick={toggleMobileMenu}
          >
            <ListItemIcon>
              <SportsSoccerIcon />
            </ListItemIcon>
            <ListItemText primary="Sportifs" />
          </ListItem>

          <ListItem
            button
            component={RouterLink}
            to="/consultants"
            onClick={toggleMobileMenu}
          >
            <ListItemIcon>
              <PersonIcon />
            </ListItemIcon>
            <ListItemText primary="Intervenants" />
          </ListItem>

          <ListItem
            button
            component={RouterLink}
            to="/prendre-rendez-vous"
            onClick={toggleMobileMenu}
          >
            <ListItemIcon>
              <EventIcon />
            </ListItemIcon>
            <ListItemText primary="Prendre RDV" />
          </ListItem>

          <ListItem 
            button 
            component={RouterLink} 
            to="/contact"
            onClick={toggleMobileMenu}
          >
            <ListItemIcon>
              <PhoneIcon />
            </ListItemIcon>
            <ListItemText primary="Contact" />
          </ListItem>

          <ListItem 
            button 
            component={RouterLink} 
            to="/apropos"
            onClick={toggleMobileMenu}
          >
            <ListItemIcon>
              <InfoIcon />
            </ListItemIcon>
            <ListItemText primary="À propos" />
          </ListItem>
        </List>

        <Divider />

        {/* Liens utilisateur pour mobile */}
        {user && (
          <List>
            <ListItem 
              button 
              component={RouterLink} 
              to="/profile"
              onClick={toggleMobileMenu}
            >
              <ListItemIcon>
                <AccountCircleIcon />
              </ListItemIcon>
              <ListItemText primary="Mon profil" />
            </ListItem>

            <ListItem 
              button 
              component={RouterLink} 
              to="/mes-rendez-vous"
              onClick={toggleMobileMenu}
            >
              <ListItemIcon>
                <EventIcon />
              </ListItemIcon>
              <ListItemText primary="Mes rendez-vous" />
            </ListItem>

            {profile?.user_type === 'admin' && (
              <ListItem 
                button 
                component={RouterLink} 
                to="/admin"
                onClick={toggleMobileMenu}
              >
                <ListItemIcon>
                  <Box component="span" sx={{ display: 'inline-flex' }}>🔧</Box>
                </ListItemIcon>
                <ListItemText primary="Administration" />
              </ListItem>
            )}

            <ListItem 
              button 
              onClick={() => {
                toggleMobileMenu();
                handleLogout();
              }}
            >
              <ListItemIcon>
                <LogoutIcon />
              </ListItemIcon>
              <ListItemText primary="Déconnexion" />
            </ListItem>
          </List>
        )}
      </Drawer>

      {/* Espace pour compenser la hauteur du bandeau fixe */}
      <Box sx={{ height: headerHeight }}></Box>

      {/* Contenu principal */}
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1, 
          display: 'flex', 
          flexDirection: 'column',
          width: '100%',
          maxWidth: '100%'
        }}
      >
        <Outlet />
      </Box>

      {/* Pied de page professionnel */}
      <Box
        component="footer"
        sx={{
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          color: 'white',
          mt: 'auto',
          width: '100%',
          borderTop: '3px solid #FFD700',
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4} sx={{ py: 6 }}>
            {/* Section À propos */}
            <Grid item xs={12} md={4}>
              <Typography
                variant="h6"
                gutterBottom
                sx={{
                  fontWeight: 600,
                  color: '#FFD700',
                  mb: 2,
                }}
              >
                F L M
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: 'rgba(255, 255, 255, 0.8)',
                  lineHeight: 1.7,
                  mb: 2,
                }}
              >
                Force, Légitimité, Mouvement & Métamorphose. <br></br>On vous accompagne, grâce à la Numérologie Stratégique®, à mieux vous connaître, à trouver votre équilibre, à déployer votre potentiel et à passer à l’action avec clarté et confiance.
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                {/* Icônes réseaux sociaux - placeholder */}
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    border: '1px solid rgba(255, 215, 0, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      borderColor: '#FFD700',
                      backgroundColor: 'rgba(255, 215, 0, 0.1)',
                    },
                  }}
                >
                  <Typography sx={{ fontSize: '1.2rem' }}>L</Typography>
                </Box>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    border: '1px solid rgba(255, 215, 0, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      borderColor: '#FFD700',
                      backgroundColor: 'rgba(255, 215, 0, 0.1)',
                    },
                  }}
                >
                  <Typography sx={{ fontSize: '1.2rem' }}>F</Typography>
                </Box>
              </Box>
            </Grid>

            {/* Section Liens rapides */}
            <Grid item xs={12} sm={6} md={2}>
              <Typography
                variant="h6"
                gutterBottom
                sx={{
                  fontWeight: 600,
                  color: '#FFD700',
                  mb: 2,
                  fontSize: '1rem',
                }}
              >
                Navigation
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography
                  component={RouterLink}
                  to="/"
                  sx={{
                    color: 'rgba(255, 255, 255, 0.8)',
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                    transition: 'color 0.3s ease',
                    '&:hover': {
                      color: '#FFD700',
                    },
                  }}
                >
                  Accueil
                </Typography>
                <Typography
                  component={RouterLink}
                  to="/particuliers"
                  sx={{
                    color: 'rgba(255, 255, 255, 0.8)',
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                    transition: 'color 0.3s ease',
                    '&:hover': {
                      color: '#FFD700',
                    },
                  }}
                >
                  Particuliers
                </Typography>
                <Typography
                  component={RouterLink}
                  to="/professionnels"
                  sx={{
                    color: 'rgba(255, 255, 255, 0.8)',
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                    transition: 'color 0.3s ease',
                    '&:hover': {
                      color: '#FFD700',
                    },
                  }}
                >
                  Professionnels
                </Typography>
                <Typography
                  component={RouterLink}
                  to="/sportifs"
                  sx={{
                    color: 'rgba(255, 255, 255, 0.8)',
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                    transition: 'color 0.3s ease',
                    '&:hover': {
                      color: '#FFD700',
                    },
                  }}
                >
                  Sportifs
                </Typography>
                <Typography
                  component={RouterLink}
                  to="/consultants"
                  sx={{
                    color: 'rgba(255, 255, 255, 0.8)',
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                    transition: 'color 0.3s ease',
                    '&:hover': {
                      color: '#FFD700',
                    },
                  }}
                >
                  Intervenants
                </Typography>
              </Box>
            </Grid>

            {/* Section Services */}
            <Grid item xs={12} sm={6} md={3}>
              <Typography
                variant="h6"
                gutterBottom
                sx={{
                  fontWeight: 600,
                  color: '#FFD700',
                  mb: 2,
                  fontSize: '1rem',
                }}
              >
                Services
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography
                  component={RouterLink}
                  to="/prendre-rendez-vous"
                  sx={{
                    color: 'rgba(255, 255, 255, 0.8)',
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                    transition: 'color 0.3s ease',
                    '&:hover': {
                      color: '#FFD700',
                    },
                  }}
                >
                  Prendre rendez-vous
                </Typography>
                <Typography
                  component={RouterLink}
                  to="/contact"
                  sx={{
                    color: 'rgba(255, 255, 255, 0.8)',
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                    transition: 'color 0.3s ease',
                    '&:hover': {
                      color: '#FFD700',
                    },
                  }}
                >
                  Contact
                </Typography>
                <Typography
                  component={RouterLink}
                  to="/apropos"
                  sx={{
                    color: 'rgba(255, 255, 255, 0.8)',
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                    transition: 'color 0.3s ease',
                    '&:hover': {
                      color: '#FFD700',
                    },
                  }}
                >
                  À propos
                </Typography>
              </Box>
            </Grid>

            {/* Section Légal */}
            <Grid item xs={12} sm={6} md={3}>
              <Typography
                variant="h6"
                gutterBottom
                sx={{
                  fontWeight: 600,
                  color: '#FFD700',
                  mb: 2,
                  fontSize: '1rem',
                }}
              >
                Informations légales
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography
                  component={RouterLink}
                  to="/mentions-legales"
                  sx={{
                    color: 'rgba(255, 255, 255, 0.8)',
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                    transition: 'color 0.3s ease',
                    '&:hover': {
                      color: '#FFD700',
                    },
                  }}
                >
                  Mentions légales
                </Typography>
                <Typography
                  component={RouterLink}
                  to="/politique-confidentialite"
                  sx={{
                    color: 'rgba(255, 255, 255, 0.8)',
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                    transition: 'color 0.3s ease',
                    '&:hover': {
                      color: '#FFD700',
                    },
                  }}
                >
                  Politique de confidentialité
                </Typography>
                <Typography
                  component={RouterLink}
                  to="/cgu"
                  sx={{
                    color: 'rgba(255, 255, 255, 0.8)',
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                    transition: 'color 0.3s ease',
                    '&:hover': {
                      color: '#FFD700',
                    },
                  }}
                >
                  Conditions générales d'utilisation
                </Typography>
              </Box>
            </Grid>
          </Grid>

          {/* Barre de copyright */}
          <Divider sx={{ borderColor: 'rgba(255, 215, 0, 0.2)' }} />
          <Box
            sx={{
              py: 3,
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <Typography
              variant="body2"
              sx={{
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '0.875rem',
              }}
            >
              © 2025 FL²M Services. Tous droits réservés.
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '0.875rem',
              }}
            >
              Force • Légitimité • Mouvement • Métamorphose
            </Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default MainLayout;