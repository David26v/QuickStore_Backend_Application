const express = require('express');
const cors = require('cors'); // ✅ Import CORS
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors()); // ✅ Enable CORS for all origins
app.use(express.json());

// ✅ Import routes
const lockerRoutes = require('./src/routes/lockers.routes');
const deviceRoutes = require('./src/routes/device.routes');
const clientRoutes = require('./src/routes/client.routes');

// ✅ Use routes
app.use('/api/devices', deviceRoutes);
app.use('/api/lockers', lockerRoutes);
app.use('/api/clients', clientRoutes);

// ✅ Start server
app.listen(port, () => {
  console.log(`✅ Backend server running on http://localhost:${port}`);
});
