const { Client } = require('pg');
const mysql = require('pg');

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
    return client;
};
