// Composant d'affichage du tirage du jour
import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Divider,
  Button,
  Card,
  CardContent,
  IconButton
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import ShareIcon from '@mui/icons-material/Share';
import EmailIcon from '@mui/icons-material/Email';
import RefreshIcon from '@mui/icons-material/Refresh';
import EventIcon from '@mui/icons-material/Event';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { DailyDrawData } from '../hooks/useDailyDraw';
import { useNavigate } from 'react-router-dom';
import { ShareMessageByEmailDialog } from './ShareMessageByEmailDialog';
import { shareMessageByEmail } from '../services/shareMessage';
import { logger } from '../utils/logger';
import { useAuth } from '../context/AuthContext';

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
  const { user, profile } = useAuth();
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Mon message du jour',
        text: `Découvrez votre message du jour sur FL²M !`,
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

  const handleOpenEmailDialog = () => {
    setEmailDialogOpen(true);
  };

  const handleCloseEmailDialog = () => {
    setEmailDialogOpen(false);
  };

  const handleSendEmail = async (recipientEmail: string, comment: string) => {
    try {
      const today = new Date();

      // Récupérer le nom complet de l'expéditeur
      const senderName = profile
        ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
        : user?.email || 'Un utilisateur FL2M';

      const messageData = {
        firstName: data.firstName,
        date: today.toLocaleDateString('fr-FR', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        nombre1: data.nombre1,
        nombre2: data.nombre2,
        nombre3: data.nombre3,
        label1: data.label1 || 'Objectif de vie',
        label2: data.label2 || 'Jour personnel',
        label3: data.label3 || 'Message 3',
        titre1: data.message1?.titre || '',
        titre2: data.message2?.titre || '',
        titre3: data.message3?.titre || '',
        message1: data.message1?.message || '',
        message2: data.message2?.message || '',
        message3: data.message3?.message || ''
      };

      const { success, error } = await shareMessageByEmail({
        recipientEmail,
        senderName,
        senderComment: comment,
        messageData
      });

      if (!success) {
        throw error || new Error('Erreur lors de l\'envoi de l\'email');
      }

      logger.info('[Daily Draw Display] Email partagé avec succès');
    } catch (error: any) {
      logger.error('[Daily Draw Display] Erreur partage email:', error);
      throw error;
    }
  };

  return (
    <Box sx={{ mt: { xs: 1, sm: 2 }, pt: { xs: 1, sm: 0 } }}>
      {/* En-tête */}
      <Paper
        elevation={3}
        sx={{
          p: { xs: 1.5, sm: 3 },
          mb: { xs: 2, sm: 3 },
          background: 'linear-gradient(135deg, #1D3461 0%, #345995 50%, #4A7BA7 100%)',
          color: 'white',
          borderRadius: { xs: 0, sm: 3 },
          textAlign: 'center',
          border: { xs: 'none', sm: '3px solid #FFD700' },
          boxShadow: { xs: 3, sm: '0 8px 32px rgba(255, 215, 0, 0.2)' },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: { xs: 1, sm: 2 }, position: 'relative', flexWrap: 'wrap', gap: { xs: 0.5, sm: 1 } }}>
          {/* Bouton retour à gauche */}
          {onReset && (
            <IconButton
              onClick={onReset}
              size="small"
              sx={{
                position: 'absolute',
                left: { xs: 0, sm: 8 },
                color: '#1D3461',
                background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
                boxShadow: '0 2px 8px rgba(255, 215, 0, 0.4)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #FFC700 0%, #FF9500 100%)',
                  boxShadow: '0 4px 12px rgba(255, 215, 0, 0.5)',
                },
              }}
            >
              <ArrowBackIcon fontSize="small" />
            </IconButton>
          )}

          <AutoAwesomeIcon sx={{
            fontSize: { xs: 24, sm: 32 },
            mr: { xs: 0.5, sm: 1 },
            background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 0 8px rgba(255, 215, 0, 0.5))',
          }} />
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
          sx={{
            borderColor: '#FFD700',
            color: '#1D3461',
            '&:hover': {
              borderColor: '#FFA500',
              backgroundColor: 'rgba(255, 215, 0, 0.1)',
            }
          }}
        >
          Partager
        </Button>
        <Button
          variant="outlined"
          startIcon={<EmailIcon />}
          onClick={handleOpenEmailDialog}
          sx={{
            borderColor: '#1D3461',
            color: '#1D3461',
            '&:hover': {
              borderColor: '#345995',
              backgroundColor: 'rgba(29, 52, 97, 0.1)',
            }
          }}
        >
          Partager par email
        </Button>
        {onReset && (
          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={onReset}
            sx={{
              background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
              color: '#1D3461',
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
            Nouveau message pour quelqu'un d'autre
          </Button>
        )}
      </Box>

      {/* Call to Action */}
      {showCTA && (
        <Paper
          sx={{
            p: 4,
            textAlign: 'center',
            background: 'linear-gradient(135deg, #1D3461 0%, #345995 100%)',
            color: 'white',
            borderRadius: 3,
            border: '2px solid #FFD700',
            boxShadow: '0 8px 32px rgba(255, 215, 0, 0.2)',
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
              background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
              color: '#1D3461',
              fontWeight: 'bold',
              px: 4,
              py: 1.5,
              boxShadow: '0 4px 12px rgba(255, 215, 0, 0.3)',
              '&:hover': {
                background: 'linear-gradient(135deg, #FFC700 0%, #FF9500 100%)',
                boxShadow: '0 6px 16px rgba(255, 215, 0, 0.4)',
                transform: 'translateY(-2px)',
              },
              transition: 'all 0.3s ease',
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

      {/* Dialogue de partage par email */}
      <ShareMessageByEmailDialog
        open={emailDialogOpen}
        onClose={handleCloseEmailDialog}
        senderName={profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : user?.email || 'Vous'}
        messageData={{
          firstName: data.firstName,
          nombre1: data.nombre1,
          nombre2: data.nombre2,
          nombre3: data.nombre3,
          label1: data.label1 || 'Objectif de vie',
          label2: data.label2 || 'Jour personnel',
          label3: data.label3 || 'Message 3',
          message1: data.message1?.message || '',
          message2: data.message2?.message || '',
          message3: data.message3?.message || ''
        }}
        onSend={handleSendEmail}
      />
    </Box>
  );
};

export default DailyDrawDisplay;
