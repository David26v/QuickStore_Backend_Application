const supabase = require("../supabase/supabaseClient")

exports.GetAllClientUsers = async (req ,res) =>{

  const {client_id} = req.params 

  if(!client_id) {
    return res.status(400).json({
        error:'Missing Client id'
    })
  }

  try {
    const {data ,error} = await supabase 
    .from('clien')
  } catch (error) {
    
  }
 
}