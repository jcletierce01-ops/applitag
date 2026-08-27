import { describe, it, expect } from 'vitest';
import { fmtNum, fmtDate } from './format.js';

describe('fmtNum', () => {
  it('formate un entier : la valeur numérique est préservée (sans séparateurs)', () => {
    const result = fmtNum(1234);
    expect(result.replace(/[\s  ]/g, '')).toBe('1234');
  });

  it('formate avec 2 décimales', () => {
    const result = fmtNum(1.5, 2);
    // séparateur décimal fr-FR = virgule
    expect(result.replace(/[\s  ]/g, '')).toBe('1,50');
  });

  it('retourne la valeur brute si non numérique', () => {
    expect(fmtNum('abc')).toBe('abc');
  });

  it('formate zéro', () => {
    expect(fmtNum(0)).toBe('0');
  });

  it('formate les négatifs', () => {
    const result = fmtNum(-42);
    expect(result).toContain('42');
    expect(result).toContain('-');
  });

  it('accepte une string numérique', () => {
    const result = fmtNum('1234.5', 1);
    expect(result.replace(/[\s  ]/g, '')).toMatch(/^1234,5$/);
  });

  it('0 décimale par défaut', () => {
    expect(fmtNum(1.9)).toBe(fmtNum(Math.round(1.9)));
  });
});

describe('fmtDate', () => {
  it('convertit YYYY-MM-DD en JJ/MM/AAAA', () => {
    expect(fmtDate('2026-08-27')).toBe('27/08/2026');
  });

  it('retourne une chaîne vide si undefined', () => {
    expect(fmtDate(undefined)).toBe('');
  });

  it('retourne une chaîne vide si null', () => {
    expect(fmtDate(null)).toBe('');
  });

  it('gère les dates avec heure ISO (prend les 10 premiers caractères)', () => {
    expect(fmtDate('2026-08-27T10:30:00Z')).toBe('27/08/2026');
  });

  it('retourne la chaîne brute si format non reconnu (sans tirets)', () => {
    expect(fmtDate('abc')).toBe('abc');
  });

  it('retourne la valeur brute si non string non nul', () => {
    // iso ?? "" → 20260827 (number n'est ni null ni undefined)
    expect(fmtDate(20260827)).toBe(20260827);
  });

  it('formate correctement le 1er janvier', () => {
    expect(fmtDate('2026-01-01')).toBe('01/01/2026');
  });
});
