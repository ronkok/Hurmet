import hurmet from "./hurmet"

/* eslint-disable */
// ::- A specification for serializing a ProseMirror document as
// Markdown/CommonMark text.
export class MarkdownSerializer {
  // :: (Object<(state: MarkdownSerializerState, node: Node, parent: Node, index: number)>, Object)
  // Construct a serializer with the given configuration. The `nodes`
  // object should map node names in a given schema to function that
  // take a serializer state and such a node, and serialize the node.
  //
  // The `marks` object should hold objects with `open` and `close`
  // properties, which hold the strings that should appear before and
  // after a piece of text marked that way, either directly or as a
  // function that takes a serializer state and a mark, and returns a
  // string. `open` and `close` can also be functions, which will be
  // called as
  //
  //     (state: MarkdownSerializerState, mark: Mark,
  //      parent: Fragment, index: number) → string
  //
  // Where `parent` and `index` allow you to inspect the mark's
  // context to see which nodes it applies to.
  //
  // Mark information objects can also have a `mixable` property
  // which, when `true`, indicates that the order in which the mark's
  // opening and closing syntax appears relative to other mixable
  // marks can be varied. (For example, you can say `**a *b***` and
  // `*a **b***`, but not `` `a *b*` ``.)
  //
  // To disable character escaping in a mark, you can give it an
  // `escape` property of `false`. Such a mark has to have the highest
  // precedence (must always be the innermost mark).
  //
  // The `expelEnclosingWhitespace` mark property causes the
  // serializer to move enclosing whitespace from inside the marks to
  // outside the marks. This is necessary for emphasis marks as
  // CommonMark does not permit enclosing whitespace inside emphasis
  // marks, see: http://spec.commonmark.org/0.26/#example-330
  constructor(nodes, marks) {
    // :: Object<(MarkdownSerializerState, Node)> The node serializer
    // functions for this serializer.
    this.nodes = nodes
    // :: Object The mark serializer info.
    this.marks = marks
  }

  // :: (Node, ?Object) → string
  // Serialize the content of the given node to
  // [CommonMark](http://commonmark.org/).
  serialize(content, paths, isGFM = false, forSnapshot = false) {
    let state = new MarkdownSerializerState(this.nodes, this.marks, paths, isGFM)
    state.renderContent(content)
    // Write the link and image paths, unless this is done for a snapshot.
    if (!forSnapshot) {
      for (const [key, value] of state.paths.entries()) {
        state.write("\n[" + key + "]: " + value + "\n")
      }
    }
    return state.out
  }
}

