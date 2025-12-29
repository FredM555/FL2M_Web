import { Box } from '@mui/material';
import { useEffect, useState } from 'react';

interface LoadingScreenProps {
  message?: string;
}

const LoadingScreen = ({ message }: LoadingScreenProps) => {
  const numerologyNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        if (prev >= numerologyNumbers.length - 1) {
          setIsComplete(true);
          return prev;
        }
        return prev + 1;
      });
    }, 200); // Accéléré de 300ms à 200ms

    return () => clearInterval(interval);
  }, []);

  // Calculer la position de chaque nombre en cercle complet
  const getCirclePosition = (index: number, total: number) => {
    const angle = (index / total) * 2 * Math.PI - Math.PI / 2; // Commence en haut
    const radius = 110; // Rayon du cercle
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    return { x, y };
  };

  // Calculer la couleur pour chaque nombre (dégradé de clair à foncé)
  const getNumberColor = (index: number, total: number) => {
    const ratio = index / (total - 1);
    // Interpolation entre #FFD700 (255, 215, 0) et #FFA500 (255, 165, 0)
    const r = 255;
    const g = Math.round(215 - ratio * (215 - 165));
    const b = 0;
    return `rgb(${r}, ${g}, ${b})`;
  };

  // Calculer l'opacité du logo
  const logoOpacity = currentIndex / (numerologyNumbers.length - 1);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        width: '100vw',
        maxWidth: '100%',
        margin: 0,
        padding: 0,
        backgroundColor: '#ffffff',
      }}
    >
      {/* Conteneur pour le cercle */}
      <Box
        sx={{
          position: 'relative',
          width: { xs: 280, sm: 320, md: 360 },
          height: { xs: 280, sm: 320, md: 360 },
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {/* Logo FL²M au centre avec opacité progressive */}
        <Box
          component="img"
          src="/logo-flm2.png"
          alt="FL²M Logo"
          sx={{
            position: 'absolute',
            width: { xs: 80, sm: 100, md: 120 },
            height: { xs: 80, sm: 100, md: 120 },
            opacity: 0.3 + logoOpacity * 0.7, // De 0.3 à 1.0
            transition: 'opacity 0.2s ease',
            animation: 'pulse 2s ease-in-out infinite',
            '@keyframes pulse': {
              '0%, 100%': {
                transform: 'scale(1)',
              },
              '50%': {
                transform: 'scale(1.05)',
              },
            },
          }}
        />

        {/* Nombres en cercle sans fond */}
        {numerologyNumbers.map((num, index) => {
          const pos = getCirclePosition(index, numerologyNumbers.length);
          const color = getNumberColor(index, numerologyNumbers.length);
          return (
            <Box
              key={num}
              sx={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px)) ${
                  index === currentIndex ? 'scale(1.3)' : 'scale(1)'
                }`,
                fontSize: { xs: 18, sm: 20, md: 22 },
                fontWeight: 'bold',
                transition: 'all 0.2s ease',
                color: index <= currentIndex ? color : '#e0e0e0',
                textShadow:
                  index === currentIndex ? `0 0 10px ${color}` : 'none',
              }}
            >
              {num}
            </Box>
          );
        })}
      </Box>

      {/* Message optionnel */}
      {message && (
        <Box
          sx={{
            marginTop: 3,
            color: '#666666',
            fontSize: { xs: 14, sm: 16 },
            fontWeight: 300,
            textAlign: 'center',
          }}
        >
          {message}
        </Box>
      )}
    </Box>
  );
};

export default LoadingScreen;
