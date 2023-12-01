const { MongoClient } = require('mongodb');

async function connectToDB(app) {
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    console.log('Connected to the database');

    const database = client.db(process.env.DB_NAME);
    const productsCollection = database.collection(process.env.COLLECTION_NAME);
    app.locals.productsCol = productsCollection;
  } catch (err) {
    console.error('Error connecting to the database:', err);
  }
}

module.exports = connectToDB;
