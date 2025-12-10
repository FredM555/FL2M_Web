// src/pages/ContactPage.tsx
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Grid,
  Paper,
  Snackbar,
  Alert,
  CircularProgress,
  MenuItem
} from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import SendIcon from '@mui/icons-material/Send';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import SacredGeometryBackground from '../components/SacredGeometryBackground';

// Interface pour le formulaire de contact
interface ContactFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  subject: string;
  module?: string;
  message: string;
}

// Interface pour le message
interface ContactMessage extends ContactFormData {
  createdAt: string;
  status: 'new' | 'processing' | 'responded';
}

const ContactPage = () => {
  const { user, profile } = useAuth();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // État initial du formulaire
  const initialFormState: ContactFormData = {
    first_name: profile?.first_name || '',
    last_name: profile?.last_name || '',
    email: profile?.email || user?.email || '',
    phone: profile?.phone || '',
    subject: '',
    module: '',
    message: ''
  };

  const [formData, setFormData] = useState<ContactFormData>(initialFormState);

  // Pré-remplir le formulaire à partir des paramètres URL
  useEffect(() => {
    const subjectParam = searchParams.get('subject');
    const moduleParam = searchParams.get('module');

    if (subjectParam || moduleParam) {
      setFormData(prev => ({
        ...prev,
        subject: subjectParam || prev.subject,
        module: moduleParam || prev.module
      }));
    }
  }, [searchParams]);

  // Sujets prédéfinis
  const subjects = [
    'Question générale',
    'Prise de rendez-vous',
    'Informations sur une prestation',
    'Partenariat',
    'Autre'
  ];

  // Modules disponibles
  const modules = [
    'Tous',
    'Module Adultes',
    'Module Couples',
    'Module Enfants',
    'Module Suivi Annuel',
    'Module Coéquipiers',
    'Module Équipe',
    'Module Candidats',
    'Module Associés',
    'Module Stratégies',
    'Module Solo',
    'Module Team'
  ];
  
  // Gestion des changements dans le formulaire
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Envoi du formulaire
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      // Créer le message dans la base de données
      const newMessage: Omit<ContactMessage, 'createdAt'> = {
        ...formData,
        status: 'new'
      };
      
      // Insérer le message dans la table messages (anciennement contact_messages)
      const { error: insertError } = await supabase
        .from('messages')
        .insert([{
          ...newMessage,
          category: 'contact', // Catégorie pour les messages du formulaire de contact
          sender_type: 'public' // Type d'expéditeur pour les messages publics
        }]);
      
      if (insertError) throw insertError;
      
      // Envoyer l'email via la fonction Supabase qui utilise Resend
      try {
        const { data: emailData, error: emailError } = await supabase.functions.invoke('send-contact-email', {
          body: {
            message: newMessage,
            adminEmail: 'contact@fl2m.fr' // Email de destination
          }
        });

        if (emailError) {
          console.error('Erreur lors de l\'envoi de l\'email:', emailError);
          // Ne pas bloquer l'envoi si l'email échoue
        } else {
          console.log('Email envoyé avec succès via Resend:', emailData);
        }
      } catch (emailErr) {
        console.error('Erreur lors de l\'envoi de l\'email:', emailErr);
        // Ne pas bloquer l'envoi si l'email échoue
      }

      // Afficher le message de succès
      setSuccess(true);
      
      // Réinitialiser le formulaire
      setFormData(initialFormState);
    } catch (err: any) {
      console.error('Erreur lors de l\'envoi du message:', err);
      setError(err.message || 'Une erreur est survenue lors de l\'envoi du message');
    } finally {
      setLoading(false);
    }
  };
  
  // Fermeture du message de succès
  const handleCloseSnackbar = () => {
    setSuccess(false);
  };
  
  return (
    <Box sx={{ width: '100%', position: 'relative', minHeight: '100vh' }}>
      {/* Image de fond - contact */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 0,
          backgroundImage: 'url(/images/Contact.jpg)',
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
          py: 4,
          mt: { xs: '23px', md: '10px' },
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Container maxWidth="lg">
          <Box
            sx={{
              position: 'relative',
              overflow: 'hidden',
              mb: 1,
              borderRadius: '16px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
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
              <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2 }}>
                <Typography
                  variant="h2"
                  component="h1"
                  sx={{
                    fontWeight: 700,
                    fontSize: { xs: '1.5rem', md: '2.5rem' },
                    textAlign: 'center',
                    background: 'linear-gradient(45deg, #FFD700, #FFA500)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    filter: 'drop-shadow(0 2px 8px rgba(255, 215, 0, 0.3))',
                    mb: 1,
                  }}
                >
                  Contactez-nous
                </Typography>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 400,
                    color: 'rgba(255, 255, 255, 0.9)',
                    lineHeight: 1.7,
                    textAlign: 'center',
                    maxWidth: '800px',
                    mx: 'auto',
                  }}
                >
                  Nous sommes à votre écoute
                </Typography>
              </Container>
            </Box>
          </Box>

        <Box
          sx={{
            py: 0
          }}
        >
          <Container maxWidth="lg">
      <Grid container spacing={6}>
        {/* Informations de contact */}
        <Grid item xs={12} md={5}>
          <Paper
            elevation={0}
            sx={{
              p: 4,
              height: '100%',
              background: 'white',
              border: '2px solid rgba(255, 215, 0, 0.3)',
              borderRadius: 3,
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '4px',
                background: 'linear-gradient(90deg, #FFD700, #FFA500)',
              },
            }}
          >
            <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 600, color: '#1a1a2e' }}>
              Nos coordonnées
            </Typography>
            
            <Typography paragraph sx={{ mb: 4 }}>
              Nous sommes à votre écoute. Utilisez ce formulaire pour nous envoyer votre message ou 
              contactez-nous directement via les coordonnées ci-dessous.
            </Typography>
            
            <Box sx={{ my: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <EmailIcon sx={{ mr: 2, color: '#FFA500' }} />
                <Typography>
                  <strong>Email:</strong> contact@fl2m.com
                </Typography>
              </Box>

            </Box>
            
            <Typography variant="body2" color="text.secondary" sx={{ mt: 4 }}>
              Nos conseillers sont disponibles du lundi au vendredi, de 9h à 18h.
              Nous nous efforçons de répondre à toutes les demandes dans un délai de 24 heures ouvrées.
            </Typography>
          </Paper>
        </Grid>
        
        {/* Formulaire de contact */}
        <Grid item xs={12} md={7}>
          <Paper
            elevation={0}
            sx={{
              p: 4,
              background: 'white',
              border: '2px solid rgba(255, 215, 0, 0.3)',
              borderRadius: 3,
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '4px',
                background: 'linear-gradient(90deg, #FFD700, #FFA500)',
              },
            }}
          >
            <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 600, color: '#1a1a2e' }}>
              Envoyez-nous un message
            </Typography>
            
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}
            
            <form onSubmit={handleSubmit}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="first_name"
                    label="Prénom"
                    value={formData.first_name}
                    onChange={handleChange}
                    fullWidth
                    required
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="last_name"
                    label="Nom"
                    value={formData.last_name}
                    onChange={handleChange}
                    fullWidth
                    required
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="email"
                    label="Email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    fullWidth
                    required
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="phone"
                    label="Téléphone"
                    value={formData.phone}
                    onChange={handleChange}
                    fullWidth
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    name="subject"
                    label="Sujet"
                    select
                    value={formData.subject}
                    onChange={handleChange}
                    fullWidth
                    required
                    margin="normal"
                  >
                    {subjects.map((option) => (
                      <MenuItem key={option} value={option}>
                        {option}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                {/* Champ Module - affiché uniquement si le sujet est "Informations sur les prestations" */}
                {formData.subject === 'Informations sur une prestation' && (
                  <Grid item xs={12}>
                    <TextField
                      name="module"
                      label="Module concerné"
                      select
                      value={formData.module}
                      onChange={handleChange}
                      fullWidth
                      margin="normal"
                      helperText="Sélectionnez le module pour lequel vous souhaitez des informations"
                    >
                      {modules.map((option) => (
                        <MenuItem key={option} value={option}>
                          {option}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                )}

                <Grid item xs={12}>
                  <TextField
                    name="message"
                    label="Message"
                    value={formData.message}
                    onChange={handleChange}
                    fullWidth
                    required
                    multiline
                    rows={6}
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    endIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                    disabled={loading}
                    sx={{
                      mt: 2,
                      px: 4,
                      py: 1.5,
                      background: 'linear-gradient(45deg, #FFD700, #FFA500)',
                      color: '#1a1a2e',
                      fontWeight: 600,
                      borderRadius: 50,
                      boxShadow: '0 8px 25px rgba(255, 215, 0, 0.3)',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        background: 'linear-gradient(45deg, #FFA500, #FFD700)',
                        transform: 'translateY(-3px)',
                        boxShadow: '0 12px 35px rgba(255, 215, 0, 0.4)',
                      },
                      '&:disabled': {
                        background: 'rgba(0, 0, 0, 0.12)',
                        color: 'rgba(0, 0, 0, 0.26)',
                      },
                    }}
                  >
                    {loading ? 'Envoi en cours...' : 'Envoyer le message'}
                  </Button>
                </Grid>
              </Grid>
            </form>
          </Paper>
        </Grid>
      </Grid>
          </Container>
        </Box>
        </Container>
      </Box>

      {/* Message de succès */}
      <Snackbar
        open={success}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity="success"
          variant="filled"
          sx={{ width: '100%' }}
        >
          Votre message a été envoyé avec succès ! Nous vous répondrons dans les plus brefs délais.
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ContactPage;