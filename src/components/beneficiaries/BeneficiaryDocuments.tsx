// src/components/beneficiaries/BeneficiaryDocuments.tsx
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
  List,
  Chip,
  Alert,
  CircularProgress,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText
} from '@mui/material';
import {
  Upload as UploadIcon,
  PictureAsPdf as PdfIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Public as PublicIcon,
  Lock as LockIcon
} from '@mui/icons-material';
import {
  BeneficiaryDocument,
  DocumentType,
  DOCUMENT_TYPE_LABELS,
  DEFAULT_VISIBILITY_BY_TYPE,
  getBeneficiaryDocuments,
  uploadBeneficiaryDocument,
  updateBeneficiaryDocument,
  deleteBeneficiaryDocument,
  downloadBeneficiaryDocument,
  getBeneficiaryDocumentBlob,
  getSignedBeneficiaryDocumentUrl,
  getBeneficiaryDocumentUrl
} from '../../services/beneficiaryDocuments';
import { useAuth } from '../../context/AuthContext';
import { PDFThumbnail } from '../appointments/PDFThumbnail';
import { PDFViewer } from '../appointments/PDFViewer';
import { logger } from '../../utils/logger';

interface BeneficiaryDocumentsProps {
  beneficiaryId: string;
  canEdit: boolean; // true si l'utilisateur peut modifier le bénéficiaire
}

