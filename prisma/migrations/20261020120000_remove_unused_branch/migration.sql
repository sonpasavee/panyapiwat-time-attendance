-- Remove the unused Branch model and its optional relation from User.
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_branchId_fkey";
DROP INDEX IF EXISTS "User_branchId_idx";
ALTER TABLE "User" DROP COLUMN IF EXISTS "branchId";
DROP TABLE IF EXISTS "Branch";
