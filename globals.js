// ==================== GLOBALS.JS COMPLETO ====================
// Sistema completo do Amor Conect

console.log('🚀 Amor Conect - Inicializando sistema...');

// Configuração do Supabase
const SUPABASE_URL = 'https://rohsbrkbdlbewonibclf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvaHNicmtiZGxiZXdvbmliY2xmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MTc5MDMsImV4cCI6MjA3NjE5MzkwM30.PUbV15B1wUoU_-dfggCwbsS5U7C1YsoTrtcahEKn_Oc';

// Inicialização do Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Estado global da aplicação
window.currentUser = null;
window.isInitialized = false;

// ==================== INICIALIZAÇÃO GLOBAL ====================
document.addEventListener('DOMContentLoaded', function() {
    if (window.isInitialized) return;
    window.isInitialized = true;
    
    console.log('🎯 Globals.js inicializado - Amor Conect');
    initializeGlobalSystems();
    checkAuthStatus();
});

// ==================== SISTEMAS GLOBAIS ====================
function initializeGlobalSystems() {
    setupMobileMenu();
    startOnlineStatusUpdater();
    setupGlobalEventListeners();
    setupAuthStateListener();
    setupServiceWorker();
}

// ==================== SISTEMA DE AUTENTICAÇÃO ====================
async function checkAuthStatus() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) throw error;
        
        if (user) {
            window.currentUser = user;
            console.log('✅ Usuário autenticado:', user.email);
            
            // Verificar se o perfil foi criado
            await checkAndCreateProfile(user);
            
            // Atualizar UI baseada no auth
            updateUIForAuthState(true);
        } else {
            updateUIForAuthState(false);
        }
        
    } catch (error) {
        console.error('❌ Erro na verificação de autenticação:', error);
        updateUIForAuthState(false);
    }
}

// Listener para mudanças de autenticação
function setupAuthStateListener() {
    supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('🔄 Mudança de estado de autenticação:', event);
        
        if (event === 'SIGNED_IN' && session) {
            window.currentUser = session.user;
            await checkAndCreateProfile(session.user);
            updateUIForAuthState(true);
            
            // Redirecionar se estiver em página de auth
            if (window.location.pathname.includes('login.html') || 
                window.location.pathname.includes('cadastro.html')) {
                showNotification('✅ Login realizado com sucesso!', 'success');
                setTimeout(() => {
                    window.location.href = 'home.html';
                }, 1500);
            }
        } else if (event === 'SIGNED_OUT') {
            window.currentUser = null;
            updateUIForAuthState(false);
            showNotification('👋 Logout realizado', 'info');
        } else if (event === 'USER_UPDATED') {
            console.log('📧 Status do usuário atualizado');
        } else if (event === 'TOKEN_REFRESHED') {
            console.log('🔐 Token atualizado');
        }
    });
}

// Verificar e criar perfil se necessário
async function checkAndCreateProfile(user) {
    try {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (error && error.code === 'PGRST116') {
            // Perfil não existe, criar um
            console.log('📝 Criando perfil para usuário...');
            
            const nickname = user.user_metadata?.nickname || user.email.split('@')[0];
            const full_name = user.user_metadata?.full_name || '';
            const birth_date = user.user_metadata?.birth_date || null;
            
            const { error: createError } = await supabase
                .from('profiles')
                .insert({
                    id: user.id,
                    nickname: nickname,
                    full_name: full_name,
                    birth_date: birth_date
                });

            if (createError) {
                console.error('❌ Erro ao criar perfil:', createError);
                throw createError;
            }
            
            console.log('✅ Perfil criado com sucesso');
            
            // Criar user_details também
            const { error: detailsError } = await supabase
                .from('user_details')
                .insert({
                    id: user.id
                });
                
            if (detailsError) {
                console.error('❌ Erro ao criar user_details:', detailsError);
            }
            
        } else if (error) {
            throw error;
        } else {
            console.log('✅ Perfil já existe:', profile.nickname);
        }
    } catch (error) {
        console.error('❌ Erro ao verificar/criar perfil:', error);
    }
}

