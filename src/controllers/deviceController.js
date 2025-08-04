const supabase = require("../supabase/supabaseClient");

exports.registerDevice = async (req, res) => {
  const { device_id, manufacturer, model, android_version, locker_id } = req.body;

  if (!device_id || !manufacturer || !model || !android_version) {
    return res.status(400).json({
      error: 'Missing required fields: device_id, manufacturer, model, android_version are required.'
    });
  }

  try {
    // Check if device already exists
    const { data: existingDevice, error: findError } = await supabase
      .from('devices')
      .select(`
        device_id,
        client_id,
        locker_id,
        lockers (
          id,
          client_id
        )
      `)
      .eq('device_id', device_id)
      .single();

    if (findError && findError.code !== 'PGRST116') {
      // PGRST116: no rows found
      console.error('Supabase find error:', findError);
      return res.status(500).json({ error: findError.message });
    }

    if (existingDevice) {
      return res.status(200).json({ message: 'Device already registered', data: existingDevice });
    }

    // Insert device if not found
    const { data: newDevice, error: insertError } = await supabase
      .from('devices')
      .insert({
        device_id,
        manufacturer,
        model,
        android_version,
        locker_id
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return res.status(500).json({ error: insertError.message });
    }

    return res.status(201).json({ message: 'Device registered successfully', data: newDevice });

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getDeviceInfo = async (req, res) => {
  const { device_id } = req.query; 
  if (!device_id) {
    return res.status(400).json({ error: 'Device ID is required' });
  }

  try {
    const { data, error } = await supabase
      .from('devices')
      .select(`
        device_id,  
        user_id,
        locker_id,
        lockers (
          id,
          client_id
        )
      `)
      .eq('device_id', device_id)
      .single();

    if (error) {
      console.error(error);
      return res.status(404).json({ error: 'Device not found' });
    }

    return res.status(200).json({ deviceInfo: data });

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
