# JetLagPro Website & Backend Changelog

All notable changes to the JetLagPro website, backend infrastructure, and data integrity systems.

## [Unreleased]

## [2.0.0] - 2025-12-11

### Major: Metadata Removal - Simplified Security Architecture

**Breaking Change:** Removed all metadata validation and collection

#### Removed
- **`_writeMetadata`** from trip completions (iOS/React Native apps)
  - Removed fields: `source`, `sourceVersion`, `appBuild`, `deviceId`, `platform`, `timestamp`
  - Rationale: Redundant with HMAC signature and tripId structure
  
- **`_surveyMetadata`** from survey submissions (web)
  - Removed fields: `source`, `sourceVersion`, `timestamp`, `userAgent`, `browserInfo`, `surveyUrl`
  - Rationale: Operation type (UPDATE) identifies survey submissions
  
- **`metadataValidator`** Cloud Function
  - No longer needed without metadata to validate
  
- **Metadata validation** from Firebase Security Rules
  - Simplified CREATE to only check tripId format
  - Simplified UPDATE to check operation type
  
- **"Threat #4: Metadata Forgery"** from research paper
  - Acknowledged as redundant security theater
  - HMAC signature provides all necessary protection

#### Changed
- **Source detection** now based on operation type instead of metadata
  - CREATE operations → `source: "ios_app"`
  - UPDATE operations with `surveyCompleted: true` → `source: "web_survey"`
  - Other operations → `source: "firebase_console"`
  
- **Audit log entries** no longer include metadata objects
  - Cleaner, simpler structure
  - Source field still present, derived from operation type
  
- **Research paper** threat model simplified
  - 7 threats instead of 9
  - Renumbered remaining threats for clarity

#### Why This Change?

**The Discovery:**
- 9 `METADATA_VALIDATION_FAILED` entries appeared (Nov 18 - Dec 9, 2025)
- All were false positives (build "0" rejection, device ID format issues)
- Zero legitimate data quality problems found

**The Realization:**
- HMAC signature already cryptographically proves trip authenticity
- Metadata could be fabricated by developer (who controls the app)
- Device ID and timestamp already in tripId
- Firestore tracks server timestamps automatically
- Metadata validation was redundant security theater

**The Benefit:**
- 150+ lines of code removed
- Zero validation false positives going forward
- More honest security model
- DRY principle: no duplicate data
- Simpler codebase for research reviewers

#### Migration
- **Backward compatible:** Old trips with metadata remain valid
- **Forward compatible:** New trips work without metadata
- **No data migration needed:** System handles both formats

#### Security Model
Three layers provide complete protection:
1. **HMAC Signature** - Unforgeable proof of app origin
2. **Immutable GCS Audit Trail** - Tamper detection
3. **Firestore Server Timestamps** - Automatic, reliable timing

---

## [1.5.0] - 2025-12-11

### Added
- **Simulator detection and blocking** for iOS and React Native
  - iOS: Uses `#if targetEnvironment(simulator)` compile-time check
  - React Native: Uses `DeviceInfo.isEmulator()` runtime check
  - Simulator trips automatically blocked from Firebase writes
  - Eliminates need to manually add simulator device IDs to block list

### Changed
- **Developer device blocking** now combines simulator detection + device ID list
  - Alert messages distinguish "Simulator" vs "Test device"
  - More maintainable than hardcoding simulator device IDs

---

## [1.4.0] - 2025-12-09

### Fixed
- **Build "0" validation** - Development builds now accepted
  - Changed validation from `buildNum < 1` to `buildNum < 0`
  - Allows debug builds to write to Firebase for testing
  - Affects both iOS and React Native development builds

---

## [1.3.0] - 2025-11-19

### Fixed
- **Device ID format validation** - Accept 16-36 character hex strings
  - Android emulators and some test devices use longer hex IDs
  - Updated regex to accept flexible lengths
  - Prevents false positive validation failures

---

## [1.2.0] - 2025-11-18

### Added
- **HMAC signature validation** Cloud Function
  - Validates cryptographic signatures on all trip IDs
  - Build 6+ trips include HMAC-SHA256 signatures
  - Invalid signatures logged to audit trail
  - Primary security mechanism for detecting fabricated trips

---

## [1.1.0] - 2025-11-11

### Added
- **Immutable audit logging** system
  - Dual-write to Firestore (mutable) and GCS (immutable)
  - 10-year retention policy on GCS bucket
  - Publicly readable for independent verification
  - Logs CREATE, UPDATE, DELETE operations
  
- **Audit log viewer** web interface
  - Real-time view of all database operations
  - Source identification (app, survey, console)
  - Validation status display
  
- **Verification tool** web interface
  - Compares Firestore vs GCS audit entries
  - Detects discrepancies indicating tampering
  - No command-line tools required

---

## [1.0.0] - 2025-11-01

### Initial Release
- JetLagPro website launched
- Research paper published
- Trip completion tracking
- Survey system
- Basic Firebase integration

---

## Versioning

This project uses [Semantic Versioning](https://semver.org/):
- **MAJOR** version for incompatible API/data structure changes
- **MINOR** version for backward-compatible functionality additions
- **PATCH** version for backward-compatible bug fixes

## Links

- **Website:** https://jetlagpro.com
- **Research Paper:** https://jetlagpro.com/research-paper.html
- **Audit Log:** https://jetlagpro.com/reviewers/audit-log.html
- **Verification:** https://jetlagpro.com/reviewers/verify.html
- **Repository:** https://github.com/SBSchram/jetlagpro-website

