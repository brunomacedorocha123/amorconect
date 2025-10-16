// 📄 /scripts/utils/supabase.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

// CONFIGURAÇÃO DO NOVO PROJETO
const SUPABASE_URL = 'https://rohsbrkbdlbewonibclf.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvaHNicmtiZGxiZXdvbmliY2xmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MTc5MDMsImV4cCI6MjA3NjE5MzkwM30.PUbV15B1wUoU_-dfggCwbsS5U7C1YsoTrtcahEKn_Oc'

// CRIA O CLIENTE SUPABASE
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// EXPORTAÇÃO PADRÃO (opcional)
export default supabase