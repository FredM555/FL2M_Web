// Composant conteneur pour le tirage du jour
import React from 'react';
import { Box } from '@mui/material';
import DailyDrawForm from './DailyDrawForm';
import DailyDrawDisplay from './DailyDrawDisplay';
import { useDailyDrawVisitor } from '../hooks/useDailyDraw';

const DailyDrawContainer: React.FC = () => {
  const { drawData, getDailyDraw, loading, error } = useDailyDrawVisitor();

  const handleReset = () => {
    // Pour réinitialiser, on doit nettoyer le cache
    // Ce sera géré par le composant parent ou on peut recharger la page
    window.location.reload();
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', py: { xs: 0, sm: 4 }, px: { xs: 0, sm: 2 } }}>
      {!drawData ? (
        <DailyDrawForm
          getDailyDraw={getDailyDraw}
          loading={loading}
          error={error}
        />
      ) : (
        <DailyDrawDisplay
          data={drawData}
          onReset={handleReset}
          showCTA={true}
        />
      )}
    </Box>
  );
};

export default DailyDrawContainer;
