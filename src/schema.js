/* eslint-disable */
import {Schema} from "prosemirror-model"
import {findWrapping, liftTarget, canSplit, ReplaceAroundStep} from "prosemirror-transform"
import {Slice, Fragment, NodeRange} from "prosemirror-model"
import { renderToC, tocLevels } from "./print"
import {dt} from "./constants"

// Helpers for creating a schema that supports tables.

function getCellAttrs(dom, extraAttrs) {
  let widthAttr = dom.getAttribute("data-colwidth")
  let widths = widthAttr && /^\d+(,\d+)*$/.test(widthAttr) ? widthAttr.split(",").map(s => Number(s)) : null
  let colspan = Number(dom.getAttribute("colspan") || 1)
  let result = {
    colspan,
    rowspan: Number(dom.getAttribute("rowspan") || 1),
    colwidth: widths && widths.length == colspan ? widths : null
  }
  for (let prop in extraAttrs) {
    let getter = extraAttrs[prop].getFromDOM
    let value = getter && getter(dom)
    if (value != null) result[prop] = value
  }
  return result
}

function setCellAttrs(node, extraAttrs) {
  let attrs = {}
  if (node.attrs.colspan != 1) attrs.colspan = node.attrs.colspan
  if (node.attrs.rowspan != 1) attrs.rowspan = node.attrs.rowspan
  if (node.attrs.colwidth)
    attrs["data-colwidth"] = node.attrs.colwidth.join(",")
  for (let prop in extraAttrs) {
    let setter = extraAttrs[prop].setDOMAttr
    if (setter) setter(node.attrs[prop], attrs)
  }
  return attrs
}

const functionRegEx = / *function /
 
