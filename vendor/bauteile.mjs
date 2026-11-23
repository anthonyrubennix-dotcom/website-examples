/* bauteile.mjs — die fünf Bauteile, die auf den sieben Seiten am häufigsten
 * vorkommen und dort am häufigsten falsch gebaut wurden.
 *
 * ⛔ DAS IST EINE EXTRAKTION, KEIN NEUENTWURF. Jede Zahl hier steht so oder
 *    umgerechnet in einer der sieben bestehenden Seiten; die Herkunft steht je
 *    Bauteil in `HERKUNFT`. Nichts ist dazuerfunden.
 *
 * ── Warum es diese Datei gibt ────────────────────────────────────────────────
 * Am 21.09.2026 stand DIESELBE Diagnose dreimal in drei verschiedenen Seiten,
 * dreimal einzeln repariert, nie als Regel abgelegt:
 *   ref-c  Z1685–1690  "dazwischen eine Fuge und nichts, was die beiden
 *                         verbindet. An einem echten Flexanschluss sitzt dort
 *                         eine Ueberwurfmutter, die ueber den Nippel greift."
 *   ref-c  Z1575–1590  "das Regal wirkte deshalb angeschweisst an nichts"
 *   portfolio Z1955      "ohne ihn sprießen die Arme aus der Luft"
 * Ein Bauteil, das seine Anschlussstelle mitbringt, kann diesen Fehler nicht
 * machen. Das ist die erste der beiden Eigenschaften unten.
 *
 * ── Die beiden Eigenschaften, die heute gefehlt haben ───────────────────────
 * 1. KEIN FREIES ENDE MÖGLICH. Jede Fabrik verlangt den Anschlusspartner als
 *    Argument (`an`), baut das Gegenstück selbst und wirft, wenn er fehlt.
 *    Es gibt keinen Aufruf, der ein nacktes Rohr- oder Kabelende erzeugt.
 * 2. DICK GENUG, UM BEI STATIONSABSTAND ZU LESEN. Jede Fabrik prüft ihre
 *    kleinste tragende Abmessung gegen `ctx.mmProEinheit` und wirft unter
 *    1,5 mm. Dicke ist die billige Schraube: die Reparatur „Türfüllung
 *    3 mm → 8,6 mm" kostete 0 % Bildrate, MSAA hätte die halbe Bildrate und
 *    das Fünffache an Renderzielspeicher gekostet.
 *
 * ── ⚠️ SECHS WELTMASSE ──────────────────────────────────────────────────────
 * Die sieben Seiten rechnen in sechs verschiedenen Einheiten, Faktor 100
 * zwischen den Extremen (gemessen 21.09.2026):
 *   demo-produkt / -en  MPU 0.01     (1 Einheit = 10 mm)
 *   ref-d-appliance   MPU 0.1      (1 dm)
 *   ref-a-electric         MPU 0.123193
 *   ref-c-plumbing    MPU 0.3048   (1 ft)
 *   demo-portfolio      MPU 0.3048   (1 ft)
 *   ref-b     MPU 1.0      (1 m)
 * Deshalb steht in diesem Katalog JEDE Abmessung in MILLIMETERN, und die Fabrik
 * rechnet sie über `ctx.mmProEinheit` in das Weltmass der Seite um. Ein
 * Schwellwert in Weltmass („dünner als 0.01") ist über diesen Bestand wertlos:
 * 0.01 sind in ref-b 10 mm (harmlos) und in demo-produkt 0,1 mm (unsichtbar).
 *
 * ⭐ Dasselbe gilt für die RAUSCHFELDER im Shader, und dort ist es schon einmal
 * schiefgegangen: `wP` wird vor dem Rauschen mit „Meter je Welteinheit"
 * multipliziert, rechnet also in METERN. Für jeden Faktor f gilt damit
 * Periode_cm = 100/f — auf jeder Seite gleich, unabhängig vom Weltmass.
 * Ein Kommentar, der das anders rechnete, hat einen Tag Fehlersuche gekostet;
 * die ganze Geschichte steht in ABNUTZUNG.md §5.4.
 *
 * ── ⚠️ ZWEI UNVEREINBARE VERSCHLEISS-GENERATIONEN ───────────────────────────
 * Gemessen über die sieben Seiten:
 *   Generation A  Canvas-`aged()` + `drip`-Karte   → ref-d, ref-c
 *   Generation B  Shader-`wear()` + `uwMode` + `wsrc()` → ref-a, ref-b, portfolio,
 *                 demo-produkt, demo-produkt-en
 * Die Fabriken hier melden ihre Tropfquellen über `ctx.wsrc`, wenn es die gibt,
 * und tun sonst nichts. Sie setzen KEINE Materialien — die kommen von aussen.
 *
 * ── Aufruf ──────────────────────────────────────────────────────────────────
 *   import * as BT from "../bauteile/bauteile.mjs";
 *   const ctx = BT.kontext({THREE, V, put, box, bar, tube, RB, wsrc, mmProEinheit: 123.193});
 *   const b = BT.rohrende(ctx, {an: {flaeche:"schlauch", punkt: V(8.58,5.40,1.5), achse: V(0,1,0)},
 *                               nennweite: 19, mat: {rohr: M.copper, mutter: M.brassNew}});
 *   // b.beruehrungen → fertige Einträge für werkzeuge/vertraege/<seite>.beruehrung.mjs
 */

