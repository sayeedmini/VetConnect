const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const vetRoutes = require('./routes/vetRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const prescriptionRoutes = require('./routes/prescriptionRoutes');
const reviewRoutes = require('./routes/reviewRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('VetConnect API is running...');
});

app.use('/api/auth', authRoutes);
app.use('/api/vets', vetRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api', reviewRoutes);

module.exports = app;
