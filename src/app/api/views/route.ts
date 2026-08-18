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
    
    // We send to faneswork45@gmail.com by default as requested or to the creator if available
    // Since we don't have creator email stored directly on project (usually), we use a default
    // or you can configure this to your email
    const ownerEmail = 'faneswork45@gmail.com'; 

    const htmlContent = renderProposalViewedEmail({
      viewed_at: viewData.viewedAt.toLocaleString('id-ID', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      proposal_title: project.title || 'Proposal Dokumen',
      visitor_email: viewData.email,
      duration: 'Baru saja dibuka',
      browser: viewData.device.split(' - ')[1] || 'Unknown',
      device: viewData.device.split(' - ')[0] || 'Unknown',
      location: viewData.location,
      proposal_url: `https://app.fanes.dev/dashboard/proposal-preview?id=${projectId}`, // adjust to your actual domain
      support_email: 'hello@fanes.dev',
      support_phone: '+62 800 0000 000',
      year: new Date().getFullYear().toString(),
      company_name: 'Fanes Workspace'
    });

    await resend.emails.send({
      from: 'Notifikasi <onboarding@resend.dev>',
      to: ownerEmail,
      subject: `Proposal ${project.title || ''} Dilihat - ${viewData.email}`,
      html: htmlContent,
    });
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
    
    // Check cooldown (15 minutes)
    const recentViewsSnapshot = await viewsRef.where('email', '==', email).get();
    let shouldSendEmail = true;
    if (!recentViewsSnapshot.empty) {
      const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000;
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
      // fire and forget
      sendNotificationEmail(db, projectId, newView).catch(console.error);
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
