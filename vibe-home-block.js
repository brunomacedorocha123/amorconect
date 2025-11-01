// vibe-home-block.js - BLOQUEIO TOTAL SILENCIOSO
class VibeHomeBlocker {
    constructor() {
        this.supabase = window.supabase;
        this.currentUser = null;
        this.isBlocking = false;
        this.blockInterval = null;
        
        this.init();
    }

    async init() {
        try {
            const hasVibeActive = await this.checkVibeStatus();
            
            if (hasVibeActive) {
                this.activateTotalBlocking();
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

            if (window.AuthVibeSystem && window.AuthVibeSystem.activeAgreement) {
                return true;
            }

            const { data: agreement } = await this.supabase
                .rpc('check_active_fidelity_agreement', {
                    p_user_id: user.id
                });

            if (agreement?.has_active_agreement) {
                return true;
            }

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

    activateTotalBlocking() {
        if (this.isBlocking) return;
        this.isBlocking = true;

        // BLOQUEIO IMEDIATO
        this.destroyAllUserContent();

        // BLOQUEIO RECORRENTE
        const intervals = [100, 300, 500, 1000, 2000, 3000, 5000, 8000];
        intervals.forEach(delay => {
            setTimeout(() => this.destroyAllUserContent(), delay);
        });

        // BLOQUEIO CONTÍNUO
        this.blockInterval = setInterval(() => {
            this.destroyAllUserContent();
        }, 1000);

        // INTERCEPTA FUNÇÕES
        this.interceptAllFunctions();

        // OBSERVA MUDANÇAS
        this.observeAllChanges();
    }

    destroyAllUserContent() {
        // DESTRÓI SEÇÕES COMPLETAS
        const sections = [
            '.users-section',
            '#visitorsSection', 
            '#feelsSection',
            '.users-grid',
            '#visitorsContainer',
            '#feelsContainer'
        ];
        
        sections.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                element.style.display = 'none';
                element.innerHTML = '';
            });
        });

        // DESTRÓI CARDS INDIVIDUAIS
        const cards = document.querySelectorAll('.user-card, [class*="card"]');
        cards.forEach(card => {
            card.style.display = 'none';
            card.innerHTML = '';
        });

        // DESTRÓI POR CONTEÚDO
        document.querySelectorAll('*').forEach(element => {
            const text = element.textContent || '';
            if (text.includes('Ver Perfil') || 
                text.includes('Pessoas para Conhecer') ||
                text.includes('Conhecer') ||
                (element.querySelector && element.querySelector('img'))) {
                element.style.display = 'none';
                element.innerHTML = '';
            }
        });

        // MODIFICA MENSAGEM
        this.modifyWelcomeMessage();

        // ADICIONA MENSAGEM VIBE
        this.addVibeMessage();
    }

    modifyWelcomeMessage() {
        const selectors = ['#welcomeMessage', '.welcome-content h1', '.welcome-section h1'];
        selectors.forEach(selector => {
            const element = document.querySelector(selector);
            if (element) {
                element.textContent = '💎 Vibe Exclusive Ativo';
                element.style.color = '#C6A664';
            }
        });
    }

    addVibeMessage() {
        if (document.getElementById('vibeHomeBlockMessage')) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.id = 'vibeHomeBlockMessage';
        messageDiv.innerHTML = `
            <div style="
                background: linear-gradient(135deg, rgba(198, 166, 100, 0.15), rgba(166, 91, 91, 0.15));
                border: 2px solid #C6A664;
                border-radius: 20px;
                padding: 40px 30px;
                text-align: center;
                margin: 30px 0;
                color: #333;
            ">
                <div style="font-size: 4rem; margin-bottom: 20px;">💎</div>
                <h3 style="color: #C6A664; margin-bottom: 15px; font-size: 1.8rem;">
                    Vibe Exclusive Ativo
                </h3>
                <p style="margin-bottom: 25px; opacity: 0.9; font-size: 1.1rem;">
                    Sua conexão exclusiva está ativa!
                </p>
                <button onclick="window.location.href='vibe-exclusive.html'" style="
                    background: linear-gradient(135deg, #C6A664, #A65B5B);
                    color: white;
                    border: none;
                    padding: 14px 28px;
                    border-radius: 12px;
                    cursor: pointer;
                    font-weight: 600;
                    font-size: 1rem;
                ">
                    <i class="fas fa-gem" style="margin-right: 8px;"></i>
                    Ir para Vibe Exclusive
                </button>
            </div>
        `;

        const container = document.querySelector('.container') || document.querySelector('main');
        if (container) {
            container.insertBefore(messageDiv, container.firstChild);
        }
    }

    interceptAllFunctions() {
        if (window.loadUsers) {
            window.originalLoadUsers = window.loadUsers;
            window.loadUsers = () => {
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
                const usersGrid = document.getElementById('usersGrid');
                if (usersGrid) {
                    usersGrid.innerHTML = '';
                    usersGrid.style.display = 'none';
                }
            };
        }
    }

    observeAllChanges() {
        const observer = new MutationObserver(() => {
            this.destroyAllUserContent();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    destroy() {
        if (this.blockInterval) {
            clearInterval(this.blockInterval);
        }
        this.isBlocking = false;
    }
}

// INICIALIZAÇÃO MULTIPLA
function initializeBlocker() {
    if (window.supabase) {
        new VibeHomeBlocker();
    } else {
        setTimeout(initializeBlocker, 1000);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeBlocker);
} else {
    initializeBlocker();
}

setTimeout(initializeBlocker, 2000);
setTimeout(initializeBlocker, 5000);