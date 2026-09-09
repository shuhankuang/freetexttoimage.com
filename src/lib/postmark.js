const POSTMARK_ENDPOINT = "https://api.postmarkapp.com/email";

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character]);
}

const copy = {
  en: {
    subject: "Your sign-in link for Forma",
    eyebrow: "SECURE SIGN-IN",
    title: "Open your Forma workspace",
    body: "Use the button below to sign in or create your account. This link expires in 15 minutes and can only be used once.",
    button: "Sign in to Forma",
    ignore: "If you didn’t request this email, you can safely ignore it.",
    text: "Use this link to sign in to Forma. It expires in 15 minutes and can only be used once:",
  },
  ja: {
    subject: "Formaへのログインリンク",
    eyebrow: "安全なログイン",
    title: "Formaワークスペースを開く",
    body: "下のボタンからログイン、またはアカウントを作成できます。このリンクは15分後に期限切れとなり、一度だけ使用できます。",
    button: "Formaにログイン",
    ignore: "このメールに心当たりがない場合は、そのまま破棄してください。",
    text: "次のリンクからFormaにログインしてください。リンクは15分後に期限切れとなり、一度だけ使用できます：",
  },
};

export async function sendMagicLinkEmail({ email, url, locale = "en" }) {
  const token = process.env.POSTMARK_SERVER_TOKEN;
  const from = process.env.POSTMARK_FROM_EMAIL;
  if (!token || !from) {
    throw new Error("Postmark is not configured. Set POSTMARK_SERVER_TOKEN and POSTMARK_FROM_EMAIL.");
  }

  const content = copy[locale === "ja" ? "ja" : "en"];
  const safeUrl = escapeHtml(url);
  const response = await fetch(POSTMARK_ENDPOINT, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Postmark-Server-Token": token,
    },
    body: JSON.stringify({
      From: from,
      To: email,
      Subject: content.subject,
      TextBody: `${content.text}\n\n${url}\n\n${content.ignore}`,
      HtmlBody: `<!doctype html><html lang="${locale === "ja" ? "ja" : "en"}"><body style="margin:0;background:#f4f2eb;color:#32382e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"><div style="padding:40px 16px"><div style="max-width:520px;margin:auto;padding:42px 38px;background:#fffdf8;border:1px solid #e2e0d7;border-radius:16px"><div style="margin-bottom:32px;font-size:24px;font-weight:750;color:#59664b">forma<span style="color:#dc633c">.</span></div><div style="margin-bottom:12px;color:#8a927e;font-size:11px;letter-spacing:1.5px">${content.eyebrow}</div><h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:30px;font-weight:400;line-height:1.25">${content.title}</h1><p style="margin:0;color:#6e7568;font-size:15px;line-height:1.75">${content.body}</p><a href="${safeUrl}" style="display:block;margin:30px 0;padding:14px 20px;border-radius:9px;background:#dc633c;color:#fff;text-align:center;text-decoration:none;font-size:14px;font-weight:650">${content.button}</a><p style="margin:0;color:#989d92;font-size:12px;line-height:1.6">${content.ignore}</p></div></div></body></html>`,
      MessageStream: process.env.POSTMARK_MESSAGE_STREAM || "outbound",
      Tag: "magic-link",
      TrackOpens: false,
      TrackLinks: "None",
    }),
  });

  if (!response.ok) {
    const result = await response.json().catch(() => null);
    throw new Error(`Postmark rejected the email (${response.status}): ${result?.Message || "Unknown error"}`);
  }
}

