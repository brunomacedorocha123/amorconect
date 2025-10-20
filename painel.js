// ==================== CONFIGURAÇÃO SUPABASE ====================
const SUPABASE_URL = 'https://rohsbrkbdlbewonibclf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvaHNicmtibGRsYmV3b25pYmNsZiIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzYwNjE3OTAzLCJleHAiOjIwNzYxOTM5MDN9.PUbV15B1wUoU_-dfggCwbsS5U7C1YsoTrtcahEKn_Oc';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==================== VARIÁVEIS GLOBAIS ====================
let currentUser = null;
let userProfile = null;
let selectedAvatarFile = null;

// ==================== INICIALIZAÇÃO ====================
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Inicializando Painel PulseLove...');
    
    try {
        // 1. Verificar autenticação
        const isAuthenticated = await checkAuth();
        if (!isAuthenticated) return;
        
        // 2. Carregar dados do usuário
        await loadUserData();
        
        // 3. Configurar sistemas
        setupEventListeners();
        
        // 4. Carregar dados do perfil
        await loadProfileData();
        
        // 5. Iniciar sistemas
        await updatePremiumStatus();
        await updateProfileCompletion();
        await updatePlanStatus();
        await loadInvisibleModeStatus();
        
        // 6. Iniciar galeria se for premium
        if (window.galeriaSystem) {
            await window.galeriaSystem.initialize();
        }
        
        // 7. Sistema online
        startOnlineStatusUpdater();
        
        console.log('✅ Painel inicializado com sucesso!');
        
    } catch (error) {
        console.error('❌ Erro crítico na inicialização:', error);
        showNotification('Erro ao carregar o painel', 'error');
    }
});

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

// ==================== CONFIGURAÇÃO DE EVENT LISTENERS ====================
function setupEventListeners() {
    console.log('⚙️ Configurando event listeners...');
    
    // Menu mobile
    setupMobileMenu();
    
    // Máscaras de formulário
    setupFormMasks();
    
    // Character count
    setupCharacterCount();
    
    // Logout buttons
    setupLogoutButtons();
    
    console.log('✅ Event listeners configurados');
}

function setupMobileMenu() {
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const closeMobileMenu = document.getElementById('closeMobileMenu');
    const mobileMenu = document.getElementById('mobileMenu');

    if (hamburgerBtn && mobileMenu) {
        hamburgerBtn.addEventListener('click', function() {
            mobileMenu.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        });

        closeMobileMenu.addEventListener('click', function() {
            mobileMenu.style.display = 'none';
            document.body.style.overflow = 'auto';
        });

        // Fechar ao clicar em links
        document.querySelectorAll('.mobile-nav a, .mobile-nav button').forEach(item => {
            item.addEventListener('click', () => {
                mobileMenu.style.display = 'none';
                document.body.style.overflow = 'auto';
            });
        });

        // Fechar com ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && mobileMenu.style.display === 'flex') {
                mobileMenu.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
        });
    }
}

function setupFormMasks() {
    const cpfInput = document.getElementById('cpf');
    const phoneInput = document.getElementById('phone');
    const zipCodeInput = document.getElementById('zipCode');

    if (cpfInput) {
        cpfInput.addEventListener('input', maskCPF);
    }
    if (phoneInput) {
        phoneInput.addEventListener('input', maskPhone);
    }
    if (zipCodeInput) {
        zipCodeInput.addEventListener('input', maskCEP);
    }
}

function setupCharacterCount() {
    const description = document.getElementById('description');
    if (description) {
        description.addEventListener('input', updateCharCount);
    }
}

function setupLogoutButtons() {
    const logoutBtn = document.getElementById('logoutBtn');
    const mobileLogoutBtn = document.getElementById('mobileLogoutBtn');

    if (logoutBtn) logoutBtn.addEventListener('click', logout);
    if (mobileLogoutBtn) mobileLogoutBtn.addEventListener('click', logout);
}

// ==================== MÁSCARAS DE FORMULÁRIO ====================
function maskCPF(e) {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length <= 11) {
        value = value.replace(/(\d{3})(\d)/, '$1.$2');
        value = value.replace(/(\d{3})(\d)/, '$1.$2');
        value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }
    e.target.value = value;
}

