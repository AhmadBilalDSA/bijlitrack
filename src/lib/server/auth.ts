import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

export interface AuthUser {
  id: string;
}

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }
  return secret;
}

export function signToken(payload: { id: string }, expiresIn: string = '7d'): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: expiresIn as any });
}

export function verifyAuth(req: NextRequest): AuthUser {
  const authHeader = req.headers.get('authorization');
  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    throw new Error('Not authorized, no token provided');
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as { id: string };
    return { id: decoded.id };
  } catch (err: any) {
    throw new Error('Not authorized, token invalid or expired');
  }
}
