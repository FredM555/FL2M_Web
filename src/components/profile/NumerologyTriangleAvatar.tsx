// src/components/profile/NumerologyTriangleAvatar.tsx
import React from 'react';
import { Box } from '@mui/material';

interface NumerologyTriangleAvatarProps {
  racine1?: number;
  racine2?: number;
  tronc?: number;
  dynamique_de_vie?: number;
  size?: number;
}

export const NumerologyTriangleAvatar: React.FC<NumerologyTriangleAvatarProps> = ({
  racine1,
  racine2,
  tronc,
  dynamique_de_vie,
  size = 120
}) => {
  console.log('[NumerologyTriangleAvatar] Props reçues:', { racine1, racine2, tronc, dynamique_de_vie, size });

  // Si aucune donnée de numérologie n'est disponible, ne rien afficher
  if (!racine1 && !racine2 && !tronc) {
    console.log('[NumerologyTriangleAvatar] Aucune donnée, retour null');
    return null;
  }

  // Taille de la police pour les racines
  const fontSize = size * 0.40032; // 0.3336 * 1.2 = 0.40032 (augmentation de 20% supplémentaire)
  // Taille du tronc : 5% plus grand que les racines
  const troncFontSize = fontSize * 1.05;
  const backgroundFontSize = size * 0.8; // Très grand pour la dynamique de vie en fond

  console.log('[NumerologyTriangleAvatar] Rendu:', { tronc, racine1, racine2, dynamique_de_vie });

  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #FFD700, #FFA500)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        border: '3px solid white',
        color: '#1D3461',
        fontWeight: 700,
        position: 'relative',
        padding: 1,
        overflow: 'hidden',
      }}
    >
      {/* Dynamique de vie en arrière-plan avec effet de relief */}
      {dynamique_de_vie !== undefined && (
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: `${backgroundFontSize}px`,
            fontWeight: 900,
            opacity: 0.25,
            color: '#1D3461',
            textShadow: '3px 3px 6px rgba(255, 255, 255, 0.6), -3px -3px 6px rgba(0, 0, 0, 0.2), 0 0 15px rgba(255, 255, 255, 0.4)',
            zIndex: 0,
          }}
        >
          {dynamique_de_vie}
        </Box>
      )}
      {/* Tronc en haut/centre - plein bleu foncé */}
      {tronc !== undefined && (
        <Box
          sx={{
            fontSize: `${troncFontSize}px`,
            position: 'absolute',
            top: '30%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1,
            fontWeight: 900,
            color: '#1D3461',
            textShadow: '0 0 10px rgba(255, 255, 255, 0.5), 0 0 20px rgba(255, 255, 255, 0.3)',
          }}
        >
          {tronc}
        </Box>
      )}

      {/* Container pour racine1 et racine2 en bas */}
      <Box
        sx={{
          position: 'absolute',
          bottom: '0%',
          width: '75%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 1,
        }}
      >
        {/* Racine1 à gauche */}
        {racine1 !== undefined && (
          <Box sx={{ fontSize: `${troncFontSize}px`, color: '#345995' }}>
            {racine1}
          </Box>
        )}

        {/* Racine2 à droite */}
        {racine2 !== undefined && (
          <Box sx={{ fontSize: `${troncFontSize}px`, color: '#345995' }}>
            {racine2}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default NumerologyTriangleAvatar;
