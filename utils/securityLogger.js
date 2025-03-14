// utils/securityLogger.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const validEvents = new Set([
  'ACCOUNT_VERIFICATION',
  'FAILED_LOGIN_ATTEMPT',
  'PASSWORD_RESET',
  'MFA_ENABLED',
  'SUSPICIOUS_ACTIVITY',
  'PROFILE_UPDATE',
  'ASSET_TRANSFER',
  'LOAN_APPLICATION'
]);

const logSecurityEvent = async (userId, eventType, details = {}, ipAddress = null, userAgent = null) => {
  try {
    // Event type mapping
    const eventMap = {
      'UNAUTHENTICATED_ACCESS': 'SUSPICIOUS_ACTIVITY',
      'EXPIRED_TOKEN_ATTEMPT': 'FAILED_LOGIN_ATTEMPT',
      'INVALID_TOKEN_ATTEMPT': 'FAILED_LOGIN_ATTEMPT'
    };

    const mappedEvent = eventMap[eventType] || eventType;

    if (!validEvents.has(mappedEvent)) {
      throw new Error(`Invalid event type: ${eventType}`);
    }

    // System user connection (ID 0 must exist)
    const userConnection = {
      connect: { id: userId ? userId : 0 }
    };

    await prisma.securityLog.create({
      data: {
        eventType: mappedEvent,
        details: {
          ...details,
          originalEventType: eventType
        },
        ipAddress,
        userAgent,
        user: userConnection
      }
    });
  } catch (error) {
    console.error('Security log failed:', error.message);
    console.log('Fallback Log:', {
      event: mappedEvent,
      details,
      ip: ipAddress,
      agent: userAgent
    });
  }
};

module.exports = { logSecurityEvent };