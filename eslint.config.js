import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores([
    'dist',
    // Fichiers prototypes orphelins — non importés dans le build de production
    'src/applitag_checklist_pilote.jsx',
    'src/applitag_dashboard_web.jsx',
    'src/applitag_documents_terrain.jsx',
    'src/applitag_fin_chantier_rentabilite.jsx',
    'src/applitag_gestion_tas.jsx',
    'src/applitag_mvp_stabilisation.jsx',
    'src/applitag_offline_sync.jsx',
    'src/applitag_referentiel_essences.jsx',
    'src/applitag_sprint0_contacts.jsx',
    'src/applitag_sprint1_visite.jsx',
  ]),
  {
    files: ['vite.config.js', 'scripts/**/*.js'],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactRefresh.configs.vite,
    ],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      // Règles classiques hooks (sans les règles React Compiler non applicables ici)
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // Variables préfixées _ sont intentionnellement inutilisées (convention standard)
      'no-unused-vars': ['error', { varsIgnorePattern: '^_', argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      // Permet d'exporter des constantes et des composants depuis le même fichier (pattern courant dans ce projet)
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // Les espaces insécables (U+00A0) sont intentionnels dans JSX, templates et commentaires (typographie française)
      'no-irregular-whitespace': ['error', { skipJSXText: true, skipComments: true, skipTemplates: true }],
    },
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
])
