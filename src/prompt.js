const prefix = "ProseMirror-prompt"

function insertHint(params) {
  if (params.inMathZone) {
    const range = new Range()
    range.setStart(params.textNode, params.start)
    range.setEnd(params.textNode, params.end)
    const hintNode = document.createElement('text')
    hintNode.innerHTML = params.str
    range.deleteContents()
    range.insertNode(hintNode)
    const sel = window.getSelection()
    sel.removeAllRanges()
    sel.addRange(range)
    sel.collapseToEnd()
  } else {
    const tr = params.state.tr
    tr.replaceSelectionWith(params.state.schema.text(params.str))
    params.dispatch(tr)
  }
  document.getElementsByClassName("ProseMirror-prompt")[0].remove()
}

export function openPrompt(options) {
  const wrapper = document.body.appendChild(document.createElement("div"))
  wrapper.className = prefix

  const mouseOutside = e => { if (!wrapper.contains(e.target)) { close() } }
  setTimeout(() => window.addEventListener("mousedown", mouseOutside), 50)
  const close = () => {
    window.removeEventListener("mousedown", mouseOutside)
    if (wrapper.parentNode) { wrapper.parentNode.removeChild(wrapper) }
  }

  const domFields = [];
  // eslint-disable-next-line guard-for-in
  for (const name in options.fields) {
    domFields.push(options.fields[name].render())
  }
  const submitButton = document.createElement("button")
  submitButton.type = "submit"
  submitButton.className = prefix + "-submit"
  submitButton.textContent = "OK"
  const cancelButton = document.createElement("button")
  cancelButton.type = "button"
  cancelButton.className = prefix + "-cancel"
  cancelButton.textContent = "Cancel"
  cancelButton.addEventListener("click", close)

  const form = wrapper.appendChild(document.createElement("form"))
  if (options.title) {
    form.appendChild(document.createElement("h5")).textContent = options.title
  }
  if (options.note) {
    const note = document.createElement("p")
    note.textContent = options.note
    form.append(note)
  }
  domFields.forEach(field => {
    form.appendChild(document.createElement("div")).appendChild(field)
  })

  if (options.radioButtons) {
    // Create buttons for image placement or rounding criteria.
    const radioGroup = document.createElement("div")
    radioGroup.style.display = "flex"
    radioGroup.style["flex-direction"] = options.radioButtons.direction
    radioGroup.style.margin = "8px 0 8px 0"
    const current = options.radioButtons.current
    options.radioButtons.buttons.forEach(btn => {
      const span = document.createElement("span")
      const button = document.createElement("input")
      button.type = "radio"
      button.name = options.radioButtons.name
      button.value = btn[0]; // label
      button.setAttribute('id', btn[0])
      if (btn[0] === current) { button.setAttribute("checked", null) }
      const labelTag = document.createElement("label")
      labelTag.setAttribute("for", btn[1])
      labelTag.appendChild(document.createTextNode(btn[1]))
      span.appendChild(button)
      span.appendChild(labelTag)
      radioGroup.appendChild(span)
    })
    if (options.radioButtons.name !== "rounding") {
      form.appendChild(radioGroup)
    } else {
      const container = document.createElement("div")
      container.style.display = "flex"
      container.style["flex-direction"] = "row"
      container.style["align-items"] = "center"
      container.appendChild(radioGroup)
      const digitDiv = document.createElement("div")
      digitDiv.style.display = "flex"
      digitDiv.style["flex-direction"] = "column"
      digitDiv.style.margin = "3em"
      const digitLabel = document.createElement("label")
      digitDiv.appendChild(digitLabel)
      digitLabel.setAttribute("for", "digits")
      digitLabel.textContent = "Number of digits"
      const digitBox = document.createElement("input")
      digitBox.setAttribute("type", "text")
      digitBox.setAttribute("name", "digits")
      digitBox.style.width = "3em"
      digitBox.setAttribute("value", options.numDigits)
      digitDiv.appendChild(digitBox)
      container.appendChild(digitDiv)
      form.appendChild(container)
    }
  }

  let checkbox
  if (options.checkbox) {
    // Create a checkbox
    checkbox = form.appendChild(document.createElement("input"))
    checkbox.setAttribute("type", "checkbox")
    checkbox.setAttribute("id", "checkbox")
    const checkboxLabel = form.appendChild(document.createElement("label"))
    checkboxLabel.setAttribute("for", "checkbox")
    checkboxLabel.innerHTML = options.checkbox.name
    if (options.checkbox.checked) { checkbox.checked = true }
  } else {
    checkbox = { checked: false }
  }

  if (options.hints) {
    const sel = document.getSelection()
    let node = sel.anchorNode
    let inMathZone = false
    let start = -1
    let end = -1
    if (node.nodeType === 3 && node.parentNode.parentNode.classList.contains("math-code")) {
      inMathZone = true
      start = Math.min(sel.anchorOffset, sel.extentOffset)
      end = Math.max(sel.anchorOffset, sel.extentOffset)
    } else if (node.nodeType === 1 && node.parentNode.classList.contains("math-code")) {
      inMathZone = true
      if (node.children.length > 0) {
        node = node.firstChild
        start = node.length
        end = node.length
      } else {
        // Empty math zone, i.e., no text node children.
        start = 0
        end = 0
      }
    } else {
      start = options.state.selection.$from
      end = options.state.selection.$to
    }

    if (options.title === "Display Selectors") {
      const hintButtons = form.appendChild(document.createElement("table"))
      hintButtons.className = "ProseMirror grid c1c c2c"
      hintButtons.appendChild(document.createElement("tr"))
      hintButtons.firstChild.append(document.createElement("th"))
      hintButtons.firstChild.firstChild.textContent = "Regular"
      hintButtons.firstChild.append(document.createElement("th"))
      hintButtons.firstChild.children[1].textContent = "Unit-Aware"
      hintButtons.firstChild.append(document.createElement("th"))
      hintButtons.firstChild.children[2].textContent = "How much to display?"
      for (let i = 0; i < 4; i++) {
        hintButtons.appendChild(document.createElement("tr"))
        for (let j = 0; j < 3; j++) {
          hintButtons.children[i + 1].append(document.createElement("td"))
          if (j < 2) {
            const button = document.createElement("button")
            button.className = "hint-button"
            button.textContent = options.hints[i][j];
            const params = { inMathZone, start, end }
            if (inMathZone) {
              params.textNode = node
            } else {
              params.state = options.state
              params.dispatch = options.dispatch
            }
            params.str = button.textContent
            button.addEventListener('click', (event) => insertHint(params))
            hintButtons.children[i + 1].children[j].append(button)
          } else {
            hintButtons.children[i + 1].children[j].textContent = options.hints[i][j];
          }
        }
      }
    } else {
      const hintButtons = form.appendChild(document.createElement("div"))
      for (const hintRow of options.hints) {
        for (const hint of hintRow) {
          const button = document.createElement("button")
          button.className = "hint-button"
          const params = { inMathZone, start, end }
          if (inMathZone) {
            params.textNode = node
          } else {
            params.state = options.state
            params.dispatch = options.dispatch
          }
          if (options.title === "Accents") {
            button.innerHTML = hint[0];
            params.str = hint[1];
          } else {
            button.innerHTML = hint
            params.str = hint
          }
          button.addEventListener('click', (event) => insertHint(params))
          hintButtons.appendChild(button)
        }
        hintButtons.appendChild(document.createElement("br"))
      }
    }
  }

  const buttons = form.appendChild(document.createElement("div"))
  buttons.className = prefix + "-buttons"
  buttons.appendChild(submitButton)
  buttons.appendChild(document.createTextNode(" "))
  buttons.appendChild(cancelButton)

  if (options.useOkButton) {
    buttons.lastChild.style.float = "right"
    buttons.style.display = "block"
  }

  const box = wrapper.getBoundingClientRect()
  wrapper.style.top = ((window.innerHeight - box.height) / 2) + "px"
  wrapper.style.left = ((window.innerWidth - box.width) / 2) + "px"

  const submit = () => {
    const params = getValues(options.fields, domFields)
    if (options.radioButtons) {
      if (options.radioButtons.name === "rounding") {
        params.value = form[options.radioButtons.name].value + form.digits.value
      } else if (options.radioButtons.name === "dateFormat") {
        params.format = form[options.radioButtons.name].value
      } else {
        params.class = form[options.radioButtons.name].value
      }
    }
    if (options.src && !params.src) {
      params.src = options.src
    }
    params.checkbox = checkbox.checked
    if (params) {
      close()
      if (options.callback) {
        options.callback(params)
      }
    }
  }

  form.addEventListener("submit", e => {
    e.preventDefault()
    submit()
  })

  form.addEventListener("keydown", e => {
    if (e.keyCode === 27) {
      e.preventDefault()
      close()
    } else if (e.keyCode === 13) {
      const doSubmit = (options.useOkButton && e.shiftKey)
        ? true
        : !options.useOkButton && !(e.ctrlKey || e.metaKey || e.shiftKey)
        ? true
        : false
      if (doSubmit) {
        e.preventDefault()
        submit()
      }
    } else if (e.keyCode === 9) {
      window.setTimeout(() => {
        if (!wrapper.contains(document.activeElement)) { close() }
      }, 500)
    }
  })

  const input = form.elements[0]
  if (input && input.type && input.type === "text") {
    input.focus()
  }
}

