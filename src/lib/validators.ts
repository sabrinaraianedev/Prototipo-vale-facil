/**
 * Validates Brazilian vehicle plate formats
 * Old format: ABC-1234 (3 letters + hyphen + 4 digits)
 * Mercosul format: ABC1D23 (3 letters + 1 digit + 1 letter + 2 digits)
 */
export const validateBrazilianPlate = (plate: string): { valid: boolean; formatted: string } => {
  // Remove non-alphanumeric characters and convert to uppercase
  const cleanPlate = plate.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  
  // Old format: 3 letters + 4 digits (AAA1234)
  const oldFormat = /^[A-Z]{3}[0-9]{4}$/;
  // Mercosul: 3 letters + 1 digit + 1 letter + 2 digits (AAA1A23)
  const mercosulFormat = /^[A-Z]{3}[0-9]{1}[A-Z]{1}[0-9]{2}$/;
  
  if (oldFormat.test(cleanPlate)) {
    // Format as ABC-1234
    return { 
      valid: true, 
      formatted: `${cleanPlate.slice(0, 3)}-${cleanPlate.slice(3)}` 
    };
  }
  
  if (mercosulFormat.test(cleanPlate)) {
    // Mercosul format doesn't use hyphen
    return { valid: true, formatted: cleanPlate };
  }
  
  return { valid: false, formatted: cleanPlate };
};

/**
 * Checks if a plate string is valid (without formatting)
 */
export const isValidPlate = (plate: string): boolean => {
  return validateBrazilianPlate(plate).valid;
};

/**
 * Formats and validates plate input
 */
export const formatPlateInput = (input: string): string => {
  // Remove invalid characters and convert to uppercase
  return input.replace(/[^A-Za-z0-9-]/g, '').toUpperCase().slice(0, 8);
};
