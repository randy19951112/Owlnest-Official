import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const supabase = createClient(
  "https://khoiplqugajmybmultzs.supabase.co",
  "sb_publishable_ic3b9TeYt7SuXxLIhLuyvA_FWHYVb0Z" // 請確認這組 Key 與您 member-login.html 內使用的是同一組
);
