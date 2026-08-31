import { Resend } from "resend";

function client() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

const FROM = process.env.RESEND_FROM_EMAIL || "Celebrio <onboarding@resend.dev>";

export async function sendApprovalReadyEmail(to: string, opts: {
  contactName: string;
  occasionDateLabel: string;
  approveUrl: string;
}) {
  const resend = client();
  if (!resend) return { skipped: true, reason: "RESEND_API_KEY not configured" };

  return resend.emails.send({
    from: FROM,
    to,
    subject: `🎂 ${opts.contactName}'s birthday is coming up — review the greeting`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#1c1a27">A birthday greeting is ready for your review</h2>
        <p style="color:#444">
          <strong>${opts.contactName}</strong>'s birthday is on <strong>${opts.occasionDateLabel}</strong>.
          We've drafted a message and card for them — please approve, edit, or reject it before it's sent.
        </p>
        <p style="margin:28px 0">
          <a href="${opts.approveUrl}" style="background:#6366f1;color:#fff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:600">
            Review now
          </a>
        </p>
        <p style="color:#999;font-size:12px">Celebrio</p>
      </div>
    `,
  });
}

export async function sendGreetingEmail(to: string, opts: {
  contactName: string;
  message: string;
  cardImageUrl?: string | null;
}) {
  const resend = client();
  if (!resend) return { skipped: true, reason: "RESEND_API_KEY not configured" };

  return resend.emails.send({
    from: FROM,
    to,
    subject: `🎉 Happy Birthday, ${opts.contactName}!`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;text-align:center">
        ${opts.cardImageUrl ? `<img src="${opts.cardImageUrl}" alt="Birthday card" style="width:100%;border-radius:16px;margin-bottom:20px" />` : ""}
        <p style="font-size:16px;color:#222;line-height:1.6">${opts.message}</p>
      </div>
    `,
  });
}
