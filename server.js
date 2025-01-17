const express = require('express');
const routes = require('./routes');

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 5000;
app.use('/', routes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
