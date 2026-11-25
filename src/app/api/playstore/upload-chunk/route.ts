import { NextResponse } from 'next/server';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const uploadUrl = request.headers.get('x-upload-url');
    const contentRange = request.headers.get('content-range');
    const contentType = request.headers.get('content-type') || 'application/octet-stream';

    if (!uploadUrl) {
      return NextResponse.json({ error: 'x-upload-url header is required' }, { status: 400 });
    }

    const chunkBuffer = Buffer.from(await request.arrayBuffer());

    const driveHeaders: Record<string, string> = {
      'Content-Type': contentType,
      'Content-Length': String(chunkBuffer.length),
    };

    if (contentRange) {
      driveHeaders['Content-Range'] = contentRange;
    }

    const driveRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: driveHeaders,
      body: chunkBuffer,
    });

    const status = driveRes.status;
    const rangeHeader = driveRes.headers.get('Range');

    if (status === 308) {
      // 308 Resume Incomplete: Chunk received, expecting next chunk
      return NextResponse.json({
        status: 308,
        range: rangeHeader,
      }, { status: 200 });
    }

    if (status === 200 || status === 201) {
      // Upload Complete!
      const driveData = await driveRes.json();
      return NextResponse.json({
        status: 200,
        completed: true,
        file: driveData,
      }, { status: 200 });
    }

    const errorText = await driveRes.text();
    return NextResponse.json({
      error: `Google Drive upload error: ${status} ${errorText}`,
    }, { status: status >= 400 && status < 600 ? status : 500 });

  } catch (error: any) {
    console.error('Error in proxy chunk upload:', error);
    return NextResponse.json({ error: error.message || 'Chunk proxy failed' }, { status: 500 });
  }
}