// Atualizar UI baseada no estado de autenticação
function updateUIForAuthState(isAuthenticated) {
    const authButtons = document.querySelector('.auth-buttons');
    const userMenu = document.querySelector('.user-menu');
    
    if (authButtons) {
        if (isAuthenticated) {
            authButtons.innerHTML = `
                <div class="user-menu">
                    <span>Olá, ${window.currentUser?.email?.split('@')[0] || 'Usuário'}</span>
                    <button class="btn btn-outline btn-sm" onclick="logout()">Sair</button>
                </div>
            `;
        } else {
            authButtons.innerHTML = `
                <a href="login.html" class="btn btn-outline">Entrar</a>
                <a href="cadastro.html" class="btn btn-primary">Cadastre-se</a>
            `;
        }
    }
}

// ==================== SISTEMA DE LOGOUT ====================
async function logout() {
    try {
        const confirmLogout = window.confirm('Tem certeza que deseja sair?');
        if (!confirmLogout) return;
        
        showNotification('👋 Saindo...', 'info');
        
        // Atualizar último online antes de sair
        if (window.currentUser) {
            await supabase
                .from('profiles')
                .update({ 
                    last_online_at: new Date().toISOString()
                })
                .eq('id', window.currentUser.id);
        }
        
        // Fazer logout
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        // Redirecionar para home
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
        
    } catch (error) {
        console.error('❌ Erro ao fazer logout:', error);
        showNotification('❌ Erro ao sair', 'error');
    }
}

// ==================== SISTEMA DE NOTIFICAÇÕES ====================
function showNotification(message, type = 'info') {
    // Remover notificação existente
    const existingNotification = document.querySelector('.global-notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    // Criar nova notificação
    const notification = document.createElement('div');
    notification.className = `global-notification notification-${type}`;
    
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: '💡'
    };
    
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-icon">${icons[type] || '💡'}</span>
            <span class="notification-message">${message}</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;

    // Estilos para a notificação
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'error' ? '#f56565' : 
                     type === 'success' ? '#48bb78' : 
                     type === 'warning' ? '#ed8936' : '#4299e1'};
        color: white;
        padding: 16px 20px;
        border-radius: 12px;
        box-shadow: 0 8px 25px rgba(0,0,0,0.15);
        z-index: 10000;
        max-width: 350px;
        animation: slideInRight 0.3s ease;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        line-height: 1.4;
        border-left: 4px solid ${type === 'error' ? '#c53030' : 
                              type === 'success' ? '#2f855a' : 
                              type === 'warning' ? '#b7791f' : '#2c5aa0'};
    `;

    // Adicionar keyframes para animação
    if (!document.querySelector('#notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideInRight {
                from {
                    opacity: 0;
                    transform: translateX(100%);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }
            @keyframes slideOutRight {
                from {
                    opacity: 1;
                    transform: translateX(0);
                }
                to {
                    opacity: 0;
                    transform: translateX(100%);
                }
            }
            .notification-content {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .notification-close {
                background: none;
                border: none;
                color: white;
                font-size: 18px;
                cursor: pointer;
                padding: 0;
                margin-left: auto;
            }
        `;
        document.head.appendChild(style);
    }

    // Adicionar ao DOM
    document.body.appendChild(notification);

    // Auto-remover após 5 segundos
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

// ==================== SISTEMA DE STATUS ONLINE ====================
function startOnlineStatusUpdater() {
    // Atualizar status imediatamente
    updateOnlineStatus();
    
    // Atualizar a cada 2 minutos
    setInterval(updateOnlineStatus, 120000);
    
    // Atualizar quando a página fica visível
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            updateOnlineStatus();
        }
    });
    
    console.log('🟢 Sistema de status online iniciado');
}

async function updateOnlineStatus() {
    try {
        if (!window.currentUser) return;

        const { error } = await supabase
            .from('profiles')
            .update({ 
                last_online_at: new Date().toISOString()
            })
            .eq('id', window.currentUser.id);

        if (error) {
            console.error('❌ Erro ao atualizar status online:', error);
        }
        
    } catch (error) {
        console.error('❌ Erro no sistema de status online:', error);
    }
}

