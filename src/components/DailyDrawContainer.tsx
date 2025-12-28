// Composant conteneur pour le tirage du jour
import React, { useState, useEffect } from 'react';
import { Box } from '@mui/material';
import { useLocation } from 'react-router-dom';
import DailyDrawForm from './DailyDrawForm';
import DailyDrawDisplay from './DailyDrawDisplay';
import { useDailyDrawVisitor } from '../hooks/useDailyDraw';

const DailyDrawContainer: React.FC = () => {
  const { drawData, getDailyDraw, loading, error } = useDailyDrawVisitor();
  const [showForm, setShowForm] = useState(false);
  const location = useLocation();

  // Quand on navigue vers /message-du-jour (ex: clic sur icône navigation), revenir au formulaire
  useEffect(() => {
    if (location.pathname === '/message-du-jour') {
      setShowForm(true);
    }
  }, [location.pathname]);

  // Quand drawData change (nouveau tirage reçu), masquer le formulaire pour afficher le résultat
  useEffect(() => {
    if (drawData && !loading) {
      setShowForm(false);
    }
  }, [drawData, loading]);

  const handleReset = () => {
    // Afficher le formulaire pour un nouveau message (sans nettoyer le cache du jour actuel)
    setShowForm(true);
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', py: { xs: 0, sm: 4 }, px: { xs: 0, sm: 2 } }}>
      {!drawData || showForm ? (
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
