// src/components/SacredGeometryBackground.tsx
import React from 'react';
import { Box } from '@mui/material';
import { keyframes } from '@mui/system';

// Animation de flottement pour les particules
const float = keyframes`
  0%, 100% {
    transform: translateY(0px) translateX(0px);
    opacity: 0.3;
  }
  25% {
    transform: translateY(-20px) translateX(10px);
    opacity: 0.5;
  }
  50% {
    transform: translateY(-10px) translateX(-10px);
    opacity: 0.4;
  }
  75% {
    transform: translateY(-30px) translateX(5px);
    opacity: 0.6;
  }
`;

const pulse = keyframes`
  0%, 100% {
    opacity: 0.2;
  }
  50% {
    opacity: 0.4;
  }
`;

const shimmer = keyframes`
  0% {
    opacity: 0.05;
  }
  50% {
    opacity: 0.15;
  }
  100% {
    opacity: 0.05;
  }
`;

const rotate = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

interface SacredGeometryBackgroundProps {
  theme?: 'particuliers' | 'professionnels' | 'sportifs';
}

const SacredGeometryBackground: React.FC<SacredGeometryBackgroundProps> = ({
  theme = 'particuliers'
}) => {
  // Couleurs selon le thème
  const colors = {
    particuliers: {
      primary: '#FFD700',
      secondary: '#FFA500',
      particles: 'rgba(255, 215, 0, 0.4)',
    },
    professionnels: {
      primary: '#4169E1',
      secondary: '#6495ED',
      particles: 'rgba(100, 149, 237, 0.4)',
    },
    sportifs: {
      primary: '#11998e',
      secondary: '#38ef7d',
      particles: 'rgba(17, 153, 142, 0.4)',
    },
  };

  const themeColors = colors[theme];

  // Nombres sacrés en numérologie
  const sacredNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22, 33];

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      {/* Motif de géométrie sacrée - Fleur de vie stylisée */}
      <svg
        width="100%"
        height="100%"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          opacity: 0.06,
        }}
      >
        <defs>
          <pattern
            id={`sacred-pattern-${theme}`}
            x="0"
            y="0"
            width="200"
            height="200"
            patternUnits="userSpaceOnUse"
          >
            {/* Cercle central */}
            <circle cx="100" cy="100" r="30" fill="none" stroke={themeColors.primary} strokeWidth="1" />

            {/* 6 cercles autour formant une fleur */}
            <circle cx="100" cy="70" r="30" fill="none" stroke={themeColors.primary} strokeWidth="1" />
            <circle cx="126" cy="85" r="30" fill="none" stroke={themeColors.primary} strokeWidth="1" />
            <circle cx="126" cy="115" r="30" fill="none" stroke={themeColors.primary} strokeWidth="1" />
            <circle cx="100" cy="130" r="30" fill="none" stroke={themeColors.primary} strokeWidth="1" />
            <circle cx="74" cy="115" r="30" fill="none" stroke={themeColors.primary} strokeWidth="1" />
            <circle cx="74" cy="85" r="30" fill="none" stroke={themeColors.primary} strokeWidth="1" />

            {/* Lignes connectant les points (géométrie) */}
            <line x1="100" y1="70" x2="126" y2="85" stroke={themeColors.secondary} strokeWidth="0.5" opacity="0.25" />
            <line x1="126" y1="85" x2="126" y2="115" stroke={themeColors.secondary} strokeWidth="0.5" opacity="0.25" />
            <line x1="126" y1="115" x2="100" y2="130" stroke={themeColors.secondary} strokeWidth="0.5" opacity="0.25" />
            <line x1="100" y1="130" x2="74" y2="115" stroke={themeColors.secondary} strokeWidth="0.5" opacity="0.25" />
            <line x1="74" y1="115" x2="74" y2="85" stroke={themeColors.secondary} strokeWidth="0.5" opacity="0.25" />
            <line x1="74" y1="85" x2="100" y2="70" stroke={themeColors.secondary} strokeWidth="0.5" opacity="0.25" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#sacred-pattern-${theme})`} />
      </svg>

      {/* Grille numérique subtile - style matrice */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            linear-gradient(90deg, ${themeColors.primary}08 1px, transparent 1px),
            linear-gradient(0deg, ${themeColors.primary}08 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          opacity: 0.4,
        }}
      />

      {/* Nombres numériques flottants - très discrets */}
      {sacredNumbers.map((num, i) => (
        <Box
          key={`num-${i}`}
          sx={{
            position: 'absolute',
            fontSize: `${Math.random() * 20 + 30}px`,
            fontFamily: '"Georgia", serif',
            fontWeight: 300,
            color: themeColors.primary,
            opacity: 0,
            top: `${(i * 13 + Math.random() * 10)}%`,
            left: `${(i * 8 + Math.random() * 15)}%`,
            animation: `${shimmer} ${Math.random() * 6 + 8}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 5}s`,
          }}
        >
          {num}
        </Box>
      ))}

      {/* Cercles concentriques - style onde */}
      <Box
        sx={{
          position: 'absolute',
          top: '15%',
          left: '10%',
          width: '200px',
          height: '200px',
          borderRadius: '50%',
          border: `1px solid ${themeColors.primary}`,
          opacity: 0.1,
          animation: `${pulse} 6s ease-in-out infinite`,
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          top: '60%',
          right: '15%',
          width: '250px',
          height: '250px',
          borderRadius: '50%',
          border: `1px solid ${themeColors.secondary}`,
          opacity: 0.08,
          animation: `${pulse} 8s ease-in-out infinite`,
          animationDelay: '2s',
        }}
      />

      {/* Particules lumineuses réduites et plus discrètes */}
      {[...Array(8)].map((_, i) => (
        <Box
          key={`particle-${i}`}
          sx={{
            position: 'absolute',
            width: `${Math.random() * 3 + 1}px`,
            height: `${Math.random() * 3 + 1}px`,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${themeColors.particles}, transparent)`,
            boxShadow: `0 0 ${Math.random() * 8 + 3}px ${themeColors.particles}`,
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            animation: `${float} ${Math.random() * 10 + 8}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 6}s`,
          }}
        />
      ))}

      {/* Symbole de l'infini discret */}
      <Box
        sx={{
          position: 'absolute',
          top: '30%',
          right: '20%',
          fontSize: '120px',
          color: themeColors.primary,
          opacity: 0.04,
          fontFamily: 'Arial, sans-serif',
          fontWeight: 100,
          animation: `${rotate} 120s linear infinite`,
        }}
      >
        ∞
      </Box>

      {/* Effet de lumière radiale ultra-subtile */}
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '500px',
          height: '500px',
          transform: 'translate(-50%, -50%)',
          background: `radial-gradient(circle, ${themeColors.particles}, transparent 70%)`,
          opacity: 0.08,
          animation: `${pulse} 10s ease-in-out infinite`,
        }}
      />
    </Box>
  );
};

export default SacredGeometryBackground;
