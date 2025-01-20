
/**
 * md2ast() returns an AST that matches the memory structure  of a Hurmet.org document.
 * Elsewhere, Hurmet uses the AST to create either a live Hurmet doc or a static HTML doc.
 *
 * ## Restrictions
 *
 * 1. **_bold-italic_** must use both * & _ delimiters. Hurmet will fail on ***wat***.
 * 2. "Shortcut" reference links [ref] are not recognized.
 *
 * ## Extensions
 *
 * 1. Hurmet inline calculation is delimited ¢`…`, where "…" is the entry input by the author.
 *    Hurmet display calculation is delimited ¢¢…¢¢.
 * 2. LaTeX inline math is delimited $…$ or $`…`$.
 *    No space allowed after 1st $ or before 2nd $. No digit after 2nd $.
 *    LaTeX display math is delimited  $$ … $$.
 * 3. ~subscript~
 * 4. ~~strikethrough~~
 * 5. Pipe tables as per Github Flavored Markdown (GFM).
 * 6. Grid tables as per Pandoc and reStructuredText
 * 7. Empty paragraphs: A line consisting only of "¶".
 * 8. Attributes for reference link definitions
 *      [id]: target
 *      {.class #id width=number}
 * 9. Figure/Caption for images. Format is a paragraph that consists entirely of:
 *    !![caption][id]
 * 10. Figure/Caption for tables.
 *     The caption is on the line above a table and is preceded by `: `, as per Pandoc.
 * 11. Table directives. They are placed on the line after the table. The format is:
 *     {#id .class float="(left|right)" colWidths="num1 num2 …"}
 *     {."class1 class2"}  ←  Alternate class syntax for when there is > 1 classname
 *     Float is applied only to a table inside a figure.
 *     A spreadsheet will include " spreadsheet" in `.class` The id will be the sheet's name.
 * 12. Lists that allow the user to pick list ordering.
 *        1. →  1. 2. 3.  etc.
 *        A. →  A. B. C.  etc.
 *        a. →  a. b. c.  etc.
 *        a) →  (a) (b) (c)  etc. (future)
 * 13. Alerts per GFM
 *     > [!note] or [!tip] or [!important] or [!warning] or [!epigraph]
 *     > Content of note
 * 14. Fenced divs, similar to Pandoc.
 *     ::: (centered|right_justified|comment|indented|boxed|header)
 *     Block elements
 *     :::
 *     Nested divs are distinguished by number of colons. Minimum three.
 * 15. Table of Contents
 *     {.toc start=N end=N}
 * 16. Definition lists, per Pandoc.  (future)
 * 17. [^1] is a reference to a footnote.
 *     [^1]: The body of the footnote is deferred, similar to reference links.
 * 18. [#1] is a reference to a citation. (future)
 *     [#1]: The body of the citation is deferred, similar to reference links.
 * 19. Line blocks begin with "| ", as per Pandoc. (future)
 *
 * copyright (c) 2021 - 2024 Ron Kok
 *
 * This file has been adapted (and heavily modified) from Simple-Markdown.
 * Simple-Markdown copyright (c) 2014-2019 Khan Academy & Aria Buckles.
 *
 * Portions of Simple-Markdown were adapted from marked.js copyright (c) 2011-2014
 * Christopher Jeffrey (https://github.com/chjj/).
 *
 * LICENSE (MIT):
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

import { dt } from "./constants"
import { texToCalc } from "./texToCalc"

const CR_NEWLINE_R = /\r\n?/g;
const FORMFEED_R = /\f/g;
const CLASS_R = /(?:^| )\.([a-z-]+)(?: |&|$)/
const tableClassRegEx = /(?:^| )\.(?:([a-z-]+)(?: |$)|"([^"]+)")/
const floatRegEx = /float="(left|right)"/
const WIDTH_R = /(?:^| )width="?([\d.a-z]+"?)(?: |$)/
const ALT_R = /(?:^| )alt="([A-Za-z\d ]+)"(?: |$)/
const COL_WIDTHS_R = /(?:^| )colWidths="([^"]*)"/
const ID_R = /(?:^| )#([A-Za-z][A-Za-z0-9]*)(?: |$)/
const leadingSpaceRegEx = /^ +/
const trailingSpaceRegEx = / +$/

// Turn various whitespace into easy-to-process whitespace
const preprocess = function(source) {
  return source.replace(CR_NEWLINE_R, "\n").replace(FORMFEED_R, "");
};

// Creates a match function for an inline scoped element from a regex
const inlineRegex = function(regex) {
  const match = function(source, state) {
    return state.inline ? regex.exec(source) : null
  };
  match.regex = regex;
  return match;
};

// Creates a match function for a block scoped element from a regex
const blockRegex = function(regex) {
  const match = function(source, state) {
    return state.inline ? null : regex.exec(source)
  };
  match.regex = regex;
  return match;
};

// Creates a match function from a regex, ignoring block/inline scope
const anyScopeRegex = function(regex) {
  const match = function(source, state) {
    return regex.exec(source);
  };
  match.regex = regex;
  return match;
};

const UNESCAPE_URL_R = /\\([^0-9A-Za-z\s])/g;
const unescapeUrl = function(rawUrlString) {
  return rawUrlString.replace(UNESCAPE_URL_R, "$1");
};

const isNotAnInteger = str => isNaN(str) || Number(str) % 1 !== 0

const indentRegEx = /^ +/
const insertNewlines = str => {
  // Lists are unlike other blocks in one respect.
  // A list might not have a preceding blank line, if the list is inside another list.
  // Since the RegEx patterns all depend on that blank line, we will scan the top-level
  // list and insert blank lines where needed.
  const lines = str.split("\n")
  let numLines = lines.length
  let i = 0
  let prevIndent = 0
  let prevLineWasEmpty = true
  while (i < numLines) {
    const line = lines[i];
    const isEmptyLine = (line === "")
    if (!isEmptyLine) {
      if (LIST_ITEM_PREFIX_R.test(line)) {
        const match = indentRegEx.exec(line)
        const indent = match ? match[0].length : 0
        if (indent !== prevIndent && !prevLineWasEmpty) {
          // This line starts a new list and needs a preceeding blank line
          lines.splice(i, 0, "")
          i += 1
          numLines += 1
          prevLineWasEmpty = true
          continue
        }
        prevIndent = indent
      }
    }
    prevLineWasEmpty = isEmptyLine
    i += 1
  }
  return lines.join("\n")
}

const parseList = (str, state) => {
  if (!state.inList) {
    // This is a top-level list.
    str = str.replace(LIST_BLOCK_END_R, "\n")
    str = insertNewlines(str)
  }
  const items = str.match(LIST_ITEM_R);
  const isTight = !/\n\n/.test(str.replace(/\n*$/, ""))
  // Backup our state for restoration afterwards.
  const oldStateList = state.inList;
  state.inList = true;
  const itemContent = items.map(function(item, i) {
    // We need to see how far indented this item is:
    const prefixCapture = LIST_ITEM_PREFIX_R.exec(item);
    const space = prefixCapture ? prefixCapture[0].length : 0;
    // And then we construct a regex to "unindent" the subsequent
    // lines of the items by that amount:
    const spaceRegex = new RegExp("^ {1," + space + "}", "gm");

    // Before processing the item, we need a couple things
    const contentStr = item
      // remove indents on trailing lines:
      .replace(spaceRegex, "")
      // remove the bullet:
      .replace(LIST_ITEM_PREFIX_R, "");

    // Backup our state for restoration afterwards.
    const oldStateInline = state.inline;

    // Parse the list item
    state.inline = isTight
    const adjustedContent = contentStr.replace(LIST_ITEM_END_R, "");
    const content = parse(adjustedContent, state)
    const result = isTight
      ? { type: "tight_list_item", content: [{ "type": "paragraph", "content": content }] }
      : { type: "list_item", content }

    // Restore our state before returning
    state.inline = oldStateInline;
    return result;
  });

  state.inList = oldStateList
  return itemContent
}

const TABLES = (function() {
  const TABLE_ROW_SEPARATOR_TRIM = /^ *[|+] *| *[|+] *$/g;
  const TABLE_RIGHT_ALIGN = /^[-=]+:$/;
  const TABLE_CENTER_ALIGN = /^:[-=]+:$/;

  const parseTableAlign = function(source) {
    // Inspect ":" characters to set column justification.
    // Return class names that specify center or right justification on specific columns.
    source = source.replace(TABLE_ROW_SEPARATOR_TRIM, "");
    const alignArr = source.trim().split(/[|+]/)
    let alignStr = ""
    for (let i = 0; i < alignArr.length; i++) {
      alignStr += TABLE_CENTER_ALIGN.test(alignArr[i])
        ? ` c${String(i + 1)}c`
        : (TABLE_RIGHT_ALIGN.test(alignArr[i])
        ? ` c${String(i + 1)}r`
        : "")
    }
    return alignStr.trim()
  };

  const tableDirectives = (directives, align) => {
    // Get CSS class, ID, and column widths, if any.
    if (!directives && align === "") { return ["", "", null] }
    const userDefClass = tableClassRegEx.exec(directives)
    let myClass = userDefClass
      ? (userDefClass[1] ? userDefClass[1] : userDefClass[2] )
      : ""
    const isSpreadsheet = myClass && myClass.split(" ").includes("spreadsheet")
    if (align.length > 0) { myClass += (myClass.length > 0 ? " " : "") + align }
    const userDefId = ID_R.exec(directives)
    const myID = (userDefId) ? userDefId[1] : ""
    const colWidthMatch = COL_WIDTHS_R.exec(directives)
    const colWidths = (colWidthMatch) ? colWidthMatch[1].split(" ") : null
    return [myClass, myID, isSpreadsheet, colWidths]
  }

  const pipeRegEx = /(?<!\\)\|/  // eslint doesn't like look behind. Disregard the warning.

  const parsePipeTableRow = function(source, parse, state, isSpreadsheet,
                                     colWidths, inHeader) {
    const cells = source.trim().split(pipeRegEx)
    cells.shift()
    cells.pop()
    const tableRow = [{ type: "tableSeparator" }]
    for (const str of cells) {
      const cell = isSpreadsheet
        ? [{ type: "spreadsheet_cell", attrs: { entry: str.trim() } }]
        : parse(str.trim(), state)
      tableRow.push(...cell)
      tableRow.push({ type: "tableSeparator" })
    }
    consolidate(tableRow)

    const row = {
      type: "table_row",
      content: []
    }
    let j = -1
    tableRow.forEach(function(node, i) {
      if (node.type === "text") {
        if (i > 0 && tableRow[i - 1].type === "tableSeparator") {
          node.text = node.text.replace(leadingSpaceRegEx, "")
        }
        if (i < tableRow.length - 1) {
          node.text = node.text.replace(trailingSpaceRegEx, "")
        }
      }
      if (node.type === "tableSeparator") {
        if (i !== tableRow.length - 1) {  // Filter out the row's  last table separator
          // Create a new cell
          j += 1
          row.content.push({
            "type": inHeader ? "table_header" : "table_cell",
            "attrs": {
              "colspan": 1,
              "rowspan": 1,
              "colwidth": (colWidths) ? [Number(colWidths[j])] : null,
              "background": null
            },
            content: (state.inHtml || isSpreadsheet
              ? []
              : [{ "type": "paragraph", "content": [] }]
            )
          });
        }
      } else if (state.inHtml || isSpreadsheet) {
        // For direct to HTML, write the inline contents directly into the <td> element.
        // row   cell    content      text
        row.content[j].content.push(node)
      } else {
        // Hurmet.app table cells always contain a paragraph.
        // row   cell  paragraph  content      text
        row.content[j].content[0].content.push(node)
      }
    });

    return row;
  };

  const parsePipeTable = function() {
    return function(capture, state) {
      state.inline = true
      const align = parseTableAlign(capture[3])
      const [myClass, myID, isSpreadsheet, colWidths] = tableDirectives(capture[5], align)
      const table = {
        type: "table",
        attrs: {},
        content: []
      }
      if (myID) { table.attrs.name = myID }
      if (myClass) { table.attrs.class = myClass }
      if (isSpreadsheet) { table.attrs.dtype = dt.SPREADSHEET }
      if (colWidths && state.inHtml) {
        let sum = 0
        colWidths.forEach(el => { sum += Number(el) } )
        table.attrs.style = `width: ${sum}px`
        const colGroup = { type: "colGroup", content: [] }
        for (const width of colWidths) {
          colGroup.content.push({ type: "col", attrs: [{ style: `width: ${width}px` }] })
        }
        table.content.push(colGroup)
      }
      if (!/^\|+$/.test(capture[2])) {
        table.content.push(parsePipeTableRow(capture[2], parse, state, isSpreadsheet,
                                             colWidths, true))
      }
      const tableBody = capture[4].trim().split("\n")
      tableBody.forEach(row => {
        table.content.push(parsePipeTableRow(row, parse, state, isSpreadsheet,
                                             colWidths, false))
      })
      state.inline = false;
      if (capture[1]) {
        const figure = { type: "figure", attrs: { class: "" }, content: [
          { type: "figcaption", content: parseInline(capture[1], state) },
          table
        ] }
        if (capture[5]) {
          const match = floatRegEx.exec(capture[5])
          if (match) { figure.attrs.class = match[1] }
        }
        return figure
      } else {
        return table
      }
    };
  };

  const headerRegEx = /^\+:?=/
  const gridSplit = / *\n/g
  const cellCornerRegEx = /^\+[-=:]+\+[+=:-]+\+$/g

  const parseGridTable = function() {
    return function(capture, state) {
      const topBorder = capture[3];
      const lines = capture[2].slice(0, -1).split(gridSplit)

      // Does the grid table contain a line separating header from table body?
      let headerExists = false
      let headerSepLine = lines.length + 10
      for (let i = 0; i < lines.length; i++) {
        if (headerRegEx.test(lines[i])) {
          headerExists = true
          headerSepLine = i
          break
        }
      }

      // Get column justification
      const alignrow = headerExists ? lines[headerSepLine] : topBorder.slice(1)
      const align = parseTableAlign(alignrow)
      const [myClass, myID, isSpreadsheet, colWidths] = tableDirectives(capture[4], align)

      // Read the top & left borders to find a first draft of cell corner locations.
      const colSeps = [0]
      for (let j = 1; j < topBorder.length; j++) {
        if (topBorder.charAt(j) === "+") { colSeps.push(j) }
      }
      const rowSeps = [0]
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].charAt(0) === "+") { rowSeps.push(i) }
      }

      // Look for the cell corner locations that don't appear on top or left border
      let rowSepIndex = 0
      while (rowSepIndex < rowSeps.length) {
        // Find the next row separator
        let nextRow = 0
        const isValid = new Array(colSeps.length).fill(true)
        for (let i = rowSeps[rowSepIndex] + 1; i < lines.length; i++) {
          for (let k = 0; k < colSeps.length; k++) {
            if (!isValid[k]) { continue }
            if ("+|".indexOf(lines[i][colSeps[k]]) === -1) { isValid[k] = false; continue }
            if (lines[i][colSeps[k]] === "+") {
              nextRow = i
              break
            }
          }
          if (nextRow !== 0) { break }
        }
        if (!rowSeps.includes(nextRow)) {
          rowSeps.splice(rowSepIndex + 1, 0, nextRow)
        }

        // Check the next horizontal border for new cell corners
        rowSepIndex += 1
        const border = lines[nextRow];
        for (let j = 0; j < colSeps.length - 1; j++) {
          let cellBorder = border.slice(colSeps[j], colSeps[j + 1] + 1)
          if (cellCornerRegEx.test(cellBorder)) {
            cellBorder = cellBorder.slice(1, -1)
            let pos = cellBorder.indexOf("+") + 1
            let k = 1
            while (pos > 0) {
              colSeps.splice(j + k, 0, colSeps[j] + pos)
              pos = cellBorder.indexOf("+", pos) + 1
              k += 1
            }
          }
        }
      }

      const numCols = colSeps.length - 1
      const numRows = rowSeps.length - 1
      const gridTable = []

      // Create default rows and cells. They may be merged later.
      for (let i = 0; i < numRows; i++) {
        const row = new Array(numCols)
        for (let j = 0; j < numCols; j++) { row[j] = { rowspan: 1 } }
        gridTable.push(row)
      }

      for (let i = 0; i < numRows; i++) {
        const row = gridTable[i]
        // Determine the actual rowspan and colspan of each cell.
        for (let j = 0; j < numCols; j++) {
          const cell = row[j]
          if (cell.rowspan === 0) { continue }
          cell.colspan = 1
          const lastTextRow = lines[rowSeps[i + 1] - 1]
          for (let k = j + 1; k < colSeps.length; k++) {
            if (lastTextRow.charAt(colSeps[k]) === "|") { break }
            cell.colspan += 1
            row[k].rowspan = 0
          }
          for (let k = i + 1; k < rowSeps.length; k++) {
            const ch = lines[rowSeps[k]].charAt(colSeps[j] + 1)
            if ("-=:".indexOf(ch) > -1) { break }
            cell.rowspan += 1
            for (let jj = 0; jj < cell.colspan; jj++) {
              gridTable[k][j + jj].rowspan = 0
            }
          }
          // Now that we know the cell extents, get the cell contents.
          const xStart = colSeps[j] + 1
          const xEnd = colSeps[j + cell.colspan]
          const yStart = rowSeps[i] + 1
          const yEnd = rowSeps[i + cell.rowspan]
          let str = ""
          for (let ii = yStart; ii < yEnd; ii++) {
            str += lines[ii].slice(xStart, xEnd).replace(/ +$/, "") + "\n"
          }
          cell.blob = str.slice(0, -1).replace(/^\n+/, "")
          const leadingSpacesMatch = /^ +/.exec(cell.blob)
          if (leadingSpacesMatch) {
            const numLeadingSpaces = leadingSpacesMatch[0].length
            const spaceRegEx = new RegExp("^" + " ".repeat(numLeadingSpaces), "gm")
            cell.blob = cell.blob.replace(spaceRegEx, "")
          }

          cell.inHeader = (headerExists && yStart < headerSepLine)

          if (colWidths) {
            // Set an attribute used by ProseMirror.
            const cellWidth = cell.colspan === 0 ? null : [];
            for (let k = 0; k < cell.colspan; k++) {
              cellWidth.push(Number(colWidths[j + k]))
            }
            cell.width = cellWidth
          }
        }
      }

      const table = {
        type: "table",
        attrs: {},
        content: []
      }
      if (myID) { table.attrs.name = myID }
      if (myClass) { table.attrs.class = myClass }
      if (isSpreadsheet) { table.attrs.dtype = dt.SPREADSHEET }
      let k = 0
      if (colWidths && state.inHtml) {
        let sum = 0
        colWidths.forEach(el => { sum += Number(el) } )
        table.attrs.style = `width: ${sum}px`
        const colGroup = { type: "colGroup", attrs: null, content: [] }
        for (const width of colWidths) {
          colGroup.content.push({ type: "col", attrs: [{ style: `width: ${width}px` }] })
        }
        table.content.push(colGroup)
        k = 1
      }
      for (let i = 0; i < numRows; i++) {
        table.content.push({ type: "table_row", content: [] } )
        for (let j = 0; j < numCols; j++) {
          if (gridTable[i][j].rowspan === 0) { continue }
          const cell = gridTable[i][j];
          state.inline = false
          let content = isSpreadsheet
            ? [{ type: "spreadsheet_cell", attrs: { entry: cell.blob.trim() } }]
            : parse(cell.blob, state)
          if (state.inHtml && content.length === 1 && content[0].type === "paragraph") {
            content = content[0].content
          }
          if (content.length === 1 && content[0].type === "null") {
            content = [{ type: "paragraph", content: [] }]
          }
          table.content[i + k].content.push({
            "type": cell.inHeader ? "table_header" : "table_cell",
            "attrs": {
              "colspan": cell.colspan,
              "rowspan": cell.rowspan,
              "colwidth": (colWidths) ? cell.width : null,
              "background": null
            },
            content: content
          })
        }
      }
      state.inline = false
      if (capture[1]) {
        const figure = { type: "figure", attrs: { class: "" }, content: [
          { type: "figcaption", attrs: null, content: parseInline(capture[1], state) },
          table
        ] }
        if (capture[4]) {
          const match = floatRegEx.exec(capture[4])
          if (match) { figure.attrs.class = match[1] }
        }
        return figure
      } else {
        return table
      }
    };
  };

  return {
    parsePipeTable: parsePipeTable(),
    PIPE_TABLE_REGEX: /^(?:: ((?:[^\n]|\n(?!\||:|<\/dl>))*)\n)?(\|.*)\n\|([-:]+[-| :]*)\n((?:\|.*(?:\n|$))*)(?:\{([^\n}]+)\}\n)?\n*/,
    parseGridTable: parseGridTable(),
    GRID_TABLE_REGEX: /^(?:: ((?:[^\n]|\n(?!\+|:|<\/dl>))*)\n)?((\+(?:[-:=]+\+)+)\n(?:[+|][^\n]+[+|] *\n)+)(?:\{([^\n}]+)\}\n)?\n*/
  };
})();

