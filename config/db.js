const { Client } = require('pg');

let client = null;

exports.createPool = async function () {
    client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    })
};

exports.getPool = function () {
    client.connect()
    return client;
};
