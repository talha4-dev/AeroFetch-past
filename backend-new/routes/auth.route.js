const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User } = require('../models');
const { OAuth2Client } = require('google-auth-library');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-dev-secret-key';
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || 'your-client-id');

// Middleware to protect routes mapped from jwt_required()
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) return res.status(403).json({ success: false, error: 'Token expired or invalid' });
      req.user = user;
      next();
    });
  } else {
    res.status(401).json({ success: false, error: 'Missing or invalid token' });
  }
};

router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, error: 'Email and password required' });

    let user = await User.findOne({ where: { email: email.toLowerCase() } });
    if (user) return res.status(409).json({ success: false, error: 'Account already exists' });

    const password_hash = await bcrypt.hash(password, 10);
    user = await User.create({ email: email.toLowerCase(), password_hash, name });

    const access_token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ success: true, access_token, user: await user.toDict() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email: email?.toLowerCase() } });

    if (!user || !(await user.checkPassword(password))) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const access_token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ success: true, access_token, user: await user.toDict() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/me', authenticateJWT, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({ success: true, user: await user.toDict() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/logout', authenticateJWT, (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ success: false, error: 'Credential missing' });

    const ticket = await client.verifyIdToken({ idToken: credential });
    const payload = ticket.getPayload();
    
    let user = await User.findOne({ where: { google_id: payload.sub } });
    
    if (!user) {
      user = await User.findOne({ where: { email: payload.email.toLowerCase() } });
      if (user) {
        user.google_id = payload.sub;
        if (!user.picture) user.picture = payload.picture;
        await user.save();
      } else {
        user = await User.create({
          email: payload.email.toLowerCase(),
          name: payload.name,
          google_id: payload.sub,
          picture: payload.picture
        });
      }
    }

    const access_token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ success: true, access_token, user: await user.toDict() });
  } catch (err) {
    res.status(401).json({ success: false, error: `Invalid Google token: ${err.message}` });
  }
});

module.exports = {
  router,
  authenticateJWT
};
