/**
 * JetLagPro Cloud Functions
 * 
 * Functions:
 * 1. auditLoggerCreate/Update/Delete - Logs all tripCompletions writes to both Firestore and GCS
 * 2. hmacValidator - Validates HMAC signatures on trip creation
 * 3. metadataValidator - Checks metadata consistency (device IDs, timestamps, builds)
 * 4. hourlyDigestNotification - Sends hourly email digest of new Firebase entries via Gmail
 */

const {setGlobalOptions} = require("firebase-functions/v2");
const {onDocumentCreated, onDocumentUpdated, onDocumentDeleted} = require("firebase-functions/v2/firestore");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const {initializeApp} = require("firebase-admin/app");
const {getFirestore, FieldValue, Timestamp} = require("firebase-admin/firestore");
const {Storage} = require("@google-cloud/storage");
const logger = require("firebase-functions/logger");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

// Initialize Firebase Admin
initializeApp();
const db = getFirestore();

// Initialize Google Cloud Storage
const storage = new Storage();
const auditBucket = storage.bucket("jetlagpro-audit-logs");

// Set global options for cost control
setGlobalOptions({
  maxInstances: 10,
  region: "us-east1", // Match your Firestore region
});

// HMAC Secret Key (same as iOS/RN apps)
// TODO: Move to environment variable before production deployment
const HMAC_SECRET = "7f3a9d8b2c4e1f6a5d8b3c9e7f2a4d6b8c1e3f5a7d9b2c4e6f8a1d3b5c7e9f2a";

// Email Notification Configuration
const NOTIFICATION_EMAIL = "sbschram@gmail.com";
const NOTIFICATION_SETTINGS_DOC = "notificationSettings";
const NOTIFICATION_SETTINGS_COLLECTION = "_system";

// Gmail Email Transporter (requires app-specific password with 2FA enabled)
let emailTransporter = null;

function getEmailTransporter() {
  if (emailTransporter) return emailTransporter;

  const functions = require("firebase-functions");
  const gmailPassword = functions.config().gmail?.password;
  if (!gmailPassword) {
    logger.warn("⚠️ Gmail app password not set. Run: firebase functions:config:set gmail.password=YOUR_PASSWORD");
    return null;
  }

  const gmailUser = functions.config().gmail?.user || "sbschram@gmail.com";
  emailTransporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: gmailUser, pass: gmailPassword },
  });
  
  return emailTransporter;
}

/**
 * Writes audit entry to both Firestore (real-time) and GCS (immutable).
 * 
 * @param {Object} auditEntry - The audit log entry to write
 * @return {Promise<void>}
 */
