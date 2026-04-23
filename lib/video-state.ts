import type { VideoPublishStatus, VideoState } from "@/lib/types";

export const VIDEO_HEARTBEAT_STALE_MS = 45_000;

export function isVideoHeartbeatExpired(
  video: Pick<VideoState, "publishStatus" | "lastHeartbeat">,
  now = Date.now(),
) {
  if (video.publishStatus === "idle" || video.publishStatus === "error") {
    return false;
  }

  if (!video.lastHeartbeat) {
    return true;
  }

  const heartbeatAt = Date.parse(video.lastHeartbeat);

  if (Number.isNaN(heartbeatAt)) {
    return true;
  }

  return now - heartbeatAt > VIDEO_HEARTBEAT_STALE_MS;
}

export function getEffectiveVideoPublishStatus(
  video: Pick<VideoState, "publishStatus" | "lastHeartbeat">,
  now = Date.now(),
): VideoPublishStatus {
  if (isVideoHeartbeatExpired(video, now)) {
    return "error";
  }

  return video.publishStatus;
}
