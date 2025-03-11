const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const userRoutes = require('./routes/userRoutes'); // Ensure this is correct
// const transactionRoutes = require('./routes/transactionRoutes');
// const investmentRoutes = require('./routes/investmentRoutes');
// const loanRoutes = require('./routes/loanRoutes');
// const securityLogRoutes = require('./routes/securityLogRoutes');
// const mfaTokenRoutes = require('./routes/mfaTokenRoutes');

// Load environment variables
dotenv.config();

// Create an Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // Parse JSON request bodies

// Routes
app.use('/api/users', userRoutes);
// app.use('/api/transactions', transactionRoutes);
// app.use('/api/investments', investmentRoutes);
// app.use('/api/loans', loanRoutes);
// app.use('/api/security-logs', securityLogRoutes);
// app.use('/api/mfa-tokens', mfaTokenRoutes);

// Test route
app.get('/', (req, res) => {
  res.send('Digital Banking Backend is running!');
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});