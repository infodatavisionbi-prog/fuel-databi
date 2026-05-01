import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bvhnbaxztjcuruxgnrnj.supabase.co'

const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2aG5iYXh6dGpjdXJ1eGducm5qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1NzY2ODMsImV4cCI6MjA5MzE1MjY4M30.Cal93Xk-ucUCkVEWSe09iqkPqeNMsGyoPNLUsgYMdvo'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
