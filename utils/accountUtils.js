// src/utils/accountUtils.js
function generateAccountNumber() {
    const prefix = "ACC"; // Prefix for the account number
    const randomNumber = Math.floor(1000000000000000 + Math.random() * 9000000000000000); // 16-digit random number
    return `${prefix}${randomNumber}`;
  }
  
  module.exports = { generateAccountNumber };