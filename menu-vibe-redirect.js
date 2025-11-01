// vibe-menu-fix.js - Solução completa e isolada
(function() {
    'use strict';
    
    let executed = false;
    let retryCount = 0;
    const maxRetries = 10;
    
    function initVibeMenuFix() {
        if (executed || retryCount >= maxRetries) return;
        retryCount++;
        
        // Esperar a página carregar completamente
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', executeVibeFix);
        } else {
            setTimeout(executeVibeFix, 1000);
        }
    }
    
    async function executeVibeFix() {
        try {
            // Esperar Supabase estar disponível
            if (!window.supabase) {
                setTimeout(executeVibeFix, 1000);
                return;
            }
            
            // Verificar usuário
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                executed = true;
                return;
            }
            
            // Verificar acordo Vibe Exclusive
            const { data: agreement } = await supabase.rpc('check_active_fidelity_agreement', {
                p_user_id: user.id
            });
            
            if (agreement?.has_active_agreement) {
                applyVibeMenuFix();
            }
            
            executed = true;
            
        } catch (error) {
            executed = true;
        }
    }
    
    function applyVibeMenuFix() {
        // Modificar links do menu principal
        const menuLinks = document.querySelectorAll('a[href="mensagens.html"]');
        menuLinks.forEach(link => {
            link.href = 'vibe-exclusive.html';
        });
        
        // Modificar links do footer
        const footerLinks = document.querySelectorAll('footer a[href="mensagens.html"]');
        footerLinks.forEach(link => {
            link.href = 'vibe-exclusive.html';
        });
        
        // Adicionar interceptador de cliques como backup
        addClickInterceptor();
        
        // Adicionar indicador visual
        addVisualIndicator();
    }
    
    function addClickInterceptor() {
        document.addEventListener('click', function(e) {
            const link = e.target.closest('a');
            if (link && link.getAttribute('href') === 'mensagens.html') {
                e.preventDefault();
                window.location.href = 'vibe-exclusive.html';
            }
        });
    }
    
    function addVisualIndicator() {
        const modifiedLinks = document.querySelectorAll('a[href="vibe-exclusive.html"]');
        modifiedLinks.forEach(link => {
            if (!link.querySelector('.vibe-indicator')) {
                const indicator = document.createElement('span');
                indicator.className = 'vibe-indicator';
                indicator.innerHTML = ' 💎';
                indicator.style.cssText = `
                    color: #C6A664;
                    margin-left: 5px;
                    font-size: 0.8em;
                    display: inline-block;
                `;
                link.appendChild(indicator);
            }
        });
    }
    
    // Inicialização segura
    setTimeout(initVibeMenuFix, 500);
    setTimeout(initVibeMenuFix, 2000);
    setTimeout(initVibeMenuFix, 5000);
    
})();