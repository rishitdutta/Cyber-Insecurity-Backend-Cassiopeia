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
  'LOAN_APPLICATION',
  'SIGNUP_INITIATED',
  'FAILED_OTP_VERIFICATION',
  'LOGIN_OTP_SENT',
  'FAILED_LOGIN_OTP',
  'SUCCESSFUL_LOGIN',
  'NULL',
]);

const logSecurityEvent = async (userId, eventType, details = {}, ipAddress = null, userAgent = null) => {
  let mappedEvent;

  try {
    // Event type mapping
    const eventMap = {
      'UNAUTHENTICATED_ACCESS': 'SUSPICIOUS_ACTIVITY',
      'EXPIRED_TOKEN_ATTEMPT': 'FAILED_LOGIN_ATTEMPT',
      'INVALID_TOKEN_ATTEMPT': 'FAILED_LOGIN_ATTEMPT'
    };

    mappedEvent = eventMap[eventType] || eventType;

    if (!validEvents.has(mappedEvent)) {
      throw new Error(`Invalid event type: ${eventType}`);
    }

    // Prepare the data object
    const data = {
      eventType: mappedEvent,
      details: {
        ...details,
        originalEventType: eventType
      },
      ipAddress,
      userAgent,
    };

    // Conditionally add user connection if userId is provided
    if (userId) {
      data.user = {
        connect: { id: userId }
      };
    }

    await prisma.securityLog.create({
      data
    });
  } catch (error) {
    console.error('Security log failed:', error.message);
    console.log('Fallback Log:', {
      event: mappedEvent || eventType, // Use mappedEvent if defined, otherwise fallback to eventType
      details,
      ip: ipAddress,
      agent: userAgent
    });
  }
};

module.exports = { logSecurityEvent };