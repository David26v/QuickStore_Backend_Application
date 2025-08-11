const supabase = require("../supabase/supabaseClient");
const bcrypt = require("bcrypt"); 

exports.controlLockerDoor = async (req, res) => {
  const { door_id } = req.params;
  const { action_type, user_id, source = "apk", access_code } = req.body;

  try {
    const allowedActions = ["opened", "closed", "locked", "unlocked"];
    if (!allowedActions.includes(action_type)) {
      return res.status(400).json({ error: "Invalid action_type" });
    }

    // 1. Get client_id for this locker door
    const { data: doorData, error: doorError } = await supabase
      .from("locker_doors")
      .select("client_id")
      .eq("id", door_id)
      .single();

    if (doorError || !doorData) {
      return res.status(404).json({ error: "Locker door not found" });
    }

    const clientId = doorData.client_id;

    // 2. Get client_setting_id first
    const { data: lockerSettings, error: lockerSettingsError } = await supabase
      .from("client_locker_settings")
      .select("id")
      .eq("client_id", clientId)
      .single();

    if (lockerSettingsError || !lockerSettings) {
      return res.status(404).json({ error: "Client locker settings not found" });
    }

    const clientSettingId = lockerSettings.id;

    // 3. Check if client requires access_code
    const { data: authMethods, error: authError } = await supabase
      .from("client_auth_methods")
      .select("auth_methods(technical_name)")
      .eq("client_setting_id", clientSettingId);

    if (authError) throw authError;

    const requiresAccessCode = authMethods?.some(
      (m) => m.auth_methods.technical_name === "access_code"
    );

    if (requiresAccessCode) {
      if (!access_code) {
        return res.status(401).json({ error: "Access code required" });
      }

      // Get credentials for the user
      const { data: credentialsData, error: credentialsError } = await supabase
        .from("user_credentials")
        .select("credential_hash, user_id, method_type, is_active")
        .eq("user_id", user_id)
        .eq("method_type", "code");

      if (credentialsError || !credentialsData || credentialsData.length === 0) {
        return res.status(403).json({ error: "No access code found for user" });
      }

      const codeData = credentialsData[0];
      
      if (!codeData.is_active) {
        return res.status(403).json({ error: "Access code is not active" });
      }

      // Check if it's already a bcrypt hash or plain text
      let isValid = false;
      if (codeData.credential_hash.startsWith('$2b$') || codeData.credential_hash.startsWith('$2a$')) {
        // It's a bcrypt hash
        isValid = await bcrypt.compare(access_code, codeData.credential_hash);
      } else {
        // It's plain text (temporary compatibility)
        isValid = access_code === codeData.credential_hash;
      }
      
      if (!isValid) {
        return res.status(403).json({ error: "Invalid access code" });
      }
    }

    // 5. Determine new locker status
    let newStatus;
    if (action_type === "opened") newStatus = "in_use";
    if (action_type === "closed") newStatus = "available";
    if (action_type === "locked") newStatus = "locked";
    if (action_type === "unlocked") newStatus = "available";

    const { error: updateError } = await supabase
      .from("locker_doors")
      .update({
        status: newStatus,
        last_opened_at: action_type === "opened" ? new Date() : null,
        updated_at: new Date()
      })
      .eq("id", door_id);

    if (updateError) throw updateError;

    // 6. Insert locker door event
    const { error: eventError } = await supabase
      .from("locker_door_events")
      .insert([{
        locker_door_id: door_id,
        user_id,
        event_type: action_type,
        source,
        created_at: new Date()
      }]);

    if (eventError) throw eventError;

    // 7. Broadcast change
    await supabase.channel("locker_updates").send({
      type: "broadcast",
      event: "door_status_change",
      payload: { door_id, action_type, status: newStatus }
    });

    return res.status(200).json({
      message: `Door ${action_type} successfully`,
      status: newStatus
    });

  } catch (err) {
    console.error("Error controlling locker door:", err);
    return res.status(500).json({ error: err.message });
  }
};