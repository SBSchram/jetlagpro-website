/**
 * JetLagPro Cloud Functions - Phase 2: Audit Logging & HMAC Validation
 * 
 * Functions:
 * 1. auditLogger - Logs all tripCompletions writes to auditLog collection
 * 2. hmacValidator - Validates HMAC signatures on trip creation
 * 3. metadataValidator - Checks metadata consistency (device IDs, timestamps, builds)
 */

const {setGlobalOptions} = require("firebase-functions/v2");
const {onDocumentCreated, onDocumentUpdated, onDocumentDeleted} = require("firebase-functions/v2/firestore");
const {initializeApp} = require("firebase-admin/app");
const {getFirestore, FieldValue} = require("firebase-admin/firestore");
const logger = require("firebase-functions/logger");
const crypto = require("crypto");

// Initialize Firebase Admin
initializeApp();
const db = getFirestore();

// Set global options for cost control
setGlobalOptions({
  maxInstances: 10,
  region: "us-east1", // Match your Firestore region
});

// HMAC Secret Key (same as iOS/RN apps)
// TODO: Move to environment variable before production deployment
const HMAC_SECRET = "7f3a9d8b2c4e1f6a5d8b3c9e7f2a4d6b8c1e3f5a7d9b2c4e6f8a1d3b5c7e9f2a";

/**
 * Calculate HMAC-SHA256 signature
 * @param {string} message - The message to sign
 * @param {string} key - The secret key
 * @return {string} - Hex string of first 8 characters
 */
function calculateHMAC(message, key) {
  const hmac = crypto.createHmac("sha256", key);
  hmac.update(message);
  const fullHash = hmac.digest("hex");
  return fullHash.substring(0, 8).toLowerCase();
}

/**
 * Validate HMAC signature in trip ID
 * @param {string} tripId - Trip ID to validate
 * @return {object} - {valid: boolean, reason: string}
 */
function validateTripIdSignature(tripId) {
  // Split trip ID parts
  const parts = tripId.split("-");
  
  // Check format
  if (parts.length === 4) {
    // Legacy format (no signature) - allow for backward compatibility
    return {valid: true, reason: "legacy_format"};
  }
  
  if (parts.length !== 5) {
    return {valid: false, reason: "invalid_format"};
  }
  
  // Extract signature
  const [deviceId, destDir, date, time, signature] = parts;
  const baseTripId = `${deviceId}-${destDir}-${date}-${time}`;
  
  // Calculate expected signature
  const expectedSignature = calculateHMAC(baseTripId, HMAC_SECRET);
  
  // Compare signatures (case-insensitive)
  if (signature.toLowerCase() === expectedSignature) {
    return {valid: true, reason: "signature_valid"};
  }
  
  return {valid: false, reason: "signature_mismatch"};
}

/**
 * Validate metadata consistency
 * @param {object} metadata - _writeMetadata object
 * @return {object} - {valid: boolean, issues: string[]}
 */
function validateMetadata(metadata) {
  const issues = [];
  
  if (!metadata) {
    return {valid: false, issues: ["missing_metadata"]};
  }
  
  // Check required fields
  if (!metadata.source) issues.push("missing_source");
  if (!metadata.timestamp) issues.push("missing_timestamp");
  
  // Validate source
  if (metadata.source && !["ios_app", "web_survey"].includes(metadata.source)) {
    issues.push("invalid_source");
  }
  
  // Validate device ID format (if present)
  if (metadata.deviceId) {
    const uuidRegex = /^[A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12}$/i;
    if (!uuidRegex.test(metadata.deviceId)) {
      issues.push("invalid_device_id_format");
    }
  }
  
  // Validate build number (if present)
  if (metadata.appBuild) {
    const buildNum = parseInt(metadata.appBuild);
    if (isNaN(buildNum) || buildNum < 1 || buildNum > 1000) {
      issues.push("invalid_build_number");
    }
  }
  
  return {valid: issues.length === 0, issues};
}

/**
 * Audit Logger - Logs all tripCompletions writes
 * Triggers on document creation
 */
exports.auditLoggerCreate = onDocumentCreated("tripCompletions/{tripId}", async (event) => {
  const snapshot = event.data;
  const tripId = event.params.tripId;
  
  if (!snapshot) {
    logger.warn("No data associated with the event");
    return;
  }
  
  const data = snapshot.data();
  
  // Create audit log entry (minimal - full data is in tripCompletions)
  const auditEntry = {
    operation: "CREATE",
    collection: "tripCompletions",
    documentId: tripId,
    tripId: tripId,
    timestamp: FieldValue.serverTimestamp(),
    // Store key trip info for quick reference
    destinationCode: data.destinationCode || null,
    originTimezone: data.originTimezone || null,
    arrivalTimeZone: data.arrivalTimeZone || null,
    // Store metadata for source verification
    metadata: {
      writeMetadata: data._writeMetadata || null,
      surveyMetadata: data._surveyMetadata || null,
    },
    severity: "INFO",
    message: `Trip ${tripId} created`,
    eventId: event.id,
  };
  
  try {
    await db.collection("auditLog").add(auditEntry);
    logger.info(`✅ Audit log created for trip ${tripId}`, {tripId, operation: "CREATE"});
  } catch (error) {
    logger.error(`❌ Failed to create audit log for trip ${tripId}`, {tripId, error: error.message});
  }
});

/**
 * Audit Logger - Logs all tripCompletions updates
 * Triggers on document update
 */
