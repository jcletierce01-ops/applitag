import { describe, it, expect } from 'vitest';
import { uid, nowISO, todayS, genCode, genCodeAPT } from './utils.js';

describe('uid', () => {
  it('retourne un UUID v4 valide', () => {
    const uuid = uid();
    expect(uuid).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it('génère des identifiants uniques', () => {
    const ids = Array.from({ length: 10 }, uid);
    const unique = new Set(ids);
    expect(unique.size).toBe(10);
  });
});

describe('nowISO', () => {
  it('retourne une date ISO 8601 valide', () => {
    const iso = nowISO();
    expect(new Date(iso).toISOString()).toBe(iso);
  });

  it('la date générée est proche de maintenant (± 1s)', () => {
    const before = Date.now();
    const iso = nowISO();
    const after = Date.now();
    const ts = new Date(iso).getTime();
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after + 1000);
  });
});

describe('todayS', () => {
  it('retourne une date au format YYYY-MM-DD', () => {
    expect(todayS()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('correspond à la date UTC du jour', () => {
    const expected = new Date().toISOString().slice(0, 10);
    expect(todayS()).toBe(expected);
  });
});

describe('genCode', () => {
  it('retourne exactement 8 caractères', () => {
    expect(genCode()).toHaveLength(8);
  });

  it("n'utilise aucun caractère ambigu (0, O, 1, I, L)", () => {
    for (let i = 0; i < 30; i++) {
      expect(genCode()).not.toMatch(/[0O1IL]/);
    }
  });

  it('utilise uniquement des caractères de l\'alphabet déclaré', () => {
    const alphabet = new Set('ABCDEFGHJKMNPQRSTUVWXYZ23456789');
    for (let i = 0; i < 20; i++) {
      for (const c of genCode()) {
        expect(alphabet.has(c)).toBe(true);
      }
    }
  });

  it('génère des codes différents', () => {
    const codes = Array.from({ length: 10 }, genCode);
    expect(new Set(codes).size).toBeGreaterThan(1);
  });
});

describe('genCodeAPT', () => {
  it('retourne le format APT-XXXX-XXXX', () => {
    expect(genCodeAPT()).toMatch(/^APT-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  });

  it('génère des codes différents', () => {
    const codes = Array.from({ length: 10 }, genCodeAPT);
    expect(new Set(codes).size).toBeGreaterThan(1);
  });

  it('le préfixe est toujours APT', () => {
    for (let i = 0; i < 5; i++) {
      expect(genCodeAPT().startsWith('APT-')).toBe(true);
    }
  });
});
