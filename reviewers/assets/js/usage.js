// Private usage charts. Not linked from the public site.
// iPhone sessions: jetlagpro-research, readable only by the signed-in analyst email.
// Android trips: jetlagpro-android, read after that same sign-in.

const READER_EMAIL = 'sbschram@gmail.com'
const EMAIL_KEY = 'jetlagproUsageEmail'

const research = firebase.initializeApp(
  {
    apiKey: 'AIzaSyBcck2Ca7xBjlZcCwTcQBNQUueFsO0wyBA',
    authDomain: 'jetlagpro-research.firebaseapp.com',
    projectId: 'jetlagpro-research',
    appId: '1:202766013439:web:c835e22cf3a12332920dca',
  },
  'research',
)

const android = firebase.initializeApp(
  {
    apiKey: 'AIzaSyAs-DHNBITsVrBlc8USZWR8LzRYhdIDyHU',
    authDomain: 'jetlagpro-android.firebaseapp.com',
    projectId: 'jetlagpro-android',
    appId: '1:234271505414:web:4bcf652de383d3eb495787',
  },
  'android',
)

const FUNNEL = [
  ['app_open', 'Opened the app'],
  ['start_look_around', 'Look around'],
  ['start_trip', 'Start my trip'],
  ['browse_video_finished', 'Watched a browse video'],
  ['destination_picked', 'Picked a destination'],
  ['points_marked', 'Marked a point'],
  ['guide_ended', 'Finished the guide'],
  ['consent_shown', 'Saw the research question'],
  ['research_share', 'Tapped Share'],
  ['research_not_now', 'Tapped Not now'],
]

const DEV_IDS = new Set([
  '2330B376',
  '7482966F',
  '5E001B36',
  '23DB54B0',
  '1CDD41FC',
  '618EB080',
])

const END_LABELS = {
  manual_end_x_button: 'Ended with the X button',
  timeout_24_hours: 'Ended at 24 hours',
  point12Stimulated: 'Ended on the last point',
}

function $(id) {
  return document.getElementById(id)
}

function show(id, on) {
  $(id).hidden = !on
}

function setStatus(text) {
  $('status').textContent = text
}

function eventNames(events) {
  const names = new Set()
  if (!Array.isArray(events)) return names
  events.forEach(function (item) {
    const name = item && item.eventName ? String(item.eventName).trim() : ''
    if (name) names.add(name)
  })
  return names
}

function pointsBucket(count) {
  const n = Number(count) || 0
  if (n <= 0) return '0'
  if (n === 1) return '1'
  if (n <= 5) return '2-5'
  if (n <= 11) return '6-11'
  return '12'
}

function renderBars(targetId, rows) {
  const host = $(targetId)
  host.replaceChildren()
  const max = rows.reduce(function (best, row) {
    return Math.max(best, row.value)
  }, 0)
  rows.forEach(function (row) {
    const line = document.createElement('div')
    line.className = 'bar-row'
    const label = document.createElement('div')
    label.className = 'bar-label'
    label.textContent = row.label
    const track = document.createElement('div')
    track.className = 'bar-track'
    const fill = document.createElement('div')
    fill.className = 'bar-fill'
    fill.style.width = max > 0 ? Math.max(2, Math.round((row.value / max) * 100)) + '%' : '0%'
    track.appendChild(fill)
    const value = document.createElement('div')
    value.className = 'bar-value'
    value.textContent = String(row.value)
    line.append(label, track, value)
    host.appendChild(line)
  })
}

function summarizeIos(docs) {
  const devices = new Set()
  const byEvent = {}
  FUNNEL.forEach(function (pair) {
    byEvent[pair[0]] = new Set()
  })
  docs.forEach(function (docSnap) {
    const data = docSnap.data() || {}
    const device = String(data.deviceId || docSnap.id.split('-')[0] || '').toUpperCase()
    if (!device || DEV_IDS.has(device)) return
    devices.add(device)
    eventNames(data.events).forEach(function (name) {
      if (byEvent[name]) byEvent[name].add(device)
    })
  })
  return {
    phones: devices.size,
    opens: docs.length,
    rows: FUNNEL.map(function (pair) {
      return { label: pair[1], value: byEvent[pair[0]].size }
    }),
  }
}

function summarizeAndroid(docs) {
  const phones = new Set()
  const ends = {}
  const points = { '0': 0, '1': 0, '2-5': 0, '6-11': 0, '12': 0 }
  let trips = 0
  let hiddenTests = 0
  docs.forEach(function (docSnap) {
    const data = docSnap.data() || {}
    const device = docSnap.ref.parent.parent ? docSnap.ref.parent.parent.id.toUpperCase() : ''
    const platform = String(data.platform || '').toLowerCase()
    if (platform === 'ios' || DEV_IDS.has(device)) {
      hiddenTests += 1
      return
    }
    trips += 1
    if (device) phones.add(device)
    const method = String(data.completionMethod || 'unknown')
    ends[method] = (ends[method] || 0) + 1
    const bucket = pointsBucket(data.pointsMarkedCount)
    points[bucket] = (points[bucket] || 0) + 1
  })
  const endRows = Object.keys(ends)
    .sort(function (a, b) {
      return ends[b] - ends[a]
    })
    .map(function (key) {
      return { label: END_LABELS[key] || key, value: ends[key] }
    })
  const pointRows = ['1', '2-5', '6-11', '12'].map(function (key) {
    return { label: key + ' points marked', value: points[key] || 0 }
  })
  return { trips: trips, phones: phones.size, hiddenTests: hiddenTests, endRows: endRows, pointRows: pointRows }
}

