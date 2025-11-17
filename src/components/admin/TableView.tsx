// src/components/admin/TableView.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  Toolbar,
  Typography,
  IconButton,
  TextField,
  InputAdornment,
  CircularProgress
} from '@mui/material';
import { visuallyHidden } from '@mui/utils';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import { supabase } from '../../services/supabase';

interface Column {
  id: string;
  label: string;
  minWidth: number;
  align?: 'right' | 'left' | 'center';
  format?: (value: any) => string | React.ReactElement;
  sortable: boolean;
  filterable: boolean;
}

interface TableViewProps {
  title: string;
  tableName: string;
  columns: Column[];
  defaultSortColumn?: string;
  defaultSortDirection?: 'asc' | 'desc';
  onAddClick?: () => void;
  onEditClick?: (item: any) => void;
  formatRow?: (row: any) => any;
  defaultRowsPerPage?: number;
  rowsPerPageOptions?: number[];
  loading?: boolean;
  data?: any[];
  onRefresh?: () => void;
}

const TableView: React.FC<TableViewProps> = ({
  title,
  tableName,
  columns,
  defaultSortColumn = 'id',
  defaultSortDirection = 'asc',
  onAddClick,
  onEditClick,
  formatRow = (row) => row,
  defaultRowsPerPage = 10,
  rowsPerPageOptions = [10, 25, 50],
  loading = false,
  data = null,
  onRefresh
}) => {
  const [rows, setRows] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage);
  const [orderBy, setOrderBy] = useState<string>(defaultSortColumn);
  const [order, setOrder] = useState<'asc' | 'desc'>(defaultSortDirection);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(loading);

  // Charger les données si elles ne sont pas fournies en prop
  useEffect(() => {
    if (data !== null) {
      setRows(data.map(formatRow));
      return;
    }
    
    fetchData();
  }, [data, tableName, formatRow]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .order(orderBy, { ascending: order === 'asc' });

      if (error) throw error;

      setRows(data.map(formatRow));
    } catch (err: any) {
      console.error(`Erreur lors du chargement des données de ${tableName}:`, err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    } else {
      fetchData();
    }
  };

  const handleRequestSort = (property: string) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  const handleDeleteItem = async (id: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet élément ?')) return;

    try {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Rafraîchir les données
      handleRefresh();
    } catch (err: any) {
      console.error(`Erreur lors de la suppression de l'élément de ${tableName}:`, err);
      alert(`Erreur lors de la suppression: ${err.message}`);
    }
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setPage(0); // Revenir à la première page quand on cherche
  };

  // Filtrer les lignes selon le terme de recherche
  const filteredRows = searchTerm
    ? rows.filter(row => 
        Object.keys(row).some(key => 
          row[key] && 
          row[key].toString().toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    : rows;

  // Trier les lignes
  const sortedRows = [...filteredRows].sort((a, b) => {
    const aValue = a[orderBy];
    const bValue = b[orderBy];
    
    if (!aValue && !bValue) return 0;
    if (!aValue) return order === 'asc' ? -1 : 1;
    if (!bValue) return order === 'asc' ? 1 : -1;
    
    // Comparer en fonction du type
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return order === 'asc' 
        ? aValue.localeCompare(bValue) 
        : bValue.localeCompare(aValue);
    }
    
    return order === 'asc' 
      ? (aValue < bValue ? -1 : 1) 
      : (bValue < aValue ? -1 : 1);
  });

  // Paginer les lignes triées
  const paginatedRows = sortedRows.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      <Toolbar sx={{ pl: { sm: 2 }, pr: { xs: 1, sm: 1 } }}>
        <Typography
          sx={{ flex: '1 1 100%' }}
          variant="h6"
          id="tableTitle"
          component="div"
        >
          {title}
        </Typography>

        <TextField
          placeholder="Rechercher..."
          size="small"
          value={searchTerm}
          onChange={handleSearchChange}
          sx={{ mr: 2, width: 250 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />

        <IconButton onClick={handleRefresh} disabled={isLoading}>
          <RefreshIcon />
        </IconButton>

        {onAddClick && (
          <Button
            startIcon={<AddIcon />}
            variant="contained"
            onClick={onAddClick}
            sx={{ ml: 2 }}
          >
            Ajouter
          </Button>
        )}
      </Toolbar>

      <TableContainer sx={{ maxHeight: 600, width: '100%', overflowX: 'auto' }}>
        <Table stickyHeader aria-label={`tableau-${tableName}`} sx={{ minWidth: { xs: 650, sm: 750 } }}>
          <TableHead>
            <TableRow>
              {columns.map((column, index) => {
                // Déterminer si la colonne doit être cachée sur mobile/tablet
                let responsiveSx = {};
                // Cacher les colonnes du milieu sur mobile (xs), sauf la première, dernière et actions
                if (index > 0 && index < columns.length - 1) {
                  if (index === 1) {
                    // Deuxième colonne: visible à partir de sm
                    responsiveSx = { display: { xs: 'none', sm: 'table-cell' } };
                  } else {
                    // Autres colonnes: visible à partir de md
                    responsiveSx = { display: { xs: 'none', md: 'table-cell' } };
                  }
                }

                return (
                  <TableCell
                    key={column.id}
                    align={column.align}
                    style={{ minWidth: column.minWidth }}
                    sx={responsiveSx}
                  >
                    {column.sortable ? (
                      <TableSortLabel
                        active={orderBy === column.id}
                        direction={orderBy === column.id ? order : 'asc'}
                        onClick={() => handleRequestSort(column.id)}
                      >
                        {column.label}
                        {orderBy === column.id ? (
                          <Box component="span" sx={visuallyHidden}>
                            {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                          </Box>
                        ) : null}
                      </TableSortLabel>
                    ) : (
                      column.label
                    )}
                  </TableCell>
                );
              })}
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length + 1} align="center">
                  <CircularProgress size={40} />
                </TableCell>
              </TableRow>
            ) : paginatedRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + 1} align="center">
                  Aucune donnée disponible
                </TableCell>
              </TableRow>
            ) : (
              paginatedRows.map((row) => (
                <TableRow hover role="checkbox" tabIndex={-1} key={row.id}>
                  {columns.map((column, index) => {
                    const value = row[column.id];
                    // Appliquer le même responsive que pour les headers
                    let responsiveSx = {};
                    if (index > 0 && index < columns.length - 1) {
                      if (index === 1) {
                        responsiveSx = { display: { xs: 'none', sm: 'table-cell' } };
                      } else {
                        responsiveSx = { display: { xs: 'none', md: 'table-cell' } };
                      }
                    }

                    return (
                      <TableCell key={column.id} align={column.align} sx={responsiveSx}>
                        {column.format && value !== null && value !== undefined
                          ? column.format(value)
                          : value}
                      </TableCell>
                    );
                  })}
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                      {onEditClick && (
                        <IconButton 
                          size="small" 
                          onClick={() => onEditClick(row)}
                          color="primary"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      )}
                      <IconButton 
                        size="small" 
                        onClick={() => handleDeleteItem(row.id)}
                        color="error"
                        sx={{ ml: 1 }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        rowsPerPageOptions={rowsPerPageOptions}
        component="div"
        count={sortedRows.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        labelRowsPerPage="Lignes par page:"
        labelDisplayedRows={({ from, to, count }) => `${from}-${to} sur ${count}`}
      />
    </Paper>
  );
};

export default TableView;