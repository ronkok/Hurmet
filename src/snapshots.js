import { schema } from "./schema"
import { handleContents } from "./openfile"

// Some helper functions for handling snapshot content and path definitions in the markdown.

const SNAPSHOT_PATH_DEF_START_R = /^\[(\d+)\]: /gm

export function splitMarkdownPathDefinitions(markdown) {
  const matches = Array.from(markdown.matchAll(SNAPSHOT_PATH_DEF_START_R))
  if (matches.length === 0) {
    return { body: markdown.replace(/\n+$/, ""), pathDefs: {} }
  }

  const body = markdown.slice(0, matches[0].index).replace(/\n+$/, "")
  const pathDefs = {}

  for (let i = 0; i < matches.length; i++) {
    const index = matches[i][1]
    const start = matches[i].index
    const end = i + 1 < matches.length ? matches[i + 1].index : markdown.length
    pathDefs[index] = markdown.slice(start, end).replace(/\n+$/, "")
  }

  return { body, pathDefs }
}

function pathDefPayload(pathDef) {
  return pathDef.replace(/^\[\d+\]: /, "")
}

export function renumberMarkdownPathReferences(markdown, indexMap) {
  let result = markdown.replace(
    /(\[[^\]]*\]\[)(\d+)(\])/g,
    (match, open, oldIndex, close) => {
      const newIndex = indexMap[oldIndex]
      return newIndex ? `${open}${newIndex}${close}` : match
    }
  )

  result = result.replace(
    /(!!?\[)(\d+)(\]\[\])/g,
    (match, open, oldIndex, close) => {
      const newIndex = indexMap[oldIndex]
      return newIndex ? `${open}${newIndex}${close}` : match
    }
  )

  return result
}

function addDefsToCollection(sourceDefs, dedupeMap, targetDefs) {
  const indexMap = {}
  const keys = Object.keys(sourceDefs || {}).sort((a, b) => Number(a) - Number(b))

  for (const oldIndex of keys) {
    const payload = pathDefPayload(sourceDefs[oldIndex])
    let newIndex = dedupeMap.get(payload)

    if (!newIndex) {
      newIndex = String(dedupeMap.size + 1)
      dedupeMap.set(payload, newIndex)
      targetDefs[newIndex] = `[${newIndex}]: ${payload}`
    }

    indexMap[oldIndex] = newIndex
  }

  return indexMap
}

export function rebuildSnapshotCacheAndContents(
  existingSnapshots,
  snapshotPathCache,
  newSnapshot
) {
  const dedupeMap = new Map()
  const nextCache = {}

  const cacheIndexMap = addDefsToCollection(snapshotPathCache || {}, dedupeMap, nextCache)

  const normalizedSnapshots = existingSnapshots.map(snapshot => {
    const { body, pathDefs } = splitMarkdownPathDefinitions(snapshot.content)
    const indexMap = Object.keys(pathDefs).length > 0
      ? addDefsToCollection(pathDefs, dedupeMap, nextCache)
      : cacheIndexMap

    return {
      ...snapshot,
      content: renumberMarkdownPathReferences(body, indexMap)
    }
  })

  const newIndexMap = addDefsToCollection(newSnapshot.pathDefs, dedupeMap, nextCache)

  return {
    snapshots: normalizedSnapshots,
    snapshotPathCache: nextCache,
    content: renumberMarkdownPathReferences(newSnapshot.body, newIndexMap)
  }
}

export function mergeSavedMarkdownPathData(
  currentMarkdown,
  snapshots = [],
  snapshotPathCache = {}
) {
  const { body: currentBody, pathDefs: currentPathDefs } =
    splitMarkdownPathDefinitions(currentMarkdown)

  const dedupeMap = new Map()
  const mergedPathDefs = {}

  const currentIndexMap = addDefsToCollection(currentPathDefs, dedupeMap, mergedPathDefs)
  const snapshotCacheIndexMap = addDefsToCollection(
    snapshotPathCache,
    dedupeMap,
    mergedPathDefs
  )

  const normalizedSnapshots = snapshots.map(snapshot => {
    const { body, pathDefs } = splitMarkdownPathDefinitions(snapshot.content)

    const indexMap = Object.keys(pathDefs).length > 0
      ? addDefsToCollection(pathDefs, dedupeMap, mergedPathDefs)
      : snapshotCacheIndexMap

    return {
      ...snapshot,
      content: renumberMarkdownPathReferences(body, indexMap)
    }
  })

  return {
    body: renumberMarkdownPathReferences(currentBody, currentIndexMap),
    pathDefs: mergedPathDefs,
    snapshots: normalizedSnapshots
  }
}

export function stringifyMarkdownPathDefinitions(pathDefs) {
  return Object.keys(pathDefs || {})
    .sort((a, b) => Number(a) - Number(b))
    .map(key => pathDefs[key])
    .join("\n\n")
}

export function revertToSnapshotByPos(state, view, pos, currentMarkdown, message) {
  const targetSnapshot = state.doc.attrs.snapshots[pos]
  if (!targetSnapshot) { return }

  const { body, pathDefs } = splitMarkdownPathDefinitions(currentMarkdown)
  const rebuilt = rebuildSnapshotCacheAndContents(
    state.doc.attrs.snapshots,
    state.doc.attrs.snapshotPathCache,
    { body, pathDefs }
  )

  const preservedCurrentSnapshot = {
    date: new Date().toISOString().replace(/T.+/, ""),
    message,
    content: rebuilt.content
  }

  const allSnapshots = rebuilt.snapshots.concat(preservedCurrentSnapshot)
  const targetContent = rebuilt.snapshots[pos].content
  const pathDefText = stringifyMarkdownPathDefinitions(rebuilt.snapshotPathCache)

  const fileHandle = state.doc.attrs.fileHandle
  const inDraftMode = state.doc.attrs.inDraftMode

  let md = `---------------
decimalFormat: ${state.doc.attrs.decimalFormat}
fontSize: ${state.doc.attrs.fontSize}
pageSize: ${state.doc.attrs.pageSize}
dateFormat: ${state.doc.attrs.dateFormat}
saveDate: ${new Date(new Date().getTime()
  - new Date().getTimezoneOffset() * 60 * 1000).toISOString().split("T")[0]}
---------------

${targetContent}`

  if (pathDefText.length > 0) {
    md += `\n\n${pathDefText}`
  }

  for (const item of allSnapshots) {
    md += `\n\n<!--SNAPSHOT-->\ndate: ${item.date}\nmessage: ${item.message}\n\n`
    md += item.content
  }

  handleContents(view, schema, md, "markdown")

  view.state.doc.attrs.fileHandle = fileHandle
  view.state.doc.attrs.saveIsValid = false
  view.state.doc.attrs.inDraftMode = inDraftMode
}