/* --------------------------------------------------------------- Kontext */
const PFLICHT = ["THREE", "V", "put", "mmProEinheit"];

export function kontext(o) {
  for (const k of PFLICHT) {
    if (o[k] === undefined || o[k] === null) {
      throw new Error("bauteile: ctx." + k + " fehlt. Ohne " + k + " kann kein Bauteil gebaut werden — " +
        "das ist ein Abbruch, kein stilles Nichtstun.");
    }
  }
  if (!(o.mmProEinheit > 0)) throw new Error("bauteile: ctx.mmProEinheit muss > 0 sein (ref-b 1000, ref-c 304.8, ref-a 123.193, ref-d 100, demo-produkt 10).");
  return {
    ...o,
    /* mm → Weltmass der Seite */
    mm: v => v / o.mmProEinheit,
    /* Weltmass → mm */
    inMM: v => v * o.mmProEinheit,
    wsrc: o.wsrc || (() => { }),
    beruehrungen: []
  };
}

/* Dickenwächter. 1,5 mm ist die im Bestand abgelesene Grenze: darunter liegen
   genau die Teile, die am 21.09. als gestrichelte Kontur aufgefallen sind
   (Kreuzschlitz 0,50 mm in demo-produkt, Manometerzeiger 0,91 mm in ref-c,
   Kippschalterwippe 1,00 mm in ref-d, Schraubenschlitz 1,11 mm in ref-a). */
export const MIN_MM = 1.5;

function dick(ctx, name, mm) {
  if (mm < MIN_MM) {
    throw new Error("bauteile/" + name + ": kleinste tragende Abmessung " + mm.toFixed(2) +
      " mm liegt unter " + MIN_MM + " mm. Bei Stationsabstand ist das eine gestrichelte Kontur, " +
      "kein Bauteil. Dicke kostet 0 % Bildrate — nachmessen, nicht wegdrücken.");
  }
  return mm;
}

function braucht(o, feld, name) {
  if (!o || o[feld] === undefined || o[feld] === null) {
    throw new Error("bauteile/" + name + ": `" + feld + "` fehlt. Dieses Bauteil kann nicht frei enden — " +
      "es braucht die Stelle, an der es ansetzt. Genau daran sind am 21.09. drei Seiten gescheitert.");
  }
  return o[feld];
}

