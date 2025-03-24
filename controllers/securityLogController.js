const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getUserLogs(req, res) {
  console.log('🔍 Fetching security logs for user:', req.user.id);
  
  try {
    console.log('📊 Querying database for user logs...');
    const logs = await prisma.securityLog.findMany({
      where: {
        userId: req.user.id
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50 // Limit to last 50 logs
    });

    console.log(`✅ Successfully fetched ${logs.length} logs for user ${req.user.id}`);
    console.log('📝 Sample log:', logs[0] || 'No logs found');
    
    res.json(logs);
  } catch (error) {
    console.error('❌ Error fetching user logs:', error);
    console.error('🔍 Error details:', {
      userId: req.user.id,
      errorMessage: error.message,
      errorStack: error.stack
    });
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function getAllLogs(req, res) {
  console.log('🔍 Attempting to fetch all security logs');
  console.log('👤 Request made by user:', req.user.id);

  try {
    // Check if user is admin
    console.log('🔒 Verifying admin privileges...');
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { role: true }
    });

    if (user.role !== 'ADMIN') {
      console.warn('⚠️ Unauthorized access attempt to getAllLogs by non-admin user:', req.user.id);
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    console.log('✅ Admin verification successful');
    console.log('📊 Fetching all security logs...');

    const logs = await prisma.securityLog.findMany({
      include: {
        user: {
          select: {
            email: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`📈 Successfully retrieved ${logs.length} total logs`);
    console.log('📝 Sample log:', logs[0] || 'No logs found');

    res.json(logs);
  } catch (error) {
    console.error('❌ Error fetching all logs:', error);
    console.error('🔍 Error details:', {
      requestingUserId: req.user.id,
      errorMessage: error.message,
      errorStack: error.stack
    });
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function getLogById(req, res) {
  console.log('🔍 Fetching specific log');
  console.log('📌 Log ID:', req.params.id);
  console.log('👤 Requesting user:', req.user.id);

  try {
    console.log('📊 Querying database for specific log...');
    const log = await prisma.securityLog.findUnique({
      where: { id: req.params.id },
      include: {
        user: {
          select: {
            email: true,
            name: true
          }
        }
      }
    });

    if (!log) {
      console.warn('⚠️ Log not found:', req.params.id);
      return res.status(404).json({ error: 'Log not found' });
    }

    console.log('🔒 Checking access permissions...');
    // Check if user is authorized to view this log
    if (log.userId !== req.user.id && req.user.role !== 'ADMIN') {
      console.warn('⚠️ Unauthorized access attempt to log:', {
        logId: req.params.id,
        requestingUserId: req.user.id,
        logOwnerId: log.userId
      });
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    console.log('✅ Access granted, returning log data');
    console.log('📝 Log details:', {
      id: log.id,
      eventType: log.eventType,
      timestamp: log.createdAt
    });

    res.json(log);
  } catch (error) {
    console.error('❌ Error fetching log by ID:', error);
    console.error('🔍 Error details:', {
      logId: req.params.id,
      requestingUserId: req.user.id,
      errorMessage: error.message,
      errorStack: error.stack
    });
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  getUserLogs,
  getAllLogs,
  getLogById
};
