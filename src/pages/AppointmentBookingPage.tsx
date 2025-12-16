// src/pages/AppointmentBookingPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Container,
  Typography,
  Box,
  Paper,
  Stepper,
  Step,
  StepLabel,
  Button,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Alert,
  CircularProgress,
  useTheme,
  useMediaQuery,
  TextField,
  Checkbox,
  FormControlLabel,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AddIcon from '@mui/icons-material/Add';
import {
  getServices,
  getPractitioners,
  getAvailableWeeks,
  getAvailableAppointmentsByWeek,
  bookAppointment,
  checkServiceAvailability
} from '../services/supabase-appointments';
import { createAppointmentCheckout, redirectToCheckout } from '../services/stripe';
import { BeneficiarySelector } from '../components/beneficiaries/BeneficiarySelector';
import { BeneficiaryForm } from '../components/beneficiaries/BeneficiaryForm';
import { BeneficiaryWithAccess, CreateBeneficiaryData, UpdateBeneficiaryData } from '../types/beneficiary';
import {
  getUserBeneficiaries,
  createBeneficiary,
  addBeneficiaryToAppointment,
  checkDuplicateBeneficiary
} from '../services/beneficiaries';
import SacredGeometryBackground from '../components/SacredGeometryBackground';
import { Service, Practitioner, Appointment } from '../services/supabase';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import WeeklyCalendar from '../components/appointments/WeeklyCalendar'; // Importer le nouveau composant

// Type des paramètres d'URL
interface LocationState {
  preSelectedServiceId?: string;
  preSelectedCategory?: string;
}

// Types locaux pour les créneaux et les semaines
interface WeekInfo {
  weekStart: string;
  weekEnd: string;
  displayRange: string;
}

interface AppointmentSlot {
  id: string;
  start_time: string;
  end_time: string;
  custom_price?: number;
  service: Service;
  practitioner: {
    id: string;
    bio: string;
    profile: {
      id: string;
      first_name: string;
      last_name: string;
    };
    display_name?: string;
    title?: string;
  };
}

// Étapes du processus de réservation
const steps = ['Choix du service', 'Sélection du créneau', 'Confirmation et paiement'];

const AppointmentBookingPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();
  const state = location.state as LocationState || {};
  const [searchParams] = useSearchParams();

  // État actif
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Mode intervenant dédié
  const [isDedicatedMode, setIsDedicatedMode] = useState(false);
  const [dedicatedPractitioner, setDedicatedPractitioner] = useState<Practitioner | null>(null);
  const [practitionerNotFound, setPractitionerNotFound] = useState(false);

  // Données des étapes
  const [serviceCategories, setServiceCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>(state.preSelectedCategory || '');
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [serviceAvailability, setServiceAvailability] = useState<Map<string, boolean>>(new Map());

  const [availableWeeks, setAvailableWeeks] = useState<WeekInfo[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<WeekInfo | null>(null);
  const [practitioners, setPractitioners] = useState<Practitioner[]>([]);
  const [selectedPractitioner, setSelectedPractitioner] = useState<string>('all');
  const [appointmentSlots, setAppointmentSlots] = useState<AppointmentSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AppointmentSlot | null>(null);
  
  // Données du formulaire de confirmation
  const [selectedBeneficiaryIds, setSelectedBeneficiaryIds] = useState<string[]>([]);
  const [userBeneficiaries, setUserBeneficiaries] = useState<BeneficiaryWithAccess[]>([]);
  const [showBeneficiaryDialog, setShowBeneficiaryDialog] = useState(false);
  const [notes, setNotes] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);

  // Gestion de la confirmation de doublon
  const [duplicateConfirmationOpen, setDuplicateConfirmationOpen] = useState(false);
  const [pendingBeneficiaryData, setPendingBeneficiaryData] = useState<CreateBeneficiaryData | null>(null);
  const [existingBeneficiaries, setExistingBeneficiaries] = useState<any[]>([]);

  // Vérifier si un intervenant est spécifié dans l'URL
  useEffect(() => {
    const consultantParam = searchParams.get('consultant');
    if (consultantParam) {
      // Mode dédié activé
      setIsDedicatedMode(true);
      loadDedicatedPractitioner(consultantParam);
    }
  }, [searchParams]);

  // Charger l'intervenant dédié (par slug ou UUID)
  const loadDedicatedPractitioner = async (consultantIdOrSlug: string) => {
    try {
      const { data: allPractitioners } = await getPractitioners();
      if (!allPractitioners) {
        setPractitionerNotFound(true);
        return;
      }

      // Vérifier si c'est un UUID ou un slug
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(consultantIdOrSlug);

      let practitioner: Practitioner | undefined;
      if (isUUID) {
        practitioner = allPractitioners.find(p => p.id === consultantIdOrSlug);
      } else {
        // Rechercher par slug
        practitioner = allPractitioners.find(p => (p as any).slug === consultantIdOrSlug);
      }

      if (practitioner) {
        setDedicatedPractitioner(practitioner);
        setSelectedPractitioner(practitioner.id);
        setPractitionerNotFound(false);
      } else {
        setPractitionerNotFound(true);
      }
    } catch (err) {
      console.error('Erreur lors du chargement de l\'intervenant dédié:', err);
      setPractitionerNotFound(true);
    }
  };

  // Charger les disponibilités des services pour l'intervenant dédié
  const loadServiceAvailabilities = async (servicesList: Service[], practitionerId: string) => {
    const availabilityMap = new Map<string, boolean>();

    // Vérifier la disponibilité pour chaque service
    await Promise.all(
      servicesList.map(async (service) => {
        const hasAvailability = await checkServiceAvailability(service.id, practitionerId);
        availabilityMap.set(service.id, hasAvailability);
      })
    );

    setServiceAvailability(availabilityMap);
  };

  // Charger les catégories et services initiaux
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        // Charger les services
        const { data: servicesData, error: servicesError } = await getServices();

        if (servicesError) throw servicesError;

        if (servicesData) {
          setServices(servicesData);

          // Extraire les catégories uniques
          const categories = [...new Set(servicesData.map(service => service.category))];
          setServiceCategories(categories);

          // Si une catégorie est présélectionnée, la définir
          if (state.preSelectedCategory && categories.includes(state.preSelectedCategory)) {
            setSelectedCategory(state.preSelectedCategory);
          } else if (categories.length > 0) {
            setSelectedCategory(categories[0]);
          }

          // Si en mode dédié et qu'on a un intervenant, charger les disponibilités
          if (isDedicatedMode && dedicatedPractitioner) {
            await loadServiceAvailabilities(servicesData, dedicatedPractitioner.id);
          }

          // Si un service est présélectionné, le définir
          if (state.preSelectedServiceId) {
            const preSelectedService = servicesData.find(s => s.id === state.preSelectedServiceId);
            if (preSelectedService) {
              setSelectedService(preSelectedService);
              // Si le service est présélectionné, passer automatiquement à l'étape 2
              setActiveStep(1);
              // Charger les données de l'étape 2
              loadWeeksData(preSelectedService.id);
            }
          }
        }
      } catch (err) {
        console.error('Erreur lors du chargement des services:', err);
        setError('Impossible de charger les services. Veuillez réessayer.');
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [state.preSelectedServiceId, state.preSelectedCategory, isDedicatedMode, dedicatedPractitioner]);
  
  // Chargement des données de la semaine quand un service est sélectionné
  const loadWeeksData = async (serviceId: string) => {
    setLoading(true);
    try {
      const { data: weeksData } = await getAvailableWeeks(serviceId);
      setAvailableWeeks(weeksData || []);

      if (weeksData && weeksData.length > 0) {
        setSelectedWeek(weeksData[0]);
        // Charger les créneaux pour la première semaine en tenant compte de l'intervenant sélectionné
        await loadSlotsForWeek(
          serviceId,
          weeksData[0].weekStart,
          selectedPractitioner === 'all' ? undefined : selectedPractitioner
        );
      }

      // Charger la liste des praticiens
      const { data: practitionersData } = await getPractitioners();
      if (practitionersData) {
        setPractitioners(practitionersData);
      }
    } catch (err) {
      console.error('Erreur lors du chargement des semaines disponibles:', err);
      setError('Impossible de charger les disponibilités. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };
  
  // Chargement des créneaux pour une semaine donnée
  const loadSlotsForWeek = async (serviceId: string, weekDate: string, practitionerId?: string) => {
    setLoading(true);
    setAppointmentSlots([]);
    
    try {
      const { data: slots, error: slotsError } = await getAvailableAppointmentsByWeek(
        weekDate,
        serviceId,
        practitionerId === 'all' ? undefined : practitionerId
      );
      
      if (slotsError) throw slotsError;
      
      if (slots) {
        setAppointmentSlots(slots as unknown as AppointmentSlot[]);
      }
    } catch (err) {
      console.error('Erreur lors du chargement des créneaux:', err);
      setError('Impossible de charger les créneaux disponibles. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };
  
  // Gestion des changements d'étape
  const handleNext = () => {
    if (activeStep === 0 && selectedService) {
      // Charger les données pour l'étape 2
      loadWeeksData(selectedService.id);
    }
    
    if (activeStep === 1 && !selectedSlot) {
      setError('Veuillez sélectionner un créneau avant de continuer.');
      return;
    }
    
    if (activeStep === 2) {
      handleBookAppointment();
      return;
    }
    
    setActiveStep((prevStep) => prevStep + 1);
    setError(null);
  };
  
  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
    setError(null);
  };
  
  // Réserver le rendez-vous
  // Fonction pour calculer l'âge d'un bénéficiaire
  const calculateAge = (birthDate: string): number => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  // Fonction pour valider l'âge des bénéficiaires selon le module
  const validateBeneficiariesAge = (): { valid: boolean; error?: string } => {
    if (!selectedService) return { valid: true };

    const subcategory = selectedService.subcategory?.toLowerCase();

    for (const beneficiaryId of selectedBeneficiaryIds) {
      const beneficiary = userBeneficiaries.find(b => b.id === beneficiaryId);
      if (!beneficiary) continue;

      const age = calculateAge(beneficiary.birth_date);

      // Seul le module "enfants" autorise les mineurs
      if (subcategory === 'enfants') {
        if (age >= 18) {
          return {
            valid: false,
            error: `Le module Enfants est réservé aux bénéficiaires mineurs. ${beneficiary.first_name} ${beneficiary.last_name} est majeur (${age} ans).`
          };
        }
      } else {
        // Tous les autres modules nécessitent des bénéficiaires majeurs
        if (age < 18) {
          return {
            valid: false,
            error: `Ce module nécessite des bénéficiaires majeurs. ${beneficiary.first_name} ${beneficiary.last_name} est mineur (${age} ans). Veuillez utiliser le module Enfants.`
          };
        }
      }
    }

    return { valid: true };
  };

  const handleBookAppointment = async () => {
    if (!user || !selectedSlot) {
      setError('Vous devez être connecté et avoir sélectionné un créneau pour réserver.');
      return;
    }

    if (!acceptTerms) {
      setError('Vous devez accepter les conditions générales pour continuer.');
      return;
    }

    // Validation du nombre de bénéficiaires selon le service
    const minBeneficiaries = selectedService?.min_beneficiaries || 1;
    const maxBeneficiaries = selectedService?.max_beneficiaries || 1;

    if (selectedBeneficiaryIds.length < minBeneficiaries) {
      setError(`Ce service nécessite au moins ${minBeneficiaries} bénéficiaire${minBeneficiaries > 1 ? 's' : ''}.`);
      return;
    }

    if (selectedBeneficiaryIds.length > maxBeneficiaries) {
      setError(`Ce service autorise au maximum ${maxBeneficiaries} bénéficiaire${maxBeneficiaries > 1 ? 's' : ''}.`);
      return;
    }

    // Validation de l'âge des bénéficiaires selon le module
    const ageValidation = validateBeneficiariesAge();
    if (!ageValidation.valid) {
      setError(ageValidation.error || 'Erreur de validation de l\'âge des bénéficiaires.');
      return;
    }

    // Validation du contexte pour les services "sur consultation"
    const price = selectedSlot.custom_price ?? selectedService?.price ?? 0;
    if (price === 9999 && notes.trim() === '') {
      setError('Veuillez décrire le contexte de votre demande pour les services sur consultation.');
      return;
    }

    setLoading(true);
    try {
      // Calculer si un paiement est nécessaire
      const price = selectedSlot.custom_price ?? selectedService?.price ?? 0;
      const paymentRequired = price > 0 && price !== 9999; // Paiement requis sauf si gratuit (0) ou sur consultation (9999)

      // Préparer les données additionnelles
      const additionalData: Partial<Appointment> = {
        notes: notes.trim() || undefined,
        payment_required: paymentRequired
      };

      // Appeler l'API pour réserver
      const { success: bookingSuccess, data: appointmentData, error: bookingError } = await bookAppointment(
        selectedSlot.id,
        user.id,
        additionalData
      );

      if (bookingError) throw bookingError;

      if (bookingSuccess && appointmentData) {
        // Lier les bénéficiaires au rendez-vous
        for (let i = 0; i < selectedBeneficiaryIds.length; i++) {
          const beneficiaryId = selectedBeneficiaryIds[i];
          try {
            await addBeneficiaryToAppointment(
              appointmentData.id,
              beneficiaryId,
              selectedBeneficiaryIds.length > 1 ? 'partner' : 'primary',
              i + 1,
              true
            );
          } catch (linkError) {
            console.error('Erreur lors de la liaison du bénéficiaire:', linkError);
            // Ne pas bloquer si la liaison échoue, juste logger
          }
        }

        // Vérifier si un paiement est nécessaire
        const price = selectedSlot.custom_price ?? selectedService?.price ?? 0;

        // Si le prix est 9999 (sur consultation), envoyer une demande d'information
        if (price === 9999) {
          // Envoyer l'email de demande de consultation
          const serviceName = selectedService?.name || 'Rendez-vous';
          const practitionerName = selectedSlot.practitioner.display_name ||
            `${selectedSlot.practitioner.profile.first_name} ${selectedSlot.practitioner.profile.last_name}`;

          const consultationResponse = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-consultation-request`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
              },
              body: JSON.stringify({
                appointmentId: appointmentData.id,
                clientEmail: user.email || profile?.email,
                clientName: profile?.first_name && profile?.last_name
                  ? `${profile.first_name} ${profile.last_name}`
                  : user.email,
                serviceName,
                practitionerName,
                startTime: selectedSlot.start_time,
                context: notes || 'Aucune information supplémentaire fournie'
              })
            }
          );

          if (!consultationResponse.ok) {
            throw new Error('Erreur lors de l\'envoi de la demande de consultation');
          }

          setSuccess(true);
          // Rediriger vers la page des rendez-vous après 3 secondes
          setTimeout(() => {
            navigate('/mes-rendez-vous');
          }, 3000);
        } else if (price === 0) {
          // Si le prix est 0 (gratuit), pas de paiement nécessaire
          setSuccess(true);
          setTimeout(() => {
            navigate('/mes-rendez-vous');
          }, 3000);
        } else {
          // Créer une session de paiement Stripe et rediriger
          const serviceName = selectedService?.name || 'Rendez-vous';
          const practitionerName = selectedSlot.practitioner.display_name ||
            `${selectedSlot.practitioner.profile.first_name} ${selectedSlot.practitioner.profile.last_name}`;

          // Vérifier que l'utilisateur est bien connecté
          if (!user?.id) {
            throw new Error('Utilisateur non connecté');
          }

          console.log('[PAYMENT] Création du paiement pour:', {
            appointmentId: appointmentData.id,
            price,
            practitionerId: selectedSlot.practitioner.id,
            clientId: user.id,
            description: `${serviceName} avec ${practitionerName}`
          });

          const session = await createAppointmentCheckout(
            appointmentData.id,
            price,
            selectedSlot.practitioner.id,
            user.id,
            `${serviceName} avec ${practitionerName}`
          );

          console.log('[PAYMENT] Session Stripe reçue:', {
            sessionId: session.sessionId,
            checkoutUrl: session.url
          });

          console.log('[PAYMENT] Redirection vers Stripe Checkout...');
          // Rediriger vers Stripe Checkout
          await redirectToCheckout(session.url);
        }
      }
    } catch (err) {
      console.error('Erreur lors de la réservation:', err);
      setError('La réservation a échoué. Veuillez réessayer.');
      setLoading(false);
    }
  };
  
  // Gestion des sélections
  const handleCategoryChange = (e: any) => {
    const category = e.target.value as string;
    setSelectedCategory(category);
    setSelectedService(null);
  };

  // Fonction pour mapper le subcategory du service vers le nom de module attendu par la page contact
  const getModuleName = (service: Service): string => {
    const subcategory = service.subcategory?.toLowerCase();

    // Mapping des subcategories vers les noms de modules
    const moduleMapping: { [key: string]: string } = {
      'adultes': 'Module Adultes',
      'couples': 'Module Couples',
      'enfants': 'Module Enfants',
      'suivi_annuel': 'Module Suivi Annuel',
      'suivi annuel': 'Module Suivi Annuel',
      'coequipiers': 'Module Coéquipiers',
      'coéquipiers': 'Module Coéquipiers',
      'equipe': 'Module Équipe',
      'équipe': 'Module Équipe',
      'candidats': 'Module Candidats',
      'associes': 'Module Associés',
      'associés': 'Module Associés',
      'strategies': 'Module Stratégies',
      'stratégies': 'Module Stratégies',
      'solo': 'Module Solo',
      'team': 'Module Team'
    };

    // Si le subcategory correspond à un mapping, l'utiliser
    if (subcategory && moduleMapping[subcategory]) {
      return moduleMapping[subcategory];
    }

    // Sinon, si le nom du service commence déjà par "Module", l'utiliser tel quel
    if (service.name.startsWith('Module ')) {
      return service.name;
    }

    // Sinon, ajouter "Module " devant le nom du service
    return `Module ${service.name}`;
  };

  const handleServiceSelect = (service: Service) => {
    // Si le service est "nous consulter" (prix 9999), rediriger vers la page de contact
    if (service.price === 9999) {
      const params = new URLSearchParams({
        subject: 'Informations sur une prestation',
        module: getModuleName(service)
      });
      navigate(`/contact?${params.toString()}`);
      return;
    }

    setSelectedService(service);
  };
  
  const handleWeekChange = (week: WeekInfo) => {
    setSelectedWeek(week);
    if (selectedService) {
      loadSlotsForWeek(
        selectedService.id,
        week.weekStart,
        selectedPractitioner === 'all' ? undefined : selectedPractitioner
      );
    }
  };
  
  const handlePractitionerChange = (e: any) => {
    const practitionerId = e.target.value as string;
    setSelectedPractitioner(practitionerId);

    if (selectedService && selectedWeek) {
      loadSlotsForWeek(
        selectedService.id,
        selectedWeek.weekStart,
        practitionerId === 'all' ? undefined : practitionerId
      );
    }
  };
  
  const handleSlotSelect = (slot: AppointmentSlot) => {
    setSelectedSlot(slot);
  };

  // Gestion de la création d'un nouveau bénéficiaire
  const handleCreateBeneficiary = async (data: CreateBeneficiaryData | UpdateBeneficiaryData) => {
    try {
      setLoading(true);
      const beneficiaryData = data as CreateBeneficiaryData;

      // Vérifier si un bénéficiaire existe déjà avec la même date de naissance
      if (beneficiaryData.birth_date) {
        const { exists, beneficiaries } = await checkDuplicateBeneficiary(beneficiaryData.birth_date);

        if (exists && beneficiaries.length > 0) {
          // Afficher la confirmation de doublon
          setPendingBeneficiaryData(beneficiaryData);
          setExistingBeneficiaries(beneficiaries);
          setDuplicateConfirmationOpen(true);
          setLoading(false);
          return; // Attendre la confirmation de l'utilisateur
        }
      }

      // Pas de doublon ou pas de date de naissance, créer directement
      await confirmCreateBeneficiary(beneficiaryData);
    } catch (err: any) {
      console.error('Erreur lors de la création du bénéficiaire:', err);
      setError(err.message || 'Erreur lors de la création du bénéficiaire');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Créer le bénéficiaire après confirmation (ou directement si pas de doublon)
  const confirmCreateBeneficiary = async (beneficiaryData: CreateBeneficiaryData) => {
    try {
      setLoading(true);
      const { data: newBeneficiary, error: createError } = await createBeneficiary(beneficiaryData);

      if (createError) throw createError;

      if (newBeneficiary) {
        // Rafraîchir la liste des bénéficiaires
        const { data: updatedBeneficiaries } = await getUserBeneficiaries();
        setUserBeneficiaries(updatedBeneficiaries || []);

        // Ajouter automatiquement le nouveau bénéficiaire à la sélection (en respectant le max)
        const maxBeneficiaries = selectedService?.max_beneficiaries || 1;
        if (selectedBeneficiaryIds.length < maxBeneficiaries) {
          setSelectedBeneficiaryIds([...selectedBeneficiaryIds, newBeneficiary.id]);
        } else {
          // Si on a atteint le max, remplacer le dernier
          setSelectedBeneficiaryIds([...selectedBeneficiaryIds.slice(0, -1), newBeneficiary.id]);
        }

        // Fermer les dialogs
        setShowBeneficiaryDialog(false);
        setDuplicateConfirmationOpen(false);
        setPendingBeneficiaryData(null);
      }
    } catch (err: any) {
      console.error('Erreur lors de la création du bénéficiaire:', err);
      setError(err.message || 'Erreur lors de la création du bénéficiaire');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Annuler la création après détection de doublon
  const handleCancelDuplicate = () => {
    setDuplicateConfirmationOpen(false);
    setPendingBeneficiaryData(null);
    setExistingBeneficiaries([]);
  };
  
  // Si l'utilisateur n'est pas connecté, le rediriger vers la page de connexion
  useEffect(() => {
    if (!user && !loading) {
      navigate('/login', { state: { from: '/prendre-rendez-vous' } });
    }
  }, [user, loading, navigate]);

  // Charger les bénéficiaires de l'utilisateur
  useEffect(() => {
    const loadUserBeneficiaries = async () => {
      if (!user) return;

      try {
        const { data } = await getUserBeneficiaries();
        setUserBeneficiaries(data || []);
      } catch (err) {
        console.error('Erreur lors du chargement des bénéficiaires:', err);
      }
    };

    loadUserBeneficiaries();
  }, [user]);
  
  // Rendu des étapes
  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return renderServiceSelection();
      case 1:
        return renderSlotSelection();
      case 2:
        return renderConfirmation();
      default:
        return null;
    }
  };
  
  // Fonction pour obtenir les couleurs selon la catégorie
  const getCategoryColors = (category: string) => {
    switch (category) {
      case 'particuliers':
        return {
          primary: '#FFD700',
          secondary: '#FFA500',
          border: 'rgba(255, 215, 0, 0.3)',
          borderSelected: '#FFA500',
          shadow: 'rgba(255, 215, 0, 0.25)',
        };
      case 'professionnels':
        return {
          primary: '#4169E1',
          secondary: '#6495ED',
          border: 'rgba(100, 149, 237, 0.3)',
          borderSelected: '#6495ED',
          shadow: 'rgba(100, 149, 237, 0.25)',
        };
      case 'sportifs':
        return {
          primary: '#11998e',
          secondary: '#38ef7d',
          border: 'rgba(17, 153, 142, 0.3)',
          borderSelected: '#38ef7d',
          shadow: 'rgba(17, 153, 142, 0.25)',
        };
      default:
        return {
          primary: '#FFD700',
          secondary: '#FFA500',
          border: 'rgba(255, 215, 0, 0.3)',
          borderSelected: '#FFA500',
          shadow: 'rgba(255, 215, 0, 0.25)',
        };
    }
  };

  // Étape 1: Sélection du service
  const renderServiceSelection = () => {
    const filteredServices = selectedCategory
      ? services.filter(service => service.category === selectedCategory)
      : services;

    const colors = getCategoryColors(selectedCategory);

    return (
      <Box sx={{ mb: 4 }}>
        {/* Alerte si l'intervenant n'existe pas */}
        {practitionerNotFound && (
          <Alert severity="error" sx={{ mb: 2 }}>
            L'intervenant demandé n'a pas été trouvé. Vous pouvez choisir un autre intervenant dans la liste des disponibilités.
          </Alert>
        )}

        {/* Alerte si l'intervenant n'a pas de modules disponibles */}
        {isDedicatedMode && dedicatedPractitioner && !practitionerNotFound && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <strong>Réservation pour {dedicatedPractitioner.display_name ||
              `${dedicatedPractitioner.profile?.first_name} ${dedicatedPractitioner.profile?.last_name}`}</strong>
            <br />
            Sélectionnez un service ci-dessous. Seuls les créneaux disponibles pour cet intervenant seront affichés.
          </Alert>
        )}

        {serviceCategories.length > 0 && (
          <FormControl fullWidth margin="normal">
            <InputLabel id="category-select-label">Catégorie</InputLabel>
            <Select
              labelId="category-select-label"
              value={selectedCategory}
              onChange={handleCategoryChange}
              label="Catégorie"
              sx={{
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: selectedCategory ? getCategoryColors(selectedCategory).borderSelected : undefined,
                  borderWidth: selectedCategory ? '2px' : '1px',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: selectedCategory ? getCategoryColors(selectedCategory).primary : undefined,
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: selectedCategory ? getCategoryColors(selectedCategory).primary : undefined,
                },
              }}
            >
              {serviceCategories.map((category) => {
                const categoryColors = getCategoryColors(category);
                return (
                  <MenuItem
                    key={category}
                    value={category}
                    sx={{
                      borderLeft: `4px solid ${categoryColors.primary}`,
                      paddingLeft: 2,
                      '&:hover': {
                        backgroundColor: `${categoryColors.border}`,
                      },
                      '&.Mui-selected': {
                        backgroundColor: `${categoryColors.border}`,
                        '&:hover': {
                          backgroundColor: `${categoryColors.shadow}`,
                        },
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          background: `linear-gradient(135deg, ${categoryColors.primary}, ${categoryColors.secondary})`,
                        }}
                      />
                      {category === 'particuliers'
                        ? 'Particuliers'
                        : category === 'professionnels'
                        ? 'Professionnels'
                        : category === 'sportifs'
                        ? 'Sportifs'
                        : category}
                    </Box>
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>
        )}

        <Grid container spacing={3} sx={{ mt: 2 }}>
          {filteredServices.map((service) => (
            <Grid item xs={12} md={6} key={service.id}>
              <Card
                elevation={0}
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  background: 'white',
                  border: selectedService?.id === service.id
                    ? `2px solid ${colors.borderSelected}`
                    : `2px solid ${colors.border}`,
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
                    background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary})`,
                  },
                  '&:hover': {
                    borderColor: colors.borderSelected,
                    boxShadow: `0 12px 40px ${colors.shadow}`,
                    transform: 'translateY(-8px)',
                  },
                }}
              >
                <CardActionArea
                  onClick={() => handleServiceSelect(service)}
                  sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}
                >
                  <CardContent sx={{ width: '100%', p: 3 }}>
                    <Typography variant="h6" component="div" sx={{ fontWeight: 600, color: '#1a1a2e', mb: 1 }}>
                      {service.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.7 }}>
                      {service.description}
                    </Typography>

                    {/* Badge de disponibilité en mode dédié */}
                    {isDedicatedMode && dedicatedPractitioner && serviceAvailability.has(service.id) && (
                      <Box sx={{ mb: 2 }}>
                        {serviceAvailability.get(service.id) ? (
                          <Box
                            sx={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 0.5,
                              px: 1.5,
                              py: 0.5,
                              borderRadius: 2,
                              backgroundColor: 'rgba(76, 175, 80, 0.1)',
                              border: '1px solid rgba(76, 175, 80, 0.3)',
                            }}
                          >
                            <Box
                              sx={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                backgroundColor: '#4caf50',
                              }}
                            />
                            <Typography variant="caption" sx={{ color: '#2e7d32', fontWeight: 500 }}>
                              Créneaux disponibles
                            </Typography>
                          </Box>
                        ) : (
                          <Box
                            sx={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 0.5,
                              px: 1.5,
                              py: 0.5,
                              borderRadius: 2,
                              backgroundColor: 'rgba(255, 152, 0, 0.1)',
                              border: '1px solid rgba(255, 152, 0, 0.3)',
                            }}
                          >
                            <Box
                              sx={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                backgroundColor: '#ff9800',
                              }}
                            />
                            <Typography variant="caption" sx={{ color: '#e65100', fontWeight: 500 }}>
                              Pas de créneaux disponibles pour le moment
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    )}

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 'auto', pt: 2 }}>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        Durée: {service.duration} min
                      </Typography>
                      <Typography variant="body1" fontWeight="bold" sx={{ color: colors.secondary }}>
                        {service.price === 0 ? 'Gratuit' : service.price === 9999 ? 'Nous consulter' : `${service.price} €`}
                      </Typography>
                    </Box>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  };
  
  // Étape 2: Sélection du créneau (NOUVELLE VERSION AVEC CALENDRIER)
  const renderSlotSelection = () => {
    if (!selectedService) {
      return (
        <Alert severity="warning">
          Veuillez d'abord sélectionner un service
        </Alert>
      );
    }

    // Filtrer les services de la même catégorie que le service sélectionné
    const servicesInCategory = services.filter(s => s.category === selectedService.category);

    return (
      <Box sx={{ mb: 2 }}>
        {/* Filtres en ligne compacte */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          {/* Filtre par service */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth size="small">
              <InputLabel id="service-filter-label">Module</InputLabel>
              <Select
                labelId="service-filter-label"
                value={selectedService.id}
                onChange={(e) => {
                  const newService = services.find(s => s.id === e.target.value);
                  if (newService) {
                    setSelectedService(newService);
                    loadWeeksData(newService.id);
                  }
                }}
                label="Module"
              >
                {servicesInCategory.map((service) => (
                  <MenuItem key={service.id} value={service.id}>
                    {service.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Filtre par praticien */}
          {selectedWeek && practitioners.length > 0 && (
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel id="practitioner-select-label">Intervenant</InputLabel>
                <Select
                  labelId="practitioner-select-label"
                  value={selectedPractitioner}
                  onChange={handlePractitionerChange}
                  label="Intervenant"
                  disabled={isDedicatedMode}
                >
                  <MenuItem value="all">Tous les intervenants</MenuItem>
                  {practitioners.map((practitioner) => {
                    const name = practitioner.display_name ||
                      `${practitioner.profile?.first_name || ''} ${practitioner.profile?.last_name || ''}`.trim();
                    const title = practitioner.title;
                    const displayText = title ? `${name} - ${title}` : name;

                    return (
                      <MenuItem key={practitioner.id} value={practitioner.id}>
                        {displayText}
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>
              {isDedicatedMode && dedicatedPractitioner && (
                <Typography variant="caption" color="primary" sx={{ mt: 0.5, display: 'block' }}>
                  Rendez-vous réservé pour {dedicatedPractitioner.display_name ||
                    `${dedicatedPractitioner.profile?.first_name} ${dedicatedPractitioner.profile?.last_name}`}
                </Typography>
              )}
            </Grid>
          )}
        </Grid>

        {/* Nouveau composant de calendrier */}
        {availableWeeks.length > 0 ? (
          <WeeklyCalendar
            availableWeeks={availableWeeks}
            selectedWeek={selectedWeek}
            onWeekChange={handleWeekChange}
            appointmentSlots={appointmentSlots}
            selectedSlot={selectedSlot}
            onSlotSelect={handleSlotSelect as any}
            loading={loading}
            category={selectedCategory}
          />
        ) : (
          <Alert severity={isDedicatedMode ? "warning" : "info"}>
            {isDedicatedMode && dedicatedPractitioner
              ? `Aucune disponibilité trouvée pour ${dedicatedPractitioner.display_name ||
                  `${dedicatedPractitioner.profile?.first_name} ${dedicatedPractitioner.profile?.last_name}`} avec ce service. Cet intervenant n'a peut-être pas configuré de créneaux pour ce module.`
              : "Aucune disponibilité trouvée pour ce service."}
          </Alert>
        )}
      </Box>
    );
  };
  
  // Fonction helper pour vérifier si le nombre de bénéficiaires est valide
  const isBeneficiariesCountValid = () => {
    if (!selectedService) return false;
    const minBeneficiaries = selectedService.min_beneficiaries || 1;
    const maxBeneficiaries = selectedService.max_beneficiaries || 1;
    const count = selectedBeneficiaryIds.length;
    return count >= minBeneficiaries && count <= maxBeneficiaries;
  };

  // Fonction pour obtenir le message d'erreur des bénéficiaires
  const getBeneficiariesErrorMessage = () => {
    if (!selectedService) return null;
    const minBeneficiaries = selectedService.min_beneficiaries || 1;
    const maxBeneficiaries = selectedService.max_beneficiaries || 1;
    const count = selectedBeneficiaryIds.length;

    if (count < minBeneficiaries) {
      return `Vous devez sélectionner au moins ${minBeneficiaries} bénéficiaire${minBeneficiaries > 1 ? 's' : ''}.`;
    }
    if (count > maxBeneficiaries) {
      return `Vous ne pouvez pas sélectionner plus de ${maxBeneficiaries} bénéficiaire${maxBeneficiaries > 1 ? 's' : ''}.`;
    }
    return null;
  };

  // Étape 3: Confirmation et paiement
  const renderConfirmation = () => {
    if (!selectedService || !selectedSlot) {
      return (
        <Alert severity="warning">
          Veuillez d'abord sélectionner un service et un créneau
        </Alert>
      );
    }

    // Formatage des dates
    const appointmentDate = parseISO(selectedSlot.start_time);
    const formattedDate = format(appointmentDate, 'EEEE d MMMM yyyy', { locale: fr });
    const startTime = format(appointmentDate, 'HH:mm', { locale: fr });
    const endTime = format(parseISO(selectedSlot.end_time), 'HH:mm', { locale: fr });

    const colors = getCategoryColors(selectedCategory);
    const beneficiariesError = getBeneficiariesErrorMessage();

    return (
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h6"
          gutterBottom
          sx={{
            fontWeight: 600,
            color: '#1a1a2e',
            borderLeft: `4px solid ${colors.secondary}`,
            pl: 2,
            mb: 3
          }}
        >
          Confirmation de votre rendez-vous
        </Typography>

        {/* Récapitulatif du rendez-vous */}
        <Paper
          variant="outlined"
          sx={{
            p: 3,
            mb: 4,
            border: `2px solid ${colors.border}`,
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
              background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary})`,
            },
          }}
        >
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" fontWeight="bold">
                Service:
              </Typography>
              <Typography variant="body1" gutterBottom>
                {selectedService.name} ({selectedService.duration} min)
              </Typography>
              

              
              <Typography variant="subtitle1" fontWeight="bold">
                Intervenant:
              </Typography>
              <Typography variant="body1" gutterBottom>
                {selectedSlot.practitioner.display_name || 
                 `${selectedSlot.practitioner.profile.first_name} ${selectedSlot.practitioner.profile.last_name}`}
                {selectedSlot.practitioner.title && ` (${selectedSlot.practitioner.title})`}
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={6}>
                            <Typography variant="subtitle1" fontWeight="bold">
                Date et heure:
              </Typography>
              <Typography variant="body1" gutterBottom sx={{ textTransform: 'capitalize' }}>
                {formattedDate}, de {startTime}  à {endTime}
              </Typography>
              <Typography variant="subtitle1" fontWeight="bold">
                Prix:
              </Typography>
              <Typography
                variant="h5"
                gutterBottom
                sx={{
                  fontWeight: 700,
                  background: `linear-gradient(45deg, ${colors.primary}, ${colors.secondary})`,
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {(() => {
                  const price = selectedSlot.custom_price ?? selectedService.price;
                  if (price === 0) return 'Gratuit pour découverte';
                  return price === 9999 ? 'Nous consulter' : `${price} €`;
                })()}
              </Typography>


            </Grid>
          </Grid>
        </Paper>
        
        {/* Formulaire pour les informations complémentaires */}
        <Typography
          variant="h6"
          gutterBottom
          sx={{
            fontWeight: 600,
            color: '#1a1a2e',
            borderLeft: `4px solid ${colors.secondary}`,
            pl: 2,
            mb: 3
          }}
        >
          Informations complémentaires
        </Typography>
        
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
              Bénéficiaire(s) du rendez-vous *
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setShowBeneficiaryDialog(true)}
              sx={{
                background: 'linear-gradient(45deg, #345995, #1D3461)',
                color: 'white',
                textTransform: 'none',
                fontWeight: 600,
                px: 2,
                py: 1,
                borderRadius: 2,
                boxShadow: '0 4px 12px rgba(52, 89, 149, 0.3)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #1D3461, #345995)',
                  boxShadow: '0 6px 16px rgba(52, 89, 149, 0.4)',
                  transform: 'translateY(-2px)',
                },
                transition: 'all 0.3s ease',
              }}
            >
              Créer un bénéficiaire
            </Button>
          </Box>
          {selectedService && (
            <Alert severity="info" sx={{ mb: 2 }}>
              {selectedService.min_beneficiaries === selectedService.max_beneficiaries ? (
                `Ce service nécessite exactement ${selectedService.min_beneficiaries} bénéficiaire${selectedService.min_beneficiaries > 1 ? 's' : ''}.`
              ) : (
                `Ce service nécessite entre ${selectedService.min_beneficiaries} et ${selectedService.max_beneficiaries} bénéficiaires.`
              )}
            </Alert>
          )}
          <BeneficiarySelector
            value={selectedBeneficiaryIds}
            onChange={setSelectedBeneficiaryIds}
            beneficiaries={userBeneficiaries}
            maxBeneficiaries={selectedService?.max_beneficiaries || 1}
            allowCreate={true}
            onCreateNew={() => setShowBeneficiaryDialog(true)}
          />
          {beneficiariesError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {beneficiariesError}
            </Alert>
          )}
          {!beneficiariesError && selectedBeneficiaryIds.length > 0 && (
            <Alert severity="success" sx={{ mt: 2 }}>
              ✓ Nombre de bénéficiaires valide ({selectedBeneficiaryIds.length} sélectionné{selectedBeneficiaryIds.length > 1 ? 's' : ''})
            </Alert>
          )}
        </Box>

        {/* Afficher une alerte spéciale pour les services "sur consultation" */}
        {(() => {
          const price = selectedSlot.custom_price ?? selectedService.price;
          if (price === 9999) {
            return (
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                  Service sur consultation
                </Typography>
                <Typography variant="body2">
                  Ce service nécessite une consultation préalable pour établir un devis personnalisé.
                  Veuillez décrire ci-dessous votre situation et vos besoins afin que nous puissions vous proposer un tarif adapté.
                </Typography>
              </Alert>
            );
          }
          return null;
        })()}

        <TextField
          label={(() => {
            const price = selectedSlot.custom_price ?? selectedService.price;
            return price === 9999
              ? "Contexte de votre demande (obligatoire pour les services sur consultation) *"
              : "Notes ou informations supplémentaires";
          })()}
          multiline
          rows={4}
          fullWidth
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          sx={{ mb: 3 }}
          required={(() => {
            const price = selectedSlot.custom_price ?? selectedService.price;
            return price === 9999;
          })()}
          error={(() => {
            const price = selectedSlot.custom_price ?? selectedService.price;
            return price === 9999 && notes.trim() === '';
          })()}
          helperText={(() => {
            const price = selectedSlot.custom_price ?? selectedService.price;
            if (price === 9999 && notes.trim() === '') {
              return "Veuillez expliquer le contexte de votre demande pour que nous puissions vous proposer un tarif adapté.";
            }
            return "";
          })()}
        />
        
        <Box
          sx={{
            p: 2,
            border: `2px solid ${colors.border}`,
            borderRadius: 2,
            backgroundColor: `${colors.primary}08`,
          }}
        >
          <FormControlLabel
            control={
              <Checkbox
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                sx={{
                  color: colors.secondary,
                  '&.Mui-checked': {
                    color: colors.secondary,
                  },
                }}
              />
            }
            label={
              <Typography variant="body1">
                J'accepte les conditions générales d'utilisation <Typography component="span" color="error">*</Typography>
              </Typography>
            }
          />
        </Box>
        
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mt: 2 }}>
            Votre rendez-vous a été réservé avec succès! Vous allez être redirigé vers vos rendez-vous.
          </Alert>
        )}
      </Box>
    );
  };
  
  // Si en cours de chargement, afficher un spinner
  if (loading && activeStep === 0) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 8 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }
  
  return (
    <Box sx={{ width: '100%', position: 'relative', minHeight: '100vh' }}>
      {/* Image de fond - prendre rdv */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 0,
          backgroundImage: 'url(/images/PrendreRDV.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          opacity: 0.7,
          pointerEvents: 'none',
        }}
      />
      {/* Overlay pour adoucir l'image */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 0,
          background: 'linear-gradient(180deg, rgba(248, 249, 250, 0.3) 0%, rgba(233, 236, 239, 0.35) 50%, rgba(222, 226, 230, 0.4) 100%)',
          pointerEvents: 'none',
        }}
      />
      <Box
        sx={{
          background: 'rgba(245, 247, 250, 0.6)',
          backdropFilter: 'blur(2px)',
          py: 4,
          mt: { xs: '23px', md: '10px' },
          position: 'relative',
          zIndex: 1,
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
              }}
            >
              <SacredGeometryBackground theme="particuliers" />
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
                  Réservation de rendez-vous
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
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2, md: 4 },
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
            {/* Stepper */}
            <Stepper activeStep={activeStep} sx={{ mb: 4, mt: 2, display: { xs: 'none', md: 'flex' } }}>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>

            {/* Version mobile du stepper */}
            <Box sx={{ mb: 3, mt: 2, display: { xs: 'block', md: 'none' } }}>
              <Typography variant="h6" align="center" sx={{ fontWeight: 600, color: '#1a1a2e' }}>
                Étape {activeStep + 1}: {steps[activeStep]}
              </Typography>
            </Box>

            {/* Afficher les erreurs globales */}
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            {/* Contenu de l'étape active */}
            {renderStepContent()}

            {/* Boutons de navigation */}
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column-reverse', sm: 'row' },
                justifyContent: 'space-between',
                gap: { xs: 2, sm: 0 },
                mt: 4
              }}
            >
              <Button
                variant="outlined"
                onClick={handleBack}
                startIcon={<ArrowBackIcon />}
                disabled={activeStep === 0 || loading || success}
                fullWidth={false}
                sx={{
                  borderColor: 'rgba(255, 215, 0, 0.5)',
                  color: '#FFA500',
                  minWidth: { xs: '100%', sm: 'auto' },
                  '&:hover': {
                    borderColor: '#FFA500',
                    backgroundColor: 'rgba(255, 215, 0, 0.1)',
                  },
                }}
              >
                Retour
              </Button>

              <Button
                variant="contained"
                onClick={handleNext}
                endIcon={activeStep === steps.length - 1 ? <CheckCircleIcon /> : <ArrowForwardIcon />}
                disabled={
                  (activeStep === 0 && !selectedService) ||
                  (activeStep === 1 && !selectedSlot) ||
                  (activeStep === 2 && (!acceptTerms || !isBeneficiariesCountValid())) ||
                  loading ||
                  success
                }
                sx={{
                  px: { xs: 2, sm: 4 },
                  py: 1.5,
                  minWidth: { xs: '100%', sm: 'auto' },
                  background: 'linear-gradient(45deg, #FFD700, #FFA500)',
                  color: '#1a1a2e',
                  fontWeight: 600,
                  borderRadius: 50,
                  boxShadow: '0 8px 25px rgba(255, 215, 0, 0.3)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #FFA500, #FFD700)',
                    transform: 'translateY(-3px)',
                    boxShadow: '0 12px 35px rgba(255, 215, 0, 0.4)',
                  },
                  '&:disabled': {
                    background: 'rgba(0, 0, 0, 0.12)',
                    color: 'rgba(0, 0, 0, 0.26)',
                    boxShadow: 'none',
                  },
                }}
              >
                {activeStep === steps.length - 1 ? 'Confirmer' : 'Suivant'}
              </Button>
            </Box>
          </Paper>
          </Container>
        </Box>
        </Container>

        {/* Dialog pour créer un nouveau bénéficiaire */}
        <Dialog
          open={showBeneficiaryDialog}
          onClose={() => setShowBeneficiaryDialog(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogContent>
            <Typography variant="h6" sx={{ mb: 3 }}>
              Créer un nouveau bénéficiaire
            </Typography>
            <BeneficiaryForm
              onSave={handleCreateBeneficiary}
              onCancel={() => setShowBeneficiaryDialog(false)}
              loading={loading}
            />
          </DialogContent>
        </Dialog>

        {/* Dialog de confirmation de doublon */}
        <Dialog
          open={duplicateConfirmationOpen}
          onClose={handleCancelDuplicate}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ pb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h6" component="span">
                ⚠️ Bénéficiaire similaire détecté
              </Typography>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Alert severity="warning" sx={{ mb: 2 }}>
              Un ou plusieurs bénéficiaires existent déjà avec la même date de naissance pour votre compte.
            </Alert>

            {existingBeneficiaries.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                  Bénéficiaire(s) existant(s) :
                </Typography>
                {existingBeneficiaries.map((ben, index) => (
                  <Paper
                    key={index}
                    elevation={0}
                    sx={{
                      p: 2,
                      mb: 1,
                      border: '1px solid',
                      borderColor: 'warning.light',
                      backgroundColor: 'warning.lighter',
                    }}
                  >
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {ben.first_name} {ben.last_name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Date de naissance : {format(parseISO(ben.birth_date), 'dd/MM/yyyy', { locale: fr })}
                    </Typography>
                    {ben.email && (
                      <Typography variant="body2" color="text.secondary">
                        Email : {ben.email}
                      </Typography>
                    )}
                  </Paper>
                ))}
              </Box>
            )}

            {pendingBeneficiaryData && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                  Nouveau bénéficiaire à créer :
                </Typography>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    border: '1px solid',
                    borderColor: 'primary.light',
                    backgroundColor: 'primary.lighter',
                  }}
                >
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {pendingBeneficiaryData.first_name} {pendingBeneficiaryData.last_name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Date de naissance : {format(parseISO(pendingBeneficiaryData.birth_date), 'dd/MM/yyyy', { locale: fr })}
                  </Typography>
                  {pendingBeneficiaryData.email && (
                    <Typography variant="body2" color="text.secondary">
                      Email : {pendingBeneficiaryData.email}
                    </Typography>
                  )}
                </Paper>
              </Box>
            )}

            <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
              Voulez-vous quand même créer ce nouveau bénéficiaire ?
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={handleCancelDuplicate}
              variant="outlined"
              color="inherit"
            >
              Annuler
            </Button>
            <Button
              onClick={() => pendingBeneficiaryData && confirmCreateBeneficiary(pendingBeneficiaryData)}
              variant="contained"
              color="primary"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : null}
            >
              Oui, créer quand même
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
};

export default AppointmentBookingPage;