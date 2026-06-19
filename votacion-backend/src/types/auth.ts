import '@fastify/jwt';

/** Rol del usuario autenticado en el token. */
export type Rol = 'votante' | 'administrador';

/**
 * Payload que se firma dentro del JWT.
 *  - sub: id del usuario (votante o admin)
 *  - rol: rol del usuario
 *  - jti: id unico del token (para la lista negra en Redis)
 *  - exp/iat: los agrega @fastify/jwt automaticamente
 */
export interface JwtPayload {
  sub: number;
  rol: Rol;
  jti: string;
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtPayload;
    user: JwtPayload & { iat: number; exp: number };
  }
}
