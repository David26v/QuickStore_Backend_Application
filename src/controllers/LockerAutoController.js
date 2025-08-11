const supabase = require("../supabase/supabaseClient");
const bcrypt = require("bcrypt"); 

exports.controlLockerDoorAutoAssign = async (req, res) => {
  const { action_type, user_id, source = "apk", access_code } = req.body;

  try {
    const allowedActions = ["opened", "closed", "locked", "unlocked"];
    if (!allowedActions.includes(action_type)) {
      return res.status(400).json({ error: "Invalid action_type" });
    }

    const { data: userData, error: userError } = await supabase
      .from("clients_users")
      .select("client_id, is_active")
      .eq("id", user_id)
      .single();

    if (userError || !userData) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!userData.is_active) {
      return res.status(403).json({ error: "User account is not active" });
    }

    const clientId = userData.client_id;

    const { data: lockerSettings, error: lockerSettingsError } = await supabase
      .from("client_locker_settings")
      .select("id")
      .eq("client_id", clientId)
      .single();

    if (lockerSettingsError || !lockerSettings) {
      return res.status(404).json({ error: "Client locker settings not found" });
    }

    const clientSettingId = lockerSettings.id;

    // 3. Check if access code is required
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

      let isValid = false;
      if (codeData.credential_hash.startsWith('$2b$') || codeData.credential_hash.startsWith('$2a$')) {
        isValid = await bcrypt.compare(access_code, codeData.credential_hash);
      } else {
        isValid = access_code === codeData.credential_hash;
      }
      
      if (!isValid) {
        return res.status(403).json({ error: "Invalid access code" });
      }
    }

    // 4. AUTO-ASSIGNMENT LOGIC - Call the PostgreSQL function
    console.log(`Auto-assigning locker for user: ${user_id}`);
    
    const { data: assignedDoorId, error: assignError } = await supabase
      .rpc('auto_assign_locker_door', { input_user_id: user_id });

    if (assignError) {
      console.error("Auto-assignment failed:", assignError);
      return res.status(400).json({ 
        error: "Auto-assignment failed", 
        details: assignError.message 
      });
    }

    console.log(`Successfully assigned door ${assignedDoorId} to user ${user_id}`);

    // 5. Now control the assigned locker door
    const door_id = assignedDoorId;

    // 6. Get the assigned door details
    const { data: doorData, error: doorError } = await supabase
      .from("locker_doors")
      .select("id, status, client_id")
      .eq("id", door_id)
      .single();

    if (doorError || !doorData) {
      return res.status(404).json({ error: "Assigned locker door not found" });
    }

    // 7. Determine new locker status
    let newStatus;
    if (action_type === "opened") newStatus = "occupied";
    if (action_type === "closed") newStatus = "available";
    if (action_type === "locked") newStatus = "locked";
    if (action_type === "unlocked") newStatus = "available";

    // 8. Update locker door status
    const { error: updateError } = await supabase
      .from("locker_doors")
      .update({
        status: newStatus,
        last_opened_at: action_type === "opened" ? new Date() : null,
        updated_at: new Date()
      })
      .eq("id", door_id);

    if (updateError) throw updateError;

    // 9. Insert locker door event
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

    // 10. Broadcast change (if you're using Supabase realtime)
    try {
      await supabase.channel("locker_updates").send({
        type: "broadcast",
        event: "door_status_change",
        payload: { door_id, action_type, status: newStatus }
      });
    } catch (broadcastError) {
      console.warn("Failed to broadcast door status change:", broadcastError);
    }

    return res.status(200).json({
      message: `Door ${action_type} successfully`,
      status: newStatus,
      door_id: door_id,
      assigned_door: true
    });

  } catch (err) {
    console.error("Error in auto-assignment control:", err);
    return res.status(500).json({ error: err.message });
  }
};
