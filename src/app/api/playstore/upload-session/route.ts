import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/server';
import { getAuthenticatedDriveClient, getOrCreateFolder, createResumableUploadSession } from '@/lib/googleDrive';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { linkId, appName, packageName, fileName, fileSize, mimeType, fileCategory } = body;

    if (!fileName || !fileSize) {
      return NextResponse.json({ error: 'Nama dan ukuran berkas diperlukan' }, { status: 400 });
    }

    // Limit check: AAB up to 500MB, other files up to 100MB
    const isAab = fileCategory === 'aab' || fileName.toLowerCase().endsWith('.aab');
    const maxSizeBytes = isAab ? 500 * 1024 * 1024 : 100 * 1024 * 1024;
    const limitLabel = isAab ? '500 MB' : '100 MB';

    if (fileSize > maxSizeBytes) {
      return NextResponse.json(
        { error: `Ukuran file "${fileName}" (${(fileSize / (1024 * 1024)).toFixed(1)} MB) melebihi batas maksimum ${limitLabel}.` },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    let ownerUserId = '';

    if (linkId) {
      const linkDoc = await db.collection('playstore_links').doc(linkId).get();
      if (linkDoc.exists) {
        ownerUserId = linkDoc.data()?.userId;
      }
    }

    if (!ownerUserId) {
      const tokensSnap = await db.collection('user_google_tokens').limit(1).get();
      if (!tokensSnap.empty) {
        ownerUserId = tokensSnap.docs[0].id;
      }
    }

    if (!ownerUserId) {
      return NextResponse.json({ error: 'Akun Google Drive admin belum terhubung' }, { status: 400 });
    }

    // Prepare Google Drive Folders
    const drive = await getAuthenticatedDriveClient(ownerUserId);
    const rootFolderId = await getOrCreateFolder(drive, 'Play Store Release Assets');

    const safeAppName = (appName || 'Aplikasi').replace(/[/\\?%*:|"<>]/g, '_');
    const safePkg = (packageName || 'package').replace(/[/\\?%*:|"<>]/g, '_');
    const dateStr = new Date().toISOString().split('T')[0];
    const appFolderTitle = `${safeAppName} - ${safePkg} (${dateStr})`;
    const appFolderId = await getOrCreateFolder(drive, appFolderTitle, rootFolderId);

    // Get subfolder ID based on category
    let targetSubfolderId = appFolderId;
    if (isAab) {
      targetSubfolderId = await getOrCreateFolder(drive, '00_App_Bundle_AAB', appFolderId);
    } else if (fileCategory === 'logo' || fileCategory === 'featureGraphic') {
      targetSubfolderId = await getOrCreateFolder(drive, '01_Store_Listing_Art', appFolderId);
    } else if (fileCategory === 'screenshot') {
      targetSubfolderId = await getOrCreateFolder(drive, '02_Screenshots_Phone', appFolderId);
    } else if (fileCategory === 'tabletScreenshot') {
      targetSubfolderId = await getOrCreateFolder(drive, '03_Screenshots_Tablet', appFolderId);
    }

    // Get folder webViewLink
    const folderMeta = await drive.files.get({
      fileId: appFolderId,
      fields: 'webViewLink',
    });
    const driveFolderUrl = folderMeta.data.webViewLink || `https://drive.google.com/drive/folders/${appFolderId}`;

    // Create Resumable Upload Session
    const session = await createResumableUploadSession(
      ownerUserId,
      fileName,
      mimeType || 'application/octet-stream',
      fileSize,
      targetSubfolderId
    );

    return NextResponse.json({
      success: true,
      uploadUrl: session.uploadUrl,
      appFolderId,
      driveFolderUrl,
    });
  } catch (error: any) {
    console.error('Error creating upload session:', error);
    return NextResponse.json({ error: error.message || 'Gagal menyiapkan sesi upload' }, { status: 500 });
  }
}
