-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'TEACHER');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'NOT_MENTIONED');

-- CreateEnum
CREATE TYPE "NeuroProblemType" AS ENUM ('ADHD', 'AUTISM', 'DYSLEXIA', 'DYSPRAXIA', 'OCD', 'TOURETTE_SYNDROME', 'ANXIETY_DISORDER', 'DEPRESSION', 'BIPOLAR_DISORDER', 'NOT_MENTIONED');

-- CreateEnum
CREATE TYPE "Education" AS ENUM ('CLASS_1', 'CLASS_2', 'CLASS_3', 'CLASS_4', 'CLASS_5', 'CLASS_6', 'CLASS_7', 'CLASS_8', 'CLASS_9', 'CLASS_10', 'CLASS_11', 'CLASS_12', 'NOT_MENTIONED');

-- CreateEnum
CREATE TYPE "Affiliation" AS ENUM ('WBBSE', 'WBCHSE', 'CBSE', 'NOT_MENTIONED');

-- CreateEnum
CREATE TYPE "Qualification" AS ENUM ('B_TECH', 'B_A', 'B_SC', 'B_COM', 'M_TECH', 'M_A', 'M_SC', 'M_COM', 'M_PHIL', 'PHD', 'NOT_MENTIONED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "lastName" TEXT NOT NULL,
    "dob" TIMESTAMP(3),
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "homeTown" TEXT DEFAULT 'Not mentioned yet.',
    "currentCity" TEXT DEFAULT 'Not mentioned yet.',
    "gender" "Gender" NOT NULL DEFAULT 'NOT_MENTIONED',
    "role" "Role" NOT NULL DEFAULT 'STUDENT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "neuroProblemType" "NeuroProblemType" NOT NULL DEFAULT 'NOT_MENTIONED',
    "education" "Education" NOT NULL DEFAULT 'NOT_MENTIONED',
    "affiliation" "Affiliation" NOT NULL DEFAULT 'NOT_MENTIONED',
    "instituteName" TEXT DEFAULT 'Not mentioned yet.',
    "guardianName" TEXT DEFAULT 'Not mentioned yet.',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "qualification" "Qualification" NOT NULL DEFAULT 'NOT_MENTIONED',
    "experience" INTEGER,
    "specialization" TEXT DEFAULT 'Not mentioned yet.',
    "instituteName" TEXT DEFAULT 'Not mentioned yet.',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mindmap" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "structure" JSONB NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mindmap_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_userId_key" ON "StudentProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherProfile_userId_key" ON "TeacherProfile"("userId");

-- AddForeignKey
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherProfile" ADD CONSTRAINT "TeacherProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mindmap" ADD CONSTRAINT "Mindmap_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
