const supabase = require("../supabase/supabaseClient");

exports.fetchLockerById = async (lockerId) => {
  const { data, error } = await supabase
    .from('locker_doors')
    .select('*')
    .eq('locker_id', lockerId);
  return { data, error };
};

exports.assignUser = async (doorId, userId) => {
  const { data, error } = await supabase
    .from('locker_doors')
    .update({ assigned_user_id: userId })
    .eq('id', doorId);
  return { data, error };
};
 