import { createClient } from "@supabase/supabase-js";

const REACT_APP_SUPABASE_URL = "https://fzqjmyrfqxcujndujlzo.supabase.co";
const REACT_APP_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6cWpteXJmcXhjdWpuZHVqbHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0OTAzMzYsImV4cCI6MjA4NzA2NjMzNn0.C7PnuBRVB4QHex-sBDMMwFZNQB-gMqd0hm8jtpZ4sUs";

export const supabase = createClient(REACT_APP_SUPABASE_URL, REACT_APP_SUPABASE_ANON_KEY);