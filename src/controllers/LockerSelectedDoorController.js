const supabase = require("../supabase/supabaseClient");
const bcrypt = require("bcrypt");

exports.assignLockerToUser = async (req, res) => {
  const {door_id } = req.params

  const { user_id, access_code, source = "apk" } = req.body;

  try {
    if (!door_id || !user_id) {
      return res.status(400).json({ 
        error: "door_id and user_id are required" 
      });
    }

    // 2. Check if the door exists and is available
    const { data: doorData, error: doorError } = await supabase
      .from("locker_doors")
      .select("id, status, client_id")
      .eq("id", door_id)
      .single();

    if (doorError || !doorData) {
      return res.status(404).json({ error: "Locker door not found" });
    }

    if (doorData.status !== "available") {
      return res.status(400).json({ 
        error: "Locker door is not available for assignment" 
      });
    }

    const clientId = doorData.client_id;

    // 3. Get client locker settings
    const { data: lockerSettings, error: settingsError } = await supabase
      .from("client_locker_settings")
      .select("id, allow_user_assignment")
      .eq("client_id", clientId)
      .single();

    if (settingsError || !lockerSettings) {
      return res.status(404).json({ 
        error: "Client locker settings not found" 
      });
    }

    if (!lockerSettings.allow_user_assignment) {
      return res.status(403).json({ 
        error: "Client does not allow user assignment" 
      });
    }

    const clientSettingId = lockerSettings.id;

    // 4. Check what authentication methods are required by the client
    const { data: authMethods, error: authError } = await supabase
      .from("client_auth_methods")
      .select("auth_methods(technical_name)")
      .eq("client_setting_id", clientSettingId);

    if (authError) throw authError;

    // 5. Validate authentication based on client settings
    const requiresAccessCode = authMethods?.some(
      (m) => m.auth_methods.technical_name === "access_code"
    );

    const requiresBiometric = authMethods?.some(
      (m) => m.auth_methods.technical_name === "biometric"
    );

    // If access code is required, validate it
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

    // 6. Assign the locker door to the user
    const { error: updateError } = await supabase
      .from("locker_doors")
      .update({
        assigned_user_id: user_id,
        assigned_at: new Date(),
        status: "occupied",
        updated_at: new Date()
      })
      .eq("id", door_id);

    if (updateError) throw updateError;

    // 7. Create locker session
    const { error: sessionError } = await supabase
      .from("locker_sessions")
      .insert([{
        locker_door_id: door_id,
        user_id: user_id,
        start_time: new Date(),
        status: "active",
        created_at: new Date()
      }]);

    if (sessionError) throw sessionError;

    // 8. Log the assignment event
    const { error: eventError } = await supabase
      .from("locker_door_events")
      .insert([{
        locker_door_id: door_id,
        user_id: user_id,
        event_type: "assigned",
        source: source,
        created_at: new Date()
      }]);

    if (eventError) throw eventError;

    // 9. Broadcast the assignment
    await supabase.channel("locker_updates").send({
      type: "broadcast",
      event: "door_assigned",
      payload: { door_id, user_id, status: "occupied" }
    });

    return res.status(200).json({
      message: "Locker door assigned successfully",
      door_id: door_id,
      status: "occupied"
    });

  } catch (err) {
    console.error("Error assigning locker door:", err);
    return res.status(500).json({ error: err.message });
  }
};

exports.validateAccessCode = async (req, res) => {
  const { access_code } = req.body;

  try {
    if (!access_code) {
      return res.status(400).json({ error: "Access code is required" });
    }

    // First try direct match (plain text)
    const { data: credentialsData, error: credentialsError } = await supabase
      .from("user_credentials")
      .select("user_id, is_active")
      .eq("credential_hash", access_code)
      .eq("method_type", "code")
      .single();

    if (credentialsData && credentialsData.is_active) {
      return res.status(200).json({
        user_id: credentialsData.user_id,
        message: "Access code validated"
      });
    }

    // If not found, try bcrypt comparison
    const { data: allCredentials, error: allError } = await supabase
      .from("user_credentials")
      .select("user_id, credential_hash, is_active")
      .eq("method_type", "code");

    if (allError) throw allError;

    // Check each credential with bcrypt
    for (const credential of allCredentials) {
      if (credential.is_active) {
        const isValid = await bcrypt.compare(access_code, credential.credential_hash);
        if (isValid) {
          return res.status(200).json({
            user_id: credential.user_id,
            message: "Access code validated"
          });
        }
      }
    }

    return res.status(403).json({ error: "Invalid access code" });

  } catch (err) {
    console.error("Error validating access code:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};