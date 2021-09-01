const express = require('express')
const app = express()
const http = require('http').createServer(app)
const io = require(`socket.io`)(http)
const db = require('better-sqlite3')('database.db', { verbose: null });

app.use('/', express.static(__dirname + "/client"))

io.on("connection", socket => {
    socket.on("disconnect", () => {
    })
})

http.listen(8080, () => {
    console.log("Server Started")
})