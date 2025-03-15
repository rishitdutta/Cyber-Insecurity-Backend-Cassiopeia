const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Valid security events
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

// Event type mapping for fallback
const eventMap = {
  'UNAUTHENTICATED_ACCESS': 'SUSPICIOUS_ACTIVITY',
  'EXPIRED_TOKEN_ATTEMPT': 'FAILED_LOGIN_ATTEMPT',
  'INVALID_TOKEN_ATTEMPT': 'FAILED_LOGIN_ATTEMPT',
};

/**
 * Logs a security event to the database.
 * @param {number} userId - The ID of the user associated with the event.
 * @param {string} eventType - The type of security event.
 * @param {object} details - Additional details about the event.
 * @param {string} ipAddress - The IP address of the user.
 * @param {string} userAgent - The user agent of the client.
 */
const logSecurityEvent = async (userId, eventType, details = {}, ipAddress = 'unknown', userAgent = 'unknown') => {
  let mappedEvent;

  try {
    // Map the event type to a valid event
    mappedEvent = eventMap[eventType] || eventType;

    // Validate the event type
    if (!validEvents.has(mappedEvent)) {
      console.warn(`Invalid event type: ${eventType}. Defaulting to "NULL".`);
      mappedEvent = 'NULL';
    }

    // Prepare the data object for Prisma
    const data = {
      eventType: mappedEvent,
      details: {
        ...details,
        originalEventType: eventType, // Include the original event type for reference
      },
      ipAddress,
      userAgent,
    };

    // Connect the event to the user if userId is provided
    if (userId) {
      data.user = {
        connect: { id: userId },
      };
    }

    // Log the event to the database
    await prisma.securityLog.create({
      data,
    });

    console.log(`Security event logged: ${mappedEvent}`);
  } catch (error) {
    console.error('Failed to log security event:', error.message);

    // Fallback logging
    console.log('Fallback Log:', {
      event: mappedEvent || eventType,
      userId,
      details,
      ipAddress,
      userAgent,
    });
  } finally {
    // Disconnect the Prisma client to avoid connection leaks
    await prisma.$disconnect();
  }
};

module.exports = { logSecurityEvent };