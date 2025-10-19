// src/components/NumerologyBackground.tsx
import React from 'react';
import { Box } from '@mui/material';

interface NumerologyBackgroundProps {
  variant?: 'light' | 'default' | 'footer';
}

const NumerologyBackground: React.FC<NumerologyBackgroundProps> = ({ variant = 'default' }) => {
  // Opacité adaptée selon le contexte : footer (fond sombre) nécessite plus de luminosité
  const opacity = variant === 'footer' ? 0.25 : variant === 'light' ? 0.08 : 0.12;

  // Nombres sacrés en numérologie - positionnés aléatoirement pour visibilité optimale
  const sacredNumbers = [
    // Positionnement aléatoire - tous les nombres répartis sur toute la page
    { num: 22, top: '4%', left: '10%', size: 105, color: '#FFD700' },
    { num: 5, top: '7%', right: '25%', size: 86, color: '#345995' },
    { num: 9, top: '11%', left: '55%', size: 95, color: '#FFA500' },
    { num: 1, top: '16%', right: '8%', size: 90, color: '#FFD700' },

    { num: 33, top: '22%', left: '30%', size: 108, color: '#345995' },
    { num: 7, top: '28%', right: '18%', size: 95, color: '#FFA500' },
    { num: 3, top: '34%', left: '12%', size: 88, color: '#FFD700' },
    { num: 11, top: '40%', right: '35%', size: 100, color: '#345995' },

    { num: 6, top: '48%', left: '45%', size: 90, color: '#FFA500' },
    { num: 2, top: '55%', right: '12%', size: 85, color: '#FFD700' },
    { num: 8, top: '62%', left: '20%', size: 92, color: '#345995' },
    { num: 4, top: '70%', right: '28%', size: 82, color: '#FFA500' },
  ];

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 0,
        pointerEvents: 'none',
      }}
    >
      {/* Grille numérique subtile */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            linear-gradient(90deg, rgba(255, 215, 0, 0.03) 1px, transparent 1px),
            linear-gradient(0deg, rgba(255, 215, 0, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
          opacity: 0.6,
        }}
      />

      {/* Nombres numériques flottants - tous les nombres sacrés */}
      {sacredNumbers.map((item, index) => (
        <Box
          key={`number-${index}`}
          sx={{
            position: 'absolute',
            top: item.top,
            ...(item.left ? { left: item.left } : { right: item.right }),
            fontSize: `${item.size}px`,
            fontFamily: '"Georgia", serif',
            fontWeight: 300,
            color: item.color,
            opacity: opacity,
          }}
        >
          {item.num}
        </Box>
      ))}

      {/* Cercles concentriques plus visibles */}
      <Box
        sx={{
          position: 'absolute',
          top: '25%',
          left: '20%',
          width: '300px',
          height: '300px',
          borderRadius: '50%',
          border: '1px solid rgba(255, 215, 0, 0.12)',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          top: '55%',
          right: '25%',
          width: '250px',
          height: '250px',
          borderRadius: '50%',
          border: '1px solid rgba(52, 89, 149, 0.1)',
        }}
      />

      {/* Symbole infini plus visible */}
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '45%',
          fontSize: '150px',
          color: '#FFD700',
          opacity: opacity * 0.8,
          fontFamily: 'Arial, sans-serif',
          fontWeight: 100,
        }}
      >
        ∞
      </Box>

      {/* Radial gradients plus intenses */}
      <Box
        sx={{
          position: 'absolute',
          top: '20%',
          left: '10%',
          width: '400px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(255, 215, 0, 0.06) 0%, transparent 60%)',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          top: '60%',
          right: '15%',
          width: '350px',
          height: '350px',
          background: 'radial-gradient(circle, rgba(52, 89, 149, 0.05) 0%, transparent 60%)',
        }}
      />
    </Box>
  );
};

export default NumerologyBackground;
