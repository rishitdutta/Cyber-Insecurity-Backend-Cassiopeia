// middleware/jwtUtils.js
const jwt = require('jsonwebtoken');
require('dotenv').config();

const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid token');
  }
};

module.exports = { verifyToken };