// ==================== SISTEMA DE MENU MOBILE ====================
function setupMobileMenu() {
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const mobileMenu = document.getElementById('mobileMenu');
    
    if (!hamburgerBtn || !mobileMenu) {
        console.log('ℹ️ Elementos do menu mobile não encontrados');
        return;
    }

    // Criar overlay se não existir
    let overlay = document.getElementById('mobileMenuOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'mobileMenuOverlay';
        overlay.className = 'mobile-menu-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 999;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s ease;
        `;
        document.body.appendChild(overlay);
    }

    // Abrir menu
    hamburgerBtn.addEventListener('click', openMobileMenu);
    
    // Fechar menu
    overlay.addEventListener('click', closeMobileMenu);
    
    // Fechar com ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && mobileMenu.style.display === 'flex') {
            closeMobileMenu();
        }
    });

    function openMobileMenu() {
        mobileMenu.style.display = 'flex';
        overlay.style.opacity = '1';
        overlay.style.visibility = 'visible';
        document.body.style.overflow = 'hidden';
        
        console.log('📱 Menu mobile aberto');
    }

    function closeMobileMenu() {
        mobileMenu.style.display = 'none';
        overlay.style.opacity = '0';
        overlay.style.visibility = 'hidden';
        document.body.style.overflow = '';
        
        console.log('📱 Menu mobile fechado');
    }
}

// ==================== SERVICE WORKER (PWA) ====================
function setupServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('✅ Service Worker registrado:', registration);
            })
            .catch(error => {
                console.log('❌ Service Worker falhou:', error);
            });
    }
}

// ==================== EVENT LISTENERS GLOBAIS ====================
function setupGlobalEventListeners() {
    // Prevenir comportamento padrão de links vazios
    document.addEventListener('click', function(e) {
        if (e.target.tagName === 'A' && e.target.getAttribute('href') === '#') {
            e.preventDefault();
        }
        
        // Logout global
        if (e.target.id === 'logoutBtn' || e.target.classList.contains('logout-btn')) {
            e.preventDefault();
            logout();
        }
    });

    // Melhorar acessibilidade
    document.addEventListener('keydown', function(e) {
        // Fechar modais com ESC
        if (e.key === 'Escape') {
            const openModal = document.querySelector('.modal[style*="display: flex"]');
            if (openModal) {
                openModal.style.display = 'none';
            }
        }
    });
}

// ==================== FUNÇÕES UTILITÁRIAS ====================
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
}

function calculateAge(birthDate) {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    
    return age;
}

function getTimeAgo(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins}min`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return `${Math.floor(diffDays / 7)}sem`;
}

// ==================== VALIDAÇÕES GLOBAIS ====================
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validatePassword(password) {
    const requirements = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /[0-9]/.test(password),
        special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    };
    
    return {
        isValid: Object.values(requirements).every(Boolean),
        requirements: requirements
    };
}

function checkPasswordStrength(password) {
    const requirements = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /[0-9]/.test(password),
        special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    };
    
    const strength = Object.values(requirements).filter(Boolean).length;
    return { requirements, strength };
}

// ==================== MÁSCARAS DE FORMULÁRIO ====================
function maskCPF(cpf) {
    return cpf.replace(/\D/g, '')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function maskPhone(phone) {
    return phone.replace(/\D/g, '')
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2');
}

function maskCEP(cep) {
    return cep.replace(/\D/g, '')
        .replace(/(\d{5})(\d)/, '$1-$2');
}

// ==================== CARREGAMENTO DE IMAGENS ====================
async function loadUserPhoto(avatarUrl) {
    try {
        if (!avatarUrl) return null;

        const { data } = supabase.storage
            .from('avatars')
            .getPublicUrl(avatarUrl);

        return data?.publicUrl || null;

    } catch (error) {
        console.error('❌ Erro ao carregar foto:', error);
        return null;
    }
}

// ==================== EXPORTAÇÃO DE FUNÇÕES GLOBAIS ====================
// Tornar funções disponíveis globalmente
window.supabase = supabase;
window.currentUser = window.currentUser;
window.checkAuth = checkAuthStatus;
window.logout = logout;
window.showNotification = showNotification;
window.formatDate = formatDate;
window.calculateAge = calculateAge;
window.getTimeAgo = getTimeAgo;
window.loadUserPhoto = loadUserPhoto;
window.maskCPF = maskCPF;
window.maskPhone = maskPhone;
window.maskCEP = maskCEP;
window.validateEmail = validateEmail;
window.validatePassword = validatePassword;
window.checkPasswordStrength = checkPasswordStrength;
window.debounce = debounce;

console.log('✅ Globals.js carregado com sucesso!');
console.log('🎯 Sistema pronto para autenticação e cadastro');