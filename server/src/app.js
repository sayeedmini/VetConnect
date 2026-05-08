const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const vetRoutes = require('./routes/vetRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const messageRoutes = require('./routes/messageRoutes');
const profileRoutes = require('./routes/profileRoutes');
const postRoutes = require('./routes/postRoutes');
const prescriptionRoutes = require('./routes/prescriptionRoutes');
const keyManagementRoutes = require('./routes/keyManagementRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json());
app.use((req, res, next) => {
  req.cookies = require('./utils/cookies').parseCookies(req.headers.cookie || '');
  next();
});

app.get('/', (req, res) => {
  res.send('VetConnect API is running...');
});

app.use('/api/auth', authRoutes);
app.use('/api/vets', vetRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/security', keyManagementRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', reviewRoutes);

module.exports = app;
