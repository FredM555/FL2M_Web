// src/components/layout/AdminLayout.tsx
import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Divider,
  IconButton,
  useTheme,
  CssBaseline,
  useMediaQuery,
  Avatar,
  Menu,
  MenuItem,
  Tooltip,
  Collapse,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Container,
  Badge
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import DesignServicesIcon from '@mui/icons-material/DesignServices';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import MessageIcon from '@mui/icons-material/Message';
import WorkIcon from '@mui/icons-material/Work';
import HistoryIcon from '@mui/icons-material/History';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';

// Interface pour les éléments du menu
interface MenuItem {
  text: string;
  path: string;
  icon: React.ReactElement;
  badge?: number;
}

const AdminLayout: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [menuOpen, setMenuOpen] = useState(!isMobile);
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [newMessagesCount, setNewMessagesCount] = useState(0);

  // Récupérer le nombre de nouveaux messages
  useEffect(() => {
    const fetchNewMessagesCount = async () => {
      try {
        const { count, error } = await supabase
          .from('contact_messages')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'new');
        
        if (error) throw error;
        
        setNewMessagesCount(count || 0);
      } catch (err) {
        console.error('Erreur lors de la récupération des nouveaux messages:', err);
      }
    };
    
    // Charger les données initiales
    fetchNewMessagesCount();
    
    // Configurer un intervalle pour rafraîchir régulièrement
    const interval = setInterval(fetchNewMessagesCount, 60000); // Toutes les minutes
    
    // Configurer un abonnement aux changements en temps réel (si Supabase le permet pour votre table)
    const subscription = supabase
      .channel('contact_messages')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'contact_messages' 
      }, () => {
        fetchNewMessagesCount();
      })
      .subscribe();
    
    return () => {
      clearInterval(interval);
      subscription.unsubscribe();
    };
  }, []);

  // Gestion de l'ouverture/fermeture du menu horizontal
  const handleMenuToggle = () => {
    setMenuOpen(!menuOpen);
  };

  // Menu utilisateur
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleSignOut = async () => {
    handleMenuClose();
    await signOut();
    navigate('/login');
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    if (isMobile) {
      setMenuOpen(false);
    }
  };

  // Éléments du menu
  const menuItems: MenuItem[] = [
    {
      text: 'Tableau de bord',
      path: '/admin',
      icon: <DashboardIcon />
    },
    {
      text: 'Utilisateurs',
      path: '/admin/utilisateurs',
      icon: <PeopleIcon />
    },
    {
      text: 'Intervenants',
      path: '/admin/intervenants',
      icon: <LocalHospitalIcon />
    },
    {
      text: 'Demandes Intervenant',
      path: '/admin/demandes-intervenant',
      icon: <WorkIcon />
    },
    {
      text: 'Services',
      path: '/admin/prestations',
      icon: <DesignServicesIcon />
    },
    {
      text: 'Rendez-vous',
      path: '/admin/rendez-vous',
      icon: <CalendarMonthIcon />
    },
    {
      text: 'Messages',
      path: '/admin/messages',
      icon: <MessageIcon />,
      badge: newMessagesCount
    },
    {
      text: 'Journaux d\'activité',
      path: '/admin/journaux-activite',
      icon: <HistoryIcon />
    }
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
      <CssBaseline />
      
      {/* AppBar */}
      <AppBar position="fixed" sx={{ bgcolor: 'primary.dark' }}>
        <Toolbar>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="h6" noWrap component="div" sx={{ mr: 2 }}>
                Administration FLM
              </Typography>
              
              <IconButton
                color="inherit"
                aria-label="toggle menu"
                edge="start"
                onClick={handleMenuToggle}
                sx={{ mr: 1 }}
              >
                {menuOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Box>
            
            <Tooltip title="Paramètres du compte">
              <IconButton onClick={handleMenuOpen}>
                <Avatar sx={{ bgcolor: 'secondary.main' }}>
                  {profile?.first_name ? profile.first_name[0] : <AccountCircleIcon />}
                </Avatar>
              </IconButton>
            </Tooltip>
            
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              slotProps={{
                paper: {
                  elevation: 0,
                  sx: {
                    overflow: 'visible',
                    filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                    mt: 1.5,
                    '& .MuiAvatar-root': {
                      width: 32,
                      height: 32,
                      ml: -0.5,
                      mr: 1,
                    },
                  }
                }
              }}
            >
              <MenuItem onClick={() => { handleMenuClose(); navigate('/profile'); }}>
                <ListItemIcon>
                  <AccountCircleIcon fontSize="small" />
                </ListItemIcon>
                Mon profil
              </MenuItem>
              <MenuItem onClick={() => { handleMenuClose(); navigate('/'); }}>
                <ListItemIcon>
                  <SettingsIcon fontSize="small" />
                </ListItemIcon>
                Accueil du site
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleSignOut}>
                <ListItemIcon>
                  <LogoutIcon fontSize="small" />
                </ListItemIcon>
                Déconnexion
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>
      
      {/* Menu horizontal sous le titre, aligné à gauche */}
      <Collapse in={menuOpen} timeout="auto" unmountOnExit>
        <Paper 
          elevation={4} 
          sx={{ 
            bgcolor: 'primary.main', 
            color: 'white',
            position: 'fixed',
            top: '64px', // Hauteur de la barre d'outils
            width: '100%',
            zIndex: 1100,
          }}
        >
          <Container maxWidth="xl" disableGutters sx={{ ml: 0, pl: 2 }}>
            <List sx={{ 
              display: 'flex', 
              flexDirection: { xs: 'column', sm: 'row' }, 
              p: 0,
              justifyContent: 'flex-start', // Alignement à gauche
            }}>
              {menuItems.map((item) => (
                <ListItem key={item.text} disablePadding sx={{ width: { xs: '100%', sm: 'auto' } }}>
                  <ListItemButton 
                    onClick={() => handleNavigate(item.path)}
                    selected={location.pathname === item.path}
                    sx={{
                      py: 1,
                      px: { sm: 2 },
                      '&.Mui-selected': {
                        bgcolor: 'rgba(255, 255, 255, 0.2)',
                        '&:hover': {
                          bgcolor: 'rgba(255, 255, 255, 0.3)',
                        },
                      },
                      '&:hover': {
                        bgcolor: 'rgba(255, 255, 255, 0.1)',
                      },
                    }}
                  >
                    <ListItemIcon sx={{ color: 'white', minWidth: { xs: 36, sm: 36 } }}>
                      {item.badge && item.badge > 0 ? (
                        <Badge badgeContent={item.badge} color="error">
                          {item.icon}
                        </Badge>
                      ) : (
                        item.icon
                      )}
                    </ListItemIcon>
                    <ListItemText 
                      primary={item.text} 
                      primaryTypographyProps={{ 
                        variant: 'body2',
                        noWrap: true,
                        fontSize: '0.8rem'
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
              
              <ListItem disablePadding sx={{ width: { xs: '100%', sm: 'auto' } }}>
                <ListItemButton 
                  onClick={handleSignOut}
                  sx={{ 
                    py: 1,
                    px: { sm: 2 },
                  }}
                >
                  <ListItemIcon sx={{ color: 'white', minWidth: { xs: 36, sm: 36 } }}>
                    <LogoutIcon />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Déconnexion" 
                    primaryTypographyProps={{ 
                      variant: 'body2',
                      fontSize: '0.8rem'
                    }}
                  />
                </ListItemButton>
              </ListItem>
            </List>
          </Container>
        </Paper>
      </Collapse>
      
      {/* Contenu principal */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          padding: 3,
          width: '100%',
          mt: menuOpen ? { xs: 13, sm: 12 } : 8, // Espace pour la barre d'outils + menu
          transition: theme.transitions.create(['margin-top'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.standard,
          }),
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};

export default AdminLayout;