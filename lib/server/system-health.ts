import { RoomServiceClient } from "livekit-server-sdk";
import {
  ACTIVE_EVENT_ID,
  ACTIVE_LIVEKIT_ROOM,
  getRequiredServerEnv,
  isFirebaseBrowserConfigured,
  isFirebaseServerConfigured,
  isLiveKitServerConfigured,
} from "@/lib/config";
import { createVideoAccessToken } from "@/lib/server/livekit";
import { getEventBackupData } from "@/lib/server/race-store";
import { getFirebaseAdminDb } from "@/lib/server/firebase-admin";
import type { HealthCheckStatus, SystemHealthCheck, SystemHealthResponse } from "@/lib/types";
import { isVideoHeartbeatExpired } from "@/lib/video-state";

function buildCheck(
  id: string,
  label: string,
  status: HealthCheckStatus,
  detail: string,
): SystemHealthCheck {
  return {
    id,
    label,
    status,
    detail,
  };
}

function getHeartbeatAgeSeconds(lastHeartbeat: string | null) {
  if (!lastHeartbeat) {
    return null;
  }

  const parsed = Date.parse(lastHeartbeat);

  if (Number.isNaN(parsed)) {
    return null;
  }

  return Math.max(0, Math.round((Date.now() - parsed) / 1000));
}

