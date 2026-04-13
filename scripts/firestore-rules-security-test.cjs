/**
 * Automated coverage for docs/firestore-security-testing.md (rules layer only).
 * Run from repo root: npm run test:firestore-rules
 */
const fs = require('fs')
const path = require('path')
const {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} = require('@firebase/rules-unit-testing')
const {
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
  setLogLevel,
} = require('firebase/firestore')

const root = path.join(__dirname, '..')
const rulesPath = path.join(root, 'firestore.rules')

const VALID_TRIP_ID = '2330B376-ISTE-250411-1234-a1b2c3d4'

function parseEmulatorHost() {
  const raw = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080'
  const [host, portStr] = raw.split(':')
  return { host, port: Number(portStr) || 8080 }
}

async function main() {
  // Expected PERMISSION_DENIED cases otherwise spam GrpcConnection errors to stderr.
  setLogLevel('silent')

  const rules = fs.readFileSync(rulesPath, 'utf8')
  const { host, port } = parseEmulatorHost()

  const testEnv = await initializeTestEnvironment({
    projectId: 'jetlagpro-rules-test',
    firestore: { rules, host, port },
  })

  const db = testEnv.unauthenticatedContext().firestore()
  const dev = (id) => doc(db, 'tripCompletionsDev', id)

  console.log('docs/firestore-security-testing.md — automated rules checks\n')

  console.log('[Test C2] create with 4-part id → expect fail')
  await assertFails(
    setDoc(dev('2330B376-ISTE-250411-1234'), {
      tripId: '2330B376-ISTE-250411-1234',
    }),
  )
  console.log('  ok\n')

  console.log('[Rules] create with invalid segment-1 casing → expect fail')
  await assertFails(
    setDoc(dev('2330b376-ISTE-250411-1234-a1b2c3d4'), {
      tripId: '2330b376-ISTE-250411-1234-a1b2c3d4',
    }),
  )
  console.log('  ok\n')

  console.log('[Rules] valid 5-part create ({ tripId, surveyCompleted: false })')
  await assertSucceeds(
    setDoc(dev(VALID_TRIP_ID), {
      tripId: VALID_TRIP_ID,
      surveyCompleted: false,
    }),
  )
  console.log('  ok\n')

  console.log('[Rules] tripId field ≠ document id → expect fail')
  await assertFails(
    setDoc(dev('2330B376-ISTE-250411-1234-aaaaaaaa'), {
      tripId: '2330B376-ISTE-250411-1234-bbbbbbbb',
    }),
  )
  console.log('  ok\n')

  console.log('[Rules] auditLog client write → expect fail')
  await assertFails(setDoc(doc(db, 'auditLog', 'probe'), { x: 1 }))
  console.log('  ok\n')

  console.log('[Rules] mobile keys update while survey open')
  await assertSucceeds(
    updateDoc(dev(VALID_TRIP_ID), {
      destinationCode: 'IST',
      timezonesCount: 5,
      travelDirection: 'east',
      surveyCompleted: false,
    }),
  )
  console.log('  ok\n')

  console.log('[Rules] survey submit (surveyCompleted true, allowed keys only)')
  await assertSucceeds(
    updateDoc(dev(VALID_TRIP_ID), {
      surveyCompleted: true,
      surveySubmittedAt: Timestamp.now(),
      sleepPost: 3,
      fatiguePost: 2,
    }),
  )
  console.log('  ok\n')

  console.log('[Failure triage] full mobile patch after survey done → expect fail')
  await assertFails(
    updateDoc(dev(VALID_TRIP_ID), {
      destinationCode: 'XXX',
      pointsCompleted: 12,
    }),
  )
  console.log('  ok\n')

  console.log('[Rules] client delete → expect fail')
  await assertFails(deleteDoc(dev(VALID_TRIP_ID)))
  console.log('  ok\n')

  console.log('[Rules] tripCompletions (prod collection) same create shape')
  const prodId = 'A1B2C3D4-ZZZZ-999999-8888-fedcba98'
  await assertSucceeds(
    setDoc(doc(db, 'tripCompletions', prodId), {
      tripId: prodId,
      surveyCompleted: false,
    }),
  )
  console.log('  ok\n')

  await testEnv.cleanup()

  console.log('All automated Firestore rules checks passed.')
  console.log('\nManual (not run here): Test A — iOS dev trip + survey-dev.html')
  console.log('Manual (not run here): Test B — production trip + survey.html')
  console.log('Manual / staging: Test C1 — invalid HMAC → Cloud Function delete')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
