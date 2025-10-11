import React, { useState, useEffect } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead,
  TableRow,
  Paper,
  Card, 
  CardContent, 
  CardHeader,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
  Box,
  IconButton,
  Grid
} from "@mui/material";
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import { supabase } from '../../services/supabase';

interface Service {
  id: number;
  titre: string;
  description: string;
  prix?: number;
  duree?: number;
}

const AdminServicesPage: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentService, setCurrentService] = useState<Partial<Service>>({});

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setServices(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteService = async (serviceId: number) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce service ?')) return;

    try {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', serviceId);

      if (error) throw error;

      // Mise à jour de la liste des services
      setServices(services.filter(s => s.id !== serviceId));
    } catch (err: any) {
      alert(`Erreur lors de la suppression : ${err.message}`);
    }
  };

  const handleSaveService = async () => {
    try {
      if (currentService.id) {
        // Mise à jour
        const { error } = await supabase
          .from('services')
          .update(currentService)
          .eq('id', currentService.id);

        if (error) throw error;
      } else {
        // Création
        const { error } = await supabase
          .from('services')
          .insert([currentService]);

        if (error) throw error;
      }

      // Actualiser la liste
      fetchServices();
      setIsDialogOpen(false);
      setCurrentService({});
    } catch (err: any) {
      alert(`Erreur : ${err.message}`);
    }
  };

  const handleEditService = (service: Service) => {
    setCurrentService(service);
    setIsDialogOpen(true);
  };

  if (loading) return <div>Chargement...</div>;
  if (error) return <div>Erreur : {error}</div>;

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 4 }}>
      <Card>
        <CardHeader 
          title="Gestion des Services"
          action={
            <Button 
              variant="contained" 
              startIcon={<AddCircleIcon />}
              onClick={() => {
                setCurrentService({});
                setIsDialogOpen(true);
              }}
            >
              Ajouter un Service
            </Button>
          }
        />
        <CardContent>
          <Paper sx={{ width: '100%', overflow: 'hidden' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Titre</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Prix</TableCell>
                  <TableCell>Durée</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {services.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell>{service.titre}</TableCell>
                    <TableCell>
                      {service.description.length > 50 
                        ? `${service.description.slice(0, 50)}...` 
                        : service.description}
                    </TableCell>
                    <TableCell>
                      {service.prix ? `${service.prix} €` : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {service.duree ? `${service.duree} min` : 'N/A'}
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                        <IconButton 
                          color="primary" 
                          size="small"
                          onClick={() => handleEditService(service)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton 
                          color="error" 
                          size="small"
                          onClick={() => handleDeleteService(service.id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </CardContent>
      </Card>

      {/* Dialogue de création/édition de service */}
      <Dialog open={isDialogOpen} onClose={() => setIsDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {currentService.id ? 'Modifier un Service' : 'Ajouter un Service'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            label="Titre"
            fullWidth
            margin="normal"
            value={currentService.titre || ''}
            onChange={(e) => setCurrentService({
              ...currentService,
              titre: e.target.value
            })}
          />
          
          <TextField
            label="Description"
            fullWidth
            margin="normal"
            multiline
            rows={4}
            value={currentService.description || ''}
            onChange={(e) => setCurrentService({
              ...currentService,
              description: e.target.value
            })}
          />
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Prix (€)"
                type="number"
                fullWidth
                margin="normal"
                value={currentService.prix || ''}
                onChange={(e) => setCurrentService({
                  ...currentService,
                  prix: parseFloat(e.target.value)
                })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Durée (minutes)"
                type="number"
                fullWidth
                margin="normal"
                value={currentService.duree || ''}
                onChange={(e) => setCurrentService({
                  ...currentService,
                  duree: parseInt(e.target.value)
                })}
              />
            </Grid>
          </Grid>
          
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
            <Button 
              variant="outlined" 
              onClick={() => setIsDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button 
              variant="contained"
              onClick={handleSaveService}
            >
              Enregistrer
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default AdminServicesPage;