// 📄 /scripts/block-service.js
import { supabase } from './supabase.js'
import { BLOCK_QUERIES, REPORT_QUERIES } from './database.js'
import { showAlert } from './utils.helpers.js'

export const blockService = {
    // ✅ BLOQUEAR USUÁRIO
    async blockUser(blockerId, blockedId, blockedName = 'Usuário') {
        try {
            console.log('🚫 Bloqueando usuário:', { blockerId, blockedId, blockedName })
            
            const { data, error } = await BLOCK_QUERIES.blockUser(blockerId, blockedId)
            
            if (error) {
                if (error.code === '23505') {
                    console.log('ℹ️ Usuário já estava bloqueado')
                    return { 
                        success: true, 
                        message: `${blockedName} já estava bloqueado`,
                        alreadyBlocked: true 
                    }
                }
                throw error
            }
            
            console.log('✅ Usuário bloqueado com sucesso:', data)
            
            return { 
                success: true, 
                message: `${blockedName} bloqueado com sucesso!`,
                blockId: data.id 
            }
            
        } catch (error) {
            console.error('❌ Erro ao bloquear usuário:', error)
            return { 
                success: false, 
                error: 'Erro ao bloquear usuário. Tente novamente.' 
            }
        }
    },

    // ✅ DESBLOQUEAR USUÁRIO
    async unblockUser(blockerId, blockedId, blockedName = 'Usuário') {
        try {
            console.log('🔓 Desbloqueando usuário:', { blockerId, blockedId, blockedName })
            
            const { data, error } = await supabase
                .from('user_blocks')
                .delete()
                .eq('blocker_id', blockerId)
                .eq('blocked_user_id', blockedId)
                .select()
                .single()

            if (error) {
                if (error.code === 'PGRST116') {
                    console.log('ℹ️ Usuário não estava bloqueado')
                    return { 
                        success: true, 
                        message: `${blockedName} não estava bloqueado`,
                        alreadyUnblocked: true 
                    }
                }
                throw error
            }
            
            console.log('✅ Usuário desbloqueado com sucesso')
            
            return { 
                success: true, 
                message: `${blockedName} desbloqueado com sucesso!` 
            }
            
        } catch (error) {
            console.error('❌ Erro ao desbloquear usuário:', error)
            return { 
                success: false, 
                error: 'Erro ao desbloquear usuário. Tente novamente.' 
            }
        }
    },

    // ✅ CARREGAR USUÁRIOS BLOQUEADOS
    async loadBlockedUsers(userId) {
        try {
            console.log('📋 Carregando usuários bloqueados para:', userId)
            
            const { data: blocks, error } = await BLOCK_QUERIES.getBlockedUsers(userId)
            
            if (error) {
                console.error('❌ Erro ao carregar usuários bloqueados:', error)
                showAlert('Erro ao carregar usuários bloqueados', 'error')
                return []
            }
            
            console.log(`✅ ${blocks?.length || 0} usuários bloqueados encontrados`)
            
            const blockedUsers = (blocks || []).map(block => ({
                id: block.blocked_user_id,
                nickname: block.profiles?.nickname || 'Usuário',
                avatar_url: block.profiles?.avatar_url,
                city: block.profiles?.city || 'Cidade não informada',
                blocked_at: block.created_at,
                time_ago: this.getTimeAgo(block.created_at)
            }))
            
            return blockedUsers
            
        } catch (error) {
            console.error('❌ Erro inesperado ao carregar bloqueados:', error)
            return []
        }
    },

    // ✅ VERIFICAR SE USUÁRIO ESTÁ BLOQUEADO
    async isUserBlocked(userId, targetUserId) {
        try {
            console.log('🔍 Verificando se usuário está bloqueado:', { userId, targetUserId })
            
            const { isBlocked, error } = await BLOCK_QUERIES.checkBlockStatus(userId, targetUserId)
            
            if (error) {
                console.error('❌ Erro ao verificar bloqueio:', error)
                return false
            }
            
            console.log(`✅ Usuário ${isBlocked ? 'ESTÁ' : 'NÃO está'} bloqueado`)
            return isBlocked
            
        } catch (error) {
            console.error('❌ Erro inesperado ao verificar bloqueio:', error)
            return false
        }
    },

    // ✅ REPORTAR USUÁRIO
    async reportUser(reporterId, reportedUserId, reportedName, reason, description = '') {
        try {
            console.log('🚨 Reportando usuário:', { 
                reporterId, 
                reportedUserId, 
                reportedName, 
                reason 
            })
            
            const { data, error } = await REPORT_QUERIES.reportUser(
                reporterId, 
                reportedUserId, 
                reason, 
                description
            )
            
            if (error) {
                console.error('❌ Erro ao reportar usuário:', error)
                return { 
                    success: false, 
                    error: 'Erro ao reportar usuário. Tente novamente.' 
                }
            }
            
            console.log('✅ Usuário reportado com sucesso:', data)
            
            return { 
                success: true, 
                message: `${reportedName} reportado com sucesso!`,
                reportId: data.id
            }
            
        } catch (error) {
            console.error('❌ Erro inesperado ao reportar usuário:', error)
            return { 
                success: false, 
                error: 'Erro ao reportar usuário. Tente novamente.' 
            }
        }
    },

    // ✅ CRIAR CARD DE USUÁRIO BLOQUEADO
    createBlockedUserCard(blockedUser) {
        try {
            if (!blockedUser) return ''
            
            const { id, nickname, avatar_url, city, time_ago } = blockedUser
            
            const initial = nickname.charAt(0).toUpperCase()
            
            let avatarHtml = ''
            if (avatar_url) {
                avatarHtml = `
                    <div class="user-card-avatar" style="background-image: url('${avatar_url}'); background-size: cover; background-position: center;">
                        <div class="user-card-avatar-fallback" style="display: none;">${initial}</div>
                    </div>
                `
            } else {
                avatarHtml = `
                    <div class="user-card-avatar">
                        <div class="user-card-avatar-fallback">${initial}</div>
                    </div>
                `
            }

            return `
                <div class="user-card blocked-user-card" data-user-id="${id}">
                    ${avatarHtml}
                    <div class="user-card-name">${nickname}</div>
                    
                    <div class="user-card-info">
                        ${city ? `<div class="user-card-detail">📍 ${city}</div>` : ''}
                        <div class="user-card-detail">⏰ Bloqueado ${time_ago}</div>
                    </div>
                    
                    <div class="user-card-actions">
                        <button class="btn btn-secondary btn-sm" onclick="blockService.unblockUserFromCard('${id}', '${nickname}')">
                            🔓 Desbloquear
                        </button>
                        <button class="btn btn-outline btn-sm" onclick="blockService.viewBlockedProfile('${id}')">
                            👀 Ver Perfil
                        </button>
                    </div>
                </div>
            `
            
        } catch (error) {
            console.error('❌ Erro ao criar card de usuário bloqueado:', error)
            return ''
        }
    },

    // ✅ DESBLOQUEAR USUÁRIO DIRETO DO CARD
    async unblockUserFromCard(userId, userName = 'Usuário') {
        try {
            console.log('🔓 Desbloqueando usuário do card:', { userId, userName })
            
            const currentUser = await this.getCurrentUser()
            if (!currentUser) return
            
            const result = await this.unblockUser(currentUser.id, userId, userName)
            
            if (result.success) {
                showAlert(result.message, 'success')
                // Remover card da UI
                this.removeBlockedUserCard(userId)
            } else {
                showAlert(result.error, 'error')
            }
            
        } catch (error) {
            console.error('❌ Erro ao desbloquear do card:', error)
            showAlert('Erro ao desbloquear usuário', 'error')
        }
    },

    // ✅ REMOVER CARD DA UI APÓS DESBLOQUEIO
    removeBlockedUserCard(userId) {
        try {
            console.log('🗑️ Removendo card do usuário bloqueado:', userId)
            
            const card = document.querySelector(`.blocked-user-card[data-user-id="${userId}"]`)
            if (card) {
                card.style.transition = 'all 0.3s ease'
                card.style.opacity = '0.5'
                card.style.transform = 'scale(0.95)'
                
                setTimeout(() => {
                    card.style.opacity = '0'
                    card.style.height = '0'
                    card.style.margin = '0'
                    card.style.padding = '0'
                    card.style.overflow = 'hidden'
                    card.style.border = 'none'
                    
                    setTimeout(() => {
                        if (card.parentNode) {
                            card.remove()
                            console.log('✅ Card removido da UI')
                            
                            // Verificar se ficou vazio
                            const remainingCards = document.querySelectorAll('.blocked-user-card').length
                            if (remainingCards === 0) {
                                this.showEmptyBlockedState()
                            }
                        }
                    }, 300)
                }, 150)
            }
            
        } catch (error) {
            console.error('❌ Erro ao remover card:', error)
        }
    },

    // ✅ MOSTRAR ESTADO VAZIO PARA BLOQUEADOS
    showEmptyBlockedState() {
        const container = document.getElementById('blockedUsersGrid')
        if (container) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🚫</div>
                    <h3>Nenhum usuário bloqueado</h3>
                    <p>Você não bloqueou nenhum usuário ainda</p>
                </div>
            `
        }
    },

    // ✅ VER PERFIL DE USUÁRIO BLOQUEADO
    async viewBlockedProfile(userId) {
        try {
            console.log('👀 Visualizando perfil de usuário bloqueado:', userId)
            
            // Verificar se ainda está bloqueado
            const currentUser = await this.getCurrentUser()
            if (!currentUser) return
            
            const isStillBlocked = await this.isUserBlocked(currentUser.id, userId)
            
            if (isStillBlocked) {
                showAlert('Você precisa desbloquear este usuário para ver o perfil', 'warning')
                return
            }
            
            // Se não está mais bloqueado, redirecionar
            localStorage.setItem('viewingProfileId', userId)
            window.location.href = 'perfil.html'
            
        } catch (error) {
            console.error('❌ Erro ao visualizar perfil bloqueado:', error)
            showAlert('Erro ao visualizar perfil', 'error')
        }
    },

    // ✅ BUSCAR USUÁRIO ATUAL
    async getCurrentUser() {
        try {
            const { data: { user }, error } = await supabase.auth.getUser()
            if (error) throw error
            return user
        } catch (error) {
            console.error('❌ Erro ao buscar usuário atual:', error)
            return null
        }
    },

    // ✅ FORMATAR TEMPO RELATIVO (para blocked_at)
    getTimeAgo(dateString) {
        const date = new Date(dateString)
        const now = new Date()
        const diffMs = now - date
        const diffMins = Math.floor(diffMs / 60000)
        const diffHours = Math.floor(diffMs / 3600000)
        const diffDays = Math.floor(diffMs / 86400000)
        
        if (diffMins < 1) return 'agora'
        if (diffMins < 60) return `${diffMins}min atrás`
        if (diffHours < 24) return `${diffHours}h atrás`
        if (diffDays < 7) return `${diffDays}d atrás`
        return `${Math.floor(diffDays / 7)}sem atrás`
    },

    // ✅ INICIALIZAR SISTEMA DE BLOQUEIO NA HOME
    async initializeBlockSystem(userId) {
        try {
            console.log('⚡ Inicializando sistema de bloqueio...')
            
            // Carregar IDs bloqueados em cache para performance
            const blockedIds = await this.loadBlockedIdsForCache(userId)
            
            console.log(`✅ Sistema de bloqueio inicializado: ${blockedIds.length} usuários bloqueados`)
            return blockedIds
            
        } catch (error) {
            console.error('❌ Erro ao inicializar sistema de bloqueio:', error)
            return []
        }
    },

    // ✅ CARREGAR IDs BLOQUEADOS PARA CACHE (performance)
    async loadBlockedIdsForCache(userId) {
        try {
            const { data: blocks, error } = await supabase
                .from('user_blocks')
                .select('blocked_user_id')
                .eq('blocker_id', userId)

            if (error) throw error
            
            return blocks.map(b => b.blocked_user_id)
            
        } catch (error) {
            console.error('❌ Erro ao carregar IDs bloqueados:', error)
            return []
        }
    }
}

// ✅ EXPORTAÇÃO PADRÃO
export default blockService