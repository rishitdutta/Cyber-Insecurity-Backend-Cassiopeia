const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { logSecurityEvent } = require('../utils/securityLogger');

const userController = {
  getCurrentUser: async (req, res) => {
    console.log('Request received at /me'); // Log the request
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          address: true,
          country: true,
          timezone: true,
          mfaEnabled: true,
          createdAt: true,
          updatedAt: true
        }
      });
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  },

  updateProfile: async (req, res) => {
    try {
      const { name, phone, address, country, timezone } = req.body;
      
      const updatedUser = await prisma.user.update({
        where: { id: req.user.id },
        data: { name, phone, address, country, timezone },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          address: true,
          country: true,
          timezone: true
        }
      });

      await logSecurityEvent(
        req.user.id,
        "PROFILE_UPDATE",
        { fields: Object.keys(req.body) },
        req.ip,
        req.headers['user-agent']
      );

      res.json(updatedUser);
    } catch (error) {
      res.status(400).json({ error: 'Profile update failed' });
    }
  },

  updateSecurity: async (req, res) => {
    try {
      const { mfaEnabled } = req.body;
      
      const updatedUser = await prisma.user.update({
        where: { id: req.user.id },
        data: { mfaEnabled },
        select: { mfaEnabled: true }
      });

      await logSecurityEvent(
        req.user.id,
        mfaEnabled ? "MFA_ENABLED" : "MFA_DISABLED",
        {},
        req.ip,
        req.headers['user-agent']
      );

      res.json(updatedUser);
    } catch (error) {
      res.status(400).json({ error: 'Security update failed' });
    }
  }
};

module.exports = userController;