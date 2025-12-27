// Fonctions utilitaires pour la numérologie

/**
 * Réduit un nombre à un chiffre entre 1 et 9
 * Garde les nombres maîtres 11 et 22
 */
export const reduceToSingleDigit = (num: number): number => {
  // Si c'est déjà un nombre maître, on le garde
  if (num === 11 || num === 22) {
    return num;
  }

  // Sinon on réduit
  while (num > 9) {
    num = String(num)
      .split('')
      .reduce((sum, digit) => sum + parseInt(digit), 0);

    // Vérifier si on obtient un nombre maître après réduction
    if (num === 11 || num === 22) {
      return num;
    }
  }

  return num;
};

/**
 * Calcule le nombre basé sur jour + mois de naissance (Objectif de vie)
 * Utilise la gématrie (réduction numérologique)
 */
export const calculateBirthNumber = (day: number, month: number): number => {
  const sum = day + month;
  return reduceToSingleDigit(sum);
};

/**
 * Calcule le nombre du jour personnel
 * Formule: gématrie de (jour naissance + mois naissance + jour tirage + mois tirage + année tirage)
 */
export const calculatePersonalDayNumber = (
  birthDay: number,
  birthMonth: number,
  date: Date
): number => {
  const day = date.getDate();
  const month = date.getMonth() + 1; // getMonth() retourne 0-11
  const year = date.getFullYear();

  // Calculer la somme
  const sum = birthDay + birthMonth + day + month + year;

  // Appliquer la gématrie (réduction numérologique)
  return reduceToSingleDigit(sum);
};

/**
 * Génère un nombre "aléatoire" stable pour une journée
 * Basé sur une clé unique + date du jour
 * @deprecated Utiliser calculatePersonalDayNumber pour les visiteurs
 */
export const generateDailyNumber = (uniqueKey: string, date: Date): number => {
  // Créer un seed basé sur la clé + date
  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
  const combinedStr = uniqueKey + dateStr;

  // Hash simple (non cryptographique, juste pour la stabilité)
  let hash = 0;
  for (let i = 0; i < combinedStr.length; i++) {
    const char = combinedStr.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  // Convertir en nombre entre 1 et 9
  const validNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22];
  const index = Math.abs(hash) % validNumbers.length;

  return validNumbers[index];
};

/**
 * Sélectionne 2 nombres parmi les 4 nombres d'un bénéficiaire
 * Stable pour une journée donnée
 */
export const selectBeneficiaryNumbers = (
  racine1: number,
  racine2: number,
  tronc: number,
  dynamiqueDeVie: number,
  beneficiaryId: string,
  date: Date
): { nombre1: number; nombre2: number } => {
  const nombresDisponibles = [racine1, racine2, tronc, dynamiqueDeVie];

  // Créer un seed basé sur l'ID + date
  const dateStr = date.toISOString().split('T')[0];
  const seed = parseInt(dateStr.replace(/-/g, '')) + parseInt(beneficiaryId.replace(/\D/g, '').slice(0, 8) || '0');

  // Sélectionner le premier nombre
  const index1 = seed % 4;
  const nombre1 = nombresDisponibles[index1];

  // Sélectionner le deuxième nombre parmi les 3 restants
  const autresNombres = nombresDisponibles.filter((_, i) => i !== index1);
  const index2 = (seed + 1) % 3;
  const nombre2 = autresNombres[index2];

  return { nombre1, nombre2 };
};

/**
 * Génère une clé unique pour le localStorage
 */
export const generateStorageKey = (
  firstName: string,
  day: number,
  month: number,
  date: Date
): string => {
  const dateStr = date.toISOString().split('T')[0];
  const normalizedName = firstName.toLowerCase().trim();
  return `tirage_${normalizedName}_${day}_${month}_${dateStr}`;
};

/**
 * Génère une clé unique pour un bénéficiaire
 */
export const generateBeneficiaryStorageKey = (
  beneficiaryId: string,
  date: Date
): string => {
  const dateStr = date.toISOString().split('T')[0];
  return `tirage_beneficiary_${beneficiaryId}_${dateStr}`;
};

/**
 * Sélectionne 3 nombres pour un bénéficiaire
 * - Nombre 1 : Sélection aléatoire parmi {Tronc, Racine1, Racine2, Dynamique de vie}
 * - Nombre 2 : Jour personnel (calculé avec la date de naissance + date du tirage)
 * - Nombre 3 : Sélection aléatoire parmi {Écorce, Branche, Feuille, Fruit}
 * Stable pour une journée donnée
 */
export const selectBeneficiaryThreeNumbers = (
  tronc: number,
  racine1: number,
  racine2: number,
  dynamiqueDeVie: number,
  ecorce: number,
  branche: number,
  feuille: number,
  fruit: number,
  birthDay: number,
  birthMonth: number,
  beneficiaryId: string,
  date: Date
): {
  nombre1: number;
  nombre2: number;
  nombre3: number;
  label1: string;
  label2: string;
  label3: string;
} => {
  // Créer un seed basé sur l'ID + date pour une sélection stable par jour
  const dateStr = date.toISOString().split('T')[0];
  const seed = parseInt(dateStr.replace(/-/g, '')) + parseInt(beneficiaryId.replace(/\D/g, '').slice(0, 8) || '0');

  // Premier groupe : Triangle fondamental
  const premierGroupe = [
    { nombre: tronc, label: '🎯 Tronc (Objectif de vie)' },
    { nombre: racine1, label: '🛤️ Racine 1 (Chemin de vie)' },
    { nombre: racine2, label: '💬 Racine 2 (Expression)' },
    { nombre: dynamiqueDeVie, label: '⚡ Dynamique de vie' }
  ];

  // Sélection du premier nombre
  const index1 = seed % 4;
  const selection1 = premierGroupe[index1];

  // Deuxième nombre : Jour personnel
  const nombre2 = calculatePersonalDayNumber(birthDay, birthMonth, date);

  // Troisième groupe : Arbre numérologique
  const troisiemeGroupe = [
    { nombre: ecorce, label: '👁️ Écorce (Façon d\'être perçu)' },
    { nombre: branche, label: '⚖️ Branche (Action/décision)' },
    { nombre: feuille, label: '❤️ Feuille (Besoins affectifs)' },
    { nombre: fruit, label: '🏆 Fruit (Besoins de réalisation)' }
  ];

  // Sélection du troisième nombre (utiliser un seed différent)
  const index3 = (seed + 7) % 4;
  const selection3 = troisiemeGroupe[index3];

  return {
    nombre1: selection1.nombre,
    nombre2,
    nombre3: selection3.nombre,
    label1: selection1.label,
    label2: '📅 Jour personnel',
    label3: selection3.label
  };
};

/**
 * Nettoie les anciens tirages du localStorage (> 7 jours)
 */
export const cleanOldTirages = (): void => {
  const today = new Date();
  const keys = Object.keys(localStorage);

  keys.forEach(key => {
    if (key.startsWith('tirage_')) {
      try {
        // Extraire la date de la clé
        const parts = key.split('_');
        const dateStr = parts[parts.length - 1]; // Dernière partie
        const tirageDate = new Date(dateStr);

        // Calculer la différence en jours
        const diffTime = today.getTime() - tirageDate.getTime();
        const diffDays = diffTime / (1000 * 60 * 60 * 24);

        // Supprimer si > 7 jours
        if (diffDays > 7) {
          localStorage.removeItem(key);
        }
      } catch (error) {
        // Si erreur de parsing, on supprime la clé invalide
        localStorage.removeItem(key);
      }
    }
  });
};
