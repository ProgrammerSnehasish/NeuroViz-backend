import { AccessToken, RoomServiceClient, ParticipantPermission } from 'livekit-server-sdk';

const roomService = new RoomServiceClient(
  process.env.LIVEKIT_URL!,
  process.env.LIVEKIT_API_KEY!,
  process.env.LIVEKIT_API_SECRET!
);

export interface TokenOptions {
  roomName: string;
  participantName: string;
  participantId: string;
  isHost: boolean;
}

// Generate a JWT token — the client uses this to connect to LiveKit
export function generateToken(options: TokenOptions): Promise<string> {
  const at = new AccessToken(
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!,
    {
      identity: options.participantId,
      name: options.participantName,
      ttl: '2h',
    }
  );

  at.addGrant({
    roomJoin: true,
    room: options.roomName,
    canPublish: options.isHost,       // Only host publishes by default
    canSubscribe: true,
    canPublishData: true,
    roomAdmin: options.isHost,
  });

  return at.toJwt();
}

// Create a room on the LiveKit server
export async function createLiveKitRoom(roomName: string) {
  return await roomService.createRoom({
    name: roomName,
    emptyTimeout: 300,     // Auto-close after 5 min if empty
    maxParticipants: 50,
  });
}

// Allow a viewer to unmute/share video (host grants permission)
export async function updateParticipantPermission(
  roomName: string,
  participantId: string,
  permissions: Partial<ParticipantPermission>
) {
  return await roomService.updateParticipant(roomName, participantId, undefined, permissions);
}

export async function endLiveKitRoom(roomName: string) {
  return await roomService.deleteRoom(roomName);
}