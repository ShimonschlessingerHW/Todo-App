// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCBm86OE24Uh7WaVmk3WbjEjPVllouSz1w",
  authDomain: "todo-app-dec11.firebaseapp.com",
  projectId: "todo-app-dec11",
  storageBucket: "todo-app-dec11.firebasestorage.app",
  messagingSenderId: "822614119688",
  appId: "1:822614119688:web:02e9e79d153eaf814988bd"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

export default app;

