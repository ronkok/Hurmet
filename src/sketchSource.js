// Read a sketch's header settings from its source, without drawing it.
// md2ast, the Markdown serializer, and the editor use these to put a captioned
// sketch in a figure. The source is the authority: the caption is the title.

// Inside the quotes, a quotation mark is written "".
const titleRegEx = /^ *title +"((?:[^"\n]|"")*)"/m
const captionRegEx = /^ *caption +true *$/m
const positionRegEx = /^ *frame +[^\n]*, *"(inline|left|center|right)" *$/m

export const sketchTitle = source => {
  const match = titleRegEx.exec(source)
  return match ? match[1].replace(/""/g, '"').trim() : ""
}

// Return the source with its title replaced. A caption edited in the document
// becomes the title this way. The source keeps its other lines as they are.
export const withSketchTitle = (source, title) => {
  const line = `title "${title.replace(/"/g, '""')}"`
  return titleRegEx.test(source)
    ? source.replace(titleRegEx, () => line)
    : line + "\n" + source
}

// The source of the figsketch in a ProseMirror figure node, with the figure's
// caption, which an author may have edited, as its title. The caption is flattened
// to plain text; inline atoms such as calculations have no text, so they drop out.
export const figureSketchSource = figure => {
  const source = figure.child(0).attrs.source
  const caption = figure.childCount > 1 ? figure.child(1).textContent.trim() : ""
  return caption === sketchTitle(source) ? source : withSketchTitle(source, caption)
}

export const sketchHasCaption = source => captionRegEx.test(source)

// inline, left, center, or right
export const sketchPosition = source => {
  const match = positionRegEx.exec(source)
  return match ? match[1] : "inline"
}
