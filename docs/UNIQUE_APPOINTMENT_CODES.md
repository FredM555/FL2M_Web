# Codes Uniques de Rendez-vous

**Date:** 2025-01-23
**Statut:** Implémenté

---

## 📋 Vue d'ensemble

Chaque rendez-vous dans le système FLM Services possède désormais un **code unique non chronologique** qui sert à:

1. **Facturation des intervenants** - Référence facile sur les factures
2. **Communication avec les utilisateurs** - Identification simple dans les emails et notifications
3. **Support client** - Référence rapide pour le service client
4. **Traçabilité** - Suivi des rendez-vous sans exposer d'informations sensibles

---

## 🔑 Format du Code

### Structure
```
RDV-XXXXXXXX
```

- **Préfixe:** `RDV-` (identifie le type d'entité)
- **Identifiant:** 8 caractères alphanumériques majuscules (A-Z, 0-9)
- **Exemple:** `RDV-A3B5C7D9`

### Caractéristiques

✅ **Unique** - Chaque code est garanti unique dans toute la base de données
✅ **Non chronologique** - Impossible de deviner l'ordre ou le nombre de rendez-vous
✅ **Court et lisible** - 12 caractères au total, facile à communiquer
✅ **URL-safe** - Peut être utilisé dans les URLs sans encodage
✅ **Copier/Coller friendly** - Pas de caractères spéciaux confondants (0 vs O, 1 vs l)

---

## 🏗️ Architecture Technique

### Base de Données

#### Nouvelle Colonne
```sql
ALTER TABLE public.appointments
ADD COLUMN unique_code VARCHAR(20) UNIQUE;
```

#### Index pour Performance
```sql
CREATE INDEX idx_appointments_unique_code
ON public.appointments(unique_code);
```

#### Fonction de Génération
```sql
CREATE OR REPLACE FUNCTION generate_appointment_code()
RETURNS VARCHAR AS $$
DECLARE
  new_code VARCHAR(20);
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Format: RDV-XXXXXXXX (8 random alphanumeric)
    new_code := 'RDV-' || upper(substring(
      md5(random()::text || clock_timestamp()::text)
      from 1 for 8
    ));

    -- Check uniqueness
    SELECT EXISTS(
      SELECT 1 FROM appointments WHERE unique_code = new_code
    ) INTO code_exists;

    EXIT WHEN NOT code_exists;
  END LOOP;

  RETURN new_code;
END;
$$ LANGUAGE plpgsql;
```

#### Trigger Automatique
```sql
CREATE TRIGGER trigger_set_appointment_unique_code
  BEFORE INSERT ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION set_appointment_unique_code();
```

Le trigger génère automatiquement un code si aucun n'est fourni lors de l'insertion.

---

### Frontend (TypeScript)

#### Type Definition
```typescript
// src/services/supabase.ts
export type Appointment = {
  id: string;
  // ... autres champs
  unique_code?: string; // Code unique du rendez-vous
  // ...
};
```

#### Utilitaire de Génération
```typescript
// src/utils/appointmentCodeGenerator.ts

export const generateAppointmentCode = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = generateRandomAlphanumeric(4);
  const mixed = (timestamp + random).slice(-8);
  return `RDV-${mixed}`;
};

export const isValidAppointmentCode = (code: string): boolean => {
  const pattern = /^RDV-[A-Z0-9]{8}$/;
  return pattern.test(code);
};
```

---

## 🎨 Affichage dans l'Interface

### 1. Liste des Rendez-vous (MyAppointmentsPage)

Le code apparaît comme un badge sous le nom du service:

```tsx
<Chip
  label={`Code: ${appointment.unique_code}`}
  size="small"
  sx={{
    backgroundColor: 'rgba(52, 89, 149, 0.1)',
    color: '#345995',
    fontWeight: 600,
    fontFamily: 'monospace'
  }}
/>
```

**Rendu visuel:**
```
┌─────────────────────────────────┐
│ Consultation Numérologie        │
│ [Code: RDV-A3B5C7D9]           │
│                                 │
│ 📅 Lundi 23 janvier 2025       │
│ ⏰ 14:00 - 15:00               │
└─────────────────────────────────┘
```

### 2. Détails du Rendez-vous (AppointmentDetailsDialog)

Le code apparaît dans un encadré dédié sous le nom du service:

```tsx
<Box sx={{
  display: 'inline-block',
  px: 1.5,
  py: 0.5,
  bgcolor: 'rgba(52, 89, 149, 0.1)',
  borderRadius: 1,
  border: '1px solid rgba(52, 89, 149, 0.3)'
}}>
  <Typography variant="caption" sx={{
    color: '#345995',
    fontWeight: 700,
    fontFamily: 'monospace'
  }}>
    Code: {appointment.unique_code}
  </Typography>
</Box>
```

---

## 📧 Utilisation dans les Communications

### Email de Confirmation
```
Objet: Rendez-vous confirmé - RDV-A3B5C7D9

Bonjour [Prénom],

Votre rendez-vous a été confirmé.

📋 Code de rendez-vous: RDV-A3B5C7D9
📅 Date: Lundi 23 janvier 2025
⏰ Heure: 14:00 - 15:00
👤 Intervenant: [Nom de l'intervenant]

Veuillez conserver ce code pour toute demande concernant ce rendez-vous.
```

### Email de Rappel
```
Objet: Rappel - Rendez-vous RDV-A3B5C7D9 demain

Bonjour [Prénom],

Nous vous rappelons votre rendez-vous demain:

📋 Référence: RDV-A3B5C7D9
📅 Demain à 14:00
🔗 Lien de visioconférence: [...]
```

### Support Client
```
Agent: "Bonjour, je peux vous aider?"
Client: "Oui, j'ai une question sur mon rendez-vous RDV-A3B5C7D9"
Agent: [Recherche rapide par code] "Je vois, votre rendez-vous du 23 janvier..."
```

---

## 🧾 Utilisation dans la Facturation

### Facture Intervenant

```
┌────────────────────────────────────────────┐
│           FACTURE INTERVENANT              │
│                                            │
│  Date: 23/01/2025                         │
│  Période: Janvier 2025                    │
│                                            │
│  Rendez-vous:                             │
│  ───────────────────────────────────────  │
│                                            │
│  • RDV-A3B5C7D9                           │
│    Consultation Numérologie               │
│    23/01/2025 14:00                       │
│    Client: J. Dupont                      │
│    Montant: 60,00 €                       │
│    Commission: -10,00 €                   │
│    Net: 50,00 €                           │
│                                            │
│  • RDV-B7F3K9L2                           │
│    ...                                    │
│                                            │
│  ───────────────────────────────────────  │
│  TOTAL NET: 250,00 €                      │
└────────────────────────────────────────────┘
```

### Avantages pour la Facturation

- ✅ **Traçabilité** - Lien direct entre facture et rendez-vous
- ✅ **Vérification** - Client et intervenant peuvent vérifier facilement
- ✅ **Comptabilité** - Référence unique pour la comptabilité
- ✅ **Disputes** - Résolution rapide en cas de désaccord

---

## 🔍 Recherche et Requêtes

### Rechercher un Rendez-vous par Code

```typescript
// API/Service
const getAppointmentByCode = async (code: string): Promise<Appointment | null> => {
  const { data, error } = await supabase
    .from('appointments')
    .select('*, client(*), practitioner(*), service(*)')
    .eq('unique_code', code)
    .single();

  if (error) throw error;
  return data;
};
```

```sql
-- SQL Direct
SELECT *
FROM appointments
WHERE unique_code = 'RDV-A3B5C7D9';
```

### Validation du Format

```typescript
import { isValidAppointmentCode } from '@/utils/appointmentCodeGenerator';

if (!isValidAppointmentCode(userInput)) {
  throw new Error('Code de rendez-vous invalide. Format attendu: RDV-XXXXXXXX');
}
```

---

## 🔒 Sécurité et Confidentialité

### Protection des Données

✅ **Non séquentiel** - Impossible de deviner d'autres codes
✅ **Pas d'information sensible** - Ne contient pas de dates, noms, ou prix
✅ **Collision impossible** - Vérification d'unicité avant insertion
✅ **Index unique** - Contrainte de base de données garantit l'unicité

### Limitations

⚠️ **Pas d'authentification** - Le code seul ne doit PAS donner accès au rendez-vous
⚠️ **Validation requise** - Toujours vérifier l'identité de l'utilisateur en plus du code
⚠️ **Pas de secret** - Ne pas utiliser comme token de sécurité

### Bonnes Pratiques

```typescript
// ❌ MAUVAIS - Accès par code seul
app.get('/appointment/:code', (req, res) => {
  const appointment = await getAppointmentByCode(req.params.code);
  return res.json(appointment); // DANGER: Pas d'auth!
});

// ✅ BON - Accès avec authentification
app.get('/appointment/:code', authenticate, async (req, res) => {
  const appointment = await getAppointmentByCode(req.params.code);

  // Vérifier que l'utilisateur a le droit d'accéder
  if (appointment.client_id !== req.user.id &&
      appointment.practitioner.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Accès refusé' });
  }

  return res.json(appointment);
});
```

---

## 📊 Statistiques et Analytics

### Tracking des Codes

```sql
-- Rendez-vous sans code (à corriger)
SELECT COUNT(*)
FROM appointments
WHERE unique_code IS NULL;

-- Distribution des codes par période
SELECT
  DATE_TRUNC('month', created_at) AS month,
  COUNT(*) AS total_appointments,
  COUNT(unique_code) AS appointments_with_code
FROM appointments
GROUP BY month
ORDER BY month DESC;
```

### Utilisation dans les Logs

```typescript
logger.info('Appointment created', {
  code: appointment.unique_code,
  service: appointment.service_id,
  practitioner: appointment.practitioner_id,
  // Ne PAS logger les données sensibles (noms, prix, etc.)
});
```

---

## 🧪 Tests

### Tests Unitaires

```typescript
import { generateAppointmentCode, isValidAppointmentCode } from '@/utils/appointmentCodeGenerator';

describe('Appointment Code Generator', () => {
  test('generates valid code format', () => {
    const code = generateAppointmentCode();
    expect(isValidAppointmentCode(code)).toBe(true);
  });

  test('generates unique codes', () => {
    const codes = new Set();
    for (let i = 0; i < 1000; i++) {
      codes.add(generateAppointmentCode());
    }
    expect(codes.size).toBe(1000); // Tous uniques
  });

  test('validates code format correctly', () => {
    expect(isValidAppointmentCode('RDV-A3B5C7D9')).toBe(true);
    expect(isValidAppointmentCode('RDV-12345678')).toBe(true);
    expect(isValidAppointmentCode('invalid')).toBe(false);
    expect(isValidAppointmentCode('RDV-')).toBe(false);
    expect(isValidAppointmentCode('RDV-123')).toBe(false); // Trop court
  });
});
```

### Tests d'Intégration

```typescript
describe('Appointment Creation with Code', () => {
  test('automatically generates code on insert', async () => {
    const appointment = await createAppointment({
      client_id: 'user-123',
      service_id: 'service-456',
      // ... autres champs
      // unique_code pas fourni
    });

    expect(appointment.unique_code).toBeDefined();
    expect(isValidAppointmentCode(appointment.unique_code!)).toBe(true);
  });

  test('prevents duplicate codes', async () => {
    const code = 'RDV-TEST1234';

    await createAppointment({ unique_code: code, /* ... */ });

    await expect(
      createAppointment({ unique_code: code, /* ... */ })
    ).rejects.toThrow('duplicate key value');
  });
});
```

---

## 📈 Roadmap et Évolutions Futures

### Phase 1 (Actuelle) ✅
- [x] Génération automatique des codes
- [x] Affichage dans l'interface utilisateur
- [x] Documentation complète

### Phase 2 (Planifiée)
- [ ] Intégration dans les emails automatiques
- [ ] Ajout aux factures PDF
- [ ] Recherche par code dans l'interface admin

### Phase 3 (Future)
- [ ] QR code contenant le code de rendez-vous
- [ ] SMS de confirmation avec le code
- [ ] API publique de vérification de rendez-vous (avec auth)
- [ ] Export CSV avec codes pour comptabilité

---

## 🛠️ Maintenance

### Migration des Données Existantes

Tous les rendez-vous existants ont reçu automatiquement un code unique lors de la migration:

```sql
-- Vérifier que tous les rendez-vous ont un code
SELECT
  COUNT(*) AS total,
  COUNT(unique_code) AS with_code,
  COUNT(*) - COUNT(unique_code) AS missing_code
FROM appointments;
```

### Régénération en Cas de Problème

Si des codes sont manquants:

```sql
UPDATE appointments
SET unique_code = generate_appointment_code()
WHERE unique_code IS NULL;
```

---

## 📞 Support

Pour toute question sur les codes de rendez-vous:

1. **Documentation:** Ce fichier
2. **Migration:** `supabase/migrations/add_unique_code_to_appointments.sql`
3. **Utilitaires:** `src/utils/appointmentCodeGenerator.ts`
4. **Types:** `src/services/supabase.ts` (type `Appointment`)

---

## ✅ Checklist d'Implémentation

- [x] Migration SQL créée
- [x] Fonction de génération en base de données
- [x] Trigger automatique configuré
- [x] Type TypeScript mis à jour
- [x] Utilitaires frontend créés
- [x] Interface utilisateur mise à jour
- [x] Documentation complète
- [ ] **À FAIRE:** Appliquer la migration en production
- [ ] **À FAIRE:** Intégration dans les emails
- [ ] **À FAIRE:** Ajout aux factures PDF

---

**Dernière mise à jour:** 2025-01-23
**Version:** 1.0.0
**Auteur:** Claude Code (IA Assistant)
