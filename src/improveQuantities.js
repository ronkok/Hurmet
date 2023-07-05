import { dt, allZeros } from "./constants"
import { Matrix } from "./matrix"
import { unitFromUnitName } from "./units"
import { isMatrix } from "./matrix"
import { map } from "./map"
import { Rnl } from "./rational"

/*  This module, like prepareStatement.js, is called only when
 *  (1) an author submits a Hurmet calculation dialog box, or
 *  (2) when a new document is opened, or (3) when recalculate-all is called.
 *  Here we process literal values of assignment statements and deal w/units.
 *  This work was not done in prepareStatement() because prepareStatement()
 *  is called from mathprompt(), which does not have access to hurmetVars,
 *  which may contain user-defined units.
 */

export const improveQuantities = (attrs, vars) => {
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

    attrs.unit = unit
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
      attrs.value.data = {
        plain: attrs.value.data,
        inBaseUnits: map.convertToBaseUnits(attrs.value.data, unit.gauge, unit.factor)
      }
    }
  }
  if (attrs.rpn && !attrs.value) {
    if (attrs.unit) {
      const unit = (attrs.unit && typeof attrs.unit === "string")
        ? unitFromUnitName(attrs.unit, vars)
        : { factor: 1, gauge: 0, expos: allZeros }
      // We save factor and gauge with the cell attrs so that the result of
      // a later calculation can be converted into the desired display units.
      attrs.unit = unit
    }
  }

}
