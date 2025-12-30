// src/components/beneficiaries/BeneficiaryCard.tsx
import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Avatar,
  Typography,
  Box,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Share as ShareIcon,
  PersonOutline as PersonIcon,
  CakeOutlined as CakeIcon,
} from '@mui/icons-material';
import { BeneficiaryWithAccess } from '../../types/beneficiary';
import { calculateAge } from '../../types/beneficiary';
import {
  getBeneficiaryDocumentsByType,
  getBeneficiaryDocumentBlob,
  BeneficiaryDocument,
  DOCUMENT_TYPE_LABELS
} from '../../services/beneficiaryDocuments';
import {
  Description as DocumentIcon,
  Public as PublicIcon,
  Lock as LockIcon
} from '@mui/icons-material';
import { NumerologyTriangleAvatar } from '../profile/NumerologyTriangleAvatar';
import { logger } from '../../utils/logger';

interface BeneficiaryCardProps {
  beneficiary: BeneficiaryWithAccess;
  onEdit?: () => void;
  onDelete?: () => void;
  onShare?: () => void;
  onClick?: () => void;
  userType?: 'admin' | 'intervenant' | 'client';
}

/**
 * Composant carte pour afficher un bénéficiaire
 */
export const BeneficiaryCard: React.FC<BeneficiaryCardProps> = ({
  beneficiary,
  onEdit,
  onDelete,
  onShare,
  onClick,
  userType = 'client',
}) => {
  // État pour les documents disponibles (arbre, arbre_detail, plan_de_vie)
  const [availableDocuments, setAvailableDocuments] = useState<Record<string, BeneficiaryDocument>>({});
  const [loadingDocs, setLoadingDocs] = useState(false);

  // Calculer l'âge
  const age = calculateAge(beneficiary.birth_date);

  // Charger les documents disponibles pour les raccourcis
  useEffect(() => {
    const loadDocuments = async () => {
      setLoadingDocs(true);
      try {
        const { data } = await getBeneficiaryDocumentsByType(beneficiary.id);
        if (data) {
          // Filtrer pour n'afficher QUE les documents publics (pour tous les utilisateurs)
          // Les documents privés sont accessibles uniquement dans la partie intervenant (rendez-vous)
          const filteredData: Record<string, BeneficiaryDocument> = {};
          Object.entries(data).forEach(([key, document]) => {
            if (document.visibility === 'public') {
              filteredData[key] = document;
            }
          });
          setAvailableDocuments(filteredData);
        }
      } catch (err) {
        logger.error('Erreur lors du chargement des documents:', err);
      } finally {
        setLoadingDocs(false);
      }
    };

    loadDocuments();
  }, [beneficiary.id, userType]);

  // Gérer le clic sur un badge de document
  const handleDocumentClick = async (document: BeneficiaryDocument, event: React.MouseEvent) => {
    event.stopPropagation(); // Empêcher le clic sur la carte
    event.preventDefault(); // Empêcher tout comportement par défaut

    try {
      // Télécharger et ouvrir le document
      const blobUrl = await getBeneficiaryDocumentBlob(document.file_path);
      if (blobUrl) {
        // Ouvrir dans un nouvel onglet sans recharger la page courante
        const newWindow = window.open(blobUrl, '_blank', 'noopener,noreferrer');
        if (newWindow) {
          newWindow.focus();
        }
      }
    } catch (err) {
      logger.error('Erreur lors de l\'ouverture du document:', err);
    }
  };

  // Obtenir les initiales pour l'avatar
  const getInitials = () => {
    const first = beneficiary.first_name.charAt(0).toUpperCase();
    const last = beneficiary.last_name.charAt(0).toUpperCase();
    return `${first}${last}`;
  };

  // Obtenir la couleur de l'avatar basée sur le nom
  const getAvatarColor = () => {
    const colors = [
      '#345995',
      '#1D3461',
      '#5FA8D3',
      '#8B7DAB',
      '#D4A5A5',
    ];
    const sum = beneficiary.first_name.charCodeAt(0) + beneficiary.last_name.charCodeAt(0);
    return colors[sum % colors.length];
  };

  // Traduire la relation en français avec symbole
  const getRelationshipLabel = () => {
    const labels: Record<string, string> = {
      owner: '👤 Moi',
      self: '👤 Moi',
      child: '👶 Enfant',
      spouse: '💑 Conjoint(e)',
      partner: '💑 Partenaire',
      parent: '👨‍👩 Parent',
      sibling: '👫 Frère/Sœur',
      grandparent: '👴 Grand-parent',
      grandchild: '👶 Petit-enfant',
      managed: '📋 Géré',
      other: '👥 Autre',
    };
    return labels[beneficiary.relationship] || '👥 Autre';
  };

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
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.3s ease',
        '&:hover': onClick ? {
          transform: 'translateY(-4px)',
          boxShadow: 4,
        } : {},
      }}
      onClick={onClick}
    >
      <CardContent sx={{ flexGrow: 1, pb: 1 }}>
        {/* En-tête avec avatar et badges */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
          {/* Avatar de numérologie si disponible, sinon avatar classique */}
          {(beneficiary.tronc || beneficiary.racine_1 || beneficiary.racine_2) ? (
            <Box sx={{ mr: 2 }}>
              <NumerologyTriangleAvatar
                tronc={beneficiary.tronc ?? undefined}
                racine1={beneficiary.racine_1 ?? undefined}
                racine2={beneficiary.racine_2 ?? undefined}
                dynamique_de_vie={beneficiary.dynamique_de_vie ?? undefined}
                size={56}
              />
            </Box>
          ) : (
            <Avatar
              sx={{
                width: 56,
                height: 56,
                bgcolor: getAvatarColor(),
                fontSize: '1.25rem',
                fontWeight: 600,
                mr: 2,
              }}
            >
              {getInitials()}
            </Avatar>
          )}

          <Box sx={{ flexGrow: 1 }}>
            {/* Badges */}
            <Box sx={{ display: 'flex', gap: 0.5, mb: 1, flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Badge "Client" pour les intervenants/admins uniquement si le bénéficiaire est partagé avec eux */}
              {(userType === 'admin' || userType === 'intervenant') && !beneficiary.is_owner && (
                <Chip
                  label="👤 Client"
                  size="small"
                  color="primary"
                  variant="outlined"
                  sx={{ height: 20, fontSize: '0.7rem' }}
                />
              )}

              {/* Afficher "Partagé" uniquement si ce n'est PAS propriétaire (particularité) */}
              {!beneficiary.is_owner && (
                <Chip
                  label="Partagé"
                  size="small"
                  color="secondary"
                  variant="outlined"
                  sx={{ height: 20, fontSize: '0.7rem' }}
                />
              )}
              {/* Afficher la relation (toujours, même "Moi" pour self) */}
              {beneficiary.relationship && beneficiary.relationship !== 'owner' && (
                <Chip
                  label={getRelationshipLabel()}
                  size="small"
                  variant="outlined"
                  sx={{ height: 20, fontSize: '0.7rem' }}
                />
              )}
            </Box>

            {/* Nom complet */}
            <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.2, mb: 0.5 }}>
              {beneficiary.first_name} {beneficiary.last_name}
            </Typography>

            {/* Âge et date de naissance */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <CakeIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary">
                {age} ans ({new Date(beneficiary.birth_date).toLocaleDateString('fr-FR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric'
                })})
              </Typography>
            </Box>
          </Box>

          {/* Boutons d'action en haut à droite */}
          {(onEdit || onDelete || onShare) && (
            <Box sx={{ display: 'flex', gap: 0.5, ml: 1 }}>
              {onShare && beneficiary.can_share && (
                <Tooltip title="Partager l'accès">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onShare();
                    }}
                    sx={{ color: 'text.secondary' }}
                  >
                    <ShareIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}

              {onEdit && beneficiary.can_edit && (
                <Tooltip title="Modifier">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit();
                    }}
                    sx={{ color: 'primary.main' }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}

              {onDelete && beneficiary.is_owner && (
                <Tooltip title="Supprimer">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete();
                    }}
                    sx={{ color: 'error.main' }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          )}
        </Box>

        {/* Informations supplémentaires */}
        <Box sx={{ mt: 2 }}>
          {/* Triangle fondamental */}
          {(beneficiary.tronc || beneficiary.racine_1 || beneficiary.racine_2 || beneficiary.dynamique_de_vie) && (
            <Box sx={{ mb: 1.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5, fontWeight: 500 }}>
                <span style={{ fontSize: '1.2rem' }}>🔺</span> Triangle fondamental :
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
                {/* Tronc - Objectif de vie */}
                {beneficiary.tronc && (
                  <Chip
                    label={formatMasterNumber(beneficiary.tronc)}
                    size="small"
                    sx={{
                      bgcolor: '#1976d2',
                      color: 'white',
                      fontWeight: 700,
                      fontSize: '1rem',
                      height: 36,
                      minWidth: 36,
                      '& .MuiChip-label': { px: 1.5 },
                    }}
                    title="Tronc (Objectif de vie)"
                  />
                )}

                {/* Racine 1 - Chemin de vie */}
                {beneficiary.racine_1 && (
                  <Chip
                    label={formatMasterNumber(beneficiary.racine_1)}
                    size="small"
                    sx={{
                      bgcolor: '#9c27b0',
                      color: 'white',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      height: 28,
                      minWidth: 28,
                      '& .MuiChip-label': { px: 1.2 },
                    }}
                    title="Racine 1 (Chemin de vie)"
                  />
                )}

                {/* Racine 2 - Expression */}
                {beneficiary.racine_2 && (
                  <Chip
                    label={formatMasterNumber(beneficiary.racine_2)}
                    size="small"
                    sx={{
                      bgcolor: '#9c27b0',
                      color: 'white',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      height: 28,
                      minWidth: 28,
                      '& .MuiChip-label': { px: 1.2 },
                    }}
                    title="Racine 2 (Expression)"
                  />
                )}

                {/* Dynamique de vie */}
                {beneficiary.dynamique_de_vie ? (
                  <Chip
                    label={formatMasterNumber(beneficiary.dynamique_de_vie)}
                    size="small"
                    variant="outlined"
                    sx={{
                      borderColor: '#f57c00',
                      color: '#f57c00',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      height: 28,
                      minWidth: 28,
                      '& .MuiChip-label': { px: 1.2 },
                    }}
                    title="Dynamique de vie"
                  />
                ) : (
                  <Chip
                    label="?"
                    size="small"
                    variant="outlined"
                    sx={{
                      borderColor: '#f57c00',
                      color: '#f57c00',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      height: 28,
                      minWidth: 28,
                      '& .MuiChip-label': { px: 1.2 },
                    }}
                    title="Dynamique de vie (à calculer)"
                  />
                )}
              </Box>
            </Box>
          )}

          {/* Arbre numérologique - Uniquement pour admin et intervenant */}
          {(userType === 'admin' || userType === 'intervenant') &&
           (beneficiary.ecorce || beneficiary.branche || beneficiary.feuille || beneficiary.fruit) && (
            <Box sx={{ mb: 1.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 500 }}>
                Arbre numérologique :
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
                {/* Écorce - Façon d'être perçu */}
                {beneficiary.ecorce && (
                  <Chip
                    label={formatMasterNumber(beneficiary.ecorce)}
                    size="small"
                    variant="outlined"
                    sx={{
                      borderColor: '#757575',
                      color: '#757575',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      height: 28,
                      minWidth: 28,
                      '& .MuiChip-label': { px: 1.2 },
                    }}
                    title="Écorce (Façon d'être perçu)"
                  />
                )}

                {/* Branche - Action/décision */}
                {beneficiary.branche && (
                  <Chip
                    label={formatMasterNumber(beneficiary.branche)}
                    size="small"
                    variant="outlined"
                    sx={{
                      borderColor: '#2e7d32',
                      color: '#2e7d32',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      height: 28,
                      minWidth: 28,
                      '& .MuiChip-label': { px: 1.2 },
                    }}
                    title="Branche (Action/décision)"
                  />
                )}

                {/* Feuille - Besoins affectifs */}
                {beneficiary.feuille && (
                  <Chip
                    label={formatMasterNumber(beneficiary.feuille)}
                    size="small"
                    variant="outlined"
                    sx={{
                      borderColor: '#66bb6a',
                      color: '#66bb6a',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      height: 28,
                      minWidth: 28,
                      '& .MuiChip-label': { px: 1.2 },
                    }}
                    title="Feuille (Besoins affectifs - privé)"
                  />
                )}

                {/* Fruit - Besoins de réalisation */}
                {beneficiary.fruit && (
                  <Chip
                    label={formatMasterNumber(beneficiary.fruit)}
                    size="small"
                    variant="outlined"
                    sx={{
                      borderColor: '#795548',
                      color: '#795548',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      height: 28,
                      minWidth: 28,
                      '& .MuiChip-label': { px: 1.2 },
                    }}
                    title="Fruit (Besoins de réalisation - professionnel)"
                  />
                )}
              </Box>
            </Box>
          )}

          {/* Nombre de rendez-vous */}
          {beneficiary.appointments_count !== undefined && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PersonIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary">
                {beneficiary.appointments_count} rendez-vous
              </Typography>
            </Box>
          )}

          {/* Raccourcis vers les documents */}
          {Object.keys(availableDocuments).length > 0 && (
            <Box sx={{ mt: 1.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 500 }}>
                Documents disponibles :
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {/* Arbre */}
                {availableDocuments.arbre && (
                  <Tooltip title={`Cliquer pour ouvrir l'Arbre${availableDocuments.arbre.visibility === 'public' ? '' : ' (privé)'}`}>
                    <Chip
                      icon={availableDocuments.arbre.visibility === 'public' ? <PublicIcon /> : <LockIcon />}
                      label={DOCUMENT_TYPE_LABELS.arbre}
                      size="small"
                      onClick={(e) => handleDocumentClick(availableDocuments.arbre, e)}
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
                {availableDocuments.arbre_detail && (
                  <Tooltip title={`Cliquer pour ouvrir l'Arbre Détail${availableDocuments.arbre_detail.visibility === 'public' ? '' : ' (privé)'}`}>
                    <Chip
                      icon={availableDocuments.arbre_detail.visibility === 'public' ? <PublicIcon /> : <LockIcon />}
                      label={DOCUMENT_TYPE_LABELS.arbre_detail}
                      size="small"
                      onClick={(e) => handleDocumentClick(availableDocuments.arbre_detail, e)}
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
                {availableDocuments.plan_de_vie && (
                  <Tooltip title={`Cliquer pour ouvrir le Plan de vie${availableDocuments.plan_de_vie.visibility === 'public' ? '' : ' (privé)'}`}>
                    <Chip
                      icon={availableDocuments.plan_de_vie.visibility === 'public' ? <PublicIcon /> : <LockIcon />}
                      label={DOCUMENT_TYPE_LABELS.plan_de_vie}
                      size="small"
                      onClick={(e) => handleDocumentClick(availableDocuments.plan_de_vie, e)}
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
        </Box>
      </CardContent>
    </Card>
  );
};
