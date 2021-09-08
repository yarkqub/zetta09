const express = require('express')
const app = express()
const http = require('http').createServer(app)
const io = require(`socket.io`)(http)
const db = require('better-sqlite3')('database.db', { verbose: null })
const bcrypt = require('bcrypt')
const saltRounds = 10

app.use('/', express.static(__dirname + "/client"))

const rooms = []

io.on("connection", socket => {
    let ip = "127.0.0.1"
    const get_ip = socket.request.connection.remoteAddress.split("::ffff:")[1]
    if (get_ip) {
        ip = get_ip
    }
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
                            db.prepare("INSERT INTO users (username, mail, password, credits, account_created, ip_last, ip_reg, home_room) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(data.username, data.email, hash, 5000, gettime, ip, ip, 8)
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
                    socket.uid = user.id
                    const timenow = new Date()
                    const gettime = Math.floor(timenow.getTime() / 1000)
                    db.prepare("UPDATE users SET last_online = ?, ip_last = ? WHERE id = ?").run(gettime, ip, user.id)
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
    socket.on("enter", () => {
        const user = db.prepare("SELECT * FROM users WHERE id = ?").get(socket.uid)
        socket.room = user.home_room
        const room = db.prepare("SELECT * FROM rooms WHERE id = ?").get(user.home_room)
        const room_model = db.prepare("SELECT * FROM room_models WHERE id = ?").get(room.model_name)//heightmap
        const room_count = rooms.some(rm => rm.room.id == room.id)
        if (!room_count) {
            rooms.push({
                room: room,
                room_model: room_model,
                players: []
            })
        }
        const rm = rooms.find(rm => rm.room.id == room.id)
        rm.players.push(user)
        socket.join(socket.room)
    })

    socket.on("disconnect", () => {
        if (socket.room) {
            const room = rooms.find(rm => rm.room.id == socket.room)
            room.players.forEach((ply, index) => {
                if (ply.id == socket.uid) {
                    room.players.splice(index, 1)
                    if (!room.players.length) {
                        rooms.forEach((rm, room_index) => {
                            if (rm.room.id == socket.room) {
                                rooms.splice(room_index, 1)
                            }
                        })
                    }
                }
            })
        }
    })
})

http.listen(8080, () => {
    console.log("Server Started")
})

setInterval(() => {
    rooms.forEach(room => {
        io.in(room.room.id).emit("game", room)
    })
}, 1000 / 30)