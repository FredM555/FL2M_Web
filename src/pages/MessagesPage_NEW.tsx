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
  Divider
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';
import ReopenIcon from '@mui/icons-material/Replay';
import { useAuth } from '../context/AuthContext';
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
  markThreadAsRead,
  closeMessageThread,
  reopenMessageThread
} from '../services/messaging';

const MessagesPageNew: React.FC = () => {
  const { user, profile } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<MessageThread | null>(null);
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

    const { data, error: err } = await getUserMessageThreads(user.id);

    if (err) {
      setError('Erreur lors du chargement des messages');
      console.error(err);
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
      console.error(err);
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
      console.error(err);
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

  const handleCloseThread = async () => {
    if (!selectedThread) return;

    const { error: err } = await closeMessageThread(selectedThread.thread_id);

    if (err) {
      setError('Erreur lors de la fermeture du message');
    } else {
      setSelectedThread({ ...selectedThread, status: 'closed' });
      loadThreads();
    }
  };

  const handleReopenThread = async () => {
    if (!selectedThread) return;

    const { error: err } = await reopenMessageThread(selectedThread.thread_id);

    if (err) {
      setError('Erreur lors de la réouverture du message');
    } else {
      setSelectedThread({ ...selectedThread, status: 'responded' });
      loadThreads();
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
    <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 } }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 3, fontSize: { xs: '1.5rem', md: '2rem' } }}>
        💬 Mes messages
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={0} sx={{
        height: { xs: 'auto', md: 'calc(100vh - 220px)' },
        minHeight: { xs: '400px', md: '600px' },
        flexDirection: { xs: 'column', md: 'row' }
      }}>
        {/* Liste des conversations */}
        <Grid item xs={12} md={4} sx={{
          height: { xs: '300px', md: '100%' },
          minHeight: { xs: '300px', md: 'auto' }
        }}>
          <Paper sx={{ height: '100%', overflow: 'auto', borderRight: '1px solid #e0e0e0' }}>
            {threads.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="body1" color="text.secondary">
                  Aucune conversation
                </Typography>
              </Box>
            ) : (
              <List sx={{ p: 0 }}>
                {threads.map((thread) => (
                  <ListItemButton
                    key={thread.thread_id}
                    selected={selectedThread?.thread_id === thread.thread_id}
                    onClick={() => setSelectedThread(thread)}
                    sx={{
                      borderBottom: '1px solid #f0f0f0',
                      py: 2,
                      bgcolor: thread.unread_count_user > 0 ? 'action.hover' : 'transparent'
                    }}
                  >
                    <Avatar sx={{ mr: 2, bgcolor: getMessageCategoryColor(thread.category) }}>
                      {getMessageCategoryIcon(thread.category)}
                    </Avatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body1" sx={{ fontWeight: thread.unread_count_user > 0 ? 700 : 400, flex: 1 }}>
                            {thread.subject}
                          </Typography>
                          {thread.unread_count_user > 0 && (
                            <Badge badgeContent={thread.unread_count_user} color="error" />
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
          height: { xs: 'calc(100vh - 500px)', md: '100%' },
          minHeight: { xs: '500px', md: 'auto' }
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
                    {profile?.user_type !== 'intervenant' && (
                      <>
                        {selectedThread.status !== 'closed' ? (
                          <IconButton onClick={handleCloseThread} title="Fermer la conversation" size="small">
                            <CloseIcon />
                          </IconButton>
                        ) : (
                          <IconButton onClick={handleReopenThread} title="Rouvrir la conversation" size="small">
                            <ReopenIcon />
                          </IconButton>
                        )}
                      </>
                    )}
                  </Box>
                </Box>

                {/* Messages (style chat) */}
                <Box sx={{ flex: 1, overflow: 'auto', p: 2, bgcolor: '#f5f5f5' }}>
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
                  <Box sx={{ p: 2, textAlign: 'center', bgcolor: 'grey.100' }}>
                    <Typography variant="body2" color="text.secondary">
                      Cette conversation est fermée. Vous pouvez la rouvrir en cliquant sur l'icône en haut à droite.
                    </Typography>
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
  );
};

export default MessagesPageNew;
