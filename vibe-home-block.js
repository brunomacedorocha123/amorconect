// vibe-home-block.js - BLOQUEIO COMPLETO E AGRESSIVO DA HOME
class VibeHomeBlocker {
    constructor() {
        this.supabase = window.supabase;
        this.currentUser = null;
        this.isBlocking = false;
        this.observer = null;
        
        this.init();
    }

    async init() {
        try {
            // Verificação ULTRA-RÁPIDA
            const hasVibeActive = await this.checkVibeStatus();
            
            if (hasVibeActive) {
                console.log('VIBE ACTIVE DETECTADO - BLOQUEANDO HOME');
                this.activateAggressiveBlocking();
            }
            
        } catch (error) {
            // Falha silenciosa
        }
    }

    async checkVibeStatus() {
        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            if (!user) return false;
            
            this.currentUser = user;

            // PRIMEIRO: Verifica se o AuthVibeSystem já detectou
            if (window.AuthVibeSystem && window.AuthVibeSystem.activeAgreement) {
                return true;
            }

            // SEGUNDO: Verificação direta RÁPIDA
            const { data: agreement } = await this.supabase
                .rpc('check_active_fidelity_agreement', {
                    p_user_id: user.id
                });

            if (agreement?.has_active_agreement) {
                return true;
            }

            // TERCEIRO: Busca direta na tabela
            const { data: directAgreements } = await this.supabase
                .from('fidelity_agreements')
                .select('*')
                .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
                .in('status', ['active', 'accepted'])
                .limit(1);

            return directAgreements && directAgreements.length > 0;
            
        } catch (error) {
            return false;
        }
    }

    activateAggressiveBlocking() {
        if (this.isBlocking) return;
        this.isBlocking = true;

        // ⭐⭐ ESTRATÉGIA AGRESSIVA: MÚLTIPLAS CAMADAS DE BLOQUEIO ⭐⭐

        // 1. BLOQUEIO IMEDIATO
        this.blockImmediately();

        // 2. BLOQUEIO RECORRENTE (em caso de carregamento tardio)
        const intervals = [100, 500, 1000, 2000, 3000, 5000];
        intervals.forEach(delay => {
            setTimeout(() => this.blockImmediately(), delay);
        });

        // 3. OBSERVADOR DE MUDANÇAS NO DOM
        this.startDOMObserver();

        // 4. INTERCEPTADOR DE FUNÇÕES DO home.js
        this.interceptHomeFunctions();

        // 5. BLOQUEIO CONTÍNUO
        this.startContinuousBlocking();
    }

    blockImmediately() {
        // REMOVE SEÇÕES COMPLETAS
        const sectionsToDestroy = [
            '.users-section',
            '#visitorsSection', 
            '#feelsSection',
            '.users-grid',
            '#visitorsContainer',
            '#feelsContainer'
        ];
        
        sectionsToDestroy.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                element.style.display = 'none';
                element.innerHTML = '';
                element.remove();
            });
        });

        // DESTRÓI CARDS INDIVIDUAIS
        const userCards = document.querySelectorAll('.user-card, [class*="card"]');
        userCards.forEach(card => {
            card.style.display = 'none';
            card.innerHTML = '';
            card.remove();
        });

        // REMOVE CONTEÚDO DE USUÁRIOS DE QUALQUER LUGAR
        document.querySelectorAll('*').forEach(element => {
            const text = element.textContent || '';
            if (text.includes('Ver Perfil') || 
                text.includes('Pessoas para Conhecer') ||
                text.includes('Online') ||
                element.querySelector('img') && element.textContent.includes('user')) {
                element.style.display = 'none';
                element.innerHTML = '';
            }
        });

        // MODIFICA MENSAGEM DE BOAS-VINDAS
        this.modifyWelcomeMessage();

        // ADICIONA MENSAGEM DO VIBE
        this.addVibeMessage();
    }

    modifyWelcomeMessage() {
        const welcomeSelectors = [
            '#welcomeMessage',
            '.welcome-content h1',
            '.welcome-section h1',
            '[class*="welcome"] h1'
        ];
        
        welcomeSelectors.forEach(selector => {
            const element = document.querySelector(selector);
            if (element) {
                element.textContent = '💎 Vibe Exclusive Ativo';
                element.style.color = '#C6A664';
                element.style.fontWeight = '700';
            }
        });
    }

    addVibeMessage() {
        // Remove mensagem anterior se existir
        const existingMessage = document.getElementById('vibeHomeBlockMessage');
        if (existingMessage) existingMessage.remove();

        const messageDiv = document.createElement('div');
        messageDiv.id = 'vibeHomeBlockMessage';
        messageDiv.innerHTML = `
            <div style="
                background: linear-gradient(135deg, rgba(198, 166, 100, 0.2), rgba(166, 91, 91, 0.2));
                border: 3px solid #C6A664;
                border-radius: 25px;
                padding: 50px 40px;
                text-align: center;
                margin: 40px 0;
                color: #333;
                box-shadow: 0 15px 50px rgba(198, 166, 100, 0.25);
                backdrop-filter: blur(10px);
            ">
                <div style="font-size: 6rem; margin-bottom: 30px; animation: float 3s ease-in-out infinite;">💎</div>
                <h3 style="color: #C6A664; margin-bottom: 25px; font-size: 2.2rem; font-weight: 800;">
                    CONEXÃO EXCLUSIVA ATIVA
                </h3>
                <p style="margin-bottom: 35px; opacity: 0.95; font-size: 1.3rem; line-height: 1.7; max-width: 600px; margin-left: auto; margin-right: auto;">
                    Seu Vibe Exclusive está ativo!<br>
                    <strong>Todas as funcionalidades de descoberta e interação foram desativadas temporariamente.</strong>
                </p>
                <div style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;">
                    <button onclick="window.location.href='vibe-exclusive.html'" style="
                        background: linear-gradient(135deg, #C6A664, #A65B5B);
                        color: white;
                        border: none;
                        padding: 18px 35px;
                        border-radius: 15px;
                        cursor: pointer;
                        font-weight: 700;
                        font-size: 1.1rem;
                        transition: all 0.3s ease;
                        box-shadow: 0 6px 25px rgba(198, 166, 100, 0.4);
                    " onmouseover="this.style.transform='translateY(-3px)'; this.style.boxShadow='0 10px 30px rgba(198, 166, 100, 0.6)'" 
                    onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 6px 25px rgba(198, 166, 100, 0.4)'">
                        <i class="fas fa-gem" style="margin-right: 10px;"></i>
                        IR PARA VIBE EXCLUSIVE
                    </button>
                </div>
                <p style="margin-top: 25px; opacity: 0.7; font-size: 0.9rem;">
                    💫 Aproveite sua conexão especial!
                </p>
            </div>
            
            <style>
                @keyframes float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-10px); }
                }
            </style>
        `;

        // INSERE EM VÁRIOS PONTOS POSSÍVEIS
        const insertStrategies = [
            // Estratégia 1: Após welcome section
            () => {
                const welcome = document.querySelector('.welcome-section');
                if (welcome) {
                    welcome.parentNode.insertBefore(messageDiv, welcome.nextSibling);
                    return true;
                }
                return false;
            },
            // Estratégia 2: No início do container principal
            () => {
                const container = document.querySelector('.container') || document.querySelector('main');
                if (container) {
                    container.insertBefore(messageDiv, container.firstChild);
                    return true;
                }
                return false;
            },
            // Estratégia 3: No body como último recurso
            () => {
                document.body.insertBefore(messageDiv, document.body.firstChild);
                return true;
            }
        ];

        for (const strategy of insertStrategies) {
            if (strategy()) break;
        }
    }

    startDOMObserver() {
        // Observa TODAS as mudanças no DOM
        this.observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) { // Element node
                        this.destroyNewContent(node);
                    }
                });
            });
        });

        this.observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['style', 'class']
        });
    }

    destroyNewContent(node) {
        // DESTRÓI qualquer conteúdo novo relacionado a usuários
        const destroySelectors = [
            '.user-card',
            '.users-grid',
            '.users-section',
            '#visitorsSection',
            '#feelsSection',
            '#visitorsContainer', 
            '#feelsContainer',
            '[class*="user"]',
            '[class*="card"]'
        ];

        destroySelectors.forEach(selector => {
            if (node.matches && node.matches(selector)) {
                node.style.display = 'none';
                node.innerHTML = '';
                node.remove();
            }
            
            if (node.querySelectorAll) {
                const elements = node.querySelectorAll(selector);
                elements.forEach(el => {
                    el.style.display = 'none';
                    el.innerHTML = '';
                    el.remove();
                });
            }
        });

        // Destrói por conteúdo de texto também
        const text = node.textContent || '';
        if (text.includes('Ver Perfil') || 
            text.includes('Pessoas para Conhecer') ||
            text.includes('Conhecer') ||
            (node.querySelector && (node.querySelector('img') || node.querySelector('.user-avatar')))) {
            node.style.display = 'none';
            node.innerHTML = '';
            node.remove();
        }
    }

    interceptHomeFunctions() {
        // INTERCEPTA as funções principais do home.js
        if (window.loadUsers) {
            window.originalLoadUsers = window.loadUsers;
            window.loadUsers = () => {
                // Não faz nada - bloqueia completamente
                const usersGrid = document.getElementById('usersGrid');
                if (usersGrid) {
                    usersGrid.innerHTML = '';
                    usersGrid.style.display = 'none';
                }
            };
        }

        if (window.displayUsers) {
            window.originalDisplayUsers = window.displayUsers;
            window.displayUsers = () => {
                // Não mostra usuários
                const usersGrid = document.getElementById('usersGrid');
                if (usersGrid) {
                    usersGrid.innerHTML = '';
                    usersGrid.style.display = 'none';
                }
            };
        }
    }

    startContinuousBlocking() {
        // BLOQUEIO CONTÍNUO a cada 2 segundos
        setInterval(() => {
            this.blockImmediately();
        }, 2000);
    }

    destroy() {
        if (this.observer) {
            this.observer.disconnect();
        }
        this.isBlocking = false;
    }
}

// ==================== INICIALIZAÇÃO ULTRA-AGRESSIVA ====================
function initializeVibeHomeBlocker() {
    // Espera um pouco para o supabase carregar
    setTimeout(() => {
        if (window.supabase) {
            new VibeHomeBlocker();
        } else {
            // Tenta novamente se supabase não estiver pronto
            setTimeout(() => {
                new VibeHomeBlocker();
            }, 2000);
        }
    }, 1000);
}

// MÚLTIPLAS INICIALIZAÇÕES PARA GARANTIR
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeVibeHomeBlocker);
} else {
    initializeVibeHomeBlocker();
}

// INICIALIZAÇÃO TARDIA COMO BACKUP
setTimeout(initializeVibeHomeBlocker, 3000);
setTimeout(initializeVibeHomeBlocker, 6000);

// ==================== FUNÇÕES GLOBAIS ====================
window.VibeHomeBlocker = VibeHomeBlocker;