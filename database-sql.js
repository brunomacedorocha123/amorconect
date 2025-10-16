// 📄 /scripts/database-sql.js
import { supabase } from './utils/supabase.js'

// QUERIES OTIMIZADAS PARA O NOVO PROJETO
export const USER_QUERIES = {
    // ✅ USUÁRIOS PARA HOME
    async getHomeUsers(currentUserId, limit = 12) {
        const { data, error } = await supabase
            .from('profiles')
            .select(`
                id,
                nickname,
                full_name,
                birth_date,
                avatar_url,
                last_online_at,
                is_invisible,
                city,
                created_at,
                user_details (
                    gender,
                    zodiac,
                    profession,
                    interests,
                    looking_for,
                    description
                )
            `)
            .neq('id', currentUserId)
            .order('created_at', { ascending: false })
            .limit(limit)

        return { data, error }
    },

    // ✅ ESTATÍSTICAS RÁPIDAS
    async getStats(userId) {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
        
        const [
            totalUsers,
            onlineUsers,
            newMessages,
            profileViews
        ] = await Promise.all([
            // Total de usuários
            supabase.from('profiles').select('*', { count: 'exact', head: true })
                .neq('id', userId),
            
            // Usuários online
            supabase.from('profiles').select('*', { count: 'exact', head: true })
                .gte('last_online_at', fiveMinutesAgo)
                .eq('is_invisible', false)
                .neq('id', userId),
            
            // Novas mensagens
            supabase.from('messages').select('*', { count: 'exact', head: true })
                .eq('receiver_id', userId)
                .eq('is_read', false),
            
            // Visualizações do perfil
            supabase.rpc('count_user_visits', { p_user_id: userId, p_days: 7 })
        ])

        return {
            totalUsers: totalUsers.count || 0,
            onlineUsers: onlineUsers.count || 0,
            newMessages: newMessages.count || 0,
            profileViews: profileViews.data || 0
        }
    },

    // ✅ VISITANTES
    async getVisitors(userId, limit = 8) {
        const { data, error } = await supabase
            .from('profile_visits')
            .select(`
                visited_at,
                profiles!profile_visits_visitor_id_fkey (
                    id,
                    nickname,
                    avatar_url,
                    city,
                    last_online_at
                )
            `)
            .eq('visited_id', userId)
            .order('visited_at', { ascending: false })
            .limit(limit)

        return { data, error }
    },

    // ✅ CONTADOR DE VISITAS (FREE)
    async getVisitorsCount(userId) {
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        
        const { count, error } = await supabase
            .from('profile_visits')
            .select('*', { count: 'exact', head: true })
            .eq('visited_id', userId)
            .gte('visited_at', oneWeekAgo)

        return { count: count || 0, error }
    }
}

// SISTEMA DE BLOQUEIO
export const BLOCK_QUERIES = {
    // ✅ BLOQUEAR USUÁRIO
    async blockUser(blockerId, blockedId) {
        const { data, error } = await supabase
            .from('user_blocks')
            .insert({
                blocker_id: blockerId,
                blocked_user_id: blockedId
            })
            .select()
            .single()

        return { data, error }
    },

    // ✅ LISTA DE BLOQUEADOS
    async getBlockedUsers(userId) {
        const { data, error } = await supabase
            .from('user_blocks')
            .select(`
                blocked_user_id,
                created_at,
                profiles!user_blocks_blocked_user_id_fkey (
                    nickname,
                    avatar_url,
                    city
                )
            `)
            .eq('blocker_id', userId)
            .order('created_at', { ascending: false })

        return { data, error }
    },

    // ✅ VERIFICAR SE ESTÁ BLOQUEADO
    async checkBlockStatus(userId, targetUserId) {
        const { data, error } = await supabase
            .from('user_blocks')
            .select('id')
            .eq('blocker_id', userId)
            .eq('blocked_user_id', targetUserId)
            .single()

        return { isBlocked: !!data, error }
    }
}

// SISTEMA DE REPORTES
export const REPORT_QUERIES = {
    async reportUser(reporterId, reportedUserId, reason, description = '') {
        const { data, error } = await supabase
            .from('user_reports')
            .insert({
                reporter_id: reporterId,
                reported_user_id: reportedUserId,
                reason: reason,
                evidence: description,
                status: 'pending'
            })
            .select()
            .single()

        return { data, error }
    }
}

// EXPORTAÇÃO PADRÃO PARA FACILITAR IMPORTAÇÃO
export default {
    USER_QUERIES,
    BLOCK_QUERIES,
    REPORT_QUERIES
}