export async function getSystemHealth(): Promise<SystemHealthResponse> {
  const checkedAt = new Date().toISOString();
  const checks: SystemHealthCheck[] = [
    buildCheck("api-runtime", "API Runtime", "pass", "Operator API route is responding."),
  ];

  let latestFinisherAt: string | null = null;
  let livekitRoomActive = false;
  let livekitParticipantCount = 0;
  let videoHeartbeatAgeSeconds: number | null = null;

  checks.push(
    buildCheck(
      "firebase-browser-env",
      "Browser Firebase Config",
      isFirebaseBrowserConfigured() ? "pass" : "fail",
      isFirebaseBrowserConfigured()
        ? "Public Firebase environment variables are present."
        : "Missing one or more NEXT_PUBLIC_FIREBASE_* environment variables.",
    ),
  );

  if (!isFirebaseServerConfigured()) {
    checks.push(
      buildCheck(
        "firebase-server-env",
        "Server Firebase Config",
        "fail",
        "Missing FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, or FIREBASE_PRIVATE_KEY.",
      ),
    );
  } else {
    checks.push(
      buildCheck(
        "firebase-server-env",
        "Server Firebase Config",
        "pass",
        "Firebase Admin credentials are present.",
      ),
    );

    try {
      const backup = await getEventBackupData();
      latestFinisherAt = backup.finishers.at(-1)?.clockFinishTime ?? null;
      videoHeartbeatAgeSeconds = getHeartbeatAgeSeconds(backup.video.lastHeartbeat);

      checks.push(
        buildCheck(
          "firestore-read",
          "Firestore Read",
          "pass",
          `Loaded race state, ${backup.runners.length} runner(s), and ${backup.finishers.length} finisher(s).`,
        ),
      );

      const db = getFirebaseAdminDb();
      const writeProbeRef = db.collection("system_health").doc(ACTIVE_EVENT_ID);
      const nonce = crypto.randomUUID();

      await writeProbeRef.set(
        {
          lastCheckedAt: checkedAt,
          nonce,
        },
        { merge: true },
      );

      const writeProbeSnapshot = await writeProbeRef.get();
      const writeVerified = writeProbeSnapshot.exists && writeProbeSnapshot.get("nonce") === nonce;

      checks.push(
        buildCheck(
          "firestore-write",
          "Firestore Write",
          writeVerified ? "pass" : "fail",
          writeVerified
            ? "Server write probe succeeded."
            : "Server write probe did not round-trip correctly.",
        ),
      );

      if (backup.video.publishStatus === "idle") {
        checks.push(
          buildCheck(
            "video-heartbeat",
            "Video Heartbeat",
            "warn",
            "No active operator video heartbeat yet.",
          ),
        );
      } else if (backup.video.publishStatus === "error") {
        checks.push(
          buildCheck(
            "video-heartbeat",
            "Video Heartbeat",
            "fail",
            "Operator video state is currently degraded or stale.",
          ),
        );
      } else if (isVideoHeartbeatExpired(backup.video)) {
        checks.push(
          buildCheck(
            "video-heartbeat",
            "Video Heartbeat",
            "fail",
            "Latest operator video heartbeat is stale.",
          ),
        );
      } else {
        checks.push(
          buildCheck(
            "video-heartbeat",
            "Video Heartbeat",
            "pass",
            `Heartbeat is fresh (${videoHeartbeatAgeSeconds ?? 0}s old).`,
          ),
        );
      }
    } catch (error) {
      checks.push(
        buildCheck(
          "firestore-read",
          "Firestore Read",
          "fail",
          error instanceof Error ? error.message : "Unable to read Firestore state.",
        ),
      );
      checks.push(
        buildCheck(
          "firestore-write",
          "Firestore Write",
          "fail",
          "Write probe was skipped because Firestore state could not be loaded.",
        ),
      );
    }
  }

  if (!isLiveKitServerConfigured()) {
    checks.push(
      buildCheck(
        "livekit-env",
        "LiveKit Config",
        "fail",
        "Missing LIVEKIT_URL, LIVEKIT_API_KEY, or LIVEKIT_API_SECRET.",
      ),
    );
    checks.push(
      buildCheck(
        "livekit-token",
        "LiveKit Token",
        "fail",
        "Token check was skipped because LiveKit config is incomplete.",
      ),
    );
    checks.push(
      buildCheck(
        "livekit-room",
        "LiveKit Room",
        "fail",
        "Room inspection was skipped because LiveKit config is incomplete.",
      ),
    );
  } else {
    checks.push(
      buildCheck(
        "livekit-env",
        "LiveKit Config",
        "pass",
        "LiveKit credentials are present.",
      ),
    );

    try {
      await createVideoAccessToken({ role: "display" });
      checks.push(
        buildCheck(
          "livekit-token",
          "LiveKit Token",
          "pass",
          "Display token issuance succeeded.",
        ),
      );
    } catch (error) {
      checks.push(
        buildCheck(
          "livekit-token",
          "LiveKit Token",
          "fail",
          error instanceof Error ? error.message : "Unable to create a LiveKit token.",
        ),
      );
    }

    try {
      const roomService = new RoomServiceClient(
        getRequiredServerEnv("LIVEKIT_URL"),
        getRequiredServerEnv("LIVEKIT_API_KEY"),
        getRequiredServerEnv("LIVEKIT_API_SECRET"),
      );
      const rooms = await roomService.listRooms([ACTIVE_LIVEKIT_ROOM]);

      if (rooms.length > 0) {
        const participants = await roomService.listParticipants(ACTIVE_LIVEKIT_ROOM);
        const publisherParticipants = participants.filter(
          (participant) => participant.isPublisher || participant.tracks.length > 0,
        );

        livekitRoomActive = publisherParticipants.length > 0;
        livekitParticipantCount = participants.length;

        checks.push(
          buildCheck(
            "livekit-room",
            "LiveKit Room",
            publisherParticipants.length > 0 ? "pass" : "warn",
            publisherParticipants.length > 0
              ? `${publisherParticipants.length} publisher(s), ${participants.length} total participant(s) connected to ${ACTIVE_LIVEKIT_ROOM}.`
              : `${participants.length} viewer(s) connected, but no operator publisher track is live in ${ACTIVE_LIVEKIT_ROOM}.`,
          ),
        );
      } else {
        checks.push(
          buildCheck(
            "livekit-room",
            "LiveKit Room",
            "warn",
            `No active ${ACTIVE_LIVEKIT_ROOM} room right now.`,
          ),
        );
      }
    } catch (error) {
      checks.push(
        buildCheck(
          "livekit-room",
          "LiveKit Room",
          "fail",
          error instanceof Error ? error.message : "Unable to inspect the LiveKit room.",
        ),
      );
    }
  }

  return {
    checkedAt,
    serverTimeIso: checkedAt,
    checks,
    latestFinisherAt,
    livekitRoomName: ACTIVE_LIVEKIT_ROOM,
    livekitRoomActive,
    livekitParticipantCount,
    videoHeartbeatAgeSeconds,
  };
}
