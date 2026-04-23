import {
  type CollectionReference,
  type DocumentData,
  type Firestore,
  type QueryDocumentSnapshot,
  type QuerySnapshot,
} from "firebase-admin/firestore";
import { ACTIVE_EVENT_ID } from "@/lib/config";
import { normalizeBibNumber } from "@/lib/bib";
import { parseMasterlistWorkbook } from "@/lib/masterlist-import";
import { getFirebaseAdminDb } from "@/lib/server/firebase-admin";
import { getEffectiveVideoPublishStatus } from "@/lib/video-state";
import type {
  EventBackupData,
  EventBackupRunnerRecord,
  FinisherReviewFeed,
  FinisherReviewRecord,
  FinisherReviewUpdatePayload,
  FinisherReviewUpdateResponse,
  ManualEntryFeed,
  ManualEntryPayload,
  ManualEntryRecord,
  ManualEntrySaveResponse,
  MasterlistImportResponse,
  PublicDisplayFeed,
  PublicDisplayFinisher,
  RaceActionPayload,
  RaceCounts,
  RaceResponse,
  RaceState,
  RaceStatus,
  ReviewStatus,
  VideoState,
  VideoStateUpdatePayload,
} from "@/lib/types";

interface RaceEventDoc {
  id: string;
  eventName: string;
  raceStatus: RaceStatus;
  raceStartTimeIso: string | null;
  raceEndTimeIso: string | null;
  updatedAt: string;
  nextCaptureSequence: number;
  runnerCount: number;
  finisherCount: number;
  verifiedFinisherCount: number;
}

interface RunnerDoc {
  id: string;
  bibNumber: string;
  runnerName: string;
  division: PublicDisplayFinisher["division"];
  createdAt: string;
}

interface FinisherDoc {
  id: string;
  bibNumber: string;
  runnerName: string | null;
  division: PublicDisplayFinisher["division"] | null;
  capturedAt: string;
  elapsedSeconds: number;
  source: FinisherReviewRecord["source"];
  reviewStatus: ReviewStatus;
  captureSequence: number;
  clientRequestId?: string | null;
}

interface VideoStateDoc {
  eventId: string;
  activeSourceSlot: VideoState["activeSourceSlot"];
  activeSourceLabel: string | null;
  publishStatus: VideoState["publishStatus"];
  updatedAt: string;
  lastHeartbeat: string | null;
}

interface ManualEntryRequestDoc {
  finisherId: string;
  createdAt: string;
}

const MANUAL_CAPTURE_FUTURE_TOLERANCE_MS = 15_000;
const MANUAL_CAPTURE_START_EARLY_TOLERANCE_MS = 1_000;
const MANUAL_CAPTURE_END_LATE_TOLERANCE_MS = 15_000;
const DUPLICATE_WARNING_WINDOW_SECONDS = 60;

function createDefaultRaceEvent(nowIso = new Date().toISOString()): RaceEventDoc {
  return {
    id: ACTIVE_EVENT_ID,
    eventName: "Community Run 2026",
    raceStatus: "idle",
    raceStartTimeIso: null,
    raceEndTimeIso: null,
    updatedAt: nowIso,
    nextCaptureSequence: 1,
    runnerCount: 0,
    finisherCount: 0,
    verifiedFinisherCount: 0,
  };
}

function createDefaultVideoState(nowIso = new Date().toISOString()): VideoStateDoc {
  return {
    eventId: ACTIVE_EVENT_ID,
    activeSourceSlot: null,
    activeSourceLabel: null,
    publishStatus: "idle",
    updatedAt: nowIso,
    lastHeartbeat: null,
  };
}