async function loadCharts() {
  setStatus('Loading records…')
  show('charts', false)
  const iosError = $('ios-error')
  const androidError = $('android-error')
  iosError.hidden = true
  androidError.hidden = true

  let iosSummary = null
  try {
    const snap = await research.firestore().collection('iosUsageEvents').get()
    iosSummary = summarizeIos(snap.docs)
  } catch (error) {
    iosError.hidden = false
    iosError.textContent = 'iPhone records did not load. ' + (error && error.message ? error.message : '')
  }

  let androidSummary = null
  const androidUser = android.auth().currentUser
  if (!androidUser || androidUser.email !== READER_EMAIL || !androidUser.emailVerified) {
    androidError.hidden = false
    androidError.textContent = 'Android records need their own sign-in email. Open that link on this computer, then tap Refresh.'
  } else {
    try {
      const snap = await android.firestore().collectionGroup('trips').get()
      androidSummary = summarizeAndroid(snap.docs)
    } catch (error) {
      androidError.hidden = false
      androidError.textContent = 'Android records did not load. ' + (error && error.message ? error.message : '')
    }
  }

  if (iosSummary) {
    $('ios-caption').textContent =
      iosSummary.phones + ' phones. ' + iosSummary.opens + ' opens counted, including ones with no later step. Test phones are left out.'
    renderBars('ios-bars', iosSummary.rows)
  }
  if (androidSummary) {
    $('android-caption').textContent =
      androidSummary.trips +
      ' finished trips on ' +
      androidSummary.phones +
      ' phones. Test copies on iPhone are left out (' +
      androidSummary.hiddenTests +
      '). Welcome choices are not in these trip records yet.'
    renderBars('android-end-bars', androidSummary.endRows.length ? androidSummary.endRows : [{ label: 'No trips', value: 0 }])
    renderBars('android-point-bars', androidSummary.pointRows)
  }

  show('charts', true)
  setStatus('Updated ' + new Date().toLocaleString())
}

function continueUrl(from) {
  return window.location.origin + window.location.pathname + '?from=' + from
}

function isAnalyst(user) {
  return Boolean(user && user.email === READER_EMAIL && user.emailVerified)
}

async function sendProjectLink(app, from) {
  await app.auth().sendSignInLinkToEmail(READER_EMAIL, {
    url: continueUrl(from),
    handleCodeInApp: true,
  })
  window.localStorage.setItem(EMAIL_KEY, READER_EMAIL)
}

async function finishEmailLink() {
  const href = window.location.href
  const from = new URL(href).searchParams.get('from')
  if (from !== 'research' && from !== 'android') return false
  const app = from === 'android' ? android : research
  if (!app.auth().isSignInWithEmailLink(href)) return false
  setStatus('Finishing sign-in…')
  await app.auth().signInWithEmailLink(READER_EMAIL, href)
  window.history.replaceState({}, document.title, window.location.origin + window.location.pathname)
  return true
}

async function sendLink() {
  $('signin-error').hidden = true
  $('send-link').disabled = true
  try {
    const jobs = []
    if (!isAnalyst(research.auth().currentUser)) jobs.push(sendProjectLink(research, 'research'))
    if (!isAnalyst(android.auth().currentUser)) jobs.push(sendProjectLink(android, 'android'))
    await Promise.all(jobs)
    setStatus('Check ' + READER_EMAIL + '. Open each message on this computer and tap its link.')
  } catch (error) {
    $('signin-error').hidden = false
    $('signin-error').textContent = error && error.message ? error.message : 'Could not send the email.'
  } finally {
    $('send-link').disabled = false
  }
}

async function refreshScreen() {
  const researchOk = isAnalyst(research.auth().currentUser)
  const androidOk = isAnalyst(android.auth().currentUser)
  show('gate', !researchOk)
  show('signed-in', researchOk)
  $('send-android').hidden = !researchOk || androidOk
  if (!researchOk) {
    show('charts', false)
    return
  }
  await loadCharts()
  if (!androidOk) {
    setStatus('iPhone is ready. Tap Email the Android sign-in link, then open that message on this computer.')
  }
}

document.addEventListener('DOMContentLoaded', function () {
  $('send-link').addEventListener('click', sendLink)
  $('send-android').addEventListener('click', async function () {
    $('signin-error').hidden = true
    $('send-android').disabled = true
    try {
      await sendProjectLink(android, 'android')
      setStatus('Android sign-in email sent. Open it on this computer.')
    } catch (error) {
      $('signin-error').hidden = false
      $('signin-error').textContent = error && error.message ? error.message : 'Could not send the Android email.'
    } finally {
      $('send-android').disabled = false
    }
  })
  $('refresh').addEventListener('click', refreshScreen)
  $('sign-out').addEventListener('click', function () {
    research.auth().signOut()
    android.auth().signOut()
    show('charts', false)
    setStatus('')
  })

  finishEmailLink().catch(function (error) {
    $('signin-error').hidden = false
    $('signin-error').textContent = error && error.message ? error.message : 'The sign-in link did not work. Send a new one.'
  }).then(function () {
    research.auth().onAuthStateChanged(refreshScreen)
    android.auth().onAuthStateChanged(refreshScreen)
  })
})
