// Use the same Firebase Web SDK as the website
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

// Same config as your website
const firebaseConfig = {
  apiKey: "AIzaSyBcck2Ca7xBjlZcCwTcQBNQUueFsO0wyBA",
  authDomain: "jetlagpro-research.firebaseapp.com",
  projectId: "jetlagpro-research",
  storageBucket: "jetlagpro-research.firebasestorage.app",
  messagingSenderId: "202766013439",
  appId: "1:202766013439:web:c835e22cf3a12332920dca",
  measurementId: "G-8JV71DX3W3"
};

async function exportWithWebSDK() {
  try {
    console.log('📊 Using Firebase Web SDK to fetch data...');
    
    // Initialize Firebase (same as website)
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    // Fetch all documents
    const querySnapshot = await getDocs(collection(db, 'tripCompletions'));
    
    if (querySnapshot.empty) {
      console.log('No trip completions found');
      return;
    }

    console.log(`Found ${querySnapshot.docs.length} trip completions`);

    // Convert to regular objects
    const documents = querySnapshot.docs.map(doc => ({
      tripId: doc.id,
      ...doc.data()
    }));

    // Save raw data
    const fs = require('fs');
    fs.writeFileSync('firebase_web_data.json', JSON.stringify(documents, null, 2));
    console.log('✅ Data saved to firebase_web_data.json');

    // Create CSV
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

      fs.writeFileSync('tripCompletions_web.csv', csvContent);
      console.log('✅ CSV created: tripCompletions_web.csv');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

exportWithWebSDK();
