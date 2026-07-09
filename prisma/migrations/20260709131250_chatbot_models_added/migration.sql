-- CreateTable
CREATE TABLE "ChatbotSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatbotSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatbotMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatbotMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatbotSession_userId_updatedAt_idx" ON "ChatbotSession"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "ChatbotMessage_sessionId_createdAt_idx" ON "ChatbotMessage"("sessionId", "createdAt");

-- AddForeignKey
ALTER TABLE "ChatbotSession" ADD CONSTRAINT "ChatbotSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatbotMessage" ADD CONSTRAINT "ChatbotMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ChatbotSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
