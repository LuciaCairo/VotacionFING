import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Script de un solo uso: vacía todo excepto administrador y votante
 * (el padrón y el admin se cargan a mano, no se regeneran con datos de prueba).
 *
 * TRUNCATE ... CASCADE resuelve solo las FK que apuntan HACIA estas tablas
 * (ninguna tabla ajena referencia a estas), así que administrador/votante
 * quedan intactos aunque participacion tenga FK RESTRICT hacia votante.
 */
async function main() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE participacion, resultado, lista, eleccion, log RESTART IDENTITY CASCADE;',
  );
  console.log('✅ Vaciadas: participacion, resultado, lista, eleccion, log (IDs reiniciados).');
  console.log('   Intactas: administrador, votante.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
