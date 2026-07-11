CREATE TYPE "AppointmentPaymentMethod" AS ENUM ('course', 'wallet');
CREATE TYPE "AppointmentPaymentStatus" AS ENUM ('reserved', 'charged', 'released', 'reversed');
CREATE TYPE "CourseTransactionType" AS ENUM ('purchase', 'reserve', 'consume', 'release', 'reverse', 'adjust');
CREATE TYPE "WalletTransactionType" AS ENUM ('top_up', 'reserve', 'release', 'consume', 'reverse', 'adjust');

CREATE TABLE "MemberCredential" (
  "memberId" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MemberCredential_pkey" PRIMARY KEY ("memberId")
);

CREATE TABLE "AppointmentPayment" (
  "id" TEXT NOT NULL,
  "appointmentId" TEXT NOT NULL,
  "method" "AppointmentPaymentMethod" NOT NULL,
  "status" "AppointmentPaymentStatus" NOT NULL DEFAULT 'reserved',
  "courseBalanceId" TEXT,
  "reservedSessions" INTEGER NOT NULL DEFAULT 0,
  "chargedSessions" INTEGER NOT NULL DEFAULT 0,
  "reservedAmount" INTEGER NOT NULL DEFAULT 0,
  "chargedAmount" INTEGER NOT NULL DEFAULT 0,
  "priceSnapshot" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AppointmentPayment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MemberCourseBalance" (
  "id" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "serviceId" TEXT NOT NULL,
  "totalSessions" INTEGER NOT NULL DEFAULT 0,
  "usedSessions" INTEGER NOT NULL DEFAULT 0,
  "reservedSessions" INTEGER NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMP(3),
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MemberCourseBalance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MemberCourseTransaction" (
  "id" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "serviceId" TEXT NOT NULL,
  "courseBalanceId" TEXT,
  "appointmentId" TEXT,
  "type" "CourseTransactionType" NOT NULL,
  "sessions" INTEGER NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MemberCourseTransaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WalletTransaction" (
  "id" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "appointmentId" TEXT,
  "type" "WalletTransactionType" NOT NULL,
  "amount" INTEGER NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AppointmentPayment_appointmentId_key" ON "AppointmentPayment"("appointmentId");
CREATE UNIQUE INDEX "MemberCourseBalance_memberId_serviceId_key" ON "MemberCourseBalance"("memberId", "serviceId");
CREATE INDEX "MemberCourseBalance_memberId_idx" ON "MemberCourseBalance"("memberId");
CREATE INDEX "MemberCourseBalance_serviceId_idx" ON "MemberCourseBalance"("serviceId");
CREATE INDEX "MemberCourseTransaction_memberId_createdAt_idx" ON "MemberCourseTransaction"("memberId", "createdAt");
CREATE INDEX "MemberCourseTransaction_courseBalanceId_createdAt_idx" ON "MemberCourseTransaction"("courseBalanceId", "createdAt");
CREATE INDEX "MemberCourseTransaction_appointmentId_idx" ON "MemberCourseTransaction"("appointmentId");
CREATE INDEX "WalletTransaction_memberId_createdAt_idx" ON "WalletTransaction"("memberId", "createdAt");
CREATE INDEX "WalletTransaction_appointmentId_idx" ON "WalletTransaction"("appointmentId");

ALTER TABLE "MemberCredential" ADD CONSTRAINT "MemberCredential_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AppointmentPayment" ADD CONSTRAINT "AppointmentPayment_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AppointmentPayment" ADD CONSTRAINT "AppointmentPayment_courseBalanceId_fkey" FOREIGN KEY ("courseBalanceId") REFERENCES "MemberCourseBalance"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MemberCourseBalance" ADD CONSTRAINT "MemberCourseBalance_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MemberCourseBalance" ADD CONSTRAINT "MemberCourseBalance_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MemberCourseTransaction" ADD CONSTRAINT "MemberCourseTransaction_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MemberCourseTransaction" ADD CONSTRAINT "MemberCourseTransaction_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MemberCourseTransaction" ADD CONSTRAINT "MemberCourseTransaction_courseBalanceId_fkey" FOREIGN KEY ("courseBalanceId") REFERENCES "MemberCourseBalance"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MemberCourseTransaction" ADD CONSTRAINT "MemberCourseTransaction_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
