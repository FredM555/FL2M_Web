// src/pages/MessagesPage.tsx
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
  Button,
  IconButton,
  Chip,
  Avatar,
  CircularProgress,
  Alert,
  Badge
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
import { logger } from '../utils/logger';
import {
  getUserMessageThreads,
  getThreadMessages,
  replyToMessage,
  markThreadAsRead,
  closeMessageThread,
  reopenMessageThread
} from '../services/messaging';

const MessagesPage: React.FC = () => {
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

  const handleCloseThread = async () => {
    if (!selectedThread) return;

    const { error: err } = await closeMessageThread(selectedThread.thread_id);

    if (err) {
      setError('Erreur lors de la fermeture du message');
    } else {
      // Mettre à jour l'état local
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
      // Mettre à jour l'état local
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
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>
        💬 Mes messages
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={0} sx={{ height: 'calc(100vh - 250px)' }}>
        {/* Liste des threads */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ height: '100%', overflow: 'auto', borderRight: '1px solid #e0e0e0' }}>
            {threads.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="body1" color="text.secondary">
                  Aucun message
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
                        </Box>
                      }
                    />
                  </ListItemButton>
                ))}
              </List>
            )}
          </Paper>
        </Grid>

        {/* Zone de messages */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {selectedThread ? (
              <>
                {/* En-tête du thread */}
                <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: getMessageCategoryColor(selectedThread.category) }}>
                    {getMessageCategoryIcon(selectedThread.category)}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {selectedThread.subject}
                    </Typography>
                    <Chip
                      label={getMessageStatusLabel(selectedThread.status)}
                      size="small"
                      color={getMessageStatusColor(selectedThread.status)}
                      sx={{ mt: 0.5 }}
                    />
                  </Box>
                  {selectedThread.status !== 'closed' ? (
                    <IconButton onClick={handleCloseThread} title="Fermer le message">
                      <CloseIcon />
                    </IconButton>
                  ) : (
                    <IconButton onClick={handleReopenThread} title="Rouvrir le message">
                      <ReopenIcon />
                    </IconButton>
                  )}
                </Box>

                {/* Messages */}
                <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                  {loadingMessages ? (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <CircularProgress size={30} />
                    </Box>
                  ) : messages.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 4 }}>
                      Aucun message
                    </Typography>
                  ) : (
                    <Box>
                      {messages.map((msg) => {
                        const isUser = msg.sender_type === 'user';
                        const isSystem = msg.sender_type === 'system';
                        const isPublic = msg.sender_type === 'public';

                        return (
                          <Box
                            key={msg.id}
                            sx={{
                              display: 'flex',
                              justifyContent: isUser || isPublic ? 'flex-end' : 'flex-start',
                              mb: 2
                            }}
                          >
                            <Paper
                              elevation={1}
                              sx={{
                                p: 2,
                                maxWidth: '70%',
                                bgcolor: isSystem
                                  ? 'grey.100'
                                  : isUser || isPublic
                                  ? 'primary.main'
                                  : 'background.paper',
                                color: (isUser || isPublic) && !isSystem ? 'white' : 'text.primary'
                              }}
                            >
                              {!isUser && !isPublic && msg.sender && (
                                <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                                  {isSystem
                                    ? '🤖 Système'
                                    : msg.sender_type === 'admin'
                                    ? '👤 Administrateur'
                                    : `${msg.sender.first_name} ${msg.sender.last_name}`}
                                </Typography>
                              )}
                              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                                {msg.message}
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{
                                  display: 'block',
                                  mt: 1,
                                  opacity: 0.7,
                                  textAlign: 'right'
                                }}
                              >
                                {new Date(msg.created_at).toLocaleString('fr-FR', {
                                  day: 'numeric',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </Typography>
                            </Paper>
                          </Box>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </Box>
                  )}
                </Box>

                {/* Zone de saisie */}
                {selectedThread.status !== 'closed' && (
                  <Box sx={{ p: 2, borderTop: '1px solid #e0e0e0' }}>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <TextField
                        fullWidth
                        multiline
                        maxRows={4}
                        placeholder="Écrire un message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        disabled={sending}
                      />
                      <Button
                        variant="contained"
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim() || sending}
                        sx={{ minWidth: 50 }}
                      >
                        {sending ? <CircularProgress size={24} /> : <SendIcon />}
                      </Button>
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      Appuyez sur Entrée pour envoyer, Shift+Entrée pour une nouvelle ligne
                    </Typography>
                  </Box>
                )}

                {selectedThread.status === 'closed' && (
                  <Box sx={{ p: 2, borderTop: '1px solid #e0e0e0', bgcolor: 'grey.50' }}>
                    <Alert severity="info">
                      Ce message est fermé. Vous pouvez le rouvrir pour continuer à échanger.
                    </Alert>
                  </Box>
                )}
              </>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <Typography variant="body1" color="text.secondary">
                  Sélectionnez un message pour voir la conversation
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default MessagesPage;
