// src/components/admin/ContractUploader.tsx
import React, { useState, useRef } from 'react';
import {
  Box,
  Button,
  Typography,
  LinearProgress,
  Alert,
  Paper,
  IconButton,
  Chip
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { supabase } from '../../services/supabase';
import { logger } from '../../utils/logger';

interface ContractUploaderProps {
  practitionerId: string;
  existingDocumentUrl?: string | null;
  onUploadSuccess: (url: string) => void;
  onUploadError?: (error: string) => void;
  disabled?: boolean;
}

const ContractUploader: React.FC<ContractUploaderProps> = ({
  practitionerId,
  existingDocumentUrl,
  onUploadSuccess,
  onUploadError,
  disabled = false
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<string | null>(existingDocumentUrl || null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Vérifier le type de fichier
    if (file.type !== 'application/pdf') {
      setError('Seuls les fichiers PDF sont acceptés');
      return;
    }

    // Vérifier la taille (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setError('Le fichier est trop volumineux (max 5MB)');
      return;
    }

    setError(null);
    setUploading(true);
    setUploadProgress(0);

    try {
      // Générer un nom de fichier unique
      const timestamp = new Date().getTime();
      const fileName = `contract_${practitionerId}_${timestamp}.pdf`;
      const filePath = `contracts/${fileName}`;

      // Upload vers Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from('practitioner-documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      // Récupérer l'URL publique
      const { data: urlData } = supabase.storage
        .from('practitioner-documents')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      setUploadedFile(publicUrl);
      onUploadSuccess(publicUrl);

      // Simuler la progression
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            return 100;
          }
          return prev + 10;
        });
      }, 100);

    } catch (err: any) {
      logger.error('Erreur lors de l\'upload:', err);
      const errorMessage = err.message || 'Erreur lors de l\'upload du fichier';
      setError(errorMessage);
      if (onUploadError) {
        onUploadError(errorMessage);
      }
    } finally {
      setUploading(false);
      setUploadProgress(0);
      // Réinitialiser l'input file
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleViewFile = () => {
    if (uploadedFile) {
      window.open(uploadedFile, '_blank');
    }
  };

  return (
    <Box>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
        disabled={disabled || uploading}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {!uploadedFile ? (
        <Paper
          sx={{
            p: 3,
            border: '2px dashed',
            borderColor: 'primary.main',
            borderRadius: 2,
            textAlign: 'center',
            backgroundColor: 'rgba(52, 89, 149, 0.05)',
            cursor: disabled || uploading ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s ease',
            '&:hover': disabled || uploading ? {} : {
              backgroundColor: 'rgba(52, 89, 149, 0.1)',
              borderColor: 'primary.dark'
            }
          }}
          onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
        >
          <CloudUploadIcon
            sx={{
              fontSize: 48,
              color: 'primary.main',
              mb: 2
            }}
          />
          <Typography variant="h6" gutterBottom>
            {uploading ? 'Upload en cours...' : 'Uploader le contrat PDF'}
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            {uploading
              ? 'Veuillez patienter pendant l\'upload'
              : 'Cliquez ici ou glissez-déposez un fichier PDF (max 5MB)'}
          </Typography>

          {!uploading && (
            <Button
              variant="contained"
              startIcon={<CloudUploadIcon />}
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              disabled={disabled}
              sx={{
                mt: 1,
                background: 'linear-gradient(45deg, #345995, #1D3461)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #1D3461, #345995)'
                }
              }}
            >
              Sélectionner un fichier
            </Button>
          )}

          {uploading && (
            <Box sx={{ mt: 2, px: 4 }}>
              <LinearProgress
                variant="determinate"
                value={uploadProgress}
                sx={{ height: 8, borderRadius: 4 }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                {uploadProgress}%
              </Typography>
            </Box>
          )}
        </Paper>
      ) : (
        <Paper
          sx={{
            p: 2,
            border: '2px solid',
            borderColor: 'success.main',
            borderRadius: 2,
            backgroundColor: 'rgba(102, 187, 106, 0.05)'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <InsertDriveFileIcon
                sx={{ fontSize: 40, color: 'success.main' }}
              />
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Contrat uploadé
                </Typography>
                <Chip
                  label="PDF"
                  size="small"
                  color="success"
                  sx={{ mt: 0.5 }}
                />
              </Box>
            </Box>
            <Box>
              <IconButton
                color="primary"
                onClick={handleViewFile}
                title="Voir le document"
              >
                <VisibilityIcon />
              </IconButton>
              <IconButton
                color="error"
                onClick={handleRemoveFile}
                disabled={disabled}
                title="Supprimer"
              >
                <DeleteIcon />
              </IconButton>
            </Box>
          </Box>
        </Paper>
      )}

      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 2 }}>
        💡 Le contrat signé sera accessible au intervenant depuis son espace personnel
      </Typography>
    </Box>
  );
};

export default ContractUploader;
