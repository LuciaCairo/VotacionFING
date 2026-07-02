-- CreateEnum
CREATE TYPE "ResultadoTipo" AS ENUM ('ganador_unico', 'empate');

-- AlterTable
ALTER TABLE "eleccion" ADD COLUMN     "id_lista_ganadora" INTEGER,
ADD COLUMN     "resultado_tipo" "ResultadoTipo",
ADD COLUMN     "snapshot_at" TIMESTAMP(3),
ADD COLUMN     "total_votos" INTEGER;

-- CreateTable
CREATE TABLE "resultado" (
    "id" SERIAL NOT NULL,
    "id_eleccion" INTEGER NOT NULL,
    "id_lista" INTEGER NOT NULL,
    "indice" INTEGER NOT NULL,
    "votos" INTEGER NOT NULL,

    CONSTRAINT "resultado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "resultado_id_eleccion_idx" ON "resultado"("id_eleccion");

-- CreateIndex
CREATE UNIQUE INDEX "resultado_id_eleccion_id_lista_key" ON "resultado"("id_eleccion", "id_lista");

-- AddForeignKey
ALTER TABLE "resultado" ADD CONSTRAINT "resultado_id_eleccion_fkey" FOREIGN KEY ("id_eleccion") REFERENCES "eleccion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resultado" ADD CONSTRAINT "resultado_id_lista_fkey" FOREIGN KEY ("id_lista") REFERENCES "lista"("id") ON DELETE CASCADE ON UPDATE CASCADE;
