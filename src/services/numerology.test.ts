// Script de test pour le service de numérologie
import {
  reduceNumber,
  calculateNameValue,
  calculateRacine1,
  calculateRacine2,
  calculateTronc,
  explainCalculation
} from './numerology';

// Fonction pour afficher un test
function test(description: string, result: any, expected?: any) {
  console.log(`\n📝 ${description}`);
  console.log(`   Résultat: ${result}`);
  if (expected !== undefined) {
    const passed = result === expected;
    console.log(`   Attendu: ${expected} ${passed ? '✅' : '❌'}`);
  }
}

console.log('='.repeat(60));
console.log('TESTS DU SERVICE DE NUMÉROLOGIE');
console.log('='.repeat(60));

// Test 1: Réduction simple
test('Réduction de 15', reduceNumber(15), 6);
test('Réduction de 23', reduceNumber(23), 5);
test('Réduction de 99', reduceNumber(99), 9);

// Test 2: Nombres maîtres
test('Nombre maître 11', reduceNumber(11), 11);
test('Nombre maître 22', reduceNumber(22), 22);
test('Nombre maître 33', reduceNumber(33), 33);
test('29 devrait donner 11 (2+9)', reduceNumber(29), 11);

// Test 3: Valeur des noms
test('Valeur de "JEAN"', calculateNameValue('JEAN'));
test('Valeur de "MARTIN"', calculateNameValue('MARTIN'));
test('Valeur de "FRANÇOIS"', calculateNameValue('FRANÇOIS'));
test('Valeur de "ÉLÉONORE"', calculateNameValue('ÉLÉONORE'));

// Test 4: Dates de naissance
console.log('\n' + '='.repeat(60));
console.log('EXEMPLES DE CALCULS COMPLETS');
console.log('='.repeat(60));

// Exemple 1
console.log(explainCalculation('Jean', 'Martin', '1985-03-15'));

// Exemple 2
console.log('\n' + '-'.repeat(60));
console.log(explainCalculation('Marie', 'Dupont', '1992-11-29'));

// Exemple 3
console.log('\n' + '-'.repeat(60));
console.log(explainCalculation('François', 'Bernard', '1978-02-22'));

// Exemple 4 - Avec accents
console.log('\n' + '-'.repeat(60));
console.log(explainCalculation('Éléonore', 'Château', '1988-12-11'));

console.log('\n' + '='.repeat(60));
console.log('FIN DES TESTS');
console.log('='.repeat(60));
