
/**
 * md2ast() returns an AST that matches the memory structure  of a Hurmet.app document.
 * Elsewhere, Hurmet uses the AST to create either a live Hurmet doc or a static HTML doc.
 *
 * ## Restrictions
 *
 * 1. **_bold-italic_** must use both * & _ delimiters. Hurmet will fail on ***wat***.
 * 2. "Shortcut" reference links [ref] are not recognized.
 *
 * ## Extensions
 *
 * 1. Hurmet inline calculation is delimited ¢`…`.
 *    Hurmet display calculation is delimited ¢¢…¢¢.
 * 2. LaTeX inline math is delimited $…$.
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
 * 10. Table directives. They are placed on the line after the table. The format is:
 *     {.class #id width="num1 num2 …" caption}
 * 11. Lists that allow the user to pick list ordering.
 *        1. →  1. 2. 3.  etc.
 *        A. →  A. B. C.  etc. (future)
 *        a) →  (a) (b) (c)  etc. (future)
 * 12. Fenced divs, similar to Pandoc.
 *     ::: (centered|comment|indented|header)
 *     Block elements
 *     :::
 *     Nested divs are distinguished by number of colons. Minimum three.
 * 13. Table of Contents
 *     {.toc start=N end=N}
 * 14. Definition lists, per Pandoc.  (future)
 * 15. [^1] is a reference to a footnote. (future)
 *     [^1]: The body of the footnote is deferred, similar to reference links.
 * 16. [#1] is a reference to a citation. (future)
 *     [#1]: The body of the citation is deferred, similar to reference links.
 * 17. Line blocks begin with "| ", as per Pandoc. (future)
 *
 * hurmetMark.js copyright (c) 2021 - 2023 Ron Kok
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


const CR_NEWLINE_R = /\r\n?/g;
const FORMFEED_R = /\f/g;
const CLASS_R = /(?:^| )\.([a-z-]+)(?: |$)/
const WIDTH_R = /(?:^| )width="?([\d.a-z]+"?)(?: |$)/
const COL_WIDTHS_R = /(?:^| )colWidths="([^"]*)"/
const ID_R = /(?:^| )#([a-z-]+)(?: |$)/
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

const parseList = (str, state) => {
  const items = str.replace(LIST_BLOCK_END_R, "\n").match(LIST_ITEM_R);
  const isTight = !/\n\n/.test(str.replace(/\n*$/, ""))
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

    // backup our state for restoration afterwards. We're going to
    // want to set state._list to true, and state.inline depending
    // on our list's looseness.
    const oldStateInline = state.inline;
    const oldStateList = state._list;
    state._list = true;
    const oldStateTightness = state.isTight
    state.isTight = isTight

    // Parse the list item
    state.inline = isTight
    const adjustedContent = contentStr.replace(LIST_ITEM_END_R, "");
    const content = parse(adjustedContent, state)
    const result = isTight
      ? { type: "tight_list_item", content: [{ "type": "paragraph", "content": content }] }
      : { type: "list_item", content }

    // Restore our state before returning
    state.inline = oldStateInline;
    state._list = oldStateList;
    state.isTight = oldStateTightness
    return result;
  });

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
    const userDefClass = CLASS_R.exec(directives)
    let myClass = (userDefClass) ? userDefClass[1] : ""
    if (align.length > 0) { myClass += (myClass.length > 0 ? " " : "") + align }
    const userDefId = ID_R.exec(directives)
    const myID = (userDefId) ? userDefId[1] : ""
    const colWidthMatch = COL_WIDTHS_R.exec(directives)
    const colWidths = (colWidthMatch) ? colWidthMatch[1].split(" ") : null
    return [myClass, myID, colWidths]
  }

  const pipeRegEx = /(?<!\\)\|/  // eslint doesn't like look behind. Disregard the warning.

  const parsePipeTableRow = function(source, parse, state, colWidths, inHeader) {
    const cells = source.trim().split(pipeRegEx)
    cells.shift()
    cells.pop()
    const tableRow = [{ type: "tableSeparator" }]
    for (const str of cells) {
      const cell = parse(str.trim(), state)
      tableRow.push(...cell)
      tableRow.push({ type: "tableSeparator" })
    }
//    const tableRow = parse(source.trim(), state);
    consolidate(tableRow)
  //  state.inTable = prevInTable;

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
            content: (state.inHtml ? [] : [{ "type": "paragraph", "content": [] }])
          });
        }
      } else if (state.inHtml) {
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
      const align = parseTableAlign(capture[2])
      const [myClass, myID, colWidths] = tableDirectives(capture[4], align)
      const table = {
        type: "table",
        attrs: {},
        content: []
      }
      if (myID) { table.attrs.id = myID }
      if (myClass) { table.attrs.class = myClass }
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
      if (!/^\|+$/.test(capture[1])) {
        table.content.push(parsePipeTableRow(capture[1], parse, state, colWidths, true))
      }
      const tableBody = capture[3].trim().split("\n")
      tableBody.forEach(row => {
        table.content.push(parsePipeTableRow(row, parse, state, colWidths, false))
      })
      state.inline = false;
      return table
    };
  };

  const headerRegEx = /^\+:?=/
  const gridSplit = / *\n/g
  const cellCornerRegEx = /^\+[-=:]+\+[+=:-]+\+$/g

  const parseGridTable = function() {
    return function(capture, state) {
      const topBorder = capture[2]
      const lines = capture[1].slice(0, -1).split(gridSplit)

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
      const [myClass, myID, colWidths] = tableDirectives(capture[3], align)

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
          const xStart = colSeps[j] + 2
          const xEnd = colSeps[j + cell.colspan] - 1
          const yStart = rowSeps[i] + 1
          const yEnd = rowSeps[i + cell.rowspan]
          let str = ""
          for (let ii = yStart; ii < yEnd; ii++) {
            str += lines[ii].slice(xStart, xEnd).replace(/ +$/, "") + "\n"
          }
          cell.blob = str.slice(0, -1).replace(/^\n+/, "")

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
      if (myID) { table.attrs.id = myID }
      if (myClass) { table.attrs.class = myClass }
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
          const cell = gridTable[i][j]
          state.inline = false
          let content = parse(cell.blob, state)
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
      return table
    };
  };

  return {
    parsePipeTable: parsePipeTable(),
    PIPE_TABLE_REGEX: /^(\|.*)\n\|([-:]+[-| :]*)\n((?:\|.*(?:\n|$))*)(?:\{([^\n}]+)\}\n)?\n*/,
    parseGridTable: parseGridTable(),
    GRID_TABLE_REGEX: /^((\+(?:[-:=]+\+)+)\n(?:[+|][^\n]+[+|] *\n)+)(?:\{([^\n}]+)\}\n)?\n*/
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