/* ════════════════════════════════════════════════════════════════════════════
 * 1  LEITUNGSENDE — Kabel/Leitung, die durch eine Wand in ein Gehäuse geht
 *
 * HERKUNFT  ref-a-electric `knock()` Z1461–1465 + `hole()` + `staple()` Z1432–1433.
 *           Die einzige Stelle im Bestand, an der ein Kabeleintritt vollständig
 *           gebaut ist: Loch, Klemmverbinder aussen, Gegenmutter innen, Zugring.
 *           Aufmassstab ref-a: MPU 0,123193.
 * VORKOMMEN 6 von 7 Seiten haben Kabel-/Leitungsenden (ref-a 8, ref-b 4, ref-d 3,
 *           ref-c 3, demo-produkt 1, demo-produkt-en 1; portfolio 0).
 *           Davon enden 4 nachweislich FREI: ref-a Z1789 (Dachbodenlauf endet in
 *           der Decke), ref-b Z1480 (Leerrohr ohne Bogen), ref-b Z2011
 *           (Bremsleitung, beide Enden), ref-d Z2020–2021 (hinter der Blende).
 * MASSE     Leitung Ø 14,8 mm (ref-a Z1430) bis 16,0 mm (Z1698)
 *           Klemmverbinder Ø 27,6 → 32,5 mm, Länge 18,5 mm
 *           Gegenmutter    Ø 37,5 mm, Dicke 3,7 mm, achtkant
 *           Zugring        Ø 25,9 mm, Draht Ø 5,4 mm
 *           kleinste tragende Abmessung: 3,7 mm (Gegenmutter) — über MIN_MM
 * ════════════════════════════════════════════════════════════════════════════ */
export function leitungsende(ctx, o = {}) {
  const N = "leitungsende";
  const an = braucht(o, "an", N);          /* {punkt, normale} — die Wand/Gehäusewand */
  const mat = braucht(o, "mat", N);        /* {leitung, verbinder, mutter} */
  const { THREE, V, put, mm } = ctx;

  const dLeitung = o.leitungMM || 14.8;
  const dVerbA = o.verbinderMM || 27.6, dVerbB = dVerbA * 1.18;
  const lVerb = o.verbinderLaengeMM || 18.5;
  const dMutter = dVerbB * 1.15, tMutter = 3.7;
  dick(ctx, N, tMutter);
  dick(ctx, N, dLeitung);

  const p = an.punkt, n = (an.normale || V(0, 0, 1)).clone().normalize();
  const rot = o.rot || null;
  const g = [];

  /* aussen: Klemmverbinder. Er SITZT im Loch — er wird nicht danebengelegt. */
  g.push(put(new THREE.CylinderGeometry(mm(dVerbA) / 2, mm(dVerbB) / 2, mm(lVerb), 10),
    mat.verbinder, p.clone().addScaledVector(n, mm(lVerb) * 0.35), rot, { keepUV: true }));
  /* innen: achtkantige Gegenmutter — das Teil, das den Verbinder überhaupt hält */
  g.push(put(new THREE.CylinderGeometry(mm(dMutter) / 2, mm(dMutter) / 2, mm(tMutter), 8),
    mat.mutter, p.clone().addScaledVector(n, -mm(tMutter) * 0.6), rot, { keepUV: true }));
  /* Zugring über der Leitung */
  g.push(put(new THREE.TorusGeometry(mm(dLeitung * 1.75) / 2, mm(5.4) / 2, 6, 18),
    mat.verbinder, p.clone().addScaledVector(n, mm(lVerb) * 0.8), rot, { keepUV: true }));

  /* Tropfquelle: die Verschraubung ist eine Befestigung, unter ihr läuft es ab. */
  ctx.wsrc(p.clone().addScaledVector(n, mm(lVerb) * 0.5), mm(dMutter) * 0.8, o.pri ?? 1);

  const b = {
    teile: {
      [o.name + ".leitung.ende"]: { bei: [p.x, p.y, p.z], r: mm(dLeitung * 2.2) },
      [o.name + ".verschraubung"]: { bei: [p.x, p.y, p.z], r: mm(dMutter * 1.3) }
    },
    pruefungen: [{
      id: o.name + "-endet-in-der-verschraubung",
      art: "greiftUeber",
      a: o.name + ".verschraubung", b: o.name + ".leitung.ende",
      achse: o.achse || "y", mindestens: mm(lVerb * 0.5),
      warum: "Ein Leitungsende bringt seine Verschraubung mit. Greift sie nicht ueber die Leitung, liest sich das Ende als abgeschnittener Draht."
    }]
  };
  ctx.beruehrungen.push(b);
  return { geo: g, beruehrungen: b, masseMM: { leitung: dLeitung, mutter: tMutter } };
}

