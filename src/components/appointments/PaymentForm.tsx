// src/components/appointments/PaymentForm.tsx
import React, { useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormHelperText,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
  CircularProgress
} from '@mui/material';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import PaymentIcon from '@mui/icons-material/Payment';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';

interface PaymentFormProps {
  amount: number;
  onSubmit: (paymentMethod: string) => void;
  loading: boolean;
  disabled?: boolean;
}

type PaymentMethodOption = {
  value: string;
  label: string;
  icon: React.ReactNode;
  fields: JSX.Element;
};

/**
 * Composant de formulaire de paiement
 */
const PaymentForm: React.FC<PaymentFormProps> = ({ 
  amount, 
  onSubmit, 
  loading, 
  disabled = false 
}) => {
  const [paymentMethod, setPaymentMethod] = useState<string>('card');
  const [cardNumber, setCardNumber] = useState<string>('');
  const [cardName, setCardName] = useState<string>('');
  const [expiryDate, setExpiryDate] = useState<string>('');
  const [cvc, setCvc] = useState<string>('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(paymentMethod);
  };
  
  // Configuration des différentes méthodes de paiement
  const paymentMethods: PaymentMethodOption[] = [
    {
      value: 'card',
      label: 'Carte bancaire',
      icon: <CreditCardIcon />,
      fields: (
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              required
              fullWidth
              label="Numéro de carte"
              placeholder="1234 5678 9012 3456"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              inputProps={{ maxLength: 19 }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              required
              fullWidth
              label="Nom sur la carte"
              placeholder="John Doe"
              value={cardName}
              onChange={(e) => setCardName(e.target.value)}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              required
              fullWidth
              label="Date d'expiration"
              placeholder="MM/AA"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              inputProps={{ maxLength: 5 }}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              required
              fullWidth
              label="CVC"
              placeholder="123"
              value={cvc}
              onChange={(e) => setCvc(e.target.value)}
              inputProps={{ maxLength: 3 }}
            />
          </Grid>
        </Grid>
      )
    },
    {
      value: 'paypal',
      label: 'PayPal',
      icon: <PaymentIcon />,
      fields: (
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Vous serez redirigé vers PayPal pour finaliser votre paiement.
          </Typography>
        </Box>
      )
    },
    {
      value: 'transfer',
      label: 'Virement bancaire',
      icon: <AccountBalanceIcon />,
      fields: (
        <Box sx={{ p: 2 }}>
          <Typography variant="body2" gutterBottom>
            Veuillez effectuer un virement aux coordonnées suivantes:
          </Typography>
          <Typography variant="body2">
            IBAN: FR76 1234 5678 9012 3456 7890 123
          </Typography>
          <Typography variant="body2">
            BIC: ABCDFRPP
          </Typography>
          <Typography variant="body2" sx={{ mt: 2 }}>
            Référence à indiquer: RDV-{new Date().getTime().toString().slice(-6)}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Votre rendez-vous sera confirmé après réception du paiement.
          </Typography>
        </Box>
      )
    }
  ];
  
  // Trouver la méthode sélectionnée
  const selectedMethod = paymentMethods.find(m => m.value === paymentMethod) || paymentMethods[0];
  
  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Paiement
      </Typography>
      
      <form onSubmit={handleSubmit}>
        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel id="payment-method-label">Méthode de paiement</InputLabel>
          <Select
            labelId="payment-method-label"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            label="Méthode de paiement"
            disabled={disabled || loading}
          >
            {paymentMethods.map((method) => (
              <MenuItem 
                key={method.value} 
                value={method.value}
                sx={{ display: 'flex', alignItems: 'center' }}
              >
                <Box sx={{ mr: 1 }}>{method.icon}</Box>
                {method.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        <Box sx={{ mb: 3 }}>
          {selectedMethod.fields}
        </Box>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5" color="primary.main" fontWeight="bold">
            Total: {amount} €
          </Typography>
          
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={disabled || loading}
            startIcon={loading ? <CircularProgress size={20} /> : <PaymentIcon />}
          >
            {loading ? 'Traitement en cours...' : `Payer ${amount} €`}
          </Button>
        </Box>
      </form>
    </Paper>
  );
};

export default PaymentForm;