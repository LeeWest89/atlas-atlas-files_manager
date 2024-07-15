/* Setup class DBClient */
// import { MongoClient } from 'mongodb';
const { MongoClient } = require('mongodb');

const host = process.env.DB_HOST || 'localhost';
const port = process.env.DB_PORT || 27017;
const database = process.env.DB_DATABASE || 'files_manager';
const url = `mongodb://${host}:${port}/${database}`;

class DBClient {
  /* DBClient Class */
  constructor() {
    MongoClient.connect(url, { useUnifiedTopology: true }, (error, client) => {
      if (client) {
        this.db = client.db(database);
        this.users = this.db.collection('users');
        this.files = this.db.collection('files');
      }
    });
  }

  isAlive() {
    /* returns true when the connection to MongoDB is a success otherwise, false */
    return (!!this.db);
  }

  async nbUsers() {
    /* returns the number of documents in the collection users */
    return (this.users.countDocuments({}));
  }

  async nbFiles() {
    /* returns the number of documents in the collection files */
    return (this.files.countDocuments({}));
  }
}

const dbClient = new DBClient();
module.exports = dbClient;
