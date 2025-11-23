// Service de numérologie
// Calcul des nombres numérologiques selon les règles françaises

/**
 * Table de correspondance lettre -> valeur numérique
 * A=1, B=2, C=3... Z=26 (réduit ensuite)
 */
const LETTER_VALUES: Record<string, number> = {
  'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 6, 'G': 7, 'H': 8, 'I': 9,
  'J': 1, 'K': 2, 'L': 3, 'M': 4, 'N': 5, 'O': 6, 'P': 7, 'Q': 8, 'R': 9,
  'S': 1, 'T': 2, 'U': 3, 'V': 4, 'W': 5, 'X': 6, 'Y': 7, 'Z': 8,
  // Lettres accentuées
  'À': 1, 'Á': 1, 'Â': 1, 'Ã': 1, 'Ä': 1, 'Å': 1,
  'È': 5, 'É': 5, 'Ê': 5, 'Ë': 5,
  'Ì': 9, 'Í': 9, 'Î': 9, 'Ï': 9,
  'Ò': 6, 'Ó': 6, 'Ô': 6, 'Õ': 6, 'Ö': 6,
  'Ù': 3, 'Ú': 3, 'Û': 3, 'Ü': 3,
  'Ý': 7, 'Ÿ': 7,
  'Ç': 3, 'Ñ': 5,
  'Æ': 6, 'Œ': 6
};

/**
 * Nombres maîtres qui ne doivent pas être réduits
 */
const MASTER_NUMBERS = [11, 22, 33];

/**
 * Liste des voyelles (incluant Y)
 */
const VOWELS = ['A', 'E', 'I', 'O', 'U', 'Y', 'À', 'Á', 'Â', 'Ã', 'Ä', 'Å', 'È', 'É', 'Ê', 'Ë', 'Ì', 'Í', 'Î', 'Ï', 'Ò', 'Ó', 'Ô', 'Õ', 'Ö', 'Ù', 'Ú', 'Û', 'Ü', 'Ý', 'Ÿ'];

/**
 * Lettres de valeur 1 : A, J, S
 */
const VALUE_ONE_LETTERS = ['A', 'J', 'S', 'À', 'Á', 'Â', 'Ã', 'Ä', 'Å'];

/**
 * Réduit un nombre en additionnant ses chiffres
 * Préserve les nombres maîtres (11, 22, 33)
 * Explore toutes les combinaisons pour détecter les nombres maîtres
 */
export function reduceNumber(num: number): number {
  // Si c'est déjà un nombre entre 1 et 9, on retourne
  if (num >= 1 && num <= 9) {
    return num;
  }

  // Si c'est un nombre maître, on le garde
  if (MASTER_NUMBERS.includes(num)) {
    return num;
  }

  // Convertir en chaîne pour additionner les chiffres
  const digits = num.toString().split('').map(d => parseInt(d, 10));
  const sum = digits.reduce((acc, digit) => acc + digit, 0);

  // Si la somme est un nombre maître, on le garde
  if (MASTER_NUMBERS.includes(sum)) {
    return sum;
  }

  // Si la somme est encore > 9, on continue la réduction récursivement
  if (sum > 9) {
    return reduceNumber(sum);
  }

  return sum;
}

/**
 * Réduit une somme en explorant toutes les combinaisons possibles
 * pour détecter les nombres maîtres (11, 22, 33)
 */
export function reduceWithMasterCheck(components: number[]): number {
  // Si un composant est déjà un nombre maître, on le note
  const masterComponents = components.filter(c => MASTER_NUMBERS.includes(c));

  // Réduire chaque composant individuellement
  const reducedComponents = components.map(c => reduceNumber(c));

  // Additionner tous les composants réduits
  let total = reducedComponents.reduce((acc, val) => acc + val, 0);

  // Réduire le total en préservant les nombres maîtres
  return reduceNumber(total);
}

/**
 * Calcule la valeur numérologique d'une chaîne de caractères
 * (utilisé pour les noms et prénoms)
 */
export function calculateNameValue(name: string): number {
  if (!name || name.trim() === '') {
    return 0;
  }

  // Nettoyer et normaliser le nom (supprimer espaces multiples, tirets, etc.)
  const cleanName = name
    .toUpperCase()
    .trim()
    .replace(/[^A-ZÀÁÂÃÄÅÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜÝŸÇÑÆŒ]/g, '');

  // Calculer la somme des valeurs des lettres
  let sum = 0;
  for (const char of cleanName) {
    const value = LETTER_VALUES[char];
    if (value !== undefined) {
      sum += value;
    }
  }

  // Réduire la somme en préservant les nombres maîtres
  return reduceNumber(sum);
}

