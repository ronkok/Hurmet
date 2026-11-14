// unitAliases.js

// Recognizes the same length-unit spellings Hurmet does, so a shape-library
// author (or a Hurmet user) can write "inch" or "centimeter" and have Sketch
// treat it the same as its own short keys ("in", "cm" — see
// utils.unitScaleFactors). Derived from units.js (Hurmet's own unit table,
// kept at the project root as reference data — not a runtime dependency of
// Sketch itself) plus Hurmet's metric-prefix rule: a unit flagged "siSymbol"
// takes a symbol prefix ("c"+"m" -> "cm"); one flagged "siWord" takes a
// word prefix ("centi"+"meter" -> "centimeter"). Only "m"/"meter"/"metre"
// carry those flags among the units Sketch cares about, so mm/cm/km are the
// only prefixed forms here.
//
// "pt" isn't yet in Hurmet's own unit table; it's included here as an alias
// for "point"/"Adobe point" (the 1/72-inch PostScript point — the exact
// value Sketch's own "pt" already means) at the project maintainer's
// direction, pending Hurmet adding it.
//
// This table only maps alternate spellings to Sketch's canonical keys; it
// does not repeat those canonical keys themselves; callers should check
// utils.unitScaleFactors directly first (see resolveUnit below). Plural
// spellings (Hurmet accepts most of them) are deliberately not included —
// shape-library files should not be written with plural unit names.

const unitAliases = Object.freeze({
  in: ['inch', '″'],
  ft: ['foot', 'feet', 'lf', '′'],
  mile: ['mi'],
  m: ['meter', 'metre'],
  mm: ['millimeter', 'millimetre'],
  cm: ['centimeter', 'centimetre'],
  km: ['kilometer', 'kilometre'],
  pt: ['point', 'Adobe point']
  // px has no known synonyms.
})

const aliasToCanonical = Object.freeze(
  Object.entries(unitAliases).reduce((table, [canonical, aliases]) => {
    aliases.forEach(alias => { table[alias] = canonical })
    return table
  }, {})
)

// Given a unit spelling that ISN'T already one of Sketch's own canonical
// keys, return the canonical key it's an alias for — or null if it's not a
// recognized alias either. Callers should check utils.unitScaleFactors[name]
// directly first; this only covers the alternate spellings.
export function resolveUnit(name) {
  return aliasToCanonical[name] || null
}
