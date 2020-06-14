import { clone } from "./utils"
import { dt, allZeros } from "./constants"
import { Matrix } from "./matrix"
import { unitFromUnitName } from "./units"
import { isMatrix } from "./matrix"
import { map } from "./map"
import { Rnl } from "./rational"

/*  This module, like prepareStatement.js, is called only when
 *  (1) an author submits a Hurmet calculation dialog box, or
 *  (2) when a new document is opened, or (3) when recalculate-all is called.
 *  Here we process literal values of assignment statements.
 */

export const prepareResult = (attrs, vars) => {
  if (attrs.name && attrs.value && (attrs.dtype & dt.QUANTITY)) {
    // Assignment of a quantity. Get it in base units
    const unit = (attrs.unit === undefined)
      ? {
        name: "",
        factor: Rnl.one,
        gauge: Rnl.zero,
        log: "",
        expos: allZeros
      }
      : typeof attrs.unit === "string"
      ? unitFromUnitName(attrs.unit, vars)
      : attrs.unit // unit from a MAP is already expanded.

    if (unit.dtype && unit.dtype === dt.ERROR) {
      attrs.tex += "\u00a0\\color{firebrick}{\\text{" + unit.value + "}}"
      attrs.alt += unit.value
      return attrs
    }

    attrs.expos = unit.expos
    if (Rnl.isRational(attrs.value)) {
      attrs.value = {
        plain: attrs.value,
        inBaseUnits: Rnl.multiply(Rnl.add(attrs.value, unit.gauge), unit.factor)
      }
    } else if (isMatrix(attrs)) {
      attrs.value = {
        plain: attrs.value,
        inBaseUnits: Matrix.convertToBaseUnits(attrs, unit.gauge, unit.factor)
      }
    } else if (attrs.dtype & dt.MAP) {
      const plain = clone(attrs.value)
      const inBaseUnits = map.convertToBaseUnits(plain, unit.gauge, unit.factor)
      attrs.value = { plain, inBaseUnits }

    } else if (attrs.dtype & dt.DICT) {
      attrs.unit = {}
      for (const property in attrs.value) {
        if (!attrs.unit[property.unit]) {
          attrs.unit[property.unit] = unitFromUnitName(property.unit, vars)
        }
      }
    }
  }
  if (attrs.rpn && !attrs.value) {
    if (attrs.unit) {
      const unit = (attrs.unit)
        ? unitFromUnitName(attrs.unit, vars)
        : { factor: 1, gauge: 0, expos: allZeros }
      // We save factor and gauge with the cell attrs so that the result of
      // a later calculation can be converted into the desired display units.
      attrs.factor = unit.factor
      attrs.gauge = unit.gauge
      attrs.expos = unit.expos
    }
  }

}
