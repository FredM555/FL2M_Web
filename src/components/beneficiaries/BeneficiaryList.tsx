// src/components/beneficiaries/BeneficiaryList.tsx
import React, { useState, useMemo } from 'react';
import {
  Box,
  Grid,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Typography,
  Button,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import { BeneficiaryWithAccess } from '../../types/beneficiary';
import { BeneficiaryCard } from './BeneficiaryCard';

interface BeneficiaryListProps {
  beneficiaries: BeneficiaryWithAccess[];
  loading?: boolean;
  error?: string | null;
  onAdd?: () => void;
  onEdit?: (beneficiary: BeneficiaryWithAccess) => void;
  onDelete?: (beneficiary: BeneficiaryWithAccess) => void;
  onShare?: (beneficiary: BeneficiaryWithAccess) => void;
  onClick?: (beneficiary: BeneficiaryWithAccess) => void;
  userType?: 'admin' | 'intervenant' | 'client';
}

type SortOption = 'relationship' | 'name_asc' | 'name_desc' | 'age_asc' | 'age_desc' | 'rdv_desc';
type RelationFilter = 'all' | 'owner' | 'self' | 'child' | 'spouse' | 'partner' | 'other';

/**
 * Composant liste de bénéficiaires avec filtres et recherche
 */
export const BeneficiaryList: React.FC<BeneficiaryListProps> = ({
  beneficiaries,
  loading = false,
  error = null,
  onAdd,
  onEdit,
  onDelete,
  onShare,
  onClick,
  userType = 'client',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [relationFilter, setRelationFilter] = useState<RelationFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('relationship');
  const [showFilters, setShowFilters] = useState(false);

  // Fonction de tri
  const sortBeneficiaries = (
    list: BeneficiaryWithAccess[],
    sortOption: SortOption
  ): BeneficiaryWithAccess[] => {
    const sorted = [...list];

    switch (sortOption) {
      case 'relationship':
        // Trier par type de relation
        const relationshipOrder: Record<string, number> = {
          'owner': 0,
          'self': 1,
          'spouse': 2,
          'child': 3,
          'parent': 4,
          'sibling': 5,
          'grandparent': 6,
          'grandchild': 7,
          'other': 8,
        };
        return sorted.sort((a, b) => {
          const orderA = relationshipOrder[a.relationship] ?? 999;
          const orderB = relationshipOrder[b.relationship] ?? 999;
          return orderA - orderB;
        });
      case 'name_asc':
        return sorted.sort((a, b) =>
          `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)
        );
      case 'name_desc':
        return sorted.sort((a, b) =>
          `${b.first_name} ${b.last_name}`.localeCompare(`${a.first_name} ${a.last_name}`)
        );
      case 'age_asc':
        return sorted.sort((a, b) =>
          new Date(b.birth_date).getTime() - new Date(a.birth_date).getTime()
        );
      case 'age_desc':
        return sorted.sort((a, b) =>
          new Date(a.birth_date).getTime() - new Date(b.birth_date).getTime()
        );
      case 'rdv_desc':
        return sorted.sort(
          (a, b) => (b.appointments_count || 0) - (a.appointments_count || 0)
        );
      default:
        return sorted;
    }
  };

  // Filtrer et trier les bénéficiaires
  const filteredBeneficiaries = useMemo(() => {
    let filtered = beneficiaries;

    // Filtre de recherche
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (b) =>
          b.first_name.toLowerCase().includes(query) ||
          b.last_name.toLowerCase().includes(query) ||
          (b.middle_names && b.middle_names.toLowerCase().includes(query)) ||
          (b.email && b.email.toLowerCase().includes(query))
      );
    }

    // Filtre de relation
    if (relationFilter !== 'all') {
      filtered = filtered.filter((b) => b.relationship === relationFilter);
    }

    // Tri
    return sortBeneficiaries(filtered, sortBy);
  }, [beneficiaries, searchQuery, relationFilter, sortBy]);

  // Compteurs pour les badges
  const counts = useMemo(() => {
    return {
      total: beneficiaries.length,
      self: beneficiaries.filter((b) => b.relationship === 'self').length,
      shared: beneficiaries.filter((b) => !b.is_owner).length,
    };
  }, [beneficiaries]);

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 400,
        }}
      >
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
      {/* En-tête avec bouton et statistiques */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
            Mes bénéficiaires
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip label={`${counts.total} total`} size="small" />
            {counts.self > 0 && (
              <Chip label={`${counts.self} moi`} size="small" color="primary" />
            )}
            {counts.shared > 0 && (
              <Chip label={`${counts.shared} partagé`} size="small" color="secondary" />
            )}
          </Box>
        </Box>

        {onAdd && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={onAdd}
            sx={{
              background: 'linear-gradient(45deg, #345995, #1D3461)',
              '&:hover': {
                background: 'linear-gradient(45deg, #1D3461, #345995)',
              },
            }}
          >
            Nouveau bénéficiaire
          </Button>
        )}
      </Box>

      {/* Légende Triangle fondamental */}
      <Box
        sx={{
          mb: 3,
          p: 2,
          bgcolor: 'grey.50',
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'grey.300',
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <span style={{ fontSize: '1.5rem' }}>🔺</span> Triangle fondamental :
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Chip
              label="T"
              size="small"
              sx={{
                bgcolor: '#1976d2',
                color: 'white',
                fontWeight: 700,
                fontSize: '0.7rem',
                height: 22,
                minWidth: 22,
              }}
            />
            <Typography variant="caption" color="text.secondary">
              Tronc (Objectif de vie)
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Chip
              label="R1"
              size="small"
              sx={{
                bgcolor: '#9c27b0',
                color: 'white',
                fontWeight: 700,
                fontSize: '0.7rem',
                height: 22,
                minWidth: 24,
              }}
            />
            <Typography variant="caption" color="text.secondary">
              Racine 1 (Chemin de vie)
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Chip
              label="R2"
              size="small"
              sx={{
                bgcolor: '#9c27b0',
                color: 'white',
                fontWeight: 700,
                fontSize: '0.7rem',
                height: 22,
                minWidth: 24,
              }}
            />
            <Typography variant="caption" color="text.secondary">
              Racine 2 (Expression)
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Chip
              label="D"
              size="small"
              variant="outlined"
              sx={{
                borderColor: '#f57c00',
                color: '#f57c00',
                fontWeight: 700,
                fontSize: '0.7rem',
                height: 22,
                minWidth: 22,
              }}
            />
            <Typography variant="caption" color="text.secondary">
              Dynamique de vie
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Légende Arbre numérologique - Uniquement pour admin et intervenant */}
      {(userType === 'admin' || userType === 'intervenant') && (
        <Box
          sx={{
            mb: 3,
            p: 2,
            bgcolor: 'grey.50',
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'grey.300',
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
            🌳 Arbre numérologique :
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Chip
                label="E"
                size="small"
                variant="outlined"
                sx={{
                  borderColor: '#757575',
                  color: '#757575',
                  fontWeight: 700,
                  fontSize: '0.7rem',
                  height: 22,
                  minWidth: 22,
                }}
              />
              <Typography variant="caption" color="text.secondary">
                Écorce (Façon d'être perçu)
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Chip
                label="B"
                size="small"
                variant="outlined"
                sx={{
                  borderColor: '#2e7d32',
                  color: '#2e7d32',
                  fontWeight: 700,
                  fontSize: '0.7rem',
                  height: 22,
                  minWidth: 22,
                }}
              />
              <Typography variant="caption" color="text.secondary">
                Branche (Action/décision)
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Chip
                label="F"
                size="small"
                variant="outlined"
                sx={{
                  borderColor: '#66bb6a',
                  color: '#66bb6a',
                  fontWeight: 700,
                  fontSize: '0.7rem',
                  height: 22,
                  minWidth: 22,
                }}
              />
              <Typography variant="caption" color="text.secondary">
                Feuille (Besoins affectifs - privé)
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Chip
                label="Fr"
                size="small"
                variant="outlined"
                sx={{
                  borderColor: '#795548',
                  color: '#795548',
                  fontWeight: 700,
                  fontSize: '0.7rem',
                  height: 22,
                  minWidth: 24,
                }}
              />
              <Typography variant="caption" color="text.secondary">
                Fruit (Besoins de réalisation - professionnel)
              </Typography>
            </Box>
          </Box>
        </Box>
      )}

      {/* Barre de recherche et filtres */}
      <Box sx={{ mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder="Rechercher par nom, prénom ou email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Relation</InputLabel>
              <Select
                value={relationFilter}
                label="Relation"
                onChange={(e) => setRelationFilter(e.target.value as RelationFilter)}
              >
                <MenuItem value="all">Toutes les relations</MenuItem>
                <MenuItem value="owner">Moi-même</MenuItem>
                <MenuItem value="child">Enfants</MenuItem>
                <MenuItem value="spouse">Conjoint(e)</MenuItem>
                <MenuItem value="partner">Partenaire</MenuItem>
                <MenuItem value="other">Autres</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Trier par</InputLabel>
              <Select
                value={sortBy}
                label="Trier par"
                onChange={(e) => setSortBy(e.target.value as SortOption)}
              >
                <MenuItem value="relationship">Type de relation</MenuItem>
                <MenuItem value="name_asc">Nom (A-Z)</MenuItem>
                <MenuItem value="name_desc">Nom (Z-A)</MenuItem>
                <MenuItem value="age_asc">Âge (croissant)</MenuItem>
                <MenuItem value="age_desc">Âge (décroissant)</MenuItem>
                <MenuItem value="rdv_desc">Nombre de RDV</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {/* Compteur de résultats */}
        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {filteredBeneficiaries.length} bénéficiaire
            {filteredBeneficiaries.length > 1 ? 's' : ''} affiché
            {filteredBeneficiaries.length > 1 ? 's' : ''}
          </Typography>
          {(searchQuery || relationFilter !== 'all') && (
            <Button
              size="small"
              onClick={() => {
                setSearchQuery('');
                setRelationFilter('all');
              }}
            >
              Réinitialiser les filtres
            </Button>
          )}
        </Box>
      </Box>

      {/* Grille de cartes */}
      {filteredBeneficiaries.length === 0 ? (
        <Box
          sx={{
            textAlign: 'center',
            py: 8,
            px: 2,
          }}
        >
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {searchQuery || relationFilter !== 'all'
              ? 'Aucun bénéficiaire trouvé'
              : 'Aucun bénéficiaire'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {searchQuery || relationFilter !== 'all'
              ? 'Essayez de modifier vos critères de recherche'
              : 'Commencez par ajouter votre premier bénéficiaire'}
          </Typography>
          {onAdd && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={onAdd}
              sx={{
                background: 'linear-gradient(45deg, #345995, #1D3461)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #1D3461, #345995)',
                },
              }}
            >
              Ajouter un bénéficiaire
            </Button>
          )}
        </Box>
      ) : (
        <Grid container spacing={3}>
          {filteredBeneficiaries.map((beneficiary) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={beneficiary.id}>
              <BeneficiaryCard
                beneficiary={beneficiary}
                onEdit={onEdit ? () => onEdit(beneficiary) : undefined}
                onDelete={onDelete ? () => onDelete(beneficiary) : undefined}
                onShare={onShare ? () => onShare(beneficiary) : undefined}
                onClick={onClick ? () => onClick(beneficiary) : undefined}
                userType={userType}
              />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};
