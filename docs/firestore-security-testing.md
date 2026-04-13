# Firestore security & HMAC — testing instructions

Use this checklist after deploying **`firestore.rules`** and **Cloud Functions** (`hmacValidator`, `hmacValidatorDev`, `realtimeTripNotification` changes). Another agent or engineer can run it without a full “real” flight.

## Preconditions

1. **Repos:** `jetlagpro-website` (rules + functions), `JetLagPro` (iOS), React Native app repo if applicable (kept in parity with iOS).
2. **Firebase CLI:** Logged in and targeting the correct project (`firebase use` / `.firebaserc`).
3. **Deploy** (from `jetlagpro-website` root):

   ```bash
   firebase deploy --only firestore:rules,functions
   ```

4. Optional syntax check before deploy:

   ```bash
   firebase deploy --only firestore:rules --dry-run
   ```

## What you are validating

| Layer | Behavior |
|--------|------------|
| **Rules** | New docs only with **5-part signed** `tripId`; **mobile** updates only allowed field sets; **survey** updates only survey field sets; no client deletes. |
| **Functions** | On **create**, invalid HMAC / malformed 5-part id → document **deleted** + audit `HMAC_VALIDATION_FAILED`; **prod** new-trip email skipped for invalid ids. |
| **Clients** | iOS (and RN if mirrored) one **full trip PATCH** at completion; **survey** page uses `updateDoc` with survey fields only (plus optional fallback keys). |

## Test A — Dev bucket (recommended first)

**Goal:** Exercise `tripCompletionsDev` + `hmacValidatorDev` + rules without touching production trip data.

1. **Build/run** the iOS app (or RN app) configured as **dev** (simulator or listed dev device) so writes go to **`tripCompletionsDev`** (see app constants / `usesDeveloperTripFirestoreCollection`).
2. **Complete one trip** in the app through normal UI until the app logs a successful Firebase write (or you see a new document in Firestore).
3. In **Firebase Console → Firestore → `tripCompletionsDev`**:
   - Document id must be **5 segments** separated by `-`, last segment **8 lowercase hex** (HMAC suffix).
   - Document must **not** disappear within seconds (that would indicate HMAC delete firing on a **valid** id — investigate secret / id generation mismatch).
4. **Survey (dev):** Open **`survey-dev.html`** (served from the same site / local static server as configured). It sets `window.JETLAG_TRIP_COLLECTION = 'tripCompletionsDev'`.
   - Use the **same `tripId` and survey code** as the app link would provide.
   - Submit the survey.
5. In Firestore, confirm the same document now has **`surveyCompleted: true`** and survey fields (ratings, `surveySubmittedAt`, etc.).

**Pass:** Trip doc created and stable; survey update succeeds; no unexpected `PERMISSION_DENIED` in browser console or app logs.

## Test B — Production bucket (optional, smaller blast radius)

Only if policy allows writing a real **`tripCompletions`** doc.

1. Use a **production** app build (not dev bucket).
2. Complete one trip **or** use the smallest path that performs **`logTripCompletion` / writeTripCompletionToFirebase** once.
3. Confirm in **`tripCompletions`**:
   - Same **5-part id** shape as Test A.
   - Doc persists (not deleted by `hmacValidator`).
4. Complete survey via **`survey.html`** (production collection).

**Pass:** Same as Test A, on `tripCompletions`.

## Test C — Negative checks (optional)

1. **Invalid signature (should be removed by Functions):** Using REST or a test script **only in a safe environment**, attempt to **create** a document in `tripCompletionsDev` with a **5-part-looking** id whose last 8 hex chars do **not** match the real HMAC for the first four segments.  
   **Expect:** Document appears briefly, then **Cloud Function deletes** it; audit log entry **`HMAC_VALIDATION_FAILED`** (if audit pipeline is wired).
2. **Rules deny bad create:** Attempt **create** with a **4-part** id (legacy shape) via client SDK/REST.  
   **Expect:** **Permission denied** at rules (no 5-part signed id).

Do **not** run destructive tests against production **`tripCompletions`** without explicit approval.

## Cloud Functions logs

In **Firebase Console → Functions → Logs** (or Cloud Logging), filter for:

- `HMAC signature valid` / `Invalid trip id / HMAC` / `Deleted invalid trip document`
- `Skipping new-trip email` (invalid id on prod notification path)

**Pass:** No spurious deletes for legitimate test trips; invalid test trips log and delete as designed.

## Failure triage (quick)

| Symptom | Likely cause |
|---------|----------------|
| **Permission denied** on first trip write | Rules: `tripId` not matching `signedTripIdCreate` (format / case / segment length). Compare id to `AppState.makeTripId` + `HMACGenerator`. |
| **Permission denied** on survey submit | Update touched a field **not** in `surveySubmissionKeys`, or `tripId` in payload **≠** document id. |
| **Permission denied** on second mobile write | If `surveyCompleted` is already **true**, full mobile payload is **intentionally** blocked. |
| **Doc vanishes** after create | `hmacValidator` delete: id fails **`validateTripIdSignature`** (wrong secret, wrong base string, case mismatch on signature). Align iOS/Functions `HMAC_SECRET` and base-trip-id algorithm. |
| **RN fails, iOS passes** | RN payload has **extra field names** not in `mobileTripWriteKeys` — add fields to rules or align RN with iOS. |

## Reference files

- Rules: `firestore.rules` — `mobileTripWriteKeys`, `surveySubmissionKeys`, `signedTripIdCreate`, `tripCompletionUpdateAllowed`
- Functions: `functions/index.js` — `enforceHmacOnTripCreate`, `hmacValidator`, `hmacValidatorDev`, `validateTripIdSignature`
- iOS writer: `JetLagPro/Services/FirebaseService.swift` — `writeTripCompletionToFirebase`
- iOS id: `JetLagPro/Core/Models/AppState.swift` — `makeTripId`; `JetLagPro/Services/HMACGenerator.swift`
- Survey: `survey.js` — `exportSurveyData`, `jetlagTripCollection()`; `survey-dev.html` vs `survey.html`

## Done criteria

- [ ] Rules + functions deployed successfully.
- [ ] Test A (dev trip + dev survey) passes end-to-end.
- [ ] Logs show no erroneous HMAC deletes for valid ids.
- [ ] (Optional) Test B or Test C per policy.