// :: Object
// [Specs](#model.NodeSpec) for the nodes defined in this schema.
export const nodes = {
  // :: NodeSpec The top level document node.
  doc: {
    content: "block+",
    // Hurmet uses doc.attrs for document metadata, but ProseMirror transacations
    // can not reach doc.attrs. So any user change to document metadata will be
    // outside the undo stack.
    attrs: {
      decimalFormat: {default: '1,000,000.' },
      inDraftMode: { default: false },
      fileHandle: { default: null },
      fontSize: { default: 12 }
    }
  },

// :: NodeSpec A plain paragraph textblock. Represented in the DOM as a `<p>` element.
  paragraph: {
    content: "inline*",
    group: "block",
    parseDOM: [{tag: "p"}], // priority is the default, 50
    toDOM() { return ["p", 0] }
  },

  // An indented div.
  indented_div: {
    content: "block+",
    group: "block",
    defining: true,
	  parseDOM: [{tag: "div.indented"}],
    toDOM() { return ['div', { class: 'indented' }, 0] }
  },

  //:: NodeSpec An center-aligned div.
  centered_div: {
    content: "block+",
    group: "block",
    defining: true,
    parseDOM: [{tag: "div.centered"}],
    toDOM () { return ['div', { class: 'centered' }, 0] },
  },

  // :: NodeSpec A blockquote (`<blockquote>`) wrapping one or more blocks.
  blockquote: {
    content: "block+",
    group: "block",
    defining: true,
    parseDOM: [{tag: "blockquote"}],
    toDOM() { return ["blockquote", 0] }
  },

  // :: NodeSpec A horizontal rule (`<hr>`).
  horizontal_rule: {
    group: "block",
    parseDOM: [{tag: "hr"}],
    toDOM() { return ["hr"] }
  },

  // :: NodeSpec A heading textblock, with a `level` attribute that
  // should hold the number 1 to 6. Parsed and serialized as `<h1>` to
  // `<h6>` elements.
  heading: {
    attrs: {level: {default: 1}},
    content: "inline*",
    group: "block",
    defining: true,
    parseDOM: [{tag: "h1", attrs: {level: 1}},
               {tag: "h2", attrs: {level: 2}},
               {tag: "h3", attrs: {level: 3}},
               {tag: "h4", attrs: {level: 4}},
               {tag: "h5", attrs: {level: 5}},
               {tag: "h6", attrs: {level: 6}}],
    toDOM(node) { return ["h" + node.attrs.level, 0] }
  },

  // :: NodeSpec A code listing. Disallows marks or non-text inline
  // nodes by default. Represented as a `<pre>` element with a
  // `<code>` element inside of it.
  code_block: {
    content: "text*",
    marks: "",
    group: "block",
    code: true,
    defining: true,
    parseDOM: [{tag: "pre", preserveWhitespace: "full"}],
    toDOM() { return ["pre", ["code", 0]] }
  },

  // :: NodeSpec The text node.
  text: {
    group: "inline"
  },

  // :: NodeSpec An inline image (`<img>`) node. Supports `src`,
  // `alt`, and `href` attributes. The latter two default to the empty
  // string.
  image: {
    inline: true,
    attrs: {
      src: {},
      alt: {default: null},
//      title: {default: null},
      width: {default: "100"},
      class: {default: "inline"}
    },
    group: "inline",
    draggable: true,
    parseDOM: [{tag: "img[src]", getAttrs(dom) {
      return {
        src: dom.getAttribute("src"),
//        title: dom.getAttribute("title"),
        alt: dom.getAttribute("alt"),
        width: dom.getAttribute("width"),
        class: dom.getAttribute("class")
      }
    }}],
    toDOM(node) { return ["img", node.attrs] }
  },

  // Tale of contents
  toc: {
    atom: true,
    attrs: {
      start: { default: 1 },
      end:   { default: 2 },
      body:  { default: [] }
    },
    group: "block",
    draggable: true,
    parseDOM: [{tag: "ul.toc",  getAttrs(dom) {
      const [start, end] = tocLevels(dom.getAttribute('data-levels'))
      const body = JSON.parse(dom.getAttribute('data-body'))
      return { start, end, body }
    }}],
    toDOM(node) {
      const dom = document.createElement('ul')
      dom.dataset.levels = String(node.attrs.start) + ".." + String(node.attrs.end)
      dom.dataset.body = JSON.stringify(node.attrs.body)
      renderToC(node.attrs.body, dom)
      return dom
     }
  },

  ordered_list: {
    attrs: {order: {default: 1}},
	content: "list_item+",
	group: "block",
    parseDOM: [{tag: "ol", getAttrs(dom) {
      return {order: dom.hasAttribute("start") ? +dom.getAttribute("start") : 1}
    }}],
    toDOM(node) {
      return node.attrs.order == 1 ? ["ol", 0] : ["ol", {start: node.attrs.order}, 0]
    }
  },
  
  // A bullet list node spec, represented in the DOM as `<ul>`.
  bullet_list: {
    content: "list_item+",
	group: "block",
	parseDOM: [{tag: "ul"}],
    toDOM() { return ["ul", 0] }
  },

  // A list item (`<li>`) spec.
  list_item: {
    content: "paragraph block*",
	  parseDOM: [{tag: "li"}],
    toDOM() { return ["li", 0] },
    defining: true
  },

  // :: NodeSpec A hard line break, represented in the DOM as `<br>`.
  hard_break: {
    inline: true,
    group: "inline",
    selectable: false,
    parseDOM: [{tag: "br"}],
    toDOM() { return ["br"] }
  },

  table: {
    content: "table_row+",
    tableRole: "table",
    group: "block",
    attrs: { class: { default: 'grid' } },
    parseDOM: [{tag: "table", getAttrs(dom) {
      return { class: dom.getAttribute('class') || "grid" }
    }}],
    toDOM(node) {
      return ['table', { class: node.attrs.class }, ["tbody", 0]]
    }
  },
  table_row: {
    content: "(table_cell | table_header)*",
    tableRole: "row",
    parseDOM: [{tag: "tr"}],
    toDOM() { return ["tr", 0] }
  },
  table_cell: {
    content: "block+",
    attrs: {
      colspan: {default: 1},
      rowspan: {default: 1},
      colwidth: {default: null},
      background: {default: null}
    },
    tableRole: "cell",
    isolating: true,
    parseDOM: [{tag: "td", getAttrs: dom => getCellAttrs(dom, [])}],
    toDOM(node) { return ["td", setCellAttrs(node, []), 0] }
  },
  table_header: {
    content: "block+",
    attrs: {
      colspan: {default: 1},
      rowspan: {default: 1},
      colwidth: {default: null},
      background: {default: null}
    },
    tableRole: "header_cell",
    isolating: true,
    parseDOM: [{tag: "th", getAttrs: dom => getCellAttrs(dom, [])}],
    toDOM(node) { return ["th", setCellAttrs(node, []), 0] }
  },

  // Hurmet uses the <header> element for print-headers
  header: {
    content: "table",
    group: "block",
    defining: true,
    parseDOM: [{tag: "header"}],
    toDOM() { return ["header", 0] }
  },

  calculation: {
    atom: true, // No direct editing. Instead, edit via CalcView in file nodeviews.js.
    defining: false,
    marks: "",
    group: "inline",
    inline: true,
    attrs: {
      // I cache several items with each Hurmet calculation cell.
      // By keeping this data when the author submits a cell, I avoid having to
      // redo the work each time a cell calculation is updated with a new variable value.
      // Most of this info is kept only during run-time.
      // When the author saves a file, I write only the entry input.
      // (What isn't saved cannot break a document.)
      // When a document is re-opened, all but the entries must be recalculated.
      entry: { default: "" }, //          Raw string input by the author, edited for decimal.
      displayMode: { default: false }, // Type set in TeX display mode if true.
      name: {default: null}, //           Name of cell, as in "x" from x = 12
      tex: {default: ""}, //              The string I pass to KaTeX for final rendering.
      alt: {default: ""}, //              The string I render when in draft mode.
      rpn: {default: null}, //            RPN from parser.js, for calculation.
      inDraftMode: {default: false},
      resulttemplate: {default: null}, // String with units, but waiting for a value.
      altresulttemplate: {default: null}, // Ditto, but in draft mode.
      resultdisplay: {default: null}, //  Result after unit conversions and rounding.
      template: {default: null}, //       tex, including echo, but waiting for plugged-in values.
      altTemplate: {default: ""}, //      Ditto, but in draft mode.
      value: {default: null},  //         Value passed to other calculations.
      unit: {default: ""}, //             Unit specified by user, in which to display the result.
      //                                    Hurmet maps and data frame save a data structure, not a name.
      expos: {default: null}, //          Unit exponents of result, for checking unit compatibility.
      factor: {default: null}, //         Factor for converting value.inBaseUnits to result units
      gauge: {default: null}, //          Unit gauge, for ditto
      dtype: {default: 0}, //             Data type of the result. See constants.js.
      isFetch: {default: false}, //       Identifies cells that need async treatment.
      error: {default: false} //          boolean. True if calculation resulted in an error.
    },
    parseDOM: [{tag: "span.hurmet-calc",  getAttrs(dom) {
      const displayMode = Boolean(dom.getAttribute('data-display')) || false
      return { entry: dom.getAttribute('data-entry'), displayMode }
    }}],
    toDOM(node) {
      let dom
      //if (node.attrs.dtype !== dt.IMAGE) {
      dom = document.createElement('span')
      dom.classList = "hurmet-calc"
      if (node.attrs.dtype && node.attrs.dtype === dt.MODULE &&
        functionRegEx.test(node.attrs.entry)) {
        dom.appendChild(document.createElement('pre'))
        dom.firstChild.appendChild(document.createElement('code'))
        dom.firstChild.firstChild.textContent = node.attrs.entry
      } else if (node.attrs.inDraftMode || !node.attrs.tex) {
        dom.appendChild(document.createElement('code'))
        dom.firstChild.textContent = node.attrs.alt ? node.attrs.alt : node.attrs.entry
      } else {
        const tex = node.attrs.tex
        const isFF = 'MozAppearance' in document.documentElement.style
        if (isFF) {
          temml.render(tex, dom, {
            displayMode: node.attrs.displayMode,
            trust: (context) => context.command === '\\class' && context.class === "special-fraction"
          })
        } else {
          katex.render(tex, dom, {
            displayMode: node.attrs.displayMode,
            strict: false,
            macros: {"\\class": "\\htmlClass"},
            throwOnError: false,
            minRuleThickness: 0.06,
            trust: (context) => context.command === '\\htmlClass' && context.class === "special-fraction"
          })
        }
      }
      // Before writing to DOM, I filter out most of the run-time info in node.attrs.
      dom.dataset.entry = node.attrs.entry
      if (node.attrs.displayMode) { dom.dataset.display = "true" }
      /*} else {
        dom = document.createElement('span')
        dom.classList = "chart-container hurmet-calc"
        dom.dataset.entry = node.attrs.entry
        const cnvs = document.createElement('canvas')
        dom.append(cnvs)
        const config = node.attrs.value
        dom.style.width = config.width
        dom.height = config.height
        const ctx = cnvs.getContext('2d')
        const aChart = new Chart(ctx, config)
      }*/
      return dom
    }
  },

  tex: {
    // For display of LaTeX math.
    atom: true,  // No direct editing. See TexView in nodeviews.js
    marks: "",
    group: "inline",
    inline: true,
    attrs: { tex: {default: ""}, displayMode: { default: false } },
    parseDOM: [{tag: "span.hurmet-tex",  getAttrs(dom) {
      const displayMode = Boolean(dom.getAttribute('data-display')) || false
      return { tex: dom.getAttribute('data-tex'), displayMode }
    }}],
    toDOM(node) {
      const dom = document.createElement('span')
      dom.classList = "hurmet-tex"
      const tex = node.attrs.tex
      dom.dataset.tex = tex
      if (node.attrs.displayMode) { dom.dataset.display = "true" }
      katex.render(tex, dom, { displayMode: node.attrs.displayMode, strict: false,
        throwOnError: false, minRuleThickness: 0.06 })
      return dom
    }
  }

}

