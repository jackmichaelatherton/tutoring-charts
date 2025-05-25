const express = require('express');
const router = express.Router();
const { XeroClient } = require('xero-node');
const XeroBankTransaction = require('../../models/XeroBankTransaction');

const xero = new XeroClient({
  clientId: process.env.XERO_CLIENT_ID,
  clientSecret: process.env.XERO_CLIENT_SECRET,
  redirectUris: ['http://localhost:3000/api/xero/callback'],
  scopes: [
    'openid',
    'profile',
    'email',
    'offline_access',
    'accounting.transactions',
    'accounting.reports.read',
    'accounting.settings'
  ]
});

// 🔗 Start OAuth connection
router.get('/connect', async (req, res) => {
  try {
    const url = await xero.buildConsentUrl();
    res.redirect(url);
  } catch (err) {
    console.error('❌ Failed to start Xero OAuth:', err);
    res.status(500).send('Could not connect to Xero');
  }
});

// 🔄 OAuth callback
router.get('/callback', async (req, res) => {
  try {
    await xero.apiCallback(req.url);         // exchange code for token
    await xero.updateTenants();              // load tenants from Xero

    if (!xero.tenants || xero.tenants.length === 0) {
      console.error('❌ No tenants found after auth');
      return res.status(400).send('No tenants found');
    }

    console.log('✅ Connected tenant:', xero.tenants[0].tenantName);
    res.send('✅ Xero connected. You can now sync financial data.');
  } catch (err) {
    console.error('❌ OAuth callback failed:', err);
    res.status(500).send('Xero callback failed');
  }
});

// 📥 Sync Bank Transactions
router.get('/sync-bank-transactions', async (req, res) => {
  try {
    if (!xero.tenants || xero.tenants.length === 0) {
      return res.status(400).send('❌ No connected Xero tenant found');
    }

    const tenantId = xero.tenants[0].tenantId;

    const response = await xero.accountingApi.getBankTransactions(tenantId);
    const transactions = response.body.bankTransactions;

    let count = 0;
    for (const tx of transactions) {
      await XeroBankTransaction.updateOne(
        { BankTransactionID: tx.BankTransactionID },
        { $set: tx },
        { upsert: true }
      );
      count++;
    }

    res.json({ message: `✅ Synced ${count} bank transactions` });
  } catch (err) {
    console.error('❌ Xero sync failed:', err.response?.body || err);
    res.status(500).send('Failed to sync bank transactions from Xero');
  }
});

// 🧾 (Optional) Fetch invoices
router.get('/invoices', async (req, res) => {
  try {
    const response = await xero.accountingApi.getInvoices(
      xero.tenants[0].tenantId
    );
    res.json(response.body.invoices);
  } catch (err) {
    console.error('❌ Invoice fetch failed:', err);
    res.status(500).send('Failed to fetch invoices');
  }
});

module.exports = router;
