const { verifyToken } = require('../utils/auth');
const { logSecurityEvent } = require('../utils/securityLogger');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: "Authentication required" });

  try {
    const decoded = verifyToken(token);
    
    // Check if token has expired
    if (decoded.exp <= Date.now() / 1000) {
      return res.status(401).json({ error: "Token has expired" });
    }
    
    // Check if user exists and is still active
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    
    if (!user || !user.isVerified) {
      return res.status(401).json({ error: "User not found or not verified" });
    }
    
    // Check if password was changed after token was issued
    if (user.passwordChangedAt && user.passwordChangedAt > new Date(decoded.iat * 1000)) {
      return res.status(401).json({ error: "Password has been changed, please login again" });
    }
    
    // Add user data to request
    req.user = { id: decoded.userId };
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    logSecurityEvent(null, "INVALID_TOKEN_ATTEMPT", { ip: req.ip });
    res.status(401).json({ error: "Invalid token" });
  }
};

module.exports = authenticate;