// :: Object [Specs](#model.MarkSpec) for the marks in the schema.
export const marks = {
  // :: MarkSpec A link. Has `href` and `title` attributes. `title`
  // defaults to the empty string. Rendered and parsed as an `<a>`
  // element.
  link: {
    attrs: {
      href: {},
      title: {default: null}
    },
    inclusive: false,
    parseDOM: [{tag: "a[href]", getAttrs(dom) {
      return {href: dom.getAttribute("href"), title: dom.getAttribute("title")}
    }}],
    toDOM(node) { return ["a", node.attrs] }
  },

  // :: MarkSpec An emphasis mark. Rendered as an `<em>` element.
  // Has parse rules that also match `<i>` and `font-style: italic`.
  em: {
    parseDOM: [{tag: "i"}, {tag: "em"}, {style: "font-style=italic"}],
    toDOM() { return ["em"] }
  },

  // :: MarkSpec A strong mark. Rendered as `<strong>`, parse rules
  // also match `<b>` and `font-weight: bold`.
  strong: {
    parseDOM: [{tag: "strong"},
               // This works around a Google Docs misbehavior where
               // pasted content will be inexplicably wrapped in `<b>`
               // tags with a font-weight normal.
               {tag: "b", getAttrs: node => node.style.fontWeight != "normal" && null},
               {style: "font-weight", getAttrs: value => /^(bold(er)?|[5-9]\d{2,})$/.test(value) && null}],
    toDOM() { return ["strong"] }
  },

  // :: MarkSpec Code font mark. Represented as a `<code>` element.
  code: {
    parseDOM: [{tag: "code"}],
    toDOM() { return ["code"] }
  },

  // :: MarkSpec subscript mark. Represented as a `<sub>` element.
  subscript: {
    excludes: "superscript",
	  parseDOM: [{tag: "sub"}],
    toDOM() { return ["sub"] }
  },

  // :: MarkSpec superscript mark. Represented as a `<sup>` element.
  superscript: {
    excludes: "subscript",
	  parseDOM: [{tag: "sup"}],
    toDOM() { return ["sup"] }
  },

  // :: MarkSpec strikethru mark. Represented as a `<del>` element.
  strikethru: {
	  parseDOM: [{tag: "del"}],
    toDOM() { return ["del"] }
  },

    // :: MarkSpec superscript mark. Represented as a `<u>` element.
  underline: {
	  parseDOM: [{tag: "u"}],
    toDOM() { return ["u"] }
  },

  // :: MarkSpec highlight mark. Represented as a `<mark>` element.
  highlight: {
    parseDOM: [{tag: "mark"}],
    toDOM() { return ["mark"] }
  }
}


