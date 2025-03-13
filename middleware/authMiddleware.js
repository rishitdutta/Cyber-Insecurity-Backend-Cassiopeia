const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    await logSecurityEvent(
      null,
      "UNAUTHENTICATED_ACCESS",
      { path: req.path },
      req.ip,
      req.headers['user-agent']
    );
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const decoded = verifyToken(token);
    
    if (decoded.exp <= Date.now() / 1000) {
      await logSecurityEvent(
        decoded.userId,
        "EXPIRED_TOKEN_ATTEMPT",
        { token },
        req.ip,
        req.headers['user-agent']
      );
      return res.status(401).json({ error: "Token has expired" });
    }
    
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    
    if (!user || !user.isVerified) {
      await logSecurityEvent(
        decoded.userId,
        "INVALID_USER_ACCESS",
        { userId: decoded.userId },
        req.ip,
        req.headers['user-agent']
      );
      return res.status(401).json({ error: "User not found or not verified" });
    }
    
    if (user.passwordChangedAt && user.passwordChangedAt > new Date(decoded.iat * 1000)) {
      await logSecurityEvent(
        user.id,
        "STALE_TOKEN_ATTEMPT",
        { lastPasswordChange: user.passwordChangedAt },
        req.ip,
        req.headers['user-agent']
      );
      return res.status(401).json({ error: "Password has been changed, please login again" });
    }
    
    req.user = { id: decoded.userId };
    next();
  } catch (error) {
    await logSecurityEvent(
      null,
      "INVALID_TOKEN_ATTEMPT",
      { 
        error: error.message,
        token: token.slice(0, 10) + '...' // Log partial token for security
      },
      req.ip,
      req.headers['user-agent']
    );
    res.status(401).json({ error: "Invalid token" });
  }
};

module.exports = authenticate;