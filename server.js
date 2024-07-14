const express = require('express');
const routes = require('./routes');

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 5000;
app.use('/', routes);

const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

const gracefulShutdown = () => {
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
