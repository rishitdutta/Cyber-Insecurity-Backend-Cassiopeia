const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { logSecurityEvent } = require('../utils/securityLogger');

async function createTransaction(req, res) {
  const { receiverId, amount, type } = req.body;
  const senderId = req.user.id;

  // Validation
  if (!receiverId || !amount || !type) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  if (receiverId === senderId) {
    return res.status(400).json({ error: "Cannot transact with yourself" });
  }
  if (amount <= 0) {
    return res.status(400).json({ error: "Amount must be positive" });
  }
  if (!['CREDIT', 'DEBIT'].includes(type)) {
    return res.status(400).json({ error: "Invalid transaction type" });
  }

  try {
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId }
    });
    if (!receiver) return res.status(404).json({ error: "Receiver not found" });

    const transaction = await prisma.transaction.create({
      data: { senderId, receiverId, amount, type, status: 'PENDING' }
    });

    await logSecurityEvent(
      senderId,
      "ASSET_TRANSFER",
      { transactionId: transaction.id },
      req.ip,
      req.headers['user-agent']
    );

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
      ? await prisma.transaction.findMany()
      : await prisma.transaction.findMany({
          where: {
            OR: [
              { senderId: req.user.id },
              { receiverId: req.user.id }
            ]
          }
        });

    res.json(transactions);
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
