import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const db = getAdminDb();
    const mockupsRef = db.collection('mockup_projects');
    const snapshot = await mockupsRef.where('userId', '==', userId).get();

    const projects: any[] = [];
    snapshot.forEach(doc => {
      projects.push({ id: doc.id, ...doc.data() });
    });

    return NextResponse.json({ projects }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching mockups:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, userId, name, pages, updatedAt } = body;

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const db = getAdminDb();
    let docRef;

    if (id) {
      docRef = db.collection('mockup_projects').doc(id);
      await docRef.set({
        name,
        pages,
        updatedAt: updatedAt || Date.now(),
        userId
      }, { merge: true });
    } else {
      docRef = db.collection('mockup_projects').doc();
      await docRef.set({
        name: name || "Proyek Baru",
        pages: pages || [],
        updatedAt: updatedAt || Date.now(),
        userId
      });
    }

    return NextResponse.json({ success: true, id: docRef.id }, { status: 200 });
  } catch (error: any) {
    console.error('Error saving mockup:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
