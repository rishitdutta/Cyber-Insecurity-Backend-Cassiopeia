const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const isAdmin = async (req, res, next) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { role: true }
  });
  
  if (user?.role !== 'ADMIN') return res.status(403).json({ error: "Admin access required" });
  next();
};

const isVerified = async (req, res, next) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { isVerified: true }
  });
  
  if (!user?.isVerified) return res.status(403).json({ error: "Account verification required" });
  next();
};

module.exports = { isAdmin, isVerified };