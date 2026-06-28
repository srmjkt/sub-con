-- Add missing columns to IncidentReport
ALTER TABLE "IncidentReport" ADD COLUMN IF NOT EXISTS "incidentReportNumber" TEXT;
ALTER TABLE "IncidentReport" ADD COLUMN IF NOT EXISTS "customFieldsData" JSONB;

-- Add missing columns to AttendanceRecord
ALTER TABLE "AttendanceRecord" ADD COLUMN IF NOT EXISTS "customFieldsData" JSONB;

-- Add missing columns to Training
ALTER TABLE "Training" ADD COLUMN IF NOT EXISTS "customFieldsData" JSONB;

-- Add missing columns to Simulation
ALTER TABLE "Simulation" ADD COLUMN IF NOT EXISTS "customFieldsData" JSONB;

-- Add missing columns to MockDrill
ALTER TABLE "MockDrill" ADD COLUMN IF NOT EXISTS "customFieldsData" JSONB;

-- Add missing columns to Inventory
ALTER TABLE "Inventory" ADD COLUMN IF NOT EXISTS "customFieldsData" JSONB;

-- Add missing column to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "branchAccess" JSONB;

-- Add missing unique constraint to BranchModuleConfig
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'BranchModuleConfig_branchId_module_key'
  ) THEN
    ALTER TABLE "BranchModuleConfig" ADD CONSTRAINT "BranchModuleConfig_branchId_module_key" UNIQUE ("branchId", "module");
  END IF;
END
$$;