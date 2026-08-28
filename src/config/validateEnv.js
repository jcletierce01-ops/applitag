const ALLOWED_MODES = ['production', 'demo', 'development'];

/**
 * Valide les variables d'environnement au démarrage.
 * @param {object} env — defaults to import.meta.env (injectable pour les tests)
 * @throws {Error} si une variable obligatoire est absente ou invalide
 */
export function assertEnv(env = import.meta.env) {
  const errors = [];

  if (!env.VITE_APP_MODE) {
    errors.push(
      `VITE_APP_MODE manquant — valeurs attendues : ${ALLOWED_MODES.join(', ')}`
    );
  } else if (!ALLOWED_MODES.includes(env.VITE_APP_MODE)) {
    errors.push(
      `VITE_APP_MODE="${env.VITE_APP_MODE}" non reconnu — valeurs attendues : ${ALLOWED_MODES.join(', ')}`
    );
  }

  if (env.VITE_API_URL !== undefined && env.VITE_API_URL !== '') {
    try {
      new URL(env.VITE_API_URL);
    } catch {
      errors.push(`VITE_API_URL="${env.VITE_API_URL}" n'est pas une URL valide`);
    }
  }

  if (errors.length > 0) {
    throw new Error(
      '[APPLITAG] Variables d\'environnement invalides :\n' +
      errors.map((e) => '  * ' + e).join('\n')
    );
  }
}
