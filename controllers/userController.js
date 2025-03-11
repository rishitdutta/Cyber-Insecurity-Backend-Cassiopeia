const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Create a new user
const createUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.create({
      data: {
        email,
        password, // Note: Hash the password in a real app!
      },
    });
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: 'User creation failed' });
  }
};

// Get all users
const getAllUsers = async (req, res) => {
  const users = await prisma.user.findMany();
  res.json(users);
};

module.exports = {
  createUser,
  getAllUsers,
};