/* ════════════════════════════════════════════════════════════════════════════
 * 2  ROHRENDE MIT ÜBERWURFMUTTER
 *
 * HERKUNFT  ref-c-plumbing Z1690–1692, die Reparatur vom 21.09.2026.
 *           Der Code-Kommentar davor (Z1685–1689) IST der Katalogeintrag:
 *           "An einem echten Flexanschluss sitzt dort eine Ueberwurfmutter,
 *            die ueber den Nippel greift. Die fehlte, und ohne sie sieht jeder
 *            Stutzen aus, als ende er im Freien."
 *           Aufmassstab ref-c: MPU 0,3048.
 * VORKOMMEN 6 von 7 Seiten (ref-c ≥10, ref-d 4, ref-a 3, ref-b 2, portfolio 1).
 * MASSE     Nippel           Ø 33,5 mm, Länge 85,3 mm
 *           Bund (6-kant)    Ø 42,7 mm, Länge 15,2 mm
 *           Überwurfmutter   Ø 56,1 mm, Länge 39,6 mm, 6-kant
 *           Bördel           Ø 45,7 mm, Länge 12,2 mm
 *           kleinste tragende Abmessung: 12,2 mm — weit über MIN_MM
 * NACHGEMESSEN (beruehrung.mjs, 21.09.2026):
 *           alter Stand  Überdeckung Metall↔Schlauch  4,8 mm   → fällt
 *           heutiger     Überdeckung                 38,3 mm   → grün
 *           ⚠️ Die reine BERÜHRUNGSprüfung war in BEIDEN Ständen grün
 *              (Luft 0,0027 bzw. 0,0018). Ein fehlendes Bauteil findet man
 *              nicht über einen Abstand, sondern über die Überdeckung.
 * ════════════════════════════════════════════════════════════════════════════ */
export function rohrende(ctx, o = {}) {
  const N = "rohrende";
  const an = braucht(o, "an", N);          /* {punkt, achse} — wo der Schlauch/das Rohr ansetzt */
  const mat = braucht(o, "mat", N);        /* {rohr, bund, mutter} */
  const { THREE, V, put, mm } = ctx;

  const dNippel = o.nippelMM || 33.5, lNippel = o.nippelLaengeMM || 85.3;
  const dBund = dNippel * 1.27, lBund = 15.2;
  const dMutter = dNippel * 1.67, lMutter = o.mutterLaengeMM || 39.6;
  const dBoerdel = dNippel * 1.36, lBoerdel = 12.2;
  dick(ctx, N, lBoerdel);

  const p = an.punkt, a = (an.achse || V(0, 1, 0)).clone().normalize();
  const rot = o.rot || null;
  const g = [];
  const setz = (geo, m, t) => g.push(put(geo, m, p.clone().addScaledVector(a, mm(t)), rot, { keepUV: true }));

  setz(new THREE.CylinderGeometry(mm(dNippel) / 2, mm(dNippel) / 2, mm(lNippel), 16), mat.rohr, -lNippel / 2);
  setz(new THREE.CylinderGeometry(mm(dBund) / 2, mm(dBund) / 2, mm(lBund), 6), mat.bund, -lBund / 2 - 2);
  /* Die Überwurfmutter sitzt MITTIG auf der Fuge und greift nach beiden Seiten.
     Genau das ist ihr Zweck — und genau das fehlte. */
  setz(new THREE.CylinderGeometry(mm(dMutter) / 2, mm(dMutter) / 2, mm(lMutter), 6), mat.mutter, 0);
  setz(new THREE.CylinderGeometry(mm(dBoerdel) / 2, mm(dBoerdel) / 2, mm(lBoerdel), 16), mat.mutter, lMutter / 2 + lBoerdel / 2 - 2);

  ctx.wsrc(p.clone(), mm(dMutter) * 0.9, o.pri ?? 1);

  const b = {
    teile: {
      [o.name + ".rohrpaket"]: { box: null, bei: [p.x, p.y, p.z], r: mm(Math.max(lNippel, lMutter) * 1.2), nicht: o.schlauchMat },
      [o.name + ".gegenstueck"]: { bei: [p.x, p.y, p.z], r: mm(lMutter * 1.6), mat: o.schlauchMat }
    },
    pruefungen: [{
      id: o.name + "-verschraubung-greift-ueber",
      art: "greiftUeber",
      a: o.name + ".rohrpaket", b: o.name + ".gegenstueck",
      achse: o.achse || "y",
      /* die Hälfte der Mutterlänge — aus dem Bauteil abgeleitet, nicht auf ein
         Ergebnis gepasst */
      mindestens: mm(lMutter * 0.5),
      warum: "Eine Ueberwurfmutter beruehrt das Rohr nicht, sie greift ueber es. Ohne Ueberdeckung liest sich der Stutzen als offenes Rohrende."
    }]
  };
  ctx.beruehrungen.push(b);
  return { geo: g, beruehrungen: b, masseMM: { nippel: dNippel, mutter: lMutter, kleinste: lBoerdel } };
}

