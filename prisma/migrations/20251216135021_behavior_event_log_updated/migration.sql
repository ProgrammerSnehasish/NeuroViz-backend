-- CreateIndex
CREATE INDEX "BehaviorEvent_userId_idx" ON "BehaviorEvent"("userId");

-- CreateIndex
CREATE INDEX "BehaviorEvent_type_idx" ON "BehaviorEvent"("type");

-- CreateIndex
CREATE INDEX "BehaviorEvent_createdAt_idx" ON "BehaviorEvent"("createdAt");
