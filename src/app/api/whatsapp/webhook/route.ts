import { createHmac, timingSafeEqual } from "crypto";

import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const logPrefix = "[whatsapp-webhook]";

type WhatsAppContact = {
  profile?: {
    name?: string;
  };
  wa_id?: string;
};

type WhatsAppMessage = {
  from?: string;
  id?: string;
  timestamp?: string;
  type?: string;
  text?: {
    body?: string;
  };
};

type WhatsAppChange = {
  field?: string;
  value?: {
    contacts?: WhatsAppContact[];
    messages?: WhatsAppMessage[];
    metadata?: {
      display_phone_number?: string;
      phone_number_id?: string;
    };
  };
};

type WhatsAppEntry = {
  changes?: WhatsAppChange[];
};

type WhatsAppWebhookPayload = {
  object?: string;
  entry?: WhatsAppEntry[];
};

const receiveMessage = makeFunctionReference<
  "mutation",
  {
    providerMessageId: string;
    fromPhone: string;
    toPhone: string;
    senderName?: string;
    body: string;
    receivedAt: string;
    rawPayload: unknown;
  },
  { messageId: string; conversationId: string }
>("whatsapp:receiveMessageForMvpAdvisor");

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN;

  console.info(logPrefix, "verification request", {
    mode,
    hasToken: Boolean(token),
    hasChallenge: Boolean(challenge),
    hasExpectedToken: Boolean(expectedToken),
    tokenMatches: Boolean(token && expectedToken && token === expectedToken),
  });

  if (
    mode === "subscribe" &&
    token &&
    challenge &&
    token === expectedToken
  ) {
    console.info(logPrefix, "verification succeeded");
    return new Response(challenge, { status: 200 });
  }

  console.warn(logPrefix, "verification failed");
  return Response.json({ error: "Webhook verification failed" }, { status: 403 });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  console.info(logPrefix, "post received", {
    contentType: request.headers.get("content-type"),
    bodyBytes: Buffer.byteLength(rawBody, "utf8"),
    hasSignature: Boolean(request.headers.get("x-hub-signature-256")),
  });

  if (!isValidSignature(rawBody, request.headers)) {
    console.warn(logPrefix, "signature validation failed", {
      hasAppSecret: Boolean(process.env.WHATSAPP_APP_SECRET),
      signatureHeader: request.headers.get("x-hub-signature-256")?.slice(0, 16),
    });
    return Response.json({ error: "Invalid webhook signature" }, { status: 401 });
  }
  console.info(logPrefix, "signature accepted", {
    validationEnabled: Boolean(process.env.WHATSAPP_APP_SECRET),
  });

  let payload: WhatsAppWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as WhatsAppWebhookPayload;
  } catch {
    console.warn(logPrefix, "invalid json payload");
    return Response.json({ error: "Invalid JSON payload" }, { status: 400 });
  }
  console.info(logPrefix, "payload parsed", summarizePayload(payload));

  const messages = extractTextMessages(payload);
  console.info(logPrefix, "messages extracted", {
    count: messages.length,
    messageIds: messages.map((message) => message.providerMessageId),
    fromPhones: messages.map((message) => maskPhone(message.fromPhone)),
  });

  if (messages.length === 0) {
    console.info(logPrefix, "acknowledging non-message or unsupported webhook");
    return Response.json({ ok: true, received: 0 });
  }

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    console.error(logPrefix, "missing NEXT_PUBLIC_CONVEX_URL");
    return Response.json(
      { error: "Convex webhook environment is not configured" },
      { status: 500 },
    );
  }

  const convex = new ConvexHttpClient(convexUrl);

  for (const message of messages) {
    console.info(logPrefix, "storing message", {
      providerMessageId: message.providerMessageId,
      fromPhone: maskPhone(message.fromPhone),
      toPhone: maskPhone(message.toPhone),
      senderName: message.senderName,
      bodyLength: message.body.length,
      receivedAt: message.receivedAt,
    });

    try {
      const result = await convex.mutation(receiveMessage, {
        providerMessageId: message.providerMessageId,
        fromPhone: message.fromPhone,
        toPhone: message.toPhone,
        senderName: message.senderName,
        body: message.body,
        receivedAt: message.receivedAt,
        rawPayload: payload,
      });
      console.info(logPrefix, "message stored", {
        providerMessageId: message.providerMessageId,
        result,
      });
    } catch (error) {
      console.error(logPrefix, "failed to store message", {
        providerMessageId: message.providerMessageId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  console.info(logPrefix, "post handled", { received: messages.length });
  return Response.json({
    ok: true,
    received: messages.length,
  });
}

function extractTextMessages(payload: WhatsAppWebhookPayload) {
  const messages: Array<{
    providerMessageId: string;
    fromPhone: string;
    toPhone: string;
    senderName?: string;
    body: string;
    receivedAt: string;
  }> = [];

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      if (!value?.messages?.length) continue;

      const toPhone =
        value.metadata?.display_phone_number ??
        value.metadata?.phone_number_id ??
        "unknown";

      for (const message of value.messages) {
        if (message.type !== "text" || !message.text?.body) continue;
        if (!message.id || !message.from) continue;

        const contact = value.contacts?.find(
          (candidate) => candidate.wa_id === message.from,
        );

        messages.push({
          providerMessageId: message.id,
          fromPhone: message.from,
          toPhone,
          senderName: contact?.profile?.name,
          body: message.text.body,
          receivedAt: message.timestamp
            ? new Date(Number(message.timestamp) * 1000).toISOString()
            : new Date().toISOString(),
        });
      }
    }
  }

  return messages;
}

function isValidSignature(rawBody: string, headers: Headers) {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) return true;

  const signature = headers.get("x-hub-signature-256");
  if (!signature?.startsWith("sha256=")) return false;

  const expected = createHmac("sha256", appSecret)
    .update(rawBody, "utf8")
    .digest("hex");

  const actualBuffer = Buffer.from(signature.slice("sha256=".length), "hex");
  const expectedBuffer = Buffer.from(expected, "hex");

  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

function summarizePayload(payload: WhatsAppWebhookPayload) {
  return {
    object: payload.object,
    entries: payload.entry?.length ?? 0,
    changes:
      payload.entry?.reduce(
        (total, entry) => total + (entry.changes?.length ?? 0),
        0,
      ) ?? 0,
    fields:
      payload.entry?.flatMap(
        (entry) => entry.changes?.map((change) => change.field ?? "unknown") ?? [],
      ) ?? [],
    messageCount:
      payload.entry?.reduce(
        (total, entry) =>
          total +
          (entry.changes?.reduce(
            (changeTotal, change) =>
              changeTotal + (change.value?.messages?.length ?? 0),
            0,
          ) ?? 0),
        0,
      ) ?? 0,
  };
}

function maskPhone(value: string) {
  if (value.length <= 4) return "****";
  return `${"*".repeat(Math.max(value.length - 4, 0))}${value.slice(-4)}`;
}
