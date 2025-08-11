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


exports.getLockerStatuses = async (req, res) => {
  const { client_id } = req.params;

  if (!client_id) {
    return res.status(400).json({ error: 'clientId is required' });
  }

  try {
    const { data: lockerDoors, error } = await supabase
      .from('locker_doors')
      .select(`
        id,
        door_number,
        status,
        assigned_user_id,
        assigned_at,
        last_opened_at,
        clients_users (
          id,
          full_name
        )
      `)
      .eq('client_id', client_id)
      .order('door_number');

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: error.message });
    }

    if (!lockerDoors || lockerDoors.length === 0) {
      return res.status(404).json({ message: 'No lockers found for this client.' });
    }

    
    const formattedLockers = lockerDoors.map(door => {

      let status = 'available';

      if (door.status === 'in_use') status = 'occupied';
      if (door.status === 'overdue') status = 'overdue';
      if (door.status === 'locked') status = 'occupied'; 
      

      let lastAccessTime = null;
      if (door.last_opened_at) {
        lastAccessTime = new Date(door.last_opened_at).getTime();
      } else if (door.assigned_at) {
        lastAccessTime = new Date(door.assigned_at).getTime();
      }

      // Format assigned user info
      let assignedUser = null;
      if (door.clients_users && (door.status === 'in_use' || door.status === 'locked')) {
        const fullName = door.clients_users.full_name || 'Unknown User';
        const nameParts = fullName.split(' ');
        const firstName = nameParts[0] || 'Unknown';
        const lastName = nameParts.slice(1).join(' ') || 'User';
        
        assignedUser = {
          userId: door.clients_users.id,
          firstName: firstName,
          lastName: lastName
        };
      }

      return {
        id: door.door_number,  
        doorId: door.id,      
        status: status,
        lastAccessTime: lastAccessTime,
        assignedUser: assignedUser,
        location: `Row ${Math.ceil(door.door_number / 6)}, Column ${(door.door_number - 1) % 6 + 1}`
      };
    });

    return res.status(200).json(formattedLockers);

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};