function getValues(fields, domFields) {
  const result = Object.create(null)
  let i = 0
  // eslint-disable-next-line guard-for-in
  for (const name in fields) {
    const field = fields[name]
    const dom = domFields[i++]
    const value = dom.tagname === "INPUT"
      ? field.read(dom)
      : field.read(dom.lastChild)
    const bad = field.validate(value)
    if (bad) {
      reportInvalid(dom, bad)
      return null
    }
    result[name] = field.clean(value)
  }
  return result
}

function reportInvalid(dom, message) {
  // FIXME this is awful and needs a lot more work
  const parent = dom.parentNode
  const msg = parent.appendChild(document.createElement("div"))
  msg.style.left = (dom.offsetLeft + dom.offsetWidth + 2) + "px"
  msg.style.top = (dom.offsetTop - 5) + "px"
  msg.className = "ProseMirror-invalid"
  msg.textContent = message
  setTimeout(() => parent.removeChild(msg), 1500)
}

// ::- The type of field that `FieldPrompt` expects to be passed to it.
export class Field {
  // :: (Object)
  // Create a field with the given options. Options support by all
  // field types are:
  //
  // **`value`**`: ?any`
  //   : The starting value for the field.
  //
  // **`label`**`: string`
  //   : The label for the field.
  //
  // **`required`**`: ?bool`
  //   : Whether the field is required.
  //
  // **`validate`**`: ?(any) → ?string`
  //   : A function to validate the given value. Should return an
  //     error message if it is not valid.
  constructor(options) { this.options = options }

