const supabase = require('../db');

const saveDraft = async (req, res) => {
    const { stepData, currentStep } = req.body;
    const userId = req.userId;

    if (!stepData) return res.status(400).json({ error: 'Data is required' });

    try {
        const { data: existing } = await supabase.from('onboarding_forms').select('data').eq('user_id', userId).single();
        let newData = stepData;
        if (existing) {
            newData = { ...existing.data, ...stepData };
        }

        const { data, error } = await supabase
            .from('onboarding_forms')
            .upsert({
                user_id: userId,
                data: newData,
                current_step: currentStep,
                status: 'draft',
                updated_at: new Date()
            }, { onConflict: 'user_id' })
            .select();

        if (error) throw error;
        res.status(200).json({ message: 'Draft saved', data: data[0] });
    } catch (error) {
        console.error('Save Draft Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const getOnboardingStatus = async (req, res) => {
    const userId = req.userId;
    try {
        const { data, error } = await supabase.from('onboarding_forms').select('*').eq('user_id', userId).single();
        if (error && error.code !== 'PGRST116') throw error;
        res.status(200).json(data || { status: 'new', current_step: 1, data: {} });
    } catch (error) {
        console.error('Get Status Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

const submitForm = async (req, res) => {
    const userId = req.userId;

    try {
        // 1. Fetch current data to validate fields
        const { data: formRecord, error: fetchError } = await supabase
            .from('onboarding_forms')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (fetchError || !formRecord) return res.status(400).json({ error: 'No onboarding data found' });

        const d = formRecord.data;

        // 2. Validate Required Fields (SERVER-SIDE VALIDATION)
        // Step 1
        if (!d.full_name || d.full_name.trim().split(' ').length < 2) return res.status(400).json({ error: 'Full Name must be at least two words' });
        if (!d.dob || new Date().getFullYear() - new Date(d.dob).getFullYear() < 18) return res.status(400).json({ error: 'Must be 18+' });
        if (!d.phone) return res.status(400).json({ error: 'Phone required' });
        if (!d.emergency_name || !d.emergency_phone) return res.status(400).json({ error: 'Emergency contact required' });

        // Step 2
        if (!d.blood_type) return res.status(400).json({ error: 'Blood Type required' });
        if (!d.allergies || d.allergies.length === 0) return res.status(400).json({ error: 'Allergies selection required' });
        if (!d.chronic_conditions) return res.status(400).json({ error: 'Chronic conditions required' });

        // Step 3
        if (!d.insurance_provider || !d.insurance_id || !d.policy_holder) return res.status(400).json({ error: 'Insurance details required' });
        if (!d.preferred_doctor_id) return res.status(400).json({ error: 'Preferred doctor required' });

        // 3. Mark as submitted
        const { error: updateError } = await supabase
            .from('onboarding_forms')
            .update({ status: 'submitted', updated_at: new Date() })
            .eq('user_id', userId);

        if (updateError) throw updateError;

        // 4. Assign Doctor (Create Room)
        // "Doctors should only be able to view patients assigned to them"
        // We create the relationship here.
        const { error: roomError } = await supabase
            .from('rooms')
            .insert({ patient_id: userId, doctor_id: d.preferred_doctor_id });

        // Ignore duplicate key error if room already exists (though unlikely for new submission)
        if (roomError && roomError.code !== '23505') throw roomError;

        res.status(200).json({ message: 'Form submitted and doctor assigned' });

    } catch (error) {
        console.error('Submit Form Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

module.exports = { saveDraft, submitForm, getOnboardingStatus };
