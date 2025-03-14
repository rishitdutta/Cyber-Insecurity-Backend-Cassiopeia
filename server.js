const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const prisma = require('@prisma/client');

dotenv.config();
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/assets', require('./routes/assetRoutes'));
app.use('/api/transactions', require('./routes/transactionRoutes'));
app.use('/api/investments', require('./routes/investmentRoutes'));
// app.use('/api/loans', require('./routes/loanRoutes'));
// app.use('/api/security', require('./routes/securityRoutes'));

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));