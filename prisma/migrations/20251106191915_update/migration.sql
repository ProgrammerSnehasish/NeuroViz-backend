-- CreateTable
CREATE TABLE "StudentInvite" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudentInvite_email_key" ON "StudentInvite"("email");

-- CreateIndex
CREATE UNIQUE INDEX "StudentInvite_token_key" ON "StudentInvite"("token");

-- AddForeignKey
ALTER TABLE "StudentInvite" ADD CONSTRAINT "StudentInvite_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
