// src/components/practitioner/PractitionerBeneficiariesList.tsx
import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Typography,
  Grid,
  Avatar,
  Chip,
  CircularProgress,
  Alert,
  InputAdornment,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  Tabs,
  Tab,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import PersonIcon from '@mui/icons-material/Person';
import CloseIcon from '@mui/icons-material/Close';
import PublicIcon from '@mui/icons-material/Public';
import LockIcon from '@mui/icons-material/Lock';
import { supabase } from '../../services/supabase';
import { NumerologyTriangleAvatar } from '../profile/NumerologyTriangleAvatar';
import {
  getBeneficiaryDocumentsByType,
  getBeneficiaryDocumentBlob,
  BeneficiaryDocument,
  DOCUMENT_TYPE_LABELS
} from '../../services/beneficiaryDocuments';
import { BeneficiaryDetails } from '../beneficiaries/BeneficiaryDetails';
import { BeneficiaryDocumentsPanel } from '../appointments/BeneficiaryDocumentsPanel';
import { BeneficiaryStats } from '../beneficiaries/BeneficiaryStats';
import { BeneficiaryHistory } from '../beneficiaries/BeneficiaryHistory';
import { BeneficiaryAccessManager } from '../beneficiaries/BeneficiaryAccessManager';
import { BeneficiaryWithAccess } from '../../types/beneficiary';
import { logger } from '../../utils/logger';

interface BeneficiaryWithNumerology {
  id: string;
  first_name: string;
  last_name: string;
  birth_date: string;
  email: string | null;
  tronc: number | null;
  racine_1: number | null;
  racine_2: number | null;
  dynamique_de_vie: number | null;
  appointment_count: number;
}

interface PractitionerBeneficiariesListProps {
  practitionerId: string;
}

