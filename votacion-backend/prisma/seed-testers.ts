import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { randomInt } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const prisma = new PrismaClient();

/**
 * Cuentas para la prueba remota con usuarios (evaluacion de usabilidad).
 *   - 33 votantes (legajos 90001..90033): 30 para repartir y 3 de reserva
 *   - 2 administradores: uno para quien conduce la prueba y otro de reserva
 *
 * A diferencia de seed.ts, cada cuenta tiene una contrasena aleatoria propia:
 * la app queda expuesta por un tunel publico, asi que una contrasena comun
 * permitiria a un tester entrar con la cuenta de otro.
 *
 * Cada corrida REGENERA las contrasenas y las escribe en
 * credenciales-testers.csv (ignorado por git). Uso:
 *   npm run seed:testers
 */
const CANT_VOTANTES = 33;
const CANT_ADMINS = 2;

// Sin caracteres ambiguos (0/O, 1/l/I) para que se puedan dictar o copiar a mano.
const ALFABETO = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';

function generarPassword(largo = 10): string {
  let s = '';
  for (let i = 0; i < largo; i++) s += ALFABETO[randomInt(ALFABETO.length)];
  return s;
}

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('seed-testers no puede correr con NODE_ENV=production.');
  }

  const rounds = 12;
  const filas: string[] = ['rol,usuario,password'];

  for (let i = 1; i <= CANT_VOTANTES; i++) {
    const legajo = String(90000 + i);
    const password = generarPassword();
    const passwordHash = await bcrypt.hash(password, rounds);
    await prisma.votante.upsert({
      where: { legajo },
      update: { passwordHash, activo: true },
      create: {
        legajo,
        nombreCompleto: `Tester ${i}`,
        carrera: 'Prueba de usabilidad',
        correo: `tester${i}@prueba.fing.uncuyo.edu.ar`,
        passwordHash,
        activo: true,
      },
    });
    filas.push(`votante,${legajo},${password}`);
  }

  for (let i = 1; i <= CANT_ADMINS; i++) {
    const correo = `tester-admin${i}@fing.uncuyo.edu.ar`;
    const password = generarPassword();
    const passwordHash = await bcrypt.hash(password, rounds);
    await prisma.administrador.upsert({
      where: { correo },
      update: { passwordHash },
      create: { correo, passwordHash },
    });
    filas.push(`admin,${correo},${password}`);
  }

  const salida = resolve('credenciales-testers.csv');
  writeFileSync(salida, filas.join('\n') + '\n', 'utf8');
  console.log(`✅ ${CANT_VOTANTES} votantes y ${CANT_ADMINS} admins listos.`);
  console.log(`   Credenciales en ${salida} (no se commitea).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
