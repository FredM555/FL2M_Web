// src/components/beneficiaries/BeneficiaryDetails.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Divider,
  Chip,
  Button,
  CircularProgress,
} from '@mui/material';
import {
  Person as PersonIcon,
  Cake as CakeIcon,
  Numbers as NumbersIcon,
  Note as NoteIcon,
  Description as DescriptionIcon,
} from '@mui/icons-material';
import { BeneficiaryWithAccess, formatBirthDate, calculateAge } from '../../types/beneficiary';
import {
  BeneficiaryDocument,
  DOCUMENT_TYPE_LABELS,
  getBeneficiaryDocuments,
  getBeneficiaryDocumentBlob,
  getSignedBeneficiaryDocumentUrl,
  getBeneficiaryDocumentUrl,
  downloadBeneficiaryDocument
} from '../../services/beneficiaryDocuments';
import { PDFViewer } from '../appointments/PDFViewer';

interface BeneficiaryDetailsProps {
  beneficiary: BeneficiaryWithAccess;
  userType?: 'admin' | 'intervenant' | 'client';
}

/**
 * Composant d'affichage des détails d'un bénéficiaire
 * Les données de numérologie et notes sont accessibles uniquement pour les admins et intervenants
 */
export const BeneficiaryDetails: React.FC<BeneficiaryDetailsProps> = ({
  beneficiary,
  userType = 'client',
}) => {
  // Vérifier si l'utilisateur peut voir les données sensibles
  const canViewSensitiveData = userType === 'admin' || userType === 'intervenant';

  // États pour les documents raccourcis
  const [documents, setDocuments] = useState<BeneficiaryDocument[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(true);
  const [documentUrls, setDocumentUrls] = useState<Record<string, string>>({});

  // États pour le PDF viewer
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [viewerDocument, setViewerDocument] = useState<BeneficiaryDocument | null>(null);

  // Charger les documents pour les raccourcis
  useEffect(() => {
    loadQuickAccessDocuments();

    // Nettoyage : révoquer les blob URLs
    return () => {
      Object.values(documentUrls).forEach(url => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [beneficiary.id]);

  const loadQuickAccessDocuments = async () => {
    try {
      setLoadingDocuments(true);
      const { data, error } = await getBeneficiaryDocuments(beneficiary.id);
      if (error) throw error;

      // Filtrer uniquement les documents arbre, arbre_detail et plan_de_vie
      const quickAccessDocs = (data || []).filter(
        doc => doc.document_type === 'arbre' ||
               doc.document_type === 'arbre_detail' ||
               doc.document_type === 'plan_de_vie'
      );
      setDocuments(quickAccessDocs);

      // Charger les URLs blob pour chaque document
      if (quickAccessDocs.length > 0) {
        const urls: Record<string, string> = {};
        for (const doc of quickAccessDocs) {
          try {
            const blobUrl = await getBeneficiaryDocumentBlob(doc.file_path);
            if (blobUrl) {
              urls[doc.id] = blobUrl;
            } else {
              const signedUrl = await getSignedBeneficiaryDocumentUrl(doc.file_path);
              urls[doc.id] = signedUrl;
            }
          } catch (err) {
            const publicUrl = getBeneficiaryDocumentUrl(doc.file_path);
            urls[doc.id] = publicUrl;
          }
        }
        setDocumentUrls(urls);
      }
    } catch (err: any) {
      console.error('Erreur lors du chargement des documents raccourcis:', err);
    } finally {
      setLoadingDocuments(false);
    }
  };

  const handleOpenQuickAccessPDF = (document: BeneficiaryDocument) => {
    setViewerDocument(document);
    setPdfViewerOpen(true);
  };

  const handleClosePDF = () => {
    setPdfViewerOpen(false);
    setViewerDocument(null);
  };

  const handleDownloadDocument = async (document: BeneficiaryDocument) => {
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
      console.error('Erreur lors du téléchargement:', err);
    }
  };

  // Trouver les documents par type
  const arbreDoc = documents.find(doc => doc.document_type === 'arbre');
  const arbreDetailDoc = documents.find(doc => doc.document_type === 'arbre_detail');
  const planDeVieDoc = documents.find(doc => doc.document_type === 'plan_de_vie');

  // Fonction pour formater les nombres maîtres
  const formatMasterNumber = (value: string | number | null | undefined): string => {
    if (!value) return '';
    const numStr = value.toString();

    // Vérifier si c'est un nombre maître
    if (numStr === '11') return '11/2';
    if (numStr === '22') return '22/4';
    if (numStr === '33') return '33/6';

    return numStr;
  };

  return (
    <Box>
      {/* Informations de base */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <PersonIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Informations personnelles
          </Typography>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Prénom(s)
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 500 }}>
              {beneficiary.first_name}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Nom de famille
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 500 }}>
              {beneficiary.last_name}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Date de naissance
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CakeIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                {formatBirthDate(beneficiary.birth_date)}
              </Typography>
              <Chip
                label={`${calculateAge(beneficiary.birth_date)} ans`}
                size="small"
                color="primary"
                sx={{ ml: 1 }}
              />
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Raccourcis vers les documents importants - Affichés directement sans délai */}
      {!loadingDocuments && (arbreDoc || arbreDetailDoc || planDeVieDoc) && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <DescriptionIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Accès rapide aux documents
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {arbreDoc && (
              <Button
                variant="outlined"
                startIcon={<DescriptionIcon />}
                onClick={() => handleOpenQuickAccessPDF(arbreDoc)}
                sx={{
                  borderColor: '#4caf50',
                  color: '#4caf50',
                  '&:hover': {
                    borderColor: '#388e3c',
                    backgroundColor: 'rgba(76, 175, 80, 0.04)',
                  },
                }}
              >
                {DOCUMENT_TYPE_LABELS.arbre}
              </Button>
            )}

            {arbreDetailDoc && canViewSensitiveData && (
              <Button
                variant="outlined"
                startIcon={<DescriptionIcon />}
                onClick={() => handleOpenQuickAccessPDF(arbreDetailDoc)}
                sx={{
                  borderColor: '#ff9800',
                  color: '#ff9800',
                  '&:hover': {
                    borderColor: '#f57c00',
                    backgroundColor: 'rgba(255, 152, 0, 0.04)',
                  },
                }}
              >
                {DOCUMENT_TYPE_LABELS.arbre_detail}
              </Button>
            )}

            {planDeVieDoc && canViewSensitiveData && (
              <Button
                variant="outlined"
                startIcon={<DescriptionIcon />}
                onClick={() => handleOpenQuickAccessPDF(planDeVieDoc)}
                sx={{
                  borderColor: '#2196f3',
                  color: '#2196f3',
                  '&:hover': {
                    borderColor: '#1976d2',
                    backgroundColor: 'rgba(33, 150, 243, 0.04)',
                  },
                }}
              >
                {DOCUMENT_TYPE_LABELS.plan_de_vie}
              </Button>
            )}
          </Box>
        </Paper>
      )}

      {/* Triangle fondamental et Arbre numérologique sur la même ligne */}
      {((beneficiary.tronc || beneficiary.racine_1 || beneficiary.racine_2 || beneficiary.dynamique_de_vie) ||
        (canViewSensitiveData && (beneficiary.ecorce || beneficiary.branche || beneficiary.feuille || beneficiary.fruit))) && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={3}>
            {/* Triangle fondamental - Pour tous */}
            {(beneficiary.tronc || beneficiary.racine_1 || beneficiary.racine_2 || beneficiary.dynamique_de_vie) && (
              <Grid item xs={12} md={canViewSensitiveData && (beneficiary.ecorce || beneficiary.branche || beneficiary.feuille || beneficiary.fruit) ? 6 : 12}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <span style={{ fontSize: '1.8rem' }}>🔺</span> Triangle fondamental
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                  {beneficiary.tronc && (
                    <Chip
                      label={formatMasterNumber(beneficiary.tronc)}
                      size="medium"
                      sx={{
                        bgcolor: '#1976d2',
                        color: 'white',
                        fontWeight: 700,
                        fontSize: '1.3rem',
                        height: 48,
                        minWidth: 48,
                        '& .MuiChip-label': { px: 2 },
                      }}
                      title="Tronc (Objectif de vie)"
                    />
                  )}

                  {beneficiary.racine_1 && (
                    <Chip
                      label={formatMasterNumber(beneficiary.racine_1)}
                      size="medium"
                      sx={{
                        bgcolor: '#9c27b0',
                        color: 'white',
                        fontWeight: 700,
                        fontSize: '1rem',
                        height: 36,
                        minWidth: 36,
                        '& .MuiChip-label': { px: 1.5 },
                      }}
                      title="Racine 1 (Chemin de vie)"
                    />
                  )}

                  {beneficiary.racine_2 && (
                    <Chip
                      label={formatMasterNumber(beneficiary.racine_2)}
                      size="medium"
                      sx={{
                        bgcolor: '#9c27b0',
                        color: 'white',
                        fontWeight: 700,
                        fontSize: '1rem',
                        height: 36,
                        minWidth: 36,
                        '& .MuiChip-label': { px: 1.5 },
                      }}
                      title="Racine 2 (Expression)"
                    />
                  )}

                  {beneficiary.dynamique_de_vie && (
                    <Chip
                      label={formatMasterNumber(beneficiary.dynamique_de_vie)}
                      size="medium"
                      variant="outlined"
                      sx={{
                        borderColor: '#f57c00',
                        color: '#f57c00',
                        fontWeight: 700,
                        fontSize: '1rem',
                        height: 36,
                        minWidth: 36,
                        '& .MuiChip-label': { px: 1.5 },
                      }}
                      title="Dynamique de vie"
                    />
                  )}
                </Box>
              </Grid>
            )}

            {/* Arbre numérologique - Uniquement pour admin et intervenant */}
            {canViewSensitiveData && (beneficiary.ecorce || beneficiary.branche || beneficiary.feuille || beneficiary.fruit) && (
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <span style={{ fontSize: '1.8rem' }}>🌳</span> Arbre numérologique
                  </Typography>
                  <Chip
                    label="Accès restreint"
                    size="small"
                    color="secondary"
                    sx={{ ml: 2, height: 24 }}
                  />
                </Box>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
            {beneficiary.ecorce && (
              <Chip
                label={formatMasterNumber(beneficiary.ecorce)}
                size="medium"
                variant="outlined"
                sx={{
                  borderColor: '#757575',
                  color: '#757575',
                  fontWeight: 700,
                  fontSize: '1rem',
                  height: 36,
                  minWidth: 36,
                  '& .MuiChip-label': { px: 1.5 },
                }}
                title="Écorce (Façon d'être perçu)"
              />
            )}

            {beneficiary.branche && (
              <Chip
                label={formatMasterNumber(beneficiary.branche)}
                size="medium"
                variant="outlined"
                sx={{
                  borderColor: '#2e7d32',
                  color: '#2e7d32',
                  fontWeight: 700,
                  fontSize: '1rem',
                  height: 36,
                  minWidth: 36,
                  '& .MuiChip-label': { px: 1.5 },
                }}
                title="Branche (Action/décision)"
              />
            )}

            {beneficiary.feuille && (
              <Chip
                label={formatMasterNumber(beneficiary.feuille)}
                size="medium"
                variant="outlined"
                sx={{
                  borderColor: '#66bb6a',
                  color: '#66bb6a',
                  fontWeight: 700,
                  fontSize: '1rem',
                  height: 36,
                  minWidth: 36,
                  '& .MuiChip-label': { px: 1.5 },
                }}
                title="Feuille (Besoins affectifs - privé)"
              />
            )}

            {beneficiary.fruit && (
              <Chip
                label={formatMasterNumber(beneficiary.fruit)}
                size="medium"
                variant="outlined"
                sx={{
                  borderColor: '#795548',
                  color: '#795548',
                  fontWeight: 700,
                  fontSize: '1rem',
                  height: 36,
                  minWidth: 36,
                  '& .MuiChip-label': { px: 1.5 },
                }}
                title="Fruit (Besoins de réalisation - professionnel)"
              />
            )}
          </Box>
              </Grid>
            )}
          </Grid>
        </Paper>
      )}

      {/* Notes - Uniquement pour admin et intervenant */}
      {canViewSensitiveData && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <NoteIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Notes
            </Typography>
            <Chip
              label="Accès restreint"
              size="small"
              color="secondary"
              sx={{ ml: 2, height: 24 }}
            />
          </Box>

          {beneficiary.notes ? (
            <Typography
              variant="body2"
              sx={{
                whiteSpace: 'pre-wrap',
                bgcolor: 'grey.50',
                p: 2,
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'grey.300',
              }}
            >
              {beneficiary.notes}
            </Typography>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              Aucune note enregistrée
            </Typography>
          )}
        </Paper>
      )}

      {/* PDF Viewer pour les raccourcis */}
      {viewerDocument && (
        <PDFViewer
          open={pdfViewerOpen}
          onClose={handleClosePDF}
          url={documentUrls[viewerDocument.id] || ''}
          fileName={viewerDocument.file_name}
          onDownload={() => handleDownloadDocument(viewerDocument)}
        />
      )}
    </Box>
  );
};
