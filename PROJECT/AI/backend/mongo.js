require("dotenv").config();

const mongoose = require("mongoose");

const defaultUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/ai_security_db";
let connectionPromise = null;

async function connectMongo(uri = defaultUri) {
    if (mongoose.connection.readyState === 1) {
        return mongoose.connection;
    }

    if (!connectionPromise) {
        connectionPromise = mongoose.connect(uri, {
            serverSelectionTimeoutMS: 5000,
            autoIndex: true,
            maxPoolSize: 10
        });
    }

    try {
        await connectionPromise;
        return mongoose.connection;
    } catch (error) {
        connectionPromise = null;
        throw error;
    }
}

module.exports = { mongoose, connectMongo, defaultUri };