const BACKTICK_R = /`+/g
const maxBacktickCount = str => {
  let max = 0
  let arr
  while ((arr = BACKTICK_R.exec(str)) !== null) {
    if (arr[0].length > max) { max = arr[0].length }
  }
  return max  
}

const ampRegEx = /=[^=]*@[^=]*$/

const indentBlankLines = (state, prevLength) => {
  const block = state.out.slice(prevLength + 1).replace(/\n\n/g, `\n${state.delim + "   "}\n`)
  state.out = state.out.slice(0, prevLength + 1) + block
}

const hurmetNodes =  {
  blockquote(state, node) {
    state.wrapBlock("> ", null, node, () => state.renderContent(node))
  },
  comment(state, node) {
    if (state.isGFM) {
      state.renderContent(node)
    } else {
      state.wrapBlock("", null, node, () => state.renderContent(node), "comment")
    }
  },
  indented(state, node) {
    if (state.isGFM) {
      state.renderContent(node)
    } else {
      state.wrapBlock("", null, node, () => state.renderContent(node), "indented")
    }
  },
  centered(state, node) {
    if (state.isGFM) {
      state.renderContent(node)
    } else {
       state.wrapBlock("", null, node, () => state.renderContent(node), "centered")
    }
  },
  boxed(state, node) {
    if (state.isGFM) {
      state.renderContent(node)
    } else {
      state.wrapBlock("", null, node, () => state.renderContent(node), "boxed")
    }
  },
  epigraph(state, node) {
    state.wrapBlock("> ", null, node, () => state.renderContent(node), "epigraph")
  },
  note(state, node) {
    state.wrapBlock("> ", null, node, () => state.renderContent(node), "note")
  },
  tip(state, node) {
    state.wrapBlock("> ", null, node, () => state.renderContent(node), (state.isGFM ? "note" : "tip"))
  },
  important(state, node) {
    state.wrapBlock("> ", null, node, () => state.renderContent(node), "important")
  },
  warning(state, node) {
    state.wrapBlock("> ", null, node, () => state.renderContent(node), "warning")
  },
  header(state, node) {
    if (state.isGFM) {
      state.renderContent(node)
    } else {
       state.wrapBlock("", "", node, () => state.renderContent(node), "header")
    }
  },
  code_block(state, node) {
    state.write("```" + (node.attrs.params || "") + "\n")
    state.text(node.textContent, false)
    state.ensureNewLine()
    state.write("```")
    state.closeBlock(node)
  },
  heading(state, node) {
    state.write(state.repeat("#", node.attrs.level) + " ")
    state.renderInline(node)
    state.closeBlock(node)
  },
  toc(state, node) {
    state.write(`{.toc start=${node.attrs.start} end=${node.attrs.end}}\n\n`)
  },
  horizontal_rule(state, node) {
    state.write(node.attrs.markup || "--------------------")
    state.closeBlock(node)
  },
  bullet_list(state, node) {
    state.renderList(node, "    ", () => (node.attrs.bullet || "*") + "   ")
  },
  ordered_list(state, node) {
    let start = node.attrs.order || 1
    let maxW = String(start + node.childCount - 1).length
    let space = state.repeat(" ", maxW + 2)
    state.renderList(node, space, i => {
      let nStr = String(start + i)
      return state.repeat(" ", maxW - nStr.length) + nStr + ".  "
    })
    // Write a 2nd blank line after an <ol>, to prevent an adjacent <ol> from
    // continuing the same numbering.
    state.write(state.delim + "\n")
  },
  list_item(state, node) {
    state.renderContent(node)
  },
  tight_list_item(state, node) {
    state.renderInline(node)
  },
  paragraph(state, node) {
    const prevLength = state.out.length
    if (node.content.content.length > 0) {
      state.renderInline(node)
    } else {
      state.write("¶")
    }
    if (!state.isGFM) {
      state.out = limitLineLength(state.out, prevLength, state.delim, state.lineLimit)
    }
    state.closeBlock(node)
  },
  table(state, node) {
    state.renderTable(node, state.delim, state.isGFM)
    state.closeBlock(node)
  },
  figure(state, node) {
    let caption
    if (!state.isGFM) {
      const figureCaption = node.content.content[1]
      const figureState = new MarkdownSerializerState(hurmetNodes, hurmetMarks, this.paths, false)
      figureState.renderInline(figureCaption)
      caption = figureState.out
    } else {
      caption = node.attrs.alt
    }
    const ref = getRef(node, state)
    const attrs = node.content.content[0].attrs // image attributes
    let path = attrs.src
    if (!state.isGFM && (attrs.width || attrs.alt)) {
      path += "\n{"
      if (attrs.width && !isNaN(attrs.width)) { path += " width=" + attrs.width }
      if (attrs.alt) { path += ' alt="' + state.esc(attrs.alt) + '"' }
      path += "}"
    }
    // We use reference links and defer the image paths to the end of the document.
    state.paths.set(ref, path)
    if (ref === caption) {
      state.write(`!![${caption}][]\n\n`)
    } else {
      state.write(`!![${caption}][${ref}]\n\n`)
    }
    
  },
  image(state, node) {
    let path = state.esc(node.attrs.src)
    if (!state.isGFM && (node.attrs.class || node.attrs.width || node.attrs.alt)) {
      path += "\n{"
      if (node.attrs.class) { path += "." + state.esc(node.attrs.class) }
      if (node.attrs.width && !isNaN(node.attrs.width)) { path += " width=" + node.attrs.width }
      if (node.attrs.alt) { path += ' alt="' + state.esc(node.attrs.alt) + '"' }
      path += "}"
    }
    // We use reference links and defer the image paths to the end of the document.
    const ref = getRef(node, state)
    state.paths.set(ref, path)
    if (ref === node.attrs.alt) {
      state.write(`![${node.attrs.alt}][]`)
    } else {
      state.write(`![${node.attrs.alt}][${ref}]`)
    }

  },
  hard_break(state, node, parent, index) {
    for (let i = index + 1; i < parent.childCount; i++)
      if (parent.child(i).type != node.type) {
        state.write("\\\n")
        return
      }
  },
  text(state, node) {
    state.text(node.text)
  },
  tex(state, node) {
    const tex = node.attrs.tex.trim()
    writeTex(state, node.attrs.displayMode, tex)
  },
  calculation(state, node) {
    let entry = node.attrs.entry.trim().replace(/\n(?: *\n)+/g, "\n").replace(/\n/gm, "\n" + state.delim)
    if (state.isGFM) {
      if (node.attrs.alt && node.attrs.value) {
        if (ampRegEx.test(entry)) {
          // A calculation cell that displays only the result.
          state.write(node.attrs.alt)
        } else {
          writeTex(state, node.attrs.displayMode, node.attrs.tex)
        }
      } else {
        // Convert calculation field to TeX
        const tex = hurmet.parse(entry)
        writeTex(state, node.attrs.displayMode, tex)
      }
    } else {
      if (!node.attrs.displayMode) {
        const ticks = backticksFor({ text: entry, isText: true }, -1).trim()
        entry = "¢" + ticks + " " + entry + " " + ticks
      }
      if (node.attrs.entry.slice(0, 5) === "draw(") {
        const ref = getRef(node, state)
        state.paths.set(ref, entry)
        state.write(isNaN(ref) ? `![${ref}][]` : `![][${ref}]`)
      } else if (node.attrs.displayMode) {
        state.write("¢¢ " + entry + " ¢¢")
      } else {
        state.write(entry)
      }
    }
  }
}

