/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import QRCode from "qrcode";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
  RESEND_API_KEY?: string;
  EMAIL_FROM_ADDRESS?: string;
  PUBLIC_SITE_URL?: string;
  FIREBASE_PROJECT_ID?: string;
  PROGRAM_ID?: string;
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

type FirestoreValue = { stringValue?: string; integerValue?: string; timestampValue?: string; booleanValue?: boolean; nullValue?: null };

function firestoreValue(value: FirestoreValue | undefined) {
  if (!value) return "";
  if (value.integerValue !== undefined) return Number(value.integerValue);
  if (value.booleanValue !== undefined) return value.booleanValue;
  if (value.nullValue !== undefined) return null;
  return value.stringValue ?? value.timestampValue ?? "";
}

function escapeHtml(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[character] ?? character));
}

async function registrationEmail(request: Request, env: Env) {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return Response.json({ sent: false, error: "Authentication required" }, { status: 401 });
  let input: { registrationId?: string; type?: string };
  try { input = await request.json(); } catch { return Response.json({ sent: false, error: "Invalid request" }, { status: 400 }); }
  if (!input.registrationId || !/^[a-f0-9-]{20,50}$/i.test(input.registrationId) || !["received", "confirmed"].includes(input.type || "")) return Response.json({ sent: false, error: "Invalid request" }, { status: 400 });

  const projectId = env.FIREBASE_PROJECT_ID || "symposium-alya";
  const programId = env.PROGRAM_ID || "prs-symposium-2026";
  const documentUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/programs/${encodeURIComponent(programId)}/registrations/${encodeURIComponent(input.registrationId)}`;
  const documentResponse = await fetch(documentUrl, { headers: { Authorization: `Bearer ${token}` } });
  if (!documentResponse.ok) return Response.json({ sent: false, error: "Registration could not be verified" }, { status: documentResponse.status === 403 ? 403 : 404 });
  const document = await documentResponse.json() as { fields?: Record<string, FirestoreValue> };
  const fields = document.fields || {};
  const status = String(firestoreValue(fields.registrationStatus));
  if (input.type === "confirmed" && status !== "confirmed") return Response.json({ sent: false, error: "Registration is not confirmed" }, { status: 409 });
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM_ADDRESS) return Response.json({ sent: false, configured: false }, { status: 202 });

  const reference = String(firestoreValue(fields.referenceNumber));
  const fullName = String(firestoreValue(fields.fullName));
  const email = String(firestoreValue(fields.email));
  const attendance = String(firestoreValue(fields.attendanceLabel));
  const fee = Number(firestoreValue(fields.registrationFeeInSen));
  const isConfirmed = input.type === "confirmed";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ sent: false, error: "Registration email is invalid" }, { status: 422 });
  const qrDataUrl = await QRCode.toDataURL(reference, { width: 360, margin: 1, errorCorrectionLevel: "H" });
  const qrBase64 = qrDataUrl.split(",")[1];
  const subject = isConfirmed ? `Registration confirmed - ${reference}` : `Registration received - ${reference}`;
  const heading = isConfirmed ? "Registration Confirmed" : "Registration Received";
  const message = isConfirmed
    ? "Your payment has been verified and your place is confirmed. Keep this email and QR reference for event check-in."
    : "Your form and proof of payment have been received. Your registration remains pending until payment verification is completed.";
  const siteUrl = env.PUBLIC_SITE_URL || new URL(request.url).origin;
  const html = `<!doctype html><html><body style="margin:0;background:#070707;color:#fff;font-family:Arial,sans-serif"><div style="max-width:620px;margin:auto;padding:36px"><p style="color:#d4af37;letter-spacing:2px;font-size:12px">PRS SYMPOSIUM & WORKSHOP 2026</p><h1>${heading}</h1><p style="color:#c9c5bc;line-height:1.7">Dear ${escapeHtml(fullName)},</p><p style="color:#c9c5bc;line-height:1.7">${message}</p><div style="margin:26px 0;padding:22px;border:1px solid rgba(212,175,55,.35);border-radius:14px;background:#111"><p><small style="color:#8e8a82">REFERENCE NUMBER</small><br><strong style="color:#f4d35e;font-size:20px">${escapeHtml(reference)}</strong></p><p><small style="color:#8e8a82">ATTENDANCE</small><br>${escapeHtml(attendance)}</p><p><small style="color:#8e8a82">REGISTRATION FEE</small><br>RM ${(fee / 100).toFixed(2)}</p><p><small style="color:#8e8a82">STATUS</small><br>${isConfirmed ? "Confirmed - Payment Verified" : "Pending Payment Verification"}</p></div><p style="color:#8e8a82;font-size:12px">QR reference is attached to this email. Visit <a style="color:#d4af37" href="${escapeHtml(siteUrl)}">the event website</a> for event updates.</p></div></body></html>`;
  const sendResponse = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: env.EMAIL_FROM_ADDRESS, to: [email], subject, html, attachments: [{ filename: `${reference}-qr.png`, content: qrBase64 }] }) });
  if (!sendResponse.ok) return Response.json({ sent: false, error: "Email provider rejected the request" }, { status: 502 });
  return Response.json({ sent: true });
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/registration-email") return registrationEmail(request, env);

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return handler.fetch(request, env, ctx);
  },
};

export default worker;
