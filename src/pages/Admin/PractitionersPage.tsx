// src/pages/admin/PractitionersPage.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  CircularProgress,
  Snackbar,
  Alert,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  Switch,
  FormControlLabel
} from '@mui/material';
import { supabase, Practitioner, Profile } from '../../services/supabase';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { useAuth } from '../../context/AuthContext';

// Type étendu pour inclure le profil complet
interface EnhancedPractitioner extends Practitioner {
  profile?: Profile;
}

const AdminPractitionersPage: React.FC = () => {
  const { user } = useAuth();
  const [practitioners, setPractitioners] = useState<EnhancedPractitioner[]>([]);
  const [availableUsers, setAvailableUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPractitioner, setSelectedPractitioner] = useState<Partial<EnhancedPractitioner>>({});
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Champs de formulaire
  const [bioText, setBioText] = useState('');
  const [priority, setPriority] = useState<number>(0);
  const [displayName, setDisplayName] = useState('');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Charger les consultants et les utilisateurs disponibles
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Chargement des intervenants avec leur profil associé
      const { data: practitionersData, error: practitionersError } = await supabase
        .from('practitioners')
        .select(`
          *,
          profile:profiles(*)
        `)
        .order('priority', { ascending: false });

      if (practitionersError) throw practitionersError;
      
      // Chargement des profils qui ne sont pas déjà consultants
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*');
        
      if (profilesError) throw profilesError;
      
      // Filtrer les profils qui ne sont pas déjà des intervenants
      const practitionerUserIds = practitionersData?.map(p => p.user_id) || [];
      const availableProfiles = profilesData?.filter(p => !practitionerUserIds.includes(p.id)) || [];
      
      setPractitioners(practitionersData || []);
      setAvailableUsers(availableProfiles);
    } catch (err: any) {
      setError(`Erreur lors du chargement des données: ${err.message}`);
      console.error('Erreur lors du chargement:', err);
    } finally {
      setLoading(false);
    }
  };

  // Gestionnaire d'ouverture du formulaire d'ajout
  const handleAddClick = () => {
    setSelectedPractitioner({
      priority: 0,
      bio: '',
      display_name: '',
      title: '',
      summary: '',
      is_active: true
    });
    setSelectedUserId(null);
    setBioText('');
    setPriority(0);
    setDisplayName('');
    setTitle('');
    setSummary('');
    setIsActive(true);
    setDialogOpen(true);
  };

  // Gestionnaire d'ouverture du formulaire d'édition
  const handleEditClick = (practitioner: EnhancedPractitioner) => {
    setSelectedPractitioner(practitioner);
    setSelectedUserId(practitioner.user_id || null);
    setBioText(practitioner.bio || '');
    setPriority(practitioner.priority || 0);
    setDisplayName(practitioner.display_name || '');
    setTitle(practitioner.title || '');
    setSummary(practitioner.summary || '');
    setIsActive(practitioner.is_active !== false); // Par défaut actif si non défini
    setDialogOpen(true);
  };

  // Gestionnaire de changement de statut actif
  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    setLoading(true);
    try {
      const { error: updateError } = await supabase
        .from('practitioners')
        .update({
          is_active: !currentStatus,
          updated_by: user?.id
        })
        .eq('id', id);

      if (updateError) throw updateError;
      
      setSuccess(`Consultant ${!currentStatus ? 'activé' : 'désactivé'} avec succès`);
      loadData();
    } catch (err: any) {
      setError(`Erreur lors de la mise à jour du statut: ${err.message}`);
      console.error('Erreur lors de la mise à jour du statut:', err);
    } finally {
      setLoading(false);
    }
  };

  // Gestionnaire de fermeture du formulaire
  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedPractitioner({});
    setSelectedUserId(null);
    setBioText('');
    setPriority(0);
    setDisplayName('');
    setTitle('');
    setSummary('');
    setIsActive(true);
  };

  // Gestionnaire de soumission du formulaire
  const handleSubmit = async () => {
    if (!selectedUserId && !selectedPractitioner.id) {
      setError('Veuillez sélectionner un utilisateur');
      return;
    }

    setLoading(true);
    try {
      const practitionerData = {
        bio: bioText,
        priority: priority,
        display_name: displayName,
        title: title,
        summary: summary,
        is_active: isActive,
        updated_by: user?.id
      };

      if (selectedPractitioner.id) {
        // Mise à jour d'un consultant existant
        const { error: updateError } = await supabase
          .from('practitioners')
          .update(practitionerData)
          .eq('id', selectedPractitioner.id);

        if (updateError) throw updateError;
        setSuccess('Consultant mis à jour avec succès');
      } else {
        // Création d'un nouveau consultant
        const { error: insertError } = await supabase
          .from('practitioners')
          .insert([{
            ...practitionerData,
            user_id: selectedUserId,
            created_by: user?.id
          }]);

        if (insertError) throw insertError;
        setSuccess('Consultant ajouté avec succès');
      }

      // Fermer le formulaire et recharger les données
      handleCloseDialog();
      loadData();
    } catch (err: any) {
      setError(`Erreur lors de l'enregistrement: ${err.message}`);
      console.error('Erreur lors de l\'enregistrement:', err);
    } finally {
      setLoading(false);
    }
  };

  // Gestionnaire de suppression
  const handleDelete = async (id: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce consultant ?')) {
      return;
    }

    setLoading(true);
    try {
      const { error: deleteError } = await supabase
        .from('practitioners')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      
      setSuccess('Consultant supprimé avec succès');
      loadData();
    } catch (err: any) {
      setError(`Erreur lors de la suppression: ${err.message}`);
      console.error('Erreur lors de la suppression:', err);
    } finally {
      setLoading(false);
    }
  };

  // Gestionnaire de fermeture des alertes
  const handleCloseAlert = () => {
    setSuccess(null);
    setError(null);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1">
          Gestion des Intervenants
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddClick}
        >
          Ajouter un Consultant
        </Button>
      </Box>

      {loading && practitioners.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : practitioners.length === 0 ? (
        <Card>
          <CardContent>
            <Typography align="center" color="textSecondary">
              Aucun consultant disponible. Cliquez sur "Ajouter un Consultant" pour commencer.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <TableContainer component={Paper} sx={{ width: '100%', overflowX: 'auto' }}>
          <Table sx={{ minWidth: { xs: 650, sm: 750 } }}>
            <TableHead>
              <TableRow>
                <TableCell>Consultant</TableCell>
                <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Titre</TableCell>
                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Résumé</TableCell>
                <TableCell align="center" sx={{ display: { xs: 'none', md: 'table-cell' } }}>Priorité</TableCell>
                <TableCell align="center">Statut</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {practitioners.map((practitioner) => (
                <TableRow key={practitioner.id} sx={{
                  backgroundColor: practitioner.is_active === false ? 'rgba(0, 0, 0, 0.04)' : 'inherit'
                }}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar
                        sx={{
                          mr: 2,
                          bgcolor: practitioner.is_active === false ? 'grey.500' : 'primary.main'
                        }}
                        alt={practitioner.display_name || practitioner.profile?.first_name}
                      >
                        {(practitioner.display_name || practitioner.profile?.first_name || 'C')[0]}
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle2">
                          {practitioner.display_name || `${practitioner.profile?.first_name || ''} ${practitioner.profile?.last_name || ''}`}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {practitioner.profile?.email}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                    <Typography variant="body2">
                      {practitioner.title || "—"}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                    <Typography variant="body2" sx={{
                      maxWidth: 250,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {practitioner.summary || practitioner.bio || "—"}
                    </Typography>
                  </TableCell>
                  <TableCell align="center" sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                    {practitioner.priority || 0}
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      color={practitioner.is_active === false ? "default" : "success"}
                      size="small"
                      onClick={() => handleToggleActive(practitioner.id, practitioner.is_active !== false)}
                    >
                      {practitioner.is_active === false ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      color="primary"
                      size="small"
                      onClick={() => handleEditClick(practitioner)}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      color="error"
                      size="small"
                      onClick={() => handleDelete(practitioner.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Dialogue d'ajout/modification */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedPractitioner.id ? 'Modifier un consultant' : 'Ajouter un consultant'}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={3}>
            {!selectedPractitioner.id && (
              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel>Utilisateur</InputLabel>
                  <Select
                    value={selectedUserId || ''}
                    onChange={(e) => setSelectedUserId(e.target.value as string)}
                    label="Utilisateur"
                  >
                    {availableUsers.map((user) => (
                      <MenuItem key={user.id} value={user.id}>
                        {user.first_name} {user.last_name} ({user.email})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}

            <Grid item xs={12} md={6}>
              <TextField
                label="Nom d'affichage"
                fullWidth
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Nom qui sera affiché sur le site"
                helperText="Laissez vide pour utiliser le nom du profil"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Titre"
                fullWidth
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Coach, Psychologue, Expert en..."
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Résumé"
                multiline
                rows={2}
                fullWidth
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Courte description qui apparaîtra dans les listes et cartes"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Biographie"
                multiline
                rows={4}
                fullWidth
                value={bioText}
                onChange={(e) => setBioText(e.target.value)}
                placeholder="Présentation détaillée du consultant, son parcours, ses spécialités..."
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Priorité d'affichage"
                type="number"
                fullWidth
                value={priority}
                onChange={(e) => setPriority(parseInt(e.target.value) || 0)}
                InputProps={{
                  inputProps: { min: 0 }
                }}
                helperText="Plus la priorité est élevée, plus le consultant sera affiché en premier."
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    color="primary"
                  />
                }
                label="Consultant actif (visible sur le site)"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Annuler</Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            {selectedPractitioner.id ? 'Mettre à jour' : 'Ajouter'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notifications */}
      <Snackbar 
        open={!!success} 
        autoHideDuration={6000} 
        onClose={handleCloseAlert}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseAlert} severity="success" sx={{ width: '100%' }}>
          {success}
        </Alert>
      </Snackbar>

      <Snackbar 
        open={!!error} 
        autoHideDuration={6000} 
        onClose={handleCloseAlert}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseAlert} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminPractitionersPage;