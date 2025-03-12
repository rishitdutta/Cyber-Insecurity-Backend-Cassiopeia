const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Hash password with proper salt rounds
const hashPassword = async (password) => {
  const saltRounds = 12; // Higher rounds = more secure, but slower
  return await bcrypt.hash(password, saltRounds);
};

// Compare password with hash
const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

// Generate token with expiry time
const generateToken = (userId, expiresIn = '24h') => {
  return jwt.sign(
    { userId }, 
    process.env.JWT_SECRET, 
    { expiresIn }
  );
};

// Verify token
const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

module.exports = {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken
};