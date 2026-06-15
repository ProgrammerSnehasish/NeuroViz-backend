import { Router, Request, Response } from 'express';
import { generateToken, createLiveKitRoom, endLiveKitRoom } from '../live_class/livekit.service';
import { nanoid } from 'nanoid';
import { verifyToken } from '../../middlewares/jwtVerifiction';
import prisma from '../../config/database';
import { dtoValidation } from '../../middlewares/dtoValidation';
import { CreateClassdto } from './liveClass.dto';
import { enforceTeacher } from '../../middlewares/enforceTeacher';

const roomRouter = Router();

// POST /rooms — Create a new room
roomRouter.post('/', verifyToken, dtoValidation(CreateClassdto), enforceTeacher,async (req: Request, res: Response) => {
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
  
  // 1. Get User ID from token
  const userId = 
    req.user?.userId || 
    req.user?.id || 
    res.locals?.userId || 
    res.locals?.studentId || 
    res.locals?.teacherId;
  
  if (!userId) {
    console.error("Join Room Error: Missing userId in request. Found user object:", req.user);
    return res.status(400).json({ error: 'User ID is missing from token/request' });
  }

  try {
    // 2. FETCH REAL NAME FROM DATABASE
    const dbUser = await prisma.user.findUnique({
      where: { id: userId as string },
      select: { firstName: true, lastName: true, role: true }
    });

    // 3. FORMAT THE NAME
    let userName = 'Unknown';
    if (dbUser) {
      if (dbUser.firstName) {
        userName = `${dbUser.firstName} ${dbUser.lastName || ''}`.trim();
      } else {
        userName = dbUser.role === 'TEACHER' ? 'Teacher' : 'Student';
      }
    }

    const room = await prisma.room.findUnique({ where: { id: roomId as string} });

    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (room.status === 'ENDED') return res.status(400).json({ error: 'Class has ended' });

    const isHost = room.hostId === userId;

    // 4. Upsert participant record
    await prisma.participant.upsert({
      where: { roomId_userId: { roomId: roomId as string, userId: userId as string } },
      update: { leftAt: null },
      create: {
        roomId: roomId as string,
        userId: userId as string,
        role: isHost ? 'HOST' : 'VIEWER',
      },
    });

    // 5. If host is joining, mark room as LIVE and create LiveKit room
    if (isHost && room.status === 'WAITING') {
      await createLiveKitRoom(room.livekitRoom!);
      await prisma.room.update({
        where: { id: roomId as string},
        data: { status: 'LIVE' },
      });
    }

    // 6. Generate LiveKit Token WITH REAL NAME
    const token = await generateToken({
      roomName: room.livekitRoom!,
      participantId: userId as string,
      participantName: userName,
      isHost,
    });

    res.json({ token, livekitUrl: process.env.LIVEKIT_URL, room });
  } catch (error) {
    console.error("Database error while joining room:", error);
    res.status(500).json({ error: 'Internal server error while joining room' });
  }
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

