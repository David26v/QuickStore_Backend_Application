const supabase = require("../supabase/supabaseClient");

exports.controlLockerDoor = async (req, res) => {
  const { door_id } = req.params;
  const { action_type, user_id, source = "apk" } = req.body;

  try {
    // 1. Validate action
    const allowedActions = ["opened", "closed", "locked", "unlocked"];
    if (!allowedActions.includes(action_type)) {
      return res.status(400).json({ error: "Invalid action_type" });
    }

    // 2. Update locker_doors status
    let newStatus;
    if (action_type === "opened") newStatus = "in_use";
    if (action_type === "closed") newStatus = "available";
    if (action_type === "locked") newStatus = "locked";
    if (action_type === "unlocked") newStatus = "available";

    const { error: updateError } = await supabase
      .from("locker_doors")
      .update({
        status: newStatus,
        last_opened_at: action_type === "opened" ? new Date() : undefined,
        updated_at: new Date()
      })
      .eq("id", door_id);

    if (updateError) throw updateError;

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

    await supabase.channel("locker_updates")
      .send({
        type: "broadcast",
        event: "door_status_change",
        payload: { door_id, action_type, status: newStatus }
      });

    return res.status(200).json({ message: `Door ${action_type} successfully`, status: newStatus });
  } catch (err) {
    console.error("Error controlling locker door:", err);
    return res.status(500).json({ error: err.message });
  }
};
