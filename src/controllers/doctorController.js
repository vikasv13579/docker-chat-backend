const supabase = require('../db');

const listDoctors = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('id, full_name, specialization')
            .eq('role', 'doctor');

        if (error) throw error;
        res.status(200).json(data);
    } catch (error) {
        console.error('List Doctors Error:', error);
        res.status(500).json({ error: 'Failed to fetch doctors' });
    }
};

module.exports = { listDoctors };
