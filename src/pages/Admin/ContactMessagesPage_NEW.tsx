// src/pages/Admin/ContactMessagesPage_NEW.tsx
// Version chat améliorée pour l'admin avec envoi d'emails automatique
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
  Tabs,
  Tab,
  Button
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';
import ReopenIcon from '@mui/icons-material/Replay';
import RefreshIcon from '@mui/icons-material/Refresh';
import EmailIcon from '@mui/icons-material/Email';
import PersonIcon from '@mui/icons-material/Person';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import { supabase } from '../../services/supabase';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { logger } from '../../utils/logger';

interface ContactMessage {
  id: string;
  thread_id: string | null;
  parent_id: string | null;
  user_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  status: 'new' | 'processing' | 'responded' | 'closed';
  sender_type: 'public' | 'user' | 'admin' | 'system';
  category: string;
  created_at: string;
  updated_at: string;
  read_by_admin: boolean;
  read_by_user: boolean;
}

interface MessageThread {
  thread_id: string;
  user_id: string | null;
  category: string;
  subject: string;
  status: string;
  first_message_at: string;
  last_message_at: string;
  message_count: number;
  unread_count_user: number;
  unread_count_admin: number;
  reference_type: string | null;
  reference_id: string | null;
  // Informations du premier message
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
}

