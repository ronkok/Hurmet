const prefix = "ProseMirror-prompt"

export function openSelectPrompt(title, buttons, callback) {
  const wrapper = document.body.appendChild(document.createElement("div"))
  wrapper.className = prefix

  const mouseOutside = e => { if (!wrapper.contains(e.target)) { close() } }
  setTimeout(() => window.addEventListener("mousedown", mouseOutside), 50)
  const close = () => {
    window.removeEventListener("mousedown", mouseOutside)
    if (wrapper.parentNode) { wrapper.parentNode.removeChild(wrapper) }
  }

  const form = wrapper.appendChild(document.createElement("form"))
  form.appendChild(document.createElement("h5")).textContent = title

  for (let i = 0; i < buttons.length; i++) {
    const button = document.createElement("button")
    button.type = "button"
    button.className = prefix + "-button"
    button.textContent = buttons[i].textContent
    button.dataset.pos = buttons[i].pos
    button.onclick = function(e) {
      const pos = e.target.dataset.pos
      close()
      callback(pos)
    }
    form.appendChild(button)
  }

  const box = wrapper.getBoundingClientRect()
  wrapper.style.top = ((window.innerHeight - box.height) / 2) + "px"
  wrapper.style.left = ((window.innerWidth - box.width) / 2) + "px"
}