const LINK_INSIDE = "(?:\\[[^\\]]*\\]|[^\\[\\]]|\\](?=[^\\[]*\\]))*";
const LINK_HREF_AND_TITLE =
  "\\s*<?((?:\\([^)]*\\)|[^\\s\\\\]|\\\\.)*?)>?(?:\\s+['\"]([\\s\\S]*?)['\"])?\\s*";

const linkIndex = marks => {
  for (let i = 0; i < marks.length; i++) {
    if (marks[i].type === "link") { return i }
  }
}

// Pattern to find Hurmet calculation results.
// This will be replaced in the entry with the display selector.
const resultRegEx = /〔[^〕]*〕/
const drawRegEx = /^draw\(/

const parseRef = function(capture, state, refNode) {
  // Handle implicit refs: [title][<ref>], ![alt or caption][<ref>]
  let ref = capture[2] ? capture[2] : capture[1];
  ref = ref.replace(/\s+/g, " ");

  // We store defs in state._defs (_ to deconflict with client-defined state).
  if (state._defs && state._defs[ref]) {
    const def = state._defs[ref];
    if (refNode.type === "figure") {
      refNode = { type: "figure", attrs: def.attrs, content: [
        { type: "figimg", attrs: def.attrs },
        { type: "figcaption", content: parseInline(refNode.attrs.alt, state) }
      ] }
      refNode.content[0].attrs.src = def.target
      if (def.attrs.alt) { refNode.content[0].attrs.alt = def.attrs.alt }
    } else if (refNode.type === "image") {
      if (drawRegEx.test(def.target)) {
        const entry = def.target.replace(/\\n/g, "\n")
        return { type: "calculation", attrs: { entry } }
      } else {
        refNode.attrs = def.attrs
        refNode.attrs.src = def.target
      }
    } else {
      // refNode is a link
      refNode.attrs.href = def.target;
    }
  }
  return refNode;
};

const parseTextMark = (capture, state, mark) => {
  const text = parseInline(capture, state)
  if (Array.isArray(text) && text.length === 0) { return text }
  consolidate(text)
  for (const range of text) {
    if (range.marks) {
      range.marks.push({ type: mark })
    } else {
      range.marks = [{ type: mark }]
    }
  }
  return text
}

const BLOCK_HTML = /^ *(?:<(head|h[1-6]|p|pre|label|script|style|table)[\s>][\s\S]*?(?:<\/\1>[^\n]*\n)|<(?:\/?(?:!DOCTYPE html|body|li|br|hr|(?:div|article|details|input|ul|ol|dl|main|nav)(?: (?:class|id|name|style|type)=(["'])[A-Za-z0-9_.:;\- ]+\2){0,2})|\/?html(?: lang=(["'])[a-z]+\3)?)>[^\n]*?(?:\n|$))/

// Rules must be applied in a specific order, so use a Map instead of an object.
const rules = new Map();
rules.set("html", {
  isLeaf: true,
  match: blockRegex(BLOCK_HTML),
  parse: function(capture, state) {
    if (!state.inHtml) { return null }
    return { type: "html", text: capture[0] }
  }
});
rules.set("htmlComment", {
  isLeaf: true,
  match: blockRegex(/^ *<!--[^>]+-->[^\n]*\n/),
  parse: function(capture, state) {
    return { type: "null" }
  }
}),
rules.set("lheading", {
  isLeaf: false,
  match: blockRegex(/^([^\n]+)\n *(=|-){3,} *(?:\n *)+\n/),
  parse: function(capture, state) {
    return {
      type: "heading",
      attrs: { level: capture[2] === '=' ? 1 : 2 },
      content: parseInline(capture[1].trim(), state)
    };
  }
});
rules.set("heading", {
  isLeaf: false,
  match: blockRegex(/^ *(#{1,6})([^\n]+?)#* *(?:\n *)+\n/),
  parse: function(capture, state) {
    return {
      attrs: { level: capture[1].length },
      content: parseInline(capture[2].trim(), state)
    };
  }
});
rules.set("dt", {  // description term
  isLeaf: false,
  match: blockRegex(/^(([^\n]*)\n)(?=<dd>|\n: [^\n]+\n[^|+])/),
  parse: function(capture, state) {
    return { content: parseInline(capture[2].trim(), state) }
  }
})
rules.set("horizontal_rule", {
  isLeaf: true,
  match: blockRegex(/^( *[-*_]){3,} *(?:\n *)+\n/),
  parse: function(capture, parse, state) {
    return { type: "horizontal_rule" };
  }
});
rules.set("codeBlock", {
  isLeaf: true,
  match: blockRegex(/^(?:(?:\t| {4})[^\n]+\n*)+(?:\n *)+\n/),
  parse: function(capture, state) {
    const content = capture[0].replace(/^(\t| {4})/gm, '').replace(/\n+$/, '');
    return {
      type: "code_block",
      content: [{ type: "text", text: content }]
    };
  }
});
rules.set("fence", {
  isLeaf: true,
  match: blockRegex(/^(```|~~~) *(?:(\S+) *)?\n([\s\S]+?)\n?\1 *(?:\n *)+\n/),
  parse: function(capture, state) {
    return {
      type: "code_block",
//      lang: capture[2] || undefined,
      content: [{ type: "text", text: capture[3] }]
    };
  }
});
rules.set("alert", {
  isLeaf: false,
  match: blockRegex(/^(?: *> \[!(NOTE|TIP|IMPORTANT|WARNING|EPIGRAPH)\])((?:\n *>(?! *\[!)[^\n]*)+)(?:\n *)+\n/),
  // Alert for note |tip | important | warning |epigraph
  parse: function(capture, state) {
    const cap = capture[2].replace(/\n *> ?/gm, "\n").replace(/^\n/, "")
    const content = parse(cap, state)
    return { type: capture[1].toLowerCase(), content }
  }
})
rules.set("blockquote", {
  isLeaf: false,
  match: blockRegex(/^>([^\n]*(?:\n *>[^\n]*)*)(?:\n *)+\n/),
  parse: function(capture, state) {
    const content = capture[1].replace(/\n *> ?/gm, "\n")
    return { content: parse(content, state) };
  }
});
rules.set("ordered_list", {
  isLeaf: false,
  match: blockRegex(/^( {0,3})(?:(?:(\d{1,9})|([A-Z])|([a-z]))[.)]) [\s\S]+?(?:\n{2,}(?! )(?!\1(?:\d{1,9}\.) )\n*|\s*$)/),
  parse: function(capture, state) {
    const start = capture[2]
      ? Number(capture[2])
      : capture[3]
      ? capture[3].codePointAt(0) - 64
      : capture[4].codePointAt(0) - 96
    const className = capture[2] ? "decimal" : capture[3] ? "upper-alpha" : "lower-alpha"
    return {
      attrs: { class: className, order: start },
      content: parseList(capture[0], state)
    }
  }
})
rules.set("bullet_list", {
  isLeaf: false,
  match: blockRegex(/^( {0,3})([*+-]) [\s\S]+?(?:\n{2,}(?! )(?!\1(?:[*+-]) )\n*|\s*$)/),
  parse: function(capture, state) {
    return { content: parseList(capture[0], state) }
  }
});
rules.set("special_div", {
  isLeaf: false,
  match: blockRegex(/^(:{3,}) ?(indented|comment|centered|right_justified|boxed|header|hidden) *\n([\s\S]+?)\n+\1 *(?:\n{2,}|\s*$)/),
  // indented or centered or right-justified or boxed or comment div, or <header>
  parse: function(capture, state) {
    const content = parse(capture[3], state)
    return { type: capture[2], content };
  }
});
rules.set("figure", {
  isLeaf: true,
  match: blockRegex(/^!!\[((?:(?:\\[\s\S]|[^\\])+?)?)\]\[([^\]]*)\] *(?:\n *)+\n/),
  parse: function(capture, state) {
    if (isNotAnInteger(capture[1])) {
      return parseRef(capture, state, { type: "figure", attrs: { alt: capture[1] } });
    } else {
      return parseRef(capture, state, { type: "figure" });
    }
  }
});
rules.set("def", {
  isLeaf: true,
  match: blockRegex(/^\[([^\]\n]+)\]: *(?:¢(`+)([\s\S]*?[^`])\2(?!`)|<?([^\n>]*)>? *(?:\n\{([^\n}]*)\})?)/),
  // Link reference definitions were handled in md2ast().
  parse: function(capture, state) { return { type: "null" } }
});
rules.set("toc", {
  isLeaf: true,
  match: blockRegex(/^{\.toc start=(\d) end=(\d)}\n/),
  parse: function(capture, state) {
    return { attrs: { start: Number(capture[1]), end: Number(capture[2]), body: [] } }
  }
});
rules.set("pipeTable", {
  isLeaf: false,
  match: blockRegex(TABLES.PIPE_TABLE_REGEX),
  parse: TABLES.parsePipeTable
});
rules.set("gridTable", {
  isLeaf: false,
  match: blockRegex(TABLES.GRID_TABLE_REGEX),
  parse: TABLES.parseGridTable
});
rules.set("dd", {  // description details
  isLeaf: false,
  match: blockRegex(/^:( +)[\s\S]+?(?:\n{2,}(?! |:)(?!\1)\n*|\s*$)/),
  parse: function(capture, state) {
    let div = " " + capture[0].slice(1)
    const indent = 1 + capture[1].length
    const spaceRegex = new RegExp("^ {" + indent + "," + indent + "}", "gm");
    div = div.replace(spaceRegex, "") // remove indents on trailing lines:
    return { content: parse(div, state) };
  }
});
rules.set("displayTeX", {
  isLeaf: true,
  match: blockRegex(/^\$\$\n?((?:\\[\s\S]|[^\\])+?)\n?\$\$ *(?:\n|$)/),
  parse: function(capture, state) {
    const tex = capture[1].trim()
    if (state.convertTex) {
      const entry = texToCalc(tex)
      return { type: "calculation", attrs: { entry, displayMode: true } }
    } else {
      return { type: "tex", attrs: { tex, displayMode: true } }
    }
  }
})
rules.set("newline", {
  isLeaf: true,
  match: blockRegex(/^(?:\n *)*\n/),
  parse: function() { return { type: "null" } }
});
rules.set("emptyParagraph", {
  isLeaf: true,
  match: blockRegex(/^¶(?:\n *)+\n/),
  parse: function(capture, state) {
    return { type: "paragraph", content: [] }
  }
});
rules.set("paragraph", {
  isLeaf: false,
  match: blockRegex(/^((?:[^\n]|\n(?!(?: *\n|(?=[*+-] )|(?=(?:\d{1,9}|[A-Za-z])[.)] ))))+)\n(?:(?: *\n)+|(?=[*+-] )|(?=(?:\d{1,9}|[A-Za-z])[.)] ))/),
  parse: function(capture, state) {
    return { type: "paragraph", content: parseInline(capture[1], state) }
  }
});
rules.set("escape", {
  // We don't allow escaping numbers, letters, or spaces here so that
  // backslashes used in plain text still get rendered. But allowing
  // escaping anything else provides a very flexible escape mechanism,
  // regardless of how this grammar is extended.
  isLeaf: true,
  match: inlineRegex(/^\\([^0-9A-Za-z\s])/),
  parse: function(capture, state) {
    return {
      type: "text",
      text: capture[1]
    };
  }
});
rules.set("tableSeparator", {
  isLeaf: true,
  match: function(source, state) {
    if (!state.inTable) { return null }
    return /^ *\| */.exec(source);
  },
  parse: function() {
    return { type: "tableSeparator" };
  }
});
rules.set("link", {
  isLeaf: true,
  match: inlineRegex(
    new RegExp("^\\[(" + LINK_INSIDE + ")\\]\\(" + LINK_HREF_AND_TITLE + "\\)")
  ),
  parse: function(capture, state) {
    const textNode = parseTextMark(capture[1], state, "link" )[0]
    const i = linkIndex(textNode.marks)
    textNode.marks[i].attrs = { href: unescapeUrl(capture[2]) }
    return textNode
  }
});
rules.set("image", {
  isLeaf: true,
  match: inlineRegex(
    new RegExp("^!\\[(" + LINK_INSIDE + ")\\]\\(" + LINK_HREF_AND_TITLE + "\\)")
  ),
  parse: function(capture, state) {
    if (isNotAnInteger(capture[1])) {
      return { attrs: { alt: capture[1], src: unescapeUrl(capture[2]) } }
    } else {
      return { attrs: { src: unescapeUrl(capture[2]) } }
    }
  }
});
rules.set("reflink", {
  isLeaf: true,
  match: inlineRegex(/^\[((?:(?:\\[\s\S]|[^\\])+?)?)\]\[([^\]]*)\]/),
  parse: function(capture, state) {
    const defIndex = capture[2] ? capture[2] : capture[1];
    const textNode = parseTextMark(capture[1], state, "link" )[0];
    const i = linkIndex(textNode.marks)
    textNode.marks[i].attrs = { href: state._defs[defIndex].target }
    return textNode
  }
});
rules.set("footnote", {
  isLeaf: true,
  match: inlineRegex(/^\[\^(\d+)\]/),
  parse: function(capture, state) {
    const index = Number(capture[1]) - 1
    return { type: "footnote", content: parseInline(state.footnotes[index], state) }
  }
})
rules.set("refimage", {
  isLeaf: true,
  match: inlineRegex(/^!\[((?:(?:\\[\s\S]|[^\\])+?)?)\]\[([^\]]*)\]/),
  parse: function(capture, state) {
    //if (isNotAnInteger(capture[1])) {
    return parseRef(capture, state, { type: "image", attrs: { alt: capture[1] } });
    //} else {
    //  return parseRef(capture, state, { type: "image" });
   // }
  }
});
rules.set("autolink", {
  isLeaf: true,
  match: inlineRegex(/^<([^: >]+:\/[^ >]+)>/),
  parse: function(capture, state) {
    const textNode = parseTextMark(capture[1], state, "link" )[0]
    const i = linkIndex(textNode.marks)
    textNode.marks[i].attrs = { href: unescapeUrl(capture[1]) }
    return textNode
  }
});
rules.set("code", {
  isLeaf: true,
  match: inlineRegex(/^(`+)([\s\S]*?[^`])\1(?!`)/),
  parse: function(capture, state) {
    const text = capture[2].trim()
    return [{ type: "text", text, marks: [{ type: "code" }] }]
  }
});
rules.set("tex", {
  isLeaf: true,
  match: inlineRegex(/^(?:\$\$((?:\\[\s\S]|[^\\])+?)\$\$|\$(`+)((?:(?:\\[\s\S]|[^\\])+?)?)\2\$(?![0-9$])|\$(?!\s|\$)((?:(?:\\[\s\S]|[^\\])+?)?)(?<=[^\s\\$])\$(?![0-9$]))/),
  parse: function(capture, state) {
    if (capture[1]) {
      const tex = capture[1].trim()
      if (state.convertTex) {
        const entry = texToCalc(tex)
        return { type: "calculation", attrs: { entry, displayMode: true } }
      } else {
        return { type: "tex", attrs: { tex, displayMode: true } }
      }
    } else {
      const tex = (capture[3] ? capture[3] : capture[4]).trim()
      if (state.convertTex) {
        const entry = texToCalc(tex)
        return { type: "calculation", attrs: { entry, displayMode: false } }
      } else {
        return { type: "tex", attrs: { tex, displayMode: false } }
      }
    }
  }
});
rules.set("calculation", {
  isLeaf: true,
  match: anyScopeRegex(/^(?:¢(\?\?|\?|%%|%|@@|@)?(`+)([\s\S]*?[^`])\2(?!`)|¢¢(\?\?|\?|%%|%|@@|@)?\n?((?:\\[\s\S]|[^\\])+?)\n?¢¢)/),
  parse: function(capture, state) {
    if (capture[3]) {
      let entry = capture[3].trim()
      if (capture[1]) {
        entry = entry.replace(resultRegEx, capture[1])
      }
      if (!/^(?:function|draw\()/.test(entry) && entry.indexOf("``") === -1) {
        entry = entry.replace(/\n/g, " ")
      }
      return { attrs: { entry } }
    } else {
      let entry = capture[5].trim()
      if (capture[4]) {
        entry = entry.replace(resultRegEx, capture[4])
      }
      return { attrs: { entry, displayMode: true } }
    }
  }
});
rules.set("em", {
  isLeaf: true,
  match: inlineRegex(/^([_*])(?!\s|\1)((?:\\[\s\S]|[^\\])+?)\1/),
  parse: function(capture, state) {
    return parseTextMark(capture[2], state, "em" )
  }
});
rules.set("strong", {
  isLeaf: true,
  match: inlineRegex(/^(\*\*|__)(?=\S)((?:\\[\s\S]|[^\\])+?)\1/),
  parse: function(capture, state) {
    return parseTextMark(capture[2], state, "strong" )
  }
});
rules.set("del", {
  isLeaf: true,
  match: inlineRegex(/^<del>([\s\S]*?)<\/del>/),
  parse: function(capture, state) {
    return parseTextMark(capture[1], state, "strikethru" )
  }
});
rules.set("strikethru", {
  isLeaf: true,
  match: inlineRegex(/^~~(?=\S)((?:\\[\s\S]|~(?!~)|[^\s~\\]|\s(?!~~))+?)~~/),
  parse: function(capture, state) {
    return parseTextMark(capture[1], state, "strikethru" )
  }
});
rules.set("superscript", {
  isLeaf: true,
  match: inlineRegex(/^<sup>([\s\S]*?)<\/sup>/),
  parse: function(capture, state) {
    return parseTextMark(capture[1], state, "superscript" )
  }
});
rules.set("carat", {
  isLeaf: true,
  match: inlineRegex(/^\^((?:\\[\s\S]|[^\\])+?)\^/),
  parse: function(capture, state) {
    return parseTextMark(capture[1], state, "superscript" )
  }
});
rules.set("subscript", {
  isLeaf: true,
  match: inlineRegex(/^<sub>([\s\S]*?)<\/sub>/),
  parse: function(capture, state) {
    return parseTextMark(capture[1], state, "subscript" )
  }
});
rules.set("tilde", {
  isLeaf: true,
  match: inlineRegex(/^~((?:\\[\s\S]|[^\\])+?)~/),
  parse: function(capture, state) {
    return parseTextMark(capture[1], state, "subscript" )
  }
});
rules.set("underline", {
  isLeaf: true,
  match: inlineRegex(/^<u>([\s\S]*?)<\/u>/),
  parse: function(capture, state) {
    return parseTextMark(capture[1], state, "underline" )
  }
});
rules.set("highlight", {
  isLeaf: true,
  match: inlineRegex(/^<mark>([\s\S]*?)<\/mark>/),
  parse: function(capture, state) {
    return parseTextMark(capture[1], state, "highlight" )
  }
});
rules.set("hard_break", {
  isLeaf: true,
  match: anyScopeRegex(/^(\\| {2})\n/),
  parse: function() { return { text: "\n" } }
});
rules.set("inline_break", {
  isLeaf: true,
  match: anyScopeRegex(/^<br>/),
  parse: function() { return { type: "hard_break", text: "\n" } }
});
rules.set("span", {
  isLeaf: true,
  match: inlineRegex(/^<span [a-z =":]+>[^<]+<\/span>/),
  parse: function(capture, state) {
    return !state.inHtml ? null : { type: "html", text: capture[0] }
  }
});
rules.set("text", {
  // We break on symbol characters, double newlines, or double-space-newlines.
  isLeaf: true,
  match: anyScopeRegex(/^[\s\S]+?(?=[_*`#>|\\\-+=![({$¢¶<~^+:]|\n\n| {2,}\n|\d+[.)]|\w+:\S|$)/),
  parse: function(capture, state) {
    return {
      text: capture[0].replace(/\n/g, " ")
    };
  }
});


const parse = (source, state) => {
  if (!state.inline) { source += "\n\n" }
  source = preprocess(source)
  const result = [];
  while (source) {
    // store the best match and its rule:
    let capture = null
    let ruleName = null
    let rule = null
    for (const [currRuleName, currRule] of rules) {
      capture = currRule.match(source, state)
      if (capture) {
        rule = currRule
        ruleName = currRuleName
        break
      }
    }
    const parsed = rule.parse(capture, state);
    if (Array.isArray(parsed)) {
      Array.prototype.push.apply(result, parsed);
    } else {
      if (parsed.type == null) { parsed.type = ruleName }
      result.push(parsed)
    }
    state.prevCapture = capture[0]
    source = source.substring(capture[0].length)
  }
  return result
};



/**
 * Parse some content with the parser `parse`, with state.inline
 * set to true. Useful for block elements; not generally necessary
 * to be used by inline elements (where state.inline is already true.
 */
const parseInline = function(content, state) {
  const isCurrentlyInline = state.inline || false;
  state.inline = true;
  const result = parse(content, state);
  state.inline = isCurrentlyInline;
  return result;
};


// recognize a `*` `-`, `+`, `1.`, `2.`, `A.`, `a,`... list bullet
const LIST_BULLET = "(?:[*+-]|(?:\\d+|[A-Za-z])[\\.\\)])";
// recognize the start of a list item:
// leading space plus a bullet plus a space (`   * `)
const LIST_ITEM_PREFIX = "( *)(" + LIST_BULLET + ") +";
const LIST_ITEM_PREFIX_R = new RegExp("^" + LIST_ITEM_PREFIX);
// recognize an individual list item:
//  * hi
//    this is part of the same item
//
//    as is this, which is a new paragraph in the same item
//
//  * but this is not part of the same item
const LIST_ITEM_R = new RegExp(
  LIST_ITEM_PREFIX + "[^\\n]*(?:\\n" + "(?!\\1" + LIST_BULLET + " )[^\\n]*)*(\n|$)",
  "gm"
);
const BLOCK_END_R = /\n{2,}$/;
// recognize the end of a paragraph block inside a list item:
// two or more newlines at end end of the item
const LIST_BLOCK_END_R = BLOCK_END_R;
const LIST_ITEM_END_R = / *\n+$/;

const consolidate = arr => {
  if (Array.isArray(arr) && arr.length > 0) {
    // Group any text nodes together into a single string output.
    for (let i = arr.length - 1; i > 0; i--) {
      const node = arr[i];
      const prevNode = arr[i - 1]
      if (node.type === 'text' && prevNode.type === 'text' &&
          !node.marks && !prevNode.marks) {
        prevNode.text += node.text
        arr.splice(i, 1)
      } else if ((node.type === 'indented' && prevNode.type === 'indented') ||
                 (node.type === 'centered' && prevNode.type === 'centered')) {
        prevNode.content = prevNode.content.concat(node.content)
        arr.splice(i, 1)
      } else if (node.type === "null") {
        arr.splice(i, 1)
      } else if (!rules.has(node.type) || !rules.get(node.type).isLeaf) {
        consolidate(node.content)
      }
    }

    if (!rules.has(arr[0].type) || !rules.get(arr[0].type).isLeaf) {
      consolidate(arr[0].content)
    }
  }
}

const populateTOC = ast => {
  let tocNode
  for (const node of ast) {
    if (node.type === "toc") { tocNode = node; break }
  }
  if (!tocNode) { return }
  const start = tocNode.attrs.start
  const end = tocNode.attrs.end
  for (const node of ast) {
    if (node.type === "heading") {
      const level = node.attrs.level
      if (start <= level && level <= end) {
        const tocEntry = [];
        let str = ""
        for (const range of node.content) { str += range.text }
        tocEntry.push(str)
        tocEntry.push(level)
        tocEntry.push(0) // page number unknown
        tocEntry.push(0) // element number unknown
        tocNode.attrs.body.push(tocEntry)
      }
    }
  }
}

const metadataRegEx = /^---+\n((?:[A-Za-z0-9][A-Za-z0-9 _-]*:[^\n]+\n(?:[ \t]+[^\n]+\n)*)+)---+\n/
const metadataItemRegEx = /^[A-Za-z0-9][A-Za-z0-9 _-]*:[^\n]+\n(?:[ \t]+[^\n]+\n)*/
const hurmetMetadataNames = ["decimalFormat", "dateFormat", "fontSize",
  "pageSize", "saveDate"];

const parseMetadata = str => {
  const metadata = {}
  let capture = str.match(metadataItemRegEx)
  while (capture) {
    const item = capture[0].split(":")
    const key = item[0].trim().replace(/ /g, "")
    if (hurmetMetadataNames.includes(key)) {
      const value = item[1].slice(0, -1).trim().replace(/ *\n[ \t]*/g, " ")
      metadata[key] = value
    }
    str = str.slice(capture[0].length)
    capture = str.match(metadataItemRegEx)
  }
  return metadata
}

const dateMessageRegEx = /^date:([^\n]+)\nmessage:([^\n]+)\n/

export const inlineMd2ast = md => {
  const state = { inline: true, _defs: {}, prevCapture: "", inList: false, inHtml: false }
  const ast = parse(md, state)
  if (Array.isArray(ast) && ast.length > 0 && ast[0].type === "null") {
    ast.shift()
  }
  consolidate(ast)
  return ast
}

export const md2ast = (md, inHtml = false, convertTex = false) => {
  // First, check for a metadata preamble
  let metadata = false
  if (metadataRegEx.test(md)) {
    const match = metadataRegEx.exec(md)
    metadata = parseMetadata(match[1])
    md = md.slice(match[0].length)
  }

  // Second, get all the link reference definitions
  const state = {
    inline: false,
    inList: false,
    _defs: {},
    footnotes: [],
    prevCapture: "",
    inHtml,
    convertTex
  }
  const defRegEx = /\n *\[([^\]\n]+)\]: *([^\n]*) *(?:\n\{([^\n}]*)\})?(?=\n)/gm
  const footnoteDefRegEx = /\n *\[\^\d+\]: *([^\n]*)(?=\n)/gm
  let capture
  while ((capture = defRegEx.exec(md)) !== null) {
    const def = capture[1].replace(/\s+/g, " ")
    const target = capture[2].trim();
    const directives = capture[3] || "";

    const attrs = isNotAnInteger(def) ? { alt: def } : {}
    if (directives) {
      const matchClass = CLASS_R.exec(directives)
      const matchWidth = WIDTH_R.exec(directives)
      const matchAlt = ALT_R.exec(directives)
      const matchID = ID_R.exec(directives)
      if (matchClass) { attrs.class = matchClass[1] }
      if (matchWidth) { attrs.width = matchWidth[1] }
      if (matchAlt)   { attrs.alt = matchAlt[1] }
      if (matchID)    { attrs.id = matchID[1] }
    }
    state._defs[def] = { target, attrs }
  }

  // Next, get all the footnote definitions
  capture = null
  while ((capture = footnoteDefRegEx.exec(md)) !== null) {
    state.footnotes.push(capture[1].trim())
  }

  // Find out if there are any snapshots.
  let snapshotStrings = [];
  let gotSnapshot = false
  if (metadata) {
    snapshotStrings = md.split("<!--SNAPSHOT-->\n")
    if (snapshotStrings.length > 1) {
      gotSnapshot = true
      md = snapshotStrings.shift()
    }
  }

  // Find out if there are any fallbacks for fetched files
  let fallbackStrings = [];
  if (metadata) {
    fallbackStrings = md.split("<!--FALLBACKS-->\n")
    if (fallbackStrings.length > 1) {
      md = fallbackStrings.shift()
    } else {
      fallbackStrings = null
    }
  }

  // Proceed to parse the document.
  const ast = parse(md, state)
  if (Array.isArray(ast) && ast.length > 0 && ast[0].type === "null") {
    ast.shift()
  }
  consolidate(ast)
  populateTOC(ast)
  if (metadata) {
    if (fallbackStrings) {
      metadata.fallbacks = JSON.parse(fallbackStrings.pop().trim())
    }
    if (gotSnapshot) {
      const snapshots = []
      for (const str of snapshotStrings) {
        const capture = dateMessageRegEx.exec(str)
        snapshots.push({
          date: capture[1] ? Date.parse(capture[1].trim()) : undefined,
          message: capture[2] ? capture[2].trim() : undefined,
          content: capture ? str.slice(capture[0].length) : str
        })
      }
      metadata.snapshots = snapshots
    }
    return { type: "doc", attrs: metadata, content: ast }
  } else {
    return ast
  }
}
