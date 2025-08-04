const supabase = require("../supabase/supabaseClient");

exports.getLockersByClientId = async (req, res) => {

  const { client_id } = req.params;

  try {
    const { data, error } = await supabase
      .from('locker_doors')
      .select(`
        id,
        door_number,
        status,
        assigned_user_id,
        assigned_at,
        clients_users (
          full_name
        )
      `)
      .eq('client_id', client_id);

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: error.message });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ message: 'No lockers found for this client.' });
    }

    return res.status(200).json({ lockers: data });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getClientIdFromLocker = async (req, res) => {
  const { locker_id } = req.params;

  try {
    const { data, error } = await supabase
      .from('lockers')
      .select('client_id')
      .eq('id', locker_id)
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({ message: 'Locker not found.' });
    }

    return res.status(200).json({ client_id: data.client_id });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};


