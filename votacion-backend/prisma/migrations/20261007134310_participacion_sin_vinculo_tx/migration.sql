/*
  Warnings:

  - You are about to drop the column `hash_blockchain` on the `participacion` table. All the data in the column will be lost.
  - You are about to drop the column `tx_hash` on the `participacion` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "participacion" DROP COLUMN "hash_blockchain",
DROP COLUMN "tx_hash",
ADD COLUMN     "hash_pendiente" VARCHAR(66);
