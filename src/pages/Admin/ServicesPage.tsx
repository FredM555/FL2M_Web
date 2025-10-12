// src/pages/admin/ServicesPage.tsx
import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Chip,
  Snackbar,
  Alert
} from '@mui/material';
import TableView from '../../components/admin/TableView';
import { supabase, Service, getServices } from '../../services/supabase';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

const AdminServicesPage: React.FC = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Partial<Service> | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  // Fonction pour charger les services
  const loadServices = async () => {
    setLoading(true);
    try {
      const { data, error } = await getServices();
      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des services:', error);
    } finally {
      setLoading(false);
    }
  };

  // Charger les services au premier rendu
  useEffect(() => {
    loadServices();
  }, []);

  // Définir un type explicite qui correspond à ce que TableView attend
  type ColumnFormat = 
    | { format?: undefined; align?: undefined; }
    | { format: (value: string) => React.ReactElement; align?: 'left' | 'center' | 'right'; }
    | { format: (value: number) => string; align?: 'left' | 'center' | 'right'; };

  // Combiner avec les autres propriétés de colonne
  type Column = {
    id: string;
    label: string;
    minWidth: number;
    sortable: boolean;
    filterable: boolean;
  } & ColumnFormat;

  // Colonnes du tableau
  const columns: Column[] = [
    { 
      id: 'code', 
      label: 'Code',
      minWidth: 80,
      sortable: true,
      filterable: true
    },
    { 
      id: 'name', 
      label: 'Nom du service', 
      minWidth: 170,
      sortable: true,
      filterable: true
    },
    { 
      id: 'category', 
      label: 'Catégorie', 
      minWidth: 100,
      format: (value: string) => {
        const categoryColors: Record<string, "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning"> = {
          'particuliers': 'primary',
          'professionnels': 'info',
          'sportifs': 'success'
        };
        
        return (
          <Chip 
            label={value} 
            size="small" 
            color={categoryColors[value] || 'default'} 
          />
        );
      },
      sortable: true,
      filterable: true
    },
    {
      id: 'price',
      label: 'Prix (€)',
      minWidth: 100,
      align: 'right' as "right", // Forcer le type littéral
      format: (value: number) => value ? `${value.toFixed(2)} €` : '—',
      sortable: true,
      filterable: true
    },
    { 
      id: 'duration', 
      label: 'Durée (min)', 
      minWidth: 100,
      align: 'right' as "right", // Forcer le type littéral,
      format: (value: number) => value ? `${value} min` : '—',
      sortable: true,
      filterable: true
    },
    { 
      id: 'created_at', 
      label: 'Créé le', 
      minWidth: 170,
      format: (value: string) => {
        // Retourner un élément React au lieu d'une simple chaîne
        return <span>{value ? format(parseISO(value), 'PPP', { locale: fr }) : '—'}</span>;
      },
      sortable: true,
      filterable: true
    },
  ];

  // Formater les lignes pour l'affichage
  const formatRow = (row: any) => ({
    ...row,
    // Ajouter d'autres transformations si nécessaire
  });

  // Gestionnaire d'ouverture du formulaire d'ajout
  const handleAddClick = () => {
    setSelectedService({
      code: '',
      name: '',
      category: undefined, 
      subcategory: '',
      price: 0,
      duration: 0,
      description: '',
      is_on_demand: false
    });
    setFormErrors({});
    setDialogOpen(true);
  };

  // Gestionnaire d'ouverture du formulaire d'édition
  const handleEditClick = (service: Service) => {
    setSelectedService(service);
    setFormErrors({});
    setDialogOpen(true);
  };

  // Gestionnaire de fermeture du formulaire
  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  // Gestionnaire de changement de champ dans le formulaire
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    setSelectedService(prev => {
      if (!prev) return null;
      
      // Convertir les valeurs numériques
      if (name === 'price' || name === 'duration') {
        const numValue = parseFloat(value);
        return { ...prev, [name]: isNaN(numValue) ? 0 : numValue };
      }
      
      return { ...prev, [name]: value };
    });
    
    // Effacer l'erreur pour ce champ si elle existe
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Gestionnaire de changement de select dans le formulaire
  const handleSelectChange = (e: any) => {
    const { name, value } = e.target;
    
    setSelectedService(prev => {
      if (!prev) return null;
      return { ...prev, [name]: value };
    });
    
    // Effacer l'erreur pour ce champ si elle existe
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Validation du formulaire
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!selectedService) return false;
    
    if (!selectedService.code) {
      errors.code = 'Le code est requis';
    } else if (selectedService.code.length > 10) {
      errors.code = 'Le code ne doit pas dépasser 10 caractères';
    }
    
    if (!selectedService.name) {
      errors.name = 'Le nom est requis';
    }
    
    if (!selectedService.category) {
      errors.category = 'La catégorie est requise';
    }
    
    if (!selectedService.subcategory) {
      errors.subcategory = 'La sous-catégorie est requise';
    }

    if (selectedService.price !== undefined && selectedService.price < 0) {
      errors.price = 'Le prix ne peut pas être négatif';
    }

    if (selectedService.duration !== undefined && selectedService.duration < 0) {
      errors.duration = 'La durée ne peut pas être négative';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Enregistrement du service
  const handleSaveService = async () => {
    if (!validateForm() || !selectedService) return;
    
    try {
      setLoading(true);
      if (selectedService.id) {
        // Mise à jour
        await supabase
          .from('services')
          .update({
            code: selectedService.code,
            name: selectedService.name,
            category: selectedService.category,
            subcategory: selectedService.subcategory,
            price: selectedService.price,
            duration: selectedService.duration,
            description: selectedService.description,
            is_on_demand: selectedService.is_on_demand
          })
          .eq('id', selectedService.id);
          
        setSuccessMessage('Service mis à jour avec succès');
      } else {
        // Création
        await supabase
          .from('services')
          .insert([{
            code: selectedService.code,
            name: selectedService.name,
            category: selectedService.category,
            subcategory: selectedService.subcategory,
            price: selectedService.price,
            duration: selectedService.duration,
            description: selectedService.description,
            is_on_demand: selectedService.is_on_demand
          }]);
          
        setSuccessMessage('Service créé avec succès');
      }
      
      // Fermer le dialogue
      setDialogOpen(false);
      
      // Rafraîchir les données sans recharger la page
      await loadServices();
      
      // Afficher le message de succès
      setShowSuccess(true);
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement du service:', error);
    } finally {
      setLoading(false);
    }
  };

  // Gérer la fermeture du message de succès
  const handleCloseSuccess = (_event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setShowSuccess(false);
  };

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Gestion des services
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Consultez, ajoutez, modifiez ou supprimez les services proposés par FLM.
        </Typography>
      </Box>

      <TableView
        title="Services"
        tableName="services"
        columns={columns}
        defaultSortColumn="created_at"
        defaultSortDirection="desc"
        onAddClick={handleAddClick}
        onEditClick={handleEditClick}
        formatRow={formatRow}
        defaultRowsPerPage={25}
        rowsPerPageOptions={[25, 50, 100]}
        loading={loading}
        data={services}
        onRefresh={loadServices}
      />

      {/* Dialogue d'ajout/modification */}
      <Dialog 
        open={dialogOpen} 
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedService?.id ? 'Modifier un service' : 'Ajouter un service'}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Code"
                name="code"
                value={selectedService?.code || ''}
                onChange={handleInputChange}
                fullWidth
                required
                error={!!formErrors.code}
                helperText={formErrors.code}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Nom du service"
                name="name"
                value={selectedService?.name || ''}
                onChange={handleInputChange}
                fullWidth
                required
                error={!!formErrors.name}
                helperText={formErrors.name}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required error={!!formErrors.category}>
                <InputLabel>Catégorie</InputLabel>
                <Select
                  name="category"
                  value={selectedService?.category || ''}
                  onChange={handleSelectChange}
                  label="Catégorie"
                >
                  <MenuItem value="particuliers">Particuliers</MenuItem>
                  <MenuItem value="professionnels">Professionnels</MenuItem>
                  <MenuItem value="sportifs">Sportifs</MenuItem>
                </Select>
                {formErrors.category && (
                  <FormHelperText>{formErrors.category}</FormHelperText>
                )}
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Sous-catégorie"
                name="subcategory"
                value={selectedService?.subcategory || ''}
                onChange={handleInputChange}
                fullWidth
                required
                error={!!formErrors.subcategory}
                helperText={formErrors.subcategory}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Prix (€)"
                name="price"
                type="number"
                value={selectedService?.price || 0}
                onChange={handleInputChange}
                fullWidth
                required
                error={!!formErrors.price}
                helperText={formErrors.price}
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Durée (minutes)"
                name="duration"
                type="number"
                value={selectedService?.duration || 0}
                onChange={handleInputChange}
                fullWidth
                required
                error={!!formErrors.duration}
                helperText={formErrors.duration}
                inputProps={{ min: 0, step: 5 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Description"
                name="description"
                value={selectedService?.description || ''}
                onChange={handleInputChange}
                fullWidth
                multiline
                rows={4}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Disponibilité</InputLabel>
                <Select
                  name="is_on_demand"
                  value={selectedService?.is_on_demand ? 'true' : 'false'}
                  onChange={handleSelectChange}
                  label="Disponibilité"
                >
                  <MenuItem value="false">Disponible</MenuItem>
                  <MenuItem value="true">Sur demande uniquement</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Annuler</Button>
          <Button 
            variant="contained" 
            onClick={handleSaveService}
            disabled={loading}
          >
            {loading ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Message de succès */}
      <Snackbar 
        open={showSuccess} 
        autoHideDuration={6000} 
        onClose={handleCloseSuccess}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSuccess} severity="success" sx={{ width: '100%' }}>
          {successMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminServicesPage;