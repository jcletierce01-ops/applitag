import { describe, it, expect } from 'vitest';
import {
  calculerPci,
  calculerPoidsAjuste,
  calculerVolApparent,
  calculerVolReel,
  calculerMasse,
  calculerEnergie,
  estimerHumiditeDepuisFoisonnement,
  estimerVolumeParHa,
  indicesPonderes,
  INDICES_ESSENCE,
  PCI_BOIS_ANHYDRE,
  HUMIDITE_REF_ITEBE,
} from './formules.js';

describe('calculerPci', () => {
  it('retourne PCI maximal à 0% humidité (bois anhydre)', () => {
    expect(calculerPci(0)).toBeCloseTo(PCI_BOIS_ANHYDRE.valeur, 5);
  });

  it('à 50% humidité (référence ITEBE) : 2.25 MWh/t', () => {
    // 5.18*(1-0.5) - 0.68*0.5 = 2.59 - 0.34 = 2.25
    expect(calculerPci(50)).toBeCloseTo(2.25, 5);
  });

  it('retourne ≥ 0 même à 95% humidité (limite clamp)', () => {
    expect(calculerPci(95)).toBeGreaterThanOrEqual(0);
  });

  it('clamp humidité négative → même résultat que 0%', () => {
    expect(calculerPci(-10)).toBeCloseTo(calculerPci(0), 10);
  });

  it('clamp humidité > 100 → même résultat que 95%', () => {
    expect(calculerPci(200)).toBeCloseTo(calculerPci(95), 10);
  });

  it('la valeur décroît avec l\'humidité', () => {
    expect(calculerPci(30)).toBeGreaterThan(calculerPci(60));
  });
});

describe('calculerPoidsAjuste', () => {
  it('à H = H_ref (50%) : facteur = 1 → poids = volume × densité / 1000', () => {
    // facteur = (1-0.5)/(1-0.5) = 1
    expect(calculerPoidsAjuste(10, 1000, 50)).toBeCloseTo(10, 5);
  });

  it('poids inférieur si bois plus sec que H_ref (moins d\'eau = moins de masse)', () => {
    // H=20% < H_ref=50% → facteur = 0.5/0.8 = 0.625 → masse < masse_ref
    expect(calculerPoidsAjuste(10, 1000, 20)).toBeLessThan(10);
  });

  it('poids supérieur si bois plus humide que H_ref (plus d\'eau = plus de masse)', () => {
    // H=70% > H_ref=50% → facteur = 0.5/0.3 = 1.667 → masse > masse_ref
    expect(calculerPoidsAjuste(10, 1000, 70)).toBeGreaterThan(10);
  });

  it('clamp humidité à 95%', () => {
    const a = calculerPoidsAjuste(10, 1000, 95);
    const b = calculerPoidsAjuste(10, 1000, 99);
    expect(a).toBeCloseTo(b, 5);
  });

  it('valeur numérique exacte : 10 m³ × 850 kg/m³, H=30%', () => {
    // facteur = 0.5 / 0.7 = 0.71428...
    // poids = 10 * 850 * 0.71428 / 1000 = 6.071...
    const expected = 10 * 850 * ((1 - HUMIDITE_REF_ITEBE.valeur / 100) / (1 - 30 / 100)) / 1000;
    expect(calculerPoidsAjuste(10, 850, 30)).toBeCloseTo(expected, 5);
  });
});

describe('calculerVolApparent', () => {
  it('calcule le volume d\'un tas rectangulaire', () => {
    expect(calculerVolApparent(1, 10, 2, 1.5)).toBeCloseTo(30, 5);
  });

  it('multiplie par le nombre de tas', () => {
    expect(calculerVolApparent(3, 10, 2, 1.5)).toBeCloseTo(90, 5);
  });

  it('retourne 0 si une dimension est nulle', () => {
    expect(calculerVolApparent(1, 10, 2, 0)).toBe(0);
  });
});

describe('calculerVolReel', () => {
  it('applique le foisonnement (100 m³ apparent × 0.5 = 50 m³ réels)', () => {
    expect(calculerVolReel(100, 0.5)).toBeCloseTo(50, 5);
  });

  it('foisonnement = 1 → volume réel = volume apparent', () => {
    expect(calculerVolReel(42, 1)).toBeCloseTo(42, 5);
  });

  it('foisonnement chêne (0.55) sur 200 m³', () => {
    expect(calculerVolReel(200, INDICES_ESSENCE.chene.foisonnement)).toBeCloseTo(110, 5);
  });
});

describe('calculerMasse', () => {
  it('10 m³ réels × 1000 kg/m³ → 10 t', () => {
    expect(calculerMasse(10, 1000)).toBeCloseTo(10, 5);
  });

  it('1 m³ réel × 850 kg/m³ → 0.85 t', () => {
    expect(calculerMasse(1, 850)).toBeCloseTo(0.85, 5);
  });

  it('utilise la densité peuplier (850)', () => {
    expect(calculerMasse(1, INDICES_ESSENCE.peuplier.densite)).toBeCloseTo(0.85, 5);
  });
});

