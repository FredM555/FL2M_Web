// src/pages/admin/DailyDrawsPage.tsx
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
  Alert,
  Paper,
  InputAdornment,
  IconButton
} from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearIcon from '@mui/icons-material/Clear';
import SearchIcon from '@mui/icons-material/Search';
import TableView from '../../components/admin/TableView';
import { supabase, DailyDraw, getDailyDraws } from '../../services/supabase';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { logger } from '../../utils/logger';

const AdminDailyDrawsPage: React.FC = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDraw, setSelectedDraw] = useState<Partial<DailyDraw> | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [draws, setDraws] = useState<DailyDraw[]>([]);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  // États pour les filtres
  const [filterType, setFilterType] = useState<string>('all');
  const [filterNombre, setFilterNombre] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [filterMessage, setFilterMessage] = useState<string>('');

  // Fonction pour charger les tirages
  const loadDraws = async () => {
    setLoading(true);
    try {
      const { data, error } = await getDailyDraws();
      if (error) throw error;
      setDraws(data || []);
    } catch (error) {
      logger.error('Erreur lors du chargement des tirages:', error);
    } finally {
      setLoading(false);
    }
  };

  // Charger les tirages au premier rendu
  useEffect(() => {
    loadDraws();
  }, []);

  // Définir un type explicite qui correspond à ce que TableView attend
  type ColumnFormat =
    | { format?: undefined; align?: undefined; }
    | { format: (value: string) => React.ReactElement; align?: 'left' | 'center' | 'right'; }
    | { format: (value: number) => string | React.ReactElement; align?: 'left' | 'center' | 'right'; };

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
      id: 'type',
      label: 'Type',
      minWidth: 120,
      format: (value: string) => {
        const typeColors: Record<string, "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning"> = {
          'quotidien': 'primary',
          'climat': 'info',
          'annuel': 'success',
          'mensuel': 'warning'
        };

        return (
          <Chip
            label={value}
            size="small"
            color={typeColors[value] || 'default'}
          />
        );
      },
      sortable: true,
      filterable: true
    },
    {
      id: 'nombre',
      label: 'Nombre',
      minWidth: 80,
      align: 'center' as "center",
      format: (value: number) => <strong>{value}</strong>,
      sortable: true,
      filterable: true
    },
    {
      id: 'titre',
      label: 'Titre',
      minWidth: 200,
      sortable: true,
      filterable: true
    },
    {
      id: 'message',
      label: 'Message',
      minWidth: 300,
      format: (value: string) => {
        const truncated = value.length > 100 ? value.substring(0, 100) + '...' : value;
        return <span>{truncated}</span>;
      },
      sortable: true,
      filterable: true
    },
    {
      id: 'source',
      label: 'Source',
      minWidth: 130,
      format: (value: string) => {
        const isAI = value === 'ai_generated';
        return (
          <Chip
            label={isAI ? 'IA' : 'Manuel'}
            size="small"
            color={isAI ? 'secondary' : 'default'}
            variant={isAI ? 'filled' : 'outlined'}
          />
        );
      },
      sortable: true,
      filterable: true
    },
    {
      id: 'created_at',
      label: 'Créé le',
      minWidth: 150,
      format: (value: string) => {
        return <span>{value ? format(parseISO(value), 'PPP', { locale: fr }) : '—'}</span>;
      },
      sortable: true,
      filterable: true
    },
  ];

  // Formater les lignes pour l'affichage
  const formatRow = (row: any) => ({
    ...row,
  });

  // Filtrer les données selon les critères
  const filteredDraws = draws.filter((draw) => {
    // Filtre par type
    if (filterType !== 'all' && draw.type !== filterType) {
      return false;
    }

    // Filtre par nombre
    if (filterNombre !== 'all' && draw.nombre.toString() !== filterNombre) {
      return false;
    }

    // Filtre par source
    if (filterSource !== 'all' && draw.source !== filterSource) {
      return false;
    }

    // Filtre par message (recherche dans titre et message)
    if (filterMessage.trim() !== '') {
      const searchTerm = filterMessage.toLowerCase();
      const inTitle = draw.titre.toLowerCase().includes(searchTerm);
      const inMessage = draw.message.toLowerCase().includes(searchTerm);
      if (!inTitle && !inMessage) {
        return false;
      }
    }

    return true;
  });

  // Réinitialiser les filtres
  const handleResetFilters = () => {
    setFilterType('all');
    setFilterNombre('all');
    setFilterSource('all');
    setFilterMessage('');
  };

  // Gestionnaire d'ouverture du formulaire d'ajout
  const handleAddClick = () => {
    setSelectedDraw({
      type: 'quotidien',
      nombre: 1,
      titre: '',
      message: '',
      source: 'manual'
    });
    setFormErrors({});
    setDialogOpen(true);
  };

  // Gestionnaire d'ouverture du formulaire d'édition
  const handleEditClick = (draw: DailyDraw) => {
    setSelectedDraw(draw);
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

    setSelectedDraw(prev => {
      if (!prev) return null;

      // Convertir les valeurs numériques
      if (name === 'nombre') {
        const numValue = parseInt(value);
        return { ...prev, [name]: isNaN(numValue) ? 1 : numValue };
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

    setSelectedDraw(prev => {
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

    if (!selectedDraw) return false;

    if (!selectedDraw.type) {
      errors.type = 'Le type est requis';
    }

    const validNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22];
    if (!selectedDraw.nombre || !validNumbers.includes(selectedDraw.nombre)) {
      errors.nombre = 'Le nombre doit être 1-9, 11 ou 22';
    }

    if (!selectedDraw.titre || selectedDraw.titre.trim() === '') {
      errors.titre = 'Le titre est requis';
    }

    if (!selectedDraw.message || selectedDraw.message.trim() === '') {
      errors.message = 'Le message est requis';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Enregistrement du tirage
  const handleSaveDraw = async () => {
    if (!validateForm() || !selectedDraw) return;

    try {
      setLoading(true);
      if (selectedDraw.id) {
        // Mise à jour
        await supabase
          .from('daily_draws')
          .update({
            type: selectedDraw.type,
            nombre: selectedDraw.nombre,
            titre: selectedDraw.titre,
            message: selectedDraw.message,
            source: selectedDraw.source
          })
          .eq('id', selectedDraw.id);

        setSuccessMessage('Tirage mis à jour avec succès');
      } else {
        // Création
        await supabase
          .from('daily_draws')
          .insert([{
            type: selectedDraw.type,
            nombre: selectedDraw.nombre,
            titre: selectedDraw.titre,
            message: selectedDraw.message,
            source: selectedDraw.source
          }]);

        setSuccessMessage('Tirage créé avec succès');
      }

      // Fermer le dialogue
      setDialogOpen(false);

      // Rafraîchir les données sans recharger la page
      await loadDraws();

      // Afficher le message de succès
      setShowSuccess(true);
    } catch (error) {
      logger.error('Erreur lors de l\'enregistrement du tirage:', error);
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
          Gestion des tirages quotidiens
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Gérez les messages de tirage quotidien basés sur la numérologie (nombres 1-9, 11 et 22).
          Les nombres 11 et 22 sont des nombres maîtres.
          Un même nombre peut avoir plusieurs messages différents pour le type quotidien.
        </Typography>
      </Box>

      {/* Section des filtres */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <FilterListIcon sx={{ mr: 1 }} />
          <Typography variant="h6">Filtres</Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Button
            startIcon={<ClearIcon />}
            onClick={handleResetFilters}
            size="small"
          >
            Réinitialiser
          </Button>
        </Box>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Type</InputLabel>
              <Select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                label="Type"
              >
                <MenuItem value="all">Tous les types</MenuItem>
                <MenuItem value="quotidien">Quotidien</MenuItem>
                <MenuItem value="climat">Climat</MenuItem>
                <MenuItem value="mensuel">Mensuel</MenuItem>
                <MenuItem value="annuel">Annuel</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Nombre</InputLabel>
              <Select
                value={filterNombre}
                onChange={(e) => setFilterNombre(e.target.value)}
                label="Nombre"
              >
                <MenuItem value="all">Tous les nombres</MenuItem>
                <MenuItem value="1">1</MenuItem>
                <MenuItem value="2">2</MenuItem>
                <MenuItem value="3">3</MenuItem>
                <MenuItem value="4">4</MenuItem>
                <MenuItem value="5">5</MenuItem>
                <MenuItem value="6">6</MenuItem>
                <MenuItem value="7">7</MenuItem>
                <MenuItem value="8">8</MenuItem>
                <MenuItem value="9">9</MenuItem>
                <MenuItem value="11">11 (Maître)</MenuItem>
                <MenuItem value="22">22 (Maître)</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Source</InputLabel>
              <Select
                value={filterSource}
                onChange={(e) => setFilterSource(e.target.value)}
                label="Source"
              >
                <MenuItem value="all">Toutes les sources</MenuItem>
                <MenuItem value="manual">Saisie manuelle</MenuItem>
                <MenuItem value="ai_generated">Généré par IA</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              size="small"
              label="Rechercher dans le contenu"
              value={filterMessage}
              onChange={(e) => setFilterMessage(e.target.value)}
              placeholder="Rechercher dans le titre ou le message..."
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: filterMessage && (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => setFilterMessage('')}
                      edge="end"
                    >
                      <ClearIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
        </Grid>
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {filteredDraws.length} tirage(s) affiché(s) sur {draws.length} au total
          </Typography>
        </Box>
      </Paper>

      <TableView
        title="Tirages quotidiens"
        tableName="daily_draws"
        columns={columns}
        defaultSortColumn="type"
        defaultSortDirection="asc"
        onAddClick={handleAddClick}
        onEditClick={handleEditClick}
        formatRow={formatRow}
        defaultRowsPerPage={25}
        rowsPerPageOptions={[25, 50, 100]}
        loading={loading}
        data={filteredDraws}
        onRefresh={loadDraws}
      />

      {/* Dialogue d'ajout/modification */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedDraw?.id ? 'Modifier un tirage' : 'Ajouter un tirage'}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required error={!!formErrors.type}>
                <InputLabel>Type de tirage</InputLabel>
                <Select
                  name="type"
                  value={selectedDraw?.type || 'quotidien'}
                  onChange={handleSelectChange}
                  label="Type de tirage"
                >
                  <MenuItem value="quotidien">Quotidien</MenuItem>
                  <MenuItem value="climat">Climat</MenuItem>
                  <MenuItem value="mensuel">Mensuel</MenuItem>
                  <MenuItem value="annuel">Annuel</MenuItem>
                </Select>
                {formErrors.type && (
                  <FormHelperText>{formErrors.type}</FormHelperText>
                )}
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Nombre (1-9, 11, 22)"
                name="nombre"
                type="number"
                value={selectedDraw?.nombre || 1}
                onChange={handleInputChange}
                fullWidth
                required
                error={!!formErrors.nombre}
                helperText={formErrors.nombre || "Nombres valides : 1-9, 11, 22 (nombres maîtres)"}
                inputProps={{ step: 1 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Titre"
                name="titre"
                value={selectedDraw?.titre || ''}
                onChange={handleInputChange}
                fullWidth
                required
                error={!!formErrors.titre}
                helperText={formErrors.titre}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Source</InputLabel>
                <Select
                  name="source"
                  value={selectedDraw?.source || 'manual'}
                  onChange={handleSelectChange}
                  label="Source"
                >
                  <MenuItem value="manual">Saisie manuelle</MenuItem>
                  <MenuItem value="ai_generated">Généré par IA</MenuItem>
                </Select>
                <FormHelperText>Indiquez si ce tirage a été saisi manuellement ou généré par IA</FormHelperText>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Message"
                name="message"
                value={selectedDraw?.message || ''}
                onChange={handleInputChange}
                fullWidth
                required
                multiline
                rows={6}
                error={!!formErrors.message}
                helperText={formErrors.message}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Annuler</Button>
          <Button
            variant="contained"
            onClick={handleSaveDraw}
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

export default AdminDailyDrawsPage;
