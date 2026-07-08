import { Router } from "express";
import { verifyToken } from "../../middlewares/jwtVerifiction";
import { enforceTeacherOrStudent } from "../../middlewares/enforceTeacherorStudent";
import { upload } from "../../middlewares/upload";
import { ChatController } from "./chat.controller";
import { EditMessageDto, MarkMessagesReadDto, SendFileMessageDto, SendTextMessageDto } from "./chat.dto";
import { dtoValidation } from "../../middlewares/dtoValidation";

const chatRouter = Router();

chatRouter.use(verifyToken, enforceTeacherOrStudent);

// ── Rooms ─────────────────────────────────────────────────────────────────────
chatRouter.get("/rooms", ChatController.getMyChatRooms);
chatRouter.post("/direct/:targetUserId", ChatController.getOrCreateDirectRoom);
chatRouter.post("/group/:groupId", ChatController.getOrCreateGroupRoom);

// ── Messages ──────────────────────────────────────────────────────────────────
chatRouter.get("/room/:chatRoomId/messages", ChatController.getRoomMessages);
chatRouter.post("/room/:chatRoomId/message", dtoValidation(SendTextMessageDto), ChatController.sendTextMessage);
chatRouter.post("/room/:chatRoomId/file",
  upload.single("file"),
  dtoValidation(SendFileMessageDto),
  ChatController.sendFileMessage
);

// ── Message actions ───────────────────────────────────────────────────────────
chatRouter.patch("/message/:messageId", dtoValidation(EditMessageDto), ChatController.editMessage);
chatRouter.delete("/message/:messageId", ChatController.deleteMessage);
chatRouter.post("/room/:chatRoomId/read", dtoValidation(MarkMessagesReadDto), ChatController.markMessagesRead);
chatRouter.get("/room/:chatRoomId/unread", ChatController.getUnreadCount);

export default chatRouter;