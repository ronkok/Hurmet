// shapeLibrary.js

// Fetches and caches shape libraries: JSON files hosted in a public GitHub repo.
// A catalog file (index.json) lists the available libraries by title and url;
// each library file holds a "contents" array of shapes, each with a "dwg" input
// string and an "anchor" point. See the shape-library repo's README for the
// full schema.

const CATALOG_URL = "https://raw.githubusercontent.com/ronkok/Hurmet-Shapes/refs/heads/main/index.json"

const STORAGE_KEY = "sketch.shapeLibraries.v1"
const MAX_AGE_DAYS = 90

// In-memory cache of library JSON already fetched this session, keyed by url.
const libraryCache = new Map()
let catalogCache = null

// The library currently available to the shape picker. Title/url are kept
// alongside the data so callers can display which library is active.
let active = null

// The shape (and its library's unit) picked from the shape picker, waiting
// for the next canvas click to place it (stage 4).
let armedShape = null

const readRecents = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

const writeRecents = recents => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recents))
  } catch {
    // localStorage unavailable (private browsing, quota, etc). The recents
    // list just won't persist across sessions.
  }
}

const pruneStale = recents => {
  const cutoff = Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000
  return recents.filter(entry => entry.lastUsed >= cutoff)
}

export const shapeLibrary = Object.freeze({
  // Fetch the catalog of available libraries (title + url), from cache if possible.
  async fetchCatalog() {
    if (catalogCache) { return catalogCache }
    // Bypass the browser's own HTTP cache: this fetch only ever runs once per
    // page load (catalogCache above then covers the rest of the session), so
    // it should always see whatever is actually live on GitHub right now.
    const response = await fetch(CATALOG_URL, { cache: "no-store" })
    if (!response.ok) {
      throw new Error(`Failed to fetch shape library catalog: ${response.status}`)
    }
    catalogCache = await response.json()
    return catalogCache
  },

  // Fetch one library's shapes (title, description, unit, contents), from cache if possible.
  async fetchLibraryData(url) {
    if (libraryCache.has(url)) { return libraryCache.get(url) }
    // Bypass the browser's own HTTP cache, for the same reason as fetchCatalog.
    const response = await fetch(url, { cache: "no-store" })
    if (!response.ok) {
      throw new Error(`Failed to fetch shape library: ${response.status}`)
    }
    const data = await response.json()
    libraryCache.set(url, data)
    return data
  },

  // Libraries the user has selected before, most recently used first, with
  // anything older than MAX_AGE_DAYS dropped.
  getRecents() {
    const recents = pruneStale(readRecents())
    writeRecents(recents)
    return recents
  },

  // Record that a library was just selected, so it stays at the top of getRecents()
  // and its "last used" clock resets.
  recordUsage(title, url) {
    const recents = pruneStale(readRecents()).filter(entry => entry.url !== url)
    recents.unshift({ title, url, lastUsed: Date.now() })
    writeRecents(recents)
  },

  // Manually remove a library from the recents list.
  removeRecent(url) {
    writeRecents(readRecents().filter(entry => entry.url !== url))
  },

  // Make a fetched library the one the shape picker (stage 3) reads from.
  setActive(title, url, data) {
    active = { title, url, data }
  },

  // The currently active library, or null if none has been picked yet.
  getActive() {
    return active
  },

  // Arm a shape (from the currently active library) for insertion on the
  // next canvas click.
  setArmedShape(entry, unit) {
    armedShape = { entry, unit }
  },

  // The armed shape, or null if none is waiting to be placed.
  getArmedShape() {
    return armedShape
  },

  clearArmedShape() {
    armedShape = null
  }
})
