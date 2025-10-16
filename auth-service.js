// 📄 /scripts/auth-service.js
import { supabase } from './supabase.js'

export const authService = {
    // ✅ VERIFICAR SE USUÁRIO ESTÁ LOGADO
    async checkAuth() {
        try {
            const { data: { user }, error } = await supabase.auth.getUser()
            
            if (error) throw error
            if (!user) {
                window.location.href = 'login.html'
                return null
            }
            
            return user
        } catch (error) {
            console.error('❌ Erro na autenticação:', error)
            window.location.href = 'login.html'
            return null
        }
    },

    // ✅ FAZER LOGIN
    async login(email, password) {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            })

            if (error) throw error
            
            return { success: true, user: data.user }
        } catch (error) {
            console.error('❌ Erro no login:', error)
            return { success: false, error: error.message }
        }
    },

    // ✅ FAZER LOGOUT
    async logout() {
        try {
            const { error } = await supabase.auth.signOut()
            if (error) throw error
            
            window.location.href = 'index.html'
        } catch (error) {
            console.error('❌ Erro no logout:', error)
        }
    },

    // ✅ CADASTRAR USUÁRIO
    async signUp(email, password, userData) {
        try {
            const { data, error } = await supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        nickname: userData.nickname,
                        full_name: userData.fullName
                    }
                }
            })

            if (error) throw error
            
            return { success: true, user: data.user }
        } catch (error) {
            console.error('❌ Erro no cadastro:', error)
            return { success: false, error: error.message }
        }
    },

    // ✅ VERIFICAR E-MAIL
    async verifyEmail(token) {
        try {
            const { data, error } = await supabase.auth.verifyOtp({
                token_hash: token,
                type: 'email'
            })

            if (error) throw error
            
            return { success: true, data }
        } catch (error) {
            console.error('❌ Erro na verificação de e-mail:', error)
            return { success: false, error: error.message }
        }
    },

    // ✅ RECUPERAR SENHA
    async resetPassword(email) {
        try {
            const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password.html`,
            })

            if (error) throw error
            
            return { success: true, data }
        } catch (error) {
            console.error('❌ Erro ao enviar e-mail de recuperação:', error)
            return { success: false, error: error.message }
        }
    },

    // ✅ ALTERAR SENHA
    async updatePassword(newPassword) {
        try {
            const { data, error } = await supabase.auth.updateUser({
                password: newPassword
            })

            if (error) throw error
            
            return { success: true, data }
        } catch (error) {
            console.error('❌ Erro ao alterar senha:', error)
            return { success: false, error: error.message }
        }
    },

    // ✅ REENVIAR E-MAIL DE VERIFICAÇÃO
    async resendVerification(email) {
        try {
            const { data, error } = await supabase.auth.resend({
                type: 'signup',
                email: email,
                options: {
                    emailRedirectTo: `${window.location.origin}/verificacao.html`
                }
            })

            if (error) throw error
            
            return { success: true, data }
        } catch (error) {
            console.error('❌ Erro ao reenviar verificação:', error)
            return { success: false, error: error.message }
        }
    },

    // ✅ BUSCAR PERFIL DO USUÁRIO
    async getUserProfile(userId) {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single()

            if (error) throw error
            return data
        } catch (error) {
            console.error('❌ Erro ao buscar perfil:', error)
            return null
        }
    },

    // ✅ ATUALIZAR PERFIL DO USUÁRIO
    async updateUserProfile(userId, profileData) {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .update(profileData)
                .eq('id', userId)
                .select()
                .single()

            if (error) throw error
            return { success: true, data }
        } catch (error) {
            console.error('❌ Erro ao atualizar perfil:', error)
            return { success: false, error: error.message }
        }
    },

    // ✅ ATUALIZAR STATUS ONLINE
    async updateOnlineStatus(userId) {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ 
                    last_online_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId)

            if (error) throw error
            
            return { success: true }
        } catch (error) {
            console.error('❌ Erro ao atualizar status online:', error)
            return { success: false, error: error.message }
        }
    },

    // ✅ VERIFICAR SESSÃO ATIVA
    async getSession() {
        try {
            const { data: { session }, error } = await supabase.auth.getSession()
            
            if (error) throw error
            return session
        } catch (error) {
            console.error('❌ Erro ao buscar sessão:', error)
            return null
        }
    },

    // ✅ OBTER USUÁRIO ATUAL (sem redirecionar)
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

    // ✅ ATUALIZAR DADOS DO USUÁRIO
    async updateUserData(userData) {
        try {
            const { data, error } = await supabase.auth.updateUser({
                data: userData
            })

            if (error) throw error
            return { success: true, data }
        } catch (error) {
            console.error('❌ Erro ao atualizar dados do usuário:', error)
            return { success: false, error: error.message }
        }
    },

    // ✅ VERIFICAR SE E-MAIL ESTÁ DISPONÍVEL
    async checkEmailAvailable(email) {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('email')
                .eq('email', email)
                .single()

            // Se não encontrou, email está disponível
            if (error && error.code === 'PGRST116') {
                return { available: true }
            }
            
            if (error) throw error
            
            return { available: false }
        } catch (error) {
            console.error('❌ Erro ao verificar e-mail:', error)
            return { available: false, error: error.message }
        }
    },

    // ✅ OBTER METADADAS DO USUÁRIO
    getUserMetadata() {
        try {
            const user = supabase.auth.getUser()
            return user?.user_metadata || null
        } catch (error) {
            console.error('❌ Erro ao obter metadados:', error)
            return null
        }
    },

    // ✅ VERIFICAR SE É PRIMEIRO LOGIN
    async isFirstLogin(userId) {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('created_at, last_login_at')
                .eq('id', userId)
                .single()

            if (error) throw error
            
            // Se last_login_at é null, é primeiro login
            return !data.last_login_at
        } catch (error) {
            console.error('❌ Erro ao verificar primeiro login:', error)
            return false
        }
    },

    // ✅ REGISTRAR LOGIN (atualizar last_login_at)
    async registerLogin(userId) {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ 
                    last_login_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId)

            if (error) throw error
            
            return { success: true }
        } catch (error) {
            console.error('❌ Erro ao registrar login:', error)
            return { success: false, error: error.message }
        }
    }
}

// ✅ EXPORTAÇÃO PADRÃO
export default authService