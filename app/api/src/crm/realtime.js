'use strict';

/**
 * Real-time transport for the CRM inbox (Socket.IO).
 *
 * The CRM is a chat client for a conversation that lives on WhatsApp, so the
 * two directions arrive by completely different routes:
 *
 *   agent → customer   an HTTP request the browser already knows about
 *   customer → agent   a Twilio webhook hitting the *server*, with no browser
 *                      involved at all
 *
 * Only the second one needs this file. Without a push channel the inbox cannot
 * know a reply arrived until something asks — which is why polling was the only
 * previous option, and why replies appeared up to 30s late or not at all.
 *
 * Everything here is best-effort: emit() is a no-op until init() runs, so the
 * CLI scripts, the job worker and the test harness can require the messaging
 * service without standing up an HTTP server.
 */

const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

let io = null;

/* ── rooms ──────────────────────────────────────────────────────────────────
 * crm            every authenticated agent — conversation-list updates
 * user:<id>      one agent's own devices/tabs — personal notifications
 * thread:<key>   everyone currently looking at one conversation
 *
 * A thread key is channel + counterpart, which is exactly how the inbox groups
 * messages, so the client can subscribe with what it already has in hand. */

const ROOM_ALL = 'crm';
const userRoom = (userId) => `user:${userId}`;

/**
 * Stable identifier for one conversation.
 * Mirrors the $group key in GET /messages/inbox — if these two ever disagree,
 * live updates land in a thread the list does not show.
 */
const threadKey = ({ channel, leadId, contactId }) =>
  `${channel}:${String(leadId || contactId || 'unknown')}`;

const threadRoom = (key) => `thread:${key}`;

/* ── init ───────────────────────────────────────────────────────────────── */

/**
 * @param {import('http').Server} server  the same HTTP server Express listens on
 * @param {{origins: string[]}} opts
 */
const init = (server, opts = {}) => {
  if (io) return io;
  // Required lazily: the package is only needed when a server actually exists,
  // and requiring it at module load would break the CLI scripts.
  // eslint-disable-next-line global-require
  const { Server } = require('socket.io');

  io = new Server(server, {
    path: '/crm/socket.io',
    // Same allow-list as the REST API — a socket carries the same JWT and the
    // same data, so it must not be reachable from origins the REST API refuses.
    cors: {
      origin: opts.origins && opts.origins.length ? opts.origins : true,
      credentials: true,
    },
    // Long-poll fallback matters here: corporate proxies routinely block
    // websockets, and an inbox that silently stops updating is worse than one
    // that updates over HTTP.
    transports: ['websocket', 'polling'],
    pingTimeout: 25000,
  });

  // Authenticate on connect. Sockets bypass Express entirely, so none of the
  // REST middleware runs — without this check the inbox stream would be
  // readable by anyone who can reach the port.
  io.use((socket, next) => {
    const token = (socket.handshake.auth && socket.handshake.auth.token)
      || (socket.handshake.query && socket.handshake.query.token);
    if (!token) return next(new Error('No token'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // Same guard as crmProtect: an admin-panel token must not open a CRM
      // socket just because both are signed with the same secret.
      if (decoded.kind !== 'crm') return next(new Error('Not a CRM token'));
      socket.data.userId = String(decoded.id);
      return next();
    } catch (err) {
      return next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const { userId } = socket.data;
    socket.join(ROOM_ALL);
    socket.join(userRoom(userId));

    // The client subscribes when it opens a conversation and unsubscribes when
    // it leaves, so a busy inbox does not fan every message out to every tab.
    socket.on('thread:join', (key) => {
      if (typeof key === 'string' && key.length < 128) socket.join(threadRoom(key));
    });
    socket.on('thread:leave', (key) => {
      if (typeof key === 'string') socket.leave(threadRoom(key));
    });

    // Agent-side typing only. WhatsApp does not report whether the *customer*
    // is typing — Twilio has no such webhook — so this exists for the case
    // where two agents share one inbox and would otherwise both reply.
    socket.on('agent:typing', ({ key, name } = {}) => {
      if (typeof key !== 'string') return;
      socket.to(threadRoom(key)).emit('agent:typing', { key, name, userId });
    });

    socket.on('error', (err) => logger.warn(`CRM socket error (${userId}): ${err.message}`));
  });

  logger.info('CRM realtime: Socket.IO listening on /crm/socket.io');
  return io;
};

/* ── emit helpers ───────────────────────────────────────────────────────────
 * Every one of these is called from inside a request or a webhook handler that
 * has already done the durable write. A failure to broadcast must never fail
 * that write — the database is the source of truth and the client re-syncs on
 * reconnect — so they swallow their own errors. */

const safeEmit = (room, event, payload) => {
  if (!io) return;
  try {
    io.to(room).emit(event, payload);
  } catch (err) {
    logger.warn(`CRM realtime emit failed (${event}): ${err.message}`);
  }
};

/** Shape a Mongoose message doc into what the chat UI renders. */
const toWire = (msg) => ({
  _id: String(msg._id),
  channel: msg.channel,
  direction: msg.direction,
  leadId: msg.leadId ? String(msg.leadId) : null,
  contactId: msg.contactId ? String(msg.contactId) : null,
  body: msg.body || '',
  subject: msg.subject,
  status: msg.status,
  failReason: msg.failReason,
  waLink: msg.waLink,
  mediaUrls: msg.mediaUrls || [],
  toAddress: msg.toAddress,
  fromAddress: msg.fromAddress,
  providerMessageId: msg.providerMessageId,
  scheduledFor: msg.scheduledFor,
  createdAt: msg.createdAt,
  updatedAt: msg.updatedAt,
});

/**
 * A message was created — inbound from the customer, or outbound from an agent.
 * Goes to the open conversation AND to every agent's list, because a reply must
 * bump the conversation even for someone who is not looking at that thread.
 */
const emitMessage = (msg, extra = {}) => {
  const key = threadKey(msg);
  const payload = { key, message: toWire(msg), ...extra };
  safeEmit(threadRoom(key), 'message:new', payload);
  safeEmit(ROOM_ALL, 'thread:update', payload);
};

/**
 * Delivery status moved (queued → sent → delivered → read, or → failed).
 * Carries the full message so a tab that never saw the original still renders
 * it correctly rather than dropping an update for an unknown id.
 */
const emitStatus = (msg) => {
  const key = threadKey(msg);
  const payload = {
    key,
    messageId: String(msg._id),
    status: msg.status,
    failReason: msg.failReason || null,
    providerMessageId: msg.providerMessageId || null,
    message: toWire(msg),
  };
  safeEmit(threadRoom(key), 'message:status', payload);
  safeEmit(ROOM_ALL, 'thread:update', payload);
};

/** Inbound messages in a thread were marked read by one agent — sync the others. */
const emitRead = ({ key, messageIds }) => {
  safeEmit(threadRoom(key), 'message:read', { key, messageIds });
  safeEmit(ROOM_ALL, 'thread:read', { key, messageIds });
};

/** Push a notification to one agent's tabs. */
const emitToUser = (userId, event, payload) => safeEmit(userRoom(userId), event, payload);

const isReady = () => Boolean(io);

module.exports = {
  init, isReady, threadKey, toWire,
  emitMessage, emitStatus, emitRead, emitToUser,
};
