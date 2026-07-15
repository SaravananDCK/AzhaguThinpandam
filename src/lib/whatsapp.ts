// WhatsApp delivery for login OTPs. Two interchangeable drivers:
//   1. Twilio's WhatsApp API (TWILIO_* env vars) — quickest to production
//   2. Meta Cloud API directly (WHATSAPP_* env vars) — cheapest per message
// Twilio wins if both are configured. Without either, dev mode shows the code
// on screen instead.

export function isTwilioConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_WHATSAPP_FROM
  );
}

export function isWhatsAppConfigured(): boolean {
  return Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

export function isOtpChannelConfigured(): boolean {
  return isTwilioConfigured() || isWhatsAppConfigured();
}

/** Sends the OTP over Twilio's WhatsApp API. `phone` is a 10-digit Indian number. */
async function sendTwilioOtp(phone: string, code: string): Promise<void> {
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const params = new URLSearchParams({
    To: `whatsapp:+91${phone}`,
    From: process.env.TWILIO_WHATSAPP_FROM!, // e.g. "whatsapp:+14155238886"
  });
  const contentSid = process.env.TWILIO_CONTENT_SID;
  if (contentSid) {
    // Approved authentication template (required for production senders)
    params.set("ContentSid", contentSid);
    params.set("ContentVariables", JSON.stringify({ "1": code }));
  } else {
    // Freeform body — works in the Twilio sandbox / open sessions only
    params.set("Body", `${code} is your AzhaguThinpandam login code. Valid for 5 minutes.`);
  }

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    }
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Twilio send failed (${res.status}): ${body}`);
  }
}

/** Sends the OTP via whichever WhatsApp driver is configured. */
export async function sendOtpMessage(phone: string, code: string): Promise<void> {
  if (isTwilioConfigured()) return sendTwilioOtp(phone, code);
  return sendWhatsAppOtp(phone, code);
}

/** Sends the OTP via the approved auth template. `phone` is a 10-digit Indian number. */
export async function sendWhatsAppOtp(phone: string, code: string): Promise<void> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const template = process.env.WHATSAPP_OTP_TEMPLATE ?? "login_otp";
  const language = process.env.WHATSAPP_OTP_LANGUAGE ?? "en";

  const res = await fetch(`https://graph.facebook.com/v22.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: `91${phone}`,
      type: "template",
      template: {
        name: template,
        language: { code: language },
        components: [
          { type: "body", parameters: [{ type: "text", text: code }] },
          // Authentication templates include a mandatory copy-code button
          {
            type: "button",
            sub_type: "url",
            index: "0",
            parameters: [{ type: "text", text: code }],
          },
        ],
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`WhatsApp send failed (${res.status}): ${body}`);
  }
}
