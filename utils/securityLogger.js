const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Log security events to database
 * @param {number|null} userId - User ID if available
 * @param {SecurityEventType} eventType - Type of security event
 * @param {Object} [details={}] - Additional event details
 * @param {string} [ipAddress] - IP address of the request
 * @param {string} [userAgent] - User agent string
 */
const logSecurityEvent = async (userId, eventType, details = {}, ipAddress = null, userAgent = null) => {
  try {
    await prisma.securityLog.create({
      data: {
        userId: userId || undefined, // Only set if userId exists
        eventType,
        details,
        ipAddress,
        userAgent,
        createdAt: new Date()
      }
    });
  } catch (error) {
    console.error('Failed to log security event:', error);
    // Consider implementing a fallback logging mechanism here
  }
};

module.exports = { logSecurityEvent };