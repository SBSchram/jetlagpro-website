// ============================================================
// PHASE 1: WRITE SOURCE AUTHENTICATION
// iOS App Code Template - Add to Firebase Write Operations
// ============================================================

import FirebaseFirestore

// STEP 1: Add this function to your Firebase service/manager class
// ============================================================

func createWriteMetadata() -> [String: Any] {
    return [
        "source": "ios_app",
        "sourceVersion": Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "unknown",
        "timestamp": FieldValue.serverTimestamp(),
        "deviceId": UIDevice.current.identifierForVendor?.uuidString ?? "unknown",
        "platform": "iOS \(UIDevice.current.systemVersion)",
        "appBuild": Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "unknown"
    ]
}

// STEP 2: Update your trip completion save function
// ============================================================

// BEFORE (current code):
func saveTripCompletion(tripData: [String: Any], tripId: String) async throws {
    let db = Firestore.firestore()
    try await db.collection("tripCompletions").document(tripId).setData(tripData)
}

// AFTER (with write metadata):
func saveTripCompletion(tripData: [String: Any], tripId: String) async throws {
    let db = Firestore.firestore()
    
    // Add write metadata for data integrity
    var updatedTripData = tripData
    updatedTripData["_writeMetadata"] = createWriteMetadata()
    
    try await db.collection("tripCompletions").document(tripId).setData(updatedTripData)
}

// STEP 3: Update your trip update function (for point completions)
// ============================================================

// BEFORE (current code):
func updateTripCompletion(tripId: String, updates: [String: Any]) async throws {
    let db = Firestore.firestore()
    try await db.collection("tripCompletions").document(tripId).updateData(updates)
}

// AFTER (with write metadata):
func updateTripCompletion(tripId: String, updates: [String: Any]) async throws {
    let db = Firestore.firestore()
    
    // Add write metadata to updates
    var updatedData = updates
    updatedData["_writeMetadata"] = createWriteMetadata()
    
    try await db.collection("tripCompletions").document(tripId).updateData(updatedData)
}

// ============================================================
// TESTING
// ============================================================

// After implementing:
// 1. Complete a trip in the app
// 2. Check Firebase Console -> Firestore -> tripCompletions
// 3. Open the trip document
// 4. Verify "_writeMetadata" field exists with:
//    - source: "ios_app"
//    - timestamp: (current time)
//    - deviceId: (UUID)
//    - platform: "iOS 17.x" or similar

// Expected metadata structure:
// {
//   "_writeMetadata": {
//     "source": "ios_app",
//     "sourceVersion": "1.0.0",
//     "timestamp": Timestamp(seconds: 1699292400, nanoseconds: 0),
//     "deviceId": "A1B2C3D4-E5F6-7890-ABCD-EF1234567890",
//     "platform": "iOS 17.0",
//     "appBuild": "42"
//   }
// }

