import { NextResponse } from 'next/server';
import type { ServerRole, ServerUser } from './auth';

export function jsonError(message: string, status: number, code = 'REQUEST_ERROR') {
  return NextResponse.json({ error: { code, message } }, { status });
}

export function requireRole(user: ServerUser | null, roles: ServerRole[]) {
  if (!user) return jsonError('Authentication required.', 401, 'UNAUTHENTICATED');
  if (!roles.includes(user.role)) return jsonError('You do not have permission to perform this action.', 403, 'FORBIDDEN');
  return null;
}

export function validOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  return origin === new URL(request.url).origin || origin === process.env.RUNSHOW_ALLOWED_ORIGIN;
}
