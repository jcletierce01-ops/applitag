const ALLOWED_MODES = ['production', 'demo', 'development'] as const;
type AllowedMode = (typeof ALLOWED_MODES)[number];

/**
 * Valide les variables d'environnement au démarrage.
 * @param env — defaults to import.meta.env (injectable pour les tests)
 * @throws {Error} si une variable obligatoire est absente ou invalide
 */
export function assertEnv(env: { VITE_APP_MODE?: string; VITE_API_URL?: string; [key: string]: string | boolean | undefined } = import.meta.env): void {
  const errors: string[] = [];

  if (!env.VITE_APP_MODE) {
    errors.push(
      `VITE_APP_MODE manquant — valeurs attendues : ${ALLOWED_MODES.join(', ')}`
    );
  } else if (!ALLOWED_MODES.includes(env.VITE_APP_MODE as AllowedMode)) {
    errors.push(
      `VITE_APP_MODE="${env.VITE_APP_MODE}" non reconnu — valeurs attendues : ${ALLOWED_MODES.join(', ')}`
    );
  }

  if (env.VITE_API_URL !== undefined && env.VITE_API_URL !== '') {
    const v = env.VITE_API_URL;
    // Accept relative paths (e.g. "/api" for Vite proxy) and absolute URLs
    const isRelative = v.startsWith('/');
    if (!isRelative) {
      try {
        new URL(v);
      } catch {
        errors.push(`VITE_API_URL="${v}" n'est pas une URL valide ni un chemin relatif`);
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(
      '[APPLITAG] Variables d\'environnement invalides :\n' +
      errors.map((e) => '  * ' + e).join('\n')
    );
  }
}
