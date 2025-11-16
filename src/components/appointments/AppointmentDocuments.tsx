import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Checkbox,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Alert,
  CircularProgress,
  Tooltip
} from '@mui/material';
import {
  Upload as UploadIcon,
  PictureAsPdf as PdfIcon,
  AudioFile as AudioIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import {
  AppointmentDocument,
  getAppointmentDocuments,
  uploadAppointmentDocument,
  updateAppointmentDocument,
  deleteAppointmentDocument,
  downloadDocument,
  getDocumentUrl,
  getSignedDocumentUrl,
  getDocumentBlob
} from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import { PDFThumbnail } from './PDFThumbnail';
import { PDFViewer } from './PDFViewer';
import { AudioPlayer } from './AudioPlayer';

interface AppointmentDocumentsProps {
  appointmentId: string;
  practitionerId: string;
  canUpload: boolean; // true si admin ou consultant du RDV
}

export const AppointmentDocuments: React.FC<AppointmentDocumentsProps> = ({
  appointmentId,
  practitionerId,
  canUpload
}) => {
  const { profile } = useAuth();
  const [documents, setDocuments] = useState<AppointmentDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<AppointmentDocument | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // États pour les viewers
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [audioPlayerOpen, setAudioPlayerOpen] = useState(false);
  const [viewerDocument, setViewerDocument] = useState<AppointmentDocument | null>(null);
  const [documentUrls, setDocumentUrls] = useState<Record<string, string>>({});

  // Upload form state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [visibleToClient, setVisibleToClient] = useState(true);
  const [visibleToConsultant, setVisibleToConsultant] = useState(true);

  // Edit form state
  const [editDescription, setEditDescription] = useState('');
  const [editVisibleToClient, setEditVisibleToClient] = useState(true);
  const [editVisibleToConsultant, setEditVisibleToConsultant] = useState(true);

  useEffect(() => {
    loadDocuments();

    // Nettoyage : révoquer les blob URLs quand le composant se démonte
    return () => {
      Object.values(documentUrls).forEach(url => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [appointmentId]);

  const loadDocuments = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await getAppointmentDocuments(appointmentId);
      if (error) throw error;
      setDocuments(data || []);

      // Charger les URLs blob pour chaque document (meilleure compatibilité avec react-pdf)
      if (data && data.length > 0) {
        const urls: Record<string, string> = {};
        for (const doc of data) {
          try {
            console.log('[AppointmentDocuments] Chargement blob pour:', doc.file_name, 'path:', doc.file_path);

            // Méthode 1 : Télécharger le fichier en tant que blob (évite les problèmes CORS)
            const blobUrl = await getDocumentBlob(doc.file_path);

            if (blobUrl) {
              console.log('[AppointmentDocuments] Blob URL créée:', blobUrl);
              urls[doc.id] = blobUrl;
            } else {
              // Méthode 2 : URL signée comme fallback
              console.log('[AppointmentDocuments] Tentative avec URL signée...');
              const signedUrl = await getSignedDocumentUrl(doc.file_path);
              console.log('[AppointmentDocuments] URL signée générée:', signedUrl);
              urls[doc.id] = signedUrl;
            }
          } catch (err) {
            console.error('[AppointmentDocuments] Erreur lors du chargement de l\'URL pour', doc.file_name, err);
            // Méthode 3 : URL publique en dernier recours
            const publicUrl = getDocumentUrl(doc.file_path);
            console.log('[AppointmentDocuments] Fallback URL publique:', publicUrl);
            urls[doc.id] = publicUrl;
          }
        }
        console.log('[AppointmentDocuments] Toutes les URLs chargées:', urls);
        setDocumentUrls(urls);
      }
    } catch (err: any) {
      console.error('Erreur lors du chargement des documents:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (!['pdf', 'mp3', 'mp4'].includes(extension || '')) {
        setError('Type de fichier non supporté. Seuls PDF, MP3 et MP4 sont acceptés.');
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Veuillez sélectionner un fichier');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const { data, error } = await uploadAppointmentDocument(
        appointmentId,
        selectedFile,
        visibleToClient,
        visibleToConsultant,
        description
      );

      if (error) throw error;

      // Recharger la liste
      await loadDocuments();

      // Réinitialiser le formulaire
      setSelectedFile(null);
      setDescription('');
      setVisibleToClient(true);
      setVisibleToConsultant(true);
      setUploadDialogOpen(false);
    } catch (err: any) {
      console.error('Erreur lors de l\'upload:', err);
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (document: AppointmentDocument) => {
    setSelectedDocument(document);
    setEditDescription(document.description || '');
    setEditVisibleToClient(document.visible_to_client);
    setEditVisibleToConsultant(document.visible_to_consultant);
    setEditDialogOpen(true);
  };

  const handleUpdateDocument = async () => {
    if (!selectedDocument) return;

    setUploading(true);
    setError(null);

    try {
      const { error } = await updateAppointmentDocument(selectedDocument.id, {
        description: editDescription,
        visible_to_client: editVisibleToClient,
        visible_to_consultant: editVisibleToConsultant
      });

      if (error) throw error;

      await loadDocuments();
      setEditDialogOpen(false);
    } catch (err: any) {
      console.error('Erreur lors de la mise à jour:', err);
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (document: AppointmentDocument) => {
    try {
      const { data, error } = await downloadDocument(document.file_path);
      if (error) throw error;

      if (data) {
        const url = window.URL.createObjectURL(data);
        const link = window.document.createElement('a');
        link.href = url;
        link.download = document.file_name;
        link.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (err: any) {
      console.error('Erreur lors du téléchargement:', err);
      setError(err.message);
    }
  };

  const handleDelete = async (documentId: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) {
      return;
    }

    try {
      const { error } = await deleteAppointmentDocument(documentId);
      if (error) throw error;
      await loadDocuments();
    } catch (err: any) {
      console.error('Erreur lors de la suppression:', err);
      setError(err.message);
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType === 'pdf') return <PdfIcon />;
    return <AudioIcon />;
  };

  const getFileTypeLabel = (fileType: string) => {
    if (fileType === 'pdf') return 'Données du RDV';
    return 'Audio du RDV';
  };

  const canEditDocument = (document: AppointmentDocument) => {
    if (!profile) return false;

    // Admin peut tout modifier
    if (profile.user_type === 'admin') return true;

    // Consultant peut modifier ses propres documents
    if (profile.user_type === 'intervenant') {
      return document.uploaded_by === profile.id;
    }

    return false;
  };

  const handleOpenPDF = (document: AppointmentDocument) => {
    setViewerDocument(document);
    setPdfViewerOpen(true);
  };

  const handleOpenAudio = (document: AppointmentDocument) => {
    setViewerDocument(document);
    setAudioPlayerOpen(true);
  };

  const handleClosePDF = () => {
    setPdfViewerOpen(false);
    setViewerDocument(null);
  };

  const handleCloseAudio = () => {
    setAudioPlayerOpen(false);
    setViewerDocument(null);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Documents du rendez-vous</Typography>
        {canUpload && (
          <Button
            variant="contained"
            startIcon={<UploadIcon />}
            onClick={() => setUploadDialogOpen(true)}
          >
            Ajouter un document
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {documents.length === 0 ? (
        <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
          Aucun document disponible
        </Typography>
      ) : (
        <List>
          {documents.map((document) => (
            <Card key={document.id} sx={{ mb: 2 }}>
              <CardContent>
                <Box display="flex" alignItems="flex-start" gap={2}>
                  {/* Aperçu PDF ou Icône */}
                  {document.file_type === 'pdf' ? (
                    <Box
                      sx={{
                        flexShrink: 0,
                        cursor: 'pointer',
                        transition: 'transform 0.2s',
                        '&:hover': {
                          transform: 'scale(1.05)',
                          boxShadow: 3
                        }
                      }}
                      onClick={() => handleOpenPDF(document)}
                      title="Cliquez pour ouvrir le PDF"
                    >
                      <PDFThumbnail
                        url={documentUrls[document.id] || ''}
                        width={120}
                        height={160}
                      />
                    </Box>
                  ) : (
                    <Box
                      sx={{
                        p: 2,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        borderRadius: 1,
                        '&:hover': {
                          backgroundColor: 'action.hover',
                          transform: 'scale(1.1)'
                        }
                      }}
                      onClick={() => handleOpenAudio(document)}
                      title="Cliquez pour lire l'audio"
                    >
                      {getFileIcon(document.file_type)}
                    </Box>
                  )}

                  {/* Informations du document */}
                  <Box flex={1}>
                    <Typography variant="subtitle1" fontWeight="medium">
                      {document.file_name}
                    </Typography>
                    {document.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {document.description}
                      </Typography>
                    )}
                    <Box display="flex" gap={1} mt={1.5} flexWrap="wrap">
                      <Chip
                        size="small"
                        label={getFileTypeLabel(document.file_type)}
                        color="primary"
                        variant="outlined"
                      />
                      <Chip
                        size="small"
                        icon={document.visible_to_client ? <VisibilityIcon /> : <VisibilityOffIcon />}
                        label={`Client: ${document.visible_to_client ? 'Visible' : 'Masqué'}`}
                        color={document.visible_to_client ? 'success' : 'default'}
                      />
                      <Chip
                        size="small"
                        icon={document.visible_to_consultant ? <VisibilityIcon /> : <VisibilityOffIcon />}
                        label={`Consultant: ${document.visible_to_consultant ? 'Visible' : 'Masqué'}`}
                        color={document.visible_to_consultant ? 'success' : 'default'}
                      />
                    </Box>
                    {document.file_size && (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        Taille: {(document.file_size / 1024 / 1024).toFixed(2)} Mo
                      </Typography>
                    )}
                  </Box>

                  {/* Actions */}
                  <Box display="flex" flexDirection="column" gap={1}>
                    <Tooltip title="Télécharger">
                      <IconButton onClick={() => handleDownload(document)} color="primary" size="small">
                        <DownloadIcon />
                      </IconButton>
                    </Tooltip>
                    {canEditDocument(document) && (
                      <>
                        <Tooltip title="Modifier">
                          <IconButton onClick={() => handleEdit(document)} color="primary" size="small">
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Supprimer">
                          <IconButton onClick={() => handleDelete(document.id)} color="error" size="small">
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </List>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onClose={() => setUploadDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Ajouter un document</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <input
              accept=".pdf,.mp3,.mp4"
              style={{ display: 'none' }}
              id="file-upload"
              type="file"
              onChange={handleFileSelect}
            />
            <label htmlFor="file-upload">
              <Button variant="outlined" component="span" fullWidth>
                {selectedFile ? selectedFile.name : 'Sélectionner un fichier (PDF, MP3, MP4)'}
              </Button>
            </label>

            <TextField
              label="Description (optionnelle)"
              multiline
              rows={3}
              fullWidth
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              sx={{ mt: 2 }}
            />

            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Options de visibilité
              </Typography>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={visibleToClient}
                    onChange={(e) => setVisibleToClient(e.target.checked)}
                  />
                }
                label="Visible par le client"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={visibleToConsultant}
                    onChange={(e) => setVisibleToConsultant(e.target.checked)}
                  />
                }
                label="Visible par le consultant"
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialogOpen(false)}>Annuler</Button>
          <Button
            onClick={handleUpload}
            variant="contained"
            disabled={!selectedFile || uploading}
            startIcon={uploading ? <CircularProgress size={20} /> : <UploadIcon />}
          >
            Envoyer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Modifier le document</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              label="Description"
              multiline
              rows={3}
              fullWidth
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
            />

            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Options de visibilité
              </Typography>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={editVisibleToClient}
                    onChange={(e) => setEditVisibleToClient(e.target.checked)}
                  />
                }
                label="Visible par le client"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={editVisibleToConsultant}
                    onChange={(e) => setEditVisibleToConsultant(e.target.checked)}
                  />
                }
                label="Visible par le consultant"
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Annuler</Button>
          <Button
            onClick={handleUpdateDocument}
            variant="contained"
            disabled={uploading}
          >
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>

      {/* PDF Viewer Dialog */}
      {viewerDocument && viewerDocument.file_type === 'pdf' && (
        <PDFViewer
          open={pdfViewerOpen}
          onClose={handleClosePDF}
          url={documentUrls[viewerDocument.id] || ''}
          fileName={viewerDocument.file_name}
          onDownload={() => handleDownload(viewerDocument)}
        />
      )}

      {/* Audio Player Dialog */}
      {viewerDocument && (viewerDocument.file_type === 'mp3' || viewerDocument.file_type === 'mp4') && (
        <AudioPlayer
          open={audioPlayerOpen}
          onClose={handleCloseAudio}
          url={documentUrls[viewerDocument.id] || ''}
          fileName={viewerDocument.file_name}
          fileType={viewerDocument.file_type}
          onDownload={() => handleDownload(viewerDocument)}
        />
      )}
    </Box>
  );
};
