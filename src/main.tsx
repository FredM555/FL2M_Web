// src/main.tsx
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './context/AuthContext';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from './theme'; // Import du nouveau thème
import { SplashScreen } from '@capacitor/splash-screen';

// Cacher le splash screen natif une fois que l'app est prête
const hideSplashScreen = async () => {
  try {
    await SplashScreen.hide();
  } catch (error) {
    // Le splash screen n'est pas disponible sur le web
    console.log('Splash screen not available');
  }
};

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