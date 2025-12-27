// Composant d'affichage du tirage du jour
import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Divider,
  Button,
  Card,
  CardContent
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import ShareIcon from '@mui/icons-material/Share';
import RefreshIcon from '@mui/icons-material/Refresh';
import EventIcon from '@mui/icons-material/Event';
import { DailyDrawData } from '../hooks/useDailyDraw';
import { useNavigate } from 'react-router-dom';

interface DailyDrawDisplayProps {
  data: DailyDrawData;
  onReset?: () => void;
  showCTA?: boolean;
}

const DailyDrawDisplay: React.FC<DailyDrawDisplayProps> = ({
  data,
  onReset,
  showCTA = true
}) => {
  const navigate = useNavigate();

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Mon message numérologique du jour',
        text: `Découvrez votre message du jour sur FL²M Services !`,
        url: window.location.href
      }).catch(() => {
        // Fallback si le partage échoue
        copyToClipboard();
      });
    } else {
      copyToClipboard();
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href);
    // Vous pouvez ajouter un toast de confirmation ici
  };

  const handleBookAppointment = () => {
    navigate('/appointments/booking');
  };

  return (
    <Box sx={{ mt: { xs: -2, sm: 0 } }}>
      {/* En-tête */}
      <Paper
        elevation={3}
        sx={{
          p: { xs: 1.5, sm: 3 },
          mb: { xs: 2, sm: 3 },
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          borderRadius: { xs: 0, sm: 3 },
          textAlign: 'center'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: { xs: 1, sm: 2 }, flexWrap: 'wrap', gap: { xs: 0.5, sm: 1 } }}>
          <AutoAwesomeIcon sx={{ fontSize: { xs: 24, sm: 32 }, mr: { xs: 0.5, sm: 1 } }} />
          <Typography variant="h4" component="h2" fontWeight="bold" sx={{ fontSize: { xs: '1.25rem', sm: '2rem' } }}>
            Bonjour {data.firstName} 🌟
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: { xs: 0.5, sm: 1 }, mb: { xs: 1.5, sm: 2 }, flexWrap: 'wrap' }}>
          <CalendarTodayIcon sx={{ fontSize: { xs: 16, sm: 24 } }} />
          <Typography variant="body1" sx={{ fontSize: { xs: '0.75rem', sm: '1rem' } }}>
            {new Date().toLocaleDateString('fr-FR', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'center', gap: { xs: 1, sm: 2 }, mt: { xs: 1, sm: 2 }, flexWrap: 'wrap' }}>
          <Box sx={{
            backgroundColor: 'rgba(255, 255, 255, 0.25)',
            borderRadius: 2,
            px: { xs: 1, sm: 2 },
            py: { xs: 0.5, sm: 1 },
            display: 'flex',
            alignItems: 'center',
            gap: { xs: 0.5, sm: 1 }
          }}>
            <Typography sx={{ color: 'white', fontSize: { xs: '0.7rem', sm: '0.9rem' } }}>
              {data.label1 || 'Objectif de vie'}
            </Typography>
            <Typography sx={{
              color: 'white',
              fontWeight: 'bold',
              fontSize: { xs: '1.1rem', sm: '1.5rem' },
              backgroundColor: 'rgba(255, 255, 255, 0.3)',
              borderRadius: '50%',
              width: { xs: 32, sm: 40 },
              height: { xs: 32, sm: 40 },
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {data.nombre1}
            </Typography>
          </Box>

          <Box sx={{
            backgroundColor: 'rgba(255, 255, 255, 0.25)',
            borderRadius: 2,
            px: { xs: 1, sm: 2 },
            py: { xs: 0.5, sm: 1 },
            display: 'flex',
            alignItems: 'center',
            gap: { xs: 0.5, sm: 1 }
          }}>
            <Typography sx={{ color: 'white', fontSize: { xs: '0.7rem', sm: '0.9rem' } }}>
              {data.label2 || 'Jour personnel'}
            </Typography>
            <Typography sx={{
              color: 'white',
              fontWeight: 'bold',
              fontSize: { xs: '1.1rem', sm: '1.5rem' },
              backgroundColor: 'rgba(255, 255, 255, 0.3)',
              borderRadius: '50%',
              width: { xs: 32, sm: 40 },
              height: { xs: 32, sm: 40 },
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {data.nombre2}
            </Typography>
          </Box>

          {data.nombre3 && (
            <Box sx={{
              backgroundColor: 'rgba(255, 255, 255, 0.25)',
              borderRadius: 2,
              px: { xs: 1, sm: 2 },
              py: { xs: 0.5, sm: 1 },
              display: 'flex',
              alignItems: 'center',
              gap: { xs: 0.5, sm: 1 }
            }}>
              <Typography sx={{ color: 'white', fontSize: { xs: '0.7rem', sm: '0.9rem' } }}>
                {data.label3 || 'Message 3'}
              </Typography>
              <Typography sx={{
                color: 'white',
                fontWeight: 'bold',
                fontSize: { xs: '1.1rem', sm: '1.5rem' },
                backgroundColor: 'rgba(255, 255, 255, 0.3)',
                borderRadius: '50%',
                width: { xs: 32, sm: 40 },
                height: { xs: 32, sm: 40 },
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {data.nombre3}
              </Typography>
            </Box>
          )}
        </Box>
      </Paper>

      {/* Messages */}
      {data.message1 && (
        <Card sx={{ mb: 3, borderRadius: 3 }} elevation={2}>
          <CardContent sx={{ p: 3 }}>
            {/* Titre centré */}
            <Box sx={{ textAlign: 'center', mb: 2 }}>
              <Typography variant="h5" component="h3" fontWeight="bold" color="primary" sx={{ mb: 1 }}>
                {data.message1.titre}
              </Typography>
              {/* Label et nombre sous le titre */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                <Typography variant="body2" color="text.secondary" fontWeight="bold">
                  {data.label1 || 'Objectif de vie'}
                </Typography>
                <Box sx={{
                  backgroundColor: 'primary.main',
                  color: 'white',
                  borderRadius: '50%',
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  fontSize: '1rem'
                }}>
                  {data.nombre1}
                </Box>
              </Box>
            </Box>
            {/* Message dans une bulle */}
            <Box sx={{
              backgroundColor: 'rgba(103, 126, 234, 0.08)',
              borderRadius: 3,
              p: 3,
              borderLeft: '4px solid',
              borderColor: 'primary.main'
            }}>
              <Typography variant="body1" sx={{ lineHeight: 1.8, color: 'text.primary' }}>
                {data.message1.message}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}

      {data.message2 && (
        <Card sx={{ mb: 3, borderRadius: 3 }} elevation={2}>
          <CardContent sx={{ p: 3 }}>
            {/* Titre centré */}
            <Box sx={{ textAlign: 'center', mb: 2 }}>
              <Typography variant="h5" component="h3" fontWeight="bold" color="secondary" sx={{ mb: 1 }}>
                {data.message2.titre}
              </Typography>
              {/* Label et nombre sous le titre */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                <Typography variant="body2" color="text.secondary" fontWeight="bold">
                  {data.label2 || 'Jour personnel'}
                </Typography>
                <Box sx={{
                  backgroundColor: 'secondary.main',
                  color: 'white',
                  borderRadius: '50%',
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  fontSize: '1rem'
                }}>
                  {data.nombre2}
                </Box>
              </Box>
            </Box>
            {/* Message dans une bulle */}
            <Box sx={{
              backgroundColor: 'rgba(156, 39, 176, 0.08)',
              borderRadius: 3,
              p: 3,
              borderLeft: '4px solid',
              borderColor: 'secondary.main'
            }}>
              <Typography variant="body1" sx={{ lineHeight: 1.8, color: 'text.primary' }}>
                {data.message2.message}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}

      {data.message3 && (
        <Card sx={{ mb: 3, borderRadius: 3 }} elevation={2}>
          <CardContent sx={{ p: 3 }}>
            {/* Titre centré */}
            <Box sx={{ textAlign: 'center', mb: 2 }}>
              <Typography variant="h5" component="h3" fontWeight="bold" sx={{ color: '#ff6b6b', mb: 1 }}>
                {data.message3.titre}
              </Typography>
              {/* Label et nombre sous le titre */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                <Typography variant="body2" color="text.secondary" fontWeight="bold">
                  {data.label3 || 'Message 3'}
                </Typography>
                <Box sx={{
                  backgroundColor: '#ff6b6b',
                  color: 'white',
                  borderRadius: '50%',
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  fontSize: '1rem'
                }}>
                  {data.nombre3}
                </Box>
              </Box>
            </Box>
            {/* Message dans une bulle */}
            <Box sx={{
              backgroundColor: 'rgba(255, 107, 107, 0.08)',
              borderRadius: 3,
              p: 3,
              borderLeft: '4px solid #ff6b6b'
            }}>
              <Typography variant="body1" sx={{ lineHeight: 1.8, color: 'text.primary' }}>
                {data.message3.message}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}

      <Divider sx={{ my: 3 }} />

      {/* Actions */}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center', mb: 3 }}>
        <Button
          variant="outlined"
          startIcon={<ShareIcon />}
          onClick={handleShare}
        >
          Partager
        </Button>
        {onReset && (
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={onReset}
          >
            Nouveau tirage
          </Button>
        )}
      </Box>

      {/* Call to Action */}
      {showCTA && (
        <Paper
          sx={{
            p: 4,
            textAlign: 'center',
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            color: 'white',
            borderRadius: 3
          }}
          elevation={3}
        >
          <Typography variant="h5" gutterBottom fontWeight="bold">
            💫 Envie d'aller plus loin ?
          </Typography>
          <Typography variant="body1" sx={{ mb: 3, opacity: 0.95 }}>
            Découvrez votre étude numérologique complète avec nos praticiens experts
          </Typography>
          <Button
            variant="contained"
            size="large"
            startIcon={<EventIcon />}
            onClick={handleBookAppointment}
            sx={{
              backgroundColor: 'white',
              color: '#f5576c',
              fontWeight: 'bold',
              px: 4,
              py: 1.5,
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
              }
            }}
          >
            Prendre rendez-vous
          </Button>
        </Paper>
      )}

      {/* Info cache */}
      {data.cached && (
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            Ce message est votre tirage du jour. Revenez demain pour un nouveau message !
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default DailyDrawDisplay;
