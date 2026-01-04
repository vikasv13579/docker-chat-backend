const supabase = require('../db');

const getChatHistory = async (req, res) => {
    const { roomId } = req.params;
    const userId = req.userId;

    try {
        const { data: room, error: roomError } = await supabase
            .from('rooms')
            .select('*')
            .eq('id', roomId)
            .or(`patient_id.eq.${userId},doctor_id.eq.${userId}`)
            .single();

        if (roomError || !room) return res.status(403).json({ error: 'Access denied' });

        // Mark messages as read
        await supabase
            .from('messages')
            .update({ read_status: true })
            .eq('room_id', roomId)
            .neq('sender_id', userId)
            .eq('read_status', false);

        const { data: messages, error } = await supabase
            .from('messages')
            .select('*, sender:users(full_name)')
            .eq('room_id', roomId)
            .order('created_at', { ascending: true });

        if (error) throw error;
        res.status(200).json(messages);

    } catch (error) {
        console.error('Get Chat History Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const getMyRooms = async (req, res) => {
    const userId = req.userId;
    const role = req.userRole;

    try {
        let query = supabase.from('rooms').select(`
            *,
            patient:users!rooms_patient_id_fkey(full_name, id),
            doctor:users!rooms_doctor_id_fkey(full_name, id)
        `);

        if (role === 'patient') {
            query = query.eq('patient_id', userId);
        } else {
            query = query.eq('doctor_id', userId);
        }

        const { data: rooms, error } = await query;
        if (error) throw error;

        // Fetch unread counts for each room
        const roomsWithCounts = await Promise.all(rooms.map(async (room) => {
            const { count, error: countError } = await supabase
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .eq('room_id', room.id)
                .eq('read_status', false)
                .neq('sender_id', userId);

            return { ...room, unread_count: count || 0 };
        }));

        res.status(200).json(roomsWithCounts);

    } catch (error) {
        console.error('Get Rooms Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

const createRoom = async (req, res) => {
    const { patientId, doctorId } = req.body;
    try {
        const { data, error } = await supabase
            .from('rooms')
            .upsert({ patient_id: patientId, doctor_id: doctorId }, { onConflict: 'patient_id, doctor_id' })
            .select();

        if (error) throw error;
        res.status(200).json(data[0]);
    } catch (error) {
        console.error('Create Room Error:', error);
        res.status(500).json({ error: 'Failed to create room' });
    }
}

module.exports = { getChatHistory, getMyRooms, createRoom };
