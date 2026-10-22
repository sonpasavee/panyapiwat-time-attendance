-- AlterTable
ALTER TABLE "Leave" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "gradeLevel",
DROP COLUMN "shopCode",
DROP COLUMN "yearLevel",
ADD COLUMN     "titlePrefix" TEXT;

-- CreateTable
CREATE TABLE "AcademicTerm" (
    "id" TEXT NOT NULL,
    "academicYear" INTEGER NOT NULL,
    "semester" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AcademicTerm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassGroup" (
    "id" TEXT NOT NULL,
    "academicTermId" TEXT NOT NULL,
    "programLevel" TEXT NOT NULL,
    "yearLevel" INTEGER NOT NULL,
    "section" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Branch" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentEnrollment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "academicTermId" TEXT NOT NULL,
    "classGroupId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AcademicTerm_academicYear_semester_key" ON "AcademicTerm"("academicYear", "semester");

-- CreateIndex
CREATE INDEX "ClassGroup_academicTermId_idx" ON "ClassGroup"("academicTermId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassGroup_academicTermId_programLevel_yearLevel_section_key" ON "ClassGroup"("academicTermId", "programLevel", "yearLevel", "section");

-- CreateIndex
CREATE UNIQUE INDEX "ClassGroup_id_academicTermId_key" ON "ClassGroup"("id", "academicTermId");

-- CreateIndex
CREATE UNIQUE INDEX "Branch_name_key" ON "Branch"("name");

-- CreateIndex
CREATE INDEX "StudentEnrollment_academicTermId_classGroupId_idx" ON "StudentEnrollment"("academicTermId", "classGroupId");

-- CreateIndex
CREATE INDEX "StudentEnrollment_branchId_idx" ON "StudentEnrollment"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentEnrollment_userId_academicTermId_key" ON "StudentEnrollment"("userId", "academicTermId");

-- AddForeignKey
ALTER TABLE "ClassGroup" ADD CONSTRAINT "ClassGroup_academicTermId_fkey" FOREIGN KEY ("academicTermId") REFERENCES "AcademicTerm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentEnrollment" ADD CONSTRAINT "StudentEnrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentEnrollment" ADD CONSTRAINT "StudentEnrollment_academicTermId_fkey" FOREIGN KEY ("academicTermId") REFERENCES "AcademicTerm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentEnrollment" ADD CONSTRAINT "StudentEnrollment_classGroupId_academicTermId_fkey" FOREIGN KEY ("classGroupId", "academicTermId") REFERENCES "ClassGroup"("id", "academicTermId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentEnrollment" ADD CONSTRAINT "StudentEnrollment_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
