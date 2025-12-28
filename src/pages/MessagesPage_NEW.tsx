// src/pages/MessagesPage_NEW.tsx
// Version améliorée avec interface de chat moderne
import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  List,
  ListItemButton,
  ListItemText,
  TextField,
  IconButton,
  Chip,
  Avatar,
  CircularProgress,
  Alert,
  Badge,
  Divider,
  FormControlLabel,
  Switch
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { useAuth } from '../context/AuthContext';
import SacredGeometryBackground from '../components/SacredGeometryBackground';
import {
  MessageThread,
  MessageWithSender,
  getMessageCategoryLabel,
  getMessageCategoryColor,
  getMessageCategoryIcon,
  getMessageStatusLabel,
  getMessageStatusColor
} from '../types/messaging';
import {
  getUserMessageThreads,
  getThreadMessages,
  replyToMessage,
  markThreadAsRead
} from '../services/messaging';
import { logger } from '../utils/logger';

const MessagesPageNew: React.FC = () => {
  const { user, profile } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Filtre pour afficher tous les messages ou uniquement les actifs
  const [showAllMessages, setShowAllMessages] = useState(false);

  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<MessageThread | null>(null);

  // Réinitialiser le thread sélectionné si il n'est plus dans la liste filtrée
  useEffect(() => {
    if (selectedThread && !showAllMessages && selectedThread.status === 'closed') {
      // Si le thread sélectionné est fermé et qu'on affiche seulement les actifs, le désélectionner
      setSelectedThread(null);
    }
  }, [showAllMessages, selectedThread]);
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadThreads();
    }
  }, [user]);

  useEffect(() => {
    if (selectedThread) {
      loadMessages(selectedThread.thread_id);
    }
  }, [selectedThread]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadThreads = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    // personalOnly = true pour afficher uniquement les messages personnels
    const { data, error: err } = await getUserMessageThreads(user.id, true);

    if (err) {
      setError('Erreur lors du chargement des messages');
      logger.error(err);
    } else if (data) {
      setThreads(data);
      // Sélectionner le premier thread par défaut
      if (data.length > 0 && !selectedThread) {
        setSelectedThread(data[0]);
      }
    }

    setLoading(false);
  };

  const loadMessages = async (threadId: string) => {
    setLoadingMessages(true);
    setError(null);

    const { data, error: err } = await getThreadMessages(threadId);

    if (err) {
      setError('Erreur lors du chargement des messages');
      logger.error(err);
    } else if (data) {
      setMessages(data);
      // Marquer comme lu
      await markThreadAsRead(threadId, false);
      // Recharger les threads pour mettre à jour le badge
      if (user) {
        loadThreads();
      }
    }

    setLoadingMessages(false);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedThread || !user) return;

    setSending(true);
    setError(null);

    const { data, error: err } = await replyToMessage({
      thread_id: selectedThread.thread_id,
      message: newMessage.trim(),
      sender_type: 'user'
    });

    if (err) {
      setError('Erreur lors de l\'envoi du message');
      logger.error(err);
    } else if (data) {
      // Ajouter le message à la liste
      const newMsg: MessageWithSender = {
        ...data,
        sender: {
          first_name: profile?.first_name || '',
          last_name: profile?.last_name || '',
          email: profile?.email || '',
          user_type: profile?.user_type || 'client'
        }
      };
      setMessages([...messages, newMsg]);
      setNewMessage('');
      // Recharger les threads pour mettre à jour last_message
      if (user) {
        loadThreads();
      }
    }

    setSending(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 48) {
      return 'Hier';
    } else {
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    }
  };

  const getSenderName = (msg: MessageWithSender) => {
    if (msg.sender_type === 'system') return '🤖 FL²M Services';
    if (msg.sender_type === 'admin') return '👤 Équipe FL²M Services';
    if (msg.sender_type === 'public') {
      return `${msg.first_name || 'Vous'} ${msg.last_name || ''}`.trim();
    }
    if (msg.sender) {
      return `${msg.sender.first_name} ${msg.sender.last_name}`.trim();
    }
    return 'Vous';
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 8, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
          Chargement...
        </Typography>
      </Container>
    );
  }

  return (
    <Box sx={{ width: '100%', position: 'relative', minHeight: '100vh' }}>
      {/* Image de fond avec opacité */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 0,
          backgroundImage: 'url(/images/MesMessages.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          opacity: 0.7,
          pointerEvents: 'none',
        }}
      />
      {/* Overlay pour adoucir l'image */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 0,
          background: 'linear-gradient(180deg, rgba(248, 249, 250, 0.3) 0%, rgba(233, 236, 239, 0.35) 50%, rgba(222, 226, 230, 0.4) 100%)',
          pointerEvents: 'none',
        }}
      />
      <Box
        sx={{
          background: 'rgba(245, 247, 250, 0.6)',
          backdropFilter: 'blur(2px)',
          py: { xs: 2, md: 4 },
          mt: { xs: '80px', md: '40px' },
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Container maxWidth="xl" sx={{
          height: { xs: 'auto', md: 'calc(100vh - 200px)' },
          display: { xs: 'block', md: 'flex' },
          flexDirection: 'column'
        }}>
          {/* Bandeau bleu avec titre */}
          <Box
            sx={{
              position: 'relative',
              overflow: 'hidden',
              mb: 3,
              borderRadius: '16px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
              flexShrink: 0
            }}
          >
            <Box
              sx={{
                background: 'linear-gradient(135deg, #345995 0%, #1D3461 100%)',
                color: 'white',
                p: 3,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <SacredGeometryBackground theme="particuliers" />
              <Typography
                variant="h4"
                component="h1"
                sx={{
                  fontWeight: 700,
                  fontSize: { xs: '1.5rem', md: '2rem' },
                  position: 'relative',
                  zIndex: 2,
                }}
              >
                📨 Mes messages personnels
              </Typography>
            </Box>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3, flexShrink: 0 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Grid container spacing={0} sx={{
        height: { xs: '600px', md: '100%' },
        flex: { xs: 'none', md: 1 },
        minHeight: { xs: '400px', md: 0 },
        flexDirection: { xs: 'column', md: 'row' }
      }}>
        {/* Liste des conversations */}
        <Grid item xs={12} md={4} sx={{
          height: { xs: '300px', md: '100%' }
        }}>
          <Paper sx={{
            height: '100%',
            borderRight: '1px solid #e0e0e0',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Filtre pour afficher tous les messages ou uniquement les actifs */}
            <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0', bgcolor: 'grey.50', flexShrink: 0 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={showAllMessages}
                    onChange={(e) => setShowAllMessages(e.target.checked)}
                    color="primary"
                  />
                }
                label={
                  <Typography variant="body2">
                    {showAllMessages ? '📋 Tous les messages' : '✅ Messages actifs uniquement'}
                  </Typography>
                }
              />
            </Box>

            {threads.filter(thread => showAllMessages || thread.status !== 'closed').length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center', flex: 1 }}>
                <Typography variant="body1" color="text.secondary">
                  Aucune conversation
                </Typography>
              </Box>
            ) : (
              <List sx={{
                p: 0,
                flex: 1,
                overflow: 'auto',
                '&::-webkit-scrollbar': {
                  width: '8px',
                },
                '&::-webkit-scrollbar-track': {
                  backgroundColor: '#f1f1f1',
                },
                '&::-webkit-scrollbar-thumb': {
                  backgroundColor: '#888',
                  borderRadius: '4px',
                },
                '&::-webkit-scrollbar-thumb:hover': {
                  backgroundColor: '#555',
                }
              }}>
                {threads.filter(thread => showAllMessages || thread.status !== 'closed').map((thread) => (
                  <ListItemButton
                    key={thread.thread_id}
                    selected={selectedThread?.thread_id === thread.thread_id}
                    onClick={() => setSelectedThread(thread)}
                    sx={{
                      borderBottom: '1px solid #f0f0f0',
                      py: 2,
                      bgcolor: thread.unread_count_user > 0 ? 'action.hover' : 'transparent',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <Avatar sx={{ mr: 2, bgcolor: getMessageCategoryColor(thread.category) }}>
                      {getMessageCategoryIcon(thread.category)}
                    </Avatar>
                    <ListItemText
                      sx={{ flex: 1, minWidth: 0 }}
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body1" sx={{ fontWeight: thread.unread_count_user > 0 ? 700 : 400, flex: 1 }}>
                            {thread.subject}
                          </Typography>
                          {thread.unread_count_user > 0 && (
                            <Badge badgeContent={thread.unread_count_user} color="primary" />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            {getMessageCategoryLabel(thread.category)}
                          </Typography>
                          {thread.last_message_at && (
                            <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                              • {formatDate(thread.last_message_at)}
                            </Typography>
                          )}
                          {(thread.user_pseudo || thread.user_first_name) && (
                            <Typography variant="caption" color="text.secondary" sx={{ ml: 1, fontWeight: 500 }}>
                              • 👤 {thread.user_pseudo || `${thread.user_first_name} ${thread.user_last_name || ''}`}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </ListItemButton>
                ))}
              </List>
            )}
          </Paper>
        </Grid>

        {/* Zone de chat */}
        <Grid item xs={12} md={8} sx={{
          height: { xs: '300px', md: '100%' }
        }}>
          <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {selectedThread ? (
              <>
                {/* En-tête de la conversation */}
                <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0', bgcolor: 'grey.50' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: getMessageCategoryColor(selectedThread.category) }}>
                      {getMessageCategoryIcon(selectedThread.category)}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.1rem' }}>
                        {selectedThread.subject}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <Chip
                          label={getMessageCategoryLabel(selectedThread.category)}
                          size="small"
                          sx={{ height: '20px', fontSize: '0.7rem' }}
                        />
                        <Chip
                          label={getMessageStatusLabel(selectedThread.status)}
                          size="small"
                          color={getMessageStatusColor(selectedThread.status)}
                          sx={{ height: '20px', fontSize: '0.7rem' }}
                        />
                      </Box>
                    </Box>
                  </Box>
                </Box>

                {/* Messages (style chat) */}
                <Box sx={{
                  flex: 1,
                  overflow: 'auto',
                  p: 2,
                  bgcolor: '#f5f5f5',
                  '&::-webkit-scrollbar': {
                    width: '8px',
                  },
                  '&::-webkit-scrollbar-track': {
                    backgroundColor: '#f1f1f1',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    backgroundColor: '#888',
                    borderRadius: '4px',
                  },
                  '&::-webkit-scrollbar-thumb:hover': {
                    backgroundColor: '#555',
                  }
                }}>
                  {loadingMessages ? (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <CircularProgress size={30} />
                    </Box>
                  ) : messages.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 4 }}>
                      Aucun message dans cette conversation
                    </Typography>
                  ) : (
                    <Box>
                      {messages.map((msg, index) => {
                        const isMyMessage = msg.sender_type === 'user' || msg.sender_type === 'public';
                        const isSystem = msg.sender_type === 'system';
                        const isAdmin = msg.sender_type === 'admin';

                        // Afficher la date si c'est un nouveau jour
                        const showDate = index === 0 ||
                          new Date(messages[index - 1].created_at).toDateString() !== new Date(msg.created_at).toDateString();

                        return (
                          <Box key={msg.id}>
                            {showDate && (
                              <Box sx={{ textAlign: 'center', my: 2 }}>
                                <Chip
                                  label={new Date(msg.created_at).toLocaleDateString('fr-FR', {
                                    weekday: 'long',
                                    day: 'numeric',
                                    month: 'long'
                                  })}
                                  size="small"
                                  sx={{ bgcolor: 'white' }}
                                />
                              </Box>
                            )}

                            {isSystem ? (
                              // Message système (centré)
                              <Box sx={{ textAlign: 'center', my: 1 }}>
                                <Chip
                                  label={msg.message}
                                  size="small"
                                  sx={{ bgcolor: 'info.light', color: 'white' }}
                                />
                              </Box>
                            ) : (
                              // Message utilisateur ou admin
                              <Box
                                sx={{
                                  display: 'flex',
                                  justifyContent: isMyMessage ? 'flex-end' : 'flex-start',
                                  mb: 1
                                }}
                              >
                                <Box sx={{ maxWidth: '70%' }}>
                                  {/* Nom de l'expéditeur pour les messages admin */}
                                  {!isMyMessage && (
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        display: 'block',
                                        ml: 1,
                                        mb: 0.5,
                                        fontWeight: 600,
                                        color: 'primary.main'
                                      }}
                                    >
                                      {getSenderName(msg)}
                                    </Typography>
                                  )}

                                  <Paper
                                    elevation={1}
                                    sx={{
                                      p: 1.5,
                                      bgcolor: isMyMessage ? 'primary.main' : 'white',
                                      color: isMyMessage ? 'white' : 'text.primary',
                                      borderRadius: isMyMessage ? '16px 16px 4px 16px' : '16px 16px 16px 4px'
                                    }}
                                  >
                                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                      {msg.message}
                                    </Typography>
                                  </Paper>

                                  {/* Heure */}
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      display: 'block',
                                      mt: 0.5,
                                      mx: 1,
                                      opacity: 0.6,
                                      textAlign: isMyMessage ? 'right' : 'left'
                                    }}
                                  >
                                    {new Date(msg.created_at).toLocaleTimeString('fr-FR', {
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </Typography>
                                </Box>
                              </Box>
                            )}
                          </Box>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </Box>
                  )}
                </Box>

                {/* Zone de saisie */}
                {selectedThread.status !== 'closed' ? (
                  <Box sx={{ p: 2, borderTop: '1px solid #e0e0e0', bgcolor: 'white' }}>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <TextField
                        fullWidth
                        multiline
                        maxRows={4}
                        placeholder="Tapez votre message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        disabled={sending}
                        variant="outlined"
                        size="small"
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: '20px'
                          }
                        }}
                      />
                      <IconButton
                        color="primary"
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim() || sending}
                        sx={{
                          bgcolor: 'primary.main',
                          color: 'white',
                          '&:hover': { bgcolor: 'primary.dark' },
                          '&:disabled': { bgcolor: 'grey.300' }
                        }}
                      >
                        {sending ? <CircularProgress size={20} /> : <SendIcon />}
                      </IconButton>
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      Appuyez sur Entrée pour envoyer, Shift+Entrée pour une nouvelle ligne
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{ p: 2, borderTop: '1px solid #e0e0e0', bgcolor: 'grey.50' }}>
                    <Alert severity="info">
                      Cette conversation a été fermée par l'équipe. Vous ne pouvez plus y répondre.
                    </Alert>
                  </Box>
                )}
              </>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <Typography variant="h6" color="text.secondary">
                  Sélectionnez une conversation pour commencer
                </Typography>
              </Box>
            )}
          </Paper>
          </Grid>
          </Grid>
        </Container>
      </Box>
    </Box>
  );
};

export default MessagesPageNew;
