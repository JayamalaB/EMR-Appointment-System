const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const logger = require('../config/logger');

let io = null;

/**
 * Real-time appointment updates.
 *
 * Approach: clients authenticate the socket handshake with the same JWT
 * access token used for REST calls, then join a room scoped to the
 * doctor they're currently viewing in the scheduler (`doctor:<doctorId>`)
 * and/or their department (`department:<departmentId>`). When an
 * appointment is created/updated/cancelled, the service layer emits into
 * those rooms only - so a receptionist watching Dr. Smith's calendar gets
 * pushed updates instantly, without refreshing, while traffic for other
 * doctors never reaches that client. This keeps broadcasts targeted
 * instead of a global fan-out to every connected socket.
 */
function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: env.clientOrigin, credentials: true },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication required'));
      const payload = jwt.verify(token, env.jwt.accessSecret);
      socket.user = { id: payload.sub, role: payload.role };
      next();
    } catch (err) {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    logger.debug(`Socket connected: ${socket.id} (user ${socket.user.id})`);

    socket.on('scheduler:subscribe', ({ doctorId, departmentId } = {}) => {
      if (doctorId) socket.join(`doctor:${doctorId}`);
      if (departmentId) socket.join(`department:${departmentId}`);
    });

    socket.on('scheduler:unsubscribe', ({ doctorId, departmentId } = {}) => {
      if (doctorId) socket.leave(`doctor:${doctorId}`);
      if (departmentId) socket.leave(`department:${departmentId}`);
    });

    socket.on('disconnect', () => {
      logger.debug(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
}

/**
 * Emits an appointment lifecycle event to everyone currently viewing that
 * doctor's schedule or that department's dashboard.
 */
function emitAppointmentEvent(eventName, appointment) {
  if (!io) return;
  const doctorId = appointment.doctor?._id?.toString() || appointment.doctor?.toString();
  const departmentId = appointment.department?._id?.toString() || appointment.department?.toString();

  if (doctorId) io.to(`doctor:${doctorId}`).emit(eventName, appointment);
  if (departmentId) io.to(`department:${departmentId}`).emit(eventName, appointment);
}

function getIO() {
  if (!io) throw new Error('Socket.IO not initialized yet');
  return io;
}

module.exports = { initSocket, emitAppointmentEvent, getIO };
