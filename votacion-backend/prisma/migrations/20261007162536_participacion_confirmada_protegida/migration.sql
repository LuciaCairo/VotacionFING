-- Protege las participaciones confirmadas (hash_pendiente IS NULL).
--
-- Con hashes de voto aleatorios el contrato ya no puede saber que dos votos
-- son de la misma persona: lo unico que frena un segundo voto es la fila de
-- PARTICIPACION. Si se borrara (o se le cambiara el votante o la eleccion),
-- ese votante podria volver a votar y el contrato lo aceptaria. Por eso una
-- participacion confirmada no se puede borrar ni modificar.
--
-- Las reservas pendientes (hash_pendiente con valor) si se pueden borrar o
-- confirmar: es lo que hacen emitirVoto y el job de cierre. Un UPDATE que no
-- cambia nada (confirmar una fila ya confirmada) tambien pasa.
--
-- TRUNCATE no dispara triggers por fila, asi que prisma/limpiar.ts sigue
-- funcionando para vaciar los datos de prueba.

-- CreateFunction
CREATE FUNCTION "participacion_proteger_confirmada"() RETURNS trigger AS $$
BEGIN
  IF OLD."hash_pendiente" IS NULL THEN
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'No se puede borrar una participacion confirmada (id %): el voto ya esta contado en BFA.', OLD."id"
        USING ERRCODE = 'restrict_violation';
    END IF;
    IF (NEW."id_votante", NEW."id_eleccion", NEW."fecha_voto", NEW."hash_pendiente")
       IS DISTINCT FROM (OLD."id_votante", OLD."id_eleccion", OLD."fecha_voto", OLD."hash_pendiente") THEN
      RAISE EXCEPTION 'No se puede modificar una participacion confirmada (id %).', OLD."id"
        USING ERRCODE = 'restrict_violation';
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- CreateTrigger
CREATE TRIGGER "trg_participacion_proteger_confirmada"
BEFORE UPDATE OR DELETE ON "participacion"
FOR EACH ROW EXECUTE FUNCTION "participacion_proteger_confirmada"();
