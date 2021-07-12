 // unit exponents of a number with no unit.
export const allZeros = Object.freeze([0, 0, 0, 0, 0, 0, 0, 0])

// Data types
// Some operands will be two types at the same time, e.g. RATIONAL + MATRIX.
// So we'll enumerate data types in powers of two.
// That way, we can use a bit-wise "&" operator to test for an individual type.
export const dt = Object.freeze({
  NULL: 0,
  RATIONAL: 1,
  COMPLEX: 2, //   Not currently used.
  BOOLEAN: 4,
  FROMCOMPARISON: 8,
  BOOLEANFROMCOMPARISON: 12, // 4 + 8, useful for chained comparisons
  STRING: 16,
  QUANTITY: 32, // Contains both a magnitude and a unit-of-measure
  DATE: 64, //     Not currently used
  RANGE: 128, //   as in:  1:10
  TUPLE: 256, //   Not currently used.
  DICT: 512, //    Dictionary
  MAP: 1024,  //   A dictionary whose values are all the same data type and carry the same unit
  ROWVECTOR: 2048,
  COLUMNVECTOR: 4096,
  MATRIX: 8192, // two dimensional
  DATAFRAME: 16384,
  MODULE: 32768, // contains user-defined functions
  ERROR: 65536,
  UNIT: 131072, // User-defined units.
  IMAGE: 262144,
  RICHTEXT: 524288
})
