const express = require('express')
const app = express()
const http = require('http').createServer(app)
const io = require(`socket.io`)(http)
const db = require('better-sqlite3')('database.db', { verbose: null })
const bcrypt = require('bcrypt')
const saltRounds = 10

app.use('/', express.static(__dirname + "/client"))

io.on("connection", socket => {
    socket.on("register", data => {
        if (/^[a-zA-Z0-9]+$/.test(data.username)) {
            if (/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(String(data.email).toLowerCase())) {
                const check1 = db.prepare("SELECT COUNT(*) FROM users WHERE username = ? COLLATE NOCASE").get(data.username)
                if (check1["COUNT(*)"]) {
                    socket.emit("message", { color: "red", msg: "Username already exist" })
                }
                else {
                    const check2 = db.prepare("SELECT COUNT(*) FROM users WHERE mail = ? COLLATE NOCASE").get(data.email)
                    if (check2["COUNT(*)"]) {
                        socket.emit("message", { color: "red", msg: "Email address already exist" })
                    }
                    else {
                        bcrypt.hash(data.password, saltRounds, function (err, hash) {
                            const timenow = new Date()
                            const gettime = Math.floor(timenow.getTime() / 1000)
                            db.prepare("INSERT INTO users (username, mail, password, credits, account_created, ip_last, ip_reg, home_room) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(data.username, data.email, hash, 5000, gettime, data.ip, data.ip, 1)
                            socket.emit("message", { color: "green", msg: "Account created, login to continue" })
                        })
                    }
                }
            }
            else {
                socket.emit("message", { color: "red", msg: "Email address not valid" })
            }
        }
        else {
            socket.emit("message", { color: "red", msg: "Special Character are not allowed" })
        }
    })
    socket.on("login", data => {
        const check1 = db.prepare("SELECT COUNT(*) FROM users WHERE username = ? COLLATE NOCASE").get(data.username)
        if (check1["COUNT(*)"]) {
            const user = db.prepare("SELECT * FROM users WHERE username = ? COLLATE NOCASE").get(data.username)
            bcrypt.compare(data.password, user.password, function (err, result) {
                if (result) {
                    const timenow = new Date()
                    const gettime = Math.floor(timenow.getTime() / 1000)
                    db.prepare("UPDATE users SET last_online = ?, ip_last = ? WHERE id = ?").run(gettime, data.ip, user.id)
                    socket.emit("login", user)
                }
                else {
                    socket.emit("message", { color: "red", msg: "Password not match" })
                }
            });
        }
        else {
            socket.emit("message", { color: "red", msg: "Username not found" })
        }
    })

    socket.on("disconnect", () => {
    })
})

http.listen(8080, () => {
    console.log("Server Started")
})