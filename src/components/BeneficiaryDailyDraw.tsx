// Composant pour afficher le tirage du jour d'un bénéficiaire
import React, { useState, useEffect } from 'react';
import { Box, CircularProgress, Alert, Button, Typography, Paper } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useDailyDrawBeneficiary } from '../hooks/useDailyDraw';
import DailyDrawDisplay from './DailyDrawDisplay';

interface BeneficiaryDailyDrawProps {
  beneficiaryId: string;
  firstName: string;
  racine1?: number;
  racine2?: number;
  tronc?: number;
  dynamiqueDeVie?: number;
  ecorce?: number;
  branche?: number;
  feuille?: number;
  fruit?: number;
  birthDay?: number;
  birthMonth?: number;
}

const BeneficiaryDailyDraw: React.FC<BeneficiaryDailyDrawProps> = ({
  beneficiaryId,
  firstName,
  racine1,
  racine2,
  tronc,
  dynamiqueDeVie,
  ecorce,
  branche,
  feuille,
  fruit,
  birthDay,
  birthMonth
}) => {
  const { getDailyDraw, loading, error, drawData } = useDailyDrawBeneficiary();
  const [showResult, setShowResult] = useState(false);

  // Charger automatiquement le message du jour au montage
  useEffect(() => {
    const autoLoadMessage = async () => {
      // Ne rien faire si les données ne sont pas complètes
      if (!racine1 || !racine2 || !tronc || !dynamiqueDeVie || !ecorce || !branche || !feuille || !fruit || !birthDay || !birthMonth) {
        return;
      }

      // Charger ou générer automatiquement le message
      await getDailyDraw({
        beneficiaryId,
        firstName,
        racine1,
        racine2,
        tronc,
        dynamiqueDeVie,
        ecorce,
        branche,
        feuille,
        fruit,
        birthDay,
        birthMonth
      });
      setShowResult(true);
    };

    autoLoadMessage();
  }, [beneficiaryId]); // Relancer quand le bénéficiaire change

  const handleGetMessage = async () => {
    if (racine1 && racine2 && tronc && dynamiqueDeVie && ecorce && branche && feuille && fruit && birthDay && birthMonth) {
      await getDailyDraw({
        beneficiaryId,
        firstName,
        racine1,
        racine2,
        tronc,
        dynamiqueDeVie,
        ecorce,
        branche,
        feuille,
        fruit,
        birthDay,
        birthMonth
      });
      setShowResult(true);
    }
  };

  // Si les données numérologique ne sont pas complètes
  if (!racine1 || !racine2 || !tronc || !dynamiqueDeVie || !ecorce || !branche || !feuille || !fruit || !birthDay || !birthMonth) {
    return (
      <Box sx={{ maxWidth: 800, mx: 'auto', py: 4, px: 2 }}>
        <Alert severity="info">
          Votre profil numérologique n'est pas encore complet.
          Les données nécessaires pour générer votre message du jour sont manquantes.
        </Alert>
      </Box>
    );
  }

  // Afficher le chargement
  if (loading && !drawData) {
    return (
      <Box sx={{ maxWidth: 800, mx: 'auto', py: 4, px: 2, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Chargement de votre message du jour...</Typography>
      </Box>
    );
  }

  // Si on n'a pas encore demandé le message ou si on n'a pas les données
  if (!showResult || !drawData) {
    return (
      <Box sx={{ maxWidth: 800, mx: 'auto', py: { xs: 2, sm: 4 }, px: { xs: 2, sm: 2 } }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        )}

        <Paper
          elevation={3}
          sx={{
            p: { xs: 3, sm: 4 },
            background: 'linear-gradient(135deg, #1D3461 0%, #345995 50%, #4A7BA7 100%)',
            color: 'white',
            borderRadius: 3,
            border: { xs: 'none', sm: '3px solid #FFD700' },
            boxShadow: { xs: 3, sm: '0 8px 32px rgba(255, 215, 0, 0.2)' },
            textAlign: 'center',
          }}
        >
          <Box sx={{
            display: 'inline-block',
            background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
            borderRadius: '50%',
            p: 1,
            mb: 2,
            boxShadow: '0 0 20px rgba(255, 215, 0, 0.6)',
          }}>
            <AutoAwesomeIcon sx={{ fontSize: { xs: 40, sm: 48 }, color: 'white' }} />
          </Box>

          <Typography variant="h4" component="h2" gutterBottom fontWeight="bold" sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>
            Message du jour pour {firstName}
          </Typography>

          <Typography variant="body1" sx={{ opacity: 0.9, mb: 4, fontSize: { xs: '0.875rem', sm: '1rem' } }}>
            Découvrez le message numérologique personnalisé du jour
          </Typography>

          <Button
            variant="contained"
            size="large"
            onClick={handleGetMessage}
            disabled={loading}
            sx={{
              background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
              color: '#1D3461',
              py: 1.5,
              px: 4,
              fontSize: '1.1rem',
              fontWeight: 'bold',
              boxShadow: '0 4px 12px rgba(255, 215, 0, 0.3)',
              '&:hover': {
                background: 'linear-gradient(135deg, #FFC700 0%, #FF9500 100%)',
                boxShadow: '0 6px 16px rgba(255, 215, 0, 0.4)',
                transform: 'translateY(-2px)',
              },
              transition: 'all 0.3s ease',
            }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Voir mon message'}
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', py: { xs: 0, sm: 4 }, px: { xs: 0, sm: 2 } }}>
      <DailyDrawDisplay data={drawData} showCTA={false} />
    </Box>
  );
};

export default BeneficiaryDailyDraw;
