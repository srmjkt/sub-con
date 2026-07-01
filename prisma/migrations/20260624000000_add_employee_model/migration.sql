-- Create Employee table
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "branchId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "department" TEXT,
    "position" TEXT,
    "joinDate" TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX "Employee_branchId_idx" ON "Employee"("branchId");
CREATE INDEX "Employee_fullName_idx" ON "Employee"("fullName");
CREATE INDEX "Employee_isActive_idx" ON "Employee"("isActive");

-- Create unique constraint
CREATE UNIQUE INDEX "Employee_branchId_employeeId_key" ON "Employee"("branchId", "employeeId");

-- Add foreign key
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE;

-- Add employeeId to AttendanceRecord
ALTER TABLE "AttendanceRecord" ADD COLUMN IF NOT EXISTS "employeeId" TEXT;
CREATE INDEX IF NOT EXISTS "AttendanceRecord_employeeId_idx" ON "AttendanceRecord"("employeeId");