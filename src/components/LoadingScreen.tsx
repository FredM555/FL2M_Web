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
          // Attendre 400ms avant de déclencher l'effet final
          setTimeout(() => {
            setIsComplete(true);
          }, 400);
          return prev;
        }
        return prev + 1;
      });
    }, 200);

    return () => clearInterval(interval);
  }, []);

  // Calculer la position de chaque nombre en cercle
  const getCirclePosition = (index: number, total: number) => {
    const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
    const radius = 110;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    return { x, y };
  };

  // Calculer l'opacité progressive du logo
  const logoOpacity = 0.3 + (currentIndex / (numerologyNumbers.length - 1)) * 0.7;

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
        background: 'linear-gradient(135deg, #0a1628 0%, #1D3461 50%, #345995 100%)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Particules mystiques en arrière-plan */}
      {[...Array(20)].map((_, i) => (
        <Box
          key={i}
          sx={{
            position: 'absolute',
            width: { xs: 2, sm: 3 },
            height: { xs: 2, sm: 3 },
            borderRadius: '50%',
            background: 'rgba(255, 215, 0, 0.6)',
            boxShadow: '0 0 10px rgba(255, 215, 0, 0.8)',
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 2}s`,
            '@keyframes float': {
              '0%, 100%': {
                transform: 'translateY(0px)',
                opacity: 0.3,
              },
              '50%': {
                transform: `translateY(-${20 + Math.random() * 20}px)`,
                opacity: 1,
              },
            },
          }}
        />
      ))}

      {/* Cercles concentriques mystiques */}
      {[1, 2, 3].map((ring) => (
        <Box
          key={ring}
          sx={{
            position: 'absolute',
            width: { xs: ring * 100, sm: ring * 120, md: ring * 140 },
            height: { xs: ring * 100, sm: ring * 120, md: ring * 140 },
            border: '1px solid rgba(255, 215, 0, 0.1)',
            borderRadius: '50%',
            animation: `rotate ${10 + ring * 5}s linear infinite, pulse ${2 + ring}s ease-in-out infinite`,
            '@keyframes rotate': {
              '0%': { transform: 'rotate(0deg)' },
              '100%': { transform: 'rotate(360deg)' },
            },
            '@keyframes pulse': {
              '0%, 100%': { opacity: 0.2 },
              '50%': { opacity: 0.4 },
            },
          }}
        />
      ))}

      {/* Conteneur principal */}
      <Box
        sx={{
          position: 'relative',
          width: { xs: 280, sm: 320, md: 360 },
          height: { xs: 280, sm: 320, md: 360 },
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10,
        }}
      >
        {/* Logo FL²M avec effet mystique */}
        <Box
          component="img"
          src="/logo-flm2.png"
          alt="FL²M Logo"
          sx={{
            position: 'absolute',
            width: { xs: 100, sm: 120, md: 140 },
            height: { xs: 100, sm: 120, md: 140 },
            filter: isComplete
              ? 'drop-shadow(0 0 60px rgba(255, 215, 0, 1)) drop-shadow(0 0 100px rgba(255, 215, 0, 0.8))'
              : 'drop-shadow(0 0 20px rgba(255, 215, 0, 0.6))',
            opacity: logoOpacity,
            transform: isComplete ? 'scale(1.15)' : 'scale(1)',
            transition: 'opacity 0.3s ease, filter 0.5s ease, transform 0.5s ease',
            animation: isComplete ? 'logoFinalGlow 1.5s ease-in-out infinite' : 'logoGlow 3s ease-in-out infinite',
            '@keyframes logoGlow': {
              '0%, 100%': {
                filter: 'drop-shadow(0 0 20px rgba(255, 215, 0, 0.6))',
                transform: 'scale(1)',
              },
              '50%': {
                filter: 'drop-shadow(0 0 40px rgba(255, 215, 0, 1))',
                transform: 'scale(1.05)',
              },
            },
            '@keyframes logoFinalGlow': {
              '0%, 100%': {
                filter: 'drop-shadow(0 0 60px rgba(255, 215, 0, 1)) drop-shadow(0 0 100px rgba(255, 215, 0, 0.8))',
              },
              '50%': {
                filter: 'drop-shadow(0 0 80px rgba(255, 215, 0, 1)) drop-shadow(0 0 120px rgba(255, 165, 0, 1))',
              },
            },
          }}
        />

        {/* Nombres de numérologie */}
        {numerologyNumbers.map((num, index) => {
          const pos = getCirclePosition(index, numerologyNumbers.length);
          const isActive = index <= currentIndex;
          const isCurrent = index === currentIndex && !isComplete;

          return (
            <Box
              key={num}
              sx={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px)) scale(${
                  isCurrent ? '1.4' : '1'
                })`,
                fontSize: { xs: 20, sm: 24, md: 28 },
                fontWeight: 'bold',
                transition: isComplete
                  ? 'opacity 1s ease, color 1s ease, text-shadow 1s ease, transform 0.3s ease'
                  : 'all 0.3s ease',
                color: isComplete
                  ? 'rgba(255, 215, 0, 0.3)'
                  : isActive
                  ? '#FFD700'
                  : 'rgba(255, 255, 255, 0.2)',
                textShadow: isComplete
                  ? '0 0 5px rgba(255, 215, 0, 0.2)'
                  : isCurrent
                  ? '0 0 15px #FFD700, 0 0 30px #FFA500'
                  : isActive
                  ? '0 0 10px rgba(255, 215, 0, 0.8)'
                  : 'none',
                opacity: isComplete ? 0.15 : isActive ? 1 : 0.3,
              }}
            >
              {num}
            </Box>
          );
        })}
      </Box>

      {/* Message avec style mystique */}
      {message && (
        <Box
          sx={{
            marginTop: 4,
            color: 'rgba(255, 255, 255, 0.8)',
            fontSize: { xs: 14, sm: 16 },
            fontWeight: 300,
            textAlign: 'center',
            textShadow: '0 0 10px rgba(255, 215, 0, 0.5)',
            letterSpacing: '0.1em',
            zIndex: 10,
          }}
        >
          {message}
        </Box>
      )}
    </Box>
  );
};

export default LoadingScreen;
