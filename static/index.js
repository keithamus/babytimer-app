document.addEventListener('DOMContentLoaded', () => {
  const contractionButton = document.querySelector('.js-stop-start')
  const timeReading = document.querySelector('.js-time')
  const history = document.querySelector('.js-history')
  const note = document.querySelector('.js-note')
  const historyItemTemplate = document.querySelector('template#history-entry')
  let timer = null
  const setItem = (i, json) => localStorage[i] = JSON.stringify(json)
  const getItem = i => {
    if (!localStorage[i]) return null
    const item = JSON.parse(localStorage[i])
    item.start = new Date(item.start)
    item.end = item.end ? new Date(item.end) : false
    return item
  }
  const getPrefs = () => JSON.parse(localStorage['_prefs'] || '{}')
  const setPrefs = v => setItem('_prefs', v)
  const setPref = (k, v) => {
    const prefs = getPrefs()
    prefs[k] = v
    setItem('_prefs', prefs)
  }
  const initPrefs = () => setPrefs(Object.assign({
    contractionWindow: 10,
    contractionCount: 3,
    contractionTime: 45,
  }, getPrefs()))
  const getItems = () => {
    const items = []
    for(let i = 0; i < localStorage.length; ++i) {
      const item = getItem(i)
      if (!item) return items
      items.push(item)
    }
    return items
  }
  const durations = [3600000, 60000, 1000]
  const postfixes = ['h', 'm', 's']
  const formatDuration = t => {
    let s = ''
    for(let i = 0; i < durations.length; ++i) {
      const d = durations[i]
      const p = postfixes[i]
      if (t / d > 1) {
        s += `${String(Math.floor(t /d )).padStart(2, 0)}${p} `
        t %= d
      }
    }
    return s
  }
  const tickContraction = () => {
    const items = getItems()
    const current = items[items.length - 1]
    if (!current) return
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
    const {contractionCount, contractionWindow, contractionTime} = getPrefs()
    if (items.length >= contractionCount && last.start - items[items.length - contractionCount].start < contractionWindow * 60000) {
      note.classList.add('alert')
      contractionButton.classList.add('alert')
      note.textContent = `That's ${contractionCount} contractions in ${contractionWindow} minutes! You should let your midwife know`
    } else if (last && (last.end||Date.now()) - last.start > contractionTime * 1000) {
      note.classList.add('alert')
      contractionButton.classList.add('alert')
      note.textContent = `That contraction lasted over ${contractionTime} seconds! You should let your midwife know`
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
      stopContraction()
      for(const key in localStorage) {
        if (Number.isNaN(key)) continue
        delete localStorage[key]
      }
      window.location.reload()
    }
  }

  const deletePrefs = () => {
    if (confirm('Are you sure you want to delete preferences? This won\'t delete your history.')) {
      delete localStorage['_prefs']
      window.location.reload()
    }
  }

  const prefsListener = () => {
    const prefs = getPrefs()
    for (const el of document.querySelectorAll('.js-pref-field')) {
      el.value = prefs[el.getAttribute('name')]
      el.addEventListener('input', e => {
        if (el.getAttribute('type') === 'tel' && isNaN(e.data)) {
          el.value = el.value.replace(/[^\d]/g, '')
        }
        setPref(el.getAttribute('name'), el.value)
      })
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
    if (!event.target) return
    if (!event.target.matches) return
    if (event.target.matches('.js-stop-start')) {
      stopStartContraction(event)
    } else if (event.target.matches('.js-delete-history')) {
      deleteHistory(event)
    } else if (event.target.matches('.js-delete-prefs')) {
      deletePrefs(event)
    } else if (event.target.closest('.js-footer')) {
      window.location.hash = '#history'
    }
  })

  window.addEventListener('hashchange', router)
  initPrefs()
  router()
  renderHistory()
  stopStartContraction()
  prefsListener()
})
