import { Router, Request, Response } from 'express';
import { generateToken, createLiveKitRoom, endLiveKitRoom } from '../live_class/livekit.service';
import { nanoid } from 'nanoid';
import { verifyToken } from '../../middlewares/jwtVerifiction';
import prisma from '../../config/database';
import { dtoValidation } from '../../middlewares/dtoValidation';
import { CreateClassdto } from './liveClass.dto';

const roomRouter = Router();

// POST /rooms — Create a new room
roomRouter.post('/', verifyToken, dtoValidation(CreateClassdto),async (req: Request, res: Response) => {
  const { name, scheduledAt, maxParticipants } = req.body;
  const hostId = req.user.userId;

  const livekitRoomName = `room_${nanoid(10)}`;

  const room = await prisma.room.create({
    data: {
      name,
      hostId,
      livekitRoom: livekitRoomName,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(),
      maxParticipants: maxParticipants ?? 50,
    },
  });

  res.status(201).json({ room });
});

// POST /rooms/:roomId/join — Join a room, get LiveKit token
roomRouter.post('/join/:roomId', verifyToken, async (req: Request, res: Response) => {
  const { roomId } = req.params;
  const userId = req.user.id;

  const room = await prisma.room.findUnique({ where: { id: roomId as string} });

  if (!room) return res.status(404).json({ error: 'Room not found' });
  if (room.status === 'ENDED') return res.status(400).json({ error: 'Class has ended' });

  const isHost = room.hostId === userId;

  // Upsert participant record
  await prisma.participant.upsert({
    where: { roomId_userId: { roomId: roomId as string, userId } },
    update: { leftAt: null },
    create: {
      roomId: roomId as string,
      userId,
      role: isHost ? 'HOST' : 'VIEWER',
    },
  });

  // If host is joining, mark room as LIVE and create LiveKit room
  if (isHost && room.status === 'WAITING') {
    await createLiveKitRoom(room.livekitRoom!);
    await prisma.room.update({
      where: { id: roomId as string},
      data: { status: 'LIVE' },
    });
  }

  const token = generateToken({
    roomName: room.livekitRoom!,
    participantId: userId,
    participantName: req.user.name,
    isHost,
  });

  res.json({ token, livekitUrl: process.env.LIVEKIT_URL, room });
});

// POST /rooms/:roomId/end — Host ends the class
roomRouter.post('/:roomId/end', verifyToken, async (req: Request, res: Response) => {
  const { roomId } = req.params;
  const room = await prisma.room.findUnique({ where: { id: roomId as string} });

  if (!room || room.hostId !== req.user.id) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  await endLiveKitRoom(room.livekitRoom!);
  await prisma.room.update({
    where: { id: roomId as string},
    data: { status: 'ENDED', endedAt: new Date() },
  });

  res.json({ success: true });
});

// GET /rooms/:roomId/participants
roomRouter.get('/:roomId/participants', verifyToken, async (req: Request, res: Response) => {
  const participants = await prisma.participant.findMany({
    where: { roomId: req.params.roomId as string, leftAt: null },
    include: { user: { select: { id: true, firstName: true, middleName: true, lastName: true, profilePhoto: true } } },
  });

  res.json({ participants });
});

export default roomRouter;