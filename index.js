const express = require('express');
var bodyParser = require("body-parser");
const app = express();
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

const http = require('http').Server(app);
const io = require('socket.io')(http);
const ioClient = require('socket.io-client')('http://localhost:8080');

app.get('/createRoomUI', (req, res) => {
    res.render('createRoom.ejs');
});

app.get('/room:id', (req, res) => {
    res.render('index.ejs');
});
var roomId;
io.sockets.on('connection', (socket) => {
    roomId = socket.id;
    socket.rooms = [{ id: socket.id, name: 'room1' }];

    //on create new room, when not exist
    socket.on('create', (room) => {
        socket.rooms = [{ id: socket.id, name: room }];
        socket.roomId = socket.rooms[0].id;
        //let user join the room after creation
        socket.emit('socket_created', socket.roomId);
    });

    //room already exist and user joined this room
    socket.on('join_room', (roomData) => {
        socket.roomId = roomData.roomId;
        socket.rooms = [{ id: roomData.roomId, name: roomData.name }];
        //let user join the same room
        socket.join(roomData.roomId);
    })

    //user who joined the room
    socket.on('username', (username) => {
        socket.username = username;
        io.sockets.in(socket.roomId).emit('joined_room', { room: socket.rooms[0].name, room_id: socket.roomId, user_name: socket.username });
        io.to(socket.roomId).emit('is_online', '🔵 <i>' + socket.username + ' join the chat..</i>');
    });

    //on disconnect user
    socket.on('disconnect', (username) => {
        io.to(socket.roomId).emit('is_online', '🔴 <i>' + (socket.username || username) + ' left the chat..</i>');
    })

    // on incoming msg from user
    socket.on('chat_message', (message) => {
        socket.roomId ? 
        io.to(socket.roomId).emit('chat_message', '<strong>' + socket.username + '</strong>: ' + message) :
        io.emit('disconnectRoom');
    });

    //delete room
    socket.on('delete_room', (roomId) => {
        //distroy the room using roomId
        let roomExist = socket.rooms.filter(room =>  room.id == roomId);
        // only if room exist
        if(roomExist.length > 0){
            socket.rooms = [];
            io.to(roomId).emit('disconnectRoom');
            socket.disconnect(true);
            delete socket.roomId;
        }
    })

});
//API to create room
app.get('/createRoom', (req, res) => {
    ioClient.emit('create');
    res.status(200).send({body: {msg : 'New Room Generated', roomId: roomId}});  
})

//API to create room
app.post('/deleteRoom', (req, res) => {
    ioClient.emit('delete_room', req.body.roomId);
    res.status(200).send({body: {msg : 'Room Deleted'}});  
})


const server = http.listen(8080, () => {
    console.log('listening on *:8080');
});