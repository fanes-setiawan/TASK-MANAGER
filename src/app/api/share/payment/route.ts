import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/server';
import { Filter } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('u');
    
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    let projectsRef;
    try {
      projectsRef = getAdminDb().collection('projects');
    } catch (e: any) {
      return NextResponse.json({ error: 'Firebase Init Error', message: e.message, stack: e.stack }, { status: 500 });
    }
    const snapshot = await projectsRef.where(
      Filter.or(
        Filter.where("createdBy", "==", userId),
        Filter.where("memberIds", "array-contains", userId)
      )
    ).get();

    const projects: any[] = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      
      // Convert Firestore Timestamps to plain objects for JSON serialization
      let createdAt = null;
      if (data.createdAt) {
        createdAt = {
          seconds: data.createdAt._seconds || 0,
          nanoseconds: data.createdAt._nanoseconds || 0
        };
      }
      
      projects.push({ 
        id: doc.id, 
        ...data,
        createdAt
      });
    });

    // Sort by createdAt descending
    projects.sort((a, b) => {
      const timeA = a.createdAt?.seconds || 0;
      const timeB = b.createdAt?.seconds || 0;
      return timeB - timeA;
    });

    return NextResponse.json({ projects }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching shared projects:', error);
    return NextResponse.json({ error: 'Internal Server Error', message: error.message, stack: error.stack }, { status: 500 });
  }
}
