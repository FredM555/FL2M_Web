import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Box
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { logger } from '../utils/logger';

// Interface pour les professionnels
interface Professionnel {
  id: number;
  nom: string;
  prenom: string;
  specialite: string;
}

const RendezVousPage: React.FC = () => {
  // Liste des professionnels (à remplacer par des données dynamiques)
  const professionnels: Professionnel[] = [
    {
      id: 1,
      nom: 'Dupont',
      prenom: 'Jean',
      specialite: 'Médecine Générale'
    },
    {
      id: 2,
      nom: 'Martin',
      prenom: 'Sophie',
      specialite: 'Gynécologie'
    },
    {
      id: 3,
      nom: 'Leroy',
      prenom: 'Pierre',
      specialite: 'Cardiologie'
    }
  ];

  // États pour gérer le formulaire de rendez-vous
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [professionnel, setProfessionnel] = useState('');
  const [date, setDate] = useState<Date | null>(null);

  // Gestion de la soumission du formulaire
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Logique de réservation de rendez-vous (à implémenter)
    logger.debug('Rendez-vous réservé', { 
      nom, 
      prenom, 
      email, 
      telephone, 
      professionnel, 
      date 
    });
    
    // Réinitialisation du formulaire
    setNom('');
    setPrenom('');
    setEmail('');
    setTelephone('');
    setProfessionnel('');
    setDate(null);
  };

  return (
    <Box sx={{ maxWidth: '1200px', mx: 'auto', p: 4 }}>
      <Typography variant="h3" component="h1" align="center" fontWeight="bold" sx={{ mb: 6 }}>
        Prendre Rendez-vous
      </Typography>
      
      <Grid container spacing={6}>
        {/* Formulaire de réservation */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h5" component="h2" gutterBottom>
                Réservation de Rendez-vous
              </Typography>
              
              <form onSubmit={handleSubmit}>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={12} sm={6}>
                    <TextField 
                      label="Nom" 
                      value={nom}
                      onChange={(e) => setNom(e.target.value)}
                      required 
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField 
                      label="Prénom" 
                      value={prenom}
                      onChange={(e) => setPrenom(e.target.value)}
                      required 
                      fullWidth
                    />
                  </Grid>
                </Grid>
                
                <TextField 
                  label="Email" 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                  fullWidth
                  sx={{ mt: 2 }}
                />
                
                <TextField 
                  label="Téléphone" 
                  type="tel" 
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  required 
                  fullWidth
                  sx={{ mt: 2 }}
                />
                
                <FormControl fullWidth sx={{ mt: 2 }}>
                  <InputLabel>Choisir un professionnel</InputLabel>
                  <Select
                    value={professionnel}
                    onChange={(e) => setProfessionnel(e.target.value)}
                    label="Choisir un professionnel"
                    required
                  >
                    {professionnels.map((pro) => (
                      <MenuItem 
                        key={pro.id} 
                        value={`${pro.id}`}
                      >
                        {pro.prenom} {pro.nom} - {pro.specialite}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* Calendrier de sélection de date */}
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                  <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
                    <DatePicker
                      label="Choisir une date"
                      value={date}
                      onChange={(newValue) => setDate(newValue)}
                      disablePast
                      slotProps={{
                        textField: { fullWidth: true }
                      }}
                    />
                  </LocalizationProvider>
                </Box>

                {/* Affichage de la date sélectionnée */}
                {date && (
                  <Typography align="center" sx={{ mt: 2, fontWeight: 500 }}>
                    Date sélectionnée : {format(date, 'PPP', { locale: fr })}
                  </Typography>
                )}

                <Button 
                  type="submit" 
                  variant="contained"
                  fullWidth
                  sx={{ mt: 3 }}
                  disabled={!nom || !prenom || !email || !telephone || !professionnel || !date}
                >
                  Confirmer le Rendez-vous
                </Button>
              </form>
            </CardContent>
          </Card>
        </Grid>

        {/* Informations complémentaires */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h5" component="h2" gutterBottom>
                Informations Importantes
              </Typography>
              
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Conseils pour votre Rendez-vous
                </Typography>
                <ul style={{ paddingLeft: '20px' }}>
                  <li>
                    Munissez-vous de votre carte vitale et de vos documents médicaux
                  </li>
                  <li>
                    Arrivez 10-15 minutes avant l'heure du rendez-vous
                  </li>
                  <li>
                    En cas d'empêchement, merci de prévenir au moins 24h à l'avance
                  </li>
                </ul>
              </Box>

              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Horaires de Consultation
                </Typography>
                <Typography>
                  Lundi - Vendredi : 8h - 19h
                  <br />
                  Samedi : 9h - 13h
                  <br />
                  Fermé le dimanche
                </Typography>
              </Box>

              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Politique d'Annulation
                </Typography>
                <Typography>
                  Toute annulation doit être effectuée au moins 24h avant le rendez-vous. 
                  En cas de non-respect, des frais pourront être appliqués.
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default RendezVousPage;