// :: (NodeType, ?Object) ? (state: EditorState, dispatch: ?(tr: Transaction)) ? bool
// Returns a command function that wraps the selection in a list with
// the given type an attributes. If `dispatch` is null, only return a
// value to indicate whether this is possible, but don't actually
// perform the change.
export function wrapInList(listType, attrs) {
  return function(state, dispatch) {
    let {$from, $to} = state.selection
    let range = $from.blockRange($to), doJoin = false, outerRange = range
    if (!range) return false
    // This is at the top of an existing list item
    if (range.depth >= 2 && $from.node(range.depth - 1).type.compatibleContent(listType) && range.startIndex == 0) {
      // Don't do anything if this is the top of the list
      if ($from.index(range.depth - 1) == 0) return false
      let $insert = state.doc.resolve(range.start - 2)
      outerRange = new NodeRange($insert, $insert, range.depth)
      if (range.endIndex < range.parent.childCount)
        range = new NodeRange($from, state.doc.resolve($to.end(range.depth)), range.depth)
      doJoin = true
    }
    let wrap = findWrapping(outerRange, listType, attrs, range)
    if (!wrap) return false
    if (dispatch) dispatch(doWrapInList(state.tr, range, wrap, doJoin, listType).scrollIntoView())
    return true
  }
}

