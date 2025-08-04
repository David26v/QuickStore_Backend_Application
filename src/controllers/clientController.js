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
