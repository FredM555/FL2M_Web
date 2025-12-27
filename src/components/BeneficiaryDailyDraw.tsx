// Composant pour afficher le tirage du jour d'un bénéficiaire
import React, { useEffect } from 'react';
import { Box, CircularProgress, Alert } from '@mui/material';
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

  useEffect(() => {
    // Vérifier que tous les nombres sont présents
    if (racine1 && racine2 && tronc && dynamiqueDeVie && ecorce && branche && feuille && fruit && birthDay && birthMonth) {
      getDailyDraw({
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
    }
  }, [beneficiaryId]);

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

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ maxWidth: 800, mx: 'auto', py: 4, px: 2 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!drawData) {
    return null;
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', py: 4, px: 2 }}>
      <DailyDrawDisplay data={drawData} showCTA={false} />
    </Box>
  );
};

export default BeneficiaryDailyDraw;