export const PractitionerBeneficiariesList: React.FC<PractitionerBeneficiariesListProps> = ({
  practitionerId,
}) => {
  const [beneficiaries, setBeneficiaries] = useState<BeneficiaryWithNumerology[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtres
  const [searchFirstName, setSearchFirstName] = useState('');
  const [searchLastName, setSearchLastName] = useState('');
  const [searchTronc, setSearchTronc] = useState('');
  const [searchRacine1, setSearchRacine1] = useState('');
  const [searchRacine2, setSearchRacine2] = useState('');
  const [searchDynamique, setSearchDynamique] = useState('');

  // Dialog de détails du bénéficiaire
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<BeneficiaryWithAccess | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTab, setDialogTab] = useState(0);

  // Documents disponibles par bénéficiaire (pour les raccourcis)
  const [availableDocuments, setAvailableDocuments] = useState<Record<string, Record<string, BeneficiaryDocument>>>({});

  // Charger les bénéficiaires ayant eu des rendez-vous avec cet intervenant
  useEffect(() => {
    loadBeneficiaries();
  }, [practitionerId]);

  // Charger les documents disponibles pour chaque bénéficiaire
  useEffect(() => {
    if (beneficiaries.length > 0) {
      loadDocumentsForBeneficiaries();
    }
  }, [beneficiaries]);

  const loadBeneficiaries = async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Récupérer tous les IDs de rendez-vous pour cet intervenant
      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('id')
        .eq('practitioner_id', practitionerId);

      if (appointmentsError) throw appointmentsError;

      if (!appointments || appointments.length === 0) {
        setBeneficiaries([]);
        setLoading(false);
        return;
      }

      const appointmentIds = appointments.map(a => a.id);

      // 2. Récupérer tous les bénéficiaires liés à ces rendez-vous
      const { data, error: queryError } = await supabase
        .from('appointment_beneficiaries')
        .select(`
          beneficiary_id,
          beneficiaries (
            id,
            first_name,
            last_name,
            birth_date,
            email,
            tronc,
            racine_1,
            racine_2,
            dynamique_de_vie
          )
        `)
        .in('appointment_id', appointmentIds);

      if (queryError) throw queryError;

      if (data) {
        // Grouper par beneficiary_id et compter le nombre de rendez-vous
        const beneficiaryMap = new Map<string, BeneficiaryWithNumerology>();

        data.forEach((item: any) => {
          const ben = item.beneficiaries;
          if (ben) {
            if (beneficiaryMap.has(ben.id)) {
              const existing = beneficiaryMap.get(ben.id)!;
              existing.appointment_count += 1;
            } else {
              beneficiaryMap.set(ben.id, {
                ...ben,
                appointment_count: 1,
              });
            }
          }
        });

        const beneficiariesList = Array.from(beneficiaryMap.values());
        // Trier par nombre de rendez-vous décroissant
        beneficiariesList.sort((a, b) => b.appointment_count - a.appointment_count);

        setBeneficiaries(beneficiariesList);
      }
    } catch (err: any) {
      logger.error('Erreur lors du chargement des bénéficiaires:', err);
      setError(err.message || 'Erreur lors du chargement des bénéficiaires');
    } finally {
      setLoading(false);
    }
  };

  // Filtrer les bénéficiaires
  const filteredBeneficiaries = useMemo(() => {
    return beneficiaries.filter((ben) => {
      // Filtre prénom
      if (searchFirstName && !ben.first_name.toLowerCase().includes(searchFirstName.toLowerCase())) {
        return false;
      }

      // Filtre nom
      if (searchLastName && !ben.last_name.toLowerCase().includes(searchLastName.toLowerCase())) {
        return false;
      }

      // Filtre tronc
      if (searchTronc && ben.tronc?.toString() !== searchTronc) {
        return false;
      }

      // Filtre racine 1
      if (searchRacine1 && ben.racine_1?.toString() !== searchRacine1) {
        return false;
      }

      // Filtre racine 2
      if (searchRacine2 && ben.racine_2?.toString() !== searchRacine2) {
        return false;
      }

      // Filtre dynamique de vie
      if (searchDynamique && ben.dynamique_de_vie?.toString() !== searchDynamique) {
        return false;
      }

      return true;
    });
  }, [beneficiaries, searchFirstName, searchLastName, searchTronc, searchRacine1, searchRacine2, searchDynamique]);

  // Fonction pour obtenir les initiales
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  // Fonction pour obtenir la couleur de l'avatar
  const getAvatarColor = (firstName: string, lastName: string) => {
    const colors = ['#345995', '#1D3461', '#5FA8D3', '#8B7DAB', '#D4A5A5'];
    const sum = firstName.charCodeAt(0) + lastName.charCodeAt(0);
    return colors[sum % colors.length];
  };

  // Fonction pour formater les nombres maîtres
  const formatMasterNumber = (value: number | null | undefined): string => {
    if (!value) return '';
    const numStr = value.toString();
    if (numStr === '11') return '11/2';
    if (numStr === '22') return '22/4';
    if (numStr === '33') return '33/6';
    return numStr;
  };

  // Fonction pour calculer l'âge
  const calculateAge = (birthDate: string): number => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  // Fonction pour charger les détails complets d'un bénéficiaire
  const handleBeneficiaryClick = async (beneficiary: BeneficiaryWithNumerology) => {
    try {
      // Charger les données complètes du bénéficiaire depuis la table beneficiaries
      const { data, error } = await supabase
        .from('beneficiaries')
        .select('*')
        .eq('id', beneficiary.id)
        .single();

      if (error) throw error;

      if (data) {
        // Transformer en BeneficiaryWithAccess (ajouter les champs manquants)
        const beneficiaryWithAccess: BeneficiaryWithAccess = {
          ...data,
          is_owner: false, // L'intervenant n'est pas propriétaire
          relationship: 'managed' as any, // Relation gérée
        };

        setSelectedBeneficiary(beneficiaryWithAccess);
        setDialogTab(0);
        setDialogOpen(true);
      }
    } catch (err: any) {
      logger.error('Erreur lors du chargement des détails du bénéficiaire:', err);
    }
  };

  // Fonction pour fermer le dialog
  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedBeneficiary(null);
    setDialogTab(0);
  };

  // Fonction pour changer d'onglet dans le dialog
  const handleDialogTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setDialogTab(newValue);
  };

  // Fonction pour charger les documents disponibles pour chaque bénéficiaire
  const loadDocumentsForBeneficiaries = async () => {
    const documentsData: Record<string, Record<string, BeneficiaryDocument>> = {};

    for (const beneficiary of beneficiaries) {
      try {
        const { data } = await getBeneficiaryDocumentsByType(beneficiary.id);
        if (data) {
          // Filtrer uniquement les documents publics ET privés (intervenant voit tout)
          documentsData[beneficiary.id] = data;
        }
      } catch (err) {
        logger.error(`Erreur lors du chargement des documents pour ${beneficiary.id}:`, err);
      }
    }

    setAvailableDocuments(documentsData);
  };

  // Fonction pour gérer le clic sur un badge de document
  const handleDocumentClick = async (document: BeneficiaryDocument, event: React.MouseEvent) => {
    event.stopPropagation(); // Empêcher l'ouverture du dialog du bénéficiaire

    try {
      // Télécharger et ouvrir le document
      const blobUrl = await getBeneficiaryDocumentBlob(document.file_path);
      if (blobUrl) {
        // Ouvrir dans un nouvel onglet
        const newWindow = window.open(blobUrl, '_blank', 'noopener,noreferrer');
        if (newWindow) {
          newWindow.focus();
        }
      }
    } catch (err) {
      logger.error('Erreur lors de l\'ouverture du document:', err);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={6}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      {/* Filtres */}
      <Card sx={{ mb: 3, bgcolor: 'rgba(52, 89, 149, 0.05)' }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#345995' }}>
            🔍 Filtres
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                size="small"
                label="Prénom"
                value={searchFirstName}
                onChange={(e) => setSearchFirstName(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                  endAdornment: searchFirstName && (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setSearchFirstName('')}>
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                size="small"
                label="Nom"
                value={searchLastName}
                onChange={(e) => setSearchLastName(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                  endAdornment: searchLastName && (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setSearchLastName('')}>
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <TextField
                fullWidth
                size="small"
                label="Tronc"
                value={searchTronc}
                onChange={(e) => setSearchTronc(e.target.value)}
                placeholder="1-9"
                InputProps={{
                  endAdornment: searchTronc && (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setSearchTronc('')}>
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <TextField
                fullWidth
                size="small"
                label="Racine 1"
                value={searchRacine1}
                onChange={(e) => setSearchRacine1(e.target.value)}
                placeholder="1-9"
                InputProps={{
                  endAdornment: searchRacine1 && (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setSearchRacine1('')}>
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <TextField
                fullWidth
                size="small"
                label="Racine 2"
                value={searchRacine2}
                onChange={(e) => setSearchRacine2(e.target.value)}
                placeholder="1-9"
                InputProps={{
                  endAdornment: searchRacine2 && (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setSearchRacine2('')}>
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <TextField
                fullWidth
                size="small"
                label="Dynamique"
                value={searchDynamique}
                onChange={(e) => setSearchDynamique(e.target.value)}
                placeholder="1-9"
                InputProps={{
                  endAdornment: searchDynamique && (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setSearchDynamique('')}>
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
          </Grid>

          {/* Compteur de résultats */}
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              {filteredBeneficiaries.length} bénéficiaire{filteredBeneficiaries.length > 1 ? 's' : ''} trouvé{filteredBeneficiaries.length > 1 ? 's' : ''}
            </Typography>
            {(searchFirstName || searchLastName || searchTronc || searchRacine1 || searchRacine2 || searchDynamique) && (
              <Typography
                variant="body2"
                sx={{ color: '#345995', cursor: 'pointer', textDecoration: 'underline' }}
                onClick={() => {
                  setSearchFirstName('');
                  setSearchLastName('');
                  setSearchTronc('');
                  setSearchRacine1('');
                  setSearchRacine2('');
                  setSearchDynamique('');
                }}
              >
                Réinitialiser les filtres
              </Typography>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Liste des bénéficiaires */}
      {filteredBeneficiaries.length === 0 ? (
        <Alert severity="info">
          {beneficiaries.length === 0
            ? 'Aucun bénéficiaire n\'a encore eu de rendez-vous avec vous.'
            : 'Aucun bénéficiaire ne correspond aux critères de recherche.'}
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {filteredBeneficiaries.map((ben) => (
            <Grid item xs={12} sm={6} md={4} key={ben.id}>
              <Card
                onClick={() => handleBeneficiaryClick(ben)}
                sx={{
                  height: '100%',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  '&:hover': {
                    boxShadow: 6,
                    transform: 'translateY(-4px)',
                    bgcolor: 'rgba(52, 89, 149, 0.02)',
                  },
                }}
              >
                <CardContent>
                  {/* Avatar et nom */}
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    {ben.tronc || ben.racine_1 || ben.racine_2 ? (
                      <NumerologyTriangleAvatar
                        tronc={ben.tronc ?? undefined}
                        racine1={ben.racine_1 ?? undefined}
                        racine2={ben.racine_2 ?? undefined}
                        dynamique_de_vie={ben.dynamique_de_vie ?? undefined}
                        size={60}
                      />
                    ) : (
                      <Avatar
                        sx={{
                          width: 60,
                          height: 60,
                          bgcolor: getAvatarColor(ben.first_name, ben.last_name),
                          fontSize: '1.5rem',
                          fontWeight: 600,
                        }}
                      >
                        {getInitials(ben.first_name, ben.last_name)}
                      </Avatar>
                    )}
                    <Box sx={{ ml: 2, flex: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                        {ben.first_name} {ben.last_name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {calculateAge(ben.birth_date)} ans
                      </Typography>
                    </Box>
                  </Box>

                  {/* Données de numérologie */}
                  {(ben.tronc || ben.racine_1 || ben.racine_2 || ben.dynamique_de_vie) && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                        Numérologie
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {ben.tronc && (
                          <Tooltip title="Tronc">
                            <Chip
                              label={formatMasterNumber(ben.tronc)}
                              size="small"
                              sx={{
                                bgcolor: '#1976d2',
                                color: 'white',
                                fontWeight: 700,
                              }}
                            />
                          </Tooltip>
                        )}
                        {ben.racine_1 && (
                          <Tooltip title="Racine 1">
                            <Chip
                              label={formatMasterNumber(ben.racine_1)}
                              size="small"
                              sx={{
                                bgcolor: '#9c27b0',
                                color: 'white',
                                fontWeight: 700,
                              }}
                            />
                          </Tooltip>
                        )}
                        {ben.racine_2 && (
                          <Tooltip title="Racine 2">
                            <Chip
                              label={formatMasterNumber(ben.racine_2)}
                              size="small"
                              sx={{
                                bgcolor: '#9c27b0',
                                color: 'white',
                                fontWeight: 700,
                              }}
                            />
                          </Tooltip>
                        )}
                        {ben.dynamique_de_vie && (
                          <Tooltip title="Dynamique de vie">
                            <Chip
                              label={formatMasterNumber(ben.dynamique_de_vie)}
                              size="small"
                              variant="outlined"
                              sx={{
                                borderColor: '#f57c00',
                                color: '#f57c00',
                                fontWeight: 700,
                              }}
                            />
                          </Tooltip>
                        )}
                      </Box>
                    </Box>
                  )}

                  {/* Raccourcis vers les documents */}
                  {availableDocuments[ben.id] && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                        Documents disponibles
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {/* Arbre */}
                        {availableDocuments[ben.id].arbre && (
                          <Tooltip title={`Cliquer pour ouvrir l'Arbre${availableDocuments[ben.id].arbre.visibility === 'public' ? '' : ' (privé)'}`}>
                            <Chip
                              icon={availableDocuments[ben.id].arbre.visibility === 'public' ? <PublicIcon /> : <LockIcon />}
                              label={DOCUMENT_TYPE_LABELS.arbre}
                              size="small"
                              onClick={(e) => handleDocumentClick(availableDocuments[ben.id].arbre, e)}
                              sx={{
                                bgcolor: '#4caf50',
                                color: 'white',
                                fontWeight: 600,
                                cursor: 'pointer',
                                '&:hover': {
                                  bgcolor: '#45a049',
                                },
                              }}
                            />
                          </Tooltip>
                        )}

                        {/* Arbre Détail */}
                        {availableDocuments[ben.id].arbre_detail && (
                          <Tooltip title={`Cliquer pour ouvrir l'Arbre Détail${availableDocuments[ben.id].arbre_detail.visibility === 'public' ? '' : ' (privé)'}`}>
                            <Chip
                              icon={availableDocuments[ben.id].arbre_detail.visibility === 'public' ? <PublicIcon /> : <LockIcon />}
                              label={DOCUMENT_TYPE_LABELS.arbre_detail}
                              size="small"
                              onClick={(e) => handleDocumentClick(availableDocuments[ben.id].arbre_detail, e)}
                              sx={{
                                bgcolor: '#ff9800',
                                color: 'white',
                                fontWeight: 600,
                                cursor: 'pointer',
                                '&:hover': {
                                  bgcolor: '#fb8c00',
                                },
                              }}
                            />
                          </Tooltip>
                        )}

                        {/* Plan de vie */}
                        {availableDocuments[ben.id].plan_de_vie && (
                          <Tooltip title={`Cliquer pour ouvrir le Plan de vie${availableDocuments[ben.id].plan_de_vie.visibility === 'public' ? '' : ' (privé)'}`}>
                            <Chip
                              icon={availableDocuments[ben.id].plan_de_vie.visibility === 'public' ? <PublicIcon /> : <LockIcon />}
                              label={DOCUMENT_TYPE_LABELS.plan_de_vie}
                              size="small"
                              onClick={(e) => handleDocumentClick(availableDocuments[ben.id].plan_de_vie, e)}
                              sx={{
                                bgcolor: '#2196f3',
                                color: 'white',
                                fontWeight: 600,
                                cursor: 'pointer',
                                '&:hover': {
                                  bgcolor: '#1e88e5',
                                },
                              }}
                            />
                          </Tooltip>
                        )}
                      </Box>
                    </Box>
                  )}

                  {/* Nombre de rendez-vous */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PersonIcon fontSize="small" sx={{ color: '#345995' }} />
                    <Typography variant="body2" color="text.secondary">
                      {ben.appointment_count} rendez-vous
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Dialog de détails du bénéficiaire */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            minHeight: '80vh',
            maxHeight: '90vh',
          }
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #345995 0%, #1D3461 100%)',
            color: 'white',
            pb: 2,
          }}
        >
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {selectedBeneficiary?.first_name} {selectedBeneficiary?.last_name}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
              Détails du bénéficiaire
            </Typography>
          </Box>
          <IconButton
            onClick={handleCloseDialog}
            sx={{
              color: 'white',
              '&:hover': {
                bgcolor: 'rgba(255, 255, 255, 0.1)',
              },
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <Tabs
          value={dialogTab}
          onChange={handleDialogTabChange}
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
            '& .MuiTab-root': {
              fontWeight: 600,
            },
          }}
        >
          <Tab label="Informations" />
          <Tab label="Documents" />
          <Tab label="Statistiques" />
          <Tab label="Historique" />
          <Tab label="Accès partagés" />
        </Tabs>

        <DialogContent sx={{ p: 3 }}>
          {selectedBeneficiary && (
            <Box>
              {/* Onglet Informations */}
              {dialogTab === 0 && (
                <BeneficiaryDetails
                  beneficiary={selectedBeneficiary}
                  userType="intervenant"
                />
              )}

              {/* Onglet Documents */}
              {dialogTab === 1 && (
                <BeneficiaryDocumentsPanel
                  beneficiaryId={selectedBeneficiary.id}
                  appointmentId="" // Pas de rendez-vous spécifique
                  practitionerId={practitionerId}
                />
              )}

              {/* Onglet Statistiques */}
              {dialogTab === 2 && (
                <BeneficiaryStats beneficiaryId={selectedBeneficiary.id} />
              )}

              {/* Onglet Historique */}
              {dialogTab === 3 && (
                <BeneficiaryHistory
                  beneficiaryId={selectedBeneficiary.id}
                  onViewAppointment={() => {}} // TODO: gérer l'affichage du rendez-vous si nécessaire
                />
              )}

              {/* Onglet Accès partagés */}
              {dialogTab === 4 && (
                <BeneficiaryAccessManager
                  beneficiary={selectedBeneficiary}
                />
              )}
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};
