const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Log security events to database
 * @param {string|null} userId - User ID if available
 * @param {string} eventType - Type of security event
 * @param {Object} details - Additional event details
 */
const logSecurityEvent = async (userId, eventType, details = {}) => {
  try {
    await prisma.securityLog.create({
      data: {
        userId,
        eventType,
        details: JSON.stringify(details),
        timestamp: new Date(),
        action: action || 'N/A',
      }
    });
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
};

module.exports = { logSecurityEvent };