/**
 * Calcule la racine1 (Chemin de vie)
 * À partir de la date de naissance complète : jour + mois + année
 */
export function calculateRacine1(birthDate: string): number {
  if (!birthDate) {
    return 0;
  }

  try {
    const date = new Date(birthDate);
    if (isNaN(date.getTime())) {
      return 0;
    }

    const day = date.getDate();
    const month = date.getMonth() + 1; // Les mois commencent à 0
    const year = date.getFullYear();

    // Réduire chaque composante
    const reducedDay = reduceNumber(day);
    const reducedMonth = reduceNumber(month);
    const reducedYear = reduceNumber(year);

    // Additionner et réduire le total
    return reduceWithMasterCheck([reducedDay, reducedMonth, reducedYear]);
  } catch (error) {
    console.error('Erreur lors du calcul de racine1:', error);
    return 0;
  }
}

/**
 * Calcule la racine2 (Expression)
 * À partir de tous les noms et prénoms (incluant les prénoms intermédiaires)
 */
export function calculateRacine2(
  firstName: string,
  lastName: string,
  middleNames?: string
): number {
  const firstNameValue = calculateNameValue(firstName);
  const lastNameValue = calculateNameValue(lastName);
  const middleNamesValue = middleNames ? calculateNameValue(middleNames) : 0;

  // Additionner les valeurs et réduire
  return reduceWithMasterCheck([firstNameValue, middleNamesValue, lastNameValue]);
}

/**
 * Calcule le tronc (Objectif de vie)
 * À partir du jour + mois de naissance (sans l'année)
 */
export function calculateTronc(birthDate: string): number {
  if (!birthDate) {
    return 0;
  }

  try {
    const date = new Date(birthDate);
    if (isNaN(date.getTime())) {
      return 0;
    }

    const day = date.getDate();
    const month = date.getMonth() + 1;

    // Réduire chaque composante
    const reducedDay = reduceNumber(day);
    const reducedMonth = reduceNumber(month);

    // Additionner et réduire le total
    return reduceWithMasterCheck([reducedDay, reducedMonth]);
  } catch (error) {
    console.error('Erreur lors du calcul du tronc:', error);
    return 0;
  }
}

/**
 * Calcule la dynamique de vie
 * = Tronc + Racine1 + Racine2
 */
export function calculateDynamiqueDeVie(
  tronc: number,
  racine1: number,
  racine2: number
): number {
  return reduceWithMasterCheck([tronc, racine1, racine2]);
}

/**
 * Calcule l'écorce (jour de naissance)
 * Réduit si > 9 (sauf nombres maîtres)
 */
export function calculateEcorce(birthDate: string): number {
  if (!birthDate) {
    return 0;
  }

  try {
    const date = new Date(birthDate);
    if (isNaN(date.getTime())) {
      return 0;
    }

    const day = date.getDate();
    return reduceNumber(day);
  } catch (error) {
    console.error('Erreur lors du calcul de l\'écorce:', error);
    return 0;
  }
}

/**
 * Calcule la branche (nombre de lettres de valeur 1 : A, J, S)
 * Dans tous les prénoms + nom
 */
export function calculateBranche(
  firstName: string,
  lastName: string,
  middleNames?: string
): number {
  const fullName = `${firstName}${middleNames || ''}${lastName}`;

  const cleanName = fullName
    .toUpperCase()
    .trim()
    .replace(/[^A-ZÀÁÂÃÄÅÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜÝŸÇÑÆŒ]/g, '');

  let count = 0;
  for (const char of cleanName) {
    if (VALUE_ONE_LETTERS.includes(char)) {
      count++;
    }
  }

  return reduceNumber(count);
}

/**
 * Calcule la feuille (somme de toutes les voyelles)
 * Dans tous les prénoms + nom
 */
export function calculateFeuille(
  firstName: string,
  lastName: string,
  middleNames?: string
): number {
  const fullName = `${firstName}${middleNames || ''}${lastName}`;

  const cleanName = fullName
    .toUpperCase()
    .trim()
    .replace(/[^A-ZÀÁÂÃÄÅÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜÝŸÇÑÆŒ]/g, '');

  let sum = 0;
  for (const char of cleanName) {
    if (VOWELS.includes(char)) {
      const value = LETTER_VALUES[char];
      if (value !== undefined) {
        sum += value;
      }
    }
  }

  return reduceNumber(sum);
}

