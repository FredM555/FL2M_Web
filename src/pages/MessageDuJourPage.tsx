// Page dédiée au message du jour
import React, { useState } from 'react';
import { Container, Box, Typography, Tabs, Tab } from '@mui/material';
import DailyDrawContainer from '../components/DailyDrawContainer';
import BeneficiarySelector from '../components/BeneficiarySelector';
import BeneficiaryDailyDraw from '../components/BeneficiaryDailyDraw';
import { useAuth } from '../context/AuthContext';

interface Beneficiary {
  id: string;
  first_name: string;
  last_name: string;
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

const MessageDuJourPage: React.FC = () => {
  const { user } = useAuth();
  // Si l'utilisateur est connecté, on se positionne sur l'onglet bénéficiaire (1), sinon sur visiteur (0)
  const [tabValue, setTabValue] = useState(user ? 1 : 0);
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<Beneficiary | null>(null);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    // Réinitialiser la sélection quand on change d'onglet
    if (newValue === 0) {
      setSelectedBeneficiary(null);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ px: { xs: 0, sm: 3 } }}>
      <Box sx={{ py: { xs: 2, sm: 4 } }}>
        <Box sx={{ textAlign: 'center', mb: 4, display: { xs: 'none', sm: 'block' } }}>
          <Typography
            variant="h3"
            component="h1"
            gutterBottom
            sx={{
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Message du Jour
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Découvrez votre guidance numérologique quotidienne
          </Typography>
        </Box>

        {/* Onglets : Visiteur / Bénéficiaire (si connecté) */}
        {user && (
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: { xs: 2, sm: 4 }, px: { xs: 2, sm: 0 } }}>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              centered
              variant="fullWidth"
              sx={{
                '& .MuiTab-root': {
                  fontSize: { xs: '0.875rem', sm: '1rem' },
                  minHeight: { xs: 48, sm: 64 }
                }
              }}
            >
              <Tab label="Pour moi (visiteur)" />
              <Tab label="Pour un bénéficiaire" />
            </Tabs>
          </Box>
        )}

        {/* Contenu de l'onglet actif */}
        <Box>
          {tabValue === 0 ? (
            // Onglet Visiteur (formulaire classique)
            <DailyDrawContainer />
          ) : (
            // Onglet Bénéficiaire (sélection + affichage)
            <Box>
              <BeneficiarySelector onBeneficiarySelect={setSelectedBeneficiary} />

              {selectedBeneficiary && (
                <BeneficiaryDailyDraw
                  beneficiaryId={selectedBeneficiary.id}
                  firstName={selectedBeneficiary.first_name}
                  racine1={selectedBeneficiary.racine1}
                  racine2={selectedBeneficiary.racine2}
                  tronc={selectedBeneficiary.tronc}
                  dynamiqueDeVie={selectedBeneficiary.dynamique_de_vie}
                  ecorce={selectedBeneficiary.ecorce}
                  branche={selectedBeneficiary.branche}
                  feuille={selectedBeneficiary.feuille}
                  fruit={selectedBeneficiary.fruit}
                  birthDay={selectedBeneficiary.birthDay}
                  birthMonth={selectedBeneficiary.birthMonth}
                />
              )}
            </Box>
          )}
        </Box>

        {/* Section explicative */}
        <Box sx={{ mt: { xs: 4, sm: 6 }, textAlign: 'center', maxWidth: 700, mx: 'auto', px: { xs: 2, sm: 0 } }}>
          <Typography variant="h5" gutterBottom fontWeight="bold" sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
            Comment ça fonctionne ?
          </Typography>

          {tabValue === 0 ? (
            // Explication pour les visiteurs
            <>
              <Typography variant="body1" color="text.secondary" paragraph>
                Votre message du jour combine deux nombres numérologique :
              </Typography>
              <Box sx={{ textAlign: 'left', mb: 2 }}>
                <Typography variant="body1" color="text.secondary" paragraph>
                  <strong>• Objectif de vie :</strong> Calculé à partir de votre jour et mois de naissance,
                  il représente votre direction de vie fondamentale.
                </Typography>
                <Typography variant="body1" color="text.secondary" paragraph>
                  <strong>• Jour personnel :</strong> Calculé à partir de votre naissance et de la date du jour,
                  il révèle l'énergie spécifique de cette journée pour vous.
                </Typography>
              </Box>
            </>
          ) : (
            // Explication pour les bénéficiaires
            <>
              <Typography variant="body1" color="text.secondary" paragraph>
                Le message du jour d'un bénéficiaire combine trois nombres numérologique :
              </Typography>
              <Box sx={{ textAlign: 'left', mb: 2 }}>
                <Typography variant="body1" color="text.secondary" paragraph>
                  <strong>🔺 Triangle fondamental :</strong> Un nombre tiré quotidiennement parmi
                  le Tronc, les Racines ou la Dynamique de vie. Ce sont les fondations de votre être.
                </Typography>
                <Typography variant="body1" color="text.secondary" paragraph>
                  <strong>📅 Jour personnel :</strong> Calculé à partir de votre date de naissance et de la date du jour,
                  il révèle l'énergie spécifique de cette journée pour vous.
                </Typography>
                <Typography variant="body1" color="text.secondary" paragraph>
                  <strong>🌳 Arbre numérologique :</strong> Un nombre tiré quotidiennement parmi
                  l'Écorce, la Branche, la Feuille ou le Fruit. Ce sont vos expressions dans le monde.
                </Typography>
              </Box>
            </>
          )}

          <Typography variant="body1" color="text.secondary">
            Chaque jour apporte un nouveau message personnel. Revenez demain pour découvrir
            votre prochaine guidance !
          </Typography>
        </Box>
      </Box>
    </Container>
  );
};

export default MessageDuJourPage;
