const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { logSecurityEvent } = require('../utils/securityLogger');

async function createTransaction(req, res) {
  const { senderAccountNumber, receiverAccountNumber, amount } = req.body;

  // Validation
  if (!senderAccountNumber || !receiverAccountNumber || !amount) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  if (senderAccountNumber === receiverAccountNumber) {
    return res.status(400).json({ error: "Cannot transact with yourself" });
  }
  if (amount <= 0) {
    return res.status(400).json({ error: "Amount must be positive" });
  }

  try {
    // Find sender account and user
    const senderAccount = await prisma.account.findUnique({
      where: { accountNumber: senderAccountNumber },
      include: { user: true } // Include the user associated with the account
    });

    if (!senderAccount) {
      return res.status(404).json({ error: "Sender account not found" });
    }

    // Find receiver account and user
    const receiverAccount = await prisma.account.findUnique({
      where: { accountNumber: receiverAccountNumber },
      include: { user: true } // Include the user associated with the account
    });

    if (!receiverAccount) {
      return res.status(404).json({ error: "Receiver account not found" });
    }

    // Check if sender has sufficient balance
    if (senderAccount.balance < amount) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    // Deduct amount from sender's account balance
    await prisma.account.update({
      where: { id: senderAccount.id },
      data: { balance: senderAccount.balance - amount }
    });

    // Add amount to receiver's account balance
    await prisma.account.update({
      where: { id: receiverAccount.id },
      data: { balance: receiverAccount.balance + amount }
    });

    // Create the transaction
    const transaction = await prisma.transaction.create({
      data: {
        senderId: senderAccount.userId,
        receiverId: receiverAccount.userId,
        amount,
        status: 'COMPLETED'
      }
    });

    // Log the transaction for the sender
    await prisma.securityLog.create({
      data: {
        userId: senderAccount.userId,
        eventType: "ASSET_TRANSFER",
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: {
          action: "TRANSACTION_CREATED",
          transactionId: transaction.id,
          amount,
          senderAccountNumber,
          receiverAccountNumber
        }
      }
    });

    res.status(201).json(transaction);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function getTransactions(req, res) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { role: true }
    });

    const transactions = user.role === 'ADMIN'
      ? await prisma.transaction.findMany({
          include: {
            sender: {
              select: {
                accounts: {
                  select: {
                    accountNumber: true
                  }
                }
              }
            },
            receiver: {
              select: {
                accounts: {
                  select: {
                    accountNumber: true
                  }
                }
              }
            }
          }
        })
      : await prisma.transaction.findMany({
          where: {
            OR: [
              { senderId: req.user.id },
              { receiverId: req.user.id }
            ]
          },
          include: {
            sender: {
              select: {
                accounts: {
                  select: {
                    accountNumber: true
                  }
                }
              }
            },
            receiver: {
              select: {
                accounts: {
                  select: {
                    accountNumber: true
                  }
                }
              }
            }
          }
        });

    // Map transactions to include account numbers and dynamic type
    const formattedTransactions = transactions.map(transaction => ({
      id: transaction.id,
      senderAccountNumber: transaction.sender.accounts[0]?.accountNumber,
      receiverAccountNumber: transaction.receiver.accounts[0]?.accountNumber,
      amount: transaction.amount,
      type: transaction.senderId === req.user.id ? 'DEBIT' : 'CREDIT', // Dynamic type
      status: transaction.status,
      createdAt: transaction.createdAt
    }));

    res.json(formattedTransactions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function getTransactionById(req, res) {
  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id: Number(req.params.id) }
    });
    if (!transaction) return res.status(404).json({ error: "Transaction not found" });

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { role: true }
    });

    if (
      user.role !== 'ADMIN' &&
      transaction.senderId !== req.user.id &&
      transaction.receiverId !== req.user.id
    ) {
      return res.status(403).json({ error: "Unauthorized access" });
    }

    res.json(transaction);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
}


module.exports = {
  createTransaction,
  getTransactions,
  getTransactionById,
  
};