/* ════════════════════════════════════════════════════════════════════════════
 * 3  KREUZSCHLITZSCHRAUBE
 *
 * HERKUNFT  ref-a-electric Z1549–1559. Der Kommentar dort ist die Regel:
 *           "Ein Zylinder ohne Schlitz ist keine Schraube, er ist ein Zylinder."
 * VORKOMMEN 7 von 7 Seiten bauen Schrauben — aber nur 3 bauen einen Schlitz
 *           (ref-a, demo-produkt, demo-produkt-en). Die vier anderen setzen genau
 *           die Zylinder, vor denen der Kommentar warnt: ref-b Z2302/Z2323/Z2228,
 *           ref-d Z1911/Z1758/Z1927, ref-c Z1744, portfolio Z1668.
 * MASSE     Linsenkopf   Ø 12,3 → 13,8 mm, Höhe 3,2 mm
 *           Kreuzschlitz 2 × 9,6 × 1,66 × 1,72 mm  ← die kritische Abmessung
 *           Neigung      ± 0,08 rad je Stück, Tiefenstreuung 0,5 mm
 * ⚠️ 1,66 mm ist der Grenzfall: knapp über MIN_MM. Bei Stationsabstand ist der
 *    Schlitz das Erste, was zur gestrichelten Linie wird. Wer den Kopf
 *    verkleinert, muss den Schlitz MITverkleinern — und landet dann darunter.
 *    Deshalb wirft diese Fabrik, statt still einen Zylinder zu liefern.
 * ════════════════════════════════════════════════════════════════════════════ */
export function kreuzschlitzschraube(ctx, o = {}) {
  const N = "kreuzschlitzschraube";
  const an = braucht(o, "an", N);          /* {punkt, normale} — die Fläche, in der sie sitzt */
  const mat = braucht(o, "mat", N);
  const { THREE, V, put, mm, RB } = ctx;

  const dKopf = o.kopfMM || 12.3;
  const hKopf = dKopf * 0.26;
  const lSchlitz = dKopf * 0.78, bSchlitz = dKopf * 0.135, tSchlitz = dKopf * 0.14;
  dick(ctx, N, bSchlitz);

  const p = an.punkt.clone(), n = (an.normale || V(0, 1, 0)).clone().normalize();
  /* Von Hand eingedreht: jede Schraube steht ein wenig anders. Ohne diese
     Streuung liest sich eine Reihe Schrauben als Raster, nicht als Arbeit. */
  const kipp = o.kipp === undefined ? (Math.random() - 0.5) * 0.16 : o.kipp;
  const dreh = o.dreh === undefined ? Math.random() * Math.PI : o.dreh;
  const tiefe = (o.tiefeStreuung === undefined ? (Math.random() - 0.5) * 1.0 : o.tiefeStreuung);
  const rot = o.rot || [kipp, dreh, 0];
  const g = [];

  g.push(put(new THREE.CylinderGeometry(mm(dKopf) / 2, mm(dKopf * 1.12) / 2, mm(hKopf), 16),
    mat, p.clone().addScaledVector(n, mm(tiefe)), rot, { keepUV: true }));
  for (const d of [0, Math.PI / 2]) {
    g.push(put(RB
      ? RB(mm(lSchlitz), mm(bSchlitz), mm(tSchlitz), mm(0.3), 1)
      : new THREE.BoxGeometry(mm(lSchlitz), mm(bSchlitz), mm(tSchlitz)),
      mat, p.clone().addScaledVector(n, mm(tiefe + hKopf * 0.45)), [rot[0], rot[1] + d, rot[2]], { keepUV: true }));
  }
  /* Schwerkraft: unter jedem Schraubenkopf zieht es nach unten. */
  ctx.wsrc(p.clone().addScaledVector(n, mm(hKopf * 0.4)), mm(dKopf * 1.6), o.pri ?? 0);

  return { geo: g, masseMM: { kopf: dKopf, schlitz: bSchlitz }, kipp, dreh };
}

