const supabase = require("../supabase/supabaseClient");

exports.registerDevice = async (req, res) => {
  const { user_id, device_id, manufacturer, model, android_version, locker_id } = req.body;

  if (!device_id || !manufacturer || !model || !android_version) {
    return res.status(400).json({
      error: 'Missing required fields: device_id, manufacturer, model, android_version are required.'
    });
  }

  try {
    const { data, error } = await supabase
      .from('devices')
      .upsert(
        [{
          user_id,
          device_id,
          manufacturer,
          model,
          android_version,
          locker_id,
          created_at: new Date().toISOString() 
        }],
        {
          onConflict: ['device_id'],
          ignoreDuplicates: false 
        }
      );

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ message: 'Device registered successfully', data });

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
