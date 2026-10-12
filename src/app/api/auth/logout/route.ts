import { NextResponse } from 'next/server';
import { deleteCurrentSession, expiredSessionCookie } from '@/lib/server/auth';
import { jsonError, validOrigin } from '@/lib/server/http';

export async function POST(request: Request) {
  if (!validOrigin(request)) return jsonError('Invalid request origin.', 403, 'INVALID_ORIGIN');
  await deleteCurrentSession();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(expiredSessionCookie());
  return response;
}
