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
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            Détails du rendez-vous
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {/* Informations du RDV */}
        <Box mb={3} sx={{
          p: 2,
          bgcolor: 'grey.50',
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider'
        }}>
          <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start' }}>
            {/* Colonne de gauche : Infos du RDV */}
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Service
              </Typography>
              <Typography variant="body1" fontWeight={600} gutterBottom>
                {currentAppointment.service?.name}
              </Typography>

              <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>
                Date et heure
              </Typography>
              <Typography variant="body1" gutterBottom>
                {format(parseISO(currentAppointment.start_time), 'EEEE d MMMM yyyy - HH:mm', { locale: fr })}
              </Typography>

              {currentAppointment.practitioner && (
                <>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>
                    Intervenant
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {currentAppointment.practitioner.profile?.pseudo ||
                     `${currentAppointment.practitioner.profile?.first_name} ${currentAppointment.practitioner.profile?.last_name}`}
                  </Typography>
                </>
              )}

              {currentAppointment.service && (
                <>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <PaymentIcon fontSize="small" />
                      Prix de la séance
                    </Box>
                  </Typography>
                  <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 700 }}>
                    {(() => {
                      const price = currentAppointment.custom_price ?? currentAppointment.service.price;
                      return price === 9999 ? 'Sur devis' : `${price} €`;
                    })()}
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
              minWidth: '280px',
              p: 2.5,
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
                  mb: 2
                }}
              >
                <PersonIcon fontSize="small" />
                Bénéficiaire
              </Typography>

              <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', mb: 2 }}>
                {currentAppointment.beneficiary_first_name || currentAppointment.client?.first_name}{' '}
                {currentAppointment.beneficiary_last_name || currentAppointment.client?.last_name}
              </Typography>

              {(currentAppointment.beneficiary_birth_date || currentAppointment.client?.birth_date) && (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    p: 1.5,
                    bgcolor: 'grey.50',
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'grey.300'
                  }}
                >
                  <CakeIcon sx={{ color: 'primary.main', fontSize: 24 }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Date de naissance
                    </Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {format(
                        parseISO(currentAppointment.beneficiary_birth_date || currentAppointment.client!.birth_date!),
                        'dd/MM/yyyy'
                      )}
                    </Typography>
                  </Box>
                </Box>
              )}
            </Box>
          </Box>
        </Box>

        {/* Tabs pour Bénéficiaire, Intervenant, Visio, Documents et Commentaires */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={currentTab} onChange={handleTabChange}>
            <Tab label="Bénéficiaire" />
            {profile?.user_type === 'admin' && <Tab label="Intervenant" />}
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

        {profile?.user_type === 'admin' && (
          <TabPanel value={currentTab} index={1}>
            <AppointmentPractitioner
              appointment={currentAppointment}
              onUpdate={handleAppointmentUpdate}
            />
          </TabPanel>
        )}

        <TabPanel value={currentTab} index={profile?.user_type === 'admin' ? 2 : 1}>
          <AppointmentMeetingLink
            appointment={currentAppointment}
            onUpdate={handleAppointmentUpdate}
          />
        </TabPanel>

        <TabPanel value={currentTab} index={profile?.user_type === 'admin' ? 3 : 2}>
          <AppointmentDocuments
            appointmentId={currentAppointment.id}
            practitionerId={currentAppointment.practitioner_id}
            canUpload={canUpload}
          />
        </TabPanel>

        <TabPanel value={currentTab} index={profile?.user_type === 'admin' ? 4 : 3}>
          <AppointmentComments
            appointmentId={currentAppointment.id}
            practitionerId={currentAppointment.practitioner_id}
          />
        </TabPanel>
      </DialogContent>
    </Dialog>
  );
};
