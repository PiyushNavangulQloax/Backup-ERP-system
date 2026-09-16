-- CreateTable
CREATE TABLE IF NOT EXISTS "QualityInspection" (
    "id" TEXT NOT NULL,
    "inspectionNumber" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT,
    "grnId" TEXT,
    "grnItemId" TEXT,
    "jobCardId" TEXT,
    "partId" TEXT NOT NULL,
    "batchNumber" TEXT,
    "inspectedQty" DOUBLE PRECISION NOT NULL,
    "acceptedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rejectedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "decision" TEXT NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "remarks" TEXT,
    "inspectedById" TEXT,
    "inspectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QualityInspection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "QualityInspection_inspectionNumber_key" ON "QualityInspection"("inspectionNumber");
CREATE INDEX IF NOT EXISTS "QualityInspection_sourceType_sourceId_idx" ON "QualityInspection"("sourceType", "sourceId");
CREATE INDEX IF NOT EXISTS "QualityInspection_status_idx" ON "QualityInspection"("status");
CREATE INDEX IF NOT EXISTS "QualityInspection_decision_idx" ON "QualityInspection"("decision");
CREATE INDEX IF NOT EXISTS "QualityInspection_partId_idx" ON "QualityInspection"("partId");
CREATE INDEX IF NOT EXISTS "QualityInspection_createdAt_idx" ON "QualityInspection"("createdAt");

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'QualityInspection_grnId_fkey') THEN
    ALTER TABLE "QualityInspection" ADD CONSTRAINT "QualityInspection_grnId_fkey" FOREIGN KEY ("grnId") REFERENCES "GRN"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'QualityInspection_grnItemId_fkey') THEN
    ALTER TABLE "QualityInspection" ADD CONSTRAINT "QualityInspection_grnItemId_fkey" FOREIGN KEY ("grnItemId") REFERENCES "GRNItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'QualityInspection_jobCardId_fkey') THEN
    ALTER TABLE "QualityInspection" ADD CONSTRAINT "QualityInspection_jobCardId_fkey" FOREIGN KEY ("jobCardId") REFERENCES "JobCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'QualityInspection_partId_fkey') THEN
    ALTER TABLE "QualityInspection" ADD CONSTRAINT "QualityInspection_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'QualityInspection_inspectedById_fkey') THEN
    ALTER TABLE "QualityInspection" ADD CONSTRAINT "QualityInspection_inspectedById_fkey" FOREIGN KEY ("inspectedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
