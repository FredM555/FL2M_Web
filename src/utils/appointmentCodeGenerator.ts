/**
 * Appointment Code Generator Utility
 *
 * Generates unique non-chronological codes for appointments.
 * Format: RDV-XXXXXXXX (8 random alphanumeric characters)
 *
 * Used for:
 * - Practitioner invoicing
 * - User communication
 * - Appointment identification
 */

/**
 * Generates a random alphanumeric string of specified length
 * @param length - Length of the random string
 * @returns Random alphanumeric string (uppercase)
 */
const generateRandomAlphanumeric = (length: number): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Generates a unique appointment code
 * Format: RDV-XXXXXXXX
 *
 * @returns Unique appointment code
 *
 * @example
 * generateAppointmentCode() // Returns "RDV-A3B5C7D9"
 */
export const generateAppointmentCode = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = generateRandomAlphanumeric(4);

  // Mix timestamp and random for better uniqueness
  const mixed = (timestamp + random).slice(-8);

  return `RDV-${mixed}`;
};

/**
 * Validates if a string is a valid appointment code format
 * @param code - Code to validate
 * @returns True if valid format, false otherwise
 *
 * @example
 * isValidAppointmentCode("RDV-A3B5C7D9") // Returns true
 * isValidAppointmentCode("invalid") // Returns false
 */
export const isValidAppointmentCode = (code: string): boolean => {
  const pattern = /^RDV-[A-Z0-9]{8}$/;
  return pattern.test(code);
};

/**
 * Formats an appointment code for display
 * @param code - Appointment code
 * @returns Formatted code with styling hint
 *
 * @example
 * formatAppointmentCode("RDV-A3B5C7D9") // Returns "RDV-A3B5C7D9"
 */
export const formatAppointmentCode = (code: string): string => {
  if (!code) return 'N/A';
  return code.toUpperCase();
};