/* ════════════════════════════════════════════════════════════════════════════
 * 4  KONSOLE / WINKEL — als GESCHLOSSENE KETTE
 *
 * HERKUNFT  ref-c-plumbing `hanger()` Z1625–1630, sechsmal aufgerufen (Z1631).
 *           Die einzige Konsole im Bestand, die eine lückenlose Kette bildet:
 *           Betondecke → Flansch → Stange → Spaltring → Rohr.
 *           Dazu portfolio Z1955 (Standoff-Konsole) mit dem Kommentar
 *           "ohne ihn sprießen die Arme aus der Luft".
 * VORKOMMEN 7 von 7 Seiten. Zwei davon enden nachweislich frei:
 *           ref-c Z1575–1590 (Regalstrebe) und ref-d Z2117–2119
 *           (Kühlschrankböden ohne Auflager).
 * NACHGEMESSEN (beruehrung.mjs, ref-c, 21.09.2026):
 *           alter Stand  vorderes Strebenende ↔ Träger  79,9 mm Luft
 *           heutiger     dito                           71,0 mm Luft  ← noch offen
 * MASSE     Flansch    Ø 33,5 mm, Dicke 6,1 mm
 *           Stange     Ø 7,3 mm
 *           Spaltring  Draht Ø 4,9 mm
 *           Lasche     7,3 mm breit
 *           kleinste tragende Abmessung: 4,9 mm
 * ⛔ DIE REGEL: Eine Konsole wird aus ZWEI PUNKTEN gebaut, nie aus Mitte +
 *    Winkel + Länge. Genau die Mitte-Winkel-Länge-Form hat am 21.09. beide
 *    Enden in die Luft gestellt — und ein falsches Vorzeichen am Drehwinkel
 *    fällt dabei nicht auf. Diese Fabrik nimmt `von` und `bis`.
 * ════════════════════════════════════════════════════════════════════════════ */
export function konsole(ctx, o = {}) {
  const N = "konsole";
  const von = braucht(o, "von", N);        /* Punkt im Anker (Wand, Decke, Winkel) */
  const bis = braucht(o, "bis", N);        /* Punkt im getragenen Teil */
  const mat = braucht(o, "mat", N);
  const { THREE, V, put, mm, bar } = ctx;

  const dStange = o.stangeMM || 7.3;
  const bFlach = o.flachMM || 23, tFlach = o.flachDickeMM || 9;
  dick(ctx, N, Math.min(dStange, tFlach));

  /* ⚠️ Die Strebe wird ABSICHTLICH länger gemacht als der Abstand der beiden
     Punkte: sie muss an beiden Enden ein Stück EINDRINGEN, sonst steht sie
     bündig davor und die Fuge ist bei Stationsabstand ein weisser Strich.
     Übermass aus ref-c Z1590: dort 0,56 statt 0,517, also rund 8 %. */
  const ueber = o.uebermass === undefined ? 0.08 : o.uebermass;
  const richtung = bis.clone().sub(von);
  const laenge = richtung.length();
  if (!(laenge > 0)) throw new Error("bauteile/konsole: `von` und `bis` sind derselbe Punkt.");
  const a = von.clone().addScaledVector(richtung, -ueber / 2 / laenge * laenge / laenge);
  const A = von.clone().sub(richtung.clone().multiplyScalar(ueber / 2 / laenge));
  const B = bis.clone().add(richtung.clone().multiplyScalar(ueber / 2 / laenge));

  const g = [];
  if (bar) {
    g.push(bar(A, B, mm(tFlach) / 2, mat, { sq: mm(bFlach) / 2 }));
  } else {
    const mitte = A.clone().add(B).multiplyScalar(0.5);
    const geo = new THREE.BoxGeometry(mm(bFlach), A.distanceTo(B), mm(tFlach));
    const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), B.clone().sub(A).normalize());
    g.push(put(geo, mat, null, null, { m: new THREE.Matrix4().compose(mitte, q, V(1, 1, 1)), keepUV: true }));
  }
  ctx.wsrc(von.clone(), mm(bFlach) * 1.4, o.pri ?? 0);

  const r = mm(Math.max(bFlach, tFlach)) * 1.6;
  const b = {
    teile: {
      [o.name + ".ende.anker"]: { bei: [von.x, von.y, von.z], r },
      [o.name + ".ende.last"]: { bei: [bis.x, bis.y, bis.z], r }
    },
    pruefungen: [
      {
        id: o.name + "-sitzt-im-anker", art: "beruehrt",
        a: o.name + ".ende.anker", b: o.ankerTeil || (o.name + ".anker"),
        max: mm(1), warum: "Eine Konsole ohne Anker ist ein Strich."
      },
      {
        id: o.name + "-traegt-die-last", art: "beruehrt",
        a: o.name + ".ende.last", b: o.lastTeil || (o.name + ".last"),
        max: mm(1), warum: "Das vordere Ende muss das Getragene erreichen — sonst hoert die Konsole unter ihm auf."
      }
    ]
  };
  ctx.beruehrungen.push(b);
  return { geo: g, beruehrungen: b, von: A, bis: B, masseMM: { flach: bFlach, dicke: tFlach } };
}

