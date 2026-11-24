import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/server';
import { getAuthenticatedDriveClient } from '@/lib/googleDrive';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const submissionId = searchParams.get('submissionId');
    const fileId = searchParams.get('fileId');

    if (!submissionId || !fileId) {
      return NextResponse.json({ error: 'submissionId and fileId are required' }, { status: 400 });
    }

    const db = getAdminDb();
    const subDoc = await db.collection('playstore_submissions').doc(submissionId).get();

    if (!subDoc.exists) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    const subData = subDoc.data();
    const ownerUserId = subData?.ownerUserId;

    if (!ownerUserId) {
      return NextResponse.json({ error: 'Owner of submission not found' }, { status: 400 });
    }

    const drive = await getAuthenticatedDriveClient(ownerUserId);

    // Get file metadata to know the mimeType and name
    const fileMeta = await drive.files.get({
      fileId: fileId,
      fields: 'name, mimeType, size',
    });

    const response = await drive.files.get(
      { fileId: fileId, alt: 'media' },
      { responseType: 'arraybuffer' }
    );

    const buffer = Buffer.from(response.data as ArrayBuffer);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': fileMeta.data.mimeType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileMeta.data.name || 'asset')}"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error('Error proxying download file:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

