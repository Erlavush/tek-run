import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getRequiredServerEnv, isFirebaseServerConfigured } from "@/lib/config";

export function getFirebaseAdminDb() {
  if (!isFirebaseServerConfigured()) {
    throw new Error(
      "Firebase is not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.",
    );
  }

  if (getApps().length === 0) {
    initializeApp({
      credential: cert({
        projectId: getRequiredServerEnv("FIREBASE_PROJECT_ID"),
        clientEmail: getRequiredServerEnv("FIREBASE_CLIENT_EMAIL"),
        privateKey: getRequiredServerEnv("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n"),
      }),
    });
  }

  return getFirestore();
}
