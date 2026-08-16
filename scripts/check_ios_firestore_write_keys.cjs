/**
 * Fail if the sibling iOS Firebase writer sends keys outside firestore.rules allowlists.
 * Skip (exit 0) when JetLagProject is not checked out next to this repo.
 *
 * Paths: ../JetLagProject or JETLAGPRO_IOS_ROOT
 */
const fs = require('fs')
const path = require('path')

const websiteRoot = path.join(__dirname, '..')
const rulesPath = path.join(websiteRoot, 'firestore.rules')
const iosRoot =
  process.env.JETLAGPRO_IOS_ROOT ||
  path.join(websiteRoot, '..', 'JetLagProject')
const swiftPath = path.join(
  iosRoot,
  'JetLagPro',
  'Services',
  'FirebaseService.swift',
)

function extractQuotedList(source, functionName) {
  const re = new RegExp(
    `function ${functionName}\\(\\) \\{[\\s\\S]*?return \\[([\\s\\S]*?)\\];`,
  )
  const match = source.match(re)
  if (!match) {
    throw new Error(`Could not find ${functionName}() in firestore.rules`)
  }
  return new Set([...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1]))
}

function firebaseFieldConstants(swift) {
  const block = swift.match(
    /private struct FirebaseFields \{([\s\S]*?)\n    \}/,
  )
  if (!block) {
    throw new Error('Could not find FirebaseFields in FirebaseService.swift')
  }
  const map = {}
  for (const m of block[1].matchAll(/static let (\w+) = "([^"]+)"/g)) {
    map[m[1]] = m[2]
  }
  return map
}

function extractIosTripKeys(swift) {
  const fn = swift.match(
    /private static func writeTripCompletionToFirebase\([\s\S]*?\n    \/\/ MARK: - Helper Functions/,
  )
  if (!fn) {
    throw new Error('Could not find writeTripCompletionToFirebase in FirebaseService.swift')
  }
  const body = fn[0]
  const dict = body.match(/var fields: \[String: Any\] = \[([\s\S]*?)\]\s*\n\s*for transition/)
  if (!dict) {
    throw new Error('Could not find trip fields dictionary in writeTripCompletionToFirebase')
  }
  const constants = firebaseFieldConstants(swift)
  const keys = new Set()
  for (const m of dict[1].matchAll(/^\s+"([A-Za-z0-9]+)"\s*:/gm)) {
    keys.add(m[1])
  }
  for (const m of dict[1].matchAll(/^\s+FirebaseFields\.(\w+)/gm)) {
    const mapped = constants[m[1]]
    if (!mapped) {
      throw new Error(`Unknown FirebaseFields.${m[1]} in trip writer`)
    }
    keys.add(mapped)
  }
  if (body.includes('point${transition}Timezone') || body.includes('point\\(transition)Timezone')) {
    for (let i = 1; i <= 12; i += 1) {
      keys.add(`point${i}Timezone`)
    }
  }
  return keys
}

function extractIosSurveyKeys(swift) {
  const match = swift.match(/let surveyFields = \[([\s\S]*?)\]/)
  if (!match) {
    throw new Error('Could not find surveyFields in FirebaseService.swift')
  }
  return new Set([...match[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]))
}

function extras(actual, allowed) {
  return [...actual].filter((k) => !allowed.has(k)).sort()
}

function main() {
  const rules = fs.readFileSync(rulesPath, 'utf8')
  const mobileKeys = extractQuotedList(rules, 'mobileTripWriteKeys')
  const surveySubmitKeys = extractQuotedList(rules, 'surveySubmissionKeys')
  const surveyEditKeys = extractQuotedList(rules, 'surveyEditKeys')

  if (!fs.existsSync(swiftPath)) {
    console.log(
      `check_ios_firestore_write_keys: skip (no iOS writer at ${swiftPath})`,
    )
    return
  }

  const swift = fs.readFileSync(swiftPath, 'utf8')
  const tripKeys = extractIosTripKeys(swift)
  const surveyKeys = extractIosSurveyKeys(swift)
  const tripExtra = extras(tripKeys, mobileKeys)
  const surveySubmitExtra = extras(surveyKeys, surveySubmitKeys)
  const surveyEditExtra = extras(surveyKeys, surveyEditKeys)

  if (tripExtra.length || surveySubmitExtra.length || surveyEditExtra.length) {
    const lines = []
    if (tripExtra.length) {
      lines.push(`trip write keys not in mobileTripWriteKeys: ${tripExtra.join(', ')}`)
    }
    if (surveySubmitExtra.length) {
      lines.push(
        `survey write keys not in surveySubmissionKeys: ${surveySubmitExtra.join(', ')}`,
      )
    }
    if (surveyEditExtra.length) {
      lines.push(`survey write keys not in surveyEditKeys: ${surveyEditExtra.join(', ')}`)
    }
    console.error(lines.join('\n'))
    process.exit(1)
  }

  console.log(
    `check_ios_firestore_write_keys: ok (${tripKeys.size} trip keys, ${surveyKeys.size} survey keys)`,
  )
}

main()
