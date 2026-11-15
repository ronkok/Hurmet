import { dwgMgr } from './dwg.js'
import { elementObject } from './elementObject.js'
import { groups } from './groups.js'
import { replaceMembers } from './isometric.js'
import { dimensionDefinition, scaleDenominator } from './stringify.js'
import { applyMeta, recordHistory, sceneHeaderOf } from './history.js'
import { rebuildIntersectPoints } from './snap.js'
import { utils } from './utils.js'

// The Sketch Properties… dialog: the sketch-wide properties that are written
// at the head of the sketch source (see stringifyHeader in stringify.js).

// A dimension label that the dimension tool wrote, as opposed to one the user
// typed, such as "L" or "varies". Allows for every decimal format, and for
// feet and inches, such as 4′-3.5″ or 4′-3³⁄₈″.
const labelChars = String.raw`\d\s.,’ {}′″⁄⁰¹²³⁴⁵⁶⁷⁸⁹₀₁₂₃₄₅₆₇₈₉-`
const measuredLabelRegex = new RegExp(String.raw`^[${labelChars}]*[\d⁰¹²³⁴⁵⁶⁷⁸⁹][${labelChars}]*$`)

const field = name => document.getElementById(`sketch-properties-${name}`)

// Fractions apply only to feet-and-inches dimension labels.
const enableFraction = () => {
  field('fraction').disabled = field('unit').value !== "ft-in"
}

// Select the menu's scale option. Match by number, within a tolerance, since a
// scale written as 1/48 needn't be the same double as the option's decimal.
// A scale written into the scene statement may not be in the menu. Then add a
// custom option for it, so that it survives OK.
const selectScale = scale => {
  const select = field('scale')
  select.querySelector('option[data-custom]')?.remove()
  const options = [...select.options]
  const index = options.findIndex(opt => Math.abs(Number(opt.value) / scale - 1) < 1e-9)
  if (index >= 0) {
    select.selectedIndex = index
    return
  }
  const n = scaleDenominator(scale)
  const ratio = n ? `1 : ${n}` : Number.isInteger(scale) ? `${scale} : 1` : String(scale)
  const option = new Option(`${ratio} (custom)`, String(scale))
  option.dataset.custom = "true"
  select.add(option)
  select.value = option.value
}

// Copy appState into the dialog's controls and show it.
const open = (appState, domRefs) => {
  field('title').value = appState.title
  field('caption').checked = appState.caption
  field('position').value = appState.position
  selectScale(appState.scale)
  field('unit').value = appState.unit
  field('rounding-type').value = appState.roundingSpec.charAt(0)
  field('rounding-digits').value = appState.roundingSpec.slice(1)
  field('fraction').value = String(appState.fraction)
  enableFraction()
  domRefs.propertiesDialog.classList.add('open')
  field('title').focus()
}

const close = domRefs => {
  domRefs.propertiesDialog.classList.remove('open')
}

// Rewrite the measured labels of the selected dimension strings with the
// current rounding spec and decimal format. Labels the user typed, and
// deleted labels, are kept. Returns true if anything changed.
const relabelSelectedDimensions = (appState, domRefs, dwg) => {
  const elements = dwgMgr.getChildren(dwg)
  const done = new Set()
  let changed = false
  appState.selection.forEach(el => {
    if (el.attrs['data-tool'] !== 'dimension') { return }
    const path = groups.groupPath(el)
    const key = path[path.length - 1]
    if (done.has(key)) { return }
    done.add(key)
    const members = groups.membersOf(elements, key)
    // A copy of a dimension's label, made without the rest of it.
    if (members.every(m => m.tag === 'text')) { return }
    const def = dimensionDefinition(members)
    // null asks elementObject to measure the span; "" leaves it without a label.
    // An erased label arrives as " ", which keeps it.
    const labels = def.labels.map(label => {
      if (label === null) { return "" }
      return measuredLabelRegex.test(label.trim()) ? null : label
    })
    const label = members.find(m => m.tag === 'text')
    const localAppState = { ...appState }
    if (label) {
      Object.assign(localAppState, {
        fontfamily: label.attrs.fontfamily,
        fontsize: parseFloat(label.attrs.fontsize) || appState.fontsize,
        fontweight: label.attrs.fontweight,
        fontstyle: label.attrs.fontstyle,
        fontcolor: label.attrs.fill
      })
    }
    const args = [[...def.points, def.labelPoint], labels]
    if (def.form === "oblique") { args.push(def.dimAngle, def.extAngle) }
    const newMembers = elementObject("dimension", args, localAppState)
    if (newMembers) {
      replaceMembers(dwg, members, newMembers, appState, domRefs)
      changed = true
    }
  })
  return changed
}

// Copy the dialog's controls into appState and apply them.
const accept = (appState, domRefs, dwg) => {
  applyMeta({
    ...appState,
    ...sceneHeaderOf(appState),
    title: field('title').value,
    caption: field('caption').checked,
    position: field('position').value,
    scale: Number(field('scale').value),
    unit: field('unit').value,
    roundingSpec: field('rounding-type').value + field('rounding-digits').value,
    fraction: Number(field('fraction').value)
  }, appState, domRefs, dwg)
  if (relabelSelectedDimensions(appState, domRefs, dwg)) {
    // The old selection's elements were replaced.
    utils.clearTempAndSelection(appState, domRefs, dwg)
  }
  recordHistory(null, dwg)
  rebuildIntersectPoints(dwg)
  close(domRefs)
}

// Wire up the dialog's buttons. Called once, from menuListeners.
const initialize = (appState, domRefs, dwg) => {
  field('ok').addEventListener('click', () => accept(appState, domRefs, dwg))
  field('cancel').addEventListener('click', () => close(domRefs))
  field('unit').addEventListener('change', enableFraction)
  domRefs.propertiesDialog.addEventListener('keydown', event => {
    // Keep keystrokes from reaching the sketch's keyboard shortcuts.
    event.stopPropagation()
    if (event.key === 'Enter' && event.target.tagName === 'INPUT') {
      accept(appState, domRefs, dwg)
    } else if (event.key === 'Escape') {
      close(domRefs)
    }
  })
}

export const sketchProperties = Object.freeze({ open, initialize })
