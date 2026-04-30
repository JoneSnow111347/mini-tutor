const express = require('express');
const routes = require('./routes');

const app = express();

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({
    message: 'Server is running'
  });
});

app.use('/api', routes);

module.exports = app;
