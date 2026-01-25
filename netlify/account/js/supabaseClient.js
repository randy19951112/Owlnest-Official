import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const supabase = createClient(
  "https://khoiplqugajmybmultzs.supabase.co",
  "sb_publishable_ic3b9TeYt7SuXxLIhLuyvA_FWHYVb0Z" // ✅ 用 sb_publishable / anon key，前端不要用 service role
);
