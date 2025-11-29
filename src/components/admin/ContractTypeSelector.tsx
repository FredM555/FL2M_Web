// src/components/admin/ContractTypeSelector.tsx
import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Radio,
  RadioGroup,
  FormControlLabel,
  Grid,
  Chip,
  Divider,
  Alert
} from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import DiamondIcon from '@mui/icons-material/Diamond';
import AllInclusiveIcon from '@mui/icons-material/AllInclusive';
import { ContractType, CONTRACT_CONFIGS, formatAmount } from '../../types/payments';

interface ContractTypeSelectorProps {
  value: ContractType;
  onChange: (type: ContractType) => void;
  disabled?: boolean;
}

const ContractTypeSelector: React.FC<ContractTypeSelectorProps> = ({
  value,
  onChange,
  disabled = false
}) => {
  const contractOptions: Array<{
    type: ContractType;
    icon: React.ReactNode;
    color: string;
    bgGradient: string;
    label: string;
    description: string;
  }> = [
    {
      type: 'free',
      icon: <StarIcon />,
      color: '#FFA726',
      bgGradient: 'linear-gradient(135deg, rgba(255, 167, 38, 0.1) 0%, rgba(255, 167, 38, 0.05) 100%)',
      label: 'Sans Engagement',
      description: 'Sans abonnement mensuel'
    },
    {
      type: 'starter',
      icon: <RocketLaunchIcon />,
      color: '#42A5F5',
      bgGradient: 'linear-gradient(135deg, rgba(66, 165, 245, 0.1) 0%, rgba(66, 165, 245, 0.05) 100%)',
      label: 'Starter',
      description: 'Pour démarrer son activité'
    },
    {
      type: 'pro',
      icon: <DiamondIcon />,
      color: '#AB47BC',
      bgGradient: 'linear-gradient(135deg, rgba(171, 71, 188, 0.1) 0%, rgba(171, 71, 188, 0.05) 100%)',
      label: 'Pro',
      description: 'Pour les professionnels établis'
    },
    {
      type: 'premium',
      icon: <AllInclusiveIcon />,
      color: '#66BB6A',
      bgGradient: 'linear-gradient(135deg, rgba(102, 187, 106, 0.1) 0%, rgba(102, 187, 106, 0.05) 100%)',
      label: 'Premium',
      description: 'Aucune commission, tous les RDV gratuits'
    }
  ];

  const renderContractDetails = (type: ContractType) => {
    const config = CONTRACT_CONFIGS[type];

    return (
      <Box sx={{ mt: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Abonnement mensuel
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {formatAmount(config.monthly_fee)}
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Divider sx={{ my: 1 }} />
          </Grid>

          <Grid item xs={12}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
              Commission par RDV
            </Typography>
            {type === 'free' && (
              <Typography variant="body2" color="text.secondary">
                max({formatAmount(config.commission_fixed!)}, {config.commission_percentage}% du prix)
                <br />
                <strong>Plafonné à {formatAmount(config.commission_cap!)}</strong>
              </Typography>
            )}
            {type === 'starter' && (
              <Typography variant="body2" color="text.secondary">
                min({formatAmount(config.commission_fixed!)}, {config.commission_percentage}% du prix)
              </Typography>
            )}
            {type === 'pro' && (
              <Typography variant="body2" color="text.secondary">
                {formatAmount(config.commission_fixed!)} fixe par RDV
              </Typography>
            )}
            {type === 'premium' && (
              <Typography variant="body2" color="text.secondary">
                <strong>0€</strong> - Tous les RDV sans commission
              </Typography>
            )}
          </Grid>

          {config.max_appointments_per_month && (
            <Grid item xs={12}>
              <Alert severity="info" sx={{ py: 0.5 }}>
                <Typography variant="body2">
                  Limité à {config.max_appointments_per_month} RDV/mois
                </Typography>
              </Alert>
            </Grid>
          )}
        </Grid>
      </Box>
    );
  };

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
          ℹ️ Frais de paiement Stripe
        </Typography>
        <Typography variant="body2">
          Les paiements clients passent par Stripe qui prélève <strong>~2% de frais de transaction</strong>.
          Ces frais sont à la charge de l'intervenant. Les commissions s'appliquent dès le premier RDV.
        </Typography>
      </Alert>

      <RadioGroup
        value={value}
        onChange={(e) => onChange(e.target.value as ContractType)}
      >
        <Grid container spacing={2}>
          {contractOptions.map((option) => (
            <Grid item xs={12} md={6} key={option.type}>
              <Card
                sx={{
                  position: 'relative',
                  border: value === option.type ? `3px solid ${option.color}` : '2px solid rgba(0,0,0,0.1)',
                  background: value === option.type ? option.bgGradient : 'white',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease',
                  opacity: disabled ? 0.6 : 1,
                  '&:hover': disabled ? {} : {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                    border: `2px solid ${option.color}`
                  }
                }}
                onClick={() => !disabled && onChange(option.type)}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <FormControlLabel
                      value={option.type}
                      control={
                        <Radio
                          disabled={disabled}
                          sx={{
                            color: option.color,
                            '&.Mui-checked': {
                              color: option.color
                            }
                          }}
                        />
                      }
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ color: option.color, display: 'flex', alignItems: 'center' }}>
                            {option.icon}
                          </Box>
                          <Typography variant="h6" sx={{ fontWeight: 700 }}>
                            {option.label}
                          </Typography>
                        </Box>
                      }
                      sx={{ m: 0 }}
                    />
                    {value === option.type && (
                      <Chip
                        label="Sélectionné"
                        size="small"
                        sx={{
                          ml: 'auto',
                          backgroundColor: option.color,
                          color: 'white',
                          fontWeight: 600
                        }}
                      />
                    )}
                  </Box>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 2, minHeight: 40 }}
                  >
                    {option.description}
                  </Typography>

                  {renderContractDetails(option.type)}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </RadioGroup>

      <Box sx={{ mt: 3 }}>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
          💡 <strong>Exemples de calcul pour un RDV à 75€ :</strong>
        </Typography>
        <Grid container spacing={1}>
          <Grid item xs={6} sm={3}>
            <Typography variant="caption" color="text.secondary">
              <strong>SANS ENGAGEMENT:</strong> 10€ (max entre 10€ et 12% = 9€)
            </Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="caption" color="text.secondary">
              <strong>STARTER:</strong> 6€ (min entre 6€ et 8% = 6€)
            </Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="caption" color="text.secondary">
              <strong>PRO:</strong> 3€ fixe
            </Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="caption" color="text.secondary">
              <strong>PREMIUM:</strong> 0€
            </Typography>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default ContractTypeSelector;
