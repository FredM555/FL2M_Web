// src/components/messages/MessagesPanel.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  Avatar,
  Divider,
  CircularProgress,
  Badge,
  Chip
} from '@mui/material';
import { Send as SendIcon } from '@mui/icons-material';
import { Message } from '../../types/messaging';
import {
  createAppointmentMessage,
  getAppointmentMessages,
  markAppointmentMessagesAsRead,
  getThreadMessages,
  replyToMessage,
  markThreadAsRead
} from '../../services/messaging';
import { logger } from '../../utils/logger';
import { useAuth } from '../../context/AuthContext';

interface MessagesPanelProps {
  appointmentId?: string;
  threadId?: string;
  userType: 'client' | 'practitioner' | 'admin';
  onMessageSent?: () => void;
}

export const MessagesPanel: React.FC<MessagesPanelProps> = ({
  appointmentId,
  threadId,
  userType,
  onMessageSent
}) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Debug logging
  React.useEffect(() => {
    logger.debug('[MessagesPanel] Initialisation:', {
      appointmentId,
      threadId,
      userType,
      userId: user?.id
    });
  }, [appointmentId, threadId, userType, user]);

  // Charger les messages
  const loadMessages = async () => {
    setLoading(true);
    try {
      let result;
      if (appointmentId) {
        logger.debug('[MessagesPanel] Chargement messages RDV:', appointmentId);
        result = await getAppointmentMessages(appointmentId);
        logger.debug('[MessagesPanel] Résultat:', { count: result?.data?.length, error: result?.error });
      } else if (threadId) {
        result = await getThreadMessages(threadId);
      }

      if (result?.data) {
        logger.debug('[MessagesPanel] Messages chargés:', result.data);
        setMessages(result.data);

        // Compter les messages non lus
        const isAdmin = userType === 'practitioner' || userType === 'admin';
        const unread = result.data.filter((msg: Message) =>
          isAdmin ? !msg.read_by_admin : !msg.read_by_user
        ).length;
        setUnreadCount(unread);

        // Marquer comme lus automatiquement
        if (unread > 0) {
          setTimeout(() => {
            markMessagesAsRead();
          }, 1000);
        }
      }
    } catch (error) {
      logger.error('Erreur chargement messages:', error);
    } finally {
      setLoading(false);
    }
  };

  // Marquer les messages comme lus
  const markMessagesAsRead = async () => {
    const isAdmin = userType === 'practitioner' || userType === 'admin';

    try {
      if (appointmentId) {
        await markAppointmentMessagesAsRead(appointmentId, isAdmin);
      } else if (threadId) {
        await markThreadAsRead(threadId, isAdmin);
      }
      setUnreadCount(0);
    } catch (error) {
      logger.error('Erreur marquage messages lus:', error);
    }
  };

  // Envoyer un message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      let result;

      if (appointmentId) {
        // Message pour un rendez-vous
        const senderType = userType === 'client' ? 'user' : 'admin';
        result = await createAppointmentMessage(appointmentId, newMessage, senderType);
      } else if (threadId) {
        // Message pour un thread général
        const senderType = userType === 'client' ? 'user' : 'admin';
        result = await replyToMessage({
          thread_id: threadId,
          message: newMessage,
          sender_type: senderType
        });
      }

      if (result?.data) {
        setMessages([...messages, result.data]);
        setNewMessage('');

        if (onMessageSent) {
          onMessageSent();
        }

        // Scroll vers le bas
        setTimeout(() => scrollToBottom(), 100);
      }
    } catch (error) {
      logger.error('Erreur envoi message:', error);
    } finally {
      setSending(false);
    }
  };

  // Scroll automatique vers le bas
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Charger les messages au montage et quand l'ID change
  useEffect(() => {
    if (appointmentId || threadId) {
      loadMessages();
    }
  }, [appointmentId, threadId]);

  // Scroll vers le bas quand les messages changent
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Formater la date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  // Obtenir les initiales pour l'avatar
  const getInitials = (msg: Message) => {
    if (msg.sender_type === 'system') return 'SYS';

    const firstName = msg.first_name || '';
    const lastName = msg.last_name || '';

    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }

    return msg.sender_type === 'admin' ? 'ADM' : 'USR';
  };

  // Obtenir le nom de l'expéditeur
  const getSenderName = (msg: Message) => {
    if (msg.sender_type === 'system') return 'Système';

    const firstName = msg.first_name || '';
    const lastName = msg.last_name || '';

    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    }

    return msg.sender_type === 'admin' ? 'Intervenant' : 'Utilisateur';
  };

  // Déterminer si le message est de l'utilisateur courant
  const isOwnMessage = (msg: Message) => {
    const isAdmin = userType === 'practitioner' || userType === 'admin';

    if (isAdmin) {
      return msg.sender_type === 'admin' || msg.sender_type === 'system';
    } else {
      return msg.sender_type === 'user' && msg.user_id === user?.id;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '400px' }}>
      {/* En-tête avec badge de messages non lus */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box display="flex" alignItems="center" gap={1}>
          <Typography variant="h6">Messages</Typography>
          {unreadCount > 0 && (
            <Chip
              label={`${unreadCount} non lu${unreadCount > 1 ? 's' : ''}`}
              size="small"
              color="primary"
            />
          )}
        </Box>
      </Box>

      {/* Liste des messages */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 2
        }}
      >
        {messages.length === 0 ? (
          <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            flex={1}
            sx={{ color: 'text.secondary' }}
          >
            <Typography variant="body2">Aucun message pour le moment</Typography>
            <Typography variant="caption">Envoyez le premier message!</Typography>
          </Box>
        ) : (
          messages.map((msg) => {
            const isOwn = isOwnMessage(msg);

            return (
              <Box
                key={msg.id}
                sx={{
                  display: 'flex',
                  flexDirection: isOwn ? 'row-reverse' : 'row',
                  gap: 1,
                  alignItems: 'flex-start'
                }}
              >
                <Avatar
                  sx={{
                    bgcolor: msg.sender_type === 'system' ? 'grey.400' :
                             msg.sender_type === 'admin' ? 'primary.main' : 'secondary.main',
                    width: 32,
                    height: 32,
                    fontSize: '0.75rem'
                  }}
                >
                  {getInitials(msg)}
                </Avatar>

                <Box sx={{ maxWidth: '70%' }}>
                  <Paper
                    elevation={1}
                    sx={{
                      p: 1.5,
                      bgcolor: isOwn ? 'primary.light' : 'grey.100',
                      color: isOwn ? 'primary.contrastText' : 'text.primary'
                    }}
                  >
                    <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', mb: 0.5 }}>
                      {getSenderName(msg)}
                    </Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                      {msg.message}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        display: 'block',
                        mt: 0.5,
                        opacity: 0.7,
                        textAlign: 'right'
                      }}
                    >
                      {formatDate(msg.created_at)}
                    </Typography>
                  </Paper>
                </Box>
              </Box>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </Box>

      <Divider />

      {/* Zone de saisie */}
      <Box sx={{ p: 2, bgcolor: 'background.paper' }}>
        <Box display="flex" gap={1} alignItems="flex-end">
          <TextField
            fullWidth
            multiline
            maxRows={4}
            placeholder="Votre message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            disabled={sending}
            size="small"
          />
          <IconButton
            color="primary"
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || sending}
            sx={{
              bgcolor: 'primary.main',
              color: 'white',
              '&:hover': { bgcolor: 'primary.dark' },
              '&.Mui-disabled': { bgcolor: 'action.disabledBackground' }
            }}
          >
            {sending ? <CircularProgress size={24} /> : <SendIcon />}
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
};
