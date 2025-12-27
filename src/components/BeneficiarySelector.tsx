// Composant pour sélectionner un bénéficiaire
import React, { useState, useEffect } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  SelectChangeEvent
} from '@mui/material';
import { getBeneficiaries } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { logger } from '../utils/logger';
import { NumerologyTriangleAvatar } from './profile/NumerologyTriangleAvatar';

interface Beneficiary {
  id: string;
  first_name: string;
  last_name: string;
  relationship?: string;
  racine1?: number;
  racine2?: number;
  tronc?: number;
  dynamique_de_vie?: number;
  ecorce?: number;
  branche?: number;
  feuille?: number;
  fruit?: number;
  birthDay?: number;
  birthMonth?: number;
}

interface BeneficiaryAccessRow {
  beneficiary_id: string;
  relationship: string;
  beneficiary: {
    id: string;
    first_name: string;
    last_name: string;
    birth_date?: string;
    racine_1?: number;
    racine_2?: number;
    tronc?: number;
    dynamique_de_vie?: number;
    ecorce?: number;
    branche?: number;
    feuille?: number;
    fruit?: number;
  };
}

interface BeneficiarySelectorProps {
  onBeneficiarySelect: (beneficiary: Beneficiary | null) => void;
}

const BeneficiarySelector: React.FC<BeneficiarySelectorProps> = ({ onBeneficiarySelect }) => {
  const { user } = useAuth();
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBeneficiaries = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { data, error } = await getBeneficiaries(user.id);

        if (error) throw error;

        if (data) {
          // Transformer les données pour extraire les bénéficiaires
          const formattedBeneficiaries = (data as any[])
            .map((row: any) => {
              // Extraire jour et mois de naissance de birth_date
              let birthDay: number | undefined;
              let birthMonth: number | undefined;

              // Supabase peut retourner beneficiary comme un tableau ou un objet
              const beneficiary = Array.isArray(row.beneficiary) ? row.beneficiary[0] : row.beneficiary;

              if (beneficiary?.birth_date) {
                const birthDate = new Date(beneficiary.birth_date);
                birthDay = birthDate.getDate();
                birthMonth = birthDate.getMonth() + 1; // getMonth() retourne 0-11
              }

              return {
                id: beneficiary?.id,
                first_name: beneficiary?.first_name,
                last_name: beneficiary?.last_name,
                relationship: row.relationship,
                racine1: beneficiary?.racine_1,
                racine2: beneficiary?.racine_2,
                tronc: beneficiary?.tronc,
                dynamique_de_vie: beneficiary?.dynamique_de_vie,
                ecorce: beneficiary?.ecorce,
                branche: beneficiary?.branche,
                feuille: beneficiary?.feuille,
                fruit: beneficiary?.fruit,
                birthDay,
                birthMonth
              };
            });

          setBeneficiaries(formattedBeneficiaries);

          // Sélectionner automatiquement le bénéficiaire avec relationship='self' en priorité
          if (formattedBeneficiaries.length > 0) {
            // Chercher d'abord le bénéficiaire avec relationship='self'
            const selfBeneficiary = formattedBeneficiaries.find(b => b.relationship === 'self');
            // Sinon, prendre le premier de la liste
            const selectedBeneficiary = selfBeneficiary || formattedBeneficiaries[0];

            setSelectedId(selectedBeneficiary.id);
            onBeneficiarySelect(selectedBeneficiary);
          }
        }
      } catch (err) {
        logger.error('Erreur lors de la récupération des bénéficiaires:', err);
        setError('Impossible de charger vos bénéficiaires.');
      } finally {
        setLoading(false);
      }
    };

    fetchBeneficiaries();
  }, [user?.id]);

  const handleChange = (event: SelectChangeEvent<string>) => {
    const id = event.target.value;
    setSelectedId(id);

    if (id) {
      const beneficiary = beneficiaries.find(b => b.id === id);
      onBeneficiarySelect(beneficiary || null);
    } else {
      onBeneficiarySelect(null);
    }
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
      <Alert severity="error" sx={{ mb: 3 }}>
        {error}
      </Alert>
    );
  }

  if (beneficiaries.length === 0) {
    return (
      <Alert severity="info" sx={{ mb: 3 }}>
        Vous n'avez pas encore de bénéficiaire enregistré. Veuillez d'abord créer un bénéficiaire pour voir son message du jour.
      </Alert>
    );
  }

  return (
    <Box sx={{ mb: 4 }}>
      <FormControl fullWidth>
        <InputLabel id="beneficiary-select-label">
          Sélectionnez un bénéficiaire
        </InputLabel>
        <Select
          labelId="beneficiary-select-label"
          id="beneficiary-select"
          value={selectedId}
          label="Sélectionnez un bénéficiaire"
          onChange={handleChange}
          renderValue={(value) => {
            if (!value) return <em>-- Choisir un bénéficiaire --</em>;
            const beneficiary = beneficiaries.find(b => b.id === value);
            if (!beneficiary) return '';
            return (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <NumerologyTriangleAvatar
                  racine1={beneficiary.racine1}
                  racine2={beneficiary.racine2}
                  tronc={beneficiary.tronc}
                  dynamique_de_vie={beneficiary.dynamique_de_vie}
                  size={28}
                  fontSizeScale={1.5}
                />
                <span>{beneficiary.first_name} {beneficiary.last_name}</span>
              </Box>
            );
          }}
        >
          <MenuItem value="">
            <em>-- Choisir un bénéficiaire --</em>
          </MenuItem>
          {beneficiaries.map((beneficiary) => (
            <MenuItem key={beneficiary.id} value={beneficiary.id}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <NumerologyTriangleAvatar
                  racine1={beneficiary.racine1}
                  racine2={beneficiary.racine2}
                  tronc={beneficiary.tronc}
                  dynamique_de_vie={beneficiary.dynamique_de_vie}
                  size={32}
                />
                <span>{beneficiary.first_name} {beneficiary.last_name}</span>
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
};

export default BeneficiarySelector;
