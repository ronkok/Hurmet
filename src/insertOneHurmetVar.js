import { parse } from "./parser"
import { dt } from "./constants"
import { clone, unitTeXFromString } from "./utils"
import { format } from "./format"
import { Rnl } from "./rational"
import { isMatrix, Matrix } from "./matrix"
import { errorOprnd } from "./error"

export function insertOneHurmetVar(hurmetVars, attrs, changedVars, decimalFormat) {
  // hurmetVars is a key:value store of variable names and attributes.
  // This function is called to insert an assignment into hurmetVars.
  const formatSpec = hurmetVars.format ? hurmetVars.format.value : "h15"

  if (!Array.isArray(attrs.name)) {
    // This is the typical case.
    hurmetVars[attrs.name] = attrs
    if (changedVars) {
      changedVars.add(attrs.name)
    }

  } else if (attrs.value === null) {
    for (let i = 0; i < attrs.name.length; i++) {
      hurmetVars[attrs.name[i]] = { value: null }
    }

  } else if (isMatrix(attrs)) {
    // Assign to a matrix of names
    const isQuantity = Boolean(attrs.dtype & dt.QUANTITY)
    let resultDisplay = attrs.resultdisplay
    resultDisplay = resultDisplay.replace(/\\(begin|end){[bp]matrix}/g, "").trim()
    const displays = resultDisplay.split(/&|\\\\/)
    if (attrs.dtype & dt.MATRIX) {
      // A 2 dimensional matrix.
      const dtype = attrs.dtype - dt.MATRIX
      const numRows = isQuantity ? attrs.value.plain.length : attrs.value.length
      const numCols = attrs.name.length / numRows
      let iName = 0
      for (let i = 0; i < numRows; i++) {
        for (let j = 0; j < numCols; j++) {
          const value = isQuantity
            ? { plain: attrs.value.plain[i][j], inBaseUnits: attrs.value.inBaseUnits[i][j] }
            : attrs.value[i][j]
          hurmetVars[attrs.name[i]] = {
            name: attrs.name[iName],
            value,
            resultdisplay: isQuantity
              ? parse(displays[iName].trim() + " '" + attrs.unit + "'")
              : displays[iName].trim(),
            expos: attrs.expos,
            unit: isQuantity ? attrs.unit : undefined,
            dtype
          }
          if (changedVars) { changedVars.add(attrs.name[i]) }
          iName += 1
        }
      }
    } else {
      // Assign to a vector of names.
      const isColumn = Boolean(attrs.dtype & dt.COLUMNVECTOR)
      const dtype = attrs.dtype - (isColumn ? dt.COLUMNVECTOR : dt.ROWVECTOR)
      for (let i = 0; i < attrs.name.length; i++) {
        const value = isQuantity
          ? { plain: attrs.value.plain[i], inBaseUnits: attrs.value.inBaseUnits[i] }
          : attrs.value[i]
        hurmetVars[attrs.name[i]] = {
          name: attrs.name[i],
          value,
          resultdisplay: isQuantity
            ? parse(displays[i].trim() + " '" + attrs.unit + "'")
            : displays[i].trim(),
          expos: attrs.expos,
          unit: isQuantity ? attrs.unit : undefined,
          dtype
        }
        if (changedVars) { changedVars.add(attrs.name[i]) }
      }
    }

  // From this point forward, we're dealing with multiple assignment
  } else if (attrs.dtype & dt.MAP) {
    const unit = attrs.unit
    const unitName = unit && unit.name ? unit.name : undefined
    const dtype = attrs.dtype - dt.MAP
    let i = 0
    if (attrs.dtype & dt.QUANTITY) {
      for (const value of attrs.value.data.plain) {
        const result = {
          value: { plain: value },
          expos: attrs.expos,
          factor: attrs.factor,
          dtype
        }
        result.resultdisplay = format(value, formatSpec, decimalFormat)
        if (unitName) { result.resultdisplay += " " + unitTeXFromString(unitName) }
        hurmetVars[attrs.name[i]] = result
        if (changedVars) { changedVars.add(attrs.name[i]) }
        i += 1
      }
      i = 0
      for (const value of attrs.value.data.inBaseUnits) {
        hurmetVars[attrs.name[i]].value.inBaseUnits = value
        i += 1
      }
    } else {
      for (const value of attrs.value.data) {
        const result = { value, expos: attrs.expos, factor: attrs.factor, dtype }
        result.resultdisplay = Rnl.isRational(value)
          ? format(value, formatSpec, decimalFormat)
          : String(value)
        if (unitName) { result.resultdisplay += " " + unitTeXFromString(unitName) }
        hurmetVars[attrs.name[i]] = result
        if (changedVars) { changedVars.add(attrs.name[i]) }
        i += 1
      }
    }
  } else if (attrs.dtype === dt.DATAFRAME) {
    const isSingleRow = attrs.value.data[0].length === 1
    for (let i = 0; i < attrs.name.length; i++) {
      let dtype = attrs.value.dtype[i]
      let value = isSingleRow ? undefined : [];
      for (let j = 0; j < attrs.value.data[0].length; j++) {
        const datum = attrs.value.data[i][j]
        const val = (dtype & dt.RATIONAL) ? Rnl.fromString(datum) : datum
        if (isSingleRow) {
          value = val
        } else {
          value.push(val)
        }
      }
      if (!isSingleRow) { dtype += dt.COLUMNVECTOR }
      const result = {
        value,
        unit: attrs.unit[attrs.value.units[i]],
        dtype
      }
      if ((dtype & dt.RATIONAL) && isSingleRow) {
        result.resultdisplay = parse(format(value))
      } else if (dtype & dt.RATIONAL) {
        result.resultdisplay = Matrix.display({ value, dtype }, formatSpec, decimalFormat)
            + parse(`'${attrs.value.units[i]}'`)
      } else {
        result.resultdisplay = parse(value)
      }
      if (attrs.value.units[i]) {
        result.value = { plain: result.value }
        const unit = attrs.unit[attrs.value.units[i]]
        result.value.inBaseUnits = isSingleRow
          ? Rnl.multiply(Rnl.add(result.value.plain, unit.gauge), unit.factor)
          : result.value.plain.map(e => Rnl.multiply(Rnl.add(e, unit.gauge), unit.factor))
        result.expos = unit.expos
      }

      hurmetVars[attrs.name[i]] = result
      if (changedVars) { changedVars.add(attrs.name[i]) }
    }
  } else if (attrs.dtype === dt.TUPLE) {
    let i = 0
    for (const value of attrs.value.values()) {
      hurmetVars[attrs.name[i]] = value
      if (changedVars) { changedVars.add(attrs.name[i]) }
      i += 1
    }
  } else if (attrs.dtype === dt.MODULE) {
    if (attrs.name.length !== attrs.value.length) {
      return errorOprnd("MULT_MIS")
    } else {
      let i = 0
      for (const value of attrs.value.values()) {
        const result = clone(value)
        hurmetVars[attrs.name[i]] = result
        if (changedVars) { changedVars.add(attrs.name[i]) }
        i += 1
      }
    }
  } else {
    // TODO: Return an error
  }
}
