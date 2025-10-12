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
  ListItemText
} from '@mui/material';
import { Link as RouterLink, Outlet, useNavigate } from 'react-router-dom';
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // États pour les menus déroulants
  const [particuliersAnchor, setParticuliersAnchor] = useState<null | HTMLElement>(null);
  const [professionnelsAnchor, setProfessionnelsAnchor] = useState<null | HTMLElement>(null);
  const [sportifsAnchor, setSportifsAnchor] = useState<null | HTMLElement>(null);
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

  // Chemins des pages particuliers
  const particuliersPages = [
    { title: 'Tous les Modules', path: '/particuliers' },
    { title: 'Module Adultes', path: '/particuliers/module-adultes' },
    { title: 'Module Couples', path: '/particuliers/module-couples' },
    { title: 'Module Enfants', path: '/particuliers/module-enfants' },
    { title: 'Module Suivi Annuel', path: '/particuliers/module-suivi-annuel' }
  ];

  // Chemins des pages professionnels
  const professionnelsPages = [
    { title: 'Tous les Modules', path: '/professionnels' },
    { title: 'Module Coéquipiers', path: '/professionnels/module-coequipiers' },
    { title: 'Module Équipe', path: '/professionnels/module-equipe' },
    { title: 'Module Candidats', path: '/professionnels/module-candidats' },
    { title: 'Module Associés', path: '/professionnels/module-associes' },
    { title: 'Module Stratégies', path: '/professionnels/module-strategies' }
  ];

  // Chemins des pages sportifs
  const sportifsPages = [
    { title: 'Tous les Modules', path: '/sportifs' },
    { title: 'Module Solo', path: '/sportifs/module-solo' },
    { title: 'Module Team', path: '/sportifs/module-team' }
  ];

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
            py: 2,
            width: '100vw',
            maxWidth: '100%',
            boxSizing: 'border-box',
            margin: 0,
            padding: '1rem 0',
          }}
        >
          <Container maxWidth={false} disableGutters sx={{ width: '100%', px: { xs: 2, sm: 3, md: 4 } }}>
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              width: '100%',
            }}>
              {/* Logo/Titre */}
              <Box sx={{ textAlign: 'center', flexGrow: 1 }}>
              <Typography
                variant="h4"
                component={RouterLink}
                to="/"
                sx={{
                  textDecoration: 'none',
                  color: 'inherit',
                  fontWeight: 'bold',
                }}
              >
                F L M               </Typography>
                <Typography
                variant="body2"
                sx={{
                  fontStyle: 'italic',
                  fontSize: '0.75rem',
                  color: 'inherit',
                }}
              >
                
              </Typography>
              
              <Typography
                variant="body2"
                sx={{
                  fontStyle: 'normal',
                  fontSize: '1.5rem',
                  color: 'inherit',
                }}
              >
                Décidez de votre Avenir
              </Typography>
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
                      <IconButton 
                        onClick={handleMenuOpen(setUserMenuAnchor)} 
                        color="inherit"
                        size="small"
                        sx={{ ml: 1 }}
                      >
                        <Avatar 
                          sx={{ width: 32, height: 32, bgcolor: 'white', color: 'primary.main' }}
                        >
                          {profile?.first_name ? profile.first_name[0].toUpperCase() : <AccountCircleIcon />}
                        </Avatar>
                      </IconButton>
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
                      >
                        <Box sx={{ px: 2, py: 1 }}>
                          <Typography variant="subtitle1">
                            {profile?.first_name} {profile?.last_name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {user.email}
                          </Typography>
                        </Box>
                        <Divider />
                        <MenuItem component={RouterLink} to="/profile" onClick={handleMenuClose(setUserMenuAnchor)}>
                          <AccountCircleIcon fontSize="small" sx={{ mr: 1 }} />
                          Mon profil
                        </MenuItem>
                        <MenuItem component={RouterLink} to="/mes-rendez-vous" onClick={handleMenuClose(setUserMenuAnchor)}>
                          <Box component="span" sx={{ mr: 1, display: 'inline-flex' }}>📅</Box>
                          Mes rendez-vous
                        </MenuItem>
                        {profile?.user_type === 'admin' && (
                          <MenuItem component={RouterLink} to="/admin" onClick={handleMenuClose(setUserMenuAnchor)}>
                            <Box component="span" sx={{ mr: 1, display: 'inline-flex' }}>🔧</Box>
                            Administration
                          </MenuItem>
                        )}
                        <Divider />
                        <MenuItem onClick={handleLogout}>
                          <LogoutIcon fontSize="small" sx={{ mr: 1 }} />
                          Déconnexion
                        </MenuItem>
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
                  sx={{ mx: 1 }}
                >
                  Accueil
                </Button>

                {/* Menu Particuliers */}
                <Button 
                  color="inherit"
                  aria-controls="particuliers-menu"
                  aria-haspopup="true"
                  onClick={handleMenuOpen(setParticuliersAnchor)}
                  sx={{ mx: 1 }}
                >
                  Particulier
                </Button>
                <Menu
                  id="particuliers-menu"
                  anchorEl={particuliersAnchor}
                  keepMounted
                  open={Boolean(particuliersAnchor)}
                  onClose={handleMenuClose(setParticuliersAnchor)}
                >
                  {particuliersPages.map((page) => (
                    <MenuItem 
                      key={page.path}
                      component={RouterLink} 
                      to={page.path} 
                      onClick={handleMenuClose(setParticuliersAnchor)}
                    >
                      {page.title}
                    </MenuItem>
                  ))}
                </Menu>

                {/* Menu Professionnels */}
                <Button 
                  color="inherit"
                  aria-controls="professionnels-menu"
                  aria-haspopup="true"
                  onClick={handleMenuOpen(setProfessionnelsAnchor)}
                  sx={{ mx: 1 }}
                >
                  Professionnel
                </Button>
                <Menu
                  id="professionnels-menu"
                  anchorEl={professionnelsAnchor}
                  keepMounted
                  open={Boolean(professionnelsAnchor)}
                  onClose={handleMenuClose(setProfessionnelsAnchor)}
                >
                  {professionnelsPages.map((page) => (
                    <MenuItem 
                      key={page.path}
                      component={RouterLink} 
                      to={page.path} 
                      onClick={handleMenuClose(setProfessionnelsAnchor)}
                    >
                      {page.title}
                    </MenuItem>
                  ))}
                </Menu>

                {/* Menu Sportifs */}
                <Button 
                  color="inherit"
                  aria-controls="sportifs-menu"
                  aria-haspopup="true"
                  onClick={handleMenuOpen(setSportifsAnchor)}
                  sx={{ mx: 1 }}
                >
                  Sportif
                </Button>
                <Menu
                  id="sportifs-menu"
                  anchorEl={sportifsAnchor}
                  keepMounted
                  open={Boolean(sportifsAnchor)}
                  onClose={handleMenuClose(setSportifsAnchor)}
                >
                  {sportifsPages.map((page) => (
                    <MenuItem 
                      key={page.path}
                      component={RouterLink} 
                      to={page.path} 
                      onClick={handleMenuClose(setSportifsAnchor)}
                    >
                      {page.title}
                    </MenuItem>
                  ))}
                </Menu>
                {/* Ajout du bouton Consultant */}
                <Button 
                  color="inherit" 
                  component={RouterLink} 
                  to="/consultants"
                  sx={{ mx: 1 }}
                >
                  Consultant
                </Button>
                {/* Autres boutons de navigation */}
                <Button 
                  color="inherit" 
                  component={RouterLink} 
                  to="/prendre-rendez-vous"
                  sx={{ mx: 1 }}
                >
                  Prendre RDV
                </Button>

                <Button 
                  color="inherit" 
                  component={RouterLink} 
                  to="/contact"
                  sx={{ mx: 1 }}
                >
                  Contact
                </Button>
                
                <Button 
                  color="inherit"
                  component={RouterLink} 
                  to="/apropos"
                  sx={{ mx: 1 }}
                >
                  À propos
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

      {/* Bandeau du bas */}
      <Box
        component="footer"
        sx={{
          py: 3,
          px: 2,
          mt: 'auto',
          backgroundColor: (theme) => theme.palette.grey[200],
          textAlign: 'center',
          width: '100%'
        }}
      >
        <Typography variant="body2" color="text.secondary">
          © 2025 FLM Services. Tous droits réservés.
        </Typography>
      </Box>
    </Box>
  );
};

export default MainLayout;