async function writeAuditEntry(auditEntry) {
  try {
    // 1. Write to Firestore (for real-time viewing)
    const firestoreRef = await db.collection("auditLog").add(auditEntry);
    logger.info(`✅ Firestore: Audit entry written (${firestoreRef.id})`);

    // 2. Write to GCS (immutable archive)
    const timestamp = Date.now();
    const operation = auditEntry.operation || "UNKNOWN";
    const tripId = auditEntry.tripId || auditEntry.documentId || "unknown";
    const fileName = `${timestamp}-${operation}-${tripId}.json`;
    const file = auditBucket.file(`audit-logs/${fileName}`);

    // Prepare entry for GCS (convert Firestore timestamps to ISO strings)
    // Recursively process the entry to normalize timestamps
    const normalizeForGCS = (obj) => {
      if (obj === null || obj === undefined) {
        return obj;
      }
      
      // Convert Firestore FieldValue.serverTimestamp() sentinel to ISO string
      if (obj && obj._methodName === "FieldValue.serverTimestamp") {
        return new Date().toISOString();
      }
      
      // Convert Firestore Timestamp objects to ISO strings (preserve milliseconds)
      if (obj && typeof obj === "object" && obj._seconds !== undefined) {
        const seconds = typeof obj._seconds === 'number' ? obj._seconds : parseInt(obj._seconds);
        const nanoseconds = obj._nanoseconds || 0;
        // Preserve millisecond precision: seconds * 1000 + nanoseconds / 1000000
        const milliseconds = seconds * 1000 + Math.floor(nanoseconds / 1000000);
        return new Date(milliseconds).toISOString();
      }
      
      // Handle arrays
      if (Array.isArray(obj)) {
        return obj.map(item => normalizeForGCS(item));
      }
      
      // Handle objects
      if (typeof obj === "object") {
        const normalized = {};
        for (const [key, value] of Object.entries(obj)) {
          normalized[key] = normalizeForGCS(value);
        }
        return normalized;
      }
      
      // Handle ISO timestamp strings - normalize to remove milliseconds if present
      if (typeof obj === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(obj)) {
        // Keep the timestamp as-is (don't round)
        return obj;
      }
      
      return obj;
    };
    
    const gcsEntry = normalizeForGCS(auditEntry);

    await file.save(JSON.stringify(gcsEntry, null, 2), {
      metadata: {
        contentType: "application/json",
        // Custom metadata for searchability
        operation: operation,
        tripId: tripId,
        severity: auditEntry.severity || "INFO",
        timestamp: new Date().toISOString(),
        // Firestore document ID for cross-reference
        firestoreDocId: firestoreRef.id,
        // Event ID for matching Firestore and GCS entries
        eventId: auditEntry.eventId || null,
      },
    });

    logger.info(`✅ GCS: Audit entry written (${fileName})`);
  } catch (error) {
    logger.error("❌ Error writing audit entry:", error);
    // Don't throw - we don't want to break the main operation
    // Just log the error for monitoring
  }
}

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
  // Accept both full UUID (legacy) and 8-char device hash (new format)
  if (metadata.deviceId) {
    const uuidRegex = /^[A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12}$/i;
    const hashRegex = /^[A-F0-9]{8}$/i;
    const hexStringRegex = /^[a-f0-9]{16,36}$/i; // Legacy test data (16-36 hex chars)
    
    if (!uuidRegex.test(metadata.deviceId) && 
        !hashRegex.test(metadata.deviceId) && 
        !hexStringRegex.test(metadata.deviceId)) {
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
 * Determine canonical source string for audit entries.
 * Prioritizes write metadata source, then survey metadata, with optional fallback.
 */
function resolveSource(writeMetadata, surveyMetadata, fallback = null) {
  if (writeMetadata && typeof writeMetadata.source === "string" && writeMetadata.source.trim() !== "") {
    return writeMetadata.source.trim();
  }
  if (surveyMetadata && typeof surveyMetadata.source === "string" && surveyMetadata.source.trim() !== "") {
    return surveyMetadata.source.trim();
  }
  return fallback;
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
  const source = resolveSource(data._writeMetadata, data._surveyMetadata, "firebase_console");
  
  // Create audit log entry (minimal - full data is in tripCompletions)
  // Only include fields that exist (don't default to null - Firestore omits null values)
  const auditEntry = {
    operation: "CREATE",
    collection: "tripCompletions",
    documentId: tripId,
    tripId: tripId,
    timestamp: FieldValue.serverTimestamp(),
    source: source,
    severity: "INFO",
    message: `Trip ${tripId} created`,
    eventId: event.id,
  };

  const metadata = {};
  if (data._writeMetadata !== undefined) metadata.writeMetadata = data._writeMetadata;
  if (data._surveyMetadata !== undefined) metadata.surveyMetadata = data._surveyMetadata;
  if (Object.keys(metadata).length > 0) {
    auditEntry.metadata = metadata;
  }
  
  // Only add fields if they exist (prevents Firestore from omitting them)
  if (data.destinationCode !== undefined) auditEntry.destinationCode = data.destinationCode;
  if (data.originTimezone !== undefined) auditEntry.originTimezone = data.originTimezone;
  if (data.arrivalTimeZone !== undefined) auditEntry.arrivalTimeZone = data.arrivalTimeZone;
  if (data.travelDirection !== undefined) auditEntry.travelDirection = data.travelDirection;
  
  try {
    await writeAuditEntry(auditEntry);
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
  const source = resolveSource(afterData._writeMetadata, afterData._surveyMetadata, "firebase_console");
  
  // Helper function to normalize values for comparison
  // Treats undefined, null, and empty string as equivalent "empty" state
  function normalizeForComparison(value) {
    if (value === undefined) return null;
    if (value === null) return null;
    if (typeof value === 'string' && value.trim() === '') return null; // Empty or whitespace-only strings
    return value;
  }
  
  // Helper function to check if two values are actually different
  function valuesAreDifferent(before, after) {
    const beforeNormalized = normalizeForComparison(before);
    const afterNormalized = normalizeForComparison(after);
    
    // If both are null (normalized), they're the same
    if (beforeNormalized === null && afterNormalized === null) return false;
    
    // If one is null and the other isn't, they're different
    if (beforeNormalized === null || afterNormalized === null) return true;
    
    // For objects/arrays, use JSON.stringify comparison
    if (typeof beforeNormalized === 'object' || typeof afterNormalized === 'object') {
      try {
        return JSON.stringify(beforeNormalized) !== JSON.stringify(afterNormalized);
      } catch (e) {
        // Fallback to string comparison if JSON.stringify fails
        return String(beforeNormalized) !== String(afterNormalized);
      }
    }
    
    // For primitives, direct comparison
    return beforeNormalized !== afterNormalized;
  }
  
  // Calculate what changed
  const changes = {};
  const allKeys = new Set([...Object.keys(beforeData), ...Object.keys(afterData)]);
  
  for (const key of allKeys) {
    if (valuesAreDifferent(beforeData[key], afterData[key])) {
      changes[key] = {
        before: beforeData[key] !== undefined ? beforeData[key] : null,
        after: afterData[key] !== undefined ? afterData[key] : null,
      };
    }
  }
  
  // Create audit log entry (store only what changed - not full snapshots)
  // Only include metadata fields that exist (prevents Firestore from omitting null values)
  const auditEntry = {
    operation: "UPDATE",
    collection: "tripCompletions",
    documentId: tripId,
    tripId: tripId,
    timestamp: FieldValue.serverTimestamp(),
    changes: changes, // Only the fields that changed
    changedFields: Object.keys(changes), // Field names for easy filtering
    source: source,
    severity: "INFO",
    message: `Trip ${tripId} updated (${Object.keys(changes).length} fields changed)`,
    eventId: event.id,
  };
  
  // Only add metadata fields if they exist
  const metadata = {};
  if (afterData._writeMetadata !== undefined) metadata.writeMetadata = afterData._writeMetadata;
  if (afterData._surveyMetadata !== undefined) metadata.surveyMetadata = afterData._surveyMetadata;
  if (Object.keys(metadata).length > 0) {
    auditEntry.metadata = metadata;
  }
  
  try {
    await writeAuditEntry(auditEntry);
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
  const source = resolveSource(data._writeMetadata, data._surveyMetadata, "firebase_console");
  
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
    source: source,
    metadata: {
      writeMetadata: data._writeMetadata || null,
      surveyMetadata: data._surveyMetadata || null,
    },
    eventId: event.id,
  };
  
  try {
    await writeAuditEntry(auditEntry);
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
    await writeAuditEntry({
      operation: "HMAC_VALIDATION_FAILED",
      collection: "tripCompletions",
      documentId: tripId,
      timestamp: FieldValue.serverTimestamp(),
      source: resolveSource(data._writeMetadata, data._surveyMetadata, data._writeMetadata?.source || null),
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
    // Only include metadata if it exists (prevents Firestore from omitting null values)
    const auditEntry = {
      operation: "METADATA_VALIDATION_FAILED",
      collection: "tripCompletions",
      documentId: tripId,
      timestamp: FieldValue.serverTimestamp(),
      source: resolveSource(metadata, data._surveyMetadata, metadata?.source || null),
      issues: validation.issues,
      eventId: event.id, // eventId links related entries from same source event
    };
    // Only add metadata if it exists (don't default to null - Firestore omits null values)
    if (metadata !== undefined && metadata !== null) {
      auditEntry.metadata = metadata;
    }
    await writeAuditEntry(auditEntry);
  } else {
    logger.info(`✅ Metadata valid for trip ${tripId}`, {tripId});
  }
});

/**
 * Hourly Digest Notification - Sends email of new Firebase entries
 * Runs every hour via Cloud Scheduler
 */
exports.hourlyDigestNotification = onSchedule({
  schedule: "0 * * * *", // Every hour at minute 0
  timeZone: "America/New_York",
  region: "us-east1",
}, async (event) => {
  try {
    logger.info("🔄 Starting hourly digest notification check...");

    // Get last notification timestamp from Firestore
    const settingsRef = db.collection(NOTIFICATION_SETTINGS_COLLECTION).doc(NOTIFICATION_SETTINGS_DOC);
    const settingsDoc = await settingsRef.get();
    
    let lastNotificationTime = null;
    if (settingsDoc.exists) {
      const data = settingsDoc.data();
      lastNotificationTime = data.lastNotificationTime;
      logger.info(`📅 Last notification time: ${lastNotificationTime}`);
    } else {
      // First run - check entries from last 1 hour
      lastNotificationTime = Timestamp.fromMillis(Date.now() - 60 * 60 * 1000);
      logger.info("📅 First run - checking last 1 hour of entries");
    }

    const cutoffTime = lastNotificationTime || Timestamp.fromMillis(Date.now() - 60 * 60 * 1000);
    const cutoffMillis = cutoffTime.toMillis ? cutoffTime.toMillis() : cutoffTime._seconds * 1000;
    
    // Query for both CREATE and UPDATE operations
    const snapshot = await db.collection("auditLog")
      .where("operation", "in", ["CREATE", "UPDATE"])
      .orderBy("timestamp", "desc")
      .limit(200)
      .get();
    
    const newTrips = [];
    const newSurveys = [];
    const seenTripIds = new Set();
    const seenSurveyIds = new Set();
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      const tripId = data.tripId || data.documentId;
      if (!tripId) return;
      
      const entryTime = data.timestamp?.toMillis ? data.timestamp.toMillis() : 
                       (data.timestamp?._seconds ? data.timestamp._seconds * 1000 : 0);
      
      if (entryTime > cutoffMillis) {
        // Check if it's a CREATE operation (new trip)
        if (data.operation === "CREATE" && !seenTripIds.has(tripId)) {
          seenTripIds.add(tripId);
          newTrips.push({ tripId, createdAt: data.timestamp, type: "trip" });
        }
        
        // Check if it's an UPDATE with survey data (survey completion)
        if (data.operation === "UPDATE" && !seenSurveyIds.has(tripId)) {
          // Check if survey-related fields changed
          const changedFields = data.changedFields || [];
          const isSurveyUpdate = changedFields.some(field => 
            field.includes("survey") || 
            field.includes("Post") || 
            field.includes("ageRange") ||
            field.includes("userComment")
          );
          
          if (isSurveyUpdate) {
            seenSurveyIds.add(tripId);
            newSurveys.push({ tripId, createdAt: data.timestamp, type: "survey" });
          }
        }
      }
    });
    
    // Combine and sort all entries
    const allEntries = [...newTrips, ...newSurveys];
    allEntries.sort((a, b) => {
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : a.createdAt?._seconds * 1000 || 0;
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : b.createdAt?._seconds * 1000 || 0;
      return timeB - timeA;
    });

    logger.info(`📊 Found ${newTrips.length} new trip(s) and ${newSurveys.length} survey(s) since last notification`);

    // Only send email if there are new entries
    if (allEntries.length > 0) {
      // Build email content with separate sections
      let emailBody = "New JetLagPro entries detected:\n\n";
      
      if (newTrips.length > 0) {
        emailBody += `NEW TRIPS (${newTrips.length}):\n`;
        emailBody += newTrips.map(trip => trip.tripId).join("\n");
        emailBody += "\n\n";
      }
      
      if (newSurveys.length > 0) {
        emailBody += `SURVEY COMPLETIONS (${newSurveys.length}):\n`;
        emailBody += newSurveys.map(survey => survey.tripId).join("\n");
        emailBody += "\n\n";
      }
      
      emailBody += `Total: ${newTrips.length} trip(s), ${newSurveys.length} survey(s)\n\n`;
      emailBody += "---\n";
      emailBody += "JetLagPro Research Analytics\n";
      emailBody += `Generated: ${new Date().toLocaleString("en-US", { timeZone: "America/New_York" })}`;

      const transporter = getEmailTransporter();
      if (!transporter) {
        throw new Error("Gmail transporter not initialized. Run: firebase functions:config:set gmail.password=YOUR_PASSWORD");
      }

      const functions = require("firebase-functions");
      const gmailUser = functions.config().gmail?.user || "sbschram@gmail.com";
      
      const subjectParts = [];
      if (newTrips.length > 0) subjectParts.push(`${newTrips.length} Trip${newTrips.length > 1 ? "s" : ""}`);
      if (newSurveys.length > 0) subjectParts.push(`${newSurveys.length} Survey${newSurveys.length > 1 ? "s" : ""}`);
      
      await transporter.sendMail({
        from: gmailUser,
        to: NOTIFICATION_EMAIL,
        subject: `JetLagPro: ${subjectParts.join(", ")} Added`,
        text: emailBody,
      });
      
      logger.info(`✅ Email sent successfully to ${NOTIFICATION_EMAIL} (${newTrips.length} trips, ${newSurveys.length} surveys)`);
    } else {
      logger.info("📭 No new entries - skipping email");
    }

    // Update last notification timestamp to now
    const currentTime = FieldValue.serverTimestamp();
    await settingsRef.set({
      lastNotificationTime: currentTime,
      lastCheckTime: currentTime,
      lastCheckCount: allEntries.length,
      lastTripCount: newTrips.length,
      lastSurveyCount: newSurveys.length,
    }, { merge: true });

    logger.info("✅ Hourly digest notification check completed");

    return { success: true, newTripsCount: newTrips.length, newSurveysCount: newSurveys.length };
  } catch (error) {
    logger.error("❌ Error in hourly digest notification:", error);
    
    // Try to send error notification email
    const transporter = getEmailTransporter();
    if (transporter) {
      try {
        const functions = require("firebase-functions");
        const gmailUser = functions.config().gmail?.user || "sbschram@gmail.com";
        await transporter.sendMail({
          from: gmailUser,
          to: NOTIFICATION_EMAIL,
          subject: "JetLagPro Notification Error",
          text: `An error occurred while checking for new Firebase entries:

${error.message}

${error.stack || ""}`,
        });
      } catch (emailError) {
        logger.error("❌ Failed to send error notification email:", emailError);
      }
    }
    
    throw error;
  }
});
