// src/components/admin/ContractHistory.tsx
import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  Chip,
  IconButton,
  CircularProgress,
  Alert,
  Divider,
  Grid,
  Button
} from '@mui/material';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent
} from '@mui/lab';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import DescriptionIcon from '@mui/icons-material/Description';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ContractsService } from '../../services/contracts';
import {
  PractitionerContract,
  ContractStatus,
  getContractTypeLabel,
  getContractStatusLabel,
  formatAmount
} from '../../types/payments';

interface ContractHistoryProps {
  practitionerId: string;
}

const ContractHistory: React.FC<ContractHistoryProps> = ({ practitionerId }) => {
  const [contracts, setContracts] = useState<PractitionerContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadContracts();
  }, [practitionerId]);

  const loadContracts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ContractsService.getPractitionerContracts(practitionerId);
      setContracts(data);
    } catch (err: any) {
      console.error('Erreur lors du chargement de l\'historique:', err);
      setError('Impossible de charger l\'historique des contrats');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: ContractStatus) => {
    switch (status) {
      case 'active':
        return <CheckCircleIcon />;
      case 'suspended':
        return <PauseCircleIcon />;
      case 'terminated':
        return <CancelIcon />;
      default:
        return <CheckCircleIcon />;
    }
  };

  const getStatusColor = (status: ContractStatus) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'suspended':
        return 'warning';
      case 'terminated':
        return 'error';
      default:
        return 'default';
    }
  };

  const renderContractCard = (contract: PractitionerContract, index: number) => {
    const isActive = contract.status === 'active';
    const startDate = new Date(contract.start_date);
    const endDate = contract.end_date ? new Date(contract.end_date) : null;

    return (
      <TimelineItem key={contract.id}>
        <TimelineOppositeContent
          sx={{ m: 'auto 0', display: { xs: 'none', md: 'block' }, textAlign: 'right' }}
        >
          <Typography variant="body2" color="text.secondary">
            {format(startDate, 'dd MMMM yyyy', { locale: fr })}
            {endDate && (
              <>
                <br />
                au {format(endDate, 'dd MMMM yyyy', { locale: fr })}
              </>
            )}
          </Typography>
        </TimelineOppositeContent>

        <TimelineSeparator>
          <TimelineConnector sx={{ display: index === 0 ? 'none' : 'block' }} />
          <TimelineDot
            color={getStatusColor(contract.status) as any}
            variant={isActive ? 'filled' : 'outlined'}
            sx={{
              p: 1.5,
              ...(isActive && {
                boxShadow: 3,
                animation: 'pulse 2s infinite'
              })
            }}
          >
            {getStatusIcon(contract.status)}
          </TimelineDot>
          <TimelineConnector sx={{ display: index === contracts.length - 1 ? 'none' : 'block' }} />
        </TimelineSeparator>

        <TimelineContent sx={{ py: '12px', px: 2 }}>
          <Card
            elevation={isActive ? 4 : 1}
            sx={{
              border: isActive ? '2px solid' : '1px solid',
              borderColor: isActive ? 'success.main' : 'divider',
              ...(isActive && {
                backgroundColor: 'rgba(102, 187, 106, 0.05)'
              })
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                <Box>
                  <Typography variant="h6" component="span" sx={{ fontWeight: 700 }}>
                    {getContractTypeLabel(contract.contract_type)}
                  </Typography>
                  {isActive && (
                    <Chip
                      label="Actif"
                      color="success"
                      size="small"
                      sx={{ ml: 1, fontWeight: 600 }}
                    />
                  )}
                </Box>
                <Chip
                  label={getContractStatusLabel(contract.status)}
                  color={getStatusColor(contract.status) as any}
                  size="small"
                />
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Abonnement mensuel
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {formatAmount(contract.monthly_fee)}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Commission par RDV
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {contract.commission_fixed !== null
                      ? `${formatAmount(contract.commission_fixed)}${contract.commission_percentage ? ' / ' + contract.commission_percentage + '%' : ''}`
                      : contract.commission_percentage
                        ? `${contract.commission_percentage}%`
                        : '0€'}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    RDV ce mois
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {contract.appointments_this_month}
                    {contract.max_appointments_per_month && ` / ${contract.max_appointments_per_month}`}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Total RDV
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {contract.total_appointments}
                  </Typography>
                </Grid>
              </Grid>

              {contract.contract_document_url && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <DescriptionIcon color="primary" />
                      <Typography variant="body2">
                        Document de contrat disponible
                      </Typography>
                    </Box>
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => window.open(contract.contract_document_url!, '_blank')}
                    >
                      <VisibilityIcon />
                    </IconButton>
                  </Box>
                </>
              )}

              {contract.admin_notes && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Alert severity="info" sx={{ py: 0.5 }}>
                    <Typography variant="caption" display="block">
                      <strong>Note admin:</strong> {contract.admin_notes}
                    </Typography>
                  </Alert>
                </>
              )}

              <Box sx={{ mt: 2, display: { xs: 'block', md: 'none' } }}>
                <Typography variant="caption" color="text.secondary">
                  Début: {format(startDate, 'dd/MM/yyyy', { locale: fr })}
                  {endDate && ` • Fin: ${format(endDate, 'dd/MM/yyyy', { locale: fr })}`}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </TimelineContent>
      </TimelineItem>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (contracts.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          Aucun contrat n'a encore été créé pour ce praticien
        </Typography>
      </Paper>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Historique des Contrats
        </Typography>
        <Button size="small" onClick={loadContracts} disabled={loading}>
          Actualiser
        </Button>
      </Box>

      <Timeline position="right">
        {contracts.map((contract, index) => renderContractCard(contract, index))}
      </Timeline>

      <style>
        {`
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.7;
            }
          }
        `}
      </style>
    </Box>
  );
};

export default ContractHistory;
