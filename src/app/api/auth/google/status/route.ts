import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const db = getAdminDb();
    const tokenDoc = await db.collection('user_google_tokens').doc(userId).get();

    if (!tokenDoc.exists) {
      return NextResponse.json({ isConnected: false });
    }

    const data = tokenDoc.data();
    return NextResponse.json({
      isConnected: true,
      email: data?.email,
      name: data?.name,
      picture: data?.picture,
      connectedAt: data?.connectedAt,
    });
  } catch (error: any) {
    console.error('Error checking Google Drive status:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const db = getAdminDb();
    await db.collection('user_google_tokens').doc(userId).delete();

    return NextResponse.json({ success: true, message: 'Google Drive disconnected' });
  } catch (error: any) {
    console.error('Error disconnecting Google Drive:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

