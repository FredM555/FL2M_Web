// src/components/admin/EditBillingInfoModal.tsx
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Divider
} from '@mui/material';
import ReceiptIcon from '@mui/icons-material/Receipt';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import { logger } from '../../utils/logger';

interface EditBillingInfoModalProps {
  open: boolean;
  onClose: () => void;
  practitionerId: string;
  practitionerName: string;
  currentBillingInfo: BillingInfo | null;
  onSuccess: () => void;
}

interface BillingInfo {
  billing_company_name?: string;
  billing_siret?: string;
  billing_address?: string;
  billing_postal_code?: string;
  billing_city?: string;
  billing_country?: string;
  billing_vat_number?: string;
  billing_email?: string;
  iban?: string;
}

const EditBillingInfoModal: React.FC<EditBillingInfoModalProps> = ({
  open,
  onClose,
  practitionerId,
  practitionerName,
  currentBillingInfo,
  onSuccess
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // États du formulaire
  const [companyName, setCompanyName] = useState('');
  const [siret, setSiret] = useState('');
  const [address, setAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('FR');
  const [vatNumber, setVatNumber] = useState('');
  const [billingEmail, setBillingEmail] = useState('');
  const [iban, setIban] = useState('');

  // Charger les données existantes
  useEffect(() => {
    if (currentBillingInfo) {
      setCompanyName(currentBillingInfo.billing_company_name || '');
      setSiret(currentBillingInfo.billing_siret || '');
      setAddress(currentBillingInfo.billing_address || '');
      setPostalCode(currentBillingInfo.billing_postal_code || '');
      setCity(currentBillingInfo.billing_city || '');
      setCountry(currentBillingInfo.billing_country || 'FR');
      setVatNumber(currentBillingInfo.billing_vat_number || '');
      setBillingEmail(currentBillingInfo.billing_email || '');
      setIban(currentBillingInfo.iban || '');
    }
  }, [currentBillingInfo, open]);

  const handleClose = () => {
    setError(null);
    setSuccess(false);
    onClose();
  };

  const handleSubmit = async () => {
    if (!user) {
      setError('Vous devez être connecté pour effectuer cette action');
      return;
    }

    // Validation basique
    if (!companyName.trim()) {
      setError('La raison sociale est obligatoire');
      return;
    }

    if (!iban.trim()) {
      setError('L\'IBAN est obligatoire pour effectuer les virements');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('practitioners')
        .update({
          billing_company_name: companyName.trim(),
          billing_siret: siret.trim() || null,
          billing_address: address.trim() || null,
          billing_postal_code: postalCode.trim() || null,
          billing_city: city.trim() || null,
          billing_country: country || 'FR',
          billing_vat_number: vatNumber.trim() || null,
          billing_email: billingEmail.trim() || null,
          iban: iban.trim(),
          updated_by: user.id
        })
        .eq('id', practitionerId);

      if (updateError) throw updateError;

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 1500);
    } catch (err: any) {
      logger.error('Erreur lors de la mise à jour des informations de facturation:', err);
      setError(err.message || 'Impossible de mettre à jour les informations');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3 }
      }}
    >
      <DialogTitle
        sx={{
          background: 'linear-gradient(135deg, #345995 0%, #1D3461 100%)',
          color: 'white'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <ReceiptIcon sx={{ mr: 1 }} />
          Informations de Facturation - {practitionerName}
        </Box>
      </DialogTitle>

      <DialogContent sx={{ mt: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            Informations de facturation mises à jour avec succès !
          </Alert>
        )}

        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Ces informations seront utilisées pour générer les factures et effectuer les virements.
        </Typography>

        <Grid container spacing={3}>
          {/* Informations entreprise */}
          <Grid item xs={12}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Informations Entreprise
            </Typography>
            <Divider />
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="Raison Sociale *"
              fullWidth
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Ex: SARL Dupont Consulting"
              helperText="Nom de l'entreprise ou nom complet si auto-entrepreneur"
              required
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              label="Numéro SIRET"
              fullWidth
              value={siret}
              onChange={(e) => {
                const value = e.target.value.replace(/\s/g, '');
                if (value.length <= 14 && /^\d*$/.test(value)) {
                  setSiret(value);
                }
              }}
              placeholder="12345678901234"
              helperText="14 chiffres (optionnel)"
              inputProps={{ maxLength: 14 }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              label="Numéro de TVA Intracommunautaire"
              fullWidth
              value={vatNumber}
              onChange={(e) => setVatNumber(e.target.value.toUpperCase())}
              placeholder="FR12345678901"
              helperText="Optionnel"
            />
          </Grid>

          {/* Adresse de facturation */}
          <Grid item xs={12}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, mt: 2 }}>
              Adresse de Facturation
            </Typography>
            <Divider />
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="Adresse"
              fullWidth
              multiline
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Numéro et nom de rue, bâtiment, etc."
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              label="Code Postal"
              fullWidth
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              placeholder="75001"
            />
          </Grid>

          <Grid item xs={12} md={5}>
            <TextField
              label="Ville"
              fullWidth
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Paris"
            />
          </Grid>

          <Grid item xs={12} md={3}>
            <TextField
              label="Pays"
              fullWidth
              value={country}
              onChange={(e) => setCountry(e.target.value.toUpperCase())}
              placeholder="FR"
              inputProps={{ maxLength: 2 }}
              helperText="Code ISO"
            />
          </Grid>

          {/* Coordonnées bancaires */}
          <Grid item xs={12}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, mt: 2 }}>
              Coordonnées Bancaires
            </Typography>
            <Divider />
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="IBAN *"
              fullWidth
              value={iban}
              onChange={(e) => setIban(e.target.value.toUpperCase().replace(/\s/g, ''))}
              placeholder="FR7612345678901234567890123"
              helperText="Compte bancaire pour recevoir les virements"
              required
              inputProps={{ maxLength: 34 }}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="Email de Facturation"
              fullWidth
              type="email"
              value={billingEmail}
              onChange={(e) => setBillingEmail(e.target.value)}
              placeholder="facturation@example.com"
              helperText="Email où seront envoyées les factures (optionnel, sinon email principal)"
            />
          </Grid>

          <Grid item xs={12}>
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>💡 Rappel :</strong> Les factures sont générées automatiquement chaque mois.
                Vous pouvez également demander une facture manuelle, mais au-delà de 2 factures par mois,
                des frais de 5€ par facture supplémentaire seront appliqués.
              </Typography>
            </Alert>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={handleClose} disabled={loading}>
          Annuler
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : <ReceiptIcon />}
          sx={{
            background: 'linear-gradient(45deg, #345995, #1D3461)',
            '&:hover': {
              background: 'linear-gradient(45deg, #1D3461, #345995)'
            }
          }}
        >
          {loading ? 'Enregistrement...' : 'Enregistrer'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditBillingInfoModal;
