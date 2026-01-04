-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('patient', 'doctor')),
    full_name TEXT,
    specialization TEXT, -- For doctors
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Onboarding Table
CREATE TABLE onboarding_forms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    data JSONB DEFAULT '{}'::jsonb,
    current_step INTEGER DEFAULT 1,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Assignments / Rooms
-- Combining these for now: A room exists IS an assignment.
CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES users(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(patient_id, doctor_id)
);

-- Messages Table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    read_status BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed Doctors (Password: 'password123')
INSERT INTO users (email, password_hash, role, full_name, specialization) VALUES
('dr.house@example.com', '$2a$08$EdD4.8XyS1.4j.H.aZ.C.e7.w.r.i.g.h.t.h.e.r.e', 'doctor', 'Dr. Gregory House', 'Diagnostician'),
('dr.grey@example.com', '$2a$08$EdD4.8XyS1.4j.H.aZ.C.e7.w.r.i.g.h.t.h.e.r.e', 'doctor', 'Dr. Meredith Grey', 'General Surgery'),
('dr.strange@example.com', '$2a$08$EdD4.8XyS1.4j.H.aZ.C.e7.w.r.i.g.h.t.h.e.r.e', 'doctor', 'Dr. Stephen Strange', 'Neurosurgeon')
ON CONFLICT (email) DO NOTHING;
