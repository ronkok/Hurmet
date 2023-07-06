import { dt } from "./constants"
import { map } from "./map"
import { DataFrame } from "./dataframe"
import { fromAssignment } from "./operand.js"
import { errorOprnd } from "./error"
import { Rnl } from "./rational"

export function propertyFromDotAccessor(parent, index, unitAware) {
  const property = Object.create(null)
  if (parent.dtype & dt.MAP) {
    return map.range(parent, [index], unitAware)

  } else if (parent.dtype & dt.DATAFRAME) {
    return DataFrame.range(parent, [index], unitAware)

  } else if ((parent.dtype === dt.STRING || (parent.dtype & dt.ARRAY)) &&
    index.dtype === dt.RATIONAL) {
    const indexVal = Rnl.toNumber(index.value)
    property.value = parent.value.slice(indexVal - 1, indexVal)
    property.unit = parent.unit
    property.dtype = parent.dtype
    return property

  } else if ((parent.dtype === dt.STRING || (parent.dtype & dt.ARRAY)) &&
        index.dtype === dt.RANGE) {
    const start = index.value[0] - 1
    const step = index.value[1]
    const end = (index.value[2] === "∞") ? parent.value.length : index.value[2]
    property.unit = parent.unit
    property.dtype = parent.dtype
    if (step === 1) {
      property.value = parent.value.slice(start, end)
    } else {
      property.value = []
      for (let j = start; j < end; j += step) {
        property.value.push(parent.value[j])
      }
    }
    return property

  } else if (parent.dtype === dt.MODULE) {
    // parent is a module and index has a value assigned to it.
    return fromAssignment(parent.value[index.value], unitAware)

  } else {
    return errorOprnd("NO_PROP", parent.name)
  }
}
