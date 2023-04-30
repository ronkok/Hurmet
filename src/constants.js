 // unit exponents of a number with no unit.
export const allZeros = Object.freeze([0, 0, 0, 0, 0, 0, 0, 0])

// Data types
// Some operands will be two types at the same time, e.g. RATIONAL + MATRIX.
// So we'll enumerate data types in powers of two.
// That way, we can use a bit-wise "&" operator to test for an individual type.
export const dt = Object.freeze({
  NULL: 0,
  RATIONAL: 1,
  COMPLEX: 2,
  BOOLEAN: 4,
  FROMCOMPARISON: 8,
  BOOLEANFROMCOMPARISON: 12, // 4 + 8, useful for chained comparisons
  STRING: 16,
  QUANTITY: 32, // Contains both a magnitude and a unit-of-measure
  DATE: 64, //     Not currently used
  RANGE: 128, //   as in:  1:10
  TUPLE: 256, //   Used for multiple assignment from a module.
  MAP: 512,  //    A key:value store with all the same data type the same unit
  ROWVECTOR: 1024,
  COLUMNVECTOR: 2048,
  MATRIX: 4096, // two dimensional
  DATAFRAME: 8192,
  MODULE: 16384, // contains user-defined functions
  ERROR: 32768,
  UNIT: 65536, // User-defined units.
  DRAWING: 131072,
  RICHTEXT: 262144,
  DICTIONARY: 524288
})
