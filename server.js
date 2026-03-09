require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: false, // For local testing fonts/scripts
}));

app.use(cors({
  origin: process.env.ASAAS_ENV === 'sandbox' ? '*' : 'https://elaprovip.vercel.app'
}));

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
const asaasRoutes = require('./routes/asaas');
app.use('/api', asaasRoutes);

// Fallback to serve index.html for any other request (SPA behavior)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 ElaPro Checkout running at http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.ASAAS_ENV}`);
});

module.exports = app;
