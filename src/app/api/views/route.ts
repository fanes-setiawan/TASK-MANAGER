import { NextResponse, NextRequest, userAgent } from 'next/server';
import { getAdminDb } from '@/lib/firebase/server';
import { Resend } from 'resend';
import { renderProposalViewedEmail } from '@/lib/emails/templates/proposalViewed';

const resend = new Resend(process.env.RESEND_API_KEY || "fallback_key_to_prevent_crash");

async function sendNotificationEmail(db: any, projectId: string, viewData: any) {
  try {
    const projectDoc = await db.collection('projects').doc(projectId).get();
    if (!projectDoc.exists) return;
    const project = projectDoc.data();

    const ownerEmail = 'faneswork45@gmail.com';

    const htmlContent = renderProposalViewedEmail({
      viewed_at: viewData.viewedAt.toLocaleString('id-ID', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      proposal_title: project.title || 'Proposal Dokumen',
      visitor_email: viewData.email,
      duration: 'Baru saja dibuka',
      browser: viewData.device.split(' - ')[1] || 'Unknown',
      device: viewData.device.split(' - ')[0] || 'Unknown',
      location: viewData.location,
      proposal_url: `https://app.fanes.dev/share/${projectId}`,
      support_email: 'faneswork45@gmail.com',
      support_phone: '+62 88225409824',
      year: new Date().getFullYear().toString(),
      company_name: 'Fanes Workspace'
    });

    await resend.emails.send({
      from: 'Fanes Workspace <onboarding@resend.dev>',
      to: ownerEmail,
      subject: `Notifikasi: Proposal ${project.title || 'Anda'} sedang dilihat oleh ${viewData.email}`,
      html: htmlContent,
      text: `Proposal ${project.title || ''} Anda sedang dilihat oleh ${viewData.email} dari lokasi ${viewData.location}. Buka proposal di: https://app.fanes.dev/share/${projectId}`,
    });
    console.log('Email successfully sent to:', ownerEmail);
  } catch (error) {
    console.error('Failed to send email:', error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { projectId, email } = await req.json();
    if (!projectId || !email) {
      return NextResponse.json({ error: "Missing projectId or email" }, { status: 400 });
    }

    const { os, browser } = userAgent(req);
    const deviceStr = os.name || browser.name ? `${os.name || 'Unknown OS'} - ${browser.name || 'Unknown Browser'}` : 'Unknown Device';

    const city = req.headers.get('x-vercel-ip-city');
    const country = req.headers.get('x-vercel-ip-country');
    const locationStr = city && country ? `${city}, ${country}` : 'Local / Unknown';

    const db = getAdminDb();
    const viewsRef = db.collection('projects').doc(projectId).collection('views');

    // Check cooldown (0 minutes untuk keperluan TEST)
    const recentViewsSnapshot = await viewsRef.where('email', '==', email).get();
    let shouldSendEmail = true;
    if (!recentViewsSnapshot.empty) {
      // SET TO 0 FOR TESTING PURPOSES, NANTI BISA DIKEMBALIKAN KE 15 MENIT
      const fifteenMinutesAgo = Date.now() - 0 * 60 * 1000;
      recentViewsSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.viewedAt && data.viewedAt.toDate().getTime() > fifteenMinutesAgo) {
          shouldSendEmail = false;
        }
      });
    }

    const newView = {
      projectId,
      email,
      viewedAt: new Date(),
      durationSeconds: 0,
      device: deviceStr,
      location: locationStr,
    };

    const docRef = await viewsRef.add(newView);

    if (shouldSendEmail && process.env.RESEND_API_KEY) {
      console.log('Cooldown passed, sending email...');
      // fire and forget
      sendNotificationEmail(db, projectId, newView).catch(console.error);
    } else {
      console.log('Cooldown active or missing API key. Skipping email. shouldSendEmail:', shouldSendEmail);
    }

    return NextResponse.json({ viewId: docRef.id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { projectId, viewId, durationSeconds } = await req.json();
    if (!projectId || !viewId || durationSeconds === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const db = getAdminDb();
    const viewRef = db.collection('projects').doc(projectId).collection('views').doc(viewId);

    await viewRef.update({ durationSeconds });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
    }

    const db = getAdminDb();
    const viewsRef = db.collection('projects').doc(projectId).collection('views');

    const snapshot = await viewsRef.orderBy('viewedAt', 'desc').get();

    const views = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        viewedAt: data.viewedAt?.toDate ? data.viewedAt.toDate().toISOString() : new Date().toISOString()
      };
    });

    return NextResponse.json({ views });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
