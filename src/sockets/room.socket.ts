import { Server, Socket } from 'socket.io';
import prisma from '../config/database';
import { updateParticipantPermission } from '../features/live_class/livekit.service';

export function registerRoomSocketHandlers(io: Server) {
  io.on('connection', (socket: Socket) => {
    const { roomId, userId, userName } = socket.handshake.auth;

    // Join socket room
    socket.join(roomId);
    io.to(roomId).emit('user:joined', { userId, userName });

    // Chat message
    socket.on('chat:message', ({ text }: { text: string }) => {
      io.to(roomId).emit('chat:message', {
        userId,
        userName,
        text,
        timestamp: new Date().toISOString(),
      });
    });

    // Raise hand
    socket.on('hand:raise', () => {
      io.to(roomId).emit('hand:raise', { userId, userName });
    });

    // Host grants mic/camera to a participant
    socket.on('host:grant-permission', async ({ targetUserId }: { targetUserId: string }) => {
      const room = await prisma.room.findFirst({ where: { id: roomId, hostId: userId } });
      if (!room) return;

      await updateParticipantPermission(room.livekitRoom!, targetUserId, {
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
      });

      io.to(roomId).emit('permission:granted', { targetUserId });
    });

    // Participant leaves
    socket.on('disconnect', async () => {
      await prisma.participant.updateMany({
        where: { roomId, userId },
        data: { leftAt: new Date() },
      });
      io.to(roomId).emit('user:left', { userId, userName });
    });
  });
}