/* ════════════════════════════════════════════════════════════════════════════
 * 5  SCHELLE / HALBSCHELLE
 *
 * HERKUNFT  ref-a-electric `staple()` Z1432–1433 (Halbring über dem Kabel auf dem
 *           Riegel), ref-c Z1628 (Spaltring im hanger), portfolio Z1692
 *           (Rinnenhalter, Raster 2,67 ft = 32 in).
 * VORKOMMEN 7 von 7 Seiten. Eine endet nachweislich frei: ref-d Z1708
 *           (Flachstecker ohne Gegenstecker).
 * MASSE     Halbring ref-a        Ø 19,2 mm, Draht Ø 2,7 mm   ← dünnstes Teil
 *           Spaltring ref-c  Draht Ø 4,9 mm
 *           Rinnenhalter port. 30,5 × 27,4 × 134 mm
 *           Schellenband ref-d  Dicke 4,0 mm, Breite 10 mm
 * ⚠️ 2,7 mm Draht ist bei Stationsabstand knapp. Die Fabrik rechnet den
 *    Drahtdurchmesser aus dem UMSCHLOSSENEN Durchmesser (14 %) und wirft, wenn
 *    das Ergebnis unter MIN_MM fällt — statt einen Haarstrich zu liefern.
 * ⛔ DIE REGEL: Eine Schelle ohne das Ding, das sie hält, ist Schmuck. Die
 *    Fabrik verlangt `umschliesst` und legt den Ring um genau diesen Radius.
 * ════════════════════════════════════════════════════════════════════════════ */
