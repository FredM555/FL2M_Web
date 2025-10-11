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
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from "@mui/material";
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { supabase } from '../../services/supabase';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  user_type: 'admin' | 'intervenant' | 'client';
  birth_date: string;
}

const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<Partial<User>>({});

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setUsers(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      // Mise à jour de la liste des utilisateurs
      setUsers(users.filter(u => u.id !== userId));
    } catch (err: any) {
      alert(`Erreur lors de la suppression : ${err.message}`);
    }
  };

  const handleSaveUser = async () => {
    try {
      if (currentUser.id) {
        // Mise à jour
        const { error } = await supabase
          .from('profiles')
          .update(currentUser)
          .eq('id', currentUser.id);

        if (error) throw error;
      }

      // Actualiser la liste
      fetchUsers();
      setIsDialogOpen(false);
      setCurrentUser({});
    } catch (err: any) {
      alert(`Erreur : ${err.message}`);
    }
  };

  const handleEditUser = (user: User) => {
    setCurrentUser(user);
    setIsDialogOpen(true);
  };

  if (loading) return <div>Chargement...</div>;
  if (error) return <div>Erreur : {error}</div>;

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 4 }}>
      <Card>
        <CardHeader 
          title="Gestion des Utilisateurs"
        />
        <CardContent>
          <Paper sx={{ width: '100%', overflow: 'hidden' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Email</TableCell>
                  <TableCell>Prénom</TableCell>
                  <TableCell>Nom</TableCell>
                  <TableCell>Téléphone</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Date Naissance</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.first_name}</TableCell>
                    <TableCell>{user.last_name}</TableCell>
                    <TableCell>{user.phone || 'N/A'}</TableCell>
                    <TableCell>
                      {user.user_type === 'admin' ? 'Administrateur' : 
                      user.user_type === 'intervenant' ? 'Intervenant' : 'Client'}
                    </TableCell>
                    <TableCell>{user.birth_date}</TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                        <IconButton 
                          color="primary" 
                          size="small"
                          onClick={() => handleEditUser(user)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton 
                          color="error" 
                          size="small"
                          onClick={() => handleDeleteUser(user.id)}
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

      {/* Dialogue d'édition d'utilisateur */}
      <Dialog open={isDialogOpen} onClose={() => setIsDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Modifier un Utilisateur
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            label="Email"
            type="email"
            fullWidth
            margin="normal"
            value={currentUser.email || ''}
            disabled
          />
          
          <TextField
            label="Prénom"
            fullWidth
            margin="normal"
            value={currentUser.first_name || ''}
            onChange={(e) => setCurrentUser({
              ...currentUser,
              first_name: e.target.value
            })}
          />
          
          <TextField
            label="Nom"
            fullWidth
            margin="normal"
            value={currentUser.last_name || ''}
            onChange={(e) => setCurrentUser({
              ...currentUser,
              last_name: e.target.value
            })}
          />
                    <TextField
            label="Date de Naissance"
            fullWidth
            margin="normal"
            value={currentUser.birth_date || ''}
            onChange={(e) => setCurrentUser({
              ...currentUser,
              birth_date: e.target.value
            })}
          />
          
          <TextField
            label="Téléphone"
            fullWidth
            margin="normal"
            value={currentUser.phone || ''}
            onChange={(e) => setCurrentUser({
              ...currentUser,
              phone: e.target.value
            })}
          />
          
          <FormControl fullWidth margin="normal">
            <InputLabel>Type d'utilisateur</InputLabel>
            <Select
              value={currentUser.user_type || ''}
              label="Type d'utilisateur"
              onChange={(e) => setCurrentUser({
                ...currentUser,
                user_type: e.target.value as 'admin' | 'intervenant' | 'client'
              })}
            >
              <MenuItem value="admin">Administrateur</MenuItem>
              <MenuItem value="intervenant">Intervenant</MenuItem>
              <MenuItem value="client">Client</MenuItem>
            </Select>
          </FormControl>
          
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
            <Button 
              variant="outlined" 
              onClick={() => setIsDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button 
              variant="contained"
              onClick={handleSaveUser}
            >
              Enregistrer
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default AdminUsersPage;