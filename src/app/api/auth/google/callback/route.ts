import { NextResponse } from 'next/server';
import { getOAuth2Client } from '@/lib/googleDrive';
import { getAdminDb } from '@/lib/firebase/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const userId = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(
        new URL(`/dashboard/playstore-assets?error=${encodeURIComponent(error)}`, request.url)
      );
    }

    if (!code || !userId) {
      return NextResponse.redirect(
        new URL('/dashboard/playstore-assets?error=invalid_callback_params', request.url)
      );
    }

    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Fetch user info from Google
    const oauth2 = (await import('googleapis')).google.oauth2({
      auth: oauth2Client,
      version: 'v2',
    });
    const userInfo = await oauth2.userinfo.get();

    // Store in Firestore
    const db = getAdminDb();
    await db.collection('user_google_tokens').doc(userId).set({
      userId,
      email: userInfo.data.email || '',
      name: userInfo.data.name || '',
      picture: userInfo.data.picture || '',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date,
      connectedAt: new Date(),
    }, { merge: true });

    return NextResponse.redirect(
      new URL('/dashboard/playstore-assets?gdrive=connected', request.url)
    );
  } catch (err: any) {
    console.error('Error in Google OAuth callback:', err);
    return NextResponse.redirect(
      new URL(`/dashboard/playstore-assets?error=${encodeURIComponent(err.message || 'auth_failed')}`, request.url)
    );
  }
}

