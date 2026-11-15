
import { utils } from "./utils.js"
import { elementObject, fillPatternNames, markerFamily } from "./elementObject.js"
import { dwgMgr, defaultDwg } from "./dwg.js"
import { defaultAppState } from "./appState.js"
import { text } from "./text.js"
import { buildImageElement } from "./importImage.js"
import { groups } from "./groups.js"
import { numberPattern, numberValue } from "./numberInput.js"
import { roundingSpecRegEx, inchFractions, dotLabelPositionRegEx } from "./shared.js"

// Regular expressions for parsing
// A number may be a mixed fraction, 3 3/8, so [3 3/8, 2] holds two numbers.
// See numberInput.js. The source always uses a dot for the decimal separator.
const numberRegEx = new RegExp(String.raw`^-?(?:0x[0-9A-Fa-f]+|${numberPattern})`)
const wordRegEx = /^[^\s\[\]\(\),;]+/
const signedNum = `(-?(?:${numberPattern}))`
const textElementRegex = new RegExp(String.raw`^(\s*text\s+\[${signedNum},\s+${signedNum}],\s+")`, "i")
// A string between double quotation marks. Inside it, "" stands for one ".
const stringRegEx = /^"(?:[^"]|"")*"/
// The rest of a text string, after its opening quote, up to its closing quote.
const textContentRegEx = /^(?:[^"]|"")*"/
// What may follow a text string's closing quote on the same line.
const textPositionRegEx = /^\s*(?:,\s*"(above|leader|middle|below)?(left|right)?")?\s*$/i

// Remove the surrounding quotes of a string token, and turn each "" into ".
const unquote = token => token.slice(1, -1).replace(/""/g, '"')

// The optional third argument of `frame`, as Hurmet's draw.js reads it.
// The Sketch Properties… dialog shows "left" and "right" as float left & right.
const sketchPositions = new Set(["inline", "left", "center", "right"])

const validFillPatterns = new Set(fillPatternNames)

// Token types
const NULL = 0
const BOOLEAN = 1
const STRING = 2
const NUMBER = 3
const OPENBRACKET = 4
const CLOSEBRACKET = 5
const COMMA = 6
const SEMICOLON = 7
const COMMENT = 8
const WORD = 9
const CONSTANT = 10

// Named constants, keyed by their lower-case names
const constants = {
  "pi": Math.PI,
  "π": Math.PI,
  "e": Math.E,
  "ℏ": 1.0545718e-34  // Reduced Planck constant
}

// Lexer
const lex = str => {
  const ch = str.charAt(0)
  if (ch === '"') {
    // String between double quotation marks.
    const match = str.match(stringRegEx)
    if (!match) { throw new Error("Unterminated string literal") }
    return [STRING, match[0]];
  }
  if (/^#/.test(str)) { return [COMMENT, str] }  // Comment line
  const numParts = str.match(numberRegEx)
  if (numParts) { return [NUMBER, numParts[0]] }  // numbers
  if (ch === '[' || ch === '(') { return [OPENBRACKET, ch] }
  if (ch === ']' || ch === ')') { return [CLOSEBRACKET, ch] }
  if (ch === ',') { return [COMMA, ch] }
  if (ch === ';') { return [SEMICOLON, ch] }
  const wordMatch = str.match(wordRegEx)
  if (wordMatch) { 
    // Return the matched word itself (not the parsed JS value) so that
    // `str.slice(token.length)` below still advances past it. `getArgs`
    // converts to the real null/boolean/constant value, same as it does for NUMBER.
    if (wordMatch[0].toLowerCase() === "null") { return [NULL, wordMatch[0]] }
    if (wordMatch[0].toLowerCase() === "true") { return [BOOLEAN, wordMatch[0]] }
    if (wordMatch[0].toLowerCase() === "false") { return [BOOLEAN, wordMatch[0]] }
    if (Object.hasOwn(constants, wordMatch[0].toLowerCase())) { return [CONSTANT, wordMatch[0]] }
    return [WORD, wordMatch[0]];
  }
  throw new Error("Unrecognized token: " + str)
}

// Parse one line (minus opening command) into an array of arguments.
const getArgs = str => {
  const args = [];
  str = str.trim()
  let inArray = false
  let numRows = 0
  while (str.length > 0) {
    const [tokenType, token] = lex(str)
    switch (tokenType) {
      case STRING:
      case NUMBER:
      case CONSTANT:
      case NULL:
      case BOOLEAN: {
        let tkn = token
        if (tokenType === NUMBER) { tkn = numberValue(token) }
        else if (tokenType === CONSTANT) { tkn = constants[token.toLowerCase()] }
        else if (tokenType === STRING) { tkn = unquote(token) }
        else if (tokenType === NULL) { tkn = null }
        else if (tokenType === BOOLEAN) { tkn = token.toLowerCase() === "true" }
        if (!inArray) {
          args.push(tkn)
        } else if (args.length > 0 && Array.isArray(args[args.length - 1])) {
          // This token goes into the array at the top of the stack.
          if (numRows === 1) {
            args[args.length - 1].push(tkn)
          } else {
            // We are in a nested array (matrix), so the last item in args is an array of arrays.
            args[args.length - 1][args[args.length - 1].length - 1].push(tkn)
          }
        } else {
          args.push(tkn)
        }
        break
      }
      case COMMENT:
        str = "" // Ignore rest of line
        break
      case OPENBRACKET:
        args.push([])
        inArray = true
        numRows = 1
        break
      case COMMA:
        // Do nothing. Commas just separate tokens.
        break
      case SEMICOLON: {
        // Semicolons separate rows in a matrix.
        if (!(args.length > 0 && Array.isArray(args[args.length - 1]))) {
          throw new Error("Unexpected semicolon")
        }
        if (numRows === 1) {
          // We are starting the second row of a matrix.
          // Wrap the first row in an array.
          const newArray = [args.pop()]
          args.push(newArray)
          args[args.length - 1].push([]) // Start the second row
        } else {
          // We are starting a subsequent row of an array which is already nested.
          args[args.length - 1].push([])
        }
        numRows += 1
        break
      }
      case CLOSEBRACKET:
        // As in Hurmet, every row of a matrix must have the same length.
        if (numRows > 1) {
          const rows = args[args.length - 1]
          if (rows.some(row => row.length !== rows[0].length)) {
            throw new Error("Every row of a matrix must have the same number of elements")
          }
        }
        numRows = 0
        inArray = false
        break
      default:
        throw new Error("Unexpected token: " + token)
    }
    str = str.slice(token.length).trim()
  }
  return args
}

// `str` holds the text statement and everything after it. The string may span
// several lines; it ends at the first " that isn't part of a "" pair.
// Returns the text element and the number of lines the statement used.
const parseText = (str, appState) => {
  str = str.replace(/\r\n/g, "\n").trim()
  const pointMatch = textElementRegex.exec(str)
  if (!pointMatch) { throw new Error(`Invalid text command`) }
  const modelPoint = { x: numberValue(pointMatch[2]), y: numberValue(pointMatch[3]) }
  const rest = str.slice(pointMatch[0].length) // After the opening quote
  const contentMatch = rest.match(textContentRegEx)
  if (!contentMatch) { throw new Error(`Unterminated text string`) }
  const content = contentMatch[0].slice(0, -1).replace(/""/g, '"').trim()

  // The text position, if any, follows the closing quote on the same line.
  const posEOL = rest.indexOf("\n", contentMatch[0].length)
  const tail = rest.slice(contentMatch[0].length, posEOL === -1 ? rest.length : posEOL)
  const positionMatch = tail.match(textPositionRegEx)
  if (!positionMatch) { throw new Error(`Invalid text command`) }
  const textPosition = (positionMatch[1] || "") + (positionMatch[2] || "") || "middle"
  const numLines = (pointMatch[0] + contentMatch[0]).split("\n").length
  // Build via text.js's createTextElement so a parsed text element has the
  // same shape (attrs naming, modelPoint, position) as one created by the
  // text tool, dimension tool, or arrow label — see shapeParse.js's history
  // for why that shape must match exactly.
  const textElement = text.createTextElement(content, modelPoint, { ...appState, textposition: textPosition })
  return [textElement, numLines]
}

// The commands that write an element. parseLine also accepts style statements
// (stroke, fill, …) ahead of the element. Sketch-wide ones (e.g., scene) are ignored.
const validElementCommands = new Set([
  "arrow", "line", "rect", "circle", "ellipse", "polygon", "arc", "path", "freehand", "text", "dimension", "image", "dot"
])

// The position of a dot's label, as in Hurmet's draw.js: e.g., "below" or "aboveleft".

// Given a valid command and an array of its arguments, return the corresponding element.
// i is the statement's line index, for error messages.
const getElement = (command, args, appState, dwg = null, i = 0) => {
  if (!validElementCommands.has(command.toLowerCase())) {
    return null
  }
  switch (command.toLowerCase()) {
    case "line": {
      if (args.length !== 1 || !Array.isArray(args[0]) || args[0].length !== 2 || typeof args[0][0][0] !== "number" || typeof args[0][0][1] !== "number" || typeof args[0][1][0] !== "number" || typeof args[0][1][1] !== "number") {
        return null
      }
      const arg = args[0];  // A 2x2 array containing 2 points.
      return elementObject("line", args[0], appState)
    }
    case 'rect': {
        const arg = args[0];  // A 2x2 array containing 2 points.
        if (args.length !== 1 || !Array.isArray(arg) || arg.length !== 2 || !Array.isArray(arg[0]) || !Array.isArray(arg[1]) || typeof arg[0][0] !== "number" || typeof arg[0][1] !== "number" || typeof arg[1][0] !== "number" || typeof arg[1][1] !== "number") {
          throw new Error(`Invalid rectangle command at line ${i + 1}`)
        }
        return elementObject("rect", arg, appState)
      }
      case 'image': {
        // Built directly (not via elementObject), same as 'text', because it
        // needs the rotation/mirrored bookkeeping and derived `style` attr
        // rather than the generic stroke/fill handling other shapes share.
        // The trailing `mirror` arg is optional (default false) so a user
        // hand-typing an image statement need not know about it — but
        // stringify.js always writes it, so history snapshots and
        // Edit-source round trips still preserve a mirrored image's state.
        const arg = args[0];  // A 2x2 array containing 2 points.
        if (
          (args.length !== 3 && args.length !== 4) || !Array.isArray(arg) || arg.length !== 2 ||
          !Array.isArray(arg[0]) || !Array.isArray(arg[1]) ||
          typeof arg[0][0] !== "number" || typeof arg[0][1] !== "number" ||
          typeof arg[1][0] !== "number" || typeof arg[1][1] !== "number" ||
          typeof args[1] !== "string" || typeof args[2] !== "number" ||
          (args.length === 4 && typeof args[3] !== "boolean")
        ) {
          throw new Error(`Invalid image command`)
        }
        const x = Math.min(arg[0][0], arg[1][0])
        const y = Math.min(arg[0][1], arg[1][1])
        const width = Math.abs(arg[1][0] - arg[0][0])
        const height = Math.abs(arg[1][1] - arg[0][1])
        const href = args[1]
        return buildImageElement(x, y, width, height, href, args[2], args[3] || false)
      }
      case 'circle': {
        if (args.length !== 2 || typeof args[0] !== "object" || typeof args[1] !== "number" || typeof args[0][0] !== "number" || typeof args[0][1] !== "number" || args[1] <= 0) {
          throw new Error(`Invalid circle command at line ${i + 1}`)
        }
        return elementObject("circle", args, appState)
      }
      case 'ellipse': {
        const center = args[0];
        const rx = args[1];
        const ry = args[2];
        // The trailing rotation angle (degrees) is optional so existing
        // sketches and hand-typed axis-aligned ellipses need not carry it.
        if (
          (args.length !== 3 && args.length !== 4) || typeof center !== "object" ||
          typeof rx !== "number" || typeof ry !== "number" ||
          typeof center[0] !== "number" || typeof center[1] !== "number" ||
          rx <= 0 || ry <= 0 || (args.length === 4 && typeof args[3] !== "number")
        ) {
          throw new Error(`Invalid ellipse command at line ${i + 1}`)
        }
        return elementObject("ellipse", args, appState)
      }
      case 'polygon': {
        const numSides = args[0];
        const center = args[1];
        const radius = args[2];  // Inscribed radius
        // The trailing rotation angle (degrees) is optional, as for ellipses.
        if ((args.length !== 3 && args.length !== 4) || !Number.isInteger(numSides) || typeof center !== "object" || typeof radius !== "number" || typeof center[0] !== "number" || typeof center[1] !== "number" || numSides < 3 || radius <= 0 || (args.length === 4 && typeof args[3] !== "number")) {
          throw new Error(`Invalid polygon command at line ${i + 1}`)
        }
        return elementObject("polygon", args, appState)
      }
      case 'arc': {
        return elementObject("arc", args, appState)
      }
      case 'arrow':
      case 'path': {
        if (!Array.isArray(args[0]) || args[0].length < 2) {
          throw new Error(`Invalid path command at line ${i + 1}`)
        }
        return elementObject(command.toLowerCase(), args, appState)
      }
      case 'freehand': {
        // A one-point stroke (a click with no drag) is stringified as
        // `freehand (x, y)`, which arrives here as a flat [x, y].
        // Wrap it so elementObject sees a list of one point.
        if (Array.isArray(args[0]) && typeof args[0][0] === "number") {
          args[0] = [args[0]]
        }
        if (!Array.isArray(args[0]) || args[0].length < 1) {
          throw new Error(`Invalid freehand command at line ${i + 1}`)
        }
        return elementObject("freehand", args, appState)
      }
      case 'dimension': {
        if (!Array.isArray(args[0]) || args[0].length < 2) {
          throw new Error(`Invalid dimension command at line ${i + 1}`)
        }
        return elementObject("dimension", args, appState, dwg)
      }
      case 'dot': {
        // dot [x, y], "label", position
        // The label and its position are optional. Either may be null.
        const [point, label = null, position = null] = args
        if (args.length < 1 || args.length > 3 || !Array.isArray(point) || point.length !== 2 ||
            typeof point[0] !== "number" || typeof point[1] !== "number" ||
            (label !== null && typeof label !== "string") ||
            (position !== null && (typeof position !== "string" || position === "" ||
                                   !dotLabelPositionRegEx.test(position)))) {
          throw new Error(`Invalid dot command`)
        }
        return elementObject("dot", [point, label, position && position.toLowerCase()], appState)
      }
      default:
        return null
  }
}

// The statements that set the style of the elements that follow them.
const styleCommands = new Set([
  "stroke", "strokewidth", "linetype", "marker", "fill", "pattern", "fontfamily", "fontsize", "fontcolor"
])

// Apply one style statement to appState. i is the statement's line index, for error messages.
const applyStyleCommand = (command, args, appState, i) => {
  switch (command) {
    case "stroke":
      if (args.length !== 1 || typeof args[0] !== "string") {
        throw new Error(`Invalid stroke command at line ${i + 1}`)
      }
      appState.stroke = args[0].trim()
      break
    case "strokewidth":
      if (args.length !== 1 || typeof args[0] !== "number") {
        throw new Error(`Invalid strokewidth command at line ${i + 1}`)
      }
      appState.strokewidth = args[0];
      break
    case "linetype":
      if (args.length !== 1 || typeof args[0] !== "string") {
        throw new Error(`Invalid linetype command at line ${i + 1}`)
      }
      appState.linetype = args[0].trim()
      break
    case "marker":
      if (args.length !== 1 || typeof args[0] !== "string") {
        throw new Error(`Invalid marker command at line ${i + 1}`)
      }
      // Arrowhead size follows strokewidth, so any arrowhead name means "arrow",
      // and any arrowdot name means "arrowdot".
      appState.marker = markerFamily(args[0].trim())
      break
    case "fill":
      if (args.length !== 1 || typeof args[0] !== "string") {
        throw new Error(`Invalid fill command at line ${i + 1}`)
      }
      appState.fill = args[0].trim()
      break
    case "pattern": {
      if (args.length !== 1 || typeof args[0] !== "string") {
        throw new Error(`Invalid pattern command at line ${i + 1}`)
      }
      const patternValue = args[0].trim()
      if (!validFillPatterns.has(patternValue)) {
        throw new Error(`Invalid pattern command at line ${i + 1}`)
      }
      appState.pattern = patternValue
      break
    }
    case "fontfamily":
      if (args.length !== 1 || typeof args[0] !== "string") {
        throw new Error(`Invalid fontfamily command at line ${i + 1}`)
      }
      appState.fontfamily = args[0].trim()
      break
    case "fontsize":
      if (args.length !== 1 || typeof args[0] !== "number") {
        throw new Error(`Invalid fontsize command at line ${i + 1}`)
      }
      appState.fontsize = args[0];
      break
    case "fontcolor":
      if (args.length !== 1 || typeof args[0] !== "string") {
        throw new Error(`Invalid fontcolor command at line ${i + 1}`)
      }
      appState.fontcolor = args[0].trim()
      break
  }
}

// Given a "line" of text, parse it and return a single element.
// Note: If the command is "text", the line may span multiple lines until a closing " is found.
// The element statement may follow style statements, as Edit | Edit… writes
// them. Those are applied to appState, so pass a copy unless they should stick.
export const parseLine = (source, appState) => {
  const lines = source.trim().split(/\r?\n/)
  let i = 0
  for (; i < lines.length; i++) {
    const statement = lines[i].trim()
    const posSpace = statement.indexOf(" ")
    const command = (posSpace === -1 ? statement : statement.slice(0, posSpace)).toLowerCase()
    if (!styleCommands.has(command)) { break }
    applyStyleCommand(command, getArgs(statement.slice(command.length).trim()), appState, i)
  }
  let line = lines.slice(i).join("\n").trim()
  if (line === "" || line.startsWith("#")) { return null } // Skip blank lines and comments
  const posSpace = line.indexOf(" ")
  const command = posSpace === -1 ? line : line.slice(0, posSpace)
  if (!validElementCommands.has(command.toLowerCase())) {
    return null
  }
  let argString = posSpace === -1 ? "" : line.slice(posSpace + 1).trim()
  if (command === "text") {
    const [textElement, _] = parseText(line, appState)
    return textElement
  } else {
    const args = getArgs(argString)
    return getElement(command, args, appState, null, i)
  }
}

const equalScales = (a, b) => Math.abs(a - b) <= 1e-6 * Math.max(a, b)

// Map model-space limits onto the frame, as Hurmet's draw.js does, and set
// appState's scale and origin to match. Return the scale, in px per model unit,
// or 0 if the x and y scales differ.
const applyLimits = (appState, { xmin, xmax, ymin, ymax }) => {
  const S = appState.frameWidth / (xmax - xmin)
  if (!equalScales(S, appState.frameHeight / (ymax - ymin))) { return 0 }
  appState.scaleFactor = S
  appState.scale = S / utils.unitScaleFactors[appState.unit]
  appState.deltaOriginX = -xmin
  appState.deltaOriginY = -ymin
  return S
}

// Parse an input text string of complete sketch into a virtual `dwg` object.
// Don't render anything yet. Rendering will be done in batch after parsing is complete.
export const parseDwg = (str, maxId) => {
  const dwg = structuredClone(defaultDwg)
  const appState = structuredClone(defaultAppState)
  dwg.model = document.querySelector(".active-sketch").querySelector(".model")
  dwg.maxId = maxId
  const lines = str.split(/\r?\n/)
  const kids = dwg.children[2].children[0].children
  const groupStack = [] // Open `group` blocks, outermost first: { num, line }
  let hasFrame = false // `view` reads the frame size, so `frame` must come first.
  let frameLine = 0
  // As in Hurmet's draw.js, a `frame` not governed by a `scene` takes its x and
  // y scales from these model-space limits, which may make them unequal. Sketch
  // requires equal scales. null when a `scene` governs. `fromView` is false for
  // draw.js's default limits, which a later `scene` or `view` usually replaces.
  let limits = { xmin: 0, xmax: 5, ymin: 0, ymax: 5, fromView: false }
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim()
    if (line === "" || line.startsWith("#")) { continue } // Skip blank lines and comments
    const posSpace = line.indexOf(" ")
    const command = posSpace === -1 ? line : line.slice(0, posSpace)
    let argString = posSpace === -1 ? "" : line.slice(posSpace + 1).trim()
    const numKidsBefore = kids.length

    if (command === "text") {
      const [textElement, numLines] = parseText(lines.slice(i).join("\n"), appState) || [null, 0];
      i += numLines > 0 ? numLines - 1 : 0
      if (textElement) { dwgMgr.pushElement(dwg, textElement) }
    } else if (styleCommands.has(command.toLowerCase())) {
      applyStyleCommand(command.toLowerCase(), getArgs(argString), appState, i)
    } else {
      const args = getArgs(argString)
      switch (command.toLowerCase()) {
        case "group":
          // Any arguments (e.g., a future group name) are ignored for now.
          groupStack.push({ num: dwgMgr.nextId(dwg), line: i + 1 })
          break
        case "end":
          if (groupStack.length === 0) {
            throw new Error(`Unexpected "end" at line ${i + 1}`)
          }
          groupStack.pop()
          break
        case "title":
          if (args.length !== 1 || typeof args[0] !== "string") {
            throw new Error(`Invalid title command at line ${i + 1}`)
          }
          appState.title = args[0]
          dwg.children[0].attrs.text = appState.title
          break
        case "caption":
          if (args.length !== 1 || typeof args[0] !== "boolean") {
            throw new Error(`Invalid caption command at line ${i + 1}`)
          }
          appState.caption = args[0]
          break
        case "format":
          // An older sketch may also give a decimal format. It's ignored, since
          // Hurmet will supply the decimal format from the parent document.
          if (args.length < 1 || args.length > 2 || typeof args[0] !== "string" ||
              !roundingSpecRegEx.test(args[0])) {
            throw new Error(`Invalid format command at line ${i + 1}`)
          }
          appState.roundingSpec = args[0]
          break
        case "fraction":
          if (args.length !== 1 || !inchFractions.has(args[0])) {
            throw new Error(`Invalid fraction command at line ${i + 1}`)
          }
          appState.fraction = args[0]
          break
        case "frame":
          if (args.length < 2 || args.length > 3 || typeof args[0] !== "number" ||
              typeof args[1] !== "number" ||
              (args.length === 3 && !sketchPositions.has(args[2]))) {
            throw new Error(`Invalid frame command at line ${i + 1}`)
          }
          // Only Hurmet uses the frame. The GUI canvas stays at appState.width × height.
          appState.frameWidth = args[0]
          appState.frameHeight = args[1]
          appState.position = args.length === 3 ? args[2] : "inline"
          hasFrame = true
          frameLine = i + 1
          if (limits && limits.fromView) {
            // A frame after a `view` rescales the view's limits to the new frame.
            const S = applyLimits(appState, limits)
            if (!S) {
              throw new Error(`The frame at line ${i + 1} gives unequal x and y scales. Sketch requires them to be equal.`)
            }
          }
          break
        case "view": {
          // An alternative to `scene`, from Hurmet's draw.js: the frame's model-space
          // limits, xmin, xmax, ymin, ymax, give the scale and origin. Hurmet allows
          // separate x and y scales; Sketch doesn't.
          if (!hasFrame) {
            throw new Error(`"frame" must precede "view" at line ${i + 1}`)
          }
          if (args.length > 4 || args.some(arg => typeof arg !== "number")) {
            throw new Error(`Invalid view command at line ${i + 1}`)
          }
          const [xmin = 0, xmax = 5, ymin, ymax] = args
          if (!(xmax > xmin) || (ymax !== undefined && !(ymax > ymin))) {
            throw new Error(`Invalid view limits at line ${i + 1}`)
          }
          const S = appState.frameWidth / (xmax - xmin) // px per model unit
          // Complete the y limits as draw.js does. With no ymin, Hurmet centers
          // the origin vertically. With no ymax, the y scale equals the x scale.
          const yLo = ymin === undefined ? -appState.frameHeight / (2 * S) : ymin
          const yHi = ymax === undefined ? appState.frameHeight / S + yLo : ymax
          limits = { xmin, xmax, ymin: yLo, ymax: yHi, fromView: true }
          if (!applyLimits(appState, limits)) {
            throw new Error(`The view at line ${i + 1} has unequal x and y scales. Sketch requires them to be equal.`)
          }
          break
        }
        case "grid":
        case "axes": {
          // From Hurmet's draw.js. Not elements: they're kept as statements and
          // drawn, from the frame and scene, in a layer beneath the shapes.
          //   grid dx, dy
          //   axes dx, dy, "labels", gdx, gdy   ("labels" may be null)
          const name = command.toLowerCase()
          if (!hasFrame) {
            throw new Error(`"frame" must precede "${name}" at line ${i + 1}`)
          }
          const steps = name === "grid" ? args : [args[0], args[1], args[3], args[4]]
          const isValid = name === "grid"
            ? args.length <= 2
            : args.length <= 5 && (args.length < 3 || args[2] === "labels" || args[2] === null)
          if (!isValid || steps.some(arg => arg !== undefined && !(typeof arg === "number" && arg > 0))) {
            throw new Error(`Invalid ${name} command at line ${i + 1}`)
          }
          appState.backdrop.push({ command: name, args })
          break
        }
        case "scene":
          if (args.length !== 4 || typeof args[0] !== "number" || typeof args[1] !== "string" || typeof args[2] !== "number" || typeof args[3] !== "number") {
            throw new Error(`Invalid scene command at line ${i + 1}`)
          }
          // Any positive scale is accepted, not just those in the scale <select> menu.
          if (!(args[0] > 0 && Number.isFinite(args[0]))) {
            throw new Error(`Invalid scale in scene command at line ${i + 1}`)
          }
          limits = null // Of scene and view, the later one applies.
          appState.scale = args[0]
          appState.unit = args[1].trim()
          appState.deltaOriginX = args[2];
          appState.deltaOriginY = args[3];
          appState.scaleFactor = appState.scale * utils.unitScaleFactors[appState.unit];
          break
        case "line": {
          const lineElement = getElement(command, args, appState, null, i)
          if (!lineElement) { throw new Error(`Invalid line command at line ${i + 1}`) }
          dwgMgr.pushElement(dwg, lineElement)
          break
        }
        case 'rect': {
          const rectElement = getElement(command, args, appState, null, i)
          if (!rectElement) { throw new Error(`Invalid rectangle command at line ${i + 1}`) }
          dwgMgr.pushElement(dwg, rectElement)
          break
        }
        case 'image': {
          const imageElement = getElement(command, args, appState, null, i)
          if (!imageElement) { throw new Error(`Invalid image command at line ${i + 1}`) }
          dwgMgr.pushElement(dwg, imageElement)
          break
        }
        case 'circle': {
          const circleElement = getElement(command, args, appState, null, i)
          if (!circleElement) { throw new Error(`Invalid circle command at line ${i + 1}`) }
          dwgMgr.pushElement(dwg, circleElement) 
          break
        }
        case 'ellipse': {
          const ellipseElement = getElement(command, args, appState, null, i)
          if (!ellipseElement) { throw new Error(`Invalid ellipse command at line ${i + 1}`) }
          dwgMgr.pushElement(dwg, ellipseElement)
          break
        }
        case 'polygon': {
          const polygonElement = getElement(command, args, appState, null, i)
          if (!polygonElement) { throw new Error(`Invalid polygon command at line ${i + 1}`) }
          dwgMgr.pushElement(dwg, polygonElement)
          break
        }
        case 'arc': {
          const arcElement = getElement(command, args, appState, null, i)
          if (!arcElement) { throw new Error(`Invalid arc command at line ${i + 1}`) }
          dwgMgr.pushElement(dwg, arcElement)
          break
        }
        case 'path': {
          const pathElement = getElement(command, args, appState, null, i)
          if (!pathElement) { throw new Error(`Invalid path command at line ${i + 1}`) }
          dwgMgr.pushElement(dwg, pathElement)
          break
        }
        case 'freehand': {
          const freehandElement = getElement(command, args, appState, null, i)
          if (!freehandElement) { throw new Error(`Invalid freehand command at line ${i + 1}`) }
          dwgMgr.pushElement(dwg, freehandElement)
          break
        }
        case 'arrow': {
          const group = getElement(command, args, appState, null, i)
          if (!group) { throw new Error(`Invalid arrow command at line ${i + 1}`) }
          if (Array.isArray(group)) {
            // It's a group containing an arrow path and a text label.
            dwgMgr.pushElementGroup(dwg, group, "arrow")
          } else {
            // It's just an arrow path.
            dwgMgr.pushElement(dwg, group)
          }
          break
        }
        case 'dimension': {
          const group = getElement(command, args, appState, dwg, i)
          if (!group) { throw new Error(`Invalid dimension command at line ${i + 1}`) }
          dwgMgr.pushElementGroup(dwg, group, "dimension")
          break
        }
        case 'dot': {
          let dot
          try {
            dot = getElement(command, args, appState, null, i)
          } catch {
            throw new Error(`Invalid dot command at line ${i + 1}`)
          }
          if (Array.isArray(dot)) {
            // A dot and its label
            dwgMgr.pushElementGroup(dwg, dot, "dot")
          } else {
            dwgMgr.pushElement(dwg, dot)
          }
          break
        }
        default:
          throw new Error(`Unrecognized command "${command}" at line ${i + 1}`)
      }
    }

    // Put every element this statement created inside the open groups.
    if (groupStack.length > 0) {
      const outer = groupStack.map(g => g.num)
      for (let j = numKidsBefore; j < kids.length; j++) {
        groups.setGroupPath(kids[j], [...outer, ...groups.groupPath(kids[j])])
      }
    }
  }
  if (groupStack.length > 0) {
    const opened = groupStack[groupStack.length - 1].line
    throw new Error(`Missing "end" for the group opened at line ${opened}`)
  }
  // With neither `scene` nor `view`, Hurmet maps its default 0…5 limits onto the frame.
  if (hasFrame && limits && !limits.fromView &&
      !equalScales(appState.frameWidth / 5, appState.frameHeight / 5)) {
    throw new Error(`The frame at line ${frameLine} gives unequal x and y scales. Sketch requires them to be equal. Add a scene statement.`)
  }
  dwg.meta = {
    title: appState.title,
    caption: appState.caption,
    position: appState.position,
    roundingSpec: appState.roundingSpec,
    fraction: appState.fraction,
    backdrop: appState.backdrop,
    scale: appState.scale,
    unit: appState.unit,
    frameWidth: appState.frameWidth,
    frameHeight: appState.frameHeight,
    deltaOriginX: appState.deltaOriginX,
    deltaOriginY: appState.deltaOriginY
  }
  return dwg
}
