
import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
// Import other Firebase services as needed, e.g.:
// import { getAuth, type Auth } from "firebase/auth";
// import { getStorage, type Storage } from "firebase/storage";

// Your web app's Firebase configuration
// IMPORTANT: For security and best practices, it's highly recommended to store these
// configuration values in environment variables (e.g., .env.local) rather than hardcoding them.
// Access them via process.env.NEXT_PUBLIC_FIREBASE_API_KEY, etc.
// See: https://firebase.google.com/docs/web/learn-more#config-object
const firebaseConfig = {
  apiKey: "AIzaSyA-yKxeBdPZiX5ct2-MAgVNtdDUJRHDNX0",
  authDomain: "visionary-ai-4ajp8.firebaseapp.com",
  projectId: "visionary-ai-4ajp8",
  storageBucket: "visionary-ai-4ajp8.firebasestorage.app", // Ensure this is the correct storage bucket for your project
  messagingSenderId: "995262590611",
  appId: "1:995262590611:web:9ce4d5f3bcb8fe8a796766"
};

// Initialize Firebase
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp(); // If already initialized, use that instance
}

// Initialize Firestore database
const db: Firestore = getFirestore(app);

// Example for initializing other services (uncomment if needed):
// import { getAuth, type Auth } from "firebase/auth";
// const auth: Auth = getAuth(app);
//
// import { getStorage, type Storage } from "firebase/storage";
// const storage: Storage = getStorage(app);

// Export the Firebase app instance and initialized services
export { app, db };
// If you initialized other services, export them as well:
// export { app, db, auth, storage };