const parseRef = function(capture, state, refNode) {
  // Handle implicit refs: [title][<ref>], ![alt or caption][<ref>]
  let ref = capture[2] ? capture[2] : capture[1];
  ref = ref.replace(/\s+/g, " ");

  // We store defs in state._defs (_ to deconflict with client-defined state).
  if (state._defs && state._defs[ref]) {
    const def = state._defs[ref];
    if (refNode.type === "figure") {
      refNode = { type: "figure", content: [
        { type: "figimg", attrs: def.attrs },
        { type: "figcaption", content: parseInline(refNode.attrs.alt, state) }
      ] }
      refNode.content[0].attrs.src = def.target
    } else if (refNode.type === "image") {
      if (def.target.indexOf("\n") > -1) {
        refNode = { type: "calculation", attrs: { entry: def.target } }
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

const BLOCK_HTML = /^ *(?:<(head|h[1-6]|p|pre|script|style|table)[\s>][\s\S]*?(?:<\/\1>[^\n]*\n)|<(?:\/?(?:!DOCTYPE html|body|li|br|hr|(?:div|article|details|input|label|ul|ol|dl|main|nav)(?: (?:class|for|id|style|type)=(["'])[A-Za-z0-9_.:;\- ]+\2){0,2})|\/?html(?: lang=(["'])[a-z]+\3)?)>[^\n]*?(?:\n|$))/

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
  match: blockRegex(/^(([^\n]*)\n)(?=<dd>|\n: )/),
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
rules.set("blockquote", {
  isLeaf: false,
  match: blockRegex(/^( *>[^\n]+(\n[^\n]+)*\n*)+\n{2,}/),
  parse: function(capture, state) {
    const content = capture[0].replace(/^ *> ?/gm, "");
    return { content: parse(content, state) };
  }
});
rules.set("ordered_list", {
  isLeaf: false,
  // Hurmet accepts lists w/o a preceding blank line, so the list RegEx
  // is an anyScopeRegex. parse() will test if a list is a the beginning of a line.
  match: anyScopeRegex(/^( {0,3})(\d{1,9}[.)]) [\s\S]+?(?:\n{2,}(?! )(?!\1(?:\d{1,9}\.) )\n*|\s*$)/),
  parse: function(capture, state) {
    const start = Number(capture[2].replace(/\) *$/, "").trim())
    return { attrs: { order: start }, content: parseList(capture[0], state, capture[1]) }
  }
})
rules.set("bullet_list", {
  isLeaf: false,
  // See note above re: anyScopeRegex
  match: anyScopeRegex(/^( {0,3})([*+-]) [\s\S]+?(?:\n{2,}(?! )(?!\1(?:[*+-]) )\n*|\s*$)/),
  parse: function(capture, state) {
    return { content: parseList(capture[0], state, capture[1]) }
  }
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
rules.set("special_div", {
  isLeaf: false,
  match: blockRegex(/^(:{3,}) ?(indented|comment|centered|header|hidden) *\n([\s\S]+?)\n+\1 *(?:\n{2,}|\s*$)/),
  // indented or centered or comment div, or <header>
  parse: function(capture, state) {
    const content = capture[2] === "comment"
      ? parseInline(capture[3], state)
      : parse(capture[3], state)
    return { type: capture[2], content };
  }
});
rules.set("figure", {
  isLeaf: true,
  match: blockRegex(/^!!\[((?:(?:\\[\s\S]|[^\\])+?)?)\]\[([^\]]*)\] *(?:\n *)+\n/),
  parse: function(capture, state) {
    return parseRef(capture, state, {
      type: "figure",
      attrs: { alt: capture[1] }
    });
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
rules.set("displayTeX", {
  isLeaf: true,
  match: blockRegex(/^\$\$\n?((?:\\[\s\S]|[^\\])+?)\n?\$\$ *(?:\n|$)/),
  parse: function(capture, state) {
    const tex = capture[1].trim()
    return { type: "tex", attrs: { tex, displayMode: true } }
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
  match: blockRegex(/^((?:[^\n]|\n(?! *\n))+)(?:\n *)+\n/),
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
    return { attrs: { alt: capture[1], src: unescapeUrl(capture[2]) } }
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
rules.set("refimage", {
  isLeaf: true,
  match: inlineRegex(/^!\[((?:(?:\\[\s\S]|[^\\])+?)?)\]\[([^\]]*)\]/),
  parse: function(capture, state) {
    return parseRef(capture, state, {
      type: "image",
      attrs: { alt: capture[1] }
    });
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
  match: inlineRegex(/^(?:\$\$((?:\\[\s\S]|[^\\])+?)\$\$|\$(?!\s|$)((?:(?:\\[\s\S]|[^\\])+?)?)(?<=[^\s\\$])\$(?![0-9$]))/),
  parse: function(capture, state) {
    if (capture[1]) {
      const tex = capture[1].trim()
      return { type: "tex", attrs: { tex, displayMode: true } }
    } else {
      const tex = capture[2].trim()
      return { type: "tex", attrs: { tex, displayMode: false } }
    }
  }
});
rules.set("calculation", {
  isLeaf: true,
  match: anyScopeRegex(/^(?:¢(`+)([\s\S]*?[^`])\1(?!`)|¢¢\n?((?:\\[\s\S]|[^\\])+?)\n?¢¢)/),
  parse: function(capture, state) {
    if (capture[2]) {
      let entry = capture[2].trim()
      if (!/^(?:function|draw\()/.test(entry) && entry.indexOf("``") === -1) {
        entry = entry.replace(/\n/g, " ")
      }
      return { attrs: { entry } }
    } else {
      const entry = capture[3].trim()
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
});rules.set("underline", {
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
  // Here we look for anything followed by non-symbols,
  // double newlines, or double-space-newlines
  // We break on any symbol characters so that this grammar
  // is easy to extend without needing to modify this regex
  isLeaf: true,
  match: anyScopeRegex(/^[\s\S]+?(?=[^0-9A-Za-z\s\u00c0-\uffff]|\n\n| {2,}\n|\d+[.)]|\w+:\S|$)/),
  parse: function(capture, state) {
    return {
      text: capture[0].replace(/\n/g, " ")
    };
  }
});

const lists = ["bullet_list", "ordered_list"]
const LIST_LOOKBEHIND_R = /(?:\n)( *)$/

const parse = (source, state) => {
  if (!state.inline) { source += "\n\n"; }
  source = preprocess(source);
  const result = [];
  while (source) {
    // store the best match and its rule:
    let capture = null;
    let ruleName = null;
    let rule = null;
    for (const [currRuleName, currRule] of rules) {
      capture = currRule.match(source, state);
      if (capture) {
        rule = currRule
        ruleName = currRuleName

        if (lists.includes(ruleName)) {
          // Lists are complicated because we do not require a blank line before a list.
          const prevCaptureStr = state.prevCapture == null ? "" : state.prevCapture
          const isStartOfLineCapture = LIST_LOOKBEHIND_R.test(prevCaptureStr)
          if (isStartOfLineCapture) {
            if (state.inline) {
              // We matched a list that does not have a preceding blank line.
              // Finish the current block element before beginning the list.
              state.remainder = capture[0];
              return result
            } else {
              break
            }
          }
        } else {
          break
        }

      }
    }
    const parsed = rule.parse(capture, state);
    if (Array.isArray(parsed)) {
      Array.prototype.push.apply(result, parsed);
    } else {
      if (parsed.type == null) { parsed.type = ruleName; }
      result.push(parsed);
    }
    state.prevCapture = capture[0]
    source = source.substring(capture[0].length);
    if (state.remainder) {
      // Prepend a list.
      source = state.remainder + "\n\n" + source
      state.remainder = ""
    }
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


// recognize a `*` `-`, `+`, `1.`, `2.`... list bullet
const LIST_BULLET = "(?:[*+-]|\\d+[\\.\\)])";
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
const hurmetMetadataNames = ["decimalFormat", "fontSize", "pageSize"]

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
  const state = { inline: true, _defs: {}, prevCapture: "", remainder: "", inHtml: false }
  const ast = parse(md, state)
  if (Array.isArray(ast) && ast.length > 0 && ast[0].type === "null") {
    ast.shift()
  }
  consolidate(ast)
  return ast
}

export const md2ast = (md, inHtml = false) => {
  // First, check for a metadata preamble
  let metadata = false
  if (metadataRegEx.test(md)) {
    const match = metadataRegEx.exec(md)
    metadata = parseMetadata(match[1])
    md = md.slice(match[0].length)
  }

  // Second, get all the link reference definitions
  const state = { inline: false, _defs: {}, prevCapture: "", remainder: "", inHtml }
  const defRegEx = /\n *\[([^\]\n]+)\]: *(?:¢(`+)([\s\S]*?[^`])\2(?!`)|<?([^\n>]*)>? *(?:\n\{([^\n}]*)\})?)(?=\n)/gm
  let capture
  while ((capture = defRegEx.exec(md)) !== null) {
    const def = capture[1].replace(/\s+/g, " ")
    const target = capture[4] || capture[3].trim();
    const directives = capture[5] || "";

    const attrs = { alt: def };
    if (directives) {
      const matchClass = CLASS_R.exec(directives)
      const matchWidth = WIDTH_R.exec(directives)
      const matchID = ID_R.exec(directives)
      if (matchClass) { attrs.class = matchClass[1] }
      if (matchWidth) { attrs.width = matchWidth[1] }
      if (matchID)    { attrs.id = matchID[1] }
    }
    state._defs[def] = { target, attrs }
  }

  // Find out if there are any snapshots.
  let snapshotStrings = []
  let gotSnapshot = false
  if (metadata) {
    snapshotStrings = md.split("<!--SNAPSHOT-->\n")
    if (snapshotStrings.length > 1) {
      gotSnapshot = true
      md = snapshotStrings.shift()
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