function doWrapInList(tr, range, wrappers, joinBefore, listType) {
  let content = Fragment.empty
  for (let i = wrappers.length - 1; i >= 0; i--)
    content = Fragment.from(wrappers[i].type.create(wrappers[i].attrs, content))

  tr.step(new ReplaceAroundStep(range.start - (joinBefore ? 2 : 0), range.end, range.start, range.end,
                                new Slice(content, 0, 0), wrappers.length, true))

  let found = 0
  for (let i = 0; i < wrappers.length; i++) if (wrappers[i].type == listType) found = i + 1
  let splitDepth = wrappers.length - found

  let splitPos = range.start + wrappers.length - (joinBefore ? 2 : 0), parent = range.parent
  for (let i = range.startIndex, e = range.endIndex, first = true; i < e; i++, first = false) {
    if (!first && canSplit(tr.doc, splitPos, splitDepth)) {
      tr.split(splitPos, splitDepth)
      splitPos += 2 * splitDepth
    }
    splitPos += parent.child(i).nodeSize
  }
  return tr
}

// :: (NodeType) ? (state: EditorState, dispatch: ?(tr: Transaction)) ? bool
// Build a command that splits a non-empty textblock at the top level
// of a list item by also splitting that list item.
export function splitListItem(itemType) {
  return function(state, dispatch) {
    let {$from, $to, node} = state.selection
    if ((node && node.isBlock) || $from.depth < 2 || !$from.sameParent($to)) return false
    let grandParent = $from.node(-1)
    if (grandParent.type != itemType) return false
    if ($from.parent.content.size == 0) {
      // In an empty block. If this is a nested list, the wrapping
      // list item should be split. Otherwise, bail out and let next
      // command handle lifting.
      if ($from.depth == 2 || $from.node(-3).type != itemType ||
          $from.index(-2) != $from.node(-2).childCount - 1) return false
      if (dispatch) {
        let wrap = Fragment.empty, keepItem = $from.index(-1) > 0
        // Build a fragment containing empty versions of the structure
        // from the outer list item to the parent node of the cursor
        for (let d = $from.depth - (keepItem ? 1 : 2); d >= $from.depth - 3; d--)
          wrap = Fragment.from($from.node(d).copy(wrap))
        // Add a second list item with an empty default start node
        wrap = wrap.append(Fragment.from(itemType.createAndFill()))
        let tr = state.tr.replace($from.before(keepItem ? null : -1), $from.after(-3), new Slice(wrap, keepItem ? 3 : 2, 2))
        tr.setSelection(state.selection.constructor.near(tr.doc.resolve($from.pos + (keepItem ? 3 : 2))))
        dispatch(tr.scrollIntoView())
      }
      return true
    }
    let nextType = $to.pos == $from.end() ? grandParent.defaultContentType(0) : null
    let tr = state.tr.delete($from.pos, $to.pos)
    let types = nextType && [null, {type: nextType}]
    if (!canSplit(tr.doc, $from.pos, 2, types)) return false
    if (dispatch) dispatch(tr.split($from.pos, 2, types).scrollIntoView())
    return true
  }
}

