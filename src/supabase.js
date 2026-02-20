import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://fzqjmyrfqxcujndujlzo.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_F2bglAlKIoSKFQEvjDCngg_exHgVVfZ";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);