// src/components/admin/AdminSidebarMenu.tsx
import React from 'react';
import { 
  Box, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText, 
  ListItemButton,
  Divider,
  Badge
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import EventIcon from '@mui/icons-material/Event';
import MessageIcon from '@mui/icons-material/Message';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import CategoryIcon from '@mui/icons-material/Category';
import { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';

interface MenuItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  count?: number;
}

const AdminSidebarMenu: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
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
  
  // Liste des éléments du menu
  const menuItems: MenuItem[] = [
    {
      path: '/admin',
      label: 'Tableau de bord',
      icon: <DashboardIcon />
    },
    {
      path: '/admin/utilisateurs',
      label: 'Utilisateurs',
      icon: <PeopleIcon />
    },
    {
      path: '/admin/intervenants',
      label: 'Intervenants',
      icon: <MedicalServicesIcon />
    },
    {
      path: '/admin/prestations',
      label: 'Prestations',
      icon: <CategoryIcon />
    },
    {
      path: '/admin/rendez-vous',
      label: 'Rendez-vous',
      icon: <EventIcon />
    },
    {
      path: '/admin/messages',
      label: 'Messages',
      icon: <MessageIcon />,
      count: newMessagesCount
    }
  ];
  
  // Vérifier si un élément de menu est actif
  const isActive = (path: string) => {
    if (path === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(path);
  };
  
  return (
    <Box sx={{ width: '100%' }}>
      <List component="nav">
        {menuItems.map((item) => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              selected={isActive(item.path)}
              onClick={() => navigate(item.path)}
              sx={{
                borderRadius: 1,
                mx: 1,
                mb: 0.5,
                '&.Mui-selected': {
                  backgroundColor: 'primary.light',
                  '&:hover': {
                    backgroundColor: 'primary.light',
                  },
                },
              }}
            >
              <ListItemIcon>
                {item.count && item.count > 0 ? (
                  <Badge badgeContent={item.count} color="error">
                    {item.icon}
                  </Badge>
                ) : (
                  item.icon
                )}
              </ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Divider />
    </Box>
  );
};

export default AdminSidebarMenu;