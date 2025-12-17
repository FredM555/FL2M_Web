// src/components/beneficiaries/BeneficiaryForm.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Grid,
  Divider,
  CircularProgress,
  FormControlLabel,
  Checkbox,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  ExpandMore as ExpandMoreIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import { Formik, Form, FormikHelpers } from 'formik';
import * as Yup from 'yup';
import { Beneficiary, BeneficiaryWithAccess, CreateBeneficiaryData, UpdateBeneficiaryData, BeneficiaryRelationship } from '../../types/beneficiary';
import { canModifyBeneficiaryIdentity } from '../../services/beneficiaries';
import { logger } from '../../utils/logger';

interface BeneficiaryFormProps {
  beneficiary?: Beneficiary | BeneficiaryWithAccess; // undefined = création, défini = édition
  onSave: (data: CreateBeneficiaryData | UpdateBeneficiaryData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  userType?: 'admin' | 'intervenant' | 'client';
}

// Schéma de validation
const validationSchema = Yup.object({
  first_name: Yup.string()
    .required('Le prénom est requis')
    .min(2, 'Le prénom doit contenir au moins 2 caractères')
    .max(100, 'Le prénom ne peut pas dépasser 100 caractères'),

  middle_names: Yup.string()
    .max(200, 'Les prénoms ne peuvent pas dépasser 200 caractères'),

  last_name: Yup.string()
    .required('Le nom de famille est requis')
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(100, 'Le nom ne peut pas dépasser 100 caractères'),

  birth_date: Yup.date()
    .required('La date de naissance est requise')
    .max(new Date(), 'La date de naissance ne peut pas être dans le futur'),

  relationship: Yup.string()
    .required('Le type de relation est requis')
    .oneOf(['self', 'child', 'spouse', 'parent', 'sibling', 'grandparent', 'grandchild', 'other'], 'Type de relation invalide'),

  email: Yup.string()
    .email('Adresse email invalide')
    .max(255, 'L\'email ne peut pas dépasser 255 caractères'),

  phone: Yup.string()
    .max(20, 'Le numéro de téléphone ne peut pas dépasser 20 caractères'),

  notifications_enabled: Yup.boolean(),

  // Numérologie
  tronc: Yup.number()
    .test('valid-tronc', 'Doit être entre 1-9 ou un nombre maître (11, 22, 33)', (value) => {
      if (value === null || value === undefined) return true;
      return (value >= 1 && value <= 9) || value === 11 || value === 22 || value === 33;
    })
    .nullable(),

  racine_1: Yup.number()
    .test('valid-racine1', 'Doit être entre 1-9 ou un nombre maître (11, 22, 33)', (value) => {
      if (value === null || value === undefined) return true;
      return (value >= 1 && value <= 9) || value === 11 || value === 22 || value === 33;
    })
    .nullable(),

  racine_2: Yup.number()
    .test('valid-racine2', 'Doit être entre 1-9 ou un nombre maître (11, 22, 33)', (value) => {
      if (value === null || value === undefined) return true;
      return (value >= 1 && value <= 9) || value === 11 || value === 22 || value === 33;
    })
    .nullable(),

  dynamique_de_vie: Yup.number().nullable(),
  ecorce: Yup.number().nullable(),
  branche: Yup.number().nullable(),
  feuille: Yup.number().nullable(),
  fruit: Yup.number().nullable(),

  notes: Yup.string(),
});

/**
 * Formulaire de création/édition de bénéficiaire
 */
export const BeneficiaryForm: React.FC<BeneficiaryFormProps> = ({
  beneficiary,
  onSave,
  onCancel,
  loading = false,
  userType = 'client',
}) => {
  const [expandedSections, setExpandedSections] = useState<string[]>([
    'identity', // Section identité toujours ouverte par défaut
  ]);
  const [canModifyIdentity, setCanModifyIdentity] = useState(true);

  const isEditMode = !!beneficiary;
  const canEditSensitiveData = userType === 'admin' || userType === 'intervenant';

  // Vérifier si le bénéficiaire peut être modifié
  useEffect(() => {
    const checkModificationPermissions = async () => {
      if (!beneficiary?.id) return;

      try {
        const { canModify } = await canModifyBeneficiaryIdentity(beneficiary.id);
        setCanModifyIdentity(canModify);
      } catch (error) {
        logger.error('Erreur lors de la vérification des permissions:', error);
        // En cas d'erreur, autoriser la modification par défaut
        setCanModifyIdentity(true);
      }
    };

    if (isEditMode && beneficiary?.id) {
      checkModificationPermissions();
    }
  }, [isEditMode, beneficiary?.id]);

  // Valeurs initiales
  const initialValues = {
    first_name: beneficiary?.first_name || '',
    middle_names: beneficiary?.middle_names || '',
    last_name: beneficiary?.last_name || '',
    birth_date: beneficiary?.birth_date || '',
    relationship: ((beneficiary as BeneficiaryWithAccess)?.relationship as BeneficiaryRelationship) || 'other',
    email: beneficiary?.email || '',
    phone: beneficiary?.phone || '',
    notifications_enabled: beneficiary?.notifications_enabled || false,
    tronc: beneficiary?.tronc || null,
    racine_1: beneficiary?.racine_1 || null,
    racine_2: beneficiary?.racine_2 || null,
    dynamique_de_vie: beneficiary?.dynamique_de_vie || null,
    ecorce: beneficiary?.ecorce || null,
    branche: beneficiary?.branche || null,
    feuille: beneficiary?.feuille || null,
    fruit: beneficiary?.fruit || null,
    notes: beneficiary?.notes || '',
  };

  const handleSubmit = async (
    values: typeof initialValues,
    { setSubmitting }: FormikHelpers<typeof initialValues>
  ) => {
    logger.debug('🔵 BeneficiaryForm - handleSubmit appelé');
    logger.debug('🔵 Valeurs du formulaire:', values);

    try {
      // Nettoyer les valeurs vides
      const cleanedValues = Object.fromEntries(
        Object.entries(values).map(([key, value]) => [
          key,
          value === '' ? null : value,
        ])
      );

      logger.debug('🔵 Valeurs nettoyées:', cleanedValues);
      logger.debug('🔵 Appel de onSave...');

      await onSave(cleanedValues as unknown as CreateBeneficiaryData);

      logger.debug('✅ onSave terminé avec succès');
    } catch (error) {
      logger.error('❌ Erreur lors de la sauvegarde:', error);
      // Relancer l'erreur pour que Formik puisse la gérer
      throw error;
    } finally {
      logger.debug('🔵 setSubmitting(false)');
      setSubmitting(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section]
    );
  };

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={handleSubmit}
      enableReinitialize
    >
      {({ values, errors, touched, handleChange, handleBlur, isSubmitting }) => (
        <Form>
          <Box sx={{ maxWidth: 800, mx: 'auto' }}>
            {/* En-tête */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="h5" gutterBottom>
                {isEditMode ? 'Modifier le bénéficiaire' : 'Nouveau bénéficiaire'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {isEditMode
                  ? 'Modifiez les informations du bénéficiaire'
                  : 'Renseignez les informations du bénéficiaire'}
              </Typography>
            </Box>

            {/* Section 1: Identité */}
            <Accordion
              expanded={expandedSections.includes('identity')}
              onChange={() => toggleSection('identity')}
              sx={{ mb: 2 }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  1. Identité (obligatoire)
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Alert severity="info" sx={{ mb: 2 }}>
                      Pour les personnes mariées, divorcées ou adoptées, utilisez toujours les
                      <strong> informations de naissance</strong>.
                    </Alert>
                  </Grid>

                  {isEditMode && !canModifyIdentity && (
                    <Grid item xs={12}>
                      <Alert severity="warning" icon={<LockIcon />} sx={{ mb: 2 }}>
                        <strong>Données d'identité verrouillées</strong>
                        <br />
                        Les données d'identité (nom, prénom, date de naissance) ne peuvent plus être modifiées car au moins une étude a été réalisée pour ce bénéficiaire.
                      </Alert>
                    </Grid>
                  )}

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      name="first_name"
                      label="Prénom(s) *"
                      value={values.first_name}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={touched.first_name && Boolean(errors.first_name)}
                      helperText={
                        (touched.first_name && errors.first_name) ||
                        (!canModifyIdentity ? 'Verrouillé - Étude réalisée' : 'Tous les prénoms de naissance')
                      }
                      disabled={isSubmitting || loading || !canModifyIdentity}
                      InputProps={{
                        endAdornment: !canModifyIdentity ? <LockIcon sx={{ color: 'text.disabled' }} /> : undefined
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      name="last_name"
                      label="Nom de famille *"
                      value={values.last_name}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={touched.last_name && Boolean(errors.last_name)}
                      helperText={
                        (touched.last_name && errors.last_name) ||
                        (!canModifyIdentity ? 'Verrouillé - Étude réalisée' : 'Nom de famille complet de naissance')
                      }
                      disabled={isSubmitting || loading || !canModifyIdentity}
                      InputProps={{
                        endAdornment: !canModifyIdentity ? <LockIcon sx={{ color: 'text.disabled' }} /> : undefined
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      name="birth_date"
                      label="Date de naissance *"
                      type="date"
                      value={values.birth_date}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={touched.birth_date && Boolean(errors.birth_date)}
                      helperText={
                        (touched.birth_date && errors.birth_date) ||
                        (!canModifyIdentity ? 'Verrouillé - Étude réalisée' : undefined)
                      }
                      disabled={isSubmitting || loading || !canModifyIdentity}
                      InputLabelProps={{ shrink: true }}
                      InputProps={{
                        endAdornment: !canModifyIdentity ? <LockIcon sx={{ color: 'text.disabled' }} /> : undefined
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel id="relationship-label">Type de relation *</InputLabel>
                      <Select
                        labelId="relationship-label"
                        name="relationship"
                        value={values.relationship}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={touched.relationship && Boolean(errors.relationship)}
                        disabled={isSubmitting || loading}
                        label="Type de relation *"
                      >
                        <MenuItem value="self">1 - Moi-même</MenuItem>
                        <MenuItem value="spouse">2 - Conjoint(e)</MenuItem>
                        <MenuItem value="child">3 - Enfant</MenuItem>
                        <MenuItem value="parent">4 - Parent</MenuItem>
                        <MenuItem value="sibling">5 - Frère/Sœur</MenuItem>
                        <MenuItem value="grandparent">6 - Grand-parent</MenuItem>
                        <MenuItem value="grandchild">7 - Petit-enfant</MenuItem>
                        <MenuItem value="other">8 - Autre</MenuItem>
                      </Select>
                      {touched.relationship && errors.relationship && (
                        <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                          {errors.relationship}
                        </Typography>
                      )}
                    </FormControl>
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* Section 2: Contact */}
            <Accordion
              expanded={expandedSections.includes('contact')}
              onChange={() => toggleSection('contact')}
              sx={{ mb: 2 }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  2. Contact (optionnel)
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      name="email"
                      label="Email"
                      type="email"
                      value={values.email}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={touched.email && Boolean(errors.email)}
                      helperText={
                        (touched.email && errors.email) ||
                        'Pour recevoir les confirmations et rappels'
                      }
                      disabled={isSubmitting || loading}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      name="phone"
                      label="Téléphone"
                      type="tel"
                      value={values.phone}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={touched.phone && Boolean(errors.phone)}
                      helperText={touched.phone && errors.phone}
                      disabled={isSubmitting || loading}
                    />
                  </Grid>

                  {values.email && (
                    <Grid item xs={12}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            name="notifications_enabled"
                            checked={values.notifications_enabled}
                            onChange={handleChange}
                            disabled={isSubmitting || loading}
                          />
                        }
                        label="J'accepte de recevoir des notifications par email (confirmations, rappels, documents) - Consentement RGPD"
                      />
                    </Grid>
                  )}
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* Section 3: Numérologie - Uniquement pour admin et intervenant */}
            {canEditSensitiveData && (
              <Accordion
                expanded={expandedSections.includes('numerology')}
                onChange={() => toggleSection('numerology')}
                sx={{ mb: 2 }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    3. Données de numérologie (optionnel)
                  </Typography>
                </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      name="tronc"
                      label="Objectif de vie (Tronc)"
                      type="number"
                      value={values.tronc || ''}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={touched.tronc && Boolean(errors.tronc)}
                      helperText={
                        (touched.tronc && errors.tronc) || 'Calculé automatiquement (1-9, 11, 22, 33)'
                      }
                      disabled={isSubmitting || loading}
                      inputProps={{ min: 1, max: 99 }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={3}>
                    <TextField
                      fullWidth
                      name="racine_1"
                      label="Chemin de vie (Racine 1)"
                      type="number"
                      value={values.racine_1 || ''}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={touched.racine_1 && Boolean(errors.racine_1)}
                      helperText={(touched.racine_1 && errors.racine_1) || 'Calculé automatiquement (1-9, 11, 22, 33)'}
                      disabled={isSubmitting || loading}
                      inputProps={{ min: 1, max: 99 }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={3}>
                    <TextField
                      fullWidth
                      name="racine_2"
                      label="Expression (Racine 2)"
                      type="number"
                      value={values.racine_2 || ''}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={touched.racine_2 && Boolean(errors.racine_2)}
                      helperText={(touched.racine_2 && errors.racine_2) || 'Calculé automatiquement (1-9, 11, 22, 33)'}
                      disabled={isSubmitting || loading}
                      inputProps={{ min: 1, max: 99 }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      name="dynamique_de_vie"
                      label="Dynamique de vie"
                      type="number"
                      value={values.dynamique_de_vie || ''}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      disabled={isSubmitting || loading}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      name="ecorce"
                      label="Écorce"
                      type="number"
                      value={values.ecorce || ''}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      disabled={isSubmitting || loading}
                    />
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      name="branche"
                      label="Branche"
                      type="number"
                      value={values.branche || ''}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      disabled={isSubmitting || loading}
                    />
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      name="feuille"
                      label="Feuille"
                      type="number"
                      value={values.feuille || ''}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      disabled={isSubmitting || loading}
                    />
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      name="fruit"
                      label="Fruit"
                      type="number"
                      value={values.fruit || ''}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      disabled={isSubmitting || loading}
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
              </Accordion>
            )}

            {/* Section 4: Notes - Uniquement pour admin et intervenant */}
            {canEditSensitiveData && (
              <Accordion
              expanded={expandedSections.includes('notes')}
              onChange={() => toggleSection('notes')}
              sx={{ mb: 3 }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  4. Notes (optionnel)
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <TextField
                  fullWidth
                  name="notes"
                  label="Notes générales"
                  multiline
                  rows={4}
                  value={values.notes}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  disabled={isSubmitting || loading}
                  placeholder="Informations complémentaires sur le bénéficiaire..."
                />
              </AccordionDetails>
              </Accordion>
            )}

            <Divider sx={{ my: 3 }} />

            {/* Boutons d'action */}
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                startIcon={<CancelIcon />}
                onClick={onCancel}
                disabled={isSubmitting || loading}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                variant="contained"
                startIcon={
                  isSubmitting || loading ? <CircularProgress size={20} /> : <SaveIcon />
                }
                disabled={isSubmitting || loading}
                sx={{
                  background: 'linear-gradient(45deg, #345995, #1D3461)',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #1D3461, #345995)',
                  },
                }}
              >
                {isSubmitting || loading
                  ? 'Enregistrement...'
                  : isEditMode
                  ? 'Enregistrer'
                  : 'Créer'}
              </Button>
            </Box>
          </Box>
        </Form>
      )}
    </Formik>
  );
};
