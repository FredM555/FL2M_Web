// src/components/beneficiary/BeneficiaryMessageHistory.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  Typography,
  Rating,
  TextField,
  Chip,
  CircularProgress,
  Alert,
  Grid,
  ToggleButtonGroup,
  ToggleButton,
  Divider,
  Stack,
  Paper,
  IconButton,
  Button
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import {
  getBeneficiaryMessageHistory,
  getBeneficiaryRatingStats,
  rateMessage,
  updateMessageNote,
  type DailyMessageHistory,
  type MessageHistoryStats
} from '../../services/dailyMessageHistory';
import { logger } from '../../utils/logger';

interface Props {
  beneficiaryId: string;
  beneficiaryName: string;
}

// Grouper les messages par jour
interface MessagesByDate {
  date: string;
  messages: DailyMessageHistory[];
  timestamp: number;
}

export const BeneficiaryMessageHistory: React.FC<Props> = ({ beneficiaryId, beneficiaryName }) => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<DailyMessageHistory[]>([]);
  const [stats, setStats] = useState<MessageHistoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'rated' | 'unrated'>('all');
  const [minRating, setMinRating] = useState<number>(0);

  // Charger les messages et les stats
  useEffect(() => {
    loadData();
  }, [beneficiaryId, filter, minRating]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Charger les messages
      const filterOptions = {
        rated: filter === 'rated' ? true : filter === 'unrated' ? false : undefined,
        minRating: minRating || undefined
      };

      const { data: messagesData, error: messagesError } = await getBeneficiaryMessageHistory(
        beneficiaryId,
        filterOptions
      );

      if (messagesError) throw messagesError;

      setMessages(messagesData);

      // Charger les stats
      const { data: statsData, error: statsError } = await getBeneficiaryRatingStats(beneficiaryId);

      if (statsError) {
        logger.error('Erreur chargement stats:', statsError);
      } else {
        setStats(statsData);
      }

    } catch (err: any) {
      logger.error('Erreur chargement historique:', err);
      setError(err.message || 'Erreur lors du chargement de l\'historique');
    } finally {
      setLoading(false);
    }
  };

  const handleRateMessage = async (messageId: string, rating: number) => {
    try {
      const { error } = await rateMessage({ messageHistoryId: messageId, rating });

      if (error) throw error;

      // Mettre à jour localement
      setMessages(prev =>
        prev.map(msg =>
          msg.id === messageId
            ? { ...msg, rating, rated_at: new Date().toISOString() }
            : msg
        )
      );

      // Recharger les stats
      const { data: statsData } = await getBeneficiaryRatingStats(beneficiaryId);
      if (statsData) setStats(statsData);

    } catch (err: any) {
      logger.error('Erreur notation:', err);
      setError('Erreur lors de la notation du message');
    }
  };

  const handleUpdateNote = async (messageId: string, note: string) => {
    try {
      const { error } = await updateMessageNote(messageId, note);

      if (error) throw error;

      // Mettre à jour localement
      setMessages(prev =>
        prev.map(msg => (msg.id === messageId ? { ...msg, user_note: note } : msg))
      );

    } catch (err: any) {
      logger.error('Erreur mise à jour note:', err);
      setError('Erreur lors de la mise à jour de la note');
    }
  };

  // Fonction pour déterminer la couleur en fonction de l'origine
  const getColorForOrigine = (origineLabel: string): string => {
    // Triangle fondamental (Tronc, Racines, Dynamique) → Bleu
    if (
      origineLabel.includes('Tronc') ||
      origineLabel.includes('Racine') ||
      origineLabel.includes('Dynamique')
    ) {
      return '#345995'; // primary.main
    }

    // Jour personnel → Violet
    if (origineLabel.includes('Jour personnel')) {
      return '#9c27b0'; // secondary.main
    }

    // Arbre numérologique (Écorce, Branche, Feuille, Fruit) → Rouge
    if (
      origineLabel.includes('Écorce') ||
      origineLabel.includes('Branche') ||
      origineLabel.includes('Feuille') ||
      origineLabel.includes('Fruit')
    ) {
      return '#ff6b6b';
    }

    // Par défaut → Bleu
    return '#345995';
  };

  // Grouper les messages par date
  const groupMessagesByDate = (): MessagesByDate[] => {
    const grouped = new Map<string, DailyMessageHistory[]>();

    messages.forEach(msg => {
      const dateKey = new Date(msg.viewed_at).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });

      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(msg);
    });

    // Convertir en tableau et trier
    const result = Array.from(grouped.entries()).map(([date, msgs]) => {
      // Trier les messages d'un même jour par heure croissante
      const sortedMsgs = msgs.sort((a, b) => {
        return new Date(a.viewed_at).getTime() - new Date(b.viewed_at).getTime();
      });

      return {
        date,
        messages: sortedMsgs,
        // Garder le timestamp pour trier les groupes
        timestamp: new Date(msgs[0].viewed_at).getTime()
      };
    });

    // Trier les groupes par date décroissante (plus récent en premier)
    result.sort((a, b) => b.timestamp - a.timestamp);

    return result;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Vérifier si le message le plus récent est d'aujourd'hui
  const hasMessageToday = () => {
    if (messages.length === 0) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const mostRecentMessage = messages[0];
    const messageDate = new Date(mostRecentMessage.viewed_at);
    messageDate.setHours(0, 0, 0, 0);

    return messageDate.getTime() === today.getTime();
  };

  const messagesByDate = groupMessagesByDate();
  const shouldShowTodayAlert = messages.length === 0 || !hasMessageToday();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Statistiques compactes */}
      {stats && stats.total_messages > 0 && (
        <Paper sx={{ p: 2, mb: 2, backgroundColor: 'rgba(52, 89, 149, 0.05)' }}>
          <Grid container spacing={2}>
            <Grid item xs={3}>
              <Typography variant="caption" color="text.secondary">Total</Typography>
              <Typography variant="h6" sx={{ fontSize: '1.1rem' }}>{stats.total_messages}</Typography>
            </Grid>
            <Grid item xs={3}>
              <Typography variant="caption" color="text.secondary">Notés</Typography>
              <Typography variant="h6" sx={{ fontSize: '1.1rem' }}>{stats.rated_messages}</Typography>
            </Grid>
            <Grid item xs={3}>
              <Typography variant="caption" color="text.secondary">Moyenne</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="h6" sx={{ fontSize: '1.1rem' }}>
                  {stats.average_rating ? stats.average_rating.toFixed(1) : '-'}
                </Typography>
                {stats.average_rating && <StarIcon sx={{ fontSize: 16, color: 'primary.main' }} />}
              </Box>
            </Grid>
            <Grid item xs={3}>
              <Typography variant="caption" color="text.secondary">5★</Typography>
              <Typography variant="h6" sx={{ fontSize: '1.1rem' }}>{stats.five_stars_count}</Typography>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Filtres compacts */}
      <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <ToggleButtonGroup
          value={filter}
          exclusive
          onChange={(_, newFilter) => newFilter && setFilter(newFilter)}
          size="small"
        >
          <ToggleButton value="all" sx={{ py: 0.5, px: 1.5 }}>Tous</ToggleButton>
          <ToggleButton value="rated" sx={{ py: 0.5, px: 1.5 }}>Notés</ToggleButton>
          <ToggleButton value="unrated" sx={{ py: 0.5, px: 1.5 }}>Non notés</ToggleButton>
        </ToggleButtonGroup>

        <ToggleButtonGroup
          value={minRating}
          exclusive
          onChange={(_, newRating) => setMinRating(newRating)}
          size="small"
        >
          <ToggleButton value={0} sx={{ py: 0.5, px: 1.5 }}>Toutes</ToggleButton>
          <ToggleButton value={5} sx={{ py: 0.5, px: 1.5 }}>5★</ToggleButton>
          <ToggleButton value={4} sx={{ py: 0.5, px: 1.5 }}>4★+</ToggleButton>
          <ToggleButton value={3} sx={{ py: 0.5, px: 1.5 }}>3★+</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Messages d'erreur */}
      {error && (
        <Alert severity="error" sx={{ mb: 2, py: 0.5 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Alerte si pas de message aujourd'hui */}
      {shouldShowTodayAlert && (
        <Alert
          severity="info"
          sx={{ py: 1.5, mb: messages.length > 0 ? 2 : 0 }}
          action={
            <Button
              color="inherit"
              size="small"
              variant="outlined"
              onClick={() => navigate('/message-du-jour')}
              sx={{
                ml: 2,
                textTransform: 'none',
                fontWeight: 600
              }}
            >
              Voir mon message du jour
            </Button>
          }
        >
          {messages.length === 0
            ? 'Aucun message trouvé pour ce bénéficiaire. Consultez le message du jour pour commencer l\'historique !'
            : 'Aucun message du jour trouvé pour ce bénéficiaire. Consultez le message du jour pour commencer l\'historique !'}
        </Alert>
      )}

      {/* Messages groupés par date */}
      {messages.length > 0 && (
        <Stack spacing={2}>
          {messagesByDate.map((group) => (
            <Box key={group.date}>
              {/* Séparateur de date */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
                <Divider sx={{ flex: 1 }} />
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                  {group.date}
                </Typography>
                <Divider sx={{ flex: 1 }} />
              </Box>

              {/* Messages du jour */}
              <Stack spacing={1}>
                {group.messages.map((message) => (
                  <CompactMessageCard
                    key={message.id}
                    message={message}
                    onRate={handleRateMessage}
                    onUpdateNote={handleUpdateNote}
                    formatTime={formatTime}
                    getColorForOrigine={getColorForOrigine}
                  />
                ))}
              </Stack>
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  );
};

// Composant compact pour afficher un message
interface CompactMessageCardProps {
  message: DailyMessageHistory;
  onRate: (messageId: string, rating: number) => void;
  onUpdateNote: (messageId: string, note: string) => void;
  formatTime: (dateString: string) => string;
  getColorForOrigine: (origineLabel: string) => string;
}

const CompactMessageCard: React.FC<CompactMessageCardProps> = ({
  message,
  onRate,
  onUpdateNote,
  formatTime,
  getColorForOrigine
}) => {
  const [noteEditing, setNoteEditing] = useState(false);
  const [noteValue, setNoteValue] = useState(message.user_note || '');

  const handleSaveNote = () => {
    onUpdateNote(message.id, noteValue);
    setNoteEditing(false);
  };

  const backgroundColor = getColorForOrigine(message.origine_label);

  return (
    <Card
      variant="outlined"
      sx={{
        p: 1.5,
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        transition: 'all 0.2s ease',
        '&:hover': {
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          boxShadow: 1
        }
      }}
    >
      {/* En-tête avec nombre et titre */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1 }}>
        {/* Nombre en évidence */}
        <Box
          sx={{
            minWidth: 45,
            height: 45,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor,
            color: 'white',
            borderRadius: '8px',
            fontWeight: 700,
            fontSize: '1.3rem',
            flexShrink: 0
          }}
        >
          {message.nombre}
        </Box>

        {/* Infos principales */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.9rem' }}>
              {message.titre}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
              {formatTime(message.viewed_at)}
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
            {message.origine_label}
          </Typography>
        </Box>
      </Box>

      {/* Message */}
      <Typography
        variant="body2"
        sx={{
          mb: 1,
          whiteSpace: 'pre-line',
          fontSize: '0.875rem',
          lineHeight: 1.5,
          color: 'text.primary'
        }}
      >
        {message.message}
      </Typography>

      {/* Notation */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Rating
          value={message.rating || 0}
          onChange={(_, newValue) => newValue && onRate(message.id, newValue)}
          size="small"
          icon={<StarIcon fontSize="inherit" />}
          emptyIcon={<StarBorderIcon fontSize="inherit" />}
        />
      </Box>

      {/* Note personnelle */}
      {noteEditing ? (
        <Box>
          <TextField
            fullWidth
            multiline
            rows={2}
            value={noteValue}
            onChange={(e) => setNoteValue(e.target.value)}
            placeholder="Note personnelle..."
            size="small"
            sx={{
              mb: 0.5,
              '& .MuiInputBase-input': { fontSize: '0.875rem' }
            }}
          />
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <IconButton size="small" color="primary" onClick={handleSaveNote}>
              <CheckIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => {
                setNoteValue(message.user_note || '');
                setNoteEditing(false);
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      ) : (
        message.user_note || !message.user_note ? (
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
            {message.user_note && (
              <Typography
                variant="caption"
                sx={{
                  fontStyle: 'italic',
                  flex: 1,
                  color: 'text.secondary',
                  fontSize: '0.8rem',
                  backgroundColor: 'rgba(0, 0, 0, 0.02)',
                  p: 0.5,
                  borderRadius: 0.5
                }}
              >
                {message.user_note}
              </Typography>
            )}
            <IconButton
              size="small"
              onClick={() => setNoteEditing(true)}
              sx={{ p: 0.5 }}
            >
              <EditIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>
        ) : null
      )}
    </Card>
  );
};
