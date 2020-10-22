/*
 * 1. POST: /:username/:age -> create a row in users table with given values.
 * 2. GET: /:username -> return the user with the given username.
 */
const express = require("express");
const app = express();
const mysql = require("mysql");
const redis = require("redis");

const connection = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "password",
    database: "bloom"
});
connection.connect();

const bloomFilter = redis.createClient();

String.prototype.hashFunction = function() {
    var hash = 0;
    if (this.length == 0) return hash;
    for (i = 0; i < this.length; i++) {
        char = this.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash % 64;
};

app.get("/:username", (req, res) => {
    const { username } = req.params;

    const index = username.hashFunction();
    // This exists in the bloomFilter.
    bloomFilter.exists(index, (err, ok) => {
        if (err) return res.send(err);

        if (!ok) {
            return res.send("User doesn't exist");
        } else {
            console.log("Querying database");
            connection.query(
                "SELECT * FROM users WHERE username = ?",
                [username],
                (err, result) => {
                    return res.send(result[0]);
                }
            );
        }
    });
});

app.post("/:username/:age", (req, res) => {
    const { username, age } = req.params;

    connection.query(
        "INSERT INTO USERS VALUES(?, ?)",
        [username, age],
        (err, result) => {
            if (!err) {
                const index = username.hashFunction();
                bloomFilter.set(index, 1);
                res.send("User added!");
            } else {
                res.send(err);
            }
        }
    );
});

app.listen(5000, () => console.log("Server at 5000"));