// :: (NodeType) ? (state: EditorState, dispatch: ?(tr: Transaction)) ? bool
// Create a command to lift the list item around the selection up into
// a wrapping list.
export function liftListItem(itemType) {
  return function(state, dispatch) {
    let {$from, $to} = state.selection
    let range = $from.blockRange($to, node => node.childCount && node.firstChild.type == itemType)
    if (!range) return false
    if (!dispatch) return true
    if ($from.node(range.depth - 1).type == itemType) // Inside a parent list
      return liftToOuterList(state, dispatch, itemType, range)
    else // Outer list node
      return liftOutOfList(state, dispatch, range)
  }
}

function liftToOuterList(state, dispatch, itemType, range) {
  let tr = state.tr, end = range.end, endOfList = range.$to.end(range.depth)
  if (end < endOfList) {
    // There are siblings after the lifted items, which must become
    // children of the last item
    tr.step(new ReplaceAroundStep(end - 1, endOfList, end, endOfList,
                                  new Slice(Fragment.from(itemType.create(null, range.parent.copy())), 1, 0), 1, true))
    range = new NodeRange(tr.doc.resolve(range.$from.pos), tr.doc.resolve(endOfList), range.depth)
  }
  dispatch(tr.lift(range, liftTarget(range)).scrollIntoView())
  return true
}

function liftOutOfList(state, dispatch, range) {
  let tr = state.tr, list = range.parent
  // Merge the list items into a single big item
  for (let pos = range.end, i = range.endIndex - 1, e = range.startIndex; i > e; i--) {
    pos -= list.child(i).nodeSize
    tr.delete(pos - 1, pos + 1)
  }
  let $start = tr.doc.resolve(range.start), item = $start.nodeAfter
  let atStart = range.startIndex == 0, atEnd = range.endIndex == list.childCount
  let parent = $start.node(-1), indexBefore = $start.index(-1)
  if (!parent.canReplace(indexBefore + (atStart ? 0 : 1), indexBefore + 1,
                         item.content.append(atEnd ? Fragment.empty : Fragment.from(list))))
    return false
  let start = $start.pos, end = start + item.nodeSize
  // Strip off the surrounding list. At the sides where we're not at
  // the end of the list, the existing list is closed. At sides where
  // this is the end, it is overwritten to its end.
  tr.step(new ReplaceAroundStep(start - (atStart ? 1 : 0), end + (atEnd ? 1 : 0), start + 1, end - 1,
                                new Slice((atStart ? Fragment.empty : Fragment.from(list.copy(Fragment.empty)))
                                          .append(atEnd ? Fragment.empty : Fragment.from(list.copy(Fragment.empty))),
                                          atStart ? 0 : 1, atEnd ? 0 : 1), atStart ? 0 : 1))
  dispatch(tr.scrollIntoView())
  return true
}

// :: (NodeType) ? (state: EditorState, dispatch: ?(tr: Transaction)) ? bool
// Create a command to sink the list item around the selection down
// into an inner list.
export function sinkListItem(itemType) {
  return function(state, dispatch) {
    let {$from, $to} = state.selection
    let range = $from.blockRange($to, node => node.childCount && node.firstChild.type == itemType)
    if (!range) return false
    let startIndex = range.startIndex
    if (startIndex == 0) return false
    let parent = range.parent, nodeBefore = parent.child(startIndex - 1)
    if (nodeBefore.type != itemType) return false

    if (dispatch) {
      let nestedBefore = nodeBefore.lastChild && nodeBefore.lastChild.type == parent.type
      let inner = Fragment.from(nestedBefore ? itemType.create() : null)
      let slice = new Slice(Fragment.from(itemType.create(null, Fragment.from(parent.copy(inner)))),
                            nestedBefore ? 3 : 1, 0)
      let before = range.start, after = range.end
      dispatch(state.tr.step(new ReplaceAroundStep(before - (nestedBefore ? 3 : 1), after,
                                                   before, after, slice, 1, true))
               .scrollIntoView())
    }
    return true
  }
}

// :: Schema
// This schema rougly corresponds to the document schema used by
// [CommonMark](http://commonmark.org/), minus the list elements,
// which are defined in the [`prosemirror-schema-list`](#schema-list)
// module.
//
// To reuse elements from this schema, extend or read from its
// `spec.nodes` and `spec.marks` [properties](#model.Schema.spec).
export const schema = new Schema({nodes, marks})
