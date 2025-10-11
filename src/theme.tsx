// src/theme.tsx
import { createTheme } from '@mui/material';

// Création du thème personnalisé avec des couleurs enrichies
const theme = createTheme({
  palette: {
    primary: {
      main: '#345995', // Bleu principal - partie supérieure du bandeau
      light: '#5278B3',
      dark: '#1D3461', // Bleu foncé - partie inférieure du bandeau
    },
    secondary: {
      main: '#E45C3A', // Orange/rouge pour les accents
      light: '#F67E5F',
      dark: '#C13B20',
    },
    background: {
      default: '#FAFAFA',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#333333',
      secondary: '#666666',
    },
    error: {
      main: '#D32F2F',
      light: '#EF5350',
      dark: '#C62828',
    },
    warning: {
      main: '#ED6A5A',
      light: '#F29A8E',
      dark: '#D43F30',
    },
    info: {
      main: '#73BFB8',
      light: '#97D2CC',
      dark: '#569B94',
    },
    success: {
      main: '#78BE20',
      light: '#9ADE4A',
      dark: '#568B17',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 600,
    },
    h2: {
      fontWeight: 600,
    },
    h3: {
      fontWeight: 600,
    },
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 500,
    },
    h6: {
      fontWeight: 500,
    },
    button: {
      textTransform: 'none', // Évite les majuscules automatiques sur les boutons
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)', // Ombre légère pour l'AppBar
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          borderRadius: '4px',
        },
        containedPrimary: {
          '&:hover': {
            boxShadow: '0 4px 8px rgba(52, 89, 149, 0.2)',
          },
        },
      },
      defaultProps: {
        disableElevation: true, // Désactive l'ombre par défaut pour un look plus plat
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
          borderRadius: 8,
        },
      },
    },
    MuiContainer: {
      styleOverrides: {
        root: {
          paddingLeft: '16px',
          paddingRight: '16px',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: '1px solid rgba(0, 0, 0, 0.08)',
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#345995',
          },
        },
      },
    },
  },
});

export default theme;