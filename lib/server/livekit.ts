import { AccessToken } from "livekit-server-sdk";
import { ACTIVE_LIVEKIT_ROOM, getRequiredServerEnv, isLiveKitServerConfigured } from "@/lib/config";
import type { VideoTokenRequest, VideoTokenResponse } from "@/lib/types";

export async function createVideoAccessToken({
  role,
}: VideoTokenRequest): Promise<VideoTokenResponse> {
  if (!isLiveKitServerConfigured()) {
    throw new Error(
      "LiveKit is not configured. Set LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET.",
    );
  }

  const identity = `${role}-${crypto.randomUUID()}`;
  const token = new AccessToken(
    getRequiredServerEnv("LIVEKIT_API_KEY"),
    getRequiredServerEnv("LIVEKIT_API_SECRET"),
    {
      identity,
      ttl: "10m",
    },
  );

  token.addGrant({
    roomJoin: true,
    room: ACTIVE_LIVEKIT_ROOM,
    canPublish: role === "operator",
    canPublishData: role === "operator",
    canSubscribe: true,
  });

  return {
    token: await token.toJwt(),
    url: getRequiredServerEnv("LIVEKIT_URL"),
    roomName: ACTIVE_LIVEKIT_ROOM,
    identity,
  };
}