export function schelle(ctx, o = {}) {
  const N = "schelle";
  const um = braucht(o, "umschliesst", N); /* {punkt, radius (Weltmass), achse} */
  const mat = braucht(o, "mat", N);
  const { THREE, V, put, mm, inMM } = ctx;

  const rInnen = um.radius;
  const dDraht = Math.max(o.drahtMM || inMM(rInnen * 2) * 0.14, 0);
  dick(ctx, N, dDraht);

  const halb = o.halb !== false;
  const a = (um.achse || V(1, 0, 0)).clone().normalize();
  const sVor = (um.seite || o.seite || V(0, -1, 0)).clone().normalize();
  /* ⛔ 22.09.2026, zweiter Fund beim ersten echten Einbau: die Lage des HALBEN Rings war
     dem Zufall ueberlassen. setFromUnitVectors((0,0,1), achse) legt die Torusachse richtig,
     aber die Drehung UM diese Achse ist damit unbestimmt — und TorusGeometry mit arc = PI
     baut immer die Haelfte auf der lokalen +Y-Seite. In ref-a-electric zeigte die Haelfte
     dadurch in den Staender hinein: im Bild lagen links und rechts des Kabels zwei
     Stummel, und der Buegel darueber fehlte. Eine Schelle, deren Buegel im Untergrund
     steckt, haelt genauso wenig wie eine ohne Buegel.
     Jetzt wird die ganze Basis gesetzt: z' = Achse, y' = WEG vom Untergrund, x' = y' x z'. */
  const zB = a.clone();
  let yB = sVor.clone().negate();
  yB.addScaledVector(zB, -yB.dot(zB));                 /* auf die Ringebene projizieren */
  if (yB.lengthSq() < 1e-6) yB = Math.abs(zB.y) < 0.9 ? V(0, 1, 0) : V(1, 0, 0);
  yB.normalize();
  const xB = yB.clone().cross(zB).normalize();
  const mB = new THREE.Matrix4().makeBasis(xB, yB, zB).setPosition(um.punkt);
  const g = [];
  g.push(put(new THREE.TorusGeometry(rInnen + mm(dDraht) / 2, mm(dDraht) / 2, 6, halb ? 12 : 20, halb ? Math.PI : Math.PI * 2),
    mat, null, null, { m: mB, keepUV: true }));
  /* Die beiden Schenkel, die sie am Untergrund festmachen — ohne sie schwebt
     der Ring um das Rohr herum und hält nichts. */
  if (halb) {
    const s = sVor;
    /* ⛔ 22.09.2026, beim ERSTEN echten Einbau in ref-a-electric gefunden: die Schenkel
       standen hier als Euler [atan2(s.z, s.y) + PI/2, 0, 0], also als Drehung NUR um x.
       Das trifft `seite` in der y-z-Ebene und ist fuer jede seitliche Befestigung falsch:
       bei seite = (-1,0,0) — eine Schelle an der Staenderflanke, der haeufigste Fall im
       Holzbau — zeigte atan2(0,0) = 0, die Schenkel standen also entlang z statt zum
       Staender hin und hingen neben dem Holz in der Luft. Genau die Fehlerklasse, gegen
       die dieser Katalog gebaut wurde, im Katalog selbst.
       Jetzt: Quaternion von der Zylinderachse (0,1,0) auf `seite` — gilt in jeder Lage. */
    const qs = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), s);
    for (const vz of [-1, 1]) {
      const p = um.punkt.clone().addScaledVector(a.clone().cross(s).normalize(), vz * (rInnen + mm(dDraht) / 2));
      g.push(put(new THREE.CylinderGeometry(mm(dDraht) / 2, mm(dDraht) / 2, mm(dDraht) * 3.2, 6),
        mat, null, null,
        { m: new THREE.Matrix4().compose(p.clone().addScaledVector(s, mm(dDraht) * 1.6), qs, V(1, 1, 1)), keepUV: true }));
    }
  }
  ctx.wsrc(um.punkt.clone(), rInnen * 2.2, o.pri ?? 0);

  const b = {
    teile: {
      [o.name + ".ring"]: { bei: [um.punkt.x, um.punkt.y, um.punkt.z], r: rInnen * 2.4, mat: o.mats }
    },
    pruefungen: [{
      id: o.name + "-umschliesst-wirklich",
      art: "beruehrt",
      a: o.name + ".ring", b: o.gehaltenesTeil || (o.name + ".gehalten"),
      max: mm(0.5),
      warum: "Eine Schelle, die das Rohr nicht beruehrt, ist Schmuck."
    }]
  };
  ctx.beruehrungen.push(b);
  return { geo: g, beruehrungen: b, masseMM: { draht: dDraht } };
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Sammelt alle angemeldeten Berührungen zu einem fertigen Vertragsrumpf für
 * werkzeuge/vertraege/<seite>.beruehrung.mjs. Damit wird Auftrag 1 und Auftrag 3
 * dieselbe Sache: was gebaut wird, meldet sich selbst zur Prüfung an.
 * ─────────────────────────────────────────────────────────────────────────── */
export function vertragsrumpf(ctx, kopf = {}) {
  const teile = {}, pruefungen = [];
  for (const b of ctx.beruehrungen) {
    Object.assign(teile, b.teile);
    pruefungen.push(...b.pruefungen);
  }
  return { ...kopf, teile, pruefungen };
}
