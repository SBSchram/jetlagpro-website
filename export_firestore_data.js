const admin = require('firebase-admin');
const fs = require('fs');

// Initialize Firebase Admin SDK
const serviceAccount = require('./firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'jetlagpro-research'
});

const db = admin.firestore();

async function exportTripCompletions() {
  try {
    console.log('📊 Exporting tripCompletions data...');
    
    const snapshot = await db.collection('tripCompletions').get();
    
    if (snapshot.empty) {
      console.log('No trip completions found.');
      return;
    }

    const documents = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      documents.push({
        tripId: doc.id,
        ...data
      });
    });

    console.log(`Found ${documents.length} trip completions`);

    // Convert to CSV
    if (documents.length > 0) {
      const headers = Object.keys(documents[0]);
      const csvContent = [
        headers.join(','),
        ...documents.map(doc => 
          headers.map(header => {
            const value = doc[header];
            if (value === null || value === undefined) return '';
            if (typeof value === 'object') return JSON.stringify(value);
            return String(value).replace(/"/g, '""');
          }).join(',')
        )
      ].join('\n');

      fs.writeFileSync('tripCompletions.csv', csvContent);
      console.log('✅ Data exported to tripCompletions.csv');
      console.log('📋 You can now open this file in Excel or Google Sheets');
    }

  } catch (error) {
    console.error('❌ Error exporting data:', error);
  }
}

exportTripCompletions();
