import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/server';
import { getAuthenticatedDriveClient } from '@/lib/googleDrive';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const drive = await getAuthenticatedDriveClient(userId);
    const db = getAdminDb();

    // 1. Get root parent folder 'Play Store Release Assets'
    const parentRes = await drive.files.list({
      q: "name = 'Play Store Release Assets' and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
      fields: 'files(id, name)',
    });

    if (!parentRes.data.files || parentRes.data.files.length === 0) {
      return NextResponse.json({ unlinkedFolders: [] });
    }

    const parentId = parentRes.data.files[0].id!;

    // 2. Get all subfolders inside 'Play Store Release Assets'
    const subfoldersRes = await drive.files.list({
      q: `'${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id, name, createdTime, webViewLink)',
    });

    const driveFolders = subfoldersRes.data.files || [];

    // 3. Get all active submission appFolderIds or URLs from database
    const subSnap = await db.collection('playstore_submissions').get();
    const linkedFolderIds = new Set<string>();

    subSnap.forEach((doc: any) => {
      const data = doc.data();
      if (data.appFolderId) {
        linkedFolderIds.add(data.appFolderId);
      }
      if (data.driveFolderUrl) {
        const match = data.driveFolderUrl.match(/\/folders\/([a-zA-Z0-9_-]+)/);
        if (match && match[1]) {
          linkedFolderIds.add(match[1]);
        }
      }
    });

    // 4. Identify folders that do NOT belong to any completed submission
    const unlinkedFolders = driveFolders
      .filter((f) => f.id && !linkedFolderIds.has(f.id))
      .map((f) => ({
        id: f.id,
        name: f.name,
        createdTime: f.createdTime,
        webViewLink: f.webViewLink || `https://drive.google.com/drive/folders/${f.id}`,
      }));

    return NextResponse.json({ unlinkedFolders });
  } catch (error: any) {
    console.error('Error fetching unlinked drive folders:', error);
    return NextResponse.json({ error: error.message || 'Gagal memuat folder Google Drive' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const folderId = searchParams.get('folderId');

    if (!userId || !folderId) {
      return NextResponse.json({ error: 'userId and folderId are required' }, { status: 400 });
    }

    const drive = await getAuthenticatedDriveClient(userId);

    // Verify folder before deletion
    const fileMeta = await drive.files.get({
      fileId: folderId,
      fields: 'id, name, mimeType',
    });

    if (
      fileMeta.data.mimeType !== 'application/vnd.google-apps.folder' ||
      fileMeta.data.name === 'Play Store Release Assets' ||
      fileMeta.data.id === 'root'
    ) {
      return NextResponse.json({ error: 'Aksi ditolak: Folder tidak valid atau folder root terproteksi.' }, { status: 400 });
    }

    await drive.files.delete({ fileId: folderId });

    return NextResponse.json({
      success: true,
      message: `Folder "${fileMeta.data.name}" berhasil dihapus permanen dari Google Drive.`,
    });
  } catch (error: any) {
    console.error('Error deleting unlinked folder:', error);
    return NextResponse.json({ error: error.message || 'Gagal menghapus folder Google Drive' }, { status: 500 });
  }
}