describe('calculerEnergie', () => {
  it('10 t × 3.8 MWh/t = 38 MWh', () => {
    expect(calculerEnergie(10, 3.8)).toBeCloseTo(38, 5);
  });

  it('retourne 0 pour une masse nulle', () => {
    expect(calculerEnergie(0, 3.8)).toBe(0);
  });

  it('résultat positif avec indices chêne réels', () => {
    const energie = calculerEnergie(10, INDICES_ESSENCE.chene.pci);
    expect(energie).toBeGreaterThan(0);
  });
});

describe('estimerHumiditeDepuisFoisonnement', () => {
  it('foisonnement 0.5 → 50%', () => {
    expect(estimerHumiditeDepuisFoisonnement(0.5)).toBe(50);
  });

  it('foisonnement 0.4 → 60%', () => {
    expect(estimerHumiditeDepuisFoisonnement(0.4)).toBe(60);
  });

  it('foisonnement 0.55 → 45%', () => {
    expect(estimerHumiditeDepuisFoisonnement(0.55)).toBe(45);
  });

  it('retourne un entier (Math.round)', () => {
    const r = estimerHumiditeDepuisFoisonnement(0.333);
    expect(Number.isInteger(r)).toBe(true);
  });
});

describe('estimerVolumeParHa', () => {
  it('retourne 0 si le diamètre est nul', () => {
    expect(estimerVolumeParHa(1000, 0, 1, 1000, 20)).toBe(0);
  });

  it('retourne 0 si la surface est nulle', () => {
    expect(estimerVolumeParHa(1000, 20, 0, 1000, 20)).toBe(0);
  });

  it('produit un résultat positif avec des valeurs réalistes', () => {
    const r = estimerVolumeParHa(200, 30, 1, INDICES_ESSENCE.chene.densite, 20);
    expect(r).toBeGreaterThan(0);
  });

  it('utilise hauteur 20 par défaut si undefined', () => {
    const a = estimerVolumeParHa(200, 30, 1, 1000, 20);
    const b = estimerVolumeParHa(200, 30, 1, 1000, undefined as unknown as number);
    expect(a).toBeCloseTo(b, 5);
  });

  it('le résultat augmente avec le nombre de tiges par hectare', () => {
    const a = estimerVolumeParHa(200, 30, 1, 1000, 20);
    const b = estimerVolumeParHa(400, 30, 1, 1000, 20);
    expect(b).toBeGreaterThan(a);
  });

  it('retourne 0 si popParHa est 0 (branche || 0)', () => {
    expect(estimerVolumeParHa(0, 30, 1, 1000, 20)).toBe(0);
  });
});

describe('indicesPonderes', () => {
  it('retourne le mélange par défaut si tableau vide', () => {
    expect(indicesPonderes([])).toEqual(INDICES_ESSENCE.melange);
  });

  it('retourne le mélange par défaut si undefined', () => {
    expect(indicesPonderes(undefined)).toEqual(INDICES_ESSENCE.melange);
  });

  it('retourne les indices de l\'essence unique à 100%', () => {
    const r = indicesPonderes([{ id: 'chene', pct: 100 }]);
    expect(r.densite).toBeCloseTo(INDICES_ESSENCE.chene.densite, 5);
    expect(r.pci).toBeCloseTo(INDICES_ESSENCE.chene.pci, 5);
    expect(r.foisonnement).toBeCloseTo(INDICES_ESSENCE.chene.foisonnement, 5);
  });

  it('pondère correctement chêne 50% + peuplier 50%', () => {
    const r = indicesPonderes([
      { id: 'chene',    pct: 50 },
      { id: 'peuplier', pct: 50 },
    ]);
    const expectedDensite = (INDICES_ESSENCE.chene.densite + INDICES_ESSENCE.peuplier.densite) / 2;
    expect(r.densite).toBeCloseTo(expectedDensite, 5);
  });

  it('utilise le mélange par défaut pour une essence inconnue', () => {
    const r = indicesPonderes([{ id: 'essence_inconnue', pct: 100 }]);
    expect(r.densite).toBeCloseTo(INDICES_ESSENCE.melange.densite, 5);
  });

  it('gère le cas dégénéré où tous les pct sont 0 (branche total || 100)', () => {
    const r = indicesPonderes([{ id: 'chene', pct: 0 }]);
    expect(r.densite).toBe(0);
    expect(r.pci).toBe(0);
  });

  it('les résultats restent dans des plages réalistes (densite 700-1100, pci 2-5)', () => {
    const r = indicesPonderes([
      { id: 'hetre',   pct: 60 },
      { id: 'epicea',  pct: 40 },
    ]);
    expect(r.densite).toBeGreaterThan(700);
    expect(r.densite).toBeLessThan(1100);
    expect(r.pci).toBeGreaterThan(2);
    expect(r.pci).toBeLessThan(5);
  });
});

describe('cohérence de la chaîne complète vol→masse→énergie', () => {
  it('calcule l\'énergie d\'un lot chêne 100 m³ apparent, H=50%', () => {
    const e = INDICES_ESSENCE.chene;
    const volApp = calculerVolApparent(1, 10, 5, 2);   // 100 m³ apparent
    const volReel = calculerVolReel(volApp, e.foisonnement);
    const masse = calculerPoidsAjuste(volReel, e.densite, 50);
    const pci = calculerPci(50);
    const energie = calculerEnergie(masse, pci);
    expect(energie).toBeGreaterThan(0);
    expect(energie).toBeLessThan(1000); // ordre de grandeur cohérent
  });
});
