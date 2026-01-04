// Native fetch used

// Using native fetch for simplicity if Node version supports it (v24 is running).

const BASE_URL = 'http://localhost:3000/api';
let token = '';
let userId = '';
let doctorId = '';

async function runTests() {
    console.log('--- Starting API Verification ---');

    // 1. Register Patient
    console.log('\n[1] Testing Registration...');
    const email = `test.patient.${Date.now()}@example.com`;
    const password = 'password123';
    try {
        const res = await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, role: 'patient', fullName: 'Test Patient' })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Registration failed');
        console.log('✅ Registration Successful:', data.user.email);
        // data.token might be here depending on consistency, but login is safer test
    } catch (e) {
        console.error('❌ Registration Failed:', e.message);
        return;
    }

    // 2. Login
    console.log('\n[2] Testing Login...');
    try {
        const res = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Login failed');
        token = data.token;
        userId = data.user.id;
        console.log('✅ Login Successful. Token received.');
    } catch (e) {
        console.error('❌ Login Failed:', e.message);
        return;
    }

    // 3. Get Doctors
    console.log('\n[3] Testing Get Doctors...');
    try {
        const res = await fetch(`${BASE_URL}/doctors`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error('Fetch doctors failed');
        console.log(`✅ Doctors Fetched: Found ${data.length} doctors`);
        if (data.length > 0) doctorId = data[0].id;
        else console.warn('⚠️ No doctors found to test assignment with.');
    } catch (e) {
        console.error('❌ Get Doctors Failed:', e.message);
    }

    // 4. Onboarding Status (Should be new)
    console.log('\n[4] Testing Onboarding Status...');
    try {
        const res = await fetch(`${BASE_URL}/onboarding/status`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error('Fetch status failed');
        console.log('✅ Status Fetched:', data.status || 'New');
    } catch (e) {
        console.error('❌ Status Failed:', e.message);
    }

    // 5. Save Draft
    if (doctorId) {
        console.log('\n[5] Testing Save Draft...');
        try {
            const res = await fetch(`${BASE_URL}/onboarding/draft`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    currentStep: 1,
                    stepData: { full_name: 'Test Patient', age: 30 }
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Save draft failed');
            console.log('✅ Draft Saved Successfuly');
        } catch (e) {
            console.error('❌ Save Draft Failed:', e.message);
        }

        // 6. Submit Form
        console.log('\n[6] Testing Submit Form (Valid Data)...');
        const validData = {
            // Step 1
            full_name: 'Test Patient User',
            dob: '1990-01-01',
            date_of_birth: '1990-01-01', // Handling mismatch if any in code
            phone: '1234567890',
            emergency_name: 'Emergency Contact',
            emergency_phone: '9876543210',
            // Step 2
            blood_type: 'O+',
            allergies: ['None'],
            chronic_conditions: ['None'],
            // Step 3
            insurance_provider: 'Test Insure',
            insurance_id: '12345',
            policy_holder: 'Test Patient',
            preferred_doctor_id: doctorId
        };

        // First update draft with FULL data because submitForm reads from draft in DB
        // Based on my implementation: "const { data: formRecord } = ... select('*') ... const d = formRecord.data;"
        await fetch(`${BASE_URL}/onboarding/draft`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ currentStep: 3, stepData: validData })
        });

        try {
            const res = await fetch(`${BASE_URL}/onboarding/submit`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Submit failed');
            console.log('✅ Form Submitted Successfully');
            console.log('   (Doctor assignment should be triggered)');
        } catch (e) {
            console.error('❌ Submit Failed:', e.message);
        }

        // 7. Verify Room Creation
        console.log('\n[7] Verifying Chat Room Creation...');
        try {
            const res = await fetch(`${BASE_URL}/chat/rooms`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (!res.ok) throw new Error('Fetch rooms failed');
            const roomExists = data.some(room => room.doctor_id === doctorId || room.doctor?.id === doctorId);
            if (roomExists) console.log('✅ Chat Room Verified: Created successfully.');
            else console.error('❌ Chat Room Verified: Room NOT found.');
        } catch (e) {
            console.error('❌ Verify Rooms Failed:', e.message);
        }

    } else {
        console.log('⚠️ Skipping Onboarding/Room tests because no doctor was found.');
    }

    console.log('\n--- Test Complete ---');
}

runTests();
