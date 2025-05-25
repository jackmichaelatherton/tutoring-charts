require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./db');
const path = require('path');
const cron = require('node-cron');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

connectDB();
app.use(cors());

// Register routes
app.use('/api', require('./routes'));

// Schedule cron job for syncing every 5 minutes (change back to 3am when deploying)
// cron.schedule('0 3 * * *', async () => {
cron.schedule('*/5 * * * *', async () => {
  try {
    const res = await axios.get('http://localhost:3000/api/sync-all');
    console.log('✅ Sync complete:', res.data);
  } catch (err) {
    console.error('❌ Sync failed:', err.message);
  }
});

// Serve frontend only after everything else
if (process.env.NODE_ENV === 'production') {
  const distPath = path.resolve(__dirname, 'client/dist');
  app.use(express.static(distPath));

  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
