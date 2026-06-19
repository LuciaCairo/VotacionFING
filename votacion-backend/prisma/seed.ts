import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * Seed de datos minimos para desarrollo.
 *   - 1 administrador
 *   - algunos votantes de prueba
 *
 * El padron real se carga directo en la BD por personal tecnico;
 * esto es solo para poder probar el backend localmente.
 */
async function main() {
  const rounds = 12;

  // ─── Administrador ─────────────────────────────────────────
  const correoAdmin = 'admin@fing.uncuyo.edu.ar';
  await prisma.administrador.upsert({
    where: { correo: correoAdmin },
    update: {},
    create: {
      correo: correoAdmin,
      passwordHash: await bcrypt.hash('admin1234', rounds),
    },
  });
  console.log(`✅ Admin: ${correoAdmin} / admin1234`);

  // ─── Votantes de prueba ────────────────────────────────────
  const votantes = [
    { legajo: '12345', nombre: 'Juan Perez', carrera: 'Ingenieria en Sistemas', correo: 'juan@fing.uncuyo.edu.ar' },
    { legajo: '67890', nombre: 'Ana Garcia', carrera: 'Ingenieria Civil', correo: 'ana@fing.uncuyo.edu.ar' },
    { legajo: '11111', nombre: 'Lucia Cairo', carrera: 'Lic. en Ciencias de la Computacion', correo: 'lucia@fing.uncuyo.edu.ar' },
  ];

  for (const v of votantes) {
    await prisma.votante.upsert({
      where: { legajo: v.legajo },
      update: {},
      create: {
        legajo: v.legajo,
        nombreCompleto: v.nombre,
        carrera: v.carrera,
        correo: v.correo,
        passwordHash: await bcrypt.hash('votante1234', rounds),
        activo: true,
      },
    });
    console.log(`✅ Votante: ${v.legajo} / votante1234`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
