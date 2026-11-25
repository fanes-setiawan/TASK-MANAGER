import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/server';
import { getAuthenticatedDriveClient, getOrCreateFolder, uploadFileToDrive } from '@/lib/googleDrive';

export const maxDuration = 60; // Extend serverless function timeout to 60 seconds
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let linkId = '';
    let appName = '';
    let packageName = '';
    let privacyPolicyUrl = '';
    let email = '';
    let phoneNumber = '';
    let websiteUrl = '';
    let shortDescription = '';
    let fullDescription = '';
    let clientNotes = '';
    let demoHasAuth = false;
    let demoUsername = '';
    let demoPassword = '';
    let demoOtpPin = '';
    let demoInstructions = '';
    let hasTabletView = false;
    let preUploadedAssets: any = null;
    let appFolderId = '';
    let driveFolderUrl = '';

    // Files if multipart
    let aabFile: File | null = null;
    let logoFile: File | null = null;
    let featureGraphicFile: File | null = null;
    let screenshotFiles: File[] = [];
    let tabletScreenshotFiles: File[] = [];

    if (contentType.includes('application/json')) {
      const json = await request.json();
      linkId = json.linkId || '';
      appName = (json.appName || '').trim();
      packageName = (json.packageName || '').trim();
      privacyPolicyUrl = (json.privacyPolicyUrl || '').trim();
      email = (json.email || '').trim();
      phoneNumber = (json.phoneNumber || '').trim();
      websiteUrl = (json.websiteUrl || '').trim();
      shortDescription = (json.shortDescription || '').trim();
      fullDescription = (json.fullDescription || '').trim();
      clientNotes = (json.clientNotes || '').trim();
      demoHasAuth = !!json.demoHasAuth;
      demoUsername = (json.demoUsername || '').trim();
      demoPassword = (json.demoPassword || '').trim();
      demoOtpPin = (json.demoOtpPin || '').trim();
      demoInstructions = (json.demoInstructions || '').trim();
      hasTabletView = json.hasTabletView === 'yes' || json.hasTabletView === true;
      preUploadedAssets = json.uploadedAssets || null;
      appFolderId = json.appFolderId || '';
      driveFolderUrl = json.driveFolderUrl || '';
    } else {
      const formData = await request.formData();
      linkId = formData.get('linkId') as string;
      appName = (formData.get('appName') as string || '').trim();
      packageName = (formData.get('packageName') as string || '').trim();
      privacyPolicyUrl = (formData.get('privacyPolicyUrl') as string || '').trim();
      email = (formData.get('email') as string || '').trim();
      phoneNumber = (formData.get('phoneNumber') as string || '').trim();
      websiteUrl = (formData.get('websiteUrl') as string || '').trim();
      shortDescription = (formData.get('shortDescription') as string || '').trim();
      fullDescription = (formData.get('fullDescription') as string || '').trim();
      clientNotes = (formData.get('clientNotes') as string || '').trim();
      demoHasAuth = formData.get('demoHasAuth') === 'true';
      demoUsername = (formData.get('demoUsername') as string || '').trim();
      demoPassword = (formData.get('demoPassword') as string || '').trim();
      demoOtpPin = (formData.get('demoOtpPin') as string || '').trim();
      demoInstructions = (formData.get('demoInstructions') as string || '').trim();
      aabFile = formData.get('aabFile') as File | null;
      logoFile = formData.get('logo') as File | null;
      featureGraphicFile = formData.get('featureGraphic') as File | null;
      screenshotFiles = formData.getAll('screenshots') as File[];
      hasTabletView = formData.get('hasTabletView') === 'yes';
      tabletScreenshotFiles = formData.getAll('tabletScreenshots') as File[];
    }

    // Validations
    if (!appName) return NextResponse.json({ error: 'Nama Aplikasi wajib diisi' }, { status: 400 });
    if (!packageName) return NextResponse.json({ error: 'Package Name wajib diisi' }, { status: 400 });
    if (!/^([a-zA-Z_][a-zA-Z0-9_]*)+(\.[a-zA-Z_][a-zA-Z0-9_]*)+$/.test(packageName)) {
      return NextResponse.json({ error: 'Format Package Name tidak valid (contoh: com.example.namaaplikasi)' }, { status: 400 });
    }
    if (!privacyPolicyUrl) return NextResponse.json({ error: 'Link Kebijakan Privasi wajib diisi' }, { status: 400 });
    if (!email) return NextResponse.json({ error: 'Alamat Email wajib diisi' }, { status: 400 });
    if (!phoneNumber) return NextResponse.json({ error: 'Nomor Telepon wajib diisi' }, { status: 400 });
    if (!shortDescription) return NextResponse.json({ error: 'Deskripsi Singkat wajib diisi' }, { status: 400 });
    if (shortDescription.length > 80) return NextResponse.json({ error: 'Deskripsi Singkat maksimal 80 karakter' }, { status: 400 });
    if (!fullDescription) return NextResponse.json({ error: 'Deskripsi Lengkap wajib diisi' }, { status: 400 });
    if (fullDescription.length > 4000) return NextResponse.json({ error: 'Deskripsi Lengkap maksimal 4.000 karakter' }, { status: 400 });

    if (!preUploadedAssets) {
      if (!logoFile || typeof logoFile === 'string') {
        return NextResponse.json({ error: 'Logo Aplikasi (512x512) wajib diunggah' }, { status: 400 });
      }
      if (!featureGraphicFile || typeof featureGraphicFile === 'string') {
        return NextResponse.json({ error: 'Feature Graphic (1024x500) wajib diunggah' }, { status: 400 });
      }
      if (!screenshotFiles || screenshotFiles.length < 2) {
        return NextResponse.json({ error: 'Screenshot Aplikasi minimal 2 dan maksimal 8' }, { status: 400 });
      }
      if (screenshotFiles.length > 8) {
        return NextResponse.json({ error: 'Screenshot Aplikasi maksimal 8 buah' }, { status: 400 });
      }

      if (hasTabletView) {
        if (!tabletScreenshotFiles || tabletScreenshotFiles.length < 2) {
          return NextResponse.json({ error: 'Screenshot Tablet minimal 2 dan maksimal 8 jika opsi view tablet dipilih' }, { status: 400 });
        }
        if (tabletScreenshotFiles.length > 8) {
          return NextResponse.json({ error: 'Screenshot Tablet maksimal 8 buah' }, { status: 400 });
        }
      }
    } else {
      if (!preUploadedAssets.logo) {
        return NextResponse.json({ error: 'Logo Aplikasi (512x512) wajib diunggah' }, { status: 400 });
      }
      if (!preUploadedAssets.featureGraphic) {
        return NextResponse.json({ error: 'Feature Graphic (1024x500) wajib diunggah' }, { status: 400 });
      }
      if (!preUploadedAssets.screenshots || preUploadedAssets.screenshots.length < 2) {
        return NextResponse.json({ error: 'Screenshot Aplikasi minimal 2 dan maksimal 8' }, { status: 400 });
      }
      if (hasTabletView && (!preUploadedAssets.tabletScreenshots || preUploadedAssets.tabletScreenshots.length < 2)) {
        return NextResponse.json({ error: 'Screenshot Tablet minimal 2 dan maksimal 8 jika opsi view tablet dipilih' }, { status: 400 });
      }
    }

    const db = getAdminDb();

    // Verify link exists and get owner userId
    let ownerUserId = '';
    let linkDocRef: any = null;
    let linkData: any = null;

    if (linkId) {
      linkDocRef = db.collection('playstore_links').doc(linkId);
      const docSnap = await linkDocRef.get();
      if (docSnap.exists) {
        linkData = docSnap.data();
        ownerUserId = linkData?.userId;
      }
    }

    if (!ownerUserId) {
      const tokensSnap = await db.collection('user_google_tokens').limit(1).get();
      if (!tokensSnap.empty) {
        ownerUserId = tokensSnap.docs[0].id;
      }
    }

    let drive: any = null;
    let driveClientConnected = false;

    if (ownerUserId) {
      try {
        drive = await getAuthenticatedDriveClient(ownerUserId);
        driveClientConnected = true;
      } catch (err: any) {
        console.warn('Google Drive not connected or failed for user:', ownerUserId, err.message);
      }
    }

    const uploadedAssets: any = preUploadedAssets ? {
      ...preUploadedAssets,
      hasTabletView,
    } : {
      aab: null,
      logo: null,
      featureGraphic: null,
      screenshots: [],
      hasTabletView,
      tabletScreenshots: [],
    };

    const safeAppName = appName.replace(/[/\\?%*:|"<>]/g, '_');

    if (driveClientConnected && drive) {
      if (!preUploadedAssets) {
        // Create root folder: "Play Store Release Assets"
        const rootFolderId = await getOrCreateFolder(drive, 'Play Store Release Assets');

        // Create app specific folder: "[AppName] - [PackageName] (Date)"
        const dateStr = new Date().toISOString().split('T')[0];
        const appFolderTitle = `${safeAppName} - ${packageName} (${dateStr})`;
        appFolderId = await getOrCreateFolder(drive, appFolderTitle, rootFolderId);

        const folderMeta = await drive.files.get({
          fileId: appFolderId,
          fields: 'webViewLink',
        });
        driveFolderUrl = folderMeta.data.webViewLink || `https://drive.google.com/drive/folders/${appFolderId}`;

        // Create subfolders: "00_App_Bundle_AAB", "01_Store_Listing_Art", "02_Screenshots_Phone", "03_Screenshots_Tablet"
        const aabFolderId = await getOrCreateFolder(drive, '00_App_Bundle_AAB', appFolderId);
        const artFolderId = await getOrCreateFolder(drive, '01_Store_Listing_Art', appFolderId);
        const screenshotsFolderId = await getOrCreateFolder(drive, '02_Screenshots_Phone', appFolderId);
        let tabletFolderId = '';
        if (hasTabletView && tabletScreenshotFiles.length > 0) {
          tabletFolderId = await getOrCreateFolder(drive, '03_Screenshots_Tablet', appFolderId);
        }

        // Upload .AAB file if provided
        if (aabFile && typeof aabFile !== 'string' && aabFile.size > 0) {
          const aabBuffer = Buffer.from(await aabFile.arrayBuffer());
          const safeAabName = aabFile.name || `${safeAppName}-release.aab`;
          const aabResult = await uploadFileToDrive(
            drive,
            safeAabName,
            'application/octet-stream',
            aabBuffer,
            aabFolderId
          );
          uploadedAssets.aab = {
            name: aabFile.name,
            size: aabFile.size,
            id: aabResult.id,
            webViewLink: aabResult.webViewLink,
          };
        }

        // Upload Logo
        if (logoFile && typeof logoFile !== 'string') {
          const logoBuffer = Buffer.from(await logoFile.arrayBuffer());
          const logoExt = logoFile.name.split('.').pop() || 'png';
          const logoResult = await uploadFileToDrive(
            drive,
            `logo_512x512.${logoExt}`,
            logoFile.type || 'image/png',
            logoBuffer,
            artFolderId
          );
          uploadedAssets.logo = {
            name: logoFile.name,
            size: logoFile.size,
            id: logoResult.id,
            webViewLink: logoResult.webViewLink,
          };
        }

        // Upload Feature Graphic
        if (featureGraphicFile && typeof featureGraphicFile !== 'string') {
          const fgBuffer = Buffer.from(await featureGraphicFile.arrayBuffer());
          const fgExt = featureGraphicFile.name.split('.').pop() || 'png';
          const fgResult = await uploadFileToDrive(
            drive,
            `feature_graphic_1024x500.${fgExt}`,
            featureGraphicFile.type || 'image/png',
            fgBuffer,
            artFolderId
          );
          uploadedAssets.featureGraphic = {
            name: featureGraphicFile.name,
            size: featureGraphicFile.size,
            id: fgResult.id,
            webViewLink: fgResult.webViewLink,
          };
        }

        // Upload Screenshots
        let ssIndex = 1;
        for (const ss of screenshotFiles) {
          const ssBuffer = Buffer.from(await ss.arrayBuffer());
          const ssExt = ss.name.split('.').pop() || 'png';
          const ssResult = await uploadFileToDrive(
            drive,
            `screenshot_${String(ssIndex).padStart(2, '0')}.${ssExt}`,
            ss.type || 'image/png',
            ssBuffer,
            screenshotsFolderId
          );
          uploadedAssets.screenshots.push({
            name: ss.name,
            size: ss.size,
            id: ssResult.id,
            webViewLink: ssResult.webViewLink,
          });
          ssIndex++;
        }

        // Upload Tablet Screenshots if enabled
        if (hasTabletView && tabletFolderId && tabletScreenshotFiles.length > 0) {
          let tIndex = 1;
          for (const tss of tabletScreenshotFiles) {
            const tssBuffer = Buffer.from(await tss.arrayBuffer());
            const tssExt = tss.name.split('.').pop() || 'png';
            const tssResult = await uploadFileToDrive(
              drive,
              `tablet_screenshot_${String(tIndex).padStart(2, '0')}.${tssExt}`,
              tss.type || 'image/png',
              tssBuffer,
              tabletFolderId
            );
            uploadedAssets.tabletScreenshots.push({
              name: tss.name,
              size: tss.size,
              id: tssResult.id,
              webViewLink: tssResult.webViewLink,
            });
            tIndex++;
          }
        }
      }

      // Create README text file
      const infoText = `DATA & INFORMASI APLIKASI
==========================
Nama Aplikasi: ${appName}
Package Name: ${packageName}
Link Kebijakan Privasi: ${privacyPolicyUrl}
Email Kontak/Support: ${email}
Nomor Telepon: ${phoneNumber}
Website Aplikasi: ${websiteUrl || '-'}

DESKRIPSI SINGKAT:
${shortDescription}

DESKRIPSI LENGKAP:
${fullDescription}

INFORMASI AKUN DEMO (UNTUK REVIEW PLAY STORE):
${demoHasAuth ? `Username/Email: ${demoUsername}\nPassword: ${demoPassword}\nOTP/PIN: ${demoOtpPin || '-'}\nInstruksi: ${demoInstructions || '-'}` : 'Aplikasi tidak memerlukan login (No auth required)'}

CATATAN / PESAN DARI KLIEN:
${clientNotes || '-'}

Disubmit pada: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}
`;
      await uploadFileToDrive(
        drive,
        `info_aplikasi_${safeAppName}.txt`,
        'text/plain',
        Buffer.from(infoText, 'utf-8'),
        appFolderId
      );
    } else {
      if (aabFile && typeof aabFile !== 'string') {
        uploadedAssets.aab = { name: aabFile.name, size: aabFile.size, note: 'Drive not connected yet' };
      }
      if (logoFile && typeof logoFile !== 'string') {
        uploadedAssets.logo = { name: logoFile.name, size: logoFile.size, note: 'Drive not connected yet' };
      }
      if (featureGraphicFile && typeof featureGraphicFile !== 'string') {
        uploadedAssets.featureGraphic = { name: featureGraphicFile.name, size: featureGraphicFile.size, note: 'Drive not connected yet' };
      }
      uploadedAssets.screenshots = screenshotFiles.map(ss => ({ name: ss.name, size: ss.size, note: 'Drive not connected yet' }));
      if (hasTabletView) {
        uploadedAssets.tabletScreenshots = tabletScreenshotFiles.map(tss => ({ name: tss.name, size: tss.size, note: 'Drive not connected yet' }));
      }
    }

    // Save record to Firestore
    const submissionData = {
      linkId: linkId || null,
      clientName: linkData?.clientName || appName,
      appName,
      packageName,
      privacyPolicyUrl,
      email,
      phoneNumber,
      websiteUrl: websiteUrl || null,
      shortDescription,
      fullDescription,
      clientNotes: clientNotes || null,
      demoAccount: {
        hasAuth: demoHasAuth,
        username: demoUsername || null,
        password: demoPassword || null,
        otpPin: demoOtpPin || null,
        instructions: demoInstructions || null,
      },
      uploadedAssets,
      driveFolderUrl: driveFolderUrl || null,
      ownerUserId: ownerUserId || null,
      submittedAt: new Date(),
      status: 'submitted',
    };

    const submissionRef = await db.collection('playstore_submissions').add(submissionData);

    if (linkDocRef) {
      await linkDocRef.update({
        submissionCount: (linkData?.submissionCount || 0) + 1,
        lastSubmittedAt: new Date(),
      });
    }

    return NextResponse.json({
      success: true,
      submissionId: submissionRef.id,
      driveFolderUrl,
      ownerPhone: linkData?.ownerPhone || null,
      clientName: linkData?.clientName || appName,
      appName,
      message: 'Asset berhasil diunggah dan disimpan!',
    });
  } catch (error: any) {
    console.error('Error submitting playstore asset form:', error);
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan server saat menyimpan form' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    const db = getAdminDb();
    let query: any = db.collection('playstore_submissions');

    if (userId) {
      query = query.where('ownerUserId', '==', userId);
    }

    const snapshot = await query.get();
    const submissions = snapshot.docs
      .map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
        submittedAt: doc.data().submittedAt?.toDate ? doc.data().submittedAt.toDate().toISOString() : doc.data().submittedAt,
      }))
      .sort((a: any, b: any) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime());

    return NextResponse.json({ submissions });
  } catch (error: any) {
    console.error('Error fetching submissions:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'ID Submisi dan status baru diperlukan' }, { status: 400 });
    }

    const validStatuses = ['submitted', 'in_review', 'rejected', 'published'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Status tidak valid' }, { status: 400 });
    }

    const db = getAdminDb();
    const docRef = db.collection('playstore_submissions').doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Data submisi tidak ditemukan' }, { status: 404 });
    }

    await docRef.update({
      status,
      updatedAt: new Date(),
    });

    return NextResponse.json({ success: true, message: 'Status submisi berhasil diperbarui', status });
  } catch (error: any) {
    console.error('Error updating submission status:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID Submisi diperlukan' }, { status: 400 });
    }

    const db = getAdminDb();
    const docRef = db.collection('playstore_submissions').doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Data submisi tidak ditemukan' }, { status: 404 });
    }

    await docRef.delete();

    return NextResponse.json({ success: true, message: 'Data submisi berhasil dihapus' });
  } catch (error: any) {
    console.error('Error deleting submission:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
