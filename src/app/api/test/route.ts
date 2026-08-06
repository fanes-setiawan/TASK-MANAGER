import { NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ message: 'API is working', fb: typeof getFirestore }, { status: 200 });
}
