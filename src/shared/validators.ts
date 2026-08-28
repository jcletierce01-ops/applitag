export const validatePhone = (tel: string): string | null => {
  const digits = tel.replace(/\s|\./g, "");
  if (digits.length !== 10) return "10 chiffres requis";
  if (!/^0[1-7]/.test(digits)) return "Doit commencer par 01 à 07";
  return null;
};

// Formate un numéro de téléphone saisi en groupes de 2 chiffres séparés d'un espace (ex: 06 12 34 56 78)
export const formatPhone = (v: string): string => {
  const digits = v.replace(/\D/g, "").slice(0, 10);
  return digits.replace(/(\d{2})(?=\d)/g, "$1 ");
};

// Formate un numéro CMR (lettre de voiture) selon le gabarit interne CMR-AAAA-NNNN
export const formatCMR = (v: string): string => {
  const digits = v.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 4) return digits ? `CMR-${digits}` : "";
  return `CMR-${digits.slice(0, 4)}-${digits.slice(4)}`;
};

export const validateCMR = (v: string): string | null =>
  /^CMR-\d{4}-\d{4}$/.test(v) ? null : "Format attendu : CMR-AAAA-NNNN";

// Formate une immatriculation au format SIV français (ex: AB-123-CD)
export const formatImmat = (v: string): string => {
  const upper = v.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const rules = [/[A-Z]/, /[A-Z]/, /[0-9]/, /[0-9]/, /[0-9]/, /[A-Z]/, /[A-Z]/];
  let clean = "";
  let ri = 0;
  for (let i = 0; i < upper.length && ri < 7; i++) {
    if (rules[ri]!.test(upper[i]!)) {
      clean += upper[i];
      ri++;
    }
  }
  if (clean.length <= 2) return clean;
  if (clean.length <= 5) return `${clean.slice(0, 2)}-${clean.slice(2)}`;
  return `${clean.slice(0, 2)}-${clean.slice(2, 5)}-${clean.slice(5)}`;
};

export const validateImmat = (v: string): string | null =>
  /^[A-Z]{2}-\d{3}-[A-Z]{2}$/.test(v) ? null : "Format attendu : AB-123-CD";
