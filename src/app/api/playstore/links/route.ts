import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const id = searchParams.get('id');

    const db = getAdminDb();

    if (id) {
      const doc = await db.collection('playstore_links').doc(id).get();
      if (!doc.exists) {
        return NextResponse.json({ error: 'Link tidak ditemukan atau kadaluarsa' }, { status: 404 });
      }
      return NextResponse.json({ link: { id: doc.id, ...doc.data() } });
    }

    if (!userId) {
      return NextResponse.json({ error: 'User ID diperlukan' }, { status: 400 });
    }

    const snapshot = await db
      .collection('playstore_links')
      .where('userId', '==', userId)
      .get();

    const links = snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate().toISOString() : doc.data().createdAt,
      }))
      .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    return NextResponse.json({ links });
  } catch (error: any) {
    console.error('Error fetching playstore links:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, clientName, appNameTarget, notes, ownerPhone } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID diperlukan' }, { status: 400 });
    }
    if (!clientName) {
      return NextResponse.json({ error: 'Nama Klien/Proyek wajib diisi' }, { status: 400 });
    }

    const db = getAdminDb();
    const newLink = {
      userId,
      clientName: clientName.trim(),
      appNameTarget: (appNameTarget || '').trim(),
      notes: (notes || '').trim(),
      ownerPhone: (ownerPhone || '').trim(),
      createdAt: new Date(),
      submissionCount: 0,
      status: 'active',
    };

    const docRef = await db.collection('playstore_links').add(newLink);

    return NextResponse.json({
      success: true,
      link: {
        id: docRef.id,
        ...newLink,
      },
    });
  } catch (error: any) {
    console.error('Error creating playstore link:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Link ID diperlukan' }, { status: 400 });
    }

    const db = getAdminDb();
    await db.collection('playstore_links').doc(id).delete();

    return NextResponse.json({ success: true, message: 'Link berhasil dihapus' });
  } catch (error: any) {
    console.error('Error deleting playstore link:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'ID Link dan status diperlukan' }, { status: 400 });
    }

    if (!['active', 'inactive'].includes(status)) {
      return NextResponse.json({ error: 'Status link harus active atau inactive' }, { status: 400 });
    }

    const db = getAdminDb();
    const docRef = db.collection('playstore_links').doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Link tidak ditemukan' }, { status: 404 });
    }

    await docRef.update({
      status,
      updatedAt: new Date(),
    });

    return NextResponse.json({ success: true, message: `Status link berhasil diubah menjadi ${status}`, status });
  } catch (error: any) {
    console.error('Error updating playstore link status:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