const AdminContactMessagesPageNew: React.FC = () => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<MessageThread | null>(null);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // États pour l'édition des messages admin
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editedMessageText, setEditedMessageText] = useState('');

  useEffect(() => {
    loadThreads();
  }, [tabValue, refreshTrigger]);

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
    setLoading(true);
    setError(null);

    try {
      // Récupérer les threads avec les infos du premier message
      let query = supabase
        .from('message_threads')
        .select('*')
        .order('last_message_at', { ascending: false });

      // Filtrer selon l'onglet
      if (tabValue === 0) {
        query = query.eq('status', 'new');
      } else if (tabValue === 1) {
        query = query.in('status', ['processing', 'responded']);
      } else if (tabValue === 2) {
        query = query.eq('status', 'closed');
      }

      const { data: threadsData, error: threadsError } = await query;

      if (threadsError) throw threadsError;

      // Pour chaque thread, récupérer les infos du premier message
      const threadsWithInfo = await Promise.all(
        (threadsData || []).map(async (thread) => {
          const { data: firstMessage } = await supabase
            .from('messages')
            .select('first_name, last_name, email, phone')
            .eq('thread_id', thread.thread_id)
            .is('parent_id', null)
            .single();

          return {
            ...thread,
            ...firstMessage
          };
        })
      );

      setThreads(threadsWithInfo);

      // Sélectionner le premier thread si aucun n'est sélectionné
      if (threadsWithInfo.length > 0 && !selectedThread) {
        setSelectedThread(threadsWithInfo[0]);
      }
    } catch (err: any) {
      logger.error('Erreur chargement threads:', err);
      setError(err.message || 'Erreur lors du chargement des conversations');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (threadId: string) => {
    setLoadingMessages(true);
    setError(null);

    try {
      const { data, error: err } = await supabase
        .from('messages')
        .select('*')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });

      if (err) throw err;

      setMessages(data || []);

      // Marquer les messages comme lus par l'admin
      await supabase
        .from('messages')
        .update({ read_by_admin: true })
        .eq('thread_id', threadId)
        .in('sender_type', ['user', 'public'])
        .eq('read_by_admin', false);

      // Recharger les threads pour mettre à jour les compteurs
      loadThreads();
    } catch (err: any) {
      logger.error('Erreur chargement messages:', err);
      setError(err.message || 'Erreur lors du chargement des messages');
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedThread) return;

    setSending(true);
    setError(null);
    setSuccess(null);

    try {
      // Récupérer l'utilisateur admin connecté
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non authentifié');

      // Créer le message dans la base
      const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .insert({
          thread_id: selectedThread.thread_id,
          parent_id: messages.find(m => m.parent_id === null)?.id || null,
          user_id: user.id,
          message: newMessage.trim(),
          sender_type: 'admin',
          read_by_user: false,
          read_by_admin: true
        })
        .select()
        .single();

      if (messageError) throw messageError;

      // Mettre à jour le statut du thread à 'responded'
      const { error: updateError } = await supabase
        .from('messages')
        .update({
          status: 'responded',
          responded_at: new Date().toISOString()
        })
        .eq('thread_id', selectedThread.thread_id)
        .is('parent_id', null);

      if (updateError) logger.warn('Erreur mise à jour statut:', updateError);

      // Envoyer un email à l'utilisateur
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const emailResponse = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-contact-response`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                threadId: selectedThread.thread_id,
                recipientEmail: selectedThread.email,
                recipientName: `${selectedThread.first_name} ${selectedThread.last_name}`,
                subject: selectedThread.subject,
                response: newMessage.trim(),
              }),
            }
          );

          if (emailResponse.ok) {
            logger.debug('Email envoyé avec succès');
          } else {
            logger.warn('Erreur envoi email:', await emailResponse.text());
          }
        }
      } catch (emailError) {
        logger.warn('Exception envoi email:', emailError);
        // Ne pas bloquer si l'email échoue
      }

      // Ajouter le message à la liste locale
      setMessages([...messages, messageData]);
      setNewMessage('');
      setSuccess('Message envoyé avec succès !');

      // Recharger les threads
      setTimeout(() => {
        setSuccess(null);
        setRefreshTrigger(prev => prev + 1);
      }, 2000);
    } catch (err: any) {
      logger.error('Erreur envoi message:', err);
      setError(err.message || 'Erreur lors de l\'envoi du message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Fonctions pour l'édition des messages admin
  const handleStartEdit = (msg: ContactMessage) => {
    setEditingMessageId(msg.id);
    setEditedMessageText(msg.message);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditedMessageText('');
  };

  const handleSaveEdit = async (messageId: string) => {
    if (!editedMessageText.trim()) {
      setError('Le message ne peut pas être vide');
      return;
    }

    try {
      // Mettre à jour le message dans la base
      const { error: updateError } = await supabase
        .from('messages')
        .update({
          message: editedMessageText.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', messageId);

      if (updateError) throw updateError;

      // Mettre à jour le message dans l'état local
      setMessages(messages.map(msg =>
        msg.id === messageId
          ? { ...msg, message: editedMessageText.trim(), updated_at: new Date().toISOString() }
          : msg
      ));

      // Réinitialiser l'état d'édition
      setEditingMessageId(null);
      setEditedMessageText('');
      setSuccess('Message modifié avec succès');

      setTimeout(() => setSuccess(null), 2000);
    } catch (err: any) {
      logger.error('Erreur modification message:', err);
      setError(err.message || 'Erreur lors de la modification du message');
    }
  };

  const handleCloseThread = async () => {
    if (!selectedThread) return;

    try {
      await supabase
        .from('messages')
        .update({ status: 'closed' })
        .eq('thread_id', selectedThread.thread_id)
        .is('parent_id', null);

      setRefreshTrigger(prev => prev + 1);
      setSuccess('Conversation fermée');
    } catch (err: any) {
      setError('Erreur lors de la fermeture');
    }
  };

  const handleReopenThread = async () => {
    if (!selectedThread) return;

    try {
      await supabase
        .from('messages')
        .update({ status: 'responded' })
        .eq('thread_id', selectedThread.thread_id)
        .is('parent_id', null);

      setRefreshTrigger(prev => prev + 1);
      setSuccess('Conversation rouverte');
    } catch (err: any) {
      setError('Erreur lors de la réouverture');
    }
  };

  const getSenderName = (msg: ContactMessage) => {
    if (msg.sender_type === 'system') return '🤖 FL²M Services';
    if (msg.sender_type === 'admin') return '👤 Équipe FL²M Services';
    return `${msg.first_name || 'Client'} ${msg.last_name || ''}`.trim();
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      contact: '#1976d2',
      practitioner_request: '#9c27b0',
      support: '#ff9800',
      billing: '#f44336',
      technical: '#4caf50',
      other: '#757575'
    };
    return colors[category] || '#757575';
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          💬 Messages de contact
        </Typography>
        <Button
          startIcon={<RefreshIcon />}
          onClick={() => setRefreshTrigger(prev => prev + 1)}
          disabled={loading}
        >
          Actualiser
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Paper sx={{ mb: 2 }}>
        <Tabs value={tabValue} onChange={(_, val) => setTabValue(val)}>
          <Tab label="Nouveaux" />
          <Tab label="En cours" />
          <Tab label="Fermés" />
        </Tabs>
      </Paper>

      <Grid container spacing={0} sx={{ height: 'calc(100vh - 300px)', minHeight: '600px' }}>
        {/* Liste des conversations */}
        <Grid item xs={12} md={4} sx={{ height: '100%' }}>
          <Paper sx={{ height: '100%', overflow: 'auto', borderRight: '1px solid #e0e0e0' }}>
            {loading ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : threads.length === 0 ? (
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
                      bgcolor: thread.unread_count_admin > 0 ? 'action.hover' : 'transparent'
                    }}
                  >
                    <Avatar sx={{ mr: 2, bgcolor: getCategoryColor(thread.category) }}>
                      <PersonIcon />
                    </Avatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body1" sx={{ fontWeight: thread.unread_count_admin > 0 ? 700 : 400, flex: 1 }}>
                            {thread.subject}
                          </Typography>
                          {thread.unread_count_admin > 0 && (
                            <Badge badgeContent={thread.unread_count_admin} color="error" />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            {thread.first_name} {thread.last_name} • {thread.email}
                          </Typography>
                          <br />
                          <Typography variant="caption" color="text.secondary">
                            {format(parseISO(thread.last_message_at), 'PPp', { locale: fr })}
                          </Typography>
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
        <Grid item xs={12} md={8} sx={{ height: '100%' }}>
          <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {selectedThread ? (
              <>
                {/* En-tête */}
                <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0', bgcolor: 'grey.50' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: getCategoryColor(selectedThread.category) }}>
                      <PersonIcon />
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.1rem' }}>
                        {selectedThread.subject}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        <EmailIcon sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5 }} />
                        {selectedThread.email}
                        {selectedThread.phone && ` • ${selectedThread.phone}`}
                      </Typography>
                    </Box>
                    {selectedThread.status !== 'closed' ? (
                      <IconButton onClick={handleCloseThread} size="small" title="Fermer">
                        <CloseIcon />
                      </IconButton>
                    ) : (
                      <IconButton onClick={handleReopenThread} size="small" title="Rouvrir">
                        <ReopenIcon />
                      </IconButton>
                    )}
                  </Box>
                </Box>

                {/* Messages */}
                <Box sx={{ flex: 1, overflow: 'auto', p: 2, bgcolor: '#f5f5f5' }}>
                  {loadingMessages ? (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <CircularProgress size={30} />
                    </Box>
                  ) : (
                    <Box>
                      {messages.map((msg, index) => {
                        const isAdmin = msg.sender_type === 'admin';
                        const isSystem = msg.sender_type === 'system';
                        const showDate = index === 0 ||
                          new Date(messages[index - 1].created_at).toDateString() !== new Date(msg.created_at).toDateString();

                        return (
                          <Box key={msg.id}>
                            {showDate && (
                              <Box sx={{ textAlign: 'center', my: 2 }}>
                                <Chip
                                  label={format(parseISO(msg.created_at), 'PPPP', { locale: fr })}
                                  size="small"
                                  sx={{ bgcolor: 'white' }}
                                />
                              </Box>
                            )}

                            {isSystem ? (
                              <Box sx={{ textAlign: 'center', my: 1 }}>
                                <Chip label={msg.message} size="small" sx={{ bgcolor: 'info.light', color: 'white' }} />
                              </Box>
                            ) : (
                              <Box
                                sx={{
                                  display: 'flex',
                                  justifyContent: isAdmin ? 'flex-end' : 'flex-start',
                                  mb: 1
                                }}
                              >
                                <Box sx={{ maxWidth: '70%' }}>
                                  {!isAdmin && (
                                    <Typography
                                      variant="caption"
                                      sx={{ display: 'block', ml: 1, mb: 0.5, fontWeight: 600 }}
                                    >
                                      {getSenderName(msg)}
                                    </Typography>
                                  )}

                                  <Paper
                                    elevation={1}
                                    sx={{
                                      p: 1.5,
                                      bgcolor: isAdmin ? 'primary.main' : 'white',
                                      color: isAdmin ? 'white' : 'text.primary',
                                      borderRadius: isAdmin ? '16px 16px 4px 16px' : '16px 16px 16px 4px'
                                    }}
                                  >
                                    {editingMessageId === msg.id ? (
                                      // Mode édition
                                      <Box>
                                        <TextField
                                          fullWidth
                                          multiline
                                          value={editedMessageText}
                                          onChange={(e) => setEditedMessageText(e.target.value)}
                                          variant="standard"
                                          sx={{
                                            '& .MuiInput-root': {
                                              color: 'white',
                                              '&:before': { borderBottomColor: 'rgba(255,255,255,0.5)' },
                                              '&:after': { borderBottomColor: 'white' }
                                            }
                                          }}
                                        />
                                        <Box sx={{ display: 'flex', gap: 1, mt: 1, justifyContent: 'flex-end' }}>
                                          <IconButton
                                            size="small"
                                            onClick={() => handleSaveEdit(msg.id)}
                                            sx={{ color: 'white' }}
                                            title="Enregistrer"
                                          >
                                            <SaveIcon fontSize="small" />
                                          </IconButton>
                                          <IconButton
                                            size="small"
                                            onClick={handleCancelEdit}
                                            sx={{ color: 'white' }}
                                            title="Annuler"
                                          >
                                            <CancelIcon fontSize="small" />
                                          </IconButton>
                                        </Box>
                                      </Box>
                                    ) : (
                                      // Mode affichage
                                      <Box>
                                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                                          {msg.message}
                                        </Typography>
                                        {isAdmin && (
                                          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }}>
                                            <IconButton
                                              size="small"
                                              onClick={() => handleStartEdit(msg)}
                                              sx={{ color: 'white', opacity: 0.7, '&:hover': { opacity: 1 } }}
                                              title="Modifier"
                                            >
                                              <EditIcon fontSize="small" />
                                            </IconButton>
                                          </Box>
                                        )}
                                      </Box>
                                    )}
                                  </Paper>

                                  <Typography
                                    variant="caption"
                                    sx={{
                                      display: 'block',
                                      mt: 0.5,
                                      mx: 1,
                                      opacity: 0.6,
                                      textAlign: isAdmin ? 'right' : 'left'
                                    }}
                                  >
                                    {format(parseISO(msg.created_at), 'HH:mm')}
                                    {msg.updated_at !== msg.created_at && (
                                      <span style={{ marginLeft: '4px', fontStyle: 'italic' }}>(modifié)</span>
                                    )}
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
                        placeholder="Tapez votre réponse... (enverra aussi un email)"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        disabled={sending}
                        variant="outlined"
                        size="small"
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '20px' } }}
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
                      📧 Un email sera automatiquement envoyé à {selectedThread.email}
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{ p: 2, textAlign: 'center', bgcolor: 'grey.100' }}>
                    <Typography variant="body2" color="text.secondary">
                      Conversation fermée
                    </Typography>
                  </Box>
                )}
              </>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <Typography variant="h6" color="text.secondary">
                  Sélectionnez une conversation
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default AdminContactMessagesPageNew;