const hurmetMarks = {
  em: {open: "_", close: "_", mixable: true, expelEnclosingWhitespace: true},
  strong: {open: "**", close: "**", mixable: true, expelEnclosingWhitespace: true},
  link: {
    open(_state, mark, parent, index) {
      return isPlainURL(mark, parent, index, 1) ? "<" : "["
    },
    close(state, mark, parent, index) {
      if (isPlainURL(mark, parent, index, -1)) {
        return ">"
      } else {
        // We use reference links and defer the image paths to the end of the document.
        const ref = getRef(mark, state)
        state.paths.set(ref, state.esc(mark.attrs.href))
        let display = parent.child(index - 1).text
        return "][" + (display === ref ? "" : ref) + "]"
      }
    }
  },
  code: {open(_state, _mark, parent, index) { return backticksFor(parent.child(index), -1) },
         close(_state, _mark, parent, index) { return backticksFor(parent.child(index - 1), 1) },
         escape: false},
  superscript: {open: "<sup>", close: "</sup>", expelEnclosingWhitespace: true},
  subscript: {
    open(state)  { return state.isGFM ? "<sub>" : "~" },
    close(state) { return state.isGFM ? "</sub>" : "~" },
    expelEnclosingWhitespace: true
  },
  strikethru: {open: "~~", close: "~~", mixable: true, expelEnclosingWhitespace: true},
  underline: {open: "<u>", close: "</u>", expelEnclosingWhitespace: true},
  highlight: {open: "<mark>", close: "</mark>", expelEnclosingWhitespace: true}
}

// :: MarkdownSerializer
// A serializer for the schema.
export const hurmetMarkdownSerializer = new MarkdownSerializer(hurmetNodes, hurmetMarks, new Map())

function backticksFor(node, side) {
  let ticks = /`+/g, m, len = 0
  if (node.isText) while (m = ticks.exec(node.text)) len = Math.max(len, m[0].length)
  let result = len > 0 && side > 0 ? " `" : "`"
  for (let i = 0; i < len; i++) result += "`"
  if (len > 0 && side < 0) result += " "
  return result
}

function isPlainURL(link, parent, index, side) {
  if (!/^\w+:/.test(link.attrs.href)) return false
  let content = parent.child(index + (side < 0 ? -1 : 0))
  if (!content.isText || content.text != link.attrs.href || content.marks[content.marks.length - 1] != link) return false
  if (index == (side < 0 ? 1 : parent.childCount - 1)) return true
  let next = parent.child(index + (side < 0 ? -2 : 1))
  return !link.isInSet(next.marks)
}

const titleRegEx = /\n *title +"([^\n]+)" *\n/

const getRef = (node, state) => {
  // We use reference links and defer the image paths to the end of the document.
  let ref = node.type.name === "image"
    ? node.attrs.alt
    : node.type.name === "figimg"
    ? node.content.content[0].attrs.alt
    : null
  if (node.attrs.entry && titleRegEx.test(node.attrs.entry)) {
    ref = titleRegEx.exec(node.attrs.entry)[1].trim()
  }
  const num = isNaN(state.paths.size) ? "1" : String(state.paths.size + 1)
  if (ref) {
    // Determine if ref has already been used
    for (const key of state.paths.keys()) {
      if (key === ref) { return num }
    }
    return ref
  } else {
    return num
  }
}

