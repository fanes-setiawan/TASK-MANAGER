import { NextResponse } from 'next/server';
import { getOAuth2Client, GOOGLE_DRIVE_SCOPES } from '@/lib/googleDrive';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const oauth2Client = getOAuth2Client();

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: GOOGLE_DRIVE_SCOPES,
      state: userId, // pass userId so callback knows who to link
    });

    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    console.error('Error initiating Google OAuth:', error);
    return NextResponse.json({ error: error.message || 'Failed to initiate Google OAuth' }, { status: 500 });
  }
}

