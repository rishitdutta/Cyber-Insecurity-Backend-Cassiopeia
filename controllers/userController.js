const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all users (Admin only)
exports.getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
};

// Get user profile
exports.getProfile = async (req, res) => {
  const userId = req.user.id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true, isVerified: true },
  });
  res.json(user);
};