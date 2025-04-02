const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const prisma = require('@prisma/client');
const authenticate = require('./middleware/authMiddleware');

dotenv.config();
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users',authenticate , require('./routes/userRoutes'));
app.use('/api/assets',authenticate , require('./routes/assetRoutes'));
app.use('/api/transactions', authenticate ,require('./routes/transactionRoutes'));
app.use('/api/investments', authenticate , require('./routes/investmentRoutes'));
app.use('/api/accounts', authenticate , require('./routes/accountRoutes'));
app.use('/api/dashboard', authenticate , require('./routes/dashboardRoutes'));
app.use('/api/loans', authenticate , require('./routes/loanRoutes'));
app.use('/api/security-logs', authenticate , require('./routes/securitylogRoutes'));

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));