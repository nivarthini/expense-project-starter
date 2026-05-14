CREATE INDEX "Transaction_orgId_createdAt_idx" ON "Transaction"("orgId", "createdAt");
CREATE INDEX "Transaction_orgId_type_createdAt_idx" ON "Transaction"("orgId", "type", "createdAt");
