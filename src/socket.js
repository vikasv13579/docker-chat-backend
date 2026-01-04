const supabase = require('./db');
const jwt = require('jsonwebtoken');

// Track online users: userId -> Set(socketIds)
const onlineUsers = new Map();

module.exports = (io) => {
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) return next(new Error('Authentication error'));

        jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
            if (err) return next(new Error('Authentication error'));
            socket.userId = decoded.id;
            socket.userRole = decoded.role;
            next();
        });
    });

    io.on('connection', (socket) => {
        const userId = socket.userId;

        // Add to online users
        if (!onlineUsers.has(userId)) {
            onlineUsers.set(userId, new Set());
        }
        onlineUsers.get(userId).add(socket.id);

        // Broadcast online status to everyone (or just relevant people, but for simplicity everyone)
        io.emit('user_status', { userId, status: 'online' });

        // Send current online list to the connector
        const onlineList = Array.from(onlineUsers.keys());
        socket.emit('online_users', onlineList);

        socket.on('join_room', (roomId) => {
            socket.join(roomId);
        });

        socket.on('send_message', async ({ roomId, content }) => {
            try {
                const { data, error } = await supabase
                    .from('messages')
                    .insert([{ room_id: roomId, sender_id: userId, content }])
                    .select('*, sender:users(full_name)')
                    .single();

                if (error) throw error;
                io.to(roomId).emit('receive_message', data);

                // Notify others to update room list (unread count)
                // We can emit a 'new_message_notification' to the recipient
                // Need to know recipient ID. 
                // We can fetch room participants or just emit to room and let client handle "if not in this room, increment".
                // socket.broadcast.to(roomId) ...
                // Actually, if client is in room but not looking at it?
                // Simpler: emit 'message_notification' to the room.
                socket.broadcast.to(roomId).emit('message_notification', { roomId, senderId: userId });

            } catch (err) {
                console.error('Send message error:', err);
            }
        });

        socket.on('typing', ({ roomId, isTyping }) => {
            socket.to(roomId).emit('user_typing', { userId, isTyping });
        });

        socket.on('disconnect', () => {
            if (onlineUsers.has(userId)) {
                onlineUsers.get(userId).delete(socket.id);
                if (onlineUsers.get(userId).size === 0) {
                    onlineUsers.delete(userId);
                    io.emit('user_status', { userId, status: 'offline' });
                }
            }
        });
    });
};
