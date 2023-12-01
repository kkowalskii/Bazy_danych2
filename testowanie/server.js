const express = require('express');
const cors = require('cors');
const app = express();
const connectToDB = require('./database/database_connection.js');
const routes = require('./routes/record.js');
require('dotenv').config({ path: './config.env' });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

const port = process.env.PORT || 3000;

connectToDB(app);
app.use(routes);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});