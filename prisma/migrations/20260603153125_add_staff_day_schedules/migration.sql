-- CreateEnum
CREATE TYPE "DayScheduleStatus" AS ENUM ('working', 'time_off');

-- CreateTable
CREATE TABLE "StaffDaySchedule" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "DayScheduleStatus" NOT NULL,
    "startMinute" INTEGER,
    "endMinute" INTEGER,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffDaySchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StaffDaySchedule_staffId_date_status_idx" ON "StaffDaySchedule"("staffId", "date", "status");

-- CreateIndex
CREATE UNIQUE INDEX "StaffDaySchedule_staffId_date_key" ON "StaffDaySchedule"("staffId", "date");

-- AddForeignKey
ALTER TABLE "StaffDaySchedule" ADD CONSTRAINT "StaffDaySchedule_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
