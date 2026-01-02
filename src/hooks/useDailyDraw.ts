// Hook personnalisé pour gérer le tirage du jour
import { useState, useEffect } from 'react';
import { supabase, DailyDraw } from '../services/supabase';
import {
  calculateBirthNumber,
  calculatePersonalDayNumber,
  selectBeneficiaryNumbers,
  selectBeneficiaryThreeNumbers,
  generateStorageKey,
  generateBeneficiaryStorageKey,
  cleanOldTirages
} from '../utils/numerology';
import { logger } from '../utils/logger';
import { saveMessageToHistory } from '../services/dailyMessageHistory';

export interface DailyDrawData {
  nombre1: number;
  nombre2: number;
  nombre3?: number;
  message1: DailyDraw | null;
  message2: DailyDraw | null;
  message3?: DailyDraw | null;
  firstName: string;
  cached: boolean;
  label1?: string;
  label2?: string;
  label3?: string;
}

export interface UseDailyDrawVisitorParams {
  firstName: string;
  birthDay: number;
  birthMonth: number;
}

interface UseDailyDrawBeneficiaryParams {
  beneficiaryId: string;
  racine1: number;
  racine2: number;
  tronc: number;
  dynamiqueDeVie: number;
  ecorce: number;
  branche: number;
  feuille: number;
  fruit: number;
  birthDay: number;
  birthMonth: number;
  firstName: string;
}

/**
 * Hook pour gérer le tirage du jour d'un visiteur
 */
export const useDailyDrawVisitor = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drawData, setDrawData] = useState<DailyDrawData | null>(null);

  // Nettoyer les anciens tirages au montage
  useEffect(() => {
    cleanOldTirages();
  }, []);

  const getDailyDraw = async ({ firstName, birthDay, birthMonth }: UseDailyDrawVisitorParams) => {
    setLoading(true);
    setError(null);

    try {
      const today = new Date();
      const storageKey = generateStorageKey(firstName, birthDay, birthMonth, today);

      // Vérifier le cache
      const cached = localStorage.getItem(storageKey);
      if (cached) {
        const cachedData = JSON.parse(cached);
        setDrawData({ ...cachedData, cached: true });
        setLoading(false);
        return cachedData;
      }

      // Calculer les 2 nombres
      // Nombre 1 : Objectif de vie (gématrie jour + mois de naissance)
      const nombre1 = calculateBirthNumber(birthDay, birthMonth);

      // Nombre 2 : Jour personnel (gématrie de jour naissance + mois naissance + date du tirage)
      const nombre2 = calculatePersonalDayNumber(birthDay, birthMonth, today);

      // Récupérer les messages depuis la base de données
      const [message1, message2] = await Promise.all([
        fetchRandomMessage(nombre1),
        fetchRandomMessage(nombre2)
      ]);

      const result: DailyDrawData = {
        nombre1,
        nombre2,
        message1,
        message2,
        firstName,
        cached: false
      };

      // Stocker dans le cache
      localStorage.setItem(storageKey, JSON.stringify(result));

      setDrawData(result);
      return result;

    } catch (err) {
      logger.error('Erreur lors de la récupération du tirage du jour:', err);
      setError('Une erreur est survenue lors de la génération de votre message.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { getDailyDraw, loading, error, drawData };
};

/**
 * Hook pour gérer le tirage du jour d'un bénéficiaire
 */
export const useDailyDrawBeneficiary = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drawData, setDrawData] = useState<DailyDrawData | null>(null);

  // Nettoyer les anciens tirages au montage
  useEffect(() => {
    cleanOldTirages();
  }, []);

  const getDailyDraw = async ({
    beneficiaryId,
    racine1,
    racine2,
    tronc,
    dynamiqueDeVie,
    ecorce,
    branche,
    feuille,
    fruit,
    birthDay,
    birthMonth,
    firstName
  }: UseDailyDrawBeneficiaryParams) => {
    setLoading(true);
    setError(null);

    try {
      const today = new Date();
      const storageKey = generateBeneficiaryStorageKey(beneficiaryId, today);

      // Vérifier le cache
      const cached = localStorage.getItem(storageKey);
      if (cached) {
        const cachedData = JSON.parse(cached);
        setDrawData({ ...cachedData, cached: true });
        setLoading(false);
        return cachedData;
      }

      // Sélectionner 3 nombres avec leurs labels
      const { nombre1, nombre2, nombre3, label1, label2, label3 } = selectBeneficiaryThreeNumbers(
        tronc,
        racine1,
        racine2,
        dynamiqueDeVie,
        ecorce,
        branche,
        feuille,
        fruit,
        birthDay,
        birthMonth,
        beneficiaryId,
        today
      );

      // Récupérer les messages depuis la base de données
      const [message1, message2, message3] = await Promise.all([
        fetchRandomMessage(nombre1),
        fetchRandomMessage(nombre2),
        fetchRandomMessage(nombre3)
      ]);

      // Enregistrer les messages dans l'historique (en parallèle, sans bloquer si erreur)
      Promise.all([
        message1 && saveMessageToHistory({
          beneficiaryId,
          dailyDrawId: message1.id,
          nombre: nombre1,
          origineLabel: label1,
          titre: message1.titre,
          message: message1.message
        }).catch(err => logger.error('[Daily Draw] Erreur sauvegarde message 1:', err)),

        message2 && saveMessageToHistory({
          beneficiaryId,
          dailyDrawId: message2.id,
          nombre: nombre2,
          origineLabel: label2,
          titre: message2.titre,
          message: message2.message
        }).catch(err => logger.error('[Daily Draw] Erreur sauvegarde message 2:', err)),

        message3 && saveMessageToHistory({
          beneficiaryId,
          dailyDrawId: message3.id,
          nombre: nombre3,
          origineLabel: label3,
          titre: message3.titre,
          message: message3.message
        }).catch(err => logger.error('[Daily Draw] Erreur sauvegarde message 3:', err))
      ]).catch(() => {
        // Ignorer les erreurs d'enregistrement - ce n'est pas critique
        logger.warn('[Daily Draw] Certains messages n\'ont pas pu être enregistrés dans l\'historique');
      });

      const result: DailyDrawData = {
        nombre1,
        nombre2,
        nombre3,
        message1,
        message2,
        message3,
        firstName,
        cached: false,
        label1,
        label2,
        label3
      };

      // Stocker dans le cache
      localStorage.setItem(storageKey, JSON.stringify(result));

      setDrawData(result);
      return result;

    } catch (err) {
      logger.error('Erreur lors de la récupération du tirage du jour:', err);
      setError('Une erreur est survenue lors de la génération de votre message.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { getDailyDraw, loading, error, drawData };
};

/**
 * Récupère un message aléatoire pour un nombre donné
 * Uniquement les messages avec source = 'ai_generated'
 */
const fetchRandomMessage = async (nombre: number): Promise<DailyDraw | null> => {
  try {
    // Récupérer tous les messages pour ce nombre en type quotidien avec source ai_generated
    const { data, error } = await supabase
      .from('daily_draws')
      .select('*')
      .eq('type', 'quotidien')
      .eq('nombre', nombre)
      .eq('source', 'ai_generated');

    if (error) throw error;

    if (!data || data.length === 0) {
      logger.warn(`Aucun message AI trouvé pour le nombre ${nombre}`);
      return null;
    }

    // Sélectionner un message aléatoire
    const randomIndex = Math.floor(Math.random() * data.length);
    return data[randomIndex];

  } catch (error) {
    logger.error(`Erreur lors de la récupération du message pour le nombre ${nombre}:`, error);
    return null;
  }
};
