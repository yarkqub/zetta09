const express = require('express')
const app = express()
const http = require('http').createServer(app)
const io = require(`socket.io`)(http)
const db = require('better-sqlite3')('database.db', { verbose: null });

app.use('/', express.static(__dirname + "/client"))

io.on("connection", socket => {
    socket.on("register", data => {
        console.log(data)
        //Output { username, email, password }
    })
    socket.on("login", data=>{
        console.log(data)
        //Output {username, password}
    })


    socket.on("disconnect", () => {
    })
})

http.listen(8080, () => {
    console.log("Server Started")
})