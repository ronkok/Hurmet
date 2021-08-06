import { dt } from "./constants";
import { addTextEscapes } from "./utils"

const errorMessages = Object.freeze({
  EN: {
    ERROR:     "Error. Hurmet does not understand the expression.",
    ERR_FUNC:  "@",
    BAD_FUN_NM:"Error. Unrecognized function name \"@\".",
    DIV:       "Error. Divide by zero.",
    NAN:       "Error. Value of $@$ is not a numeric.",
    NANARG:    "Error. Argument to function $@$ must be numeric.",
    NULL:      "Error. Missing value for $@$.", // $@$ will be italic in TeX
    V_NAME:    "Error. Variable $@$ not found.",
    F_NAME:    "Error. Function @ not found.",
    NAN_OP:    "Error. Arithmetic operation on a non-numeric value.",
    UNIT_ADD:  "Error. Adding incompatible units.",
    UNIT_COMP: "Error. Comparing incompatible units.",
    UNIT_RES:  "Error. Calculated units are not compatible with the desired result unit:",
    UNIT_MISS: "Error. No units specified for the result.",
    UNIT_IN:   "Error. Incorrect unit for input to function @.",
    UNIT_ARG:  "Error. Unit mis-match between arguments to function @.",
    UNIT_COL:  "Error. Data frame column @ has no units. Do not make a unit-aware call to it.",
    DATE:      "Error. Date required.",
    LOGIC:     "Error. Logic operation “@” on a non-boolean value.",
    FACT:      "Error. Factorial may be applied only to a unit-less non-negative integer.",
    PER:       "Error. Percentage may be applied only to a unit-less number.",
    BINOM:     "Error. Binomial may be applied only to unit-less numbers.",
    LOGF:      "Error. Argument to log!() must be a non-negative integer.",
    Γ0:        "Error. Γ(0) is infinite.",
    ΓPOLE:     "Error. Γ() of a negative integer is infinite.",
    LOGΓ:      "Error. Argument to Hurmet logΓ() must be a positive number.",
    TAN90:     "Error. tan($@$) is infinite.",
    ATRIG:     "Error. Input to @ must be between -1 and 1.",
    COT:       "Error. Input to @ must not be zero.",
    ASEC:      "Error. Absolute value of input to @ must be ≥ 1",
    STRING:    "Error. Text operand required.",
    NUMARGS:   "Error. Wrong number of arguments passed to function @.",
    NONSQUARE: "Error. Only a square matrix can be inverted.",
    SINGULAR:  "Error. Matrix is singular and cannot be inverted.",
    BAD_ROW_NAME:     "Error. Data frame does not have a row named @.",
    BAD_COLUMN_NAME:  "Error. Data frame does not have a column named @.",
    SINGLE_ARG:"Error. A call to a data frame must have two arguments in the brackets.",
    BAD_TYPE:  "Error. Unrecognized data type for $@$.",
    CONCAT:    "Error. Cannot add strings. Use \"&\" if concatenation is desired.",
    MATRIX_DIV:"Error. Cannot divide one matrix by another.",
    MATRIX_MOD:"Error. Cannot take the modulo of one matrix by another.",
    BAD_INDEX: "Error. Index to a matrix must be numeric.",
    FUNC_LINE: "Error in function @.",
    BAD_BREAK: "Error in function @. break called outside of a loop",
    FETCH:     "Error. A fetch() function must be the only item in its expression.",
    STR_INDEX: "Error. The index to text may be only a real number or a range.",
    UNIT_NAME: "Error. Unrecognized unit name: @",
    INT_NUM:   "Error. Number display type \"@\" must be an integer.",
    TWO_MAPS:  "Error. Both operands are maps. Hurmet accepts only one.",
    BAD_FORMAT:"Error. Invalid format @.",
    BAD_PREC:  "Error. Significant digit specification must be between 1 and 15.",
    ZERO_ROOT: "Error. Zeroth root.",
    BAD_ROOT:  "Error while taking root.",
    UNREAL:    "Error. Argument to function \"@\" must be a real number.",
    BIGINDEX:  "Error. Index too large.",
    MIS_ELNUM: "Error. Mis-matched number of elements",
    // eslint-disable-next-line max-len
    CROSS:     "Error. Cross product can be performed only on three-vectors. Use * if you want element-wise multiplication.",
    QUANT_NUM: "Error. A Quantity must include a numeric magnitude.",
    CURRENCY:  "Error. Currency exchange rates must be defined before using a monetary unit.",
    DF_UNIT:   "Invalid unit \"&\" in data frame.",
    FORM_FRAC: "Error. Hurmet can do binary or hexadecimal format only on integers.",
    PRIVATE:   "Error. Function @ is not private.",
    GCD:       "Error. The gcd function can take only integers as arguments.",
    BAD_KEY:   "Error. Dictionary does not contain key \"@\".",
    NUM_KEY:   "Error. A key must be a string, not a number.",
    IMMUT_UDF: `Error. Variable @ already contains a user-defined function.
                Hurmet cannot assign a different value to @.`,
    NO_PROP:   `Error. Cannot call a property from variable "@" because it has no properties.`,
    NOT_ARRAY: `Error. Cannot check if an element is in the second operand because
 the second operand is not an array.`,
    MULT_MIS:  "Error. Mismatch in number of multiple assignment.",
    COUNT:     "Error. The count() function works only on strings.",
    NOT_VECTOR:"Error. Arguments to dataframe() must be vectors.",
    BAD_DISPLAY:"Error. Result may not be suppressed. Use '?' display selector.",
    NA_COMPL_OP:"Error. \"@\" cannot be performed on a complex number.",
    NA_REAL:    "Error. \"@\" can be performed only a complex number.",
    ORIGIN:     "Error. Function \"@\" is undefined at the origin.",
    LOG_ZERO:   "Error. Logarithm of zero is negative infinity."
  }
})

export const errorOprnd = (errorCode, messageInsert) => {
  if (errorCode === "") { return { value: "Error", unit: null, dtype: dt.ERROR } }
  let msg = errorMessages["EN"][errorCode]
  if (msg === undefined) { return { value: "Error", unit: null, dtype: dt.ERROR } }
  if (messageInsert) {
    messageInsert = addTextEscapes(messageInsert)
    msg = msg.replace(/@/g, messageInsert)
  } else {
    msg = msg.replace(/@ ?/, "")
  }
  return { value: msg, unit: null, dtype: dt.ERROR }
}