function maskPhone(e) {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length <= 11) {
        value = value.replace(/(\d{2})(\d)/, '($1) $2');
        value = value.replace(/(\d{5})(\d)/, '$1-$2');
    }
    e.target.value = value;
}

function maskCEP(e) {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length <= 8) {
        value = value.replace(/(\d{5})(\d)/, '$1-$2');
    }
    e.target.value = value;
}

// ==================== SISTEMA DE NOTIFICAÇÕES ====================
function showNotification(message, type = 'info') {
    // Remover notificação existente
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    // Criar nova notificação
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
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

    document.body.appendChild(notification);

    // Auto-remover após 5 segundos
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// ==================== CARREGAR DADOS DO USUÁRIO ====================
async function loadUserData() {
    try {
        console.log('👤 Carregando dados do usuário...');
        
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('nickname, avatar_url, is_premium')
            .eq('id', currentUser.id)
            .single();
        
        if (error && error.code === 'PGRST116') {
            console.log('🆕 Criando perfil novo...');
            await createUserProfile();
            return;
        }
        
        if (profile) {
            userProfile = profile;
            const displayName = profile.nickname || currentUser.email.split('@')[0];
            
            // Atualizar elementos da interface
            updateUserInterface(displayName, profile);
            
            console.log('✅ Dados do usuário carregados');
        }
        
    } catch (error) {
        console.error('❌ Erro ao carregar dados do usuário:', error);
        showNotification('Erro ao carregar dados do perfil', 'error');
    }
}

function updateUserInterface(displayName, profile) {
    // Atualizar nicknames
    const userNickname = document.getElementById('userNickname');
    const mobileUserNickname = document.getElementById('mobileUserNickname');
    const welcomeNickname = document.getElementById('welcomeNickname');
    
    if (userNickname) userNickname.textContent = displayName;
    if (mobileUserNickname) mobileUserNickname.textContent = displayName;
    if (welcomeNickname) welcomeNickname.textContent = displayName;
    
    // Atualizar avatar
    updateAvatar(profile.avatar_url, displayName);
    
    // Atualizar badges premium
    updatePremiumBadges(profile.is_premium);
}

async function updateAvatar(avatarUrl, displayName) {
    const avatarElements = [
        document.getElementById('userAvatar'),
        document.getElementById('mobileUserAvatar'),
        document.getElementById('avatarPreview')
    ];

    for (const avatarElement of avatarElements) {
        if (!avatarElement) continue;
        
        const fallback = avatarElement.querySelector('.user-avatar-fallback, .avatar-fallback');
        const img = avatarElement.querySelector('.user-avatar-img, #avatarPreviewImg');
        
        if (!fallback || !img) continue;

        // Reset
        img.style.display = 'none';
        fallback.style.display = 'flex';
        
        // Tentar carregar foto se existir
        if (avatarUrl) {
            const photoUrl = await loadUserPhoto(avatarUrl);
            if (photoUrl) {
                img.src = photoUrl;
                img.style.display = 'block';
                fallback.style.display = 'none';
                
                // Configurar fallback em caso de erro
                img.onerror = () => {
                    img.style.display = 'none';
                    fallback.style.display = 'flex';
                };
            }
        }
        
        // Atualizar fallback
        if (fallback.classList.contains('user-avatar-fallback')) {
            fallback.textContent = displayName.charAt(0).toUpperCase();
        } else {
            fallback.textContent = displayName.charAt(0).toUpperCase();
        }
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
    if (isPremium) {
        // Adicionar badge premium se não existir
        const userInfo = document.querySelector('.user-info');
        if (userInfo && !userInfo.querySelector('.premium-badge')) {
            const badge = document.createElement('span');
            badge.className = 'premium-badge';
            badge.textContent = '⭐ PREMIUM';
            badge.style.cssText = `
                background: var(--secondary);
                color: var(--primary);
                padding: 2px 8px;
                border-radius: 10px;
                font-size: 0.7rem;
                margin-left: 8px;
                font-weight: bold;
            `;
            userInfo.appendChild(badge);
        }
    }
}

// ==================== CRIAÇÃO DE PERFIL ====================
async function createUserProfile() {
    try {
        const { error: profileError } = await supabase
            .from('profiles')
            .insert({
                id: currentUser.id,
                nickname: currentUser.email.split('@')[0],
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });

        if (profileError) throw profileError;

        const { error: detailsError } = await supabase
            .from('user_details')
            .insert({
                user_id: currentUser.id,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });

        if (detailsError) throw detailsError;
        
        console.log('✅ Perfil criado com sucesso!');
        await loadUserData();
        
    } catch (error) {
        console.error('❌ Erro ao criar perfil:', error);
        showNotification('Erro ao criar perfil.', 'error');
    }
}

// ==================== CARREGAR DADOS DO PERFIL ====================
async function loadProfileData() {
    try {
        console.log('📋 Carregando dados do perfil...');
        
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();

        if (profileError && profileError.code === 'PGRST116') {
            await createUserProfile();
            return;
        }

        const { data: userDetails, error: detailsError } = await supabase
            .from('user_details')
            .select('*')
            .eq('user_id', currentUser.id)
            .single();

        if (detailsError && detailsError.code === 'PGRST116') {
            await supabase
                .from('user_details')
                .insert({
                    user_id: currentUser.id,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });
            return;
        }

        // ✅ CORREÇÃO CRÍTICA: Pré-preenher email e data de nascimento BLOQUEADOS
        const emailInput = document.getElementById('email');
        const birthDateInput = document.getElementById('birthDate');
        
        if (emailInput) {
            emailInput.value = currentUser.email || '';
        }
        
        if (birthDateInput && profile?.birth_date) {
            // Formatar data para o input type="date" (YYYY-MM-DD)
            const birthDate = new Date(profile.birth_date);
            const formattedDate = birthDate.toISOString().split('T')[0];
            birthDateInput.value = formattedDate;
            
            // Aplicar readonly e estilo igual ao e-mail
            birthDateInput.readOnly = true;
            birthDateInput.style.backgroundColor = '#f5f5f5';
            birthDateInput.style.color = '#666';
        }

        // Preencher outros campos (editáveis)
        if (profile) {
            const fields = {
                'fullName': profile.full_name,
                'cpf': profile.cpf,
                'phone': profile.phone,
                'street': profile.street,
                'number': profile.number,
                'neighborhood': profile.neighborhood,
                'city': profile.city,
                'state': profile.state,
                'zipCode': profile.zip_code,
                'nickname': profile.nickname
            };

            for (const [fieldId, value] of Object.entries(fields)) {
                const element = document.getElementById(fieldId);
                if (element) element.value = value || '';
            }
            
            if (profile.city && profile.state && (!userDetails || !userDetails.display_city)) {
                const displayCity = document.getElementById('displayCity');
                if (displayCity) displayCity.value = `${profile.city}, ${profile.state}`;
            }
        }

        if (userDetails) {
            const detailFields = {
                'displayCity': userDetails.display_city,
                'gender': userDetails.gender,
                'sexualOrientation': userDetails.sexual_orientation,
                'profession': userDetails.profession,
                'education': userDetails.education,
                'zodiac': userDetails.zodiac,
                'lookingFor': userDetails.looking_for,
                'description': userDetails.description,
                'religion': userDetails.religion,
                'drinking': userDetails.drinking,
                'smoking': userDetails.smoking,
                'exercise': userDetails.exercise,
                'exerciseDetails': userDetails.exercise_details,
                'hasPets': userDetails.has_pets,
                'petsDetails': userDetails.pets_details
            };

            for (const [fieldId, value] of Object.entries(detailFields)) {
                const element = document.getElementById(fieldId);
                if (element) element.value = value || '';
            }
            
            // Preencir interesses
            if (userDetails.interests) {
                document.querySelectorAll('input[name="interests"]').forEach(checkbox => {
                    checkbox.checked = userDetails.interests.includes(checkbox.value);
                });
            }
            
            // ✅ NOVO: Preencher características pessoais
            if (userDetails.personal_traits) {
                document.querySelectorAll('input[name="caracteristicas"]').forEach(checkbox => {
                    checkbox.checked = userDetails.personal_traits.includes(checkbox.value);
                });
            }
        }

        updateCharCount();
        console.log('✅ Dados do perfil carregados');

    } catch (error) {
        console.error('❌ Erro ao carregar perfil:', error);
        showNotification('Erro ao carregar dados do perfil', 'error');
    }
}

// ==================== ATUALIZAR PROGRESSO DO PERFIL ====================
async function updateProfileCompletion() {
    try {
        const { data: completion, error } = await supabase
            .rpc('calculate_profile_completion', { user_uuid: currentUser.id });
        
        if (error) {
            console.error('❌ Erro ao calcular completude:', error);
            return;
        }

        const percentage = completion || 0;
        const progressFill = document.getElementById('progressFill');
        const completionPercentage = document.getElementById('completionPercentage');
        const progressText = document.getElementById('progressText');

        if (progressFill) progressFill.style.width = `${percentage}%`;
        if (completionPercentage) completionPercentage.textContent = `${percentage}%`;
        
        if (progressText) {
            if (percentage < 30) {
                progressText.textContent = 'Complete seu perfil para melhorar suas conexões';
            } else if (percentage < 70) {
                progressText.textContent = 'Seu perfil está ficando interessante! Continue...';
            } else if (percentage < 100) {
                progressText.textContent = 'Quase lá! Complete os últimos detalhes';
            } else {
                progressText.textContent = '🎉 Perfil 100% completo!';
            }
        }

        console.log(`📊 Progresso do perfil: ${percentage}%`);
    } catch (error) {
        console.error('❌ Erro ao atualizar progresso:', error);
    }
}

// ==================== CONTADOR DE CARACTERES ====================
function updateCharCount() {
    const textarea = document.getElementById('description');
    const charCount = document.getElementById('charCount');
    
    if (textarea && charCount) {
        const count = textarea.value.length;
        const maxLength = 100;
        
        charCount.textContent = `${count}/${maxLength}`;
        
        // Cores baseadas na quantidade
        if (count === 0) {
            charCount.style.color = 'var(--text-light)';
        } else if (count < 50) {
            charCount.style.color = '#48bb78';
        } else if (count < 80) {
            charCount.style.color = '#ed8936';
        } else if (count < 100) {
            charCount.style.color = '#f56565';
        } else {
            charCount.style.color = '#e53e3e';
        }
        
        // Limitar caracteres se exceder
        if (count > maxLength) {
            textarea.value = textarea.value.substring(0, maxLength);
            updateCharCount();
            showNotification(`⚠️ Limite de ${maxLength} caracteres atingido!`, 'warning');
        }
    }
}

// ==================== SISTEMA ONLINE ====================
function startOnlineStatusUpdater() {
    updateOnlineStatus();
    setInterval(updateOnlineStatus, 120000);
    
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            updateOnlineStatus();
        }
    });
    
    ['click', 'mousemove', 'keypress'].forEach(event => {
        document.addEventListener(event, debounce(updateOnlineStatus, 30000), { passive: true });
    });
}

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

