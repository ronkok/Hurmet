const prefix = "ProseMirror-prompt"

export function openNavPrompt(options) {
  const wrapper = document.body.appendChild(document.createElement("div"))
  wrapper.className = prefix

  const mouseOutside = e => { if (!wrapper.contains(e.target)) { close() } }
  setTimeout(() => window.addEventListener("mousedown", mouseOutside), 50)
  const close = () => {
    window.removeEventListener("mousedown", mouseOutside)
    if (wrapper.parentNode) { wrapper.parentNode.removeChild(wrapper) }
  }

  const form = wrapper.appendChild(document.createElement("form"))
  form.appendChild(document.createElement("h5")).textContent = "Scroll to…"

  const topButton = document.createElement("button")
  topButton.type = "button"
  topButton.className = prefix + "-button"
  topButton.textContent = "Top"
  topButton.onclick = function() {window.scrollTo(0, 0); close()}
  form.appendChild(topButton)

  for (let i = 0; i < options.buttons.length; i++) {
    const button = document.createElement("button")
    button.type = "button"
    button.className = prefix + "-button"
    button.textContent = options.buttons[i].textContent
    button.dataset.pos = options.buttons[i].pos
    button.onclick = function(e) {
      const pos = e.target.dataset.pos
      close()
      options.callback(pos)
    }
    form.appendChild(button)
  }

  const bottomButton = document.createElement("button")
  bottomButton.type = "button"
  bottomButton.className = prefix + "-button"
  bottomButton.textContent = "Bottom"
  bottomButton.onclick = function() {window.scrollTo(0, options.bottom); close()}
  form.appendChild(bottomButton)

  const box = wrapper.getBoundingClientRect()
  wrapper.style.top = ((window.innerHeight - box.height) / 2) + "px"
  wrapper.style.left = ((window.innerWidth - box.width) / 2) + "px"
}
