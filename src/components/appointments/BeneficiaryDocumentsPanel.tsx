// src/components/appointments/BeneficiaryDocumentsPanel.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  CircularProgress,
  Alert,
  IconButton,
  Chip,
  Switch,
  FormControlLabel,
  TextField,
  LinearProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import DescriptionIcon from '@mui/icons-material/Description';
import {
  getBeneficiaryDocuments,
  createBeneficiaryDocument,
  updateBeneficiaryDocument,
  deleteBeneficiaryDocument
} from '../../services/beneficiaries';
import type { BeneficiaryDocument, BeneficiaryDocumentType } from '../../types/beneficiary';
import { getDocumentTypeLabel } from '../../types/beneficiary';
import { logger } from '../../utils/logger';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '../../services/supabase';

interface BeneficiaryDocumentsPanelProps {
  beneficiaryId: string;
  appointmentId: string;
  practitionerId: string;
}

export const BeneficiaryDocumentsPanel: React.FC<BeneficiaryDocumentsPanelProps> = ({
  beneficiaryId,
  appointmentId,
  practitionerId
}) => {
  const [documents, setDocuments] = useState<BeneficiaryDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<BeneficiaryDocumentType>('autre');
  const [description, setDescription] = useState('');
  const [isVisibleToUser, setIsVisibleToUser] = useState(false); // Par défaut privé (false)

  useEffect(() => {
    loadDocuments();
  }, [beneficiaryId]);

  const loadDocuments = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: loadError } = await getBeneficiaryDocuments(beneficiaryId);
      if (loadError) throw loadError;

      setDocuments(data || []);
    } catch (err: any) {
      logger.error('Erreur lors du chargement des documents:', err);
      setError(err.message || 'Erreur lors du chargement des documents');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      // Générer un nom de fichier unique
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `beneficiaries/${beneficiaryId}/${fileName}`;

      // Upload vers Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        // Si le bucket n'existe pas, informer l'utilisateur
        if (uploadError.message.includes('not found')) {
          throw new Error('Le bucket de stockage n\'existe pas encore. Veuillez créer le bucket "beneficiary-documents" dans Supabase Storage.');
        }
        throw uploadError;
      }

      setUploadProgress(50);

      // Créer l'entrée dans la base de données
      const { data, error: createError } = await createBeneficiaryDocument({
        beneficiary_id: beneficiaryId,
        appointment_id: appointmentId,
        practitioner_id: practitionerId,
        document_type: documentType,
        file_name: selectedFile.name,
        file_path: filePath,
        file_size: selectedFile.size,
        file_type: selectedFile.type,
        description: description.trim() || undefined,
        is_visible_to_user: isVisibleToUser
      });

      if (createError) throw createError;

      setUploadProgress(100);

      // Ajouter le nouveau document à la liste
      if (data) {
        setDocuments(prev => [data, ...prev]);
      }

      // Réinitialiser le formulaire
      setSelectedFile(null);
      setDocumentType('autre');
      setDescription('');
      setIsVisibleToUser(false);

      // Reset file input
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } catch (err: any) {
      logger.error('Erreur lors de l\'upload du document:', err);
      setError(err.message || 'Erreur lors de l\'upload du document');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDownload = async (document: BeneficiaryDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(document.file_path);

      if (error) throw error;

      // Créer un lien de téléchargement
      const url = URL.createObjectURL(data);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = document.file_name;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      logger.error('Erreur lors du téléchargement:', err);
      setError(err.message || 'Erreur lors du téléchargement');
    }
  };

  const handleToggleVisibility = async (document: BeneficiaryDocument) => {
    try {
      const { data, error: updateError } = await updateBeneficiaryDocument(
        document.id,
        { is_visible_to_user: !document.is_visible_to_user }
      );

      if (updateError) throw updateError;

      // Mettre à jour le document dans la liste
      if (data) {
        setDocuments(prev => prev.map(d => d.id === document.id ? data : d));
      }
    } catch (err: any) {
      logger.error('Erreur lors de la modification de la visibilité:', err);
      setError(err.message || 'Erreur lors de la modification de la visibilité');
    }
  };

  const handleDelete = async (document: BeneficiaryDocument) => {
    if (!confirm(`Voulez-vous vraiment supprimer le document "${document.file_name}" ?`)) return;

    setError(null);
    try {
      // Supprimer de la base de données
      const { success, error: deleteError } = await deleteBeneficiaryDocument(document.id);

      if (deleteError || !success) {
        throw deleteError || new Error('Erreur lors de la suppression');
      }

      // Supprimer du storage
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([document.file_path]);

      if (storageError) {
        logger.error('Erreur lors de la suppression du fichier du storage:', storageError);
        // On continue quand même car l'entrée DB est supprimée
      }

      // Retirer le document de la liste
      setDocuments(prev => prev.filter(d => d.id !== document.id));
    } catch (err: any) {
      logger.error('Erreur lors de la suppression du document:', err);
      setError(err.message || 'Erreur lors de la suppression du document');
    }
  };

  const formatFileSize = (bytes?: number | null): string => {
    if (!bytes) return 'Taille inconnue';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Formulaire d'upload */}
      <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
        <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
          Ajouter un document
        </Typography>

        <input
          accept="*/*"
          style={{ display: 'none' }}
          id="file-upload"
          type="file"
          onChange={handleFileSelect}
          disabled={uploading}
        />
        <label htmlFor="file-upload">
          <Button
            variant="outlined"
            component="span"
            startIcon={<UploadFileIcon />}
            disabled={uploading}
            sx={{ mb: 2 }}
          >
            Sélectionner un fichier
          </Button>
        </label>

        {selectedFile && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Fichier sélectionné : <strong>{selectedFile.name}</strong> ({formatFileSize(selectedFile.size)})
            </Typography>
          </Box>
        )}

        <FormControl fullWidth sx={{ mb: 2, bgcolor: 'white' }}>
          <InputLabel id="document-type-label">Type de document</InputLabel>
          <Select
            labelId="document-type-label"
            id="document-type"
            value={documentType}
            label="Type de document"
            onChange={(e) => setDocumentType(e.target.value as BeneficiaryDocumentType)}
            disabled={uploading}
          >
            <MenuItem value="arbre">Arbre de vie</MenuItem>
            <MenuItem value="arbre_detail">Arbre de vie détaillé</MenuItem>
            <MenuItem value="plan_de_vie">Plan de vie</MenuItem>
            <MenuItem value="analyse">Analyse numérologique</MenuItem>
            <MenuItem value="autre">Autre</MenuItem>
          </Select>
        </FormControl>

        <TextField
          fullWidth
          multiline
          rows={2}
          label="Description (optionnelle)"
          placeholder="Ex: Certificat médical, ordonnance, résultats d'analyses..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={uploading}
          sx={{ mb: 2, bgcolor: 'white' }}
        />

        <FormControlLabel
          control={
            <Switch
              checked={isVisibleToUser}
              onChange={(e) => setIsVisibleToUser(e.target.checked)}
              disabled={uploading}
            />
          }
          label={
            <Box>
              <Typography variant="body2">
                {isVisibleToUser ? 'Visible par le client' : 'Privé (intervenants uniquement)'}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                {isVisibleToUser
                  ? 'Le client pourra voir et télécharger ce document'
                  : 'Par défaut : visible uniquement par les intervenants'}
              </Typography>
            </Box>
          }
          sx={{ mb: 2 }}
        />

        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            startIcon={uploading ? <CircularProgress size={20} /> : <UploadFileIcon />}
            onClick={handleUpload}
            disabled={uploading || !selectedFile}
            sx={{
              background: 'linear-gradient(45deg, #345995, #1D3461)',
              '&:hover': {
                background: 'linear-gradient(45deg, #1D3461, #345995)',
              },
            }}
          >
            {uploading ? 'Upload en cours...' : 'Uploader'}
          </Button>
        </Box>

        {uploading && (
          <LinearProgress variant="determinate" value={uploadProgress} sx={{ mt: 2 }} />
        )}

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          Les documents visibles par le client seront accessibles dans leur espace personnel.
        </Typography>
      </Box>

      {/* Liste des documents */}
      {documents.length === 0 ? (
        <Alert severity="info">
          Aucun document pour ce bénéficiaire.
        </Alert>
      ) : (
        <Box>
          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
            Documents existants ({documents.length})
          </Typography>
          {documents.map((document) => {
            return (
              <Card key={document.id} sx={{ mb: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexGrow: 1 }}>
                      <DescriptionIcon color="primary" />
                      <Box>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                          {document.file_name}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 0.5 }}>
                          <Chip
                            label={getDocumentTypeLabel(document.document_type)}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                          <Typography variant="caption" color="text.secondary">
                            • {formatFileSize(document.file_size)}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Chip
                        icon={document.is_visible_to_user ? <VisibilityIcon /> : <VisibilityOffIcon />}
                        label={document.is_visible_to_user ? 'Visible client' : 'Privé'}
                        size="small"
                        color={document.is_visible_to_user ? 'success' : 'default'}
                      />
                    </Box>
                  </Box>

                  {document.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {document.description}
                    </Typography>
                  )}

                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    Ajouté le {format(parseISO(document.created_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                  </Typography>
                </CardContent>
                <CardActions sx={{ justifyContent: 'flex-end' }}>
                  <IconButton
                    size="small"
                    onClick={() => handleToggleVisibility(document)}
                    title={document.is_visible_to_user ? 'Rendre privé' : 'Rendre visible au client'}
                  >
                    {document.is_visible_to_user ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDownload(document)}
                    title="Télécharger"
                  >
                    <DownloadIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDelete(document)}
                    title="Supprimer"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </CardActions>
              </Card>
            );
          })}
        </Box>
      )}
    </Box>
  );
};
