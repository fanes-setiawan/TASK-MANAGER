import { google } from 'googleapis';
import { getAdminDb } from './firebase/server';
import { Readable } from 'stream';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/google/callback`;

export function getOAuth2Client() {
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
}

export const GOOGLE_DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

export async function getAuthenticatedDriveClient(userId: string) {
  const db = getAdminDb();
  const tokenDoc = await db.collection('user_google_tokens').doc(userId).get();

  if (!tokenDoc.exists) {
    throw new Error('Google Drive account not connected. Please connect Google Drive in dashboard.');
  }

  const tokens = tokenDoc.data();
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: tokens?.access_token,
    refresh_token: tokens?.refresh_token,
    expiry_date: tokens?.expiry_date,
  });

  oauth2Client.on('tokens', async (newTokens) => {
    const updatePayload: any = {
      updatedAt: new Date(),
    };
    if (newTokens.access_token) updatePayload.access_token = newTokens.access_token;
    if (newTokens.expiry_date) updatePayload.expiry_date = newTokens.expiry_date;
    if (newTokens.refresh_token) updatePayload.refresh_token = newTokens.refresh_token;

    await db.collection('user_google_tokens').doc(userId).set(updatePayload, { merge: true });
  });

  const drive = google.drive({ version: 'v3', auth: oauth2Client });
  return drive;
}

/**
 * Creates a resumable upload session on Google Drive.
 * Returns the resumable session URL (upload URI) that allows direct HTTP PUT upload from the browser.
 */
export async function createResumableUploadSession(
  userId: string,
  fileName: string,
  mimeType: string,
  fileSize: number,
  folderId?: string
): Promise<{ uploadUrl: string; driveFolderId?: string }> {
  const db = getAdminDb();
  const tokenDoc = await db.collection('user_google_tokens').doc(userId).get();

  if (!tokenDoc.exists) {
    throw new Error('Akun Google Drive belum terhubung.');
  }

  const tokens = tokenDoc.data();
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: tokens?.access_token,
    refresh_token: tokens?.refresh_token,
    expiry_date: tokens?.expiry_date,
  });

  // Get a fresh token if needed
  const tokenResponse = await oauth2Client.getAccessToken();
  const validAccessToken = tokenResponse.token || tokens?.access_token;

  const metadata: any = {
    name: fileName,
    mimeType: mimeType || 'application/octet-stream',
  };
  if (folderId) {
    metadata.parents = [folderId];
  }

  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${validAccessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Type': mimeType || 'application/octet-stream',
      'X-Upload-Content-Length': String(fileSize),
    },
    body: JSON.stringify(metadata),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gagal membuat upload session ke Google Drive: ${errorText}`);
  }

  const uploadUrl = response.headers.get('Location');
  if (!uploadUrl) {
    throw new Error('Google Drive tidak mengembalikan URL upload resumable.');
  }

  return { uploadUrl, driveFolderId: folderId };
}

/**
 * Creates or gets existing subfolder inside a parent folder
 */
export async function getOrCreateFolder(drive: any, folderName: string, parentFolderId?: string): Promise<string> {
  const escapedName = folderName.replace(/'/g, "\\'");
  let query = `mimeType = 'application/vnd.google-apps.folder' and name = '${escapedName}' and trashed = false`;
  if (parentFolderId) {
    query += ` and '${parentFolderId}' in parents`;
  }

  const res = await drive.files.list({
    q: query,
    fields: 'files(id, name)',
    spaces: 'drive',
  });

  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id!;
  }

  const fileMetadata: any = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
  };
  if (parentFolderId) {
    fileMetadata.parents = [parentFolderId];
  }

  const folder = await drive.files.create({
    requestBody: fileMetadata,
    fields: 'id',
  });

  return folder.data.id!;
}

/**
 * Uploads a buffer file to a specific folder on Google Drive
 */
export async function uploadFileToDrive(
  drive: any,
  fileName: string,
  mimeType: string,
  buffer: Buffer,
  folderId?: string
) {
  const readableStream = new Readable();
  readableStream.push(buffer);
  readableStream.push(null);

  const fileMetadata: any = {
    name: fileName,
  };
  if (folderId) {
    fileMetadata.parents = [folderId];
  }

  const media = {
    mimeType: mimeType,
    body: readableStream,
  };

  const response = await drive.files.create({
    requestBody: fileMetadata,
    media: media,
    fields: 'id, name, webViewLink, webContentLink, thumbnailLink',
  });

  // Make public read-only for easy viewing from dashboard if desired
  try {
    await drive.permissions.create({
      fileId: response.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });
  } catch (err) {
    console.warn('Could not set public permission on uploaded file:', err);
  }

  return response.data;
}

