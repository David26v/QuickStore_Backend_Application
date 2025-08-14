
    const crypto = require("crypto");
    const supabase = require("../supabase/supabaseClient");

    // 🔐 Securely hash card UID using SHA-256
    const hashCardUid = (cardUid) => {
    return crypto.createHash("sha256").update(cardUid.trim().toLowerCase()).digest("hex");
    };

    /**
     * Validates if the card UID format is reasonable
     * Adjust based on your hardware (e.g., 8-digit hex, 10-digit decimal)
     */
    const isValidCardUid = (cardUid) => {
    return typeof cardUid === "string" && /^[0-9A-F]{4,20}$/i.test(cardUid.trim());
    };

    // ===================================================
    // POST /card-register/:user_id
    // Register a card (UID) to a specific user
    // ===================================================
    exports.registerCard = async (req, res) => {
    const { user_id } = req.params;
    const { cardData } = req.body;

    // 🛑 Validation
    if (!cardData || !isValidCardUid(cardData)) {
        return res.status(400).json({
        error: "Invalid card data",
        message: "Card UID must be a valid hex string (e.g. A1B2C3D4).",
        });
    }

    const cardHash = hashCardUid(cardData);

    try {
        // 1. Verify user exists
        const {  user, error: userError } = await supabase
        .from("clients_users")
        .select("id, client_id")
        .eq("id", user_id)
        .single();

        if (userError || !user) {
        return res.status(404).json({
            error: "User not found",
            message: "The user does not exist in the system.",
        });
        }

        // 2. Check if this card is already registered to someone else
        const {  existing, error: conflictError } = await supabase
        .from("user_credentials")
        .select("user_id")
        .eq("credential_hash", cardHash)
        .eq("method_type", "card")
        .maybeSingle();

        if (conflictError) throw conflictError;

        if (existing && existing.user_id !== user_id) {
        return res.status(409).json({
            error: "Card already registered",
            message: "This card is already linked to another user.",
        });
        }

        // 3. Remove any previous card from this user
        await supabase
        .from("user_credentials")
        .delete()
        .eq("user_id", user_id)
        .eq("method_type", "card");

        // 4. Insert new card credential
        const { error: insertError } = await supabase.from("user_credentials").insert([
        {
            user_id,
            method_type: "card",
            credential_hash: cardHash,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        },
        ]);

        if (insertError) throw insertError;

        // 5. Log action (optional)
        await supabase.from("admin_actions").insert({
        admin_id: null, // Could be session user later
        action_type: "card_registered",
        target_user_id: user_id,
        notes: `Card registered via NFC tap for client ${user.client_id}`,
        created_at: new Date().toISOString(),
        });

        return res.status(200).json({
        success: true,
        message: "Card registered successfully",
        user_id,
        });
    } catch (err) {
        console.error("Error in registerCard:", err);
        return res.status(500).json({
        error: "Internal server error",
        message: err.message || "An unexpected error occurred.",
        });
    }
    };

    // ===================================================
    // POST /card-verify
    // Verify a card tap and return user info if valid
    // ===================================================
    exports.verifyCard = async (req, res) => {
    const { cardData } = req.body;

    // 🛑 Validation
    if (!cardData || !isValidCardUid(cardData)) {
        return res.status(400).json({
        error: "Invalid card data",
        message: "Card UID must be a valid hex string (e.g. A1B2C3D4).",
        });
    }

    const cardHash = hashCardUid(cardData);

    try {
        // 1. Find credential by hashed UID
        const {  credential, error: credError } = await supabase
        .from("user_credentials")
        .select("user_id, is_active")
        .eq("credential_hash", cardHash)
        .eq("method_type", "card")
        .maybeSingle();

        if (credError) throw credError;

        if (!credential) {
        return res.status(404).json({
            error: "Card not registered",
            message: "This card has not been registered in the system.",
        });
        }

        if (!credential.is_active) {
        return res.status(403).json({
            error: "Card deactivated",
            message: "This card is no longer active.",
        });
        }

        // 2. Get user details
        const {  user, error: userError } = await supabase  
        .from("clients_users")
        .select("id, full_name, client_id, is_active")
        .eq("id", credential.user_id)
        .single();

        if (userError || !user || !user.is_active) {
        return res.status(404).json({
            error: "User not found or inactive",
            message: "The user associated with this card is not active.",
        });
        }

        // 3. ✅ Success: Return user info
        return res.status(200).json({
        success: true,
        user_id: user.id,
        full_name: user.full_name,
        client_id: user.client_id,
        message: "Card verified successfully",
        });
    } catch (err) {
        console.error("Error in verifyCard:", err);
        return res.status(500).json({
        error: "Internal server error",
        message: err.message || "An unexpected error occurred.",
        });
    }
    };