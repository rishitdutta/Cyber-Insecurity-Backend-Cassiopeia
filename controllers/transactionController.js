const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { logSecurityEvent } = require('../utils/securityLogger');

exports.createTransaction = async (req, res) => {
  try {
    const { receiverId, amount, type } = req.body;
    
    // Check sender balance
    const senderAsset = await prisma.asset.findFirst({
      where: { userId: req.user.id, type: 'USD' }
    });
    
    if (senderAsset.balance < amount) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    const transaction = await prisma.$transaction([
      prisma.asset.update({
        where: { id: senderAsset.id },
        data: { balance: { decrement: amount } }
      }),
      prisma.asset.update({
        where: { userId: receiverId, type: 'USD' },
        data: { balance: { increment: amount } }
      }),
      prisma.transaction.create({
        data: {
          senderId: req.user.id,
          receiverId,
          amount,
          type,
          status: 'COMPLETED'
        }
      })
    ]);

    logSecurityEvent(req.user.id, "TRANSACTION_CREATED");
    res.status(201).json(transaction[2]);
  } catch (error) {
    res.status(400).json({ error: "Transaction failed" });
  }
};

// Add more functions (getTransactions, updateStatus, etc.)