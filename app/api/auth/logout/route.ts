import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  await clearSessionCookie();
  const url = new URL(req.url);
  return NextResponse.redirect(new URL('/', url.origin), 303);
}
