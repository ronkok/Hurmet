import { populateData } from "./populateData"
import { createLoadDiagram } from "./createLoadDiagram"
import { readInputData } from "./readData"
import { doAnalysis } from "./analyze"
import { combine } from "./combine"
import { selectCases } from "./selectCases"
import { locateDiagrams } from "./locateDiagrams"
import { drawDiagrams } from "./drawDiagrams"
import { dt } from "../constants"

export function error(msg) {
  if (msg === "") { return { value: "Error", unit: null, dtype: dt.ERROR } }
  return { value: msg, unit: null, dtype: dt.ERROR }
}

export const beamDiagram = (beamInputData, loadFactorInput) => {
  // This is the main analysis function.

  // Get raw data from the input dataframe.
  const beamInput = readInputData(beamInputData)
  if (typeof beamInput === "string") { return error(beamInput) }

  // Validate input and populate data structures.
  const [errorMsg, beam, nodes, spans, combinations] = populateData(beamInput, loadFactorInput)
  if (errorMsg) { return error(errorMsg) }

  // Start the SVG
  const svg = { tag: 'svg', children: [], attrs: { float: "right" } }

  // Create the first diagram. Show fixities, lengths, and loads.
  const loadDiagram = createLoadDiagram(beam, nodes, spans)
  svg.children = svg.children.concat(loadDiagram)

  // Do the linear algebra. For each load type, get member end actions and node displacements.
  const [actions, deflections] = doAnalysis(beam, nodes, spans)

  // Determine shear, moment, and deflection maximums and minimums by superimposing
  // the relevent load combinations and live load patterns.
  const extremes = combine(beam, nodes, spans, actions, deflections, combinations)

  // Decide which combinations get plotted.
  const cases = selectCases(spans)

  // Find the y coordinates for the shear, moment, and deflection diagrams.
  const yCoords = locateDiagrams(beam, extremes)
  const yMax = yCoords[6] // Diagram overall height in local coords.

  const diagrams = drawDiagrams(beam, nodes, spans, cases, yCoords, extremes, combinations)
  svg.children = svg.children.concat(diagrams)

  // Set the outer dimensions of the diagram.
  svg.attrs.width = "375" // px
  svg.attrs.height = (375 / 450 * yMax).toFixed(0)
  svg.attrs.viewBox = `0 0 450 ${yMax.toFixed(0)}`

  return svg

}
