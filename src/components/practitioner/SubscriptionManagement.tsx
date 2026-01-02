// src/components/practitioner/SubscriptionManagement.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Chip,
  Grid,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  TextField
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ScheduleIcon from '@mui/icons-material/Schedule';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import InfoIcon from '@mui/icons-material/Info';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import ContractTypeSelector from '../admin/ContractTypeSelector';
import { ContractType, CONTRACT_CONFIGS, formatAmount, PractitionerContract } from '../../types/payments';
import { STRIPE_PRICE_IDS } from '../../services/stripe';
import { supabase } from '../../services/supabase';
import { logger } from '../../utils/logger';

interface SubscriptionManagementProps {
  practitionerId: string;
}

const SubscriptionManagement: React.FC<SubscriptionManagementProps> = ({ practitionerId }) => {
  const [currentContract, setCurrentContract] = useState<PractitionerContract | null>(null);
  const [upcomingContract, setUpcomingContract] = useState<PractitionerContract | null>(null);
  const [pastContracts, setPastContracts] = useState<PractitionerContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [changeDialogOpen, setChangeDialogOpen] = useState(false);
  const [selectedNewType, setSelectedNewType] = useState<ContractType>('standard'); // Seul type disponible
  const [submitting, setSubmitting] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelSubscriptionDialogOpen, setCancelSubscriptionDialogOpen] = useState(false);
  const [cancelingSubscription, setCancelingSubscription] = useState(false);
  const [reactivating, setReactivating] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoCodeError, setPromoCodeError] = useState<string | null>(null);

  useEffect(() => {
    loadCurrentContract();
  }, [practitionerId]);

  const loadCurrentContract = async () => {
    setLoading(true);
    setError(null);

    try {
      const today = new Date().toISOString().split('T')[0];

      // Récupérer le contrat actif (celui dont la période couvre aujourd'hui)
      const { data: currentData, error: currentError } = await supabase
        .from('practitioner_contracts')
        .select('*')
        .eq('practitioner_id', practitionerId)
        .eq('status', 'active')
        .lte('start_date', today) // Commence avant ou aujourd'hui
        .or(`end_date.is.null,end_date.gte.${today}`) // Pas de fin OU se termine après aujourd'hui
        .order('start_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (currentError) {
        throw currentError;
      }

      setCurrentContract(currentData);

      // Récupérer le contrat suivant (celui qui commence après aujourd'hui)
      const { data: upcomingData, error: upcomingError } = await supabase
        .from('practitioner_contracts')
        .select('*')
        .eq('practitioner_id', practitionerId)
        .gt('start_date', today) // Commence après aujourd'hui
        .order('start_date', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (upcomingError) {
        throw upcomingError;
      }

      setUpcomingContract(upcomingData);

      // Récupérer l'historique des contrats terminés
      const { data: pastData, error: pastError } = await supabase
        .from('practitioner_contracts')
        .select('*')
        .eq('practitioner_id', practitionerId)
        .lt('end_date', today) // Se termine avant aujourd'hui
        .order('start_date', { ascending: false });

      if (pastError) {
        throw pastError;
      }

      setPastContracts(pastData || []);
    } catch (err: any) {
      logger.error('Erreur lors du chargement du contrat:', err);
      setError(err.message || 'Erreur lors du chargement de votre abonnement');
    } finally {
      setLoading(false);
    }
  };

  const handleInitialSubscription = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const today = new Date();
      const config = CONTRACT_CONFIGS[selectedNewType];

      let contract;

      // Vérifier s'il existe déjà un contrat pending_payment pour ce practitioner
      const { data: existingContract, error: checkError } = await supabase
        .from('practitioner_contracts')
        .select('*')
        .eq('practitioner_id', practitionerId)
        .eq('status', 'pending_payment')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (checkError) {
        logger.error('[Subscription] Erreur vérification contrat:', checkError);
        throw checkError;
      }

      if (existingContract) {
        // Réutiliser le contrat existant
        logger.info('[Subscription] Réutilisation du contrat existant:', existingContract);
        contract = existingContract;
      } else {
        // Créer un nouveau contrat avec status 'pending_payment'
        const { data: newContract, error: createError } = await supabase
          .from('practitioner_contracts')
          .insert({
            practitioner_id: practitionerId,
            contract_type: selectedNewType,
            monthly_fee: config.monthly_fee,
            commission_fixed: config.commission_fixed,
            commission_percentage: config.commission_percentage,
            commission_cap: config.commission_cap,
            max_appointments_per_month: config.max_appointments_per_month,
            start_date: today.toISOString().split('T')[0],
            status: 'pending_payment'
          })
          .select()
          .single();

        if (createError) throw createError;

        logger.info('[Subscription] Nouveau contrat créé:', newContract);
        contract = newContract;
      }

      // ÉTAPE 1 : Créer une session de paiement Stripe Checkout pour l'abonnement
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Session non trouvée');

      // Récupérer le Price ID Stripe pour ce type de contrat
      const priceId = STRIPE_PRICE_IDS[selectedNewType];
      if (!priceId) {
        throw new Error(`Prix Stripe non configuré pour le type ${selectedNewType}`);
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(
        `${supabaseUrl}/functions/v1/stripe-create-subscription-checkout`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            priceId,
            contractId: contract.id,
            contractType: selectedNewType,
            promoCode: promoCode || undefined, // Envoyer le code promo si présent
            // Après paiement, rediriger vers la page qui vérifiera Stripe Connect
            successUrl: `${window.location.origin}/practitioner-payment-success?contractId=${contract.id}`,
            cancelUrl: `${window.location.origin}/practitioner-profile?tab=subscription`
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la création de la session de paiement');
      }

      const { url: checkoutUrl } = await response.json();

      if (!checkoutUrl) {
        throw new Error('URL de paiement non reçue');
      }

      // Rediriger vers Stripe Checkout pour le paiement
      logger.info('[Subscription] Redirection vers Stripe Checkout');
      window.location.href = checkoutUrl;

    } catch (err: any) {
      logger.error('Erreur lors de la création de l\'abonnement:', err);

      // Vérifier si l'erreur concerne le code promo
      const errorMessage = err.message || 'Erreur lors de la création de l\'abonnement';

      if (errorMessage.includes('code promo') || errorMessage.includes('Code promo')) {
        // Afficher l'erreur dans le champ code promo
        setPromoCodeError(errorMessage);
        setError(null); // Ne pas afficher d'erreur générale
      } else {
        // Afficher l'erreur générale
        setError(errorMessage);
      }

      setSubmitting(false);
    }
  };

  const calculateNextBillingDate = () => {
    if (!currentContract) return null;

    const currentStartDate = new Date(currentContract.start_date);
    const today = new Date();
    const dayOfMonth = currentStartDate.getDate();

    let nextBillingDate = new Date(today.getFullYear(), today.getMonth(), dayOfMonth);

    if (nextBillingDate <= today) {
      nextBillingDate = new Date(today.getFullYear(), today.getMonth() + 1, dayOfMonth);
    }

    return format(nextBillingDate, 'dd MMMM yyyy', { locale: fr });
  };

  const handleCancelSubscription = async () => {
    if (!currentContract) return;

    setCancelingSubscription(true);
    setError(null);

    try {
      // Mettre à jour le contrat pour indiquer l'annulation à la fin de la période
      const { error: updateError } = await supabase
        .from('practitioner_contracts')
        .update({
          cancel_at_period_end: true,
          canceled_at: new Date().toISOString()
        })
        .eq('id', currentContract.id);

      if (updateError) throw updateError;

      // Recharger le contrat
      await loadCurrentContract();
      setCancelSubscriptionDialogOpen(false);

      alert('Votre abonnement sera annulé à la fin de votre période de facturation en cours.');
    } catch (err: any) {
      logger.error('Erreur lors de l\'annulation de l\'abonnement:', err);
      setError(err.message || 'Erreur lors de l\'annulation de l\'abonnement');
    } finally {
      setCancelingSubscription(false);
    }
  };

  const handleReactivateSubscription = async () => {
    if (!currentContract) return;

    setReactivating(true);
    setError(null);

    try {
      // Annuler l'annulation en remettant cancel_at_period_end à false
      const { error: updateError } = await supabase
        .from('practitioner_contracts')
        .update({
          cancel_at_period_end: false,
          canceled_at: null
        })
        .eq('id', currentContract.id);

      if (updateError) throw updateError;

      // Recharger le contrat
      await loadCurrentContract();

      alert('Votre abonnement a été réactivé avec succès ! Il continuera normalement.');
    } catch (err: any) {
      logger.error('Erreur lors de la réactivation de l\'abonnement:', err);
      setError(err.message || 'Erreur lors de la réactivation de l\'abonnement');
    } finally {
      setReactivating(false);
    }
  };

  const handleCancelChange = async () => {
    if (!upcomingContract || !currentContract) return;

    setCancelling(true);
    setError(null);

    try {
      // Supprimer le contrat en attente
      const { error: deleteError } = await supabase
        .from('practitioner_contracts')
        .delete()
        .eq('id', upcomingContract.id);

      if (deleteError) throw deleteError;

      // Réinitialiser l'end_date du contrat actuel
      const { error: updateError } = await supabase
        .from('practitioner_contracts')
        .update({
          end_date: null,
          admin_notes: null
        })
        .eq('id', currentContract.id);

      if (updateError) throw updateError;

      // Recharger les données
      await loadCurrentContract();

      setCancelDialogOpen(false);

      alert('Le changement d\'abonnement a été annulé avec succès.');
    } catch (err: any) {
      logger.error('Erreur lors de l\'annulation:', err);
      setError(err.message || 'Erreur lors de l\'annulation du changement');
    } finally {
      setCancelling(false);
    }
  };

  const handleChangeSubscription = async () => {
    if (!currentContract) return;

    setSubmitting(true);
    setError(null);

    try {
      // Calculer la prochaine date anniversaire du contrat
      const contractStart = new Date(currentContract.start_date);
      const today = new Date();

      // Jour du mois de la date de début du contrat
      const dayOfMonth = contractStart.getDate();

      // Calculer la prochaine date anniversaire (même jour du mois prochain)
      let nextAnniversary = new Date(today.getFullYear(), today.getMonth() + 1, dayOfMonth);

      // Si la date anniversaire est déjà passée ce mois-ci, passer au mois suivant
      if (nextAnniversary <= today) {
        nextAnniversary = new Date(today.getFullYear(), today.getMonth() + 2, dayOfMonth);
      }

      // Le contrat actuel se termine la veille de la date anniversaire
      const endDate = new Date(nextAnniversary);
      endDate.setDate(endDate.getDate() - 1);

      // Mettre à jour le contrat actuel avec une date de fin
      const { error: updateError } = await supabase
        .from('practitioner_contracts')
        .update({
          end_date: endDate.toISOString().split('T')[0],
          admin_notes: `Changement vers ${selectedNewType.toUpperCase()} prévu pour le ${format(nextAnniversary, 'dd MMMM yyyy', { locale: fr })}`
        })
        .eq('id', currentContract.id);

      if (updateError) throw updateError;

      // Créer le nouveau contrat qui commence à la date anniversaire
      const startDate = nextAnniversary;

      const config = CONTRACT_CONFIGS[selectedNewType];

      const { error: createError } = await supabase
        .from('practitioner_contracts')
        .insert({
          practitioner_id: practitionerId,
          contract_type: selectedNewType,
          monthly_fee: config.monthly_fee,
          commission_fixed: config.commission_fixed,
          commission_percentage: config.commission_percentage,
          commission_cap: config.commission_cap,
          max_appointments_per_month: config.max_appointments_per_month,
          start_date: startDate.toISOString().split('T')[0],
          status: 'pending_payment' // Standard nécessite toujours un paiement
        });

      if (createError) throw createError;

      // Recharger les données
      await loadCurrentContract();

      setChangeDialogOpen(false);

      // Afficher un message de succès
      alert(`Changement d'abonnement planifié avec succès !\nVotre nouveau contrat ${selectedNewType.toUpperCase()} débutera le ${format(startDate, 'dd MMMM yyyy', { locale: fr })}.`);
    } catch (err: any) {
      logger.error('Erreur lors du changement d\'abonnement:', err);
      setError(err.message || 'Erreur lors du changement d\'abonnement');
    } finally {
      setSubmitting(false);
    }
  };

  const getContractStatusChip = (status: string) => {
    const statusConfig = {
      active: { label: 'Actif', color: 'success' as const },
      pending_payment: { label: 'En attente de paiement', color: 'warning' as const },
      suspended: { label: 'Suspendu', color: 'error' as const },
      terminated: { label: 'Terminé', color: 'default' as const }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.terminated;
    return <Chip label={config.label} color={config.color} size="small" />;
  };

  if (loading) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <CircularProgress />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Chargement de votre abonnement...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!currentContract) {
    return (
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
          Choisissez votre abonnement
        </Typography>

        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
            Bienvenue ! Votre demande d'intervenant a été approuvée.
          </Typography>
          <Typography variant="body2">
            Pour commencer à proposer vos services, veuillez choisir un abonnement ci-dessous.
          </Typography>
        </Alert>

        <ContractTypeSelector
          value={selectedNewType}
          onChange={setSelectedNewType}
          disabled={submitting}
        />

        {/* Champ de code promo */}
        <Box sx={{ mt: 3, maxWidth: 400, mx: 'auto' }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              💰 Code promo disponible : BIENVENUE2025
            </Typography>
            <Typography variant="caption">
              Bénéficiez du premier mois gratuit !
            </Typography>
          </Alert>

          <TextField
            fullWidth
            label="Code promo (optionnel)"
            placeholder="Ex: BIENVENUE2025"
            value={promoCode}
            onChange={(e) => {
              setPromoCode(e.target.value.toUpperCase());
              setPromoCodeError(null);
            }}
            disabled={submitting}
            error={!!promoCodeError}
            helperText={promoCodeError || 'Entrez votre code promo pour le premier mois gratuit'}
            InputProps={{
              startAdornment: (
                <Box sx={{ mr: 1, color: 'text.secondary' }}>🎁</Box>
              )
            }}
            sx={{ mb: 2 }}
          />
        </Box>

        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Button
            variant="contained"
            size="large"
            onClick={handleInitialSubscription}
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={20} /> : <CheckCircleIcon />}
            sx={{
              bgcolor: 'primary.main',
              '&:hover': {
                bgcolor: 'primary.dark'
              }
            }}
          >
            {submitting ? 'Création en cours...' : 'Payer & Activer mon abonnement'}
          </Button>
        </Box>
      </Box>
    );
  }

  const config = CONTRACT_CONFIGS[currentContract.contract_type as ContractType];

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
        Mon Abonnement
      </Typography>

      {/* Carte du contrat actuel */}
      <Card sx={{ mb: 3, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              {currentContract.contract_type.toUpperCase()}
            </Typography>
            {getContractStatusChip(currentContract.status)}
          </Box>

          <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
            {formatAmount(currentContract.monthly_fee)} / mois
          </Typography>

          <Divider sx={{ my: 2, bgcolor: 'rgba(255,255,255,0.3)' }} />

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                <strong>Date de début:</strong> {format(new Date(currentContract.start_date), 'dd MMMM yyyy', { locale: fr })}
              </Typography>
            </Grid>
            {currentContract.end_date && (
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  <strong>Date de fin:</strong> {format(new Date(currentContract.end_date), 'dd MMMM yyyy', { locale: fr })}
                </Typography>
              </Grid>
            )}
            {!currentContract.cancel_at_period_end && !currentContract.end_date && (
              <>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    <strong>Prochaine échéance:</strong> {calculateNextBillingDate()}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    <strong>Montant:</strong> {formatAmount(currentContract.monthly_fee)}
                  </Typography>
                </Grid>
              </>
            )}
          </Grid>

          {!currentContract.cancel_at_period_end && !currentContract.end_date && (
            <Box sx={{ mt: 3 }}>
              <Button
                variant="outlined"
                color="error"
                fullWidth
                onClick={() => setCancelSubscriptionDialogOpen(true)}
                sx={{
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                  color: 'white',
                  '&:hover': {
                    borderColor: 'white',
                    bgcolor: 'rgba(255, 255, 255, 0.1)'
                  }
                }}
              >
                Annuler l'abonnement
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>

      {currentContract.cancel_at_period_end && (
        <Alert
          severity="warning"
          sx={{ mb: 3 }}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={handleReactivateSubscription}
              disabled={reactivating}
              startIcon={reactivating ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon />}
            >
              {reactivating ? 'Réactivation...' : 'Réactiver'}
            </Button>
          }
        >
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            Annulation planifiée
          </Typography>
          <Typography variant="body2">
            Votre abonnement sera annulé à la fin de votre période de facturation en cours ({calculateNextBillingDate()}).
            Vous pourrez continuer à utiliser tous les services jusqu'à cette date.
          </Typography>
          <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
            Vous avez changé d'avis ? Cliquez sur "Réactiver" pour conserver votre abonnement.
          </Typography>
        </Alert>
      )}

      {/* Carte du contrat suivant */}
      {upcomingContract && (
        <Card sx={{ mb: 3, bgcolor: 'info.light', color: 'info.contrastText', border: '2px dashed rgba(0,0,0,0.3)' }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                📅 Prochain abonnement: {upcomingContract.contract_type.toUpperCase()}
              </Typography>
              {getContractStatusChip(upcomingContract.status)}
            </Box>

            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
              {formatAmount(upcomingContract.monthly_fee)} / mois
            </Typography>

            <Divider sx={{ my: 2, bgcolor: 'rgba(255,255,255,0.3)' }} />

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  <strong>Début:</strong> {format(new Date(upcomingContract.start_date), 'dd MMMM yyyy', { locale: fr })}
                </Typography>
              </Grid>
              {upcomingContract.status === 'pending_payment' && (
                <>
                  <Grid item xs={12}>
                    <Alert severity="warning" sx={{ mt: 1 }}>
                      Ce contrat débutera automatiquement après validation du paiement
                    </Alert>
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      fullWidth
                      onClick={() => setCancelDialogOpen(true)}
                      sx={{
                        mt: 1,
                        borderColor: 'error.main',
                        color: 'error.main',
                        bgcolor: 'white',
                        '&:hover': {
                          bgcolor: 'error.light',
                          borderColor: 'error.dark'
                        }
                      }}
                    >
                      Annuler ce changement
                    </Button>
                  </Grid>
                </>
              )}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Détails du contrat */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Détails de votre abonnement
          </Typography>

          <List dense>
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon color="success" />
              </ListItemIcon>
              <ListItemText
                primary="Abonnement mensuel"
                secondary={formatAmount(currentContract.monthly_fee)}
              />
            </ListItem>

            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon color="success" />
              </ListItemIcon>
              <ListItemText
                primary="Commission par rendez-vous"
                secondary={
                  currentContract.contract_type === 'decouverte' || currentContract.contract_type === 'standard'
                    ? `${formatAmount(config.commission_fixed!)} fixe`
                    : currentContract.contract_type === 'starter'
                    ? `min(${formatAmount(config.commission_fixed!)}, ${config.commission_percentage}%)`
                    : currentContract.contract_type === 'pro'
                    ? `${formatAmount(config.commission_fixed!)} fixe`
                    : 'Aucune commission'
                }
              />
            </ListItem>

            <ListItem>
              <ListItemIcon>
                <InfoIcon color="info" />
              </ListItemIcon>
              <ListItemText
                primary="Frais de paiement Stripe"
                secondary="~2% par transaction, à votre charge"
              />
            </ListItem>

            {config.max_appointments_per_month && (
              <ListItem>
                <ListItemIcon>
                  <InfoIcon color="info" />
                </ListItemIcon>
                <ListItemText
                  primary="Limite de rendez-vous"
                  secondary={`${config.max_appointments_per_month} RDV par mois`}
                />
              </ListItem>
            )}

            <ListItem>
              <ListItemIcon>
                <ScheduleIcon color="action" />
              </ListItemIcon>
              <ListItemText
                primary="Rendez-vous ce mois-ci"
                secondary={`${currentContract.appointments_this_month} RDV`}
              />
            </ListItem>
          </List>
        </CardContent>
      </Card>

      {/* Bouton de changement - DÉSACTIVÉ car un seul type d'abonnement */}
      {/* {!currentContract.end_date && (
        <Box sx={{ textAlign: 'center' }}>
          <Button
            variant="outlined"
            size="large"
            startIcon={<SwapHorizIcon />}
            onClick={() => setChangeDialogOpen(true)}
            sx={{
              borderColor: 'primary.main',
              color: 'primary.main',
              '&:hover': {
                borderColor: 'primary.dark',
                bgcolor: 'rgba(52, 89, 149, 0.08)'
              }
            }}
          >
            Changer d'abonnement
          </Button>
        </Box>
      )} */}

      {currentContract.end_date && (
        <Alert severity="info" icon={<InfoIcon />} sx={{ mb: 3 }}>
          Un changement d'abonnement est déjà planifié. Votre contrat actuel se terminera le{' '}
          {format(new Date(currentContract.end_date), 'dd MMMM yyyy', { locale: fr })}.
        </Alert>
      )}

      {/* Historique des contrats */}
      {pastContracts.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Historique des contrats
            </Typography>
            <Button
              variant="text"
              size="small"
              onClick={() => setShowHistory(!showHistory)}
            >
              {showHistory ? 'Masquer' : 'Afficher'} ({pastContracts.length})
            </Button>
          </Box>

          {showHistory && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {pastContracts.map((contract) => {
                const contractConfig = CONTRACT_CONFIGS[contract.contract_type as ContractType];
                return (
                  <Card key={contract.id} sx={{ bgcolor: 'grey.100' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                          {contract.contract_type.toUpperCase()} - {formatAmount(contract.monthly_fee)}/mois
                        </Typography>
                        {getContractStatusChip(contract.status)}
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        Du {format(new Date(contract.start_date), 'dd MMM yyyy', { locale: fr })}
                        {contract.end_date && ` au ${format(new Date(contract.end_date), 'dd MMM yyyy', { locale: fr })}`}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Total: {contract.total_appointments} rendez-vous
                      </Typography>
                    </CardContent>
                  </Card>
                );
              })}
            </Box>
          )}
        </Box>
      )}

      {/* Dialog de changement d'abonnement */}
      <Dialog
        open={changeDialogOpen}
        onClose={() => !submitting && setChangeDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Changer d'abonnement
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
              Comment fonctionne le changement ?
            </Typography>
            <Typography variant="body2">
              • Votre abonnement actuel continuera jusqu'à la fin de votre cycle mensuel<br />
              • Le nouvel abonnement débutera automatiquement le jour anniversaire de votre souscription<br />
              • Aucune interruption de service
            </Typography>
          </Alert>

          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Choisissez votre nouvel abonnement
          </Typography>

          <ContractTypeSelector
            value={selectedNewType}
            onChange={setSelectedNewType}
            disabled={submitting}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChangeDialogOpen(false)} disabled={submitting}>
            Annuler
          </Button>
          <Button
            variant="contained"
            onClick={handleChangeSubscription}
            disabled={submitting || selectedNewType === currentContract.contract_type}
            startIcon={submitting ? <CircularProgress size={20} /> : <SwapHorizIcon />}
          >
            {submitting ? 'Planification...' : 'Planifier le changement'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de confirmation d'annulation */}
      <Dialog
        open={cancelDialogOpen}
        onClose={() => !cancelling && setCancelDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Annuler le changement d'abonnement
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
              Êtes-vous sûr de vouloir annuler ?
            </Typography>
            <Typography variant="body2">
              Cette action va :
            </Typography>
            <Typography variant="body2" component="div">
              • Supprimer le contrat {upcomingContract?.contract_type.toUpperCase()} planifié<br />
              • Prolonger votre contrat {currentContract?.contract_type.toUpperCase()} actuel indéfiniment<br />
              • Cette action est irréversible
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialogOpen(false)} disabled={cancelling}>
            Non, garder le changement
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleCancelChange}
            disabled={cancelling}
            startIcon={cancelling ? <CircularProgress size={20} /> : null}
          >
            {cancelling ? 'Annulation...' : 'Oui, annuler le changement'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de confirmation d'annulation d'abonnement */}
      <Dialog
        open={cancelSubscriptionDialogOpen}
        onClose={() => !cancelingSubscription && setCancelSubscriptionDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Annuler l'abonnement
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
              Êtes-vous sûr de vouloir annuler votre abonnement ?
            </Typography>
          </Alert>

          <Typography variant="body2" paragraph>
            Votre abonnement <strong>{currentContract?.contract_type.toUpperCase()}</strong> sera
            annulé à la fin de votre période de facturation en cours.
          </Typography>

          <Typography variant="body2" paragraph>
            Vous pourrez continuer à utiliser tous les services jusqu'au <strong>{calculateNextBillingDate()}</strong>.
          </Typography>

          <Typography variant="body2" color="error">
            Après cette date, votre compte intervenant sera désactivé et vous ne pourrez plus accepter de rendez-vous.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelSubscriptionDialogOpen(false)} disabled={cancelingSubscription}>
            Annuler
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleCancelSubscription}
            disabled={cancelingSubscription}
            startIcon={cancelingSubscription ? <CircularProgress size={20} /> : null}
          >
            {cancelingSubscription ? 'Annulation...' : 'Confirmer l\'annulation'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SubscriptionManagement;
