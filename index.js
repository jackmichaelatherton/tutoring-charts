require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./db');
const path = require('path');
const cron = require('node-cron');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());

// API routes first
app.use('/api', require('./routes'));


const syncUrl = `${process.env.RENDER_EXTERNAL_URL || 'http://localhost:3000'}/api/sync-all`;

// Cron job to sync every 5 mins (change back to 3am for prod)
// cron.schedule('0 3 * * *', async () => {
cron.schedule('*/10 * * * *', async () => {
  try {
    const res = await axios.get(syncUrl);
    console.log('✅ Sync complete:', res.data);
  } catch (err) {
    console.error('❌ Sync failed:', err.message);
  }
});

// Serve frontend only for non-API routes
if (process.env.NODE_ENV === 'production') {
  const distPath = path.resolve(__dirname, 'client/dist');
  app.use(express.static(distPath));

  app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

