// src/components/profile/AvatarUpload.tsx
import React, { useState, useRef } from 'react';
import {
  Box,
  Avatar,
  IconButton,
  CircularProgress,
  Typography,
  Alert,
  Tooltip
} from '@mui/material';
import {
  PhotoCamera as PhotoCameraIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import { NumerologyTriangleAvatar } from './NumerologyTriangleAvatar';
import { logger } from '../../utils/logger';

interface AvatarUploadProps {
  currentAvatarUrl?: string;
  onUploadSuccess: (url: string) => void;
  onDelete: () => void;
  size?: number;
}

export const AvatarUpload: React.FC<AvatarUploadProps> = ({
  currentAvatarUrl,
  onUploadSuccess,
  onDelete,
  size = 120
}) => {
  const { user, profile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validation du fichier
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Format de fichier non supporté. Utilisez JPG, PNG ou WebP.');
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5 MB
    if (file.size > maxSize) {
      setError('La taille du fichier ne doit pas dépasser 5 MB.');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // Supprimer l'ancienne photo si elle existe
      if (currentAvatarUrl) {
        const oldPath = currentAvatarUrl.split('/').pop();
        if (oldPath) {
          await supabase.storage
            .from('avatars')
            .remove([`${user.id}/${oldPath}`]);
        }
      }

      // Générer un nom de fichier unique
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      // Upload du fichier
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Obtenir l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Mettre à jour le profil avec la nouvelle URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      onUploadSuccess(publicUrl);
    } catch (err: any) {
      logger.error('Erreur lors de l\'upload:', err);

      // Message d'erreur spécifique pour le bucket manquant
      if (err.message && err.message.includes('Bucket not found')) {
        setError('Le bucket de stockage n\'est pas configuré. Veuillez contacter l\'administrateur ou exécuter "node check_and_create_bucket.cjs"');
      } else {
        setError(err.message || 'Erreur lors de l\'upload de la photo');
      }
    } finally {
      setUploading(false);
      // Réinitialiser l'input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async () => {
    if (!user || !currentAvatarUrl) return;

    setUploading(true);
    setError(null);

    try {
      // Supprimer le fichier du storage
      const path = currentAvatarUrl.split('/').pop();
      if (path) {
        await supabase.storage
          .from('avatars')
          .remove([`${user.id}/${path}`]);
      }

      // Mettre à jour le profil
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', user.id);

      if (updateError) throw updateError;

      onDelete();
    } catch (err: any) {
      logger.error('Erreur lors de la suppression:', err);
      setError(err.message || 'Erreur lors de la suppression de la photo');
    } finally {
      setUploading(false);
    }
  };

  const getInitials = () => {
    if (profile?.first_name) {
      return profile.first_name[0].toUpperCase();
    }
    return '?';
  };

  // Vérifier si on a des données de numérologie
  const hasNumerologyData = profile?.racine1 || profile?.racine2 || profile?.tronc;

  return (
    <Box sx={{ position: 'relative', display: 'inline-block' }}>
      <Box sx={{ position: 'relative' }}>
        {currentAvatarUrl ? (
          <Avatar
            src={currentAvatarUrl}
            sx={{
              width: size,
              height: size,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              border: '3px solid white',
            }}
          />
        ) : hasNumerologyData ? (
          <NumerologyTriangleAvatar
            racine1={profile?.racine1}
            racine2={profile?.racine2}
            tronc={profile?.tronc}
            dynamique_de_vie={profile?.dynamique_de_vie}
            size={size}
          />
        ) : (
          <Avatar
            sx={{
              width: size,
              height: size,
              fontSize: `${size / 3}rem`,
              background: 'linear-gradient(135deg, #FFD700, #FFA500)',
              color: '#1D3461',
              fontWeight: 700,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              border: '3px solid white',
            }}
          >
            {getInitials()}
          </Avatar>
        )}

        {uploading && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              borderRadius: '50%',
            }}
          >
            <CircularProgress size={size / 3} sx={{ color: 'white' }} />
          </Box>
        )}
      </Box>

      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          display: 'flex',
          gap: 0.5,
        }}
      >
        <Tooltip title="Changer la photo">
          <IconButton
            onClick={handleFileSelect}
            disabled={uploading}
            sx={{
              background: 'linear-gradient(135deg, #FFD700, #FFA500)',
              color: '#1D3461',
              width: 36,
              height: 36,
              '&:hover': {
                background: 'linear-gradient(135deg, #FFA500, #FFD700)',
              },
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
            }}
          >
            <PhotoCameraIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        {currentAvatarUrl && (
          <Tooltip title="Supprimer la photo">
            <IconButton
              onClick={handleDelete}
              disabled={uploading}
              sx={{
                background: '#d32f2f',
                color: 'white',
                width: 36,
                height: 36,
                '&:hover': {
                  background: '#b71c1c',
                },
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
              }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {error && (
        <Alert severity="error" sx={{ mt: 2, maxWidth: 300 }}>
          {error}
        </Alert>
      )}

      <Typography
        variant="caption"
        sx={{
          display: 'block',
          textAlign: 'center',
          mt: 1,
          color: 'text.secondary',
          maxWidth: size + 40,
        }}
      >
        JPG, PNG ou WebP (max 5 MB)
      </Typography>
    </Box>
  );
};

export default AvatarUpload;
