// 📄 /scripts/visitante-service.js
import { supabase } from './supabase.js'
import { USER_QUERIES } from './database.js'
import { usersService } from './users-service.js'
import { getTimeAgo, showAlert } from './utils.helpers.js'

export const visitanteService = {
    // ✅ CARREGAR VISITANTES (PREMIUM)
    async loadVisitantes(userId, limit = 8) {
        try {
            console.log('🔄 Carregando visitantes para usuário:', userId)
            
            const { data: visits, error } = await USER_QUERIES.getVisitors(userId, limit)
            
            if (error) {
                console.error('❌ Erro ao carregar visitantes:', error)
                showAlert('Erro ao carregar visitantes', 'error')
                return []
            }
            
            console.log(`✅ ${visits?.length || 0} visitas encontradas`)
            
            // Processar dados dos visitantes
            const visitantes = await Promise.all(
                (visits || []).map(async (visit) => {
                    try {
                        const profile = visit.profiles
                        if (!profile) {
                            console.log('⚠️ Perfil do visitante não encontrado')
                            return null
                        }
                        
                        const nickname = profile.nickname || 
                                       profile.full_name?.split(' ')[0] || 
                                       'Usuário'
                        
                        const photoUrl = await usersService.loadUserPhoto(profile.avatar_url)
                        const isOnline = usersService.isUserOnline(profile, userId)
                        
                        return {
                            id: profile.id,
                            nickname: nickname,
                            avatar_url: profile.avatar_url,
                            photoUrl: photoUrl,
                            city: profile.city || 'Cidade não informada',
                            visited_at: visit.visited_at,
                            time_ago: getTimeAgo(visit.visited_at),
                            is_online: isOnline
                        }
                        
                    } catch (profileError) {
                        console.error('❌ Erro ao processar visitante:', profileError)
                        return null
                    }
                })
            )
            
            const validVisitantes = visitantes.filter(visitante => visitante !== null)
            console.log(`🎯 ${validVisitantes.length} visitantes processados`)
            
            return validVisitantes
            
        } catch (error) {
            console.error('❌ Erro inesperado ao carregar visitantes:', error)
            return []
        }
    },

    // ✅ CRIAR CARD DE VISITANTE
    async createVisitorCard(visitante) {
        try {
            if (!visitante) return ''
            
            const { id, nickname, photoUrl, city, time_ago, is_online } = visitante
            
            // Status online
            const onlineBadge = is_online ? 
                '<div class="online-badge" title="Online"></div>' : 
                '<div class="offline-badge" title="Offline"></div>'
            
            let avatarContent = ''
            
            if (photoUrl) {
                avatarContent = `
                    <img class="visitor-avatar-img" src="${photoUrl}" alt="${nickname}" style="display: block;">
                `
            } else {
                const initial = nickname.charAt(0).toUpperCase()
                avatarContent = `<div class="visitor-avatar-fallback">${initial}</div>`
            }

            return `
                <div class="visitor-card" onclick="visitanteService.viewProfile('${id}')">
                    <div class="visitor-avatar">
                        ${avatarContent}
                        ${onlineBadge}
                    </div>
                    <div class="visitor-name">${nickname}</div>
                    <div class="visitor-location">${city}</div>
                    <div class="visitor-time">${time_ago}</div>
                </div>
            `
            
        } catch (error) {
            console.error('❌ Erro ao criar card do visitante:', error)
            return ''
        }
    },

    // ✅ CARREGAR CONTAGEM DE VISITAS (FREE)
    async loadVisitorsCount(userId) {
        try {
            console.log('🔢 Carregando contagem de visitas para:', userId)
            
            const { count, error } = await USER_QUERIES.getVisitorsCount(userId)
            
            if (error) {
                console.error('❌ Erro ao carregar contagem de visitas:', error)
                return 0
            }
            
            console.log(`✅ ${count} visitas na última semana`)
            return count
            
        } catch (error) {
            console.error('❌ Erro inesperado ao carregar contagem:', error)
            return 0
        }
    },

    // ✅ VERIFICAR STATUS PREMIUM
    async checkPremiumStatus(userId) {
        try {
            console.log('⭐ Verificando status premium para:', userId)
            
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('is_premium, premium_until')
                .eq('id', userId)
                .single()

            if (error) {
                console.error('❌ Erro ao verificar status premium:', error)
                return false
            }
            
            const isPremium = profile?.is_premium || false
            console.log(`✅ Status premium: ${isPremium}`)
            
            return isPremium
            
        } catch (error) {
            console.error('❌ Erro inesperado ao verificar premium:', error)
            return false
        }
    },

    // ✅ ATUALIZAR UI DE VISITANTES NA HOME
    async updateVisitorsUI(userId) {
        try {
            console.log('🎨 Atualizando UI de visitantes...')
            
            const isPremium = await this.checkPremiumStatus(userId)
            const premiumSection = document.getElementById('premiumVisitors')
            const freeSection = document.getElementById('freeVisitors')
            const visitorsGrid = document.getElementById('visitorsGrid')
            const visitorsCount = document.getElementById('visitorsCount')
            const freeVisitorsCount = document.getElementById('freeVisitorsCount')
            
            if (!premiumSection || !freeSection) {
                console.log('⚠️ Elementos da UI não encontrados')
                return
            }

            if (isPremium) {
                // MODO PREMIUM - Mostra cards dos visitantes
                console.log('👑 Usuário Premium - Carregando visitantes...')
                
                premiumSection.style.display = 'block'
                freeSection.style.display = 'none'
                
                // Mostrar loading
                visitorsGrid.innerHTML = `
                    <div class="visitors-loading">
                        <div class="visitors-spinner"></div>
                        <p>Carregando visitantes...</p>
                    </div>
                `
                
                // Carregar visitantes
                const visitantes = await this.loadVisitantes(userId)
                
                if (visitantes.length === 0) {
                    visitorsGrid.innerHTML = `
                        <div class="visitors-empty">
                            <div class="icon">👀</div>
                            <h3>Nenhuma visita recente</h3>
                            <p>Seu perfil ainda não foi visitado</p>
                        </div>
                    `
                } else {
                    let visitorsHTML = ''
                    for (const visitante of visitantes) {
                        const cardHTML = await this.createVisitorCard(visitante)
                        visitorsHTML += cardHTML
                    }
                    visitorsGrid.innerHTML = visitorsHTML
                }
                
                // Atualizar contador
                if (visitorsCount) {
                    visitorsCount.textContent = `${visitantes.length} visita${visitantes.length !== 1 ? 's' : ''}`
                }
                
            } else {
                // MODO FREE - Mostra apenas contagem
                console.log('🎯 Usuário Free - Mostrando contagem...')
                
                premiumSection.style.display = 'none'
                freeSection.style.display = 'block'
                
                const visitCount = await this.loadVisitorsCount(userId)
                const countText = visitCount === 1 ? '1 pessoa' : `${visitCount} pessoas`
                
                if (freeVisitorsCount) {
                    freeVisitorsCount.textContent = countText
                }
                if (visitorsCount) {
                    visitorsCount.textContent = `${visitCount} visita${visitCount !== 1 ? 's' : ''}`
                }
            }
            
            console.log('✅ UI de visitantes atualizada com sucesso')
            
        } catch (error) {
            console.error('❌ Erro ao atualizar UI de visitantes:', error)
            showAlert('Erro ao carregar visitantes', 'error')
        }
    },

    // ✅ VISUALIZAR PERFIL DO VISITANTE
    async viewProfile(userId) {
        try {
            console.log('👀 Visualizando perfil do visitante:', userId)
            
            // Verificar se perfil está completo
            const currentUser = await usersService.getCurrentUser()
            if (!currentUser) return

            const userProfile = await usersService.getUserProfile(currentUser.id)
            if (!usersService.isProfileComplete(userProfile)) {
                showAlert('Complete seu perfil primeiro para ver outros perfis!', 'warning')
                window.location.href = 'painel.html'
                return
            }

            // Redirecionar para perfil
            localStorage.setItem('viewingProfileId', userId)
            window.location.href = 'perfil.html'
            
            // Registrar visita em background
            setTimeout(async () => {
                try {
                    const { data, error } = await supabase
                        .from('profile_visits')
                        .insert({
                            visitor_id: currentUser.id,
                            visited_id: userId
                        })

                    if (error) {
                        console.log('⚠️ Visita não registrada:', error)
                    } else {
                        console.log('✅ Visita registrada em background')
                    }
                } catch (visitError) {
                    console.log('⚠️ Erro no registro de visita:', visitError)
                }
            }, 100)
            
        } catch (error) {
            console.error('❌ Erro ao visualizar perfil:', error)
            showAlert('Erro ao visualizar perfil', 'error')
        }
    },

    // ✅ CARREGAR TODOS OS VISITANTES (PÁGINA VISITANTE.HTML)
    async loadAllVisitantes(userId, page = 1, limit = 20) {
        try {
            console.log(`📄 Carregando todos os visitantes - Página ${page}`)
            
            const { data: visits, error } = await supabase
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
                .range((page - 1) * limit, page * limit - 1)

            if (error) {
                console.error('❌ Erro ao carregar todos os visitantes:', error)
                return []
            }
            
            console.log(`✅ ${visits?.length || 0} visitantes carregados`)
            
            // Processar dados
            const visitantes = await Promise.all(
                (visits || []).map(async (visit) => {
                    try {
                        const profile = visit.profiles
                        if (!profile) return null
                        
                        const nickname = profile.nickname || 'Usuário'
                        const photoUrl = await usersService.loadUserPhoto(profile.avatar_url)
                        const isOnline = usersService.isUserOnline(profile, userId)
                        
                        return {
                            id: profile.id,
                            nickname: nickname,
                            avatar_url: profile.avatar_url,
                            photoUrl: photoUrl,
                            city: profile.city || 'Cidade não informada',
                            visited_at: visit.visited_at,
                            time_ago: getTimeAgo(visit.visited_at),
                            is_online: isOnline
                        }
                    } catch (error) {
                        console.error('❌ Erro ao processar visitante:', error)
                        return null
                    }
                })
            )
            
            return visitantes.filter(v => v !== null)
            
        } catch (error) {
            console.error('❌ Erro inesperado ao carregar todos os visitantes:', error)
            return []
        }
    }
}

// ✅ EXPORTAÇÃO PADRÃO
export default visitanteService