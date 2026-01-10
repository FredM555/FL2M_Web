// src/main.tsx
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './context/AuthContext';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from './theme'; // Import du nouveau thème
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

// Configuration de la barre de statut pour Android
const configureStatusBar = async () => {
  if (Capacitor.isNativePlatform()) {
    try {
      // La webview ne doit PAS passer sous la barre de statut
      await StatusBar.setOverlaysWebView({ overlay: false });

      // Définir le style (contenu clair sur fond sombre pour la barre de statut)
      await StatusBar.setStyle({ style: Style.Dark });

      // Définir la couleur de fond pour la barre de statut
      await StatusBar.setBackgroundColor({ color: '#1D3461' });
    } catch (error) {
      console.log('StatusBar configuration error:', error);
    }
  }
};

// Cacher le splash screen natif une fois que l'app est prête
const hideSplashScreen = async () => {
  try {
    await SplashScreen.hide();
  } catch (error) {
    // Le splash screen n'est pas disponible sur le web
    console.log('Splash screen not available');
  }
};

// Initialiser la configuration de la barre de statut
configureStatusBar();

ReactDOM.createRoot(document.getElementById('root')!).render(
  //<React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  //</React.StrictMode>,
);

// Cacher le splash screen après le rendu initial
setTimeout(hideSplashScreen, 1000);