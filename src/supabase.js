import { createClient } from "@supabase/supabase-js";

const REACT_APP_SUPABASE_URL = "https://fzqjmyrfqxcujndujlzo.supabase.co";
const REACT_APP_SUPABASE_ANON_KEY = "sb_publishable_F2bglAlKIoSKFQEvjDCngg_exHgVVfZ";

export const supabase = createClient(REACT_APP_SUPABASE_URL, REACT_APP_SUPABASE_ANON_KEY);