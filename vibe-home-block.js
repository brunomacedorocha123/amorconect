// vibe-home-block.js - BLOQUEIO SEGURO DA HOME PARA VIBE EXCLUSIVE
class VibeHomeBlocker {
    constructor() {
        this.supabase = window.supabase;
        this.currentUser = null;
        this.isBlocking = false;
        this.attemptCount = 0;
        this.maxAttempts = 10;
        
        this.init();
    }

    async init() {
        try {
            // Espera o auth-vibe.js carregar primeiro
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            await this.checkVibeStatus();
            
            // Tenta bloquear múltiplas vezes (em caso de carregamento tardio)
            this.attemptBlocking();
            
        } catch (error) {
            // Falha silenciosa
        }
    }

    async checkVibeStatus() {
        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            if (!user) return false;
            
            this.currentUser = user;

            // Verifica se o AuthVibeSystem já detectou vibe ativo
            if (window.AuthVibeSystem && window.AuthVibeSystem.activeAgreement) {
                return true;
            }

            // Verificação direta como fallback
            const { data: agreement } = await this.supabase
                .rpc('check_active_fidelity_agreement', {
                    p_user_id: user.id
                });

            const { data: directAgreements } = await this.supabase
                .from('fidelity_agreements')
                .select('*')
                .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
                .in('status', ['active', 'accepted'])
                .limit(1);

            return agreement?.has_active_agreement || (directAgreements && directAgreements.length > 0);
            
        } catch (error) {
            return false;
        }
    }

    attemptBlocking() {
        if (this.isBlocking || this.attemptCount >= this.maxAttempts) return;

        const interval = setInterval(async () => {
            this.attemptCount++;
            
            const hasVibeActive = await this.checkVibeStatus();
            
            if (hasVibeActive) {
                this.blockHomeContent();
                this.isBlocking = true;
                clearInterval(interval);
            }
            
            if (this.attemptCount >= this.maxAttempts) {
                clearInterval(interval);
            }
        }, 1000);
    }

    blockHomeContent() {
        // 1. REMOVE SEÇÕES PRINCIPAIS
        const sectionsToBlock = [
            '.users-section',
            '#visitorsSection', 
            '#feelsSection',
            '.users-grid',
            '#visitorsContainer',
            '#feelsContainer'
        ];
        
        sectionsToBlock.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                element.style.display = 'none';
                element.innerHTML = '';
            });
        });
        
        // 2. REMOVE CARDS INDIVIDUAIS DE USUÁRIOS
        const userCards = document.querySelectorAll('.user-card, [class*="card"]');
        userCards.forEach(card => {
            if (card.textContent.includes('Ver Perfil') || 
                card.querySelector('img') ||
                card.querySelector('.user-avatar')) {
                card.style.display = 'none';
                card.innerHTML = '';
            }
        });
        
        // 3. MODIFICA MENSAGEM DE BOAS-VINDAS
        const welcomeSelectors = [
            '#welcomeMessage',
            '.welcome-content h1',
            '.welcome-section h1'
        ];
        
        welcomeSelectors.forEach(selector => {
            const element = document.querySelector(selector);
            if (element && !element.textContent.includes('Vibe Exclusive')) {
                element.textContent = 'Modo Vibe Exclusive Ativo';
                element.style.color = '#C6A664';
            }
        });
        
        // 4. ADICIONA MENSAGEM DO VIBE (SÓ UMA VEZ)
        this.addVibeMessage();
        
        // 5. OBSERVA MUDANÇAS FUTURAS NO DOM
        this.observeChanges();
    }

    addVibeMessage() {
        if (document.getElementById('vibeHomeBlockMessage')) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.id = 'vibeHomeBlockMessage';
        messageDiv.innerHTML = `
            <div style="
                background: linear-gradient(135deg, rgba(198, 166, 100, 0.1), rgba(166, 91, 91, 0.1));
                border: 2px solid #C6A664;
                border-radius: 20px;
                padding: 40px 30px;
                text-align: center;
                margin: 30px 0;
                color: #333;
                box-shadow: 0 8px 32px rgba(198, 166, 100, 0.15);
            ">
                <div style="font-size: 4rem; margin-bottom: 20px;">💎</div>
                <h3 style="color: #C6A664; margin-bottom: 15px; font-size: 1.8rem; font-weight: 700;">
                    Vibe Exclusive Ativo
                </h3>
                <p style="margin-bottom: 25px; opacity: 0.9; font-size: 1.1rem; line-height: 1.6;">
                    Sua conexão exclusiva está ativa!<br>
                    As funcionalidades de descoberta foram temporariamente desativadas.
                </p>
                <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
                    <button onclick="window.location.href='vibe-exclusive.html'" style="
                        background: linear-gradient(135deg, #C6A664, #A65B5B);
                        color: white;
                        border: none;
                        padding: 14px 28px;
                        border-radius: 12px;
                        cursor: pointer;
                        font-weight: 600;
                        font-size: 1rem;
                        transition: all 0.3s ease;
                        box-shadow: 0 4px 15px rgba(198, 166, 100, 0.3);
                    " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(198, 166, 100, 0.4)'" 
                    onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(198, 166, 100, 0.3)'">
                        <i class="fas fa-gem" style="margin-right: 8px;"></i>
                        Ir para Vibe Exclusive
                    </button>
                    <button onclick="window.location.href='painel.html'" style="
                        background: rgba(255, 255, 255, 0.9);
                        color: #333;
                        border: 2px solid #C6A664;
                        padding: 14px 28px;
                        border-radius: 12px;
                        cursor: pointer;
                        font-weight: 600;
                        font-size: 1rem;
                        transition: all 0.3s ease;
                    " onmouseover="this.style.transform='translateY(-2px)'; this.style.background='white'" 
                    onmouseout="this.style.transform='translateY(0)'; this.style.background='rgba(255, 255, 255, 0.9)'">
                        <i class="fas fa-user" style="margin-right: 8px;"></i>
                        Meu Perfil
                    </button>
                </div>
            </div>
        `;

        // INSERE NA HOME - TENTA VÁRIOS LOCAIS
        const insertPoints = [
            '.welcome-section',
            '.users-section',
            '.main-content .container',
            '#visitorsSection'
        ];
        
        for (const selector of insertPoints) {
            const element = document.querySelector(selector);
            if (element) {
                element.parentNode.insertBefore(messageDiv, element.nextSibling);
                break;
            }
        }
        
        // FALLBACK: adiciona no início do container
        if (!messageDiv.parentNode) {
            const container = document.querySelector('.container') || document.querySelector('main');
            if (container) {
                container.insertBefore(messageDiv, container.firstChild);
            }
        }
    }

    observeChanges() {
        // Observa mudanças no DOM para bloquear conteúdo carregado depois
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) {
                        this.blockNewContent(node);
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    blockNewContent(node) {
        // Bloqueia novos cards de usuários
        if (node.classList && (
            node.classList.contains('user-card') ||
            node.classList.contains('users-grid') ||
            node.id === 'visitorsContainer' ||
            node.id === 'feelsContainer'
        )) {
            node.style.display = 'none';
            node.innerHTML = '';
        }

        // Verifica filhos também
        if (node.querySelectorAll) {
            const newCards = node.querySelectorAll('.user-card, [class*="card"]');
            newCards.forEach(card => {
                card.style.display = 'none';
                card.innerHTML = '';
            });
        }
    }
}

// ==================== INICIALIZAÇÃO SEGURA ====================
// Espera a página carregar completamente
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            new VibeHomeBlocker();
        }, 1000);
    });
} else {
    setTimeout(() => {
        new VibeHomeBlocker();
    }, 1000);
}

// Inicialização tardia como backup
setTimeout(() => {
    if (!window.vibeHomeBlockerInitialized) {
        new VibeHomeBlocker();
        window.vibeHomeBlockerInitialized = true;
    }
}, 5000);