exports.auditLoggerUpdate = onDocumentUpdated("tripCompletions/{tripId}", async (event) => {
  const beforeSnapshot = event.data.before;
  const afterSnapshot = event.data.after;
  const tripId = event.params.tripId;
  
  if (!beforeSnapshot || !afterSnapshot) {
    logger.warn("Missing before or after snapshot");
    return;
  }
  
  const beforeData = beforeSnapshot.data();
  const afterData = afterSnapshot.data();
  
  // Calculate what changed
  const changes = {};
  const allKeys = new Set([...Object.keys(beforeData), ...Object.keys(afterData)]);
  
  for (const key of allKeys) {
    if (JSON.stringify(beforeData[key]) !== JSON.stringify(afterData[key])) {
      changes[key] = {
        before: beforeData[key],
        after: afterData[key],
      };
    }
  }
  
  // Create audit log entry (store only what changed - not full snapshots)
  const auditEntry = {
    operation: "UPDATE",
    collection: "tripCompletions",
    documentId: tripId,
    tripId: tripId,
    timestamp: FieldValue.serverTimestamp(),
    changes: changes, // Only the fields that changed
    changedFields: Object.keys(changes), // Field names for easy filtering
    // Store metadata to identify source (app vs survey vs console)
    metadata: {
      writeMetadata: afterData._writeMetadata || null,
      surveyMetadata: afterData._surveyMetadata || null,
    },
    severity: "INFO",
    message: `Trip ${tripId} updated (${Object.keys(changes).length} fields changed)`,
    eventId: event.id,
  };
  
  try {
    await db.collection("auditLog").add(auditEntry);
    logger.info(`✅ Audit log created for trip update ${tripId}`, {
      tripId,
      operation: "UPDATE",
      changedFields: Object.keys(changes),
    });
  } catch (error) {
    logger.error(`❌ Failed to create audit log for trip update ${tripId}`, {
      tripId,
      error: error.message,
    });
  }
});

/**
 * Audit Logger - Logs all tripCompletions deletes
 * Triggers on document deletion
 */
exports.auditLoggerDelete = onDocumentDeleted("tripCompletions/{tripId}", async (event) => {
  const snapshot = event.data;
  const tripId = event.params.tripId;
  
  if (!snapshot) {
    logger.warn("No data associated with delete event");
    return;
  }
  
  const data = snapshot.data();
  
  // Create audit log entry for deletion
  const auditEntry = {
    operation: "DELETE",
    collection: "tripCompletions",
    documentId: tripId,
    tripId: tripId,
    timestamp: FieldValue.serverTimestamp(),
    deletedData: data,
    severity: "WARNING",
    message: `⚠️ Trip ${tripId} deleted from Firebase Console`,
    metadata: {
      writeMetadata: data._writeMetadata || null,
      surveyMetadata: data._surveyMetadata || null,
    },
    eventId: event.id,
  };
  
  try {
    await db.collection("auditLog").add(auditEntry);
    logger.warn(`⚠️ Audit log created for trip deletion ${tripId}`, {tripId, operation: "DELETE"});
  } catch (error) {
    logger.error(`❌ Failed to create audit log for trip deletion ${tripId}`, {tripId, error: error.message});
  }
});

/**
 * HMAC Validator - Validates signatures on trip creation
 * Triggers on document creation
 */
exports.hmacValidator = onDocumentCreated("tripCompletions/{tripId}", async (event) => {
  const snapshot = event.data;
  const tripId = event.params.tripId;
  
  if (!snapshot) {
    logger.warn("No data associated with the event");
    return;
  }
  
  const data = snapshot.data();
  
  // Validate HMAC signature
  const validation = validateTripIdSignature(tripId);
  
  if (!validation.valid) {
    logger.warn(`⚠️ Invalid HMAC signature detected for trip ${tripId}`, {
      tripId,
      reason: validation.reason,
      source: data._writeMetadata?.source,
    });
    
    // Log to audit trail
    await db.collection("auditLog").add({
      operation: "HMAC_VALIDATION_FAILED",
      collection: "tripCompletions",
      documentId: tripId,
      timestamp: FieldValue.serverTimestamp(),
      reason: validation.reason,
      metadata: data._writeMetadata || null,
      eventId: event.id,
    });
    
    // Optional: Auto-flag or delete invalid trips
    // Uncomment to enable auto-deletion:
    // await snapshot.ref.delete();
    // logger.warn(`🗑️ Deleted trip with invalid signature: ${tripId}`);
  } else {
    logger.info(`✅ HMAC signature valid for trip ${tripId}`, {
      tripId,
      reason: validation.reason,
    });
  }
});

/**
 * Metadata Validator - Checks metadata consistency
 * Triggers on document creation
 */
exports.metadataValidator = onDocumentCreated("tripCompletions/{tripId}", async (event) => {
  const snapshot = event.data;
  const tripId = event.params.tripId;
  
  if (!snapshot) {
    logger.warn("No data associated with the event");
    return;
  }
  
  const data = snapshot.data();
  const metadata = data._writeMetadata;
  
  // Validate metadata
  const validation = validateMetadata(metadata);
  
  if (!validation.valid) {
    logger.warn(`⚠️ Metadata validation issues for trip ${tripId}`, {
      tripId,
      issues: validation.issues,
    });
    
    // Log to audit trail
    await db.collection("auditLog").add({
      operation: "METADATA_VALIDATION_FAILED",
      collection: "tripCompletions",
      documentId: tripId,
      timestamp: FieldValue.serverTimestamp(),
      issues: validation.issues,
      metadata: metadata || null, // Handle undefined metadata
      eventId: event.id,
    });
  } else {
    logger.info(`✅ Metadata valid for trip ${tripId}`, {tripId});
  }
});
