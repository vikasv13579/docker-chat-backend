const supabase = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const register = async (req, res) => {
    const { email, password, role, fullName } = req.body;

    if (!email || !password || !role) {
        return res.status(400).json({ error: 'All fields are generally required.' });
    }

    if (!['patient', 'doctor'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role. Must be "patient" or "doctor".' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 8);

        const { data, error } = await supabase
            .from('users')
            .insert([
                { email, password_hash: hashedPassword, role, full_name: fullName }
            ])
            .select();

        if (error) {
            if (error.code === '23505') { // Unique violation
                return res.status(409).json({ error: 'Email already registered' });
            }
            throw error;
        }

        // Create token
        const token = jwt.sign({ id: data[0].id, role: data[0].role }, process.env.JWT_SECRET, {
            expiresIn: 86400 // 24 hours
        });

        res.status(201).json({ auth: true, token, user: data[0] });

    } catch (error) {
        console.error('Registration Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const login = async (req, res) => {
    const { email, password } = req.body;

    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (error || !data) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const passwordIsValid = await bcrypt.compare(password, data.password_hash);

        if (!passwordIsValid) {
            return res.status(401).json({ auth: false, token: null, error: 'Invalid Password' });
        }

        const token = jwt.sign({ id: data.id, role: data.role }, process.env.JWT_SECRET, {
            expiresIn: 86400 // 24 hours
        });

        res.status(200).json({ auth: true, token, user: { id: data.id, email: data.email, role: data.role, full_name: data.full_name } });

    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const me = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('id, email, role, full_name')
            .eq('id', req.userId)
            .single();

        if (error) throw error;
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch user' });
    }
}

module.exports = { register, login, me };
