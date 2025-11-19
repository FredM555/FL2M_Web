import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Box,
  Tabs,
  Tab,
  Typography,
  Button,
  Tooltip
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import VideoCallIcon from '@mui/icons-material/VideoCall';
import PersonIcon from '@mui/icons-material/Person';
import CakeIcon from '@mui/icons-material/Cake';
import PaymentIcon from '@mui/icons-material/Payment';
import { AppointmentDocuments } from './AppointmentDocuments';
import { AppointmentComments } from './AppointmentComments';
import { AppointmentBeneficiary } from './AppointmentBeneficiary';
import { AppointmentPractitioner } from './AppointmentPractitioner';
import { AppointmentMeetingLink } from './AppointmentMeetingLink';
import { Appointment } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`appointment-tabpanel-${index}`}
      aria-labelledby={`appointment-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

interface AppointmentDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  appointment: Appointment;
  onAppointmentUpdate?: (updatedAppointment: Appointment) => void;
}

export const AppointmentDetailsDialog: React.FC<AppointmentDetailsDialogProps> = ({
  open,
  onClose,
  appointment,
  onAppointmentUpdate
}) => {
  const { profile } = useAuth();
  const [currentTab, setCurrentTab] = useState(0);
  const [currentAppointment, setCurrentAppointment] = useState(appointment);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  // Mettre à jour l'appointment local et notifier le parent
  const handleAppointmentUpdate = (updatedAppointment: Appointment) => {
    setCurrentAppointment(updatedAppointment);
    if (onAppointmentUpdate) {
      onAppointmentUpdate(updatedAppointment);
    }
  };

  // Mettre à jour l'appointment quand la prop change
  React.useEffect(() => {
    setCurrentAppointment(appointment);
  }, [appointment]);

  // Déterminer si l'utilisateur peut uploader des documents
  const canUpload = React.useMemo(() => {
    if (!profile) return false;

    // Admin peut toujours uploader
    if (profile.user_type === 'admin') return true;

    // Consultant peut uploader sur ses propres RDV
    if (profile.user_type === 'intervenant') {
      // Vérifier si le consultant est celui du RDV
      // Note: practitioner.user_id devrait correspondre à profile.id
      return currentAppointment.practitioner?.user_id === profile.id;
    }

    return false;
  }, [profile, currentAppointment]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      scroll="paper"
      PaperProps={{
        sx: {
          m: { xs: 1, sm: 2 },
          maxHeight: { xs: 'calc(100% - 16px)', sm: 'calc(100% - 64px)' }
        }
      }}
    >
      <DialogTitle sx={{ px: { xs: 2, sm: 3 } }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6" sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
            Détails du rendez-vous
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers sx={{ px: { xs: 1.5, sm: 3 } }}>
        {/* Informations du RDV */}
        <Box mb={3} sx={{
          p: { xs: 1.5, sm: 2 },
          bgcolor: 'grey.50',
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider'
        }}>
          <Box sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            gap: { xs: 2, md: 3 },
            alignItems: 'flex-start'
          }}>
            {/* Colonne de gauche : Infos du RDV */}
            <Box sx={{ flex: 1, width: '100%' }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                Service
              </Typography>
              <Typography variant="body1" fontWeight={600} gutterBottom sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                {currentAppointment.service?.name}
              </Typography>

              <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                Date et heure
              </Typography>
              <Typography variant="body1" gutterBottom sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                {format(parseISO(currentAppointment.start_time), 'EEEE d MMMM yyyy - HH:mm', { locale: fr })}
              </Typography>

              {currentAppointment.practitioner && currentAppointment.practitioner.profile?.pseudo && (
                <>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                    Intervenant
                  </Typography>
                  <Typography variant="body1" gutterBottom sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                    {currentAppointment.practitioner.profile.pseudo}
                    {currentAppointment.practitioner.title && ` - ${currentAppointment.practitioner.title}`}
                  </Typography>
                </>
              )}

              {currentAppointment.meeting_link && (
                <Box sx={{ mt: 2 }}>
                  <Tooltip title="Rejoindre la visioconférence">
                    <Button
                      variant="contained"
                      startIcon={<VideoCallIcon />}
                      onClick={() => window.open(currentAppointment.meeting_link, '_blank', 'noopener,noreferrer')}
                      fullWidth
                      sx={{
                        py: { xs: 1.5, sm: 1 },
                        fontSize: { xs: '0.9rem', sm: '0.875rem' },
                        background: 'linear-gradient(45deg, #4CAF50, #45a049)',
                        '&:hover': {
                          background: 'linear-gradient(45deg, #45a049, #4CAF50)',
                        },
                      }}
                    >
                      Rejoindre la séance
                    </Button>
                  </Tooltip>
                </Box>
              )}
            </Box>

            {/* Colonne de droite : Bénéficiaire (mis en évidence) */}
            <Box sx={{
              width: { xs: '100%', md: '280px' },
              minWidth: { xs: 'auto', md: '280px' },
              p: { xs: 2, sm: 2.5 },
              bgcolor: 'white',
              borderRadius: 2,
              border: '2px solid',
              borderColor: 'primary.main',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            }}>
              <Typography
                variant="overline"
                sx={{
                  color: 'primary.main',
                  fontWeight: 700,
                  letterSpacing: 1.2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  mb: 2,
                  fontSize: { xs: '0.7rem', sm: '0.75rem' }
                }}
              >
                <PersonIcon fontSize="small" />
                Bénéficiaire
              </Typography>

              <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', mb: 2, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                {currentAppointment.beneficiary_first_name || currentAppointment.client?.first_name}{' '}
                {currentAppointment.beneficiary_last_name || currentAppointment.client?.last_name}
              </Typography>

              <Box>
                {(currentAppointment.beneficiary_birth_date || currentAppointment.client?.birth_date) && (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      p: { xs: 1, sm: 1.5 },
                      bgcolor: 'grey.50',
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'grey.300'
                    }}
                  >
                    <CakeIcon sx={{ color: 'primary.main', fontSize: { xs: 20, sm: 24 } }} />
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                        Date de naissance
                      </Typography>
                      <Typography variant="body1" fontWeight={600} sx={{ fontSize: { xs: '0.85rem', sm: '1rem' } }}>
                        {format(
                          parseISO(currentAppointment.beneficiary_birth_date || currentAppointment.client!.birth_date!),
                          'dd/MM/yyyy'
                        )}
                      </Typography>
                    </Box>
                  </Box>
                )}

                {currentAppointment.beneficiary_email && (
                  <Typography
                    variant="caption"
                    sx={{
                      display: 'block',
                      mt: 0.5,
                      pl: { xs: 1, sm: 1.5 },
                      fontSize: { xs: '0.65rem', sm: '0.7rem' },
                      color: 'text.secondary',
                      wordBreak: 'break-word',
                      overflowWrap: 'break-word'
                    }}
                  >
                    {currentAppointment.beneficiary_email}
                  </Typography>
                )}
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Tabs pour Bénéficiaire, Intervenant, Visio, Documents et Commentaires */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mx: { xs: -1.5, sm: 0 } }}>
          <Tabs
            value={currentTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            sx={{
              '& .MuiTab-root': {
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                minWidth: { xs: 'auto', sm: 90 },
                px: { xs: 1.5, sm: 2 }
              }
            }}
          >
            <Tab label="Bénéficiaire" />
            <Tab label="Intervenant" />
            <Tab label="Visio" />
            <Tab label="Documents" />
            <Tab label="Commentaires" />
          </Tabs>
        </Box>

        <TabPanel value={currentTab} index={0}>
          <AppointmentBeneficiary
            appointment={currentAppointment}
            onUpdate={handleAppointmentUpdate}
          />
        </TabPanel>

        <TabPanel value={currentTab} index={1}>
          <AppointmentPractitioner
            appointment={currentAppointment}
            onUpdate={handleAppointmentUpdate}
          />
        </TabPanel>

        <TabPanel value={currentTab} index={2}>
          <AppointmentMeetingLink
            appointment={currentAppointment}
            onUpdate={handleAppointmentUpdate}
          />
        </TabPanel>

        <TabPanel value={currentTab} index={3}>
          <AppointmentDocuments
            appointmentId={currentAppointment.id}
            practitionerId={currentAppointment.practitioner_id}
            canUpload={canUpload}
          />
        </TabPanel>

        <TabPanel value={currentTab} index={4}>
          <AppointmentComments
            appointmentId={currentAppointment.id}
            practitionerId={currentAppointment.practitioner_id}
          />
        </TabPanel>
      </DialogContent>
    </Dialog>
  );
};