function formatElapsedTimeString(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor((totalSeconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");

  return `${hours}:${minutes}:${seconds}`;
}

function mapRaceState(doc: RaceEventDoc): RaceState {
  return {
    id: doc.id,
    eventName: doc.eventName,
    raceStatus: doc.raceStatus,
    raceStartTimeIso: doc.raceStartTimeIso,
    raceEndTimeIso: doc.raceEndTimeIso,
    updatedAt: doc.updatedAt,
  };
}

function mapVideoState(doc: VideoStateDoc): VideoState {
  return {
    eventId: doc.eventId,
    activeSourceSlot: doc.activeSourceSlot,
    activeSourceLabel: doc.activeSourceLabel,
    publishStatus: getEffectiveVideoPublishStatus(doc),
    updatedAt: doc.updatedAt,
    lastHeartbeat: doc.lastHeartbeat,
  };
}

function mapCounts(doc: RaceEventDoc): RaceCounts {
  return {
    totalRunners: doc.runnerCount,
    totalFinishers: doc.finisherCount,
    verifiedFinishers: doc.verifiedFinisherCount,
  };
}

function mapManualEntryRecord(doc: FinisherDoc): ManualEntryRecord {
  const warning =
    doc.reviewStatus === "duplicate"
      ? "duplicate"
      : doc.runnerName
        ? null
        : "unknown";

  return {
    id: doc.id,
    rowNumber: doc.captureSequence,
    bibNumber: doc.bibNumber,
    runnerName: doc.runnerName,
    division: doc.division,
    elapsedRaceTime: formatElapsedTimeString(doc.elapsedSeconds),
    clockFinishTime: doc.capturedAt,
    reviewStatus: doc.reviewStatus,
    warning,
  };
}

function mapFinisherReviewRecord(doc: FinisherDoc): FinisherReviewRecord {
  return {
    ...mapManualEntryRecord(doc),
    source: doc.source,
  };
}

function mapRunnerRecord(doc: RunnerDoc): EventBackupRunnerRecord {
  return {
    bibNumber: doc.bibNumber,
    runnerName: doc.runnerName,
    division: doc.division,
    createdAt: doc.createdAt,
  };
}

function mapPublicDisplayFinisher(doc: FinisherDoc, overallPlace: number): PublicDisplayFinisher {
  return {
    id: doc.id,
    rowNumber: doc.captureSequence,
    place: overallPlace,
    bibNumber: doc.bibNumber,
    runnerName: doc.runnerName ?? "NO NAME",
    division: doc.division ?? "male",
    finishTimestamp: doc.capturedAt,
    finishTimeFromStart: formatElapsedTimeString(doc.elapsedSeconds),
    source: doc.source,
    confidence: null,
    reviewStatus: doc.reviewStatus,
  };
}

function shouldIncludeInPublicDisplay(doc: Pick<FinisherDoc, "reviewStatus">) {
  return doc.reviewStatus !== "duplicate";
}

function getEventRef(db: Firestore) {
  return db.collection("race_events").doc(ACTIVE_EVENT_ID);
}

function getVideoStateRef(db: Firestore) {
  return db.collection("video_state").doc(ACTIVE_EVENT_ID);
}

function getRunnersCollection(db: Firestore) {
  return getEventRef(db).collection("runners");
}

function getFinishersCollection(db: Firestore) {
  return getEventRef(db).collection("finishers");
}

function getManualEntryRequestsCollection(db: Firestore) {
  return getEventRef(db).collection("manual_entry_requests");
}

function snapshotToDoc<T extends DocumentData>(
  snapshot: QueryDocumentSnapshot<DocumentData>,
): T {
  return snapshot.data() as T;
}

async function batchDeleteSnapshot(
  db: Firestore,
  snapshot: QuerySnapshot<DocumentData>,
) {
  if (snapshot.empty) {
    return;
  }

  let batch = db.batch();
  let operations = 0;

  for (const docSnapshot of snapshot.docs) {
    batch.delete(docSnapshot.ref);
    operations += 1;

    if (operations === 400) {
      await batch.commit();
      batch = db.batch();
      operations = 0;
    }
  }

  if (operations > 0) {
    await batch.commit();
  }
}

async function ensureRaceEvent(db: Firestore) {
  const ref = getEventRef(db);
  const snapshot = await ref.get();

  if (snapshot.exists) {
    return {
      ref,
      data: snapshot.data() as RaceEventDoc,
    };
  }

  const nextDoc = createDefaultRaceEvent();
  await ref.set(nextDoc);

  return {
    ref,
    data: nextDoc,
  };
}

async function ensureVideoState(db: Firestore) {
  const ref = getVideoStateRef(db);
  const snapshot = await ref.get();

  if (snapshot.exists) {
    return {
      ref,
      data: snapshot.data() as VideoStateDoc,
    };
  }

  const nextDoc = createDefaultVideoState();
  await ref.set(nextDoc);

  return {
    ref,
    data: nextDoc,
  };
}

async function ensureCoreState(db: Firestore) {
  const [race, video] = await Promise.all([ensureRaceEvent(db), ensureVideoState(db)]);

  return {
    raceRef: race.ref,
    race: race.data,
    videoRef: video.ref,
    video: video.data,
  };
}

async function listFinishers(db: Firestore, descending = false, limit?: number) {
  let ref = getFinishersCollection(db).orderBy("captureSequence", descending ? "desc" : "asc");

  if (typeof limit === "number") {
    ref = ref.limit(limit);
  }

  const snapshot = await ref.get();
  return snapshot.docs.map((docSnapshot) => snapshotToDoc<FinisherDoc>(docSnapshot));
}

async function listRunners(db: Firestore) {
  const snapshot = await getRunnersCollection(db).orderBy("bibNumber", "asc").get();
  return snapshot.docs.map((docSnapshot) => snapshotToDoc<RunnerDoc>(docSnapshot));
}

async function findDuplicateFinisher(
  finishersCollection: CollectionReference<DocumentData>,
  normalizedBib: string,
  excludeId?: string,
) {
  const duplicateSnapshot = await finishersCollection
    .where("bibNumber", "==", normalizedBib)
    .get();

  return duplicateSnapshot.docs.some((docSnapshot) => docSnapshot.id !== excludeId);
}

function buildDuplicateReason(
  duplicateMatches: FinisherDoc[],
  capturedAt: Date,
  normalizedBib: string,
) {
  if (duplicateMatches.length === 0) {
    return null;
  }

  const latestDuplicate = [...duplicateMatches]
    .sort((left, right) => Date.parse(right.capturedAt) - Date.parse(left.capturedAt))
    .at(0);

  if (latestDuplicate) {
    const latestCapturedAt = Date.parse(latestDuplicate.capturedAt);

    if (!Number.isNaN(latestCapturedAt)) {
      const differenceSeconds = Math.abs(
        Math.round((capturedAt.getTime() - latestCapturedAt) / 1000),
      );

      if (differenceSeconds <= DUPLICATE_WARNING_WINDOW_SECONDS) {
        return `Bib ${normalizedBib} was already logged ${differenceSeconds} second(s) away from this entry.`;
      }
    }
  }

  return `Bib ${normalizedBib} already exists in the results feed.`;
}

function getReplayDuplicateReason(entry: FinisherDoc) {
  if (entry.reviewStatus !== "duplicate") {
    return null;
  }

  return `Bib ${entry.bibNumber} already exists in the results feed.`;
}

function resolveCapturedAtIso(
  capturedAtIso: string,
  raceStartTimeIso: string,
  raceEndTimeIso: string | null,
) {
  const capturedAt = new Date(capturedAtIso);
  const raceStart = new Date(raceStartTimeIso);
  const receivedAt = new Date();

  if (Number.isNaN(capturedAt.getTime()) || Number.isNaN(raceStart.getTime())) {
    throw new Error("Invalid capture time.");
  }

  if (capturedAt.getTime() < raceStart.getTime() - MANUAL_CAPTURE_START_EARLY_TOLERANCE_MS) {
    throw new Error("Capture time cannot be earlier than the official race start.");
  }

  let effectiveCapturedAt = capturedAt;

  if (capturedAt.getTime() > receivedAt.getTime() + MANUAL_CAPTURE_FUTURE_TOLERANCE_MS) {
    effectiveCapturedAt = receivedAt;
  }

  if (raceEndTimeIso) {
    const raceEnd = new Date(raceEndTimeIso);

    if (!Number.isNaN(raceEnd.getTime())) {
      if (capturedAt.getTime() > raceEnd.getTime() + MANUAL_CAPTURE_END_LATE_TOLERANCE_MS) {
        throw new Error("Captured finish time is after the official race end.");
      }

      if (effectiveCapturedAt.getTime() > raceEnd.getTime()) {
        effectiveCapturedAt = raceEnd;
      }
    }
  }

  return effectiveCapturedAt.toISOString();
}

async function getRunner(
  runnersCollection: CollectionReference<DocumentData>,
  normalizedBib: string,
) {
  const snapshot = await runnersCollection.doc(normalizedBib).get();

  if (!snapshot.exists) {
    return null;
  }

  return snapshot.data() as RunnerDoc;
}

async function syncRaceCounts(db: Firestore) {
  const { ref, data } = await ensureRaceEvent(db);
  const finishers = await listFinishers(db, false);
  const nextRace: RaceEventDoc = {
    ...data,
    finisherCount: finishers.length,
    verifiedFinisherCount: finishers.filter((doc) => doc.reviewStatus === "verified").length,
    updatedAt: new Date().toISOString(),
  };

  await ref.set(nextRace);

  return nextRace;
}

export async function getRaceResponse(): Promise<RaceResponse> {
  const db = getFirebaseAdminDb();
  const { race, video } = await ensureCoreState(db);

  return {
    race: mapRaceState(race),
    video: mapVideoState(video),
    counts: mapCounts(race),
    updatedAt: new Date().toISOString(),
  };
}

export async function updateRaceState(payload: RaceActionPayload): Promise<RaceResponse> {
  const db = getFirebaseAdminDb();
  const { raceRef, race, videoRef } = await ensureCoreState(db);
  const nowIso = new Date().toISOString();
  const eventName = payload.eventName?.trim();

  if (payload.action === "start" && race.raceStatus !== "idle") {
    throw new Error("Race can only be started while it is idle.");
  }

  if (payload.action === "end" && race.raceStatus !== "running") {
    throw new Error("Race can only be ended while it is running.");
  }

  if (payload.action === "reset" && race.raceStatus === "running") {
    throw new Error("End the race before resetting finishers.");
  }

  if (payload.action === "reset") {
    await batchDeleteSnapshot(db, await getFinishersCollection(db).get());
    await batchDeleteSnapshot(db, await getManualEntryRequestsCollection(db).get());
    await videoRef.set(createDefaultVideoState(nowIso));
  }

  const nextRace: RaceEventDoc = {
    ...race,
    eventName: eventName || race.eventName,
    updatedAt: nowIso,
  };

  if (payload.action === "start") {
    nextRace.raceStatus = "running";
    nextRace.raceStartTimeIso = nowIso;
    nextRace.raceEndTimeIso = null;
  } else if (payload.action === "end") {
    nextRace.raceStatus = "ended";
    nextRace.raceEndTimeIso = nowIso;
  } else if (payload.action === "reset") {
    nextRace.raceStatus = "idle";
    nextRace.raceStartTimeIso = null;
    nextRace.raceEndTimeIso = null;
    nextRace.nextCaptureSequence = 1;
    nextRace.finisherCount = 0;
    nextRace.verifiedFinisherCount = 0;
  }

  await raceRef.set(nextRace);

  return {
    race: mapRaceState(nextRace),
    video:
      payload.action === "reset"
        ? mapVideoState(createDefaultVideoState(nowIso))
        : mapVideoState((await ensureVideoState(db)).data),
    counts: mapCounts(nextRace),
    updatedAt: nowIso,
  };
}

export async function getManualEntryFeed(limit = 8): Promise<ManualEntryFeed> {
  const db = getFirebaseAdminDb();
  const { race } = await ensureCoreState(db);
  const entries = (await listFinishers(db, true, limit)).map((doc) => mapManualEntryRecord(doc));

  return {
    entries,
    race: mapRaceState(race),
    updatedAt: new Date().toISOString(),
    masterlistPath: "firestore.runners",
    resultsPath: "firestore.finishers",
  };
}

export async function getFinisherReviewFeed(): Promise<FinisherReviewFeed> {
  const db = getFirebaseAdminDb();
  const { race } = await ensureCoreState(db);
  const entries = (await listFinishers(db, true)).map((doc) => mapFinisherReviewRecord(doc));

  return {
    entries,
    race: mapRaceState(race),
    counts: mapCounts(race),
    updatedAt: new Date().toISOString(),
  };
}

export async function appendManualEntry(
  payload: ManualEntryPayload,
): Promise<ManualEntrySaveResponse> {
  const db = getFirebaseAdminDb();
  const { raceRef } = await ensureCoreState(db);
  const runnersCollection = getRunnersCollection(db);
  const finishersCollection = getFinishersCollection(db);
  const manualRequestsCollection = getManualEntryRequestsCollection(db);
  const normalizedBib = normalizeBibNumber(payload.bibNumber);
  const requestId = payload.requestId?.trim() || null;

  if (!normalizedBib) {
    throw new Error("Bib number is required.");
  }

  let savedEntry: FinisherDoc | null = null;
  let duplicateDetected = false;
  let duplicateReason: string | null = null;
  let unknownBib = false;

  await db.runTransaction(async (transaction) => {
    const raceSnapshot = await transaction.get(raceRef);

    if (!raceSnapshot.exists) {
      throw new Error("Race event is missing.");
    }

    const currentRace = raceSnapshot.data() as RaceEventDoc;

    if (currentRace.raceStatus === "idle" || !currentRace.raceStartTimeIso) {
      throw new Error("Race has not been started.");
    }

    const requestRef = requestId ? manualRequestsCollection.doc(requestId) : null;

    if (requestRef) {
      const requestSnapshot = await transaction.get(requestRef);

      if (requestSnapshot.exists) {
        const requestDoc = requestSnapshot.data() as ManualEntryRequestDoc;
        const existingFinisherSnapshot = await transaction.get(
          finishersCollection.doc(requestDoc.finisherId),
        );

        if (existingFinisherSnapshot.exists) {
          const existingEntry = existingFinisherSnapshot.data() as FinisherDoc;
          savedEntry = existingEntry;
          duplicateDetected = existingEntry.reviewStatus === "duplicate";
          duplicateReason = getReplayDuplicateReason(existingEntry);
          unknownBib = !existingEntry.runnerName;
          return;
        }
      }
    }

    const effectiveCapturedAtIso = resolveCapturedAtIso(
      payload.capturedAtIso,
      currentRace.raceStartTimeIso,
      currentRace.raceStatus === "ended" ? currentRace.raceEndTimeIso : null,
    );
    const effectiveCapturedAt = new Date(effectiveCapturedAtIso);
    const raceStart = new Date(currentRace.raceStartTimeIso);
    const finisherId = crypto.randomUUID();
    const finisherRef = finishersCollection.doc(finisherId);
    const runnerSnapshot = await transaction.get(runnersCollection.doc(normalizedBib));
    const duplicateSnapshot = await transaction.get(
      finishersCollection.where("bibNumber", "==", normalizedBib),
    );
    const runner = runnerSnapshot.exists ? (runnerSnapshot.data() as RunnerDoc) : null;
    const duplicateMatches = duplicateSnapshot.docs.map((docSnapshot) =>
      snapshotToDoc<FinisherDoc>(docSnapshot),
    );

    duplicateDetected = duplicateMatches.length > 0;
    duplicateReason = buildDuplicateReason(duplicateMatches, effectiveCapturedAt, normalizedBib);
    unknownBib = !runner;

    const reviewStatus = duplicateDetected
      ? "duplicate"
      : unknownBib || payload.forceReview
        ? "needs review"
        : "verified";
    const elapsedSeconds = Math.max(
      0,
      Math.floor((effectiveCapturedAt.getTime() - raceStart.getTime()) / 1000),
    );
    const captureSequence = currentRace.nextCaptureSequence;
    const nextRace: RaceEventDoc = {
      ...currentRace,
      nextCaptureSequence: captureSequence + 1,
      finisherCount: currentRace.finisherCount + 1,
      verifiedFinisherCount:
        currentRace.verifiedFinisherCount + (reviewStatus === "verified" ? 1 : 0),
      updatedAt: new Date().toISOString(),
    };

    const finisherDoc: FinisherDoc = {
      id: finisherId,
      bibNumber: normalizedBib,
      runnerName: runner?.runnerName ?? null,
      division: runner?.division ?? null,
      capturedAt: effectiveCapturedAtIso,
      elapsedSeconds,
      source: "manual",
      reviewStatus,
      captureSequence,
      clientRequestId: requestId,
    };

    transaction.set(finisherRef, finisherDoc);

    if (requestRef) {
      transaction.set(requestRef, {
        finisherId,
        createdAt: new Date().toISOString(),
      } satisfies ManualEntryRequestDoc);
    }

    transaction.set(raceRef, nextRace);
    savedEntry = finisherDoc;
  });

  if (!savedEntry) {
    throw new Error("Unable to save manual entry.");
  }

  return {
    entry: mapManualEntryRecord(savedEntry),
    duplicateDetected,
    duplicateReason,
    unknownBib,
    updatedAt: new Date().toISOString(),
    resultsPath: "firestore.finishers",
  };
}

export async function updateFinisherReview(
  finisherId: string,
  payload: FinisherReviewUpdatePayload,
): Promise<FinisherReviewUpdateResponse> {
  const db = getFirebaseAdminDb();
  const runnersCollection = getRunnersCollection(db);
  const finishersCollection = getFinishersCollection(db);
  const finisherRef = finishersCollection.doc(finisherId);
  const finisherSnapshot = await finisherRef.get();

  if (!finisherSnapshot.exists) {
    throw new Error("Finisher entry was not found.");
  }

  const currentEntry = finisherSnapshot.data() as FinisherDoc;
  const normalizedBib = normalizeBibNumber(payload.bibNumber);

  if (!normalizedBib) {
    throw new Error("Bib number is required.");
  }

  const trimmedRunnerName = payload.runnerName.trim();
  const runner = await getRunner(runnersCollection, normalizedBib);
  const duplicateDetected = await findDuplicateFinisher(
    finishersCollection,
    normalizedBib,
    finisherId,
  );

  const nextRunnerName = trimmedRunnerName
    ? trimmedRunnerName
    : (runner?.runnerName ?? null);
  const nextDivision = payload.division ?? runner?.division ?? null;
  let nextReviewStatus = payload.reviewStatus;

  if (duplicateDetected && nextReviewStatus === "verified") {
    nextReviewStatus = "duplicate";
  }

  if (nextReviewStatus === "verified" && (!nextRunnerName || !nextDivision)) {
    throw new Error("Verified finishers need both runner name and division.");
  }

  const nextEntry: FinisherDoc = {
    ...currentEntry,
    bibNumber: normalizedBib,
    runnerName: nextRunnerName,
    division: nextDivision,
    reviewStatus: nextReviewStatus,
  };

  await finisherRef.set(nextEntry);
  const nextRace = await syncRaceCounts(db);

  return {
    entry: mapFinisherReviewRecord(nextEntry),
    counts: mapCounts(nextRace),
    updatedAt: new Date().toISOString(),
  };
}

export async function deleteFinisherReview(finisherId: string) {
  const db = getFirebaseAdminDb();
  const finisherRef = getFinishersCollection(db).doc(finisherId);
  const finisherSnapshot = await finisherRef.get();

  if (!finisherSnapshot.exists) {
    throw new Error("Finisher entry was not found.");
  }

  await finisherRef.delete();
  const nextRace = await syncRaceCounts(db);

  return {
    counts: mapCounts(nextRace),
    updatedAt: new Date().toISOString(),
  };
}

export async function getPublicDisplayFeed(): Promise<PublicDisplayFeed> {
  const db = getFirebaseAdminDb();
  const { race, video } = await ensureCoreState(db);
  const finishers = (await listFinishers(db, false))
    .filter((doc) => shouldIncludeInPublicDisplay(doc))
    .map((doc, index) => mapPublicDisplayFinisher(doc, index + 1));

  return {
    finishers,
    race: mapRaceState(race),
    video: mapVideoState(video),
    updatedAt: new Date().toISOString(),
    masterlistPath: "firestore.runners",
    resultsPath: "firestore.finishers",
  };
}

export async function getEventBackupData(): Promise<EventBackupData> {
  const db = getFirebaseAdminDb();
  const { race, video } = await ensureCoreState(db);
  const [finishers, runners] = await Promise.all([listFinishers(db, false), listRunners(db)]);

  return {
    exportedAt: new Date().toISOString(),
    race: mapRaceState(race),
    counts: mapCounts(race),
    video: mapVideoState(video),
    runners: runners.map((doc) => mapRunnerRecord(doc)),
    finishers: finishers.map((doc) => mapFinisherReviewRecord(doc)),
  };
}

export async function getVideoState(): Promise<VideoState> {
  const db = getFirebaseAdminDb();
  const { video } = await ensureCoreState(db);
  return mapVideoState(video);
}

export async function updateVideoState(payload: VideoStateUpdatePayload): Promise<VideoState> {
  const db = getFirebaseAdminDb();
  const { videoRef, video } = await ensureCoreState(db);
  const nowIso = new Date().toISOString();
  const nextVideo: VideoStateDoc = {
    ...video,
    updatedAt: nowIso,
    activeSourceSlot:
      payload.activeSourceSlot !== undefined ? payload.activeSourceSlot : video.activeSourceSlot,
    activeSourceLabel:
      payload.activeSourceLabel !== undefined
        ? payload.activeSourceLabel
        : video.activeSourceLabel,
    publishStatus:
      payload.publishStatus !== undefined ? payload.publishStatus : video.publishStatus,
    lastHeartbeat:
      payload.heartbeat === true ? nowIso : payload.heartbeat === false ? null : video.lastHeartbeat,
  };

  await videoRef.set(nextVideo);
  return mapVideoState(nextVideo);
}

export async function importMasterlist(buffer: ArrayBuffer): Promise<MasterlistImportResponse> {
  const db = getFirebaseAdminDb();
  const { raceRef, race } = await ensureCoreState(db);

  if (race.raceStatus !== "idle") {
    throw new Error("Masterlist import is only allowed while the race is idle.");
  }

  if (race.finisherCount > 0) {
    throw new Error("Reset the race before replacing the masterlist.");
  }

  const { entries, skippedCount } = parseMasterlistWorkbook(buffer);

  if (entries.length === 0) {
    throw new Error("No valid runner rows were found in the uploaded workbook.");
  }

  const runnersCollection = getRunnersCollection(db);
  await batchDeleteSnapshot(db, await runnersCollection.get());

  let batch = db.batch();
  let operations = 0;

  for (const entry of entries) {
    const runnerRef = runnersCollection.doc(entry.bibNumber);
    const runnerDoc: RunnerDoc = {
      id: entry.bibNumber,
      bibNumber: entry.bibNumber,
      runnerName: entry.runnerName,
      division: entry.division,
      createdAt: new Date().toISOString(),
    };

    batch.set(runnerRef, runnerDoc);
    operations += 1;

    if (operations === 400) {
      await batch.commit();
      batch = db.batch();
      operations = 0;
    }
  }

  if (operations > 0) {
    await batch.commit();
  }

  await raceRef.set(
    {
      ...race,
      runnerCount: entries.length,
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  );

  return {
    importedCount: entries.length,
    skippedCount,
    updatedAt: new Date().toISOString(),
  };
}
