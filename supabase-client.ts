import { createClient } from "@supabase/supabase-js"

export const supabase = createClient(
    "https://byhjkelbgccfsrsxdjsu.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5aGprZWxiZ2NjZnNyc3hkanN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxODUzNDgsImV4cCI6MjA3ODc2MTM0OH0.SxFuukQDck0rEUlx9KoGbL4TxTYqT8Sgev3a8HJhWgg"
)