import { describe, it, expect } from 'vitest';
import { assertEnv } from './validateEnv.js';

describe('assertEnv', () => {
  it('accepte mode production avec URL valide', () => {
    expect(() =>
      assertEnv({ VITE_APP_MODE: 'production', VITE_API_URL: 'https://api.example.com' })
    ).not.toThrow();
  });

  it('accepte mode demo avec URL valide', () => {
    expect(() =>
      assertEnv({ VITE_APP_MODE: 'demo', VITE_API_URL: 'https://api.example.com' })
    ).not.toThrow();
  });

  it('accepte mode development avec URL valide', () => {
    expect(() =>
      assertEnv({ VITE_APP_MODE: 'development', VITE_API_URL: 'https://localhost:3000' })
    ).not.toThrow();
  });

  it('accepte VITE_API_URL absent (optionnel)', () => {
    expect(() =>
      assertEnv({ VITE_APP_MODE: 'production' })
    ).not.toThrow();
  });

  it('accepte VITE_API_URL avec chemin', () => {
    expect(() =>
      assertEnv({ VITE_APP_MODE: 'production', VITE_API_URL: 'https://api.example.com/v1' })
    ).not.toThrow();
  });

  it('rejette VITE_APP_MODE manquant', () => {
    expect(() => assertEnv({ VITE_API_URL: 'https://api.example.com' })).toThrow(
      'VITE_APP_MODE manquant'
    );
  });

  it('rejette VITE_APP_MODE vide', () => {
    expect(() =>
      assertEnv({ VITE_APP_MODE: '', VITE_API_URL: 'https://api.example.com' })
    ).toThrow('VITE_APP_MODE manquant');
  });

  it('rejette VITE_APP_MODE inconnu', () => {
    expect(() =>
      assertEnv({ VITE_APP_MODE: 'staging', VITE_API_URL: 'https://api.example.com' })
    ).toThrow('VITE_APP_MODE="staging" non reconnu');
  });

  it('rejette VITE_API_URL invalide', () => {
    expect(() =>
      assertEnv({ VITE_APP_MODE: 'production', VITE_API_URL: 'pas-une-url' })
    ).toThrow('VITE_API_URL="pas-une-url" n\'est pas une URL valide');
  });

  it('accumule plusieurs erreurs dans un seul throw', () => {
    expect(() =>
      assertEnv({ VITE_APP_MODE: 'invalid', VITE_API_URL: 'not-a-url' })
    ).toThrow(/VITE_APP_MODE.*non reconnu[\s\S]*VITE_API_URL.*n'est pas/);
  });

  it('inclut la liste des modes autorisés dans le message d\'erreur', () => {
    expect(() => assertEnv({})).toThrow('production, demo, development');
  });
});
