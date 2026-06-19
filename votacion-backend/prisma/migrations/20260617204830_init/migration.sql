-- CreateEnum
CREATE TYPE "EstadoEleccion" AS ENUM ('creada', 'publicada', 'finalizada');

-- CreateEnum
CREATE TYPE "TipoEvento" AS ENUM ('login_exitoso', 'login_fallido', 'voto_emitido', 'voto_error', 'eleccion_creada', 'eleccion_editada', 'eleccion_eliminada', 'lista_creada', 'lista_editada', 'lista_eliminada', 'cierre_automatico', 'apertura_automatica', 'verificacion_integridad', 'sesion_cerrada');

-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('votante', 'administrador', 'sistema');

-- CreateTable
CREATE TABLE "administrador" (
    "id" SERIAL NOT NULL,
    "correo" VARCHAR(100) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,

    CONSTRAINT "administrador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eleccion" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "fecha_inicio" TIMESTAMP(3) NOT NULL,
    "fecha_cierre" TIMESTAMP(3) NOT NULL,
    "contrato_address" VARCHAR(42),
    "estado" "EstadoEleccion" NOT NULL DEFAULT 'creada',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eleccion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lista" (
    "id" SERIAL NOT NULL,
    "id_eleccion" INTEGER NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "es_blanco" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "lista_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "votante" (
    "id" SERIAL NOT NULL,
    "legajo" VARCHAR(20) NOT NULL,
    "nombre_completo" VARCHAR(150) NOT NULL,
    "carrera" VARCHAR(100) NOT NULL,
    "correo" VARCHAR(100) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "votante_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participacion" (
    "id" SERIAL NOT NULL,
    "id_votante" INTEGER NOT NULL,
    "id_eleccion" INTEGER NOT NULL,
    "fecha_voto" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hash_blockchain" VARCHAR(255) NOT NULL,
    "tx_hash" VARCHAR(255) NOT NULL,

    CONSTRAINT "participacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "log" (
    "id" SERIAL NOT NULL,
    "tipo_evento" "TipoEvento" NOT NULL,
    "descripcion" TEXT,
    "id_usuario" INTEGER,
    "rol_usuario" "RolUsuario" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" VARCHAR(45),

    CONSTRAINT "log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "administrador_correo_key" ON "administrador"("correo");

-- CreateIndex
CREATE INDEX "lista_id_eleccion_idx" ON "lista"("id_eleccion");

-- CreateIndex
CREATE UNIQUE INDEX "lista_id_eleccion_nombre_key" ON "lista"("id_eleccion", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "votante_legajo_key" ON "votante"("legajo");

-- CreateIndex
CREATE INDEX "participacion_id_eleccion_idx" ON "participacion"("id_eleccion");

-- CreateIndex
CREATE UNIQUE INDEX "participacion_id_votante_id_eleccion_key" ON "participacion"("id_votante", "id_eleccion");

-- CreateIndex
CREATE INDEX "log_tipo_evento_idx" ON "log"("tipo_evento");

-- CreateIndex
CREATE INDEX "log_timestamp_idx" ON "log"("timestamp");

-- AddForeignKey
ALTER TABLE "lista" ADD CONSTRAINT "lista_id_eleccion_fkey" FOREIGN KEY ("id_eleccion") REFERENCES "eleccion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participacion" ADD CONSTRAINT "participacion_id_votante_fkey" FOREIGN KEY ("id_votante") REFERENCES "votante"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participacion" ADD CONSTRAINT "participacion_id_eleccion_fkey" FOREIGN KEY ("id_eleccion") REFERENCES "eleccion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
