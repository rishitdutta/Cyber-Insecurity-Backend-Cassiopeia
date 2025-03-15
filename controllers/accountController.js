const { PrismaClient } = require('@prisma/client');
const { generateAccountNumber } = require('../utils/accountUtils'); // Import the utility function
const prisma = new PrismaClient();

const accountController = {
  // Create a new account for the logged-in user
  createAccount: async (req, res) => {
    try {
      const { type = "SAVINGS", balance = 0.0, currency = "USD" } = req.body;

      // Generate a unique account number
      const accountNumber = generateAccountNumber();
      // print userid
      console.log(req.user.id);

      // Get the user first
      const user = await prisma.user.findUnique({
        where: { id: req.user.id }
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Increase the balance from the user's balance
      await prisma.user.update({
        where: { id: req.user.id },
        data: { balance: user.balance + balance }
      });

      // print user balance
      console.log(user.balance);

      // Create the account
      const newAccount = await prisma.account.create({
        data: {
          userId: req.user.id,
          accountNumber, // Add the account number
          type,
          balance: parseFloat(balance),
          currency
        }
      });

      // Log account creation
      await prisma.securityLog.create({
        data: {
          userId: req.user.id,
          eventType: "NULL", //ACCOUNT_CREATION
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          details: {
            action: "PROFILE_UPDATE",
            accountId: newAccount.id,
            accountNumber: newAccount.accountNumber, // Log the account number
            accountType: type,
            initialBalance: balance
          }
        }
      });

      res.status(201).json(newAccount);
    } catch (error) {
      console.error('Error creating account:', error);
      res.status(500).json({ error: 'Failed to create account' });
    }
  },

  // Get all accounts for the logged-in user
  getMyAccounts: async (req, res) => {
    try {
      const accounts = await prisma.account.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' }
      });

      res.status(200).json(accounts);
    } catch (error) {
      console.error('Error fetching user accounts:', error);
      res.status(500).json({ error: 'Failed to fetch accounts' });
    }
  },

  // Get account by ID (for the logged-in user)
  getAccountById: async (req, res) => {
    try {
      const { id } = req.params;

      const account = await prisma.account.findFirst({
        where: {
          id: parseInt(id),
          userId: req.user.id
        }
      });

      if (!account) {
        return res.status(404).json({ error: 'Account not found or you do not have permission to view it' });
      }

      res.status(200).json(account);
    } catch (error) {
      console.error('Error fetching account by ID:', error);
      res.status(500).json({ error: 'Failed to fetch account details' });
    }
  },

  // Update account (for the logged-in user)
  updateAccount: async (req, res) => {
    try {
      const { id } = req.params;
      const { balance, currency } = req.body;

      // Check if the account exists and belongs to the user
      const existingAccount = await prisma.account.findFirst({
        where: {
          id: parseInt(id),
          userId: req.user.id
        }
      });

      if (!existingAccount) {
        return res.status(404).json({ error: 'Account not found or you do not have permission to update it' });
      }

      // Update the account
      const updatedAccount = await prisma.account.update({
        where: { id: parseInt(id) },
        data: {
          ...(balance !== undefined && { balance: parseFloat(balance) }),
          ...(currency && { currency }),
          updatedAt: new Date()
        }
      });

      // Log account update
      await prisma.securityLog.create({
        data: {
          userId: req.user.id,
          eventType: "ACCOUNT_UPDATE",
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          details: {
            action: "ACCOUNT_UPDATED",
            accountId: parseInt(id),
            previousBalance: existingAccount.balance,
            newBalance: updatedAccount.balance,
            previousCurrency: existingAccount.currency,
            newCurrency: updatedAccount.currency
          }
        }
      });

      res.status(200).json(updatedAccount);
    } catch (error) {
      console.error('Error updating account:', error);
      res.status(500).json({ error: 'Failed to update account' });
    }
  },

  // Delete account (for the logged-in user)
  deleteAccount: async (req, res) => {
    try {
      const { id } = req.params;

      // Check if the account exists and belongs to the user
      const accountToDelete = await prisma.account.findFirst({
        where: {
          id: parseInt(id),
          userId: req.user.id
        }
      });

      if (!accountToDelete) {
        return res.status(404).json({ error: 'Account not found or you do not have permission to delete it' });
      }

      // Return the account's balance to the user's balance
      const user = await prisma.user.findUnique({
        where: { id: req.user.id }
      });

      await prisma.user.update({
        where: { id: req.user.id },
        data: { balance: user.balance + accountToDelete.balance }
      });

      // Delete the account
      await prisma.account.delete({
        where: { id: parseInt(id) }
      });

      // Log account deletion
      await prisma.securityLog.create({
        data: {
          userId: req.user.id,
          eventType: "ACCOUNT_DELETION",
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          details: {
            action: "ACCOUNT_DELETED",
            accountId: parseInt(id),
            accountType: accountToDelete.type,
            accountBalance: accountToDelete.balance
          }
        }
      });

      res.status(200).json({ message: 'Account deleted successfully' });
    } catch (error) {
      console.error('Error deleting account:', error);
      res.status(500).json({ error: 'Failed to delete account' });
    }
  }
};

module.exports = accountController;