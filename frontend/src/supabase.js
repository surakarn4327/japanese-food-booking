import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://ptyyzdowakiqjaqcgbyn.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0eXl6ZG93YWtpcWphcWNnYnluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxMTA4ODMsImV4cCI6MjA5NDY4Njg4M30.SPCc-zfwVyvFvqwQlBvTCgvK3jkecX_lngeTqxRl-yc";

export const supabase = createClient(supabaseUrl, supabaseKey);
