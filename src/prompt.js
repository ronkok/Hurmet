const prefix = "ProseMirror-prompt"

export function openPrompt(options) {
  const wrapper = document.body.appendChild(document.createElement("div"))
  wrapper.className = prefix

  const mouseOutside = e => { if (!wrapper.contains(e.target)) { close() } }
  setTimeout(() => window.addEventListener("mousedown", mouseOutside), 50)
  const close = () => {
    window.removeEventListener("mousedown", mouseOutside)
    if (wrapper.parentNode) { wrapper.parentNode.removeChild(wrapper) }
  }

  const domFields = []
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
    // Create buttons for image placement.
    const radioGroup = document.createElement("div")
    const current = options.radioButtons.current
    options.radioButtons.labels.forEach(label => {
      const button = document.createElement("input")
      button.type = "radio"
      button.name = options.radioButtons.name
      button.value = label
      button.setAttribute('id', label)
      if (label === current) { button.setAttribute("checked", null) }
      const labelTag = document.createElement("label")
      labelTag.setAttribute("for", label)
      labelTag.appendChild(document.createTextNode(label))
      radioGroup.appendChild(button)
      radioGroup.appendChild(labelTag)
    })
    form.appendChild(radioGroup)
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
    if (options.radioButtons && !checkbox.checked) {
      params.class = form[options.radioButtons.name].value
    }
    if (options.src && !params.src) {
      params.src = options.src
    }
    params.checkbox = checkbox.checked
    if (params) {
      close()
      options.callback(params)
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
  if (input) { input.focus() }
}

function getValues(fields, domFields) {
  const result = Object.create(null)
  let i = 0
  // eslint-disable-next-line guard-for-in
  for (const name in fields) {
    const field = fields[name]
    const dom = domFields[i++]
    const value = field.read(dom)
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
    return input
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
