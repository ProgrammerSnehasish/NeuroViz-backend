-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_mapId_fkey" FOREIGN KEY ("mapId") REFERENCES "Mindmap"("id") ON DELETE SET NULL ON UPDATE CASCADE;
