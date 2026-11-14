// groups.js

// Sketch groups live in a flat element array, not in <g> elements. An
// element's group membership is its "path": the numbers of the groups that
// contain it, listed from outermost to innermost. [20, 7] means "in group 7,
// which is inside group 20". [] means ungrouped.
//
// The path is stored in attrs['data-group'] as "20/7", separate from the id,
// so grouping and ungrouping never change an element's identity. This module
// is the only code that reads or writes that attribute. Group numbers come
// from the same counter as element ids (dwg.maxId), so they're unique within
// the live drawing. They're never written to the text format.
//
// Dimension strings, arrow/label pairs, and dot/label pairs are "leaf" groups: always the
// innermost segment of their members' paths, tagged by attrs['data-tool'].
//
// Invariant: a group's members are contiguous in the element array.
//
// This module imports nothing, so dwg.js and utils.js can both use it
// without creating an import cycle.

const KEY = 'data-group'
const leafTools = new Set(['dimension', 'arrow', 'dot'])

const groupPath = el => {
  const str = el?.attrs?.[KEY]
  if (str === undefined || str === null || str === '') { return [] }
  return String(str).split('/').map(Number)
}

const setGroupPath = (el, path) => {
  if (path.length === 0) {
    delete el.attrs[KEY]
  } else {
    el.attrs[KEY] = path.join('/')
  }
}

const isGrouped = el => groupPath(el).length > 0

const outermostGroup = el => {
  const path = groupPath(el)
  return path.length > 0 ? path[0] : null
}

const isLeafGroupMember = el => leafTools.has(el?.attrs?.['data-tool'])

// Every element whose path contains groupNum, at any depth, in array order.
const membersOf = (elements, groupNum) => {
  return elements.filter(el => groupPath(el).includes(groupNum))
}

// What a click on `el` selects: everything in its outermost group, or just el.
const selectionUnit = (elements, el) => {
  const g = outermostGroup(el)
  return g === null ? [el] : membersOf(elements, g)
}

// Give each segment of `path` a new number. `map` carries old → new across
// calls, so every member of one copied group gets the same new number.
// `nextNumber` is normally () => dwgMgr.nextId(dwg).
const remapPath = (path, map, nextNumber) => {
  return path.map(n => {
    if (map[n] === undefined) { map[n] = nextNumber() }
    return map[n]
  })
}

// Tools often rebuild an element from scratch, carrying over only its id.
// Copy the membership attributes from the element it came from, unless the
// new element already has its own.
const inheritMembership = (target, source) => {
  if (!source) { return }
  for (const key of [KEY, 'data-tool']) {
    if (target.attrs[key] === undefined && source.attrs[key] !== undefined) {
      target.attrs[key] = source.attrs[key]
    }
  }
}

// The numbers of any groups whose members aren't contiguous. Should always be
// empty; a non-empty result means some operation broke the invariant.
const findBrokenGroups = elements => {
  const lastIndex = new Map()
  const broken = new Set()
  elements.forEach((el, i) => {
    for (const n of groupPath(el)) {
      if (lastIndex.has(n) && lastIndex.get(n) !== i - 1) { broken.add(n) }
      lastIndex.set(n, i)
    }
  })
  return [...broken]
}

export const groups = Object.freeze({
  findBrokenGroups,
  groupPath,
  setGroupPath,
  isGrouped,
  outermostGroup,
  isLeafGroupMember,
  membersOf,
  selectionUnit,
  remapPath,
  inheritMembership
})
