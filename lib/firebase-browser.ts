"use client";

import { initializeApp, type FirebaseApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { isFirebaseBrowserConfigured } from "@/lib/config";

let browserApp: FirebaseApp | null = null;

function getFirebaseConfig() {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
  };
}

export function getFirebaseBrowserApp() {
  if (!isFirebaseBrowserConfigured()) {
    return null;
  }

  if (!browserApp) {
    browserApp = getApps().length > 0 ? getApp() : initializeApp(getFirebaseConfig());
  }

  return browserApp;
}

export function getFirebaseBrowserDb() {
  const app = getFirebaseBrowserApp();

  if (!app) {
    return null;
  }

  return getFirestore(app);
}
