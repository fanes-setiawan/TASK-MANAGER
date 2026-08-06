import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = getAdminDb();
    return NextResponse.json({ message: 'Firebase Admin initialized successfully!' }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: 'Failed to init Firebase Admin', error: error.message }, { status: 500 });
  }
}
