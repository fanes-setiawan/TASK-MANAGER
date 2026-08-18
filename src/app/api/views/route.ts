import { NextResponse, NextRequest, userAgent } from 'next/server';
import { getAdminDb } from '@/lib/firebase/server';

export async function POST(req: NextRequest) {
  try {
    const { projectId, email } = await req.json();
    if (!projectId || !email) {
      return NextResponse.json({ error: "Missing projectId or email" }, { status: 400 });
    }

    const { os, browser } = userAgent(req);
    const deviceStr = os.name || browser.name ? `${os.name || 'Unknown OS'} - ${browser.name || 'Unknown Browser'}` : 'Unknown Device';

    const city = req.headers.get('x-vercel-ip-city');
    const country = req.headers.get('x-vercel-ip-country');
    const locationStr = city && country ? `${city}, ${country}` : 'Local / Unknown';

    const db = getAdminDb();
    const viewsRef = db.collection('projects').doc(projectId).collection('views');
    
    const newView = {
      projectId,
      email,
      viewedAt: new Date(),
      durationSeconds: 0,
      device: deviceStr,
      location: locationStr,
    };
    
    const docRef = await viewsRef.add(newView);
    return NextResponse.json({ viewId: docRef.id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { projectId, viewId, durationSeconds } = await req.json();
    if (!projectId || !viewId || durationSeconds === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const db = getAdminDb();
    const viewRef = db.collection('projects').doc(projectId).collection('views').doc(viewId);
    
    await viewRef.update({ durationSeconds });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    
    if (!projectId) {
      return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
    }

    const db = getAdminDb();
    const viewsRef = db.collection('projects').doc(projectId).collection('views');
    
    const snapshot = await viewsRef.orderBy('viewedAt', 'desc').get();
    
    const views = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        viewedAt: data.viewedAt?.toDate ? data.viewedAt.toDate().toISOString() : new Date().toISOString()
      };
    });
    
    return NextResponse.json({ views });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