/**
 * Calcule le fruit (somme de toutes les consonnes)
 * Dans tous les prénoms + nom
 */
export function calculateFruits(
  firstName: string,
  lastName: string,
  middleNames?: string
): number {
  const fullName = `${firstName}${middleNames || ''}${lastName}`;

  const cleanName = fullName
    .toUpperCase()
    .trim()
    .replace(/[^A-ZÀÁÂÃÄÅÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜÝŸÇÑÆŒ]/g, '');

  let sum = 0;
  for (const char of cleanName) {
    if (!VOWELS.includes(char)) {
      const value = LETTER_VALUES[char];
      if (value !== undefined) {
        sum += value;
      }
    }
  }

  return reduceNumber(sum);
}

/**
 * Calcule toutes les valeurs numérologiques pour un profil
 */
export interface NumerologyResult {
  racine1: number;        // Chemin de vie
  racine2: number;        // Expression
  tronc: number;          // Objectif de vie
  dynamique_de_vie: number;
  ecorce: number;
  branche: number;
  feuille: number;
  fruits: number;
}

export function calculateAllNumerology(
  firstName: string,
  lastName: string,
  birthDate: string,
  middleNames?: string
): NumerologyResult {
  const racine1 = calculateRacine1(birthDate);
  const racine2 = calculateRacine2(firstName, lastName, middleNames);
  const tronc = calculateTronc(birthDate);

  return {
    racine1,
    racine2,
    tronc,
    dynamique_de_vie: calculateDynamiqueDeVie(tronc, racine1, racine2),
    ecorce: calculateEcorce(birthDate),
    branche: calculateBranche(firstName, lastName, middleNames),
    feuille: calculateFeuille(firstName, lastName, middleNames),
    fruits: calculateFruits(firstName, lastName, middleNames),
  };
}

/**
 * Fonction utilitaire pour afficher les détails de calcul (debug)
 */
export function explainCalculation(
  firstName: string,
  lastName: string,
  birthDate: string,
  middleNames?: string
): string {
  const date = new Date(birthDate);
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();

  const result: string[] = [];

  result.push(`=== CALCULS NUMÉROLOGIQUES ===\n`);
  result.push(`Prénom: ${firstName}`);
  if (middleNames) {
    result.push(`Prénoms intermédiaires: ${middleNames}`);
  }
  result.push(`Nom: ${lastName}`);
  result.push(`Date de naissance: ${day}/${month}/${year}\n`);

  // Racine1 (Chemin de vie)
  const reducedDay = reduceNumber(day);
  const reducedMonth = reduceNumber(month);
  const reducedYear = reduceNumber(year);
  const racine1 = reduceWithMasterCheck([reducedDay, reducedMonth, reducedYear]);

  result.push(`RACINE1 (Chemin de vie) :`);
  result.push(`  Jour: ${day} → ${reducedDay}`);
  result.push(`  Mois: ${month} → ${reducedMonth}`);
  result.push(`  Année: ${year} → ${reducedYear}`);
  result.push(`  Total: ${reducedDay} + ${reducedMonth} + ${reducedYear} = ${racine1}\n`);

  // Racine2 (Expression)
  const firstNameValue = calculateNameValue(firstName);
  const lastNameValue = calculateNameValue(lastName);
  const middleNamesValue = middleNames ? calculateNameValue(middleNames) : 0;
  const racine2 = reduceWithMasterCheck([firstNameValue, middleNamesValue, lastNameValue]);

  result.push(`RACINE2 (Expression) :`);
  result.push(`  Prénom: ${firstName} → ${firstNameValue}`);
  if (middleNames) {
    result.push(`  Prénoms intermédiaires: ${middleNames} → ${middleNamesValue}`);
  }
  result.push(`  Nom: ${lastName} → ${lastNameValue}`);
  if (middleNames) {
    result.push(`  Total: ${firstNameValue} + ${middleNamesValue} + ${lastNameValue} = ${racine2}\n`);
  } else {
    result.push(`  Total: ${firstNameValue} + ${lastNameValue} = ${racine2}\n`);
  }

  // Tronc (Objectif de vie)
  const tronc = reduceWithMasterCheck([reducedDay, reducedMonth]);

  result.push(`TRONC (Objectif de vie) :`);
  result.push(`  Jour: ${day} → ${reducedDay}`);
  result.push(`  Mois: ${month} → ${reducedMonth}`);
  result.push(`  Total: ${reducedDay} + ${reducedMonth} = ${tronc}`);

  return result.join('\n');
}
