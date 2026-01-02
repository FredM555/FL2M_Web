// src/components/beneficiary/BeneficiaryMessageHistory.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Rating,
  TextField,
  Button,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Collapse,
  Grid,
  ToggleButtonGroup,
  ToggleButton,
  Divider,
  Stack,
  Paper
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
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

export const BeneficiaryMessageHistory: React.FC<Props> = ({ beneficiaryId, beneficiaryName }) => {
  const [messages, setMessages] = useState<DailyMessageHistory[]>([]);
  const [stats, setStats] = useState<MessageHistoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'rated' | 'unrated'>('all');
  const [minRating, setMinRating] = useState<number | null>(null);
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());

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

  const toggleExpand = (messageId: string) => {
    setExpandedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
        Mes Messages du Jour
      </Typography>

      {/* Statistiques */}
      {stats && stats.total_messages > 0 && (
        <Paper sx={{ p: 3, mb: 3, backgroundColor: 'primary.50' }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Statistiques
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6} sm={3}>
              <Typography variant="body2" color="text.secondary">
                Total messages
              </Typography>
              <Typography variant="h6">{stats.total_messages}</Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="body2" color="text.secondary">
                Messages notés
              </Typography>
              <Typography variant="h6">{stats.rated_messages}</Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="body2" color="text.secondary">
                Note moyenne
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="h6">
                  {stats.average_rating ? stats.average_rating.toFixed(1) : '-'}
                </Typography>
                {stats.average_rating && (
                  <Rating value={stats.average_rating} precision={0.1} readOnly size="small" />
                )}
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="body2" color="text.secondary">
                5 étoiles
              </Typography>
              <Typography variant="h6">{stats.five_stars_count}</Typography>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Filtres */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <ToggleButtonGroup
          value={filter}
          exclusive
          onChange={(_, newFilter) => newFilter && setFilter(newFilter)}
          size="small"
        >
          <ToggleButton value="all">Tous</ToggleButton>
          <ToggleButton value="rated">Notés</ToggleButton>
          <ToggleButton value="unrated">Non notés</ToggleButton>
        </ToggleButtonGroup>

        <ToggleButtonGroup
          value={minRating}
          exclusive
          onChange={(_, newRating) => setMinRating(newRating)}
          size="small"
        >
          <ToggleButton value={null}>Toutes notes</ToggleButton>
          <ToggleButton value={5}>5★</ToggleButton>
          <ToggleButton value={4}>4★+</ToggleButton>
          <ToggleButton value={3}>3★+</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Messages d'erreur */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Liste des messages */}
      {messages.length === 0 ? (
        <Alert severity="info">
          Aucun message trouvé. Consultez votre message du jour pour commencer votre historique !
        </Alert>
      ) : (
        <Stack spacing={2}>
          {messages.map((message) => (
            <MessageCard
              key={message.id}
              message={message}
              expanded={expandedMessages.has(message.id)}
              onToggleExpand={() => toggleExpand(message.id)}
              onRate={handleRateMessage}
              onUpdateNote={handleUpdateNote}
              formatDate={formatDate}
            />
          ))}
        </Stack>
      )}
    </Box>
  );
};

// Composant pour afficher un message
interface MessageCardProps {
  message: DailyMessageHistory;
  expanded: boolean;
  onToggleExpand: () => void;
  onRate: (messageId: string, rating: number) => void;
  onUpdateNote: (messageId: string, note: string) => void;
  formatDate: (dateString: string) => string;
}

const MessageCard: React.FC<MessageCardProps> = ({
  message,
  expanded,
  onToggleExpand,
  onRate,
  onUpdateNote,
  formatDate
}) => {
  const [noteEditing, setNoteEditing] = useState(false);
  const [noteValue, setNoteValue] = useState(message.user_note || '');

  const handleSaveNote = () => {
    onUpdateNote(message.id, noteValue);
    setNoteEditing(false);
  };

  return (
    <Card variant="outlined">
      <CardContent>
        {/* En-tête */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Chip
              label={message.origine_label}
              size="small"
              sx={{ mb: 1 }}
              color="primary"
              variant="outlined"
            />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {message.titre}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Consulté le {formatDate(message.viewed_at)}
            </Typography>
          </Box>
          <IconButton onClick={onToggleExpand} size="small">
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>

        {/* Contenu développé */}
        <Collapse in={expanded}>
          <Divider sx={{ my: 2 }} />

          {/* Message */}
          <Typography variant="body1" sx={{ mb: 3, whiteSpace: 'pre-line' }}>
            {message.message}
          </Typography>

          {/* Notation */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Votre notation :
            </Typography>
            <Rating
              value={message.rating || 0}
              onChange={(_, newValue) => newValue && onRate(message.id, newValue)}
              size="large"
              icon={<StarIcon fontSize="inherit" />}
              emptyIcon={<StarBorderIcon fontSize="inherit" />}
            />
            {message.rated_at && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                Noté le {formatDate(message.rated_at)}
              </Typography>
            )}
          </Box>

          {/* Note personnelle */}
          <Box>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Note personnelle :
            </Typography>
            {noteEditing ? (
              <Box>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  value={noteValue}
                  onChange={(e) => setNoteValue(e.target.value)}
                  placeholder="Ajoutez une note personnelle..."
                  size="small"
                  sx={{ mb: 1 }}
                />
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button size="small" variant="contained" onClick={handleSaveNote}>
                    Enregistrer
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => {
                      setNoteValue(message.user_note || '');
                      setNoteEditing(false);
                    }}
                  >
                    Annuler
                  </Button>
                </Box>
              </Box>
            ) : (
              <Box>
                {message.user_note ? (
                  <Typography variant="body2" sx={{ fontStyle: 'italic', mb: 1 }}>
                    {message.user_note}
                  </Typography>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mb: 1 }}>
                    Aucune note personnelle
                  </Typography>
                )}
                <Button size="small" onClick={() => setNoteEditing(true)}>
                  {message.user_note ? 'Modifier' : 'Ajouter une note'}
                </Button>
              </Box>
            )}
          </Box>
        </Collapse>

        {/* Aperçu quand non développé */}
        {!expanded && (
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {message.rating ? (
                <Rating value={message.rating} readOnly size="small" />
              ) : (
                <Chip label="Non noté" size="small" variant="outlined" />
              )}
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};
