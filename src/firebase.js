import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyA6b_0vF8UrkQHl-uLwgeg5DSVPS11dFcs",
  authDomain: "whatsappclone-f05a4.firebaseapp.com",
  projectId: "whatsappclone-f05a4",
  storageBucket: "whatsappclone-f05a4.firebasestorage.app",
  messagingSenderId: "645862276411",
  appId: "1:645862276411:web:23bf06b8b2f186f25b4b1e"
};
export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);