-- AlterTable
ALTER TABLE "lista" ADD COLUMN     "color" VARCHAR(7);

-- RenameIndex
ALTER INDEX "uq_lista_eleccion_indice" RENAME TO "lista_id_eleccion_indice_key";
