// ==================== CONFIGURAÇÃO SUPABASE ====================
const SUPABASE_URL = 'https://rohsbrkbdlbewonibclf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvaHNicmtiZGxiZXdvbmliY2xmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MTc5MDMsImV4cCI6MjA3NjE5MzkwM30.PUbV15B1wUoU_-dfggCwbsS5U7C1YsoTrtcahEKn_Oc';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==================== VARIÁVEIS GLOBAIS ====================
let currentUser = null;
let userProfile = null;

// ==================== VERIFICAÇÃO DE AUTENTICAÇÃO ====================
async function checkAuth() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
            console.error('Erro de autenticação:', error);
            redirectToLogin();
            return false;
        }
        
        if (!user) {
            console.log('❌ Usuário não autenticado');
            redirectToLogin();
            return false;
        }
        
        currentUser = user;
        console.log('✅ Usuário autenticado:', user.id);
        return true;
        
    } catch (error) {
        console.error('❌ Erro na verificação de auth:', error);
        redirectToLogin();
        return false;
    }
}

// ==================== CARREGAR DADOS DO USUÁRIO ====================
async function loadUserData() {
    try {
        if (!currentUser) return false;

        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();

        if (error) throw error;

        userProfile = profile;
        
        // Atualizar nickname em todos os elementos
        const nickname = getDisplayName();
        updateNicknameElements(nickname);
        
        // Atualizar avatar
        await updateUserAvatar(nickname, profile);
        
        // Atualizar status premium/free
        updatePremiumBadges(profile?.is_premium || false);
        
        return true;
        
    } catch (error) {
        console.error('❌ Erro ao carregar dados do usuário:', error);
        return false;
    }
}

// ==================== FUNÇÕES AUXILIARES ====================
function getDisplayName() {
    if (currentUser.user_metadata?.nickname) {
        return currentUser.user_metadata.nickname;
    } else if (currentUser.user_metadata?.full_name) {
        return currentUser.user_metadata.full_name;
    } else if (currentUser.email) {
        return currentUser.email.split('@')[0];
    }
    return 'Usuário';
}

function updateNicknameElements(nickname) {
    const elements = [
        document.getElementById('userNickname'),
        document.getElementById('mobileUserNickname'),
        document.getElementById('welcomeNickname')
    ];
    
    elements.forEach(element => {
        if (element) element.textContent = nickname;
    });
}

async function updateUserAvatar(displayName, profile) {
    const avatarElements = [
        document.getElementById('userAvatar'),
        document.getElementById('mobileUserAvatar')
    ];

    for (const avatarElement of avatarElements) {
        if (!avatarElement) continue;
        
        const fallback = avatarElement.querySelector('.user-avatar-fallback');
        const img = avatarElement.querySelector('.user-avatar-img');
        
        if (!fallback || !img) continue;

        // Reset
        img.style.display = 'none';
        fallback.style.display = 'flex';
        
        // Tentar carregar foto se existir
        if (profile?.avatar_url) {
            const photoUrl = await loadUserPhoto(profile.avatar_url);
            if (photoUrl) {
                img.src = photoUrl;
                img.style.display = 'block';
                fallback.style.display = 'none';
            }
        }
        
        // Atualizar fallback
        fallback.textContent = displayName.charAt(0).toUpperCase();
    }
}

async function loadUserPhoto(avatarUrl) {
    try {
        if (!avatarUrl) return null;
        const { data } = supabase.storage.from('avatars').getPublicUrl(avatarUrl);
        return data?.publicUrl || null;
    } catch (error) {
        console.warn('⚠️ Erro ao carregar foto:', error);
        return null;
    }
}

function updatePremiumBadges(isPremium) {
    const elements = {
        freeBadge: document.getElementById('freeBadge'),
        premiumBtn: document.getElementById('premiumBtn'),
        mobileFreeBadge: document.getElementById('mobileFreeBadge'),
        mobilePremiumBtn: document.getElementById('mobilePremiumBtn')
    };
    
    if (isPremium) {
        if (elements.premiumBtn) elements.premiumBtn.style.display = 'inline-block';
        if (elements.freeBadge) elements.freeBadge.style.display = 'none';
        if (elements.mobilePremiumBtn) elements.mobilePremiumBtn.style.display = 'flex';
        if (elements.mobileFreeBadge) elements.mobileFreeBadge.style.display = 'none';
    } else {
        if (elements.freeBadge) elements.freeBadge.style.display = 'inline-block';
        if (elements.premiumBtn) elements.premiumBtn.style.display = 'none';
        if (elements.mobileFreeBadge) elements.mobileFreeBadge.style.display = 'flex';
        if (elements.mobilePremiumBtn) elements.mobilePremiumBtn.style.display = 'none';
    }
}

// ==================== LOGOUT ====================
async function logout() {
    try {
        await supabase.auth.signOut();
        redirectToLogin();
    } catch (error) {
        console.error('❌ Erro ao fazer logout:', error);
        showToast('Erro ao sair. Tente novamente.', 'error');
    }
}

// ==================== REDIRECTS ====================
function redirectToLogin() {
    window.location.href = 'login.html';
}

function redirectToHome() {
    window.location.href = 'home.html';
}

// ==================== TOAST SYSTEM ====================
function showToast(message, type = 'success') {
    // Remover toasts existentes
    document.querySelectorAll('.global-toast').forEach(toast => toast.remove());
    
    const toast = document.createElement('div');
    toast.className = `global-toast ${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed; 
        bottom: 20px; 
        left: 50%; 
        transform: translateX(-50%);
        background: ${type === 'error' ? '#ef4444' : '#22c55e'}; 
        color: white; 
        padding: 12px 24px; 
        border-radius: 25px;
        font-size: 14px; 
        font-weight: 600; 
        z-index: 10000; 
        opacity: 0;
        transition: opacity 0.3s ease; 
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        text-align: center; 
        min-width: 200px; 
        max-width: 90%;
    `;
    
    document.body.appendChild(toast);
    
    // Animação de entrada
    setTimeout(() => toast.style.opacity = '1', 100);
    
    // Auto-remover após 3 segundos
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ==================== EXPORTAR FUNÇÕES GLOBAIS ====================
window.supabase = supabase;
window.currentUser = currentUser;
window.userProfile = userProfile;
window.checkAuth = checkAuth;
window.loadUserData = loadUserData;
window.logout = logout;
window.showToast = showToast;