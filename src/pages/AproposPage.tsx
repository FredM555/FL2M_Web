import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  Container,
  Button
} from '@mui/material';
import BoltIcon from '@mui/icons-material/Bolt'; // Icône pour Force
import BalanceIcon from '@mui/icons-material/Balance'; // Icône pour Légitimité
import TransformIcon from '@mui/icons-material/Transform'; // Icône pour Métamorphose
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun'; // Icône pour Mouvement
import AccountTreeIcon from '@mui/icons-material/AccountTree'; // Icône pour l'arbre
import PsychologyIcon from '@mui/icons-material/Psychology'; // Icône pour la numérologie

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
    <Box sx={{ width: '100%' }}>
      {/* Bandeau Notre Philosophie */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
          py: 4,
          mt: { xs: '23px', md: '10px' },
        }}
      >
        <Container maxWidth="lg">
          <Box
            sx={{
              position: 'relative',
              overflow: 'hidden',
              mb: 1,
              borderRadius: '16px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
            }}
          >
            <Box
              sx={{
                background: 'linear-gradient(135deg, #345995 0%, #1D3461 100%)',
                color: 'white',
                p: 3,
                position: 'relative',
                overflow: 'hidden',
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: '400px',
                  height: '400px',
                  background: 'radial-gradient(circle, rgba(255, 215, 0, 0.15) 0%, transparent 70%)',
                  transform: 'translate(30%, -30%)',
                },
              }}
            >
              <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2 }}>
                <Typography
                  variant="h2"
                  component="h1"
                  sx={{
                    fontWeight: 700,
                    fontSize: { xs: '1.5rem', md: '2.5rem' },
                    textAlign: 'center',
                    background: 'linear-gradient(45deg, #FFD700, #FFA500)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    filter: 'drop-shadow(0 2px 8px rgba(255, 215, 0, 0.3))',
                    mb: 1,
                  }}
                >
                  Notre Philosophie
                </Typography>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 400,
                    color: 'rgba(255, 255, 255, 0.9)',
                    lineHeight: 1.7,
                    textAlign: 'center',
                    maxWidth: '800px',
                    mx: 'auto',
                  }}
                >
                  Les trois piliers de FL²M
                </Typography>
              </Container>
            </Box>
          </Box>

        <Box
          sx={{
            py: 0
          }}
        >
          <Container maxWidth="lg">

          <Grid container spacing={6} sx={{ mb: 6 }}>
            {piliers.map((pilier) => (
              <Grid item xs={12} md={4} key={pilier.id}>
                <Card
                  elevation={0}
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    background: 'white',
                    border: '2px solid rgba(255, 215, 0, 0.3)',
                    borderRadius: 3,
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'all 0.3s ease',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '4px',
                      background: 'linear-gradient(90deg, #FFD700, #FFA500)',
                    },
                    '&:hover': {
                      borderColor: '#FFA500',
                      boxShadow: '0 12px 40px rgba(255, 215, 0, 0.25)',
                      transform: 'translateY(-8px)',
                    }
                  }}
                >
                  <CardContent sx={{ textAlign: 'center', flexGrow: 1, p: 3 }}>
                    <pilier.icone
                      sx={{
                        fontSize: 60,
                        color: '#FFD700',
                        mb: 2
                      }}
                    />
                    <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 600, color: '#1a1a2e' }}>
                      {pilier.emoji} {pilier.titre}
                    </Typography>
                    <Typography paragraph sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
                      {pilier.description}
                    </Typography>
                    <Box sx={{ textAlign: 'left', mb: 2 }}>
                      {pilier.manifestations.map((manifestation, index) => (
                        <Typography key={index} paragraph sx={{ display: 'flex', alignItems: 'flex-start', color: 'text.secondary' }}>
                          <span style={{ marginRight: '8px', color: '#FFA500', fontWeight: 'bold' }}>•</span>
                          {manifestation}
                        </Typography>
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Box
            sx={{
              mb: 6,
              p: 4,
              background: 'white',
              border: '2px solid rgba(255, 215, 0, 0.3)',
              borderRadius: 3,
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '4px',
                background: 'linear-gradient(90deg, #FFD700, #FFA500)',
              },
            }}
          >
            <Typography variant="h5" gutterBottom align="center" sx={{ fontWeight: 600, color: '#1a1a2e', mt: 1 }}>
              🌱 Ensemble, les trois forment un cycle :
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-around', mt: 3, gap: 2 }}>
              <Typography sx={{ fontWeight: 'bold', mb: { xs: 2, md: 0 }, color: '#1a1a2e' }}>
                1. <BoltIcon sx={{ verticalAlign: 'middle', mr: 1, color: '#FFD700' }} /> <strong>FORCE</strong> → j'ai l'énergie
              </Typography>
              <Typography sx={{ fontWeight: 'bold', mb: { xs: 2, md: 0 }, color: '#1a1a2e' }}>
                2. <BalanceIcon sx={{ verticalAlign: 'middle', mr: 1, color: '#FFD700' }} /> <strong>LÉGITIMITÉ</strong> → je suis à ma place
              </Typography>
              <Typography sx={{ fontWeight: 'bold', color: '#1a1a2e' }}>
                3. <TransformIcon sx={{ verticalAlign: 'middle', mr: 1, color: '#FFD700' }} /> <strong>MÉTAMORPHOSE</strong> → je grandis / je fais évoluer le monde
              </Typography>
            </Box>
          </Box>

          {/* Section Mouvement */}
          <Box
            sx={{
              mb: 6,
              p: 4,
              background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 165, 0, 0.05) 100%)',
              border: '2px solid rgba(255, 165, 0, 0.4)',
              borderRadius: 3,
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 8px 30px rgba(255, 215, 0, 0.15)',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '4px',
                background: 'linear-gradient(90deg, #FFA500, #FFD700, #FFA500)',
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3 }}>
              <DirectionsRunIcon
                sx={{
                  fontSize: 80,
                  color: '#FFA500',
                  mr: 2,
                  animation: 'pulse 2s ease-in-out infinite',
                  '@keyframes pulse': {
                    '0%, 100%': {
                      transform: 'scale(1)',
                      opacity: 1,
                    },
                    '50%': {
                      transform: 'scale(1.1)',
                      opacity: 0.8,
                    },
                  },
                }}
              />
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 700,
                  background: 'linear-gradient(45deg, #FFA500, #FFD700)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                🏃 LE MOUVEMENT
              </Typography>
            </Box>

            <Typography
              variant="h5"
              align="center"
              sx={{
                fontWeight: 600,
                color: '#1a1a2e',
                mb: 3,
              }}
            >
              Le catalyseur de la transformation
            </Typography>

            <Typography
              paragraph
              align="center"
              sx={{
                fontSize: '1.1rem',
                color: 'text.primary',
                lineHeight: 1.8,
                mb: 3,
                maxWidth: '900px',
                mx: 'auto',
              }}
            >
              <strong style={{ color: '#FFA500' }}>La métamorphose n'aura lieu que s'il y a mouvement.</strong> Sans action, sans pas en avant, la transformation reste un concept abstrait.
              Le mouvement est l'essence même du changement : c'est le passage de l'intention à l'action, de la réflexion à la réalisation.
            </Typography>

            <Grid container spacing={3} sx={{ mt: 2 }}>
              <Grid item xs={12} md={4}>
                <Box
                  sx={{
                    p: 3,
                    background: 'white',
                    borderRadius: 2,
                    border: '1px solid rgba(255, 165, 0, 0.3)',
                    height: '100%',
                  }}
                >
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#FFA500', textAlign: 'center' }}>
                    🔄 Pour l'individu
                  </Typography>
                  <Typography sx={{ color: 'text.secondary', lineHeight: 1.7, textAlign: 'center' }}>
                    Passer à l'action, sortir de sa zone de confort, oser prendre des décisions et avancer sur son chemin de vie.
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box
                  sx={{
                    p: 3,
                    background: 'white',
                    borderRadius: 2,
                    border: '1px solid rgba(255, 165, 0, 0.3)',
                    height: '100%',
                  }}
                >
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#FFA500', textAlign: 'center' }}>
                    🚀 Pour le collectif
                  </Typography>
                  <Typography sx={{ color: 'text.secondary', lineHeight: 1.7, textAlign: 'center' }}>
                    Agir ensemble, mettre en œuvre les projets, créer une dynamique d'évolution et d'innovation partagée.
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box
                  sx={{
                    p: 3,
                    background: 'white',
                    borderRadius: 2,
                    border: '1px solid rgba(255, 165, 0, 0.3)',
                    height: '100%',
                  }}
                >
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#FFA500', textAlign: 'center' }}>
                    ⚡ Le déclic
                  </Typography>
                  <Typography sx={{ color: 'text.secondary', lineHeight: 1.7, textAlign: 'center' }}>
                    Le moment où la force et la légitimité se rencontrent dans l'action pour créer la métamorphose.
                  </Typography>
                </Box>
              </Grid>
            </Grid>

            <Box
              sx={{
                mt: 4,
                p: 3,
                background: 'rgba(255, 255, 255, 0.7)',
                borderRadius: 2,
                border: '1px solid rgba(255, 165, 0, 0.5)',
              }}
            >
              <Typography
                align="center"
                sx={{
                  fontStyle: 'italic',
                  fontSize: '1.1rem',
                  color: '#1a1a2e',
                  fontWeight: 500,
                }}
              >
                "Sans mouvement, il n'y a pas de transformation. Le mouvement est le pont entre qui vous êtes et qui vous devenez."
              </Typography>
            </Box>
          </Box>

          <Typography
            variant="h4"
            component="h2"
            gutterBottom
            align="center"
            sx={{
              mb: 4,
              fontWeight: 600,
              color: '#1a1a2e',
            }}
          >
            Comment FL²M vous accompagne
          </Typography>

          <Grid container spacing={6}>
            {piliers.map((pilier) => (
              <Grid item xs={12} md={4} key={`application-${pilier.id}`}>
                <Card
                  elevation={0}
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    background: 'white',
                    border: '2px solid rgba(255, 215, 0, 0.3)',
                    borderRadius: 3,
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'all 0.3s ease',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '4px',
                      background: 'linear-gradient(90deg, #FFD700, #FFA500)',
                    },
                    '&:hover': {
                      borderColor: '#FFA500',
                      boxShadow: '0 12px 40px rgba(255, 215, 0, 0.25)',
                      transform: 'translateY(-8px)',
                    }
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="h5" component="h3" gutterBottom align="center" sx={{ fontWeight: 600, color: '#1a1a2e' }}>
                      {pilier.emoji} Développer votre {pilier.titre}
                    </Typography>
                    <Typography paragraph sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
                      <strong style={{ color: '#FFA500' }}>Pour vous :</strong> {pilier.applicationPersonnelle}
                    </Typography>
                    <Typography paragraph sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
                      <strong style={{ color: '#FFA500' }}>En collectif :</strong> {pilier.applicationCollective}
                    </Typography>
                    <Typography variant="body2" sx={{ fontStyle: 'italic', mt: 2, color: 'text.secondary' }}>
                      Découvrez nos modules adaptés à vos besoins pour renforcer cet aspect essentiel.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
          </Container>
        </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default AProposPage;