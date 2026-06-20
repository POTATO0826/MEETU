import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type InboundWhatsAppMessage = {
  providerMessageId: string;
  direction: "Inbound" | "Outbound";
  fromPhone: string;
  toPhone: string;
  senderName?: string;
  body: string;
  receivedAt: string;
  rawPayload: unknown;
};

const receiveMessage = makeFunctionReference<
  "mutation",
  InboundWhatsAppMessage,
  { messageId: string; conversationId: string }
>("whatsapp:receiveMessageForMvpAdvisor");

export async function POST(request: Request) {
  const expectedSecret = process.env.INTERNAL_INGEST_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!expectedSecret) {
    console.error("[internal-whatsapp-message]", "missing INTERNAL_INGEST_SECRET");
    return Response.json({ error: "Internal ingest is not configured" }, { status: 500 });
  }

  if (authHeader !== `Bearer ${expectedSecret}`) {
    console.warn("[internal-whatsapp-message]", "unauthorized request");
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    console.error("[internal-whatsapp-message]", "missing NEXT_PUBLIC_CONVEX_URL");
    return Response.json({ error: "Convex is not configured" }, { status: 500 });
  }

  let payload: InboundWhatsAppMessage;
  try {
    payload = (await request.json()) as InboundWhatsAppMessage;
  } catch {
    return Response.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const validationError = validatePayload(payload);
  if (validationError) {
    return Response.json({ error: validationError }, { status: 400 });
  }

  console.info("[internal-whatsapp-message]", "storing inbound message", {
    providerMessageId: payload.providerMessageId,
    direction: payload.direction,
    fromPhone: maskPhone(payload.fromPhone),
    toPhone: maskPhone(payload.toPhone),
    bodyLength: payload.body.length,
    receivedAt: payload.receivedAt,
  });

  const convex = new ConvexHttpClient(convexUrl);
  const result = await convex.mutation(receiveMessage, payload);

  console.info("[internal-whatsapp-message]", "stored inbound message", {
    providerMessageId: payload.providerMessageId,
    result,
  });

  return Response.json({ ok: true, result });
}

function validatePayload(payload: InboundWhatsAppMessage) {
  if (!payload.providerMessageId) return "providerMessageId is required";
  if (payload.direction !== "Inbound" && payload.direction !== "Outbound") {
    return "direction must be Inbound or Outbound";
  }
  if (!payload.fromPhone) return "fromPhone is required";
  if (!payload.toPhone) return "toPhone is required";
  if (!payload.body) return "body is required";
  if (!payload.receivedAt) return "receivedAt is required";
  return undefined;
}

function maskPhone(value: string) {
  if (value.length <= 4) return "****";
  return `${"*".repeat(Math.max(value.length - 4, 0))}${value.slice(-4)}`;
}
