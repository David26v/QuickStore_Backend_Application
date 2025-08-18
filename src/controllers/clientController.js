  const supabase = require("../supabase/supabaseClient");

  exports.getClientAuthMethods = async (req, res) => {

    const { client_id } = req.params;

    
    const { data: lockerSetting, error: settingError } = await supabase
      .from('client_locker_settings')
      .select('id')
      .eq('client_id', client_id)
      .single();

    if (settingError || !lockerSetting) {
      return res.status(404).json({ error: 'Client locker settings not found' });
    }

    const clientSettingId = lockerSetting.id;

    const { data: authMethods, error: authError } = await supabase
      .from('client_auth_methods')
      .select(`
        auth_methods (
          technical_name,
          name,
          is_active
        )
      `)
      .eq('client_setting_id', clientSettingId)
      .eq('auth_methods.is_active', true); 

    if (authError) {
      return res.status(500).json({ error: 'Failed to fetch auth methods' });
    }

    const allowedMethods = authMethods.map(method => method.auth_methods.technical_name);

    return res.json({
      client_id,
      auth_methods: allowedMethods,
    });
  };


  exports.getClientsUsers = async (req, res) => {
  const { client_id } = req.params;

  if (!client_id) {
    return res.status(400).json({
      error: "Missing client_id",
      message: "Please provide client_id as query parameter",
    });
  }

  try {
    let { data, error } = await supabase
      .from("clients_users")
      .select("id, full_name, email, phone, department, is_active")
      .eq("client_id", client_id)
      .is("is_active", true) 
      .order("full_name", { ascending: true });

    if (error) throw error;

    return res.status(200).json({
      users: data || [],
      count: data?.length || 0,
    });
  } catch (err) {
    console.error("Error fetching users by client:", err);
    return res.status(500).json({
      error: "Internal server error",
      message: err.message,
    });
  }
};