document.addEventListener('DOMContentLoaded', () => {
  const contractionButton = document.querySelector('.js-stop-start')
  const timeReading = document.querySelector('.js-time')
  const history = document.querySelector('.js-history')
  const note = document.querySelector('.js-note')
  const historyItemTemplate = document.querySelector('template#history-entry')
  let timer = null
  const setItem = (i, json) => localStorage[i] = JSON.stringify(json)
  const getItem = i => localStorage[i] ? JSON.parse(localStorage[i]) : null
  const getItems = () => {
    const items = []
    for(let i = 0; i < localStorage.length; ++i) {
      const item = getItem(i)
      item.start = new Date(item.start)
      item.end = item.end ? new Date(item.end) : false
      if (!item) break
      items.push(item)
    }
    return items
  }
  const formatDuration = time => {
    let s = time / 1000
    if (s % 3600) {
      return `${(s / 3600).toFixed(0)}h ${((s % 3600) / 60).toFixed(0)}m ${((s % 3600) % 60).toFixed(0)}s`
    }
    if (s % 60) {
      return `${(s / 60).toFixed(0)}m ${(s % 60).toFixed(0)}s`
    }
    return (time / 1000).toFixed(0) + 's'
  }
  const tickContraction = () => {
    const items = getItems()
    const current = items[items.length - 1]
    const now = Date.now()
    if (contractionButton.textContent !== 'Stop') {
      contractionButton.textContent = 'Stop'
    }
    timeReading.textContent = formatDuration(now - new Date(current.start))
    timer = setTimeout(tickContraction, 100)
  }
  const stopContraction = () => {
    clearTimeout(timer)
    const items = getItems()
    const last = items.length - 1
    if (items.length && !items[last].end) {
      items[last].end = new Date()
      setItem(last, items[last])
    }
    contractionButton.textContent = 'Start'
    timeReading.textContent = ' '
    renderHistory()
    return items
  }
  const startContraction = () => {
    stopContraction()
    const next = getItems().length
    setItem(next, {
      start: new Date(),
      end: null,
    })
    renderHistory()
    tickContraction()
    updateNote()
  }

  const stopStartContraction = click => {
    const items = getItems()
    if (items.length && !items[items.length - 1].end) {
      click ? stopContraction() : tickContraction()
    } else if (click) {
      startContraction()
    }
  }

  const updateNote = () => {
    const items = getItems()
    const last = items[items.length - 1]
    contractionButton.classList.remove('warning', 'alert')
    note.classList.remove('warning', 'alert')
    if (items.length >= 3 && (last.start - items[items.length - 3].start) < 600000) {
      note.classList.add('alert')
      contractionButton.classList.add('alert')
      note.textContent = 'It is time to go to the hospital'
    } else if (last && !last.end && Date.now() - last.start > 60000) {
      const className = Date.now() - last.start > 360000 ? 'alert' : 'warning'
      note.classList.add(className)
      contractionButton.classList.add(className)
      note.textContent = 'Make sure to stop the contraction!'
    } else if(items.length) {
      note.textContent = 'Everything is okay'
    }
  }

  const renderHistory = () => {
    history.innerHTML = ''
    const dtf = new Intl.DateTimeFormat(navigator.language, { hour: 'numeric', minute: 'numeric', second: 'numeric' })
    const frag = document.createDocumentFragment()
    for(const item of getItems()) {
      if (item.end) {
        const tpl = document.importNode(historyItemTemplate.content, true)
        const startEl = tpl.querySelector('.js-start + dd time')
        startEl.textContent = dtf.format(item.start)
        tpl.querySelector('.js-end').removeAttribute('hidden')
        const endEl = tpl.querySelector('.js-end + dd time')
        endEl.textContent = dtf.format(item.end)
        tpl.querySelector('.js-duration').removeAttribute('hidden')
        const durationEl = tpl.querySelector('.js-duration + dd time')
        durationEl.textContent = formatDuration(item.end - item.start)
        frag.prepend(tpl)
      }
    }
    history.appendChild(frag)
    updateNote()
  }

  const deleteHistory = () => {
    if (confirm('Are you sure you want to delete all history?')) {
      for(const key in localStorage) {
        if (Number.isNaN(key)) continue
        delete localStorage[key]
      }
      localStorage.length = 0
    }
  }

  const deletePrefs = () => {
    if (confirm('Are you sure you want to delete all history?')) {
      delete localStorage['_prefs']
    }
  }

  const router = e => {
    if (window.location.hash === '#history') {
      document.body.classList.add('nav-history')
      document.body.classList.remove('nav-settings', 'nav-main')
    } else if (window.location.hash === '#settings') {
      document.body.classList.add('nav-settings')
      document.body.classList.remove('nav-history', 'nav-main')
    } else if (window.location.hash === '') {
      document.body.classList.add('nav-main')
      document.body.classList.remove('nav-settings', 'nav-history')
    } else {
      window.location.hash = '#'
    }
  }

  document.addEventListener('click', event => {
    console.log(event.target)
    if (!event.target) return
    if (!event.target.matches) return
    if (event.target.matches('.js-stop-start')) {
      stopStartContraction(event)
    } else if (event.target.matches('.js-delete-history')) {
      deleteHistory(event)
    } else if (event.target.matches('.js-delete-prefs')) {
      deleteHistory(event)
    } else if (event.target.closest('.js-footer')) {
      window.location.hash = '#history'
    }
  })

  window.addEventListener('hashchange', router)
  router()
  renderHistory()
  stopStartContraction()
})
