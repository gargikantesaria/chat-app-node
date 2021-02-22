const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

app.get('/', (req, res) => {
    res.render('index.ejs');
});

io.sockets.on('connection', (socket) => {
    //on create new room, when not exist
    socket.on('create', (room) => {
        socket.rooms = [{ id: socket.id, name: room }];
        socket.roomId = socket.rooms[0].id;
        //let user join the room after creation
        socket.join(socket.rooms[0].id);
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

    //on disconnect with socket
    socket.on('disconnect', (username) => {
        io.to(socket.roomId).emit('is_online', '🔴 <i>' + (socket.username || username) + ' left the chat..</i>');
    })

    // on incoming msg from user
    socket.on('chat_message', (message) => {
        socket.roomId ? 
        io.to(socket.roomId).emit('chat_message', '<strong>' + socket.username + '</strong>: ' + message) :
        io.emit('disconnect');
    });

    //delete room
    socket.on('delete_room', (roomId) => {
        //distroy the room using roomId
        let roomExist = socket.rooms.filter(room =>  room.id == roomId);
        // only if room exist
        if(roomExist.length > 0){
            socket.rooms = [];
            io.emit('disconnect');
            socket.disconnect(true);
            delete socket.roomId;
        }
       
    })

});

const server = http.listen(8080, () => {
    console.log('listening on *:8080');
});