// src/components/profile/UserAvatar.tsx
import React from 'react';
import { Avatar } from '@mui/material';
import { NumerologyTriangleAvatar } from './NumerologyTriangleAvatar';

interface UserAvatarProps {
  avatarUrl?: string | null;
  firstName?: string;
  lastName?: string;
  racine1?: number;
  racine2?: number;
  tronc?: number;
  dynamique_de_vie?: number;
  size?: number;
  sx?: any;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  avatarUrl,
  firstName,
  lastName,
  racine1,
  racine2,
  tronc,
  dynamique_de_vie,
  size = 40,
  sx = {}
}) => {
  const getInitials = () => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    if (firstName) {
      return firstName[0].toUpperCase();
    }
    return '?';
  };

  // Vérifier si on a des données de numérologie
  const hasNumerologyData = racine1 || racine2 || tronc;

  // Debug: afficher les valeurs
  console.log('[UserAvatar] Debug:', {
    avatarUrl,
    firstName,
    racine1,
    racine2,
    tronc,
    dynamique_de_vie,
    hasNumerologyData,
    size
  });

  // Si on a une photo, l'afficher
  if (avatarUrl) {
    console.log('[UserAvatar] Affichage photo');
    return (
      <Avatar
        src={avatarUrl}
        sx={{
          width: size,
          height: size,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          ...sx
        }}
      />
    );
  }

  // Si on a des données de numérologie, afficher le triangle
  if (hasNumerologyData) {
    console.log('[UserAvatar] Affichage triangle numérologie');
    return (
      <NumerologyTriangleAvatar
        racine1={racine1}
        racine2={racine2}
        tronc={tronc}
        dynamique_de_vie={dynamique_de_vie}
        size={size}
      />
    );
  }

  // Sinon, afficher les initiales
  return (
    <Avatar
      sx={{
        width: size,
        height: size,
        background: 'linear-gradient(135deg, #FFD700, #FFA500)',
        color: '#1D3461',
        fontWeight: 700,
        fontSize: size < 50 ? '1rem' : `${size / 3}px`,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        ...sx
      }}
    >
      {getInitials()}
    </Avatar>
  );
};

export default UserAvatar;
