// src/components/layout/MobileBottomNav.tsx
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Paper, BottomNavigation, BottomNavigationAction, useTheme, useMediaQuery } from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import GroupIcon from '@mui/icons-material/Group';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import HomeIcon from '@mui/icons-material/Home';
import { useAuth } from '../../context/AuthContext';

const MobileBottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useAuth();

  // Ne pas afficher le bandeau si on n'est pas en mobile
  if (!isMobile) {
    return null;
  }

  // Déterminer quelle page est active
  const getValue = () => {
    if (location.pathname === '/') return 0;
    if (user && location.pathname.startsWith('/message-du-jour')) return 1;
    if (location.pathname === '/prendre-rendez-vous') return user ? 2 : 1;
    if (location.pathname.startsWith('/consultants')) return user ? 3 : 2;
    return -1;
  };

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    if (user) {
      // Navigation pour utilisateur connecté (4 boutons)
      switch (newValue) {
        case 0:
          navigate('/');
          break;
        case 1:
          navigate('/message-du-jour');
          break;
        case 2:
          navigate('/prendre-rendez-vous');
          break;
        case 3:
          navigate('/consultants');
          break;
      }
    } else {
      // Navigation pour utilisateur non connecté (3 boutons)
      switch (newValue) {
        case 0:
          navigate('/');
          break;
        case 1:
          navigate('/prendre-rendez-vous');
          break;
        case 2:
          navigate('/consultants');
          break;
      }
    }
  };

  return (
    <Paper
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        borderTop: '2px solid rgba(255, 215, 0, 0.3)',
        boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.1)',
      }}
      elevation={3}
    >
      <BottomNavigation
        value={getValue()}
        onChange={handleChange}
        showLabels={false}
        sx={{
          height: 65,
          '& .MuiBottomNavigationAction-root': {
            minWidth: 'auto',
            padding: '6px 12px',
          },
          '& .MuiBottomNavigationAction-root.Mui-selected': {
            color: '#FFA500',
          },
          '& .MuiBottomNavigationAction-root:not(.Mui-selected)': {
            color: 'rgba(0, 0, 0, 0.6)',
          },
          '& .MuiSvgIcon-root': {
            fontSize: '1.8rem',
          },
        }}
      >
        {/* Accueil - toujours affiché */}
        <BottomNavigationAction
          icon={<HomeIcon />}
          sx={{
            '&.Mui-selected': {
              '& .MuiSvgIcon-root': {
                color: '#FFD700',
              },
            },
          }}
        />

        {/* Message du jour - seulement si connecté */}
        {user && (
          <BottomNavigationAction
            icon={<AutoAwesomeIcon />}
            sx={{
              '&.Mui-selected': {
                '& .MuiSvgIcon-root': {
                  color: '#FFD700',
                },
              },
            }}
          />
        )}

        {/* Prendre RDV - toujours affiché */}
        <BottomNavigationAction
          icon={<CalendarMonthIcon />}
          sx={{
            '&.Mui-selected': {
              '& .MuiSvgIcon-root': {
                color: '#FFD700',
              },
            },
          }}
        />

        {/* Consultants - toujours affiché */}
        <BottomNavigationAction
          icon={<GroupIcon />}
          sx={{
            '&.Mui-selected': {
              '& .MuiSvgIcon-root': {
                color: '#FFD700',
              },
            },
          }}
        />
      </BottomNavigation>
    </Paper>
  );
};

export default MobileBottomNav;
