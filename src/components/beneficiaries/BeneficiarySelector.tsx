// src/components/beneficiaries/BeneficiarySelector.tsx
import React, { useState, useMemo } from 'react';
import {
  Box,
  Autocomplete,
  TextField,
  Chip,
  Typography,
  Avatar,
  Alert,
} from '@mui/material';
import { CakeOutlined as CakeIcon } from '@mui/icons-material';
import { BeneficiaryWithAccess } from '../../types/beneficiary';
import { calculateAge } from '../../types/beneficiary';
import { NumerologyTriangleAvatar } from '../profile/NumerologyTriangleAvatar';

interface BeneficiarySelectorProps {
  beneficiaries: BeneficiaryWithAccess[];
  value: string[]; // IDs sélectionnés
  onChange: (ids: string[]) => void;
  maxBeneficiaries?: number; // 1 = individuel, 2 = couple, undefined = illimité
  allowCreate?: boolean;
  onCreateNew?: () => void;
  label?: string;
  placeholder?: string;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  required?: boolean;
}

/**
 * Composant de sélection de bénéficiaires avec autocomplete
 */
export const BeneficiarySelector: React.FC<BeneficiarySelectorProps> = ({
  beneficiaries,
  value,
  onChange,
  maxBeneficiaries,
  allowCreate = true,
  onCreateNew,
  label = 'Bénéficiaire(s)',
  placeholder = 'Rechercher ou sélectionner...',
  error,
  helperText,
  disabled = false,
  required = false,
}) => {
  const [inputValue, setInputValue] = useState('');

  // Trier les bénéficiaires par ordre de type de relation
  const sortedBeneficiaries = useMemo(() => {
    const relationshipOrder: Record<string, number> = {
      'owner': 0,
      'self': 1,  // Moi-même
      'spouse': 2, // Conjoint(e)
      'child': 3, // Enfant
      'parent': 4,
      'sibling': 5,
      'grandparent': 6,
      'grandchild': 7,
      'other': 8,
    };

    return [...beneficiaries].sort((a, b) => {
      const orderA = relationshipOrder[a.relationship] ?? 999;
      const orderB = relationshipOrder[b.relationship] ?? 999;
      return orderA - orderB;
    });
  }, [beneficiaries]);

  // Convertir les IDs en objets bénéficiaires
  const selectedBeneficiaries = sortedBeneficiaries.filter((b) => value.includes(b.id));

  // Gérer le changement de sélection
  const handleChange = (
    _event: any,
    newValue: BeneficiaryWithAccess | BeneficiaryWithAccess[] | null
  ) => {
    // Convertir en tableau
    const valueArray = Array.isArray(newValue)
      ? newValue
      : newValue
      ? [newValue]
      : [];

    // Limiter le nombre de sélections si maxBeneficiaries est défini
    if (maxBeneficiaries && valueArray.length > maxBeneficiaries) {
      return; // Ne rien faire si on dépasse la limite
    }
    onChange(valueArray.map((b) => b.id));
  };

  // Obtenir le label pour un bénéficiaire
  const getOptionLabel = (beneficiary: BeneficiaryWithAccess) => {
    return `${beneficiary.first_name} ${beneficiary.last_name}`;
  };

  // Traduire les relations en français avec emojis
  const translateRelationship = (relationship: string): string => {
    const translations: Record<string, string> = {
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
    return translations[relationship] || relationship;
  };

  // Obtenir la couleur de l'avatar basée sur le nom
  const getAvatarColor = (beneficiary: BeneficiaryWithAccess) => {
    const colors = [
      '#FF6B6B', // Rouge corail
      '#4ECDC4', // Turquoise
      '#45B7D1', // Bleu ciel
      '#FFA07A', // Saumon
      '#98D8C8', // Menthe
      '#F7DC6F', // Jaune doré
      '#BB8FCE', // Violet
      '#85C1E2', // Bleu pastel
      '#F8B195', // Pêche
      '#C06C84', // Rose
    ];
    const sum = beneficiary.first_name.charCodeAt(0) + beneficiary.last_name.charCodeAt(0);
    return colors[sum % colors.length];
  };

  // Vérifier si on peut encore ajouter des bénéficiaires
  const canAddMore = !maxBeneficiaries || selectedBeneficiaries.length < maxBeneficiaries;

  // Message d'aide dynamique
  const getHelperText = () => {
    if (error) return error;
    if (helperText) return helperText;
    if (maxBeneficiaries === 1) return 'Sélectionnez un bénéficiaire';
    if (maxBeneficiaries === 2)
      return `Sélectionnez 2 bénéficiaires (${selectedBeneficiaries.length}/2)`;
    return `${selectedBeneficiaries.length} bénéficiaire(s) sélectionné(s)`;
  };

  return (
    <Box>
      <Autocomplete
        multiple={maxBeneficiaries !== 1}
        value={maxBeneficiaries === 1 ? selectedBeneficiaries[0] || null : selectedBeneficiaries}
        onChange={handleChange}
        inputValue={inputValue}
        onInputChange={(_event, newInputValue) => setInputValue(newInputValue)}
        options={sortedBeneficiaries}
        getOptionLabel={getOptionLabel}
        disabled={disabled}
        isOptionEqualToValue={(option, val) => option.id === val.id}
        noOptionsText="Aucun bénéficiaire trouvé"
        limitTags={maxBeneficiaries}
        disableCloseOnSelect={maxBeneficiaries !== 1}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            placeholder={placeholder}
            error={Boolean(error)}
            helperText={getHelperText()}
            required={required}
          />
        )}
        renderOption={(props, beneficiary) => {
          const { key, ...otherProps } = props as any;
          const hasNumerologyData = beneficiary.tronc || beneficiary.racine_1 || beneficiary.racine_2;

          return (
            <Box component="li" key={key} {...otherProps} sx={{ gap: 2, py: 1 }}>
              {/* Avatar de numérologie ou classique coloré */}
              {hasNumerologyData ? (
                <Box sx={{ flexShrink: 0 }}>
                  <NumerologyTriangleAvatar
                    tronc={beneficiary.tronc ?? undefined}
                    racine1={beneficiary.racine_1 ?? undefined}
                    racine2={beneficiary.racine_2 ?? undefined}
                    dynamique_de_vie={beneficiary.dynamique_de_vie ?? undefined}
                    size={48}
                  />
                </Box>
              ) : (
                <Avatar
                  sx={{
                    width: 48,
                    height: 48,
                    bgcolor: getAvatarColor(beneficiary),
                    fontSize: '1rem',
                    fontWeight: 600,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  }}
                >
                  {beneficiary.first_name.charAt(0)}
                  {beneficiary.last_name.charAt(0)}
                </Avatar>
              )}

              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5 }}>
                  {beneficiary.first_name} {beneficiary.last_name}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Chip
                    icon={<CakeIcon />}
                    label={`${calculateAge(beneficiary.birth_date)} ans`}
                    size="small"
                    variant="outlined"
                    sx={{
                      height: 22,
                      fontSize: '0.75rem',
                      borderColor: getAvatarColor(beneficiary),
                      color: getAvatarColor(beneficiary),
                    }}
                  />
                  {beneficiary.relationship && beneficiary.relationship !== 'owner' && (
                    <Chip
                      label={translateRelationship(beneficiary.relationship)}
                      size="small"
                      sx={{
                        height: 22,
                        fontSize: '0.75rem',
                        bgcolor: `${getAvatarColor(beneficiary)}20`,
                        color: getAvatarColor(beneficiary),
                        fontWeight: 500,
                      }}
                    />
                  )}
                </Box>
              </Box>
            </Box>
          );
        }}
        renderTags={(tagValue, getTagProps) =>
          tagValue.map((beneficiary, index) => {
            const { key, ...tagProps } = getTagProps({ index });
            const hasNumerologyData = beneficiary.tronc || beneficiary.racine_1 || beneficiary.racine_2;

            return (
              <Chip
                key={key}
                label={`${beneficiary.first_name} ${beneficiary.last_name}`}
                {...tagProps}
                avatar={
                  hasNumerologyData ? (
                    <Box
                      sx={{
                        width: 24,
                        height: 24,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        ml: 0.5,
                      }}
                    >
                      <NumerologyTriangleAvatar
                        tronc={beneficiary.tronc ?? undefined}
                        racine1={beneficiary.racine_1 ?? undefined}
                        racine2={beneficiary.racine_2 ?? undefined}
                        dynamique_de_vie={beneficiary.dynamique_de_vie ?? undefined}
                        size={20}
                      />
                    </Box>
                  ) : (
                    <Avatar
                      sx={{
                        bgcolor: getAvatarColor(beneficiary),
                        fontSize: '0.75rem',
                        fontWeight: 600,
                      }}
                    >
                      {beneficiary.first_name.charAt(0)}
                    </Avatar>
                  )
                }
                sx={{
                  height: 32,
                  bgcolor: `${getAvatarColor(beneficiary)}15`,
                  borderColor: getAvatarColor(beneficiary),
                  color: getAvatarColor(beneficiary),
                  fontWeight: 500,
                  '& .MuiChip-deleteIcon': {
                    color: getAvatarColor(beneficiary),
                  },
                }}
              />
            );
          })
        }
      />

      {/* Alertes de limite */}
      {maxBeneficiaries && selectedBeneficiaries.length >= maxBeneficiaries && (
        <Alert severity="info" sx={{ mt: 1 }}>
          {maxBeneficiaries === 1
            ? 'Un seul bénéficiaire peut être sélectionné pour ce type de rendez-vous.'
            : `Maximum ${maxBeneficiaries} bénéficiaires atteint.`}
        </Alert>
      )}

      {/* Alerte si requis et vide */}
      {required && selectedBeneficiaries.length === 0 && error && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {error}
        </Alert>
      )}
    </Box>
  );
};
