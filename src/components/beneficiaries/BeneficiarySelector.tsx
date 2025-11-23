// src/components/beneficiaries/BeneficiarySelector.tsx
import React, { useState } from 'react';
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

  // Convertir les IDs en objets bénéficiaires
  const selectedBeneficiaries = beneficiaries.filter((b) => value.includes(b.id));

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
        options={beneficiaries}
        getOptionLabel={getOptionLabel}
        disabled={disabled || !canAddMore}
        isOptionEqualToValue={(option, val) => option.id === val.id}
        noOptionsText="Aucun bénéficiaire trouvé"
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
          return (
            <Box component="li" key={key} {...otherProps} sx={{ gap: 2 }}>
              <Avatar
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: 'primary.main',
                  fontSize: '0.9rem',
                }}
              >
                {beneficiary.first_name.charAt(0)}
                {beneficiary.last_name.charAt(0)}
              </Avatar>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {beneficiary.first_name} {beneficiary.last_name}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <CakeIcon sx={{ fontSize: 14 }} />
                    {calculateAge(beneficiary.birth_date)} ans
                  </Typography>
                  {beneficiary.relationship !== 'owner' && beneficiary.relationship !== 'self' && (
                    <Chip label={beneficiary.relationship} size="small" sx={{ height: 18, fontSize: '0.7rem' }} />
                  )}
                </Box>
              </Box>
            </Box>
          );
        }}
        renderTags={(tagValue, getTagProps) =>
          tagValue.map((beneficiary, index) => {
            const { key, ...tagProps } = getTagProps({ index });
            return (
              <Chip
                key={key}
                label={`${beneficiary.first_name} ${beneficiary.last_name}`}
                {...tagProps}
                avatar={
                  <Avatar sx={{ bgcolor: 'primary.main', fontSize: '0.75rem' }}>
                    {beneficiary.first_name.charAt(0)}
                  </Avatar>
                }
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
