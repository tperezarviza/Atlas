import { FastifyRequest, FastifyReply } from 'fastify';
import { ADMIN_API_KEY } from '../config.js';

export function requireAdmin(req: FastifyRequest, reply: FastifyReply): boolean {
  if (!ADMIN_API_KEY) return true; // No key configured = open (dev mode)
  const key = req.headers['x-api-key'] as string;
  if (key !== ADMIN_API_KEY) {
    reply.status(403).send({ error: 'Forbidden' });
    return false;
  }
  return true;
}
