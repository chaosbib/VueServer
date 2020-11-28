const db = require('./config/db');
const express = require('./config/express');

const app = express();
const port = process.env.PORT || 3000;

// Test connection to Heroku on start-up
async function testDbConnection() {
    try {
        await db.createPool();
        await db.getPool()
    } catch (err) {
        console.error(`Unable to connect to MySQL: ${err.message}`);
        process.exit(1);
    }
}

testDbConnection()
    .then(function () {
        app.listen(port, function () {
            console.log(`Listening on port: ${port}`);
        });
    });
