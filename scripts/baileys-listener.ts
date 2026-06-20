import { Boom } from "@hapi/boom";
import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  getContentType,
  useMultiFileAuthState,
  type WAMessage,
} from "@whiskeysockets/baileys";
import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import pino from "pino";
import qrcode from "qrcode-terminal";

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

const log = pino({
  level: process.env.BAILEYS_LOG_LEVEL ?? "info",
});
const plainLogPrefix = "[baileys-listener]";

const authDir = process.env.BAILEYS_AUTH_DIR ?? ".baileys-auth";
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

if (!convexUrl) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is required to store Baileys messages.");
}

const convex = new ConvexHttpClient(convexUrl);

async function start() {
  // Baileys names this helper like a React hook, but this is a Node worker.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const { version } = await fetchLatestBaileysVersion();

  const socket = makeWASocket({
    auth: state,
    version,
    logger: log.child({ module: "baileys" }),
    markOnlineOnConnect: false,
    syncFullHistory: false,
  });

  socket.ev.on("creds.update", saveCreds);

  socket.ev.on("connection.update", (update) => {
    if (update.qr) {
      console.info("\nScan this QR with WhatsApp > Linked devices:\n");
      qrcode.generate(update.qr, { small: true });
    }

    if (update.connection === "open") {
      console.info(plainLogPrefix, "connected to WhatsApp");
      log.info("Baileys connected to WhatsApp");
    }

    if (update.connection === "close") {
      const statusCode = new Boom(update.lastDisconnect?.error).output.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      log.warn(
        {
          statusCode,
          shouldReconnect,
          error: update.lastDisconnect?.error?.message,
        },
        "Baileys connection closed",
      );
      console.warn(plainLogPrefix, "connection closed", {
        statusCode,
        shouldReconnect,
        error: update.lastDisconnect?.error?.message,
      });

      if (shouldReconnect) {
        void start();
      } else {
        log.error(
          `WhatsApp logged out. Delete ${authDir} and run the script again to relink.`,
        );
      }
    }
  });

  socket.ev.on("messages.upsert", async ({ messages, type }) => {
    console.info(plainLogPrefix, "messages upsert", {
      count: messages.length,
      type,
    });
    log.info({ count: messages.length, type }, "Baileys messages upsert");

    for (const message of messages) {
      await storeInboundMessage(message);
    }
  });
}

async function storeInboundMessage(message: WAMessage) {
  if (message.key.fromMe) return;
  if (!message.message) return;

  const remoteJid = message.key.remoteJid;
  if (!remoteJid || remoteJid === "status@broadcast" || remoteJid.endsWith("@g.us")) {
    return;
  }

  const body = extractText(message);
  if (!body) {
    log.info(
      {
        messageId: message.key.id,
        remoteJid,
        contentType: getContentType(message.message),
      },
      "Skipping unsupported non-text message",
    );
    return;
  }

  const providerMessageId =
    message.key.id ?? `${remoteJid}-${message.messageTimestamp?.toString()}`;
  const fromPhone = jidToPhone(remoteJid);
  const toPhone =
    message.key.participant ? jidToPhone(message.key.participant) : "baileys-device";
  const receivedAt = timestampToIso(message.messageTimestamp);

  log.info(
    {
      providerMessageId,
      fromPhone: maskPhone(fromPhone),
      bodyLength: body.length,
      receivedAt,
    },
    "Storing inbound Baileys message",
  );
  console.info(plainLogPrefix, "storing inbound message", {
    providerMessageId,
    fromPhone: maskPhone(fromPhone),
    bodyLength: body.length,
    receivedAt,
  });

  const result = await convex.mutation(receiveMessage, {
    providerMessageId,
    fromPhone,
    toPhone,
    body,
    receivedAt,
    rawPayload: {
      key: message.key,
      messageTimestamp: message.messageTimestamp?.toString(),
      pushName: message.pushName,
      contentType: getContentType(message.message),
    },
    ...(message.pushName ? { senderName: message.pushName } : {}),
  });

  log.info({ providerMessageId, result }, "Stored inbound Baileys message");
  console.info(plainLogPrefix, "stored inbound message", {
    providerMessageId,
    result,
  });
}

function extractText(message: WAMessage) {
  const content = message.message;
  if (!content) return undefined;

  const inner =
    content.ephemeralMessage?.message ??
    content.viewOnceMessage?.message ??
    content;

  return (
    inner.conversation ??
    inner.extendedTextMessage?.text ??
    inner.imageMessage?.caption ??
    inner.videoMessage?.caption
  );
}

function jidToPhone(jid: string) {
  return jid.split("@")[0].split(":")[0];
}

function timestampToIso(timestamp: WAMessage["messageTimestamp"]) {
  if (!timestamp) return new Date().toISOString();
  return new Date(Number(timestamp) * 1000).toISOString();
}

function maskPhone(value: string) {
  if (value.length <= 4) return "****";
  return `${"*".repeat(Math.max(value.length - 4, 0))}${value.slice(-4)}`;
}

start().catch((error) => {
  log.error(
    { error: error instanceof Error ? error.message : String(error) },
    "Baileys listener failed",
  );
  process.exitCode = 1;
});