  // render:: (state: EditorState, props: Object) → dom.Node
  // Render the field to the DOM. Should be implemented by all subclasses.

  // :: (dom.Node) → any
  // Read the field's value from its DOM node.
  read(dom) { return dom.value }

  // :: (any) → ?string
  // A field-type-specific validation function.
  validateType(_value) {}

  validate(value) {
    if (!value && this.options.required) {
      return "Required field"
    }
    return this.validateType(value) || (this.options.validate && this.options.validate(value))
  }

  clean(value) {
    return this.options.clean ? this.options.clean(value) : value
  }
}

// ::- A field class for single-line text fields.
export class TextField extends Field {
  render() {
    const input = document.createElement("input")
    input.type = "text"
    input.placeholder = this.options.label
    input.value = this.options.value || ""
    input.autocomplete = "off"
    if (this.options.leader) {
      input.style.width = "50px"
      const leader = document.createElement("span")
      leader.textContent = this.options.leader
      const div = document.createElement("div")
      div.appendChild(leader)
      div.appendChild(input)
      return div
    } else {
      return input
    }
  }
}

export class TextAreaField extends Field {
  render() {
    const input = document.createElement('textarea')
    input.maxLength = 5000
    input.cols = 80
    input.rows = 4
    input.placeholder = this.options.label
    input.value = this.options.value
    input.autocomplete = "off"
    return input
  }
}

export class CodeField extends Field {
  render() {
    const wrapper = document.createElement('pre')
    wrapper.appendChild(document.createElement('code'))
    wrapper.firstChild.textContent = this.options.value
    return wrapper
  }
}

// ::- A field class for dropdown fields based on a plain `<select>`
// tag. Expects an option `options`, which should be an array of
// `{value: string, label: string}` objects, or a function taking a
// `ProseMirror` instance and returning such an array.
export class SelectField extends Field {
  render() {
    const select = document.createElement("select")
    this.options.options.forEach(o => {
      const opt = select.appendChild(document.createElement("option"))
      opt.value = o.value
      opt.selected = o.value === this.options.value
      opt.label = o.label
    })
    return select
  }
}
