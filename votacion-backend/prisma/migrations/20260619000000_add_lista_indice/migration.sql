-- AlterTable: agrega el indice 0-based de cada lista en el array del contrato
ALTER TABLE "lista" ADD COLUMN "indice" INTEGER NOT NULL;

-- CreateIndex: garantiza que no haya dos listas con el mismo indice en la misma eleccion
CREATE UNIQUE INDEX "uq_lista_eleccion_indice" ON "lista"("id_eleccion", "indice");
