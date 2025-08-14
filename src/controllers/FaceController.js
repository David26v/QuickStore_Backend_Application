const supabase = require("../supabase/supabaseClient");

exports.registerFace = async (req, res) => {
  try {
    const { user_id, face_hash } = req.body;

    if (!user_id || !face_hash) {
      return res.status(400).json({ error: "user_id and face_hash are required" });
    }

    const { error } = await supabase
      .from("user_biometrics")
      .upsert([{
        user_id,
        face_template_hash: face_hash,
        method_type: "face",
        updated_at: new Date()
      }], { onConflict: ["user_id"] }); 

    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json({ message: "Face registered successfully" });
  } catch (err) {
    console.error("Error registering face:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

exports.verifyFace = async (req, res) => {
  const { user_id, face_hash } = req.body;

  try {
    if (!user_id || !face_hash) {
      return res.status(400).json({ error: "user_id and face_hash are required" });
    }

    // Fetch the registered face hash for this user
    const { data: biometrics, error } = await supabase
      .from("user_biometrics")
      .select("face_template_hash, method_type")
      .eq("user_id", user_id)
      .eq("method_type", "face")
      .single();

    if (error || !biometrics) {
      return res.status(404).json({ error: "No registered face found for this user" });
    }

    const registeredHash = biometrics.face_template_hash;

    // Compare the hashes
    if (registeredHash === face_hash) {
      return res.status(200).json({ 
        user_id, 
        verified: true, 
        message: "Face verified successfully" 
      });
    } else {
      return res.status(403).json({ 
        user_id, 
        verified: false, 
        message: "Face does not match" 
      });
    }

  } catch (err) {
    console.error("Error verifying face:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
};