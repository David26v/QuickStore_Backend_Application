const express = require('express');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());

// Import and mount routes
const lockerRoutes = require('./src/routes/lockers.routes');
const deviceRoutes = require('./src/routes/device.routes');
const clientRoutes = require('./src/routes/client.routes');



app.use('/api/devices', deviceRoutes);
app.use('/api/lockers', lockerRoutes);
app.use('/api/clients',clientRoutes)

// Ready!
app.listen(port, () => {
  console.log(`✅ Backend server running on http://localhost:${port}`);
});