// Do not line-break on any space that would indicate a heading, list item, etc.
const blockRegEx = /^(?:[>*+-] |#+ |\d+[.)] |[A-B]\. |\-\-\-|```|[iCFHhITWADE]> )/

function limitLineLength(str, prevLength, delim, limit) {
  let graf = str.slice(prevLength)
  if (graf.length <= limit) { return str }
  if (/``|¢` *(?:function|draw\()/.test(graf)) { return str }

  const leading = "\n" + delim
  let result = ""
  let i = 0
  while (graf.length > limit) {
    const posNewLine = graf.indexOf("\n")
    const localLimit = limit - (i > 0 ? leading.length : 0)
    if (posNewLine > -1) {
      let chunk = graf.slice(0, posNewLine + 1)
      while (chunk.length > localLimit && chunk.lastIndexOf(" ", localLimit) > -1) {
        const pos = chunk.lastIndexOf(" ", localLimit)
        result += chunk.slice(0, pos) + "\n"
        chunk = chunk.slice(pos + 1)
      } 
      result += chunk
      graf = graf.slice(posNewLine + 1)
    } else {
      let pos = graf.lastIndexOf(" ", localLimit)
      if (pos === -1) { break }
      while (blockRegEx.test(graf.slice(pos + 1))) {
        pos = graf.lastIndexOf(" ", pos - 1)
        if (pos === -1) { break }
      }
      if (pos === -1 || (graf.length - pos < 7 && limit === 80)) { break }
      result += (i > 0 ? leading : "") + graf.slice(0, pos)
      graf = graf.slice(pos + 1)
      i += 1
    }
  }
  result += (i > 0 ?  leading : "") + graf

  return str.slice(0, prevLength) + result
}

const newlineRegEx = /\n/gm
const dollarRegEx = /([^ \\])\$/g
const writeTex = (state, displayMode, tex) => {
  tex = tex.replace(newlineRegEx, "\n" + state.delim)
  // Precede a nested $ with a space.
  // Prevents Markdown parser from mis-identifying nested $ as an ending $.
  tex = tex.replace(dollarRegEx, "$1 $")
  if (displayMode) {
    state.write("$$ " + tex + " $$")
  } else {
    state.write("$" + tex + "$")
  }
}

const justifyRegEx = /c(\d)([cr])/g
const trailNewlineRegEx = /\n+$/

const colWidthPicker = [0, 80, 50, 35];

// ::- This is an object used to track state and expose
// methods related to markdown serialization. Instances are passed to
// node and mark serialization methods (see `toMarkdown`).
export class MarkdownSerializerState {
  constructor(nodes, marks, paths, isGFM) {
    this.nodes = nodes
    this.marks = marks
    this.paths = paths
    this.isGFM = isGFM
    this.delim = this.out = ""
    this.divFence = ""
    this.closed = false
    this.lineLimit = 80
  }

  flushClose(size) {
    if (this.closed) {
      if (!this.atBlank()) this.out += "\n"
      if (size == null) size = 2
      if (size > 1) {
        let delimMin = this.delim
        let trim = /\s+$/.exec(delimMin)
        if (trim) delimMin = delimMin.slice(0, delimMin.length - trim[0].length)
        for (let i = 1; i < size; i++)
          this.out += delimMin + "\n"
      }
      this.closed = false
    }
  }

  // :: (string, ?string, Node, ())
  // Render a block, prefixing each line with `delim`, and the first
  // line in `firstDelim`. `node` should be the node that is closed at
  // the end of the block, and `f` is a function that renders the
  // content of the block.
  wrapBlock(delim, firstDelim, node, f, nodeType) {
    let old = this.delim
    if (nodeType) {
      if (delim.length > 0) {
        if (nodeType) { this.write(`> [!${nodeType.toUpperCase()}]\n`) }
      } else {
        this.divFence += ":::"
        this.write(`${this.delim}${this.divFence} ${nodeType}\n`)
      }
    }
    this.write(firstDelim || delim)
    this.delim += delim
    f()
    this.delim = old
    if (nodeType && delim.length === 0) {
      this.out = this.out.replace(trailNewlineRegEx, "") + (`\n${this.delim}${this.divFence}\n`)
      this.divFence = this.divFence.slice(0, -3)
    }
    this.closeBlock(node)
  }

  atBlank() {
    return /(^|\n)$/.test(this.out)
  }

  // :: ()
  // Ensure the current content ends with a newline.
  ensureNewLine() {
    if (!this.atBlank()) this.out += "\n"
  }

  // :: (?string)
  // Prepare the state for writing output (closing closed paragraphs,
  // adding delimiters, and so on), and then optionally add content
  // (unescaped) to the output.
  write(content) {
    this.flushClose()
    if (this.delim && this.atBlank())
      this.out += this.delim
    if (content) this.out += content
  }

  // :: (Node)
  // Close the block for the given node.
  closeBlock(node) {
    this.closed = node
  }

  // :: (string, ?bool)
  // Add the given text to the document. When escape is not `false`,
  // it will be escaped.
  text(text, escape) {
    let lines = text.split("\n")
    for (let i = 0; i < lines.length; i++) {
      var startOfLine = this.atBlank() || this.closed
      this.write()
      this.out += escape !== false ? this.esc(lines[i], startOfLine) : lines[i]
      if (i != lines.length - 1) this.out += "\n"
    }
  }

  // :: (Node)
  // Render the given node as a block.
  render(node, parent, index) {
    if (typeof parent == "number") throw new Error("!")
    this.nodes[node.type.name](this, node, parent, index)
  }

  // :: (Node)
  // Render the contents of `parent` as block nodes.
  renderContent(parent) {
    parent.forEach((node, _, i) => this.render(node, parent, i))
  }

  // :: (Node)
  // Render the contents of `parent` as inline content.
  renderInline(parent) {
    let active = [], trailing = ""
    let progress = (node, _, index) => {
      let marks = node ? node.marks : []

      // Remove marks from `hard_break` that are the last node inside
      // that mark to prevent parser edge cases with new lines just
      // before closing marks.
      // (FIXME it'd be nice if we had a schema-agnostic way to
      // identify nodes that serialize as hard breaks)
      if (node && node.type.name === "hard_break")
        marks = marks.filter(m => {
          if (index + 1 == parent.childCount) return false
          let next = parent.child(index + 1)
          return m.isInSet(next.marks) && (!next.isText || /\S/.test(next.text))
        })

      let leading = trailing
      trailing = ""
      // If whitespace has to be expelled from the node, adjust
      // leading and trailing accordingly.
      if (node && node.isText && marks.some(mark => {
        let info = this.marks[mark.type.name]
        return info && info.expelEnclosingWhitespace
      })) {
        let [_, lead, inner, trail] = /^(\s*)(.*?)(\s*)$/m.exec(node.text)
        leading += lead
        trailing = trail
        if (lead || trail) {
          node = inner ? node.withText(inner) : null
          if (!node) marks = active
        }
      }

      let inner = marks.length && marks[marks.length - 1], noEsc = inner && this.marks[inner.type.name].escape === false
      let len = marks.length - (noEsc ? 1 : 0)

      // Try to reorder 'mixable' marks, such as em and strong, which
      // in Markdown may be opened and closed in different order, so
      // that order of the marks for the token matches the order in
      // active.
      outer: for (let i = 0; i < len; i++) {
        let mark = marks[i]
        if (!this.marks[mark.type.name].mixable) break
        for (let j = 0; j < active.length; j++) {
          let other = active[j]
          if (!this.marks[other.type.name].mixable) break
          if (mark.eq(other)) {
            if (i > j)
              marks = marks.slice(0, j).concat(mark).concat(marks.slice(j, i)).concat(marks.slice(i + 1, len))
            else if (j > i)
              marks = marks.slice(0, i).concat(marks.slice(i + 1, j)).concat(mark).concat(marks.slice(j, len))
            continue outer
          }
        }
      }

      // Find the prefix of the mark set that didn't change
      let keep = 0
      while (keep < Math.min(active.length, len) && marks[keep].eq(active[keep])) ++keep

      // Close the marks that need to be closed
      while (keep < active.length)
        this.text(this.markString(active.pop(), false, parent, index), false)

      // Output any previously expelled trailing whitespace outside the marks
      if (leading) this.text(leading)

      // Open the marks that need to be opened
      if (node) {
        while (active.length < len) {
          let add = marks[active.length]
          active.push(add)
          this.text(this.markString(add, true, parent, index), false)
        }

        // Render the node. Special case code marks, since their content
        // may not be escaped.
        if (noEsc && node.isText)
          this.text(this.markString(inner, true, parent, index) + node.text +
                    this.markString(inner, false, parent, index + 1), false)
        else
          this.render(node, parent, index)
      }
    }
    parent.forEach(progress)
    progress(null, null, parent.childCount)
  }

  // :: (Node, string, (number) → string)
  // Render a node's content as a list. `delim` should be the extra
  // indentation added to all lines except the first in an item,
  // `firstDelim` is a function going from an item index to a
  // delimiter for the first line of the item.
  renderList(node, delim, firstDelim) {
    this.flushClose()
    node.forEach((child, _, i) => {
      if (child.type.name === "tight_list_item") { this.flushClose(1) }
      this.wrapBlock(delim, firstDelim(i), node, () => this.render(child, node, i))
    })
  }

  paddedCell(str, justify, colWidth) {
    const pad = " ".repeat(colWidth - str.length)
    return justify === "r" ? (pad + str) : (str + pad)
  }

  renderTable(node, delim, isGFM) {
    const rows = node.content.content
    let numCols = rows[0].content.content.length
    for (let i = 1; i < rows.length; i++) {
      numCols = Math.max(numCols, rows[i].content.content.length)
    }
    let numRowsInHeading = 0
    for (let i = 0; i < rows.length; i++) {
      if (rows[i].content.content[0].type.name === "table_header") {
        numRowsInHeading += 1
      } else {
        break
      }
    }
    const tblClasses = node.attrs.class
    const justify = new Array(numCols).fill("L") // default. Will change later.
    let regExResults
    while ((regExResults = justifyRegEx.exec(tblClasses)) !== null) {
      justify[Number(regExResults[1]) - 1] = regExResults[2]
    }

    // We're going to make three passes thru the table.
    // The first pass will get the content of each cell and load it into an array.
    // To do that, we'll create a temporary MarkdownSerializerState just for the table.
    const table = new Array(rows.length)
    const rowSpan = new Array(rows.length)
    const colSpan = new Array(rows.length)
    for (let i = 0; i < rows.length; i++) {
      table[i] = new Array(numCols).fill("")
      rowSpan[i] = new Array(numCols).fill(1)
      colSpan[i] = new Array(numCols).fill(1)
    }
    const colWidth = new Array(numCols).fill(0)
    const mergedCells = [];
    // Do we need a reStructuredText grid table? Or is a GFM pipe table enough?
    let isRst = !isGFM && numRowsInHeading > 1;
    let tableState = new MarkdownSerializerState(hurmetNodes, hurmetMarks, this.paths, this.isGFM)
    tableState.lineLimit = numCols > 3 ? 25 : colWidthPicker[numCols];
    let i = 0
    let j = 0
    let jPM = 0
    while (i < rows.length) {
      while (j < numCols) {
        if (rowSpan[i][j] === 0 || colSpan[i][j] === 0) { j += 1; continue }
        const cell = rows[i].content.content[jPM]
        if (!cell) { colSpan[i][j] = 0; j += 1; continue }
        if (cell.attrs.rowspan > 1) {
          rowSpan[i][j] = cell.attrs.rowspan
          for (let ii = i + 1; ii < i + cell.attrs.rowspan; ii++) {
            rowSpan[ii][j] = 0
            colSpan[ii][j] = 0
          }
        }
        if (cell.attrs.colspan > 1) {
          colSpan[i][j] = cell.attrs.colspan
          for (let jj = j + 1; jj < j + cell.attrs.colspan; jj++) {
            colSpan[i][jj] = 0
          }
        }

        if (cell.content.content.length > 0) {
          if (cell.attrs.colspan > 1) {
            mergedCells.push([i, j, jPM])
          } else {
            const L = tableState.out.length
            tableState.renderContent(cell)
            // Each table cell contains an array of strings.
            const cellContent = tableState.out.slice(L).replace(/^\n+/, "").split("\n")
            table[i][j] = cellContent
            if (cellContent.length > 1 && !isGFM) { isRst = true }
            // Get width of cell.
            if (colSpan[i][j] === 1) {
              for (let line of table[i][j]) {
                if (line.length > colWidth[j]) {
                  colWidth[j] = line.length
                }
              }
            }
          }
        }
        j += cell.attrs.colspan
        jPM += 1
      }
      i += 1
      j = 0
      jPM = 0
    }

    // Now we know the column widths, so get the horizontally merged cells.
    for (const c of mergedCells) {
      const i = c[0]
      const j = c[1]
      const jPM = c[2]
      const cell = rows[i].content.content[jPM]
      let width = colWidth[j]
      for (let m = 1; m < colSpan[i][j]; m++) { width += colWidth[j + m] + 3 }
      tableState.lineLimit = width
      const L = tableState.out.length
      tableState.renderContent(cell)
      table[i][j] = tableState.out.slice(L).replace(/^\n+/, "").split("\n")
    }

    // The second pass. Pad each cell w/spaces.
    for (let i = 0; i < table.length; i++) {
      for (let j = 0; j < numCols; j++) {
        if (rowSpan[i][j] > 0 && colSpan[i][j] > 0) {
          let width = colWidth[j]
          for (let m = 1; m < colSpan[i][j]; m++) { width += colWidth[j + m] + 3 }
          for (let k = 0; k < table[i][j].length; k++) {
            if (table[i][j][k].indexOf("|") > -1 && !isGFM) { isRst = true }
            // Pad the line with spaces
            table[i][j][k] += " ".repeat(width - table[i][j][k].length)
          }
        }
      }
    }

    if (mergedCells.length > 0 || tableState.out.indexOf("|") > -1) { isRst = true }

    // Now the third pass, in which we write output.
    this.write(isRst
      ? gridTable(table, numCols, numRowsInHeading, rowSpan, colSpan, colWidth, justify, delim)
      : pipeTable(table, numCols, colWidth, justify, delim, numRowsInHeading)
    )
    // Write the table's class name and column widths.
    let colWidths = ""
    for (let i = 0; i < rows.length; i++) {
      if (rows[i].content.content.length === numCols) {
        for (const col of rows[i].content.content) {
          const w = col.attrs.colwidth ? col.attrs.colwidth[0] : null
          colWidths += " " + String(w)
        }
        break
      }
    }
    const className = node.attrs.class.replace(/ c\d+[cr]/g, "") // remove column justification
    if (!isGFM) {
      this.write(`\n${delim}{.${className} colWidths="${colWidths.trim()}"}\n`)
    }
  }

  // :: (string, ?bool) → string
  // Escape the given string so that it can safely appear in Markdown
  // content. If `startOfLine` is true, also escape characters that
  // has special meaning only at the start of the line.
  esc(str, startOfLine) {
    str = str.replace(/([`*\\¢\$<\[_~])/g, "\\$1")
    if (startOfLine) {
      str = str.replace(/^(\#|:|\-|\*|\+|>)/, "\\$1").replace(/^(\d+)\./, "$1\\.")
    }
    return str
  }

  quote(str) {
    var wrap = str.indexOf('"') == -1 ? '""' : str.indexOf("'") == -1 ? "''" : "()"
    return wrap[0] + str + wrap[1]
  }

  // :: (string, number) → string
  // Repeat the given string `n` times.
  repeat(str, n) {
    let out = ""
    for (let i = 0; i < n; i++) out += str
    return out
  }

  // : (Mark, bool, string?) → string
  // Get the markdown string for a given opening or closing mark.
  markString(mark, open, parent, index) {
    let info = this.marks[mark.type.name]
    let value = open ? info.open : info.close
    return typeof value == "string" ? value : value(this, mark, parent, index)
  }

  // :: (string) → { leading: ?string, trailing: ?string }
  // Get leading and trailing whitespace from a string. Values of
  // leading or trailing property of the return object will be undefined
  // if there is no match.
  getEnclosingWhitespace(text) {
    return {
      leading: (text.match(/^(\s+)/) || [])[0],
      trailing: (text.match(/(\s+)$/) || [])[0]
    }
  }
}

const pipeTable = (table, numCols, colWidth, justify, delim, numRowsInHeading) => {
  // Write a GFM pipe table
  let str = ""
  // Write heading
  if (numRowsInHeading === 0) {
    str += "|".repeat(numCols + 1)
  } else {
    str += "|"
    for (let j = 0; j < numCols; j++) {
      let cell = table[0][j][0];
      if (cell.trim() === "¶") { cell = cell.replace("¶", " ") }
      str += " " + cell + " |"
    }
  }
  // Write border
  str += "\n|"
  for (let j = 0; j < numCols; j++) {
    let border = justify[j] === "c" ? ":" : "-"
    border += "-".repeat(colWidth[j])
    border += ("cr".indexOf(justify[j]) > -1 ? ":" : "-") + "|"
    str += border
  }
  // Write body
  const startRow = numRowsInHeading === 0 ? 0 : 1
  for (let i = startRow; i < table.length; i++) {
    str += "\n" + (i === 0 ? "" : delim) + "|"
    for (let j = 0; j < numCols; j++) {
      let cell = table[i][j][0];
      if (cell.trim() === "¶") { cell = cell.replace("¶", " ") }
      str += " " + cell + " |"
    }
  }
  return str
}

const gridTable = (table, numCols, numRowsInHeading, rowSpan, colSpan, colWidth, justify, delim) => {
  // Write a reStrucuredText grid table.

  const cellBorder = (ch, isColonRow, i, j) => {
    let borderStr = ""
    for (let k = 0; k < colSpan[(i === -1 ? 0 : i)][j]; k++) {
      borderStr += (isColonRow && justify[j] === "c") ? ":" : ch
      borderStr += ch.repeat(colWidth[j + k])
      borderStr += (isColonRow && "cr".indexOf(justify[j]) > -1) ? ":" : ch
      if (i < colSpan.length - 1 && j + k < colSpan[0].length - 1) {
        borderStr += colSpan[i + 1][j + k + 1] > 0 ? "+" : ch
      } else {
        borderStr += "+"
      }
    }
    return borderStr
  }

  // Start by writing the top border.
  let topBorder = "+"
  let ch = numRowsInHeading === 0 ? "=" : "-"
  let isColonRow = ch === "=" || numRowsInHeading === 0
  for (let j = 0; j < numCols; j++) {
    if (rowSpan[0][j] === 0) { continue }
    topBorder += cellBorder(ch, isColonRow, -1, j)
  }

  // Set pointers frome the the grid table current location to the array of table content.
  const current = []
  for (let j = 0; j < numCols; j++) {
    current.push({ row: 0, line: 0 }) // One reference for each column.
  }

  const rowIsEmptied = new Array(table.length).fill(false) // Have we written all the row's contents?
  let highestUnemptiedRow = 0
  const rowIsReadyForBorder = new Array(table.length).fill(false)
  const lines = [topBorder]

  while (current[0].row < table.length) {
    // Each pass in this loop writes one line of the grid table output.
    rowIsEmptied[highestUnemptiedRow] = true // Provisional value. Likely to change.
    let str = delim + "|"
    for (let j = 0; j < numCols; j++) {
      if (rowSpan[current[j].row][j] === 0) { continue }
      if (colSpan[current[j].row][j] === 0) { continue }
      const endRow = current[j].row + rowSpan[current[j].row][j] - 1
      if (table[current[j].row][j].length > current[j].line) {
        // Write one line from one cell.
        str += " " + table[current[j].row][j][current[j].line] + " |"
        current[j].line += 1
        if (current[j].line < table[current[j].row][j].length) {
          rowIsEmptied[endRow] = false
        } else if (colSpan[current[j].row][j] > 1) {
          // We're in a wide cell.
          // Check for a collision between a text "|" and a cell border.
          let posBorder = 0
          for (let k = 0; k < j + colSpan[current[j].row][j] - 1; k++) {
            posBorder += colWidth[k] + 3
            if (k >= j && str.charAt(posBorder) === "|") {
              rowIsEmptied[endRow] = false
              break
            }
          }
        }
      } else if (rowIsReadyForBorder[endRow]) {
        // Write a border under one cell.
        if (j === 0) { str = delim + "+" }
        ch = numRowsInHeading === endRow + 1 ? "=" : "-"
        isColonRow = ch === "="
        const border = "+" + cellBorder(ch, isColonRow, current[j].row, j)
        str = str.slice(0, -1) + border.slice(0, -1) + "+"
      } else {
        // Other columns are still writing content from this table row.
        // We can't write a bottom border yet, so write a blank line into one cell.
        for (let k = 0; k < colSpan[current[j].row][j]; k++) {
          const corner = k === colSpan[current[j].row][j] - 1 ? "|" : " "
          str += " ".repeat(colWidth[j + k] + 2) + corner
        }
      }
    }
    if (rowIsReadyForBorder[highestUnemptiedRow]){
      // We just wrote a bottom border. Change the references to the next table row.
      for (let j = 0; j < numCols; j++) {
        if (current[j].row + rowSpan[current[j].row][j] - 1 === highestUnemptiedRow) {
          current[j].line = 0
          current[j].row += rowSpan[current[j].row][j]
        }
      }
      highestUnemptiedRow += 1
    } else if (rowIsEmptied[highestUnemptiedRow]) {
      // The next pass will write a bottom border.
      rowIsReadyForBorder[highestUnemptiedRow] = true
    }
    lines.push(str)
  }
  return lines.join("\n")
}