async function updateOnlineStatus() {
    try {
        if (!currentUser) return;

        const { error } = await supabase
            .from('profiles')
            .update({ 
                last_online_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', currentUser.id);

        if (error) {
            console.error('❌ Erro ao atualizar status online:', error);
        }
        
    } catch (error) {
        console.error('❌ Erro no sistema de status online:', error);
    }
}

// ==================== LOGOUT ====================
async function logout() {
    try {
        const confirmLogout = confirm('Tem certeza que deseja sair?');
        if (!confirmLogout) return;
        
        showNotification('👋 Saindo...', 'info');
        
        // Atualizar último online antes de sair
        await supabase
            .from('profiles')
            .update({ 
                last_online_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', currentUser.id);
        
        await supabase.auth.signOut();
        
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1000);
        
    } catch (error) {
        console.error('❌ Erro ao fazer logout:', error);
        showNotification('❌ Erro ao sair', 'error');
    }
}

// ==================== REDIRECTS ====================
function redirectToLogin() {
    window.location.href = 'login.html';
}

// ==================== EXPORTAÇÕES GLOBAIS ====================
window.supabase = supabase;
window.currentUser = currentUser;
window.userProfile = userProfile;
window.showNotification = showNotification;
window.logout = logout;

console.log('✅ painel.js (CORE) carregado e pronto!');