export const BeneficiaryDocuments: React.FC<BeneficiaryDocumentsProps> = ({
  beneficiaryId,
  canEdit
}) => {
  const { profile } = useAuth();

  // Fonction pour formater le nom de l'uploader
  const getUploaderDisplayName = (uploaderProfile: any) => {
    if (!uploaderProfile) return 'Utilisateur inconnu';

    // Pour les intervenants et admins : afficher display_name + titre
    if (uploaderProfile.user_type === 'intervenant' || uploaderProfile.user_type === 'admin') {
      const displayName = uploaderProfile.display_name || `${uploaderProfile.first_name} ${uploaderProfile.last_name}`;
      const title = uploaderProfile.title;

      if (title) {
        return `${title} ${displayName}`;
      }
      return displayName;
    }

    // Pour les clients : afficher prénom nom
    return `${uploaderProfile.first_name} ${uploaderProfile.last_name}`;
  };

  const [documents, setDocuments] = useState<BeneficiaryDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<BeneficiaryDocument | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // États pour le viewer PDF
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [viewerDocument, setViewerDocument] = useState<BeneficiaryDocument | null>(null);
  const [documentUrls, setDocumentUrls] = useState<Record<string, string>>({});

  // Upload form state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [documentType, setDocumentType] = useState<DocumentType>('autre');
  const [visibility, setVisibility] = useState<'public' | 'private'>('private');

  // Edit form state
  const [editDescription, setEditDescription] = useState('');
  const [editDocumentType, setEditDocumentType] = useState<DocumentType>('autre');
  const [editVisibility, setEditVisibility] = useState<'public' | 'private'>('private');

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
  }, [beneficiaryId]);

  const loadDocuments = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await getBeneficiaryDocuments(beneficiaryId);
      if (error) throw error;

      // Filtrer pour n'afficher QUE les documents publics
      // Les documents privés sont accessibles uniquement dans la partie intervenant (rendez-vous)
      let filteredDocuments = data || [];
      filteredDocuments = filteredDocuments.filter(doc => doc.visibility === 'public');

      setDocuments(filteredDocuments);

      // Charger les URLs blob pour chaque document
      if (filteredDocuments && filteredDocuments.length > 0) {
        const urls: Record<string, string> = {};
        for (const doc of filteredDocuments) {
          try {
            logger.debug('[BeneficiaryDocuments] Chargement blob pour:', doc.file_name, 'path:', doc.file_path);

            // Méthode 1 : Télécharger le fichier en tant que blob
            const blobUrl = await getBeneficiaryDocumentBlob(doc.file_path);

            if (blobUrl) {
              logger.debug('[BeneficiaryDocuments] Blob URL créée:', blobUrl);
              urls[doc.id] = blobUrl;
            } else {
              // Méthode 2 : URL signée comme fallback
              logger.debug('[BeneficiaryDocuments] Tentative avec URL signée...');
              const signedUrl = await getSignedBeneficiaryDocumentUrl(doc.file_path);
              logger.debug('[BeneficiaryDocuments] URL signée générée:', signedUrl);
              urls[doc.id] = signedUrl;
            }
          } catch (err) {
            logger.error('[BeneficiaryDocuments] Erreur lors du chargement de l\'URL pour', doc.file_name, err);
            // Méthode 3 : URL publique en dernier recours
            const publicUrl = getBeneficiaryDocumentUrl(doc.file_path);
            logger.debug('[BeneficiaryDocuments] Fallback URL publique:', publicUrl);
            urls[doc.id] = publicUrl;
          }
        }
        logger.debug('[BeneficiaryDocuments] Toutes les URLs chargées:', urls);
        setDocumentUrls(urls);
      }
    } catch (err: any) {
      logger.error('Erreur lors du chargement des documents:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (extension !== 'pdf') {
        setError('Type de fichier non supporté. Seuls les PDF sont acceptés.');
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  };

  // Gérer le changement de type de document et ajuster la visibilité par défaut
  const handleDocumentTypeChange = (newType: DocumentType) => {
    setDocumentType(newType);
    // Ajuster automatiquement la visibilité selon le type
    setVisibility(DEFAULT_VISIBILITY_BY_TYPE[newType]);
  };

  // Gérer le changement de type de document en édition
  const handleEditDocumentTypeChange = (newType: DocumentType) => {
    setEditDocumentType(newType);
    // Ajuster automatiquement la visibilité selon le type
    setEditVisibility(DEFAULT_VISIBILITY_BY_TYPE[newType]);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Veuillez sélectionner un fichier');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const { data, error } = await uploadBeneficiaryDocument(
        beneficiaryId,
        selectedFile,
        description,
        documentType,
        visibility
      );

      if (error) throw error;

      // Recharger la liste
      await loadDocuments();

      // Réinitialiser le formulaire
      setSelectedFile(null);
      setDescription('');
      setDocumentType('autre');
      setVisibility('private');
      setUploadDialogOpen(false);
    } catch (err: any) {
      logger.error('Erreur lors de l\'upload:', err);
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (document: BeneficiaryDocument) => {
    setSelectedDocument(document);
    setEditDescription(document.description || '');
    setEditDocumentType(document.document_type || 'autre');
    setEditVisibility(document.visibility || 'private');
    setEditDialogOpen(true);
  };

  const handleUpdateDocument = async () => {
    if (!selectedDocument) return;

    setUploading(true);
    setError(null);

    try {
      const { error } = await updateBeneficiaryDocument(selectedDocument.id, {
        description: editDescription,
        document_type: editDocumentType,
        visibility: editVisibility
      });

      if (error) throw error;

      await loadDocuments();
      setEditDialogOpen(false);
    } catch (err: any) {
      logger.error('Erreur lors de la mise à jour:', err);
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (document: BeneficiaryDocument) => {
    try {
      const { data, error } = await downloadBeneficiaryDocument(document.file_path);
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
      logger.error('Erreur lors du téléchargement:', err);
      setError(err.message);
    }
  };

  const handleDelete = async (documentId: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) {
      return;
    }

    try {
      const { error } = await deleteBeneficiaryDocument(documentId);
      if (error) throw error;
      await loadDocuments();
    } catch (err: any) {
      logger.error('Erreur lors de la suppression:', err);
      setError(err.message);
    }
  };

  const canEditDocument = (document: BeneficiaryDocument) => {
    if (!profile) return false;

    // Admin peut tout modifier
    if (profile.user_type === 'admin') return true;

    // L'utilisateur peut modifier ses propres documents
    return document.uploaded_by === profile.id;
  };

  const handleOpenPDF = (document: BeneficiaryDocument) => {
    setViewerDocument(document);
    setPdfViewerOpen(true);
  };

  const handleClosePDF = () => {
    setPdfViewerOpen(false);
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
        <Typography variant="h6">Documents du bénéficiaire</Typography>
        {canEdit && (
          <Button
            variant="contained"
            startIcon={<UploadIcon />}
            onClick={() => setUploadDialogOpen(true)}
            sx={{
              background: 'linear-gradient(45deg, #345995, #1D3461)',
              '&:hover': {
                background: 'linear-gradient(45deg, #1D3461, #345995)',
              },
            }}
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

      {/* Message informatif pour tous les utilisateurs */}
      <Alert severity="info" sx={{ mb: 2 }}>
        Cette page affiche uniquement les documents publics. Les documents privés sont accessibles uniquement dans la partie intervenant (rendez-vous).
      </Alert>

      {documents.length === 0 ? (
        <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
          Aucun document public pour le moment
        </Typography>
      ) : (
        <List>
          {documents.map((document) => (
            <Card key={document.id} sx={{ mb: 2 }}>
              <CardContent>
                <Box display="flex" alignItems="flex-start" gap={2}>
                  {/* Aperçu PDF */}
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
                        icon={<PdfIcon />}
                        label={DOCUMENT_TYPE_LABELS[document.document_type] || 'PDF'}
                        color="primary"
                        variant="outlined"
                      />
                      <Chip
                        size="small"
                        icon={document.visibility === 'public' ? <PublicIcon /> : <LockIcon />}
                        label={document.visibility === 'public' ? 'Public (visible par le bénéficiaire)' : 'Privé (intervenants uniquement)'}
                        color={document.visibility === 'public' ? 'success' : 'default'}
                        variant="outlined"
                      />
                      {document.uploaded_by_profile && (
                        <Chip
                          size="small"
                          label={`Par ${getUploaderDisplayName(document.uploaded_by_profile)}`}
                          variant="outlined"
                        />
                      )}
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
        <DialogTitle>Ajouter un document PDF</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <input
              accept=".pdf"
              style={{ display: 'none' }}
              id="file-upload-beneficiary"
              type="file"
              onChange={handleFileSelect}
            />
            <label htmlFor="file-upload-beneficiary">
              <Button variant="outlined" component="span" fullWidth>
                {selectedFile ? selectedFile.name : 'Sélectionner un fichier PDF'}
              </Button>
            </label>

            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Type de document</InputLabel>
              <Select
                value={documentType}
                onChange={(e) => handleDocumentTypeChange(e.target.value as DocumentType)}
                label="Type de document"
              >
                <MenuItem value="arbre">{DOCUMENT_TYPE_LABELS.arbre}</MenuItem>
                <MenuItem value="arbre_detail">{DOCUMENT_TYPE_LABELS.arbre_detail}</MenuItem>
                <MenuItem value="plan_de_vie">{DOCUMENT_TYPE_LABELS.plan_de_vie}</MenuItem>
                <MenuItem value="analyse">{DOCUMENT_TYPE_LABELS.analyse}</MenuItem>
                <MenuItem value="autre">{DOCUMENT_TYPE_LABELS.autre}</MenuItem>
              </Select>
              <FormHelperText>
                {documentType === 'arbre'
                  ? 'Par défaut : visible par le bénéficiaire'
                  : 'Par défaut : visible uniquement par les intervenants'}
              </FormHelperText>
            </FormControl>

            <TextField
              label="Description (optionnelle)"
              multiline
              rows={3}
              fullWidth
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              sx={{ mt: 2 }}
              placeholder="Ex: Certificat médical, ordonnance, résultats d'analyses..."
            />

            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Visibilité du document</InputLabel>
              <Select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as 'public' | 'private')}
                label="Visibilité du document"
              >
                <MenuItem value="private">
                  <Box display="flex" alignItems="center" gap={1}>
                    <LockIcon fontSize="small" />
                    Privé - Visible uniquement par les intervenants et admins
                  </Box>
                </MenuItem>
                <MenuItem value="public">
                  <Box display="flex" alignItems="center" gap={1}>
                    <PublicIcon fontSize="small" />
                    Public - Visible par le bénéficiaire et les intervenants
                  </Box>
                </MenuItem>
              </Select>
              <FormHelperText>
                {visibility === 'public'
                  ? 'Le bénéficiaire pourra voir et télécharger ce document'
                  : 'Seuls les intervenants et admins ayant accès à ce bénéficiaire pourront voir ce document'}
              </FormHelperText>
            </FormControl>
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
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Type de document</InputLabel>
              <Select
                value={editDocumentType}
                onChange={(e) => handleEditDocumentTypeChange(e.target.value as DocumentType)}
                label="Type de document"
              >
                <MenuItem value="arbre">{DOCUMENT_TYPE_LABELS.arbre}</MenuItem>
                <MenuItem value="arbre_detail">{DOCUMENT_TYPE_LABELS.arbre_detail}</MenuItem>
                <MenuItem value="plan_de_vie">{DOCUMENT_TYPE_LABELS.plan_de_vie}</MenuItem>
                <MenuItem value="analyse">{DOCUMENT_TYPE_LABELS.analyse}</MenuItem>
                <MenuItem value="autre">{DOCUMENT_TYPE_LABELS.autre}</MenuItem>
              </Select>
              <FormHelperText>
                {editDocumentType === 'arbre'
                  ? 'Par défaut : visible par le bénéficiaire'
                  : 'Par défaut : visible uniquement par les intervenants'}
              </FormHelperText>
            </FormControl>

            <TextField
              label="Description"
              multiline
              rows={3}
              fullWidth
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              sx={{ mb: 2 }}
            />

            <FormControl fullWidth>
              <InputLabel>Visibilité du document</InputLabel>
              <Select
                value={editVisibility}
                onChange={(e) => setEditVisibility(e.target.value as 'public' | 'private')}
                label="Visibilité du document"
              >
                <MenuItem value="private">
                  <Box display="flex" alignItems="center" gap={1}>
                    <LockIcon fontSize="small" />
                    Privé - Visible uniquement par les intervenants et admins
                  </Box>
                </MenuItem>
                <MenuItem value="public">
                  <Box display="flex" alignItems="center" gap={1}>
                    <PublicIcon fontSize="small" />
                    Public - Visible par le bénéficiaire et les intervenants
                  </Box>
                </MenuItem>
              </Select>
              <FormHelperText>
                {editVisibility === 'public'
                  ? 'Le bénéficiaire pourra voir et télécharger ce document'
                  : 'Seuls les intervenants et admins ayant accès à ce bénéficiaire pourront voir ce document'}
              </FormHelperText>
            </FormControl>
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
      {viewerDocument && (
        <PDFViewer
          open={pdfViewerOpen}
          onClose={handleClosePDF}
          url={documentUrls[viewerDocument.id] || ''}
          fileName={viewerDocument.file_name}
          onDownload={() => handleDownload(viewerDocument)}
        />
      )}
    </Box>
  );
};
