// Composant formulaire pour le tirage du jour (visiteurs)
import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Grid,
  CircularProgress,
  Alert
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { UseDailyDrawVisitorParams } from '../hooks/useDailyDraw';

interface DailyDrawFormProps {
  getDailyDraw: (params: UseDailyDrawVisitorParams) => Promise<any>;
  loading: boolean;
  error: string | null;
}

const STORAGE_KEY = 'dailyDrawVisitorData';

const DailyDrawForm: React.FC<DailyDrawFormProps> = ({ getDailyDraw, loading, error }) => {
  const [firstName, setFirstName] = useState('');
  const [birthDay, setBirthDay] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Charger les données depuis localStorage au montage du composant
  useEffect(() => {
    try {
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (savedData) {
        const { firstName: savedFirstName, birthDay: savedBirthDay, birthMonth: savedBirthMonth } = JSON.parse(savedData);
        if (savedFirstName) setFirstName(savedFirstName);
        if (savedBirthDay) setBirthDay(savedBirthDay.toString());
        if (savedBirthMonth) setBirthMonth(savedBirthMonth.toString());
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données sauvegardées:', error);
    }
  }, []);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!firstName.trim()) {
      errors.firstName = 'Le prénom est requis';
    }

    const day = parseInt(birthDay);
    if (!birthDay || isNaN(day) || day < 1 || day > 31) {
      errors.birthDay = 'Jour invalide (1-31)';
    }

    const month = parseInt(birthMonth);
    if (!birthMonth || isNaN(month) || month < 1 || month > 12) {
      errors.birthMonth = 'Mois invalide (1-12)';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    const params = {
      firstName: firstName.trim(),
      birthDay: parseInt(birthDay),
      birthMonth: parseInt(birthMonth)
    };

    // Sauvegarder les données dans localStorage pour la prochaine visite
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(params));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des données:', error);
    }

    await getDailyDraw(params);

    // Le résultat sera automatiquement affiché par DailyDrawContainer
    // quand drawData sera mis à jour dans le hook
  };

  return (
    <Paper
      elevation={3}
      sx={{
        p: { xs: 3, sm: 4 },
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        borderRadius: { xs: 0, sm: 3 },
        minHeight: { xs: 'calc(100vh - 120px)', sm: 'auto' }
      }}
    >
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <AutoAwesomeIcon sx={{ fontSize: { xs: 40, sm: 48 }, mb: 2 }} />
        <Typography variant="h4" component="h2" gutterBottom fontWeight="bold" sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>
          Votre message numérologique du jour
        </Typography>
        <Typography variant="body1" sx={{ opacity: 0.9, fontSize: { xs: '0.875rem', sm: '1rem' } }}>
          Découvrez votre message personnalisé basé sur votre date de naissance
        </Typography>
      </Box>

      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderRadius: 2,
          p: { xs: 2, sm: 3 }
        }}
      >
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Prénom"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              error={!!formErrors.firstName}
              helperText={formErrors.firstName}
              disabled={loading}
              placeholder="Marie"
            />
          </Grid>

          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Jour de naissance"
              type="number"
              value={birthDay}
              onChange={(e) => setBirthDay(e.target.value)}
              error={!!formErrors.birthDay}
              helperText={formErrors.birthDay}
              disabled={loading}
              placeholder="15"
              inputProps={{ min: 1, max: 31 }}
            />
          </Grid>

          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Mois de naissance"
              type="number"
              value={birthMonth}
              onChange={(e) => setBirthMonth(e.target.value)}
              error={!!formErrors.birthMonth}
              helperText={formErrors.birthMonth}
              disabled={loading}
              placeholder="3"
              inputProps={{ min: 1, max: 12 }}
            />
          </Grid>

          <Grid item xs={12}>
            <Button
              fullWidth
              type="submit"
              variant="contained"
              size="large"
              disabled={loading}
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                py: 1.5,
                fontSize: '1.1rem',
                fontWeight: 'bold',
                '&:hover': {
                  background: 'linear-gradient(135deg, #5568d3 0%, #65408b 100%)',
                }
              }}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                'Découvrir mon message'
              )}
            </Button>
          </Grid>
        </Grid>

        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            Gratuit • 1 message par jour • Sans inscription
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
};

export default DailyDrawForm;
