const dotenv = require('dotenv');
const http = require('http');
dotenv.config();

const app = require('./src/app');
const connectDB = require('./src/config/db');
const { initializeKeyManagement } = require('./src/security/keyManagementService');
const { initializeSocketServer } = require('./src/socket');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  await initializeKeyManagement();

  const server = http.createServer(app);
  if (process.env.ENABLE_SOCKET_IO !== 'false') {
    initializeSocketServer(server);
  }

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();
