
const supabase = require("../supabase/supabaseClient");

exports.CreateQrCode = async (req, res) => {
  try {
   
  } catch (err) {
    console.error("Error registering palm vein:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

exports.verifyQrCode = async (req, res) => {


  try {
    
  } catch (err) {
    console.error("Error verifying  palm vein:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
};