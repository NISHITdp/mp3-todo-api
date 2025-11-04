// server.js

// ===== Imports =====
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
require('dotenv').config(); // reads .env

// ===== App setup =====
const app = express();
const port = process.env.PORT || 3000;

// ----- CORS (keep simple for MP) -----
const allowCrossDomain = (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header(
    'Access-Control-Allow-Headers',
    'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept'
  );
  res.header('Access-Control-Allow-Methods', 'POST, GET, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
};
app.use(allowCrossDomain);

// ----- Body parsing -----
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// ===== MongoDB (Atlas) =====
// Put MONGODB_URI in .env, e.g.:
// MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/mp3?retryWrites=true&w=majority
mongoose.set('strictQuery', false);
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });

// ===== Health check (handy for Render + local) =====
app.get('/api/health', (req, res) => {
  res.status(200).json({ message: 'OK', data: { status: 'up' } });
});

// ===== Routes =====
// This expects routes/index.js to export a function: (app, router) => { ... }
require('./routes')(app, router);

// ===== Start server =====
app.listen(port, () => {
  console.log('Server running on port ' + port);
});
