// menu-vibe-redirect.js - COM FEEDBACK VISUAL
class MenuVibeRedirect {
    constructor() {
        this.supabase = null;
        this.checked = false;
        this.init();
    }

    async init() {
        if (this.checked) return;
        
        try {
            // 1. CONFIGURAR SUPABASE
            if (window.supabase) {
                this.supabase = window.supabase;
            } else {
                const SUPABASE_URL = 'https://rohsbrkbdlbewonibclf.supabase.co';
                const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvaHNicmtiZGxiZXdvbmliY2xmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MTc5MDMsImV4cCI6MjA3NjE5MzkwM30.PUbV15B1wUoU_-dfggCwbsS5U7C1YsoTrtcahEKn_Oc';
                this.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            }

            // 2. VERIFICAR USUÁRIO
            const { data: { user }, error: authError } = await this.supabase.auth.getUser();
            if (authError || !user) {
                this.showStatus('❌ Usuário não logado');
                this.checked = true;
                return;
            }

            // 3. VERIFICAR ACORDO
            const { data: agreement, error: agreementError } = await this.supabase
                .rpc('check_active_fidelity_agreement', {
                    p_user_id: user.id
                });

            if (agreementError) {
                this.showStatus('❌ Erro ao verificar acordo');
                this.checked = true;
                return;
            }

            const hasAgreement = agreement?.has_active_agreement || false;
            
            if (hasAgreement) {
                this.showStatus('✅ ACORDO ATIVO - Modificando links...');
                this.modifyMenuLinks();
                this.addVisualIndicator();
            } else {
                this.showStatus('❌ Sem acordo ativo');
            }
            
            this.checked = true;
            
        } catch (error) {
            this.showStatus('❌ Erro geral: ' + error.message);
            this.checked = true;
        }
    }

    modifyMenuLinks() {
        let modifiedCount = 0;
        
        // Modificar TODOS os links possíveis
        const allLinks = document.querySelectorAll('a');
        allLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href === 'mensagens.html' || href === 'messages.html') {
                link.setAttribute('href', 'vibe-exclusive.html');
                link.style.border = '2px solid #C6A664';
                link.style.borderRadius = '5px';
                modifiedCount++;
            }
        });

        this.showStatus(`✅ ${modifiedCount} links modificados para vibe-exclusive.html`);
    }

    addVisualIndicator() {
        const mensagensLinks = document.querySelectorAll('a[href="vibe-exclusive.html"]');
        mensagensLinks.forEach(link => {
            const existingBadge = link.querySelector('.vibe-badge');
            if (!existingBadge) {
                const badge = document.createElement('span');
                badge.className = 'vibe-badge';
                badge.innerHTML = ' 💎 VIBE EXCLUSIVE';
                badge.style.cssText = `
                    color: #C6A664;
                    font-weight: bold;
                    font-size: 0.8em;
                    margin-left: 8px;
                    background: rgba(198, 166, 100, 0.1);
                    padding: 2px 6px;
                    border-radius: 10px;
                    border: 1px solid #C6A664;
                `;
                link.appendChild(badge);
            }
        });
    }

    showStatus(message) {
        // Criar elemento de status visível
        let statusEl = document.getElementById('menu-redirect-status');
        if (!statusEl) {
            statusEl = document.createElement('div');
            statusEl.id = 'menu-redirect-status';
            statusEl.style.cssText = `
                position: fixed;
                top: 50px;
                right: 10px;
                background: #1a1a2e;
                color: white;
                padding: 10px;
                border: 2px solid #C6A664;
                border-radius: 5px;
                z-index: 10000;
                font-size: 12px;
                max-width: 300px;
            `;
            document.body.appendChild(statusEl);
        }
        statusEl.innerHTML = `<strong>Menu Redirect:</strong><br>${message}`;
        
        // Remover após 5 segundos
        setTimeout(() => {
            if (statusEl.parentNode) {
                statusEl.remove();
            }
        }, 5000);
    }
}

// INICIALIZAÇÃO AGGRESSIVA
function initializeMenuSystem() {
    if (!window.menuVibeSystem) {
        window.menuVibeSystem = new MenuVibeRedirect();
    }
}

// Múltiplas tentativas
document.addEventListener('DOMContentLoaded', initializeMenuSystem);
setTimeout(initializeMenuSystem, 1000);
setTimeout(initializeMenuSystem, 3000);