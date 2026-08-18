export interface ProposalViewedEmailProps {
  viewed_at: string;
  proposal_title: string;
  visitor_email: string;
  duration: string;
  browser: string;
  device: string;
  location: string;
  proposal_url: string;
  support_email: string;
  support_phone: string;
  year: string;
  company_name: string;
}

export function renderProposalViewedEmail(props: ProposalViewedEmailProps) {
  return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <title>Proposal Telah Dilihat</title>
</head>

<body style="margin:0; padding:0; background-color:#f3f5f8; font-family:Arial, Helvetica, sans-serif; color:#172033;">

  <!-- Wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f3f5f8; margin:0; padding:30px 15px;">
    <tr>
      <td align="center">

        <!-- Main Container -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:680px; background-color:#ffffff; border-radius:16px; overflow:hidden;">

          <!-- Top Bar -->
          <tr>
            <td style="background-color:#080d18; padding:16px 30px; border-bottom:1px solid #1d2636;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-size:12px; color:#aeb7c6;">
                    Notifikasi Proposal
                  </td>

                  <td align="right" style="font-size:12px; color:#aeb7c6;">
                    ${props.viewed_at}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Hero -->
          <tr>
            <td style="background-color:#080d18; padding:42px 40px 45px;">

              <!-- Logo -->
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:middle;">
                    <div style="width:32px; height:32px; line-height:32px; text-align:center; background-color:#c9973e; color:#080d18; border-radius:8px; font-size:18px; font-weight:bold;">
                      ◆
                    </div>
                  </td>

                  <td style="padding-left:12px; color:#e7b85c; font-size:20px; font-weight:bold; letter-spacing:1px;">
                    RESEND
                  </td>
                </tr>
              </table>

              <div style="height:38px;"></div>

              <!-- Label -->
              <div style="font-size:11px; letter-spacing:4px; color:#d6a84c; font-weight:bold; text-transform:uppercase;">
                Proposal Notification
              </div>

              <div style="height:14px;"></div>

              <!-- Heading -->
              <div style="font-size:38px; line-height:1.15; color:#ffffff; font-family:Georgia, 'Times New Roman', serif;">
                Proposal Anda
              </div>

              <div style="font-size:38px; line-height:1.15; color:#d6a84c; font-family:Georgia, 'Times New Roman', serif;">
                Telah Dilihat
              </div>

              <div style="height:20px;"></div>

              <div style="font-size:15px; line-height:1.7; color:#aeb7c6; max-width:500px;">
                Seseorang baru saja membuka dan melihat proposal yang Anda kirimkan.
                Berikut adalah detail aktivitas pengunjung.
              </div>

            </td>
          </tr>

          <!-- Proposal Info -->
          <tr>
            <td style="padding:32px 35px 10px;">

              <div style="font-size:13px; color:#8b95a5; margin-bottom:8px;">
                PROPOSAL
              </div>

              <div style="font-size:22px; font-weight:bold; color:#172033;">
                ${props.proposal_title}
              </div>

            </td>
          </tr>

          <!-- Visitor Card -->
          <tr>
            <td style="padding:20px 35px 30px;">

              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e4e8ee; border-radius:12px;">

                <!-- Card Header -->
                <tr>
                  <td colspan="2" style="padding:22px 24px; border-bottom:1px solid #e4e8ee;">

                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>

                        <td style="vertical-align:middle;">
                          <div style="width:42px; height:42px; line-height:42px; text-align:center; background-color:#0b1220; border-radius:10px; color:#d6a84c; font-size:19px;">
                            ●
                          </div>
                        </td>

                        <td style="padding-left:13px;">
                          <div style="font-size:17px; font-weight:bold; color:#172033;">
                            Informasi Pengunjung
                          </div>

                          <div style="font-size:12px; color:#8b95a5; margin-top:4px;">
                            Detail aktivitas proposal
                          </div>
                        </td>

                      </tr>
                    </table>

                  </td>
                </tr>

                <!-- Email -->
                <tr>
                  <td style="padding:18px 24px 8px; width:42%; font-size:12px; color:#8b95a5;">
                    Email
                  </td>

                  <td style="padding:18px 24px 8px; font-size:13px; color:#172033; font-weight:bold;">
                    ${props.visitor_email}
                  </td>
                </tr>

                <!-- Viewed -->
                <tr>
                  <td style="padding:8px 24px; font-size:12px; color:#8b95a5;">
                    Dilihat
                  </td>

                  <td style="padding:8px 24px; font-size:13px; color:#172033; font-weight:bold;">
                    ${props.viewed_at}
                  </td>
                </tr>

                <!-- Duration -->
                <tr>
                  <td style="padding:8px 24px; font-size:12px; color:#8b95a5;">
                    Durasi Kunjungan
                  </td>

                  <td style="padding:8px 24px; font-size:13px; color:#172033; font-weight:bold;">
                    ${props.duration}
                  </td>
                </tr>

                <!-- Browser -->
                <tr>
                  <td style="padding:8px 24px; font-size:12px; color:#8b95a5;">
                    Browser & Device
                  </td>

                  <td style="padding:8px 24px; font-size:13px; color:#172033; font-weight:bold;">
                    ${props.browser} · ${props.device}
                  </td>
                </tr>

                <!-- Location -->
                <tr>
                  <td style="padding:8px 24px 20px; font-size:12px; color:#8b95a5;">
                    Lokasi
                  </td>

                  <td style="padding:8px 24px 20px; font-size:13px; color:#172033; font-weight:bold;">
                    ${props.location}
                  </td>
                </tr>

              </table>

            </td>
          </tr>

          <!-- Status -->
          <tr>
            <td style="padding:0 35px 25px;">

              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f7f8fa; border-radius:12px;">
                <tr>
                  <td style="padding:20px 22px;">

                    <div style="font-size:12px; color:#8b95a5; margin-bottom:7px;">
                      STATUS
                    </div>

                    <div style="font-size:14px; color:#172033; font-weight:bold;">
                      ● &nbsp; Proposal sedang dilihat
                    </div>

                    <div style="font-size:12px; line-height:1.6; color:#697386; margin-top:7px;">
                      Pengunjung telah membuka proposal Anda.
                      Ini dapat menjadi waktu yang tepat untuk melakukan follow-up.
                    </div>

                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding:5px 35px 35px;">

              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#080d18; border-radius:12px;">
                <tr>

                  <td style="padding:24px 25px;">

                    <div style="font-size:18px; color:#ffffff; font-weight:bold;">
                      Lihat Proposal
                    </div>

                    <div style="font-size:12px; color:#9da7b6; margin-top:6px;">
                      Buka kembali proposal yang telah Anda kirimkan.
                    </div>

                  </td>

                  <td align="right" style="padding:24px 25px;">

                    <a href="${props.proposal_url}"
                       style="display:inline-block; background-color:#d6a84c; color:#080d18; text-decoration:none; font-size:13px; font-weight:bold; padding:13px 20px; border-radius:8px;">
                      Buka Proposal &nbsp; →
                    </a>

                  </td>

                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#080d18; padding:30px 35px;">

              <table width="100%" cellpadding="0" cellspacing="0" border="0">

                <tr>

                  <td style="vertical-align:top; width:50%;">

                    <div style="font-size:18px; font-weight:bold; color:#d6a84c; letter-spacing:1px;">
                      RESEND
                    </div>

                    <div style="height:10px;"></div>

                    <div style="font-size:12px; line-height:1.6; color:#8f99a8;">
                      Platform proposal profesional
                      untuk bisnis modern.
                    </div>

                  </td>

                  <td style="vertical-align:top; width:50%;">

                    <div style="font-size:14px; color:#d6a84c; font-weight:bold;">
                      Butuh bantuan?
                    </div>

                    <div style="height:8px;"></div>

                    <div style="font-size:12px; line-height:1.8; color:#9da7b6;">
                      ${props.support_email}<br>
                      ${props.support_phone}
                    </div>

                  </td>

                </tr>

              </table>

              <div style="height:25px;"></div>

              <div style="height:1px; background-color:#202a39;"></div>

              <div style="height:20px;"></div>

              <div style="font-size:11px; line-height:1.6; color:#707b8c; text-align:center;">
                Email ini dikirim secara otomatis karena terdapat aktivitas
                pada proposal Anda.<br>
                Mohon tidak membalas email ini.
              </div>

              <div style="height:15px;"></div>

              <div style="font-size:11px; color:#596474; text-align:center;">
                © ${props.year} ${props.company_name}. All rights reserved.
              </div>

            </td>
          </tr>

        </table>

        <!-- Outside Footer -->
        <div style="height:15px;"></div>

        <div style="font-size:10px; color:#9aa3b1; text-align:center;">
          Anda menerima email ini karena menggunakan layanan proposal ${props.company_name}.
        </div>

      </td>
    </tr>
  </table>

</body>
</html>
  `;
}
