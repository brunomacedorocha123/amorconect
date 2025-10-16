// 📄 /scripts/menu-hamburguer.js
import { funcaoUtilitario } from './funcao-utilitario.js'

export const menuHamburguer = {
    // ✅ INICIALIZAR MENU HAMBURGUER
    inicializar() {
        try {
            console.log('🍔 Inicializando menu hamburguer...')
            
            this.configurarEventListeners()
            this.configurarFechamentoAutomatico()
            this.configurarResponsividade()
            
            console.log('✅ Menu hamburguer inicializado')
            
        } catch (error) {
            console.error('❌ Erro ao inicializar menu hamburguer:', error)
        }
    },

    // ✅ CONFIGURAR EVENT LISTENERS
    configurarEventListeners() {
        // Botão hamburguer
        const botaoHamburguer = document.getElementById('hamburgerBtn')
        if (botaoHamburguer) {
            botaoHamburguer.addEventListener('click', () => {
                this.toggleMenu()
            })
        }

        // Botão fechar
        const botaoFechar = document.getElementById('closeMobileMenu')
        if (botaoFechar) {
            botaoFechar.addEventListener('click', () => {
                this.fecharMenu()
            })
        }

        // Links do menu mobile - fechar ao clicar
        document.querySelectorAll('#mobileMenu a').forEach(link => {
            link.addEventListener('click', () => {
                this.fecharMenu()
            })
        })

        // Logout mobile
        const botaoLogoutMobile = document.getElementById('mobileLogoutBtn')
        if (botaoLogoutMobile) {
            botaoLogoutMobile.addEventListener('click', () => {
                this.fecharMenu()
                // O logout em si será tratado no auth-service
            })
        }
    },

    // ✅ ABRIR/FECHAR MENU
    toggleMenu() {
        const menu = document.getElementById('mobileMenu')
        const botao = document.getElementById('hamburgerBtn')
        
        if (!menu || !botao) return

        if (menu.style.display === 'flex') {
            this.fecharMenu()
        } else {
            this.abrirMenu()
        }
    },

    // ✅ ABRIR MENU
    abrirMenu() {
        const menu = document.getElementById('mobileMenu')
        const botao = document.getElementById('hamburgerBtn')
        
        if (!menu || !botao) return

        menu.style.display = 'flex'
        document.body.style.overflow = 'hidden'
        botao.innerHTML = '✕' // Muda para X
        
        // Animações de entrada
        this.animarEntradaMenu()
        
        console.log('📱 Menu mobile aberto')
    },

    // ✅ FECHAR MENU
    fecharMenu() {
        const menu = document.getElementById('mobileMenu')
        const botao = document.getElementById('hamburgerBtn')
        
        if (!menu || !botao) return

        // Animações de saída
        this.animarSaidaMenu()
        
        setTimeout(() => {
            menu.style.display = 'none'
            document.body.style.overflow = 'auto'
            botao.innerHTML = '☰' // Volta para hamburguer
        }, 300)
        
        console.log('📱 Menu mobile fechado')
    },

    // ✅ ANIMAÇÃO DE ENTRADA
    animarEntradaMenu() {
        const menu = document.getElementById('mobileMenu')
        if (!menu) return

        menu.style.opacity = '0'
        menu.style.transform = 'translateX(-100%)'
        
        setTimeout(() => {
            menu.style.transition = 'all 0.3s ease'
            menu.style.opacity = '1'
            menu.style.transform = 'translateX(0)'
        }, 10)
    },

    // ✅ ANIMAÇÃO DE SAÍDA
    animarSaidaMenu() {
        const menu = document.getElementById('mobileMenu')
        if (!menu) return

        menu.style.transition = 'all 0.3s ease'
        menu.style.opacity = '0'
        menu.style.transform = 'translateX(-100%)'
    },

    // ✅ CONFIGURAR FECHAMENTO AUTOMÁTICO
    configurarFechamentoAutomatico() {
        // Fechar ao clicar fora
        document.addEventListener('click', (event) => {
            const menu = document.getElementById('mobileMenu')
            const botao = document.getElementById('hamburgerBtn')
            
            if (!menu || !botao) return

            const isClickInsideMenu = menu.contains(event.target)
            const isClickOnButton = botao.contains(event.target)
            
            if (menu.style.display === 'flex' && !isClickInsideMenu && !isClickOnButton) {
                this.fecharMenu()
            }
        })

        // Fechar ao pressionar ESC
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                this.fecharMenu()
            }
        })

        // Fechar ao rotacionar tela
        window.addEventListener('orientationchange', () => {
            this.fecharMenu()
        })
    },

    // ✅ CONFIGURAR RESPONSIVIDADE
    configurarResponsividade() {
        // Verificar tamanho da tela ao carregar
        this.verificarTamanhoTela()
        
        // Verificar ao redimensionar
        window.addEventListener('resize', () => {
            this.verificarTamanhoTela()
        })
    },

    // ✅ VERIFICAR TAMANHO DA TELA
    verificarTamanhoTela() {
        const menu = document.getElementById('mobileMenu')
        const botao = document.getElementById('hamburgerBtn')
        const menuDesktop = document.querySelector('.user-menu')
        
        if (!botao) return

        if (funcaoUtilitario.isMobile()) {
            // MODO MOBILE
            botao.style.display = 'flex'
            if (menuDesktop) menuDesktop.style.display = 'none'
            
            // Fechar menu se estiver aberto em resize
            if (menu && menu.style.display === 'flex' && window.innerWidth > 768) {
                this.fecharMenu()
            }
            
        } else {
            // MODO DESKTOP
            botao.style.display = 'none'
            if (menuDesktop) menuDesktop.style.display = 'flex'
            this.fecharMenu() // Garante que está fechado
        }
    },

    // ✅ ATUALIZAR DADOS DO USUÁRIO NO MENU MOBILE
    async atualizarDadosUsuario(user, userProfile) {
        try {
            console.log('👤 Atualizando dados do usuário no menu mobile...')
            
            const avatarMobile = document.getElementById('mobileUserAvatar')
            const nicknameMobile = document.getElementById('mobileUserNickname')
            
            if (!avatarMobile || !nicknameMobile) return

            // Atualizar nickname
            let displayName = 'Usuário'
            if (user.user_metadata?.nickname) {
                displayName = user.user_metadata.nickname
            } else if (user.user_metadata?.full_name) {
                displayName = user.user_metadata.full_name
            } else if (user.email) {
                displayName = user.email.split('@')[0]
            }
            
            nicknameMobile.textContent = displayName

            // Atualizar avatar
            const userAvatarFallback = avatarMobile.querySelector('.user-avatar-fallback')
            const userAvatarImg = avatarMobile.querySelector('.user-avatar-img')
            
            if (!userAvatarFallback || !userAvatarImg) return

            userAvatarImg.style.display = 'none'
            userAvatarFallback.style.display = 'flex'
            
            if (userProfile?.avatar_url) {
                // Carregar foto (você pode importar o users-service se precisar)
                const { data } = supabase.storage
                    .from('avatars')
                    .getPublicUrl(userProfile.avatar_url)
                
                if (data?.publicUrl) {
                    userAvatarImg.src = data.publicUrl + '?t=' + Date.now()
                    userAvatarImg.style.display = 'block'
                    userAvatarFallback.style.display = 'none'
                }
            }
            
            userAvatarFallback.textContent = funcaoUtilitario.obterIniciais(displayName)
            
            console.log('✅ Dados do usuário atualizados no menu mobile')
            
        } catch (error) {
            console.error('❌ Erro ao atualizar dados do usuário no menu:', error)
        }
    },

    // ✅ MOSTRAR/OCULTAR BADGE PREMIUM NO MOBILE
    atualizarPremiumMobile(isPremium) {
        try {
            const badgeFreeMobile = document.getElementById('mobileFreeBadge')
            const botaoPremiumMobile = document.getElementById('mobilePremiumBtn')
            
            if (isPremium) {
                if (botaoPremiumMobile) botaoPremiumMobile.style.display = 'flex'
                if (badgeFreeMobile) badgeFreeMobile.style.display = 'none'
            } else {
                if (badgeFreeMobile) badgeFreeMobile.style.display = 'flex'
                if (botaoPremiumMobile) botaoPremiumMobile.style.display = 'none'
            }
            
        } catch (error) {
            console.error('❌ Erro ao atualizar premium mobile:', error)
        }
    },

    // ✅ ADICIONAR LINK EXTRA NO MENU MOBILE
    adicionarLinkMobile(texto, url, icone = '🔗') {
        try {
            const menuMobile = document.getElementById('mobileMenu')
            const navMobile = menuMobile?.querySelector('.mobile-nav')
            
            if (!navMobile) return

            const novoLink = document.createElement('a')
            novoLink.href = url
            novoLink.className = 'btn btn-outline'
            novoLink.innerHTML = `${icone} ${texto}`
            
            // Inserir antes do botão de sair
            const botaoSair = navMobile.querySelector('#mobileLogoutBtn')
            if (botaoSair) {
                navMobile.insertBefore(novoLink, botaoSair)
            } else {
                navMobile.appendChild(novoLink)
            }
            
            // Adicionar evento para fechar menu
            novoLink.addEventListener('click', () => {
                this.fecharMenu()
            })
            
        } catch (error) {
            console.error('❌ Erro ao adicionar link mobile:', error)
        }
    },

    // ✅ DESTACAR ITEM ATUAL NO MENU
    destacarItemAtual(paginaAtual) {
        try {
            const links = document.querySelectorAll('#mobileMenu a')
            links.forEach(link => {
                if (link.getAttribute('href') === paginaAtual) {
                    link.style.background = 'rgba(255, 255, 255, 0.2)'
                    link.style.fontWeight = 'bold'
                }
            })
        } catch (error) {
            console.error('❌ Erro ao destacar item atual:', error)
        }
    }
}

// ✅ INICIALIZAÇÃO AUTOMÁTICA QUANDO O DOM CARREGAR
document.addEventListener('DOMContentLoaded', () => {
    menuHamburguer.inicializar()
})

// ✅ EXPORTAÇÃO PADRÃO
export default menuHamburguer