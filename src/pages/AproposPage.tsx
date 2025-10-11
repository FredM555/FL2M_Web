import React from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Grid,
  Box
} from '@mui/material';
import BoltIcon from '@mui/icons-material/Bolt'; // Icône pour Force
import BalanceIcon from '@mui/icons-material/Balance'; // Icône pour Légitimité
import TransformIcon from '@mui/icons-material/Transform'; // Icône pour Métamorphose

// Interface pour définir la structure d'un pilier
interface Pilier {
  id: number;
  titre: string;
  emoji: string;
  description: string;
  manifestations: string[];
  icone: React.ElementType;
  applicationPersonnelle: string;
  applicationCollective: string;
}

const AProposPage: React.FC = () => {
  // Liste des piliers
  const piliers: Pilier[] = [
    {
      id: 1,
      titre: 'FORCE',
      emoji: '🔥',
      description: 'C\'est l\'élan vital, l\'énergie brute, la puissance intérieure. C\'est aussi le courage d\'agir, la capacité à tenir dans l\'adversité.',
      manifestations: [
        'Sur le plan personnel : force mentale, résilience',
        'En collectif : dynamique, motivation, dépassement',
        'En symbole : un rocher, un muscle stylisé, un éclair'
      ],
      icone: BoltIcon,
      applicationPersonnelle: 'La force se manifeste par la résilience mentale, la détermination et la capacité à surmonter les obstacles. C\'est ce qui vous permet de vous relever après un échec et de continuer à avancer malgré les difficultés.',
      applicationCollective: 'La force crée une dynamique positive, stimule la motivation et encourage le dépassement de soi. Elle est contagieuse et permet à une équipe d\'atteindre des objectifs ambitieux.'
    },
    {
      id: 2,
      titre: 'LÉGITIMITÉ',
      emoji: '⚖️',
      description: 'C\'est l\'ancrage, la reconnaissance, la justesse d\'être à sa place. C\'est ce qui valide ton action de l\'intérieur autant que de l\'extérieur.',
      manifestations: [
        'Pour soi : alignement, estime de soi, sentiment d\'avoir le droit d\'être',
        'Pour l\'enfant : confiance, encouragements',
        'Pour une équipe : reconnaissance des rôles',
        'En symbole : une balance, un sceau, une racine'
      ],
      icone: BalanceIcon,
      applicationPersonnelle: 'La légitimité se traduit par l\'alignement avec vos valeurs, l\'estime de soi et le sentiment profond d\'avoir le droit d\'être qui vous êtes et d\'occuper votre place.',
      applicationCollective: 'La légitimité se manifeste par la reconnaissance des rôles de chacun, créant un environnement où tous les membres se sentent valorisés et à leur place.'
    },
    {
      id: 3,
      titre: 'MÉTAMORPHOSE',
      emoji: '🦋',
      description: 'C\'est la transformation, la croissance, le passage d\'un état à un autre. L\'évolution naturelle mais guidée.',
      manifestations: [
        'Pour l\'individu : développement personnel, transitions de vie',
        'Pour l\'enfant : maturité, évolution des talents',
        'Pour le groupe : adaptation, innovation, progression',
        'En symbole : une chrysalide, un papillon, une spirale'
      ],
      icone: TransformIcon,
      applicationPersonnelle: 'La métamorphose se manifeste dans le développement personnel et les transitions de vie, permettant d\'évoluer et de s\'adapter aux changements tout en restant fidèle à soi-même.',
      applicationCollective: 'La métamorphose facilite l\'adaptation, stimule l\'innovation et encourage la progression collective, permettant à une équipe d\'évoluer face aux défis et aux changements.'
    }
  ];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px' }}>
      <Typography variant="h3" component="h1" gutterBottom align="center" fontWeight="bold" sx={{ mb: 3 }}>
        Notre Philosophie
      </Typography>
      
      <Typography variant="h5" align="center" sx={{ mb: 6 }}>
        Les trois piliers de FLM Essences
      </Typography>
      
      <Grid container spacing={6} sx={{ mb: 6 }}>
        {piliers.map((pilier) => (
          <Grid item xs={12} md={4} key={pilier.id}>
            <Card sx={{ 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column',
              transition: 'box-shadow 0.3s, transform 0.3s',
              '&:hover': {
                boxShadow: 6,
                transform: 'translateY(-5px)'
              }
            }}>
              <CardContent sx={{ textAlign: 'center', flexGrow: 1 }}>
                <pilier.icone 
                  sx={{ 
                    fontSize: 48, 
                    color: 'primary.main', 
                    mb: 2 
                  }} 
                />
                <Typography variant="h4" component="h2" gutterBottom>
                  {pilier.emoji} {pilier.titre}
                </Typography>
                <Typography paragraph>
                  {pilier.description}
                </Typography>
                <Box sx={{ textAlign: 'left', mb: 2 }}>
                  {pilier.manifestations.map((manifestation, index) => (
                    <Typography key={index} paragraph sx={{ display: 'flex', alignItems: 'flex-start' }}>
                      <span style={{ marginRight: '8px' }}>•</span>
                      {manifestation}
                    </Typography>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      
      <Box sx={{ mb: 6, p: 4, backgroundColor: '#f5f5f5', borderRadius: 2 }}>
        <Typography variant="h5" gutterBottom align="center">
          🌱 Ensemble, les trois forment un cycle :
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-around', mt: 3 }}>
          <Typography sx={{ fontWeight: 'bold', mb: { xs: 2, md: 0 } }}>
            1. <BoltIcon sx={{ verticalAlign: 'middle', mr: 1 }} /> <strong>FORCE</strong> → j'ai l'énergie
          </Typography>
          <Typography sx={{ fontWeight: 'bold', mb: { xs: 2, md: 0 } }}>
            2. <BalanceIcon sx={{ verticalAlign: 'middle', mr: 1 }} /> <strong>LÉGITIMITÉ</strong> → je suis à ma place
          </Typography>
          <Typography sx={{ fontWeight: 'bold' }}>
            3. <TransformIcon sx={{ verticalAlign: 'middle', mr: 1 }} /> <strong>MÉTAMORPHOSE</strong> → je grandis / je fais évoluer le monde
          </Typography>
        </Box>
      </Box>
      
      <Typography variant="h4" component="h2" gutterBottom align="center" sx={{ mb: 4 }}>
        Comment FLM Essences vous accompagne
      </Typography>
      
      <Grid container spacing={6}>
        {piliers.map((pilier) => (
          <Grid item xs={12} md={4} key={`application-${pilier.id}`}>
            <Card sx={{ 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column',
              transition: 'box-shadow 0.3s, transform 0.3s',
              '&:hover': {
                boxShadow: 6,
                transform: 'translateY(-5px)'
              }
            }}>
              <CardContent>
                <Typography variant="h5" component="h3" gutterBottom align="center">
                  {pilier.emoji} Développer votre {pilier.titre}
                </Typography>
                <Typography paragraph>
                  <strong>Pour vous :</strong> {pilier.applicationPersonnelle}
                </Typography>
                <Typography paragraph>
                  <strong>En collectif :</strong> {pilier.applicationCollective}
                </Typography>
                <Typography variant="body2" sx={{ fontStyle: 'italic', mt: 2 }}>
                  Découvrez nos modules adaptés à vos besoins pour renforcer cet aspect essentiel.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </div>
  );
};

export default AProposPage;