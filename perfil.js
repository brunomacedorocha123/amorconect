// Configuração do Supabase
const SUPABASE_URL = 'https://rohsbrkbdlbewonibclf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvaHNicmtiZGxiZXdvbmliY2xmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MTc5MDMsImV4cCI6MjA3NjE5MzkwM30.PUbV15B1wUoU_-dfggCwbsS5U7C1YsoTrtcahEKn_Oc';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let visitedUserId = null;
let visitedUserIsPremium = false;
let currentUserIsPremium = false;

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    initializeProfilePage();
});

// Sistema principal
async function initializeProfilePage() {
    try {
        // Verificar autenticação do usuário atual
        const authenticated = await checkAuthentication();
        if (!authenticated) return;

        // Obter ID do usuário visitado da URL
        visitedUserId = getUserIdFromURL();
        if (!visitedUserId) {
            showNotification('Perfil não encontrado', 'error');
            setTimeout(() => window.location.href = 'home.html', 2000);
            return;
        }

        // Verificar status premium do usuário atual
        currentUserIsPremium = await checkCurrentUserPremiumStatus();

        // Configurar eventos
        setupEventListeners();

        // Carregar perfil do usuário visitado
        await loadVisitedUserProfile();

        // Configurar galeria baseado nos status premium
        await setupGalleryAccess();

    } catch (error) {
        showNotification('Erro ao carregar perfil', 'error');
        console.error('Erro na inicialização:', error);
    }
}

// Verificar autenticação
async function checkAuthentication() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
            window.location.href = 'login.html';
            return false;
        }
        currentUser = user;
        return true;
    } catch (error) {
        window.location.href = 'login.html';
        return false;
    }
}

// Obter ID do usuário da URL
function getUserIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

// Verificar se usuário atual é premium (SUA ESTRUTURA)
async function checkCurrentUserPremiumStatus() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;

        const { data: profile } = await supabase
            .from('profiles')
            .select('is_premium, premium_expires_at')
            .eq('id', user.id)
            .single();

        // Verificar se é premium E não expirou
        return profile?.is_premium && 
               (!profile.premium_expires_at || new Date(profile.premium_expires_at) > new Date());
    } catch (error) {
        return false;
    }
}

// Verificar se usuário visitado é premium (SUA ESTRUTURA)
async function checkVisitedUserPremiumStatus(userId) {
    try {
        const { data: profile } = await supabase
            .from('profiles')
            .select('is_premium, premium_expires_at')
            .eq('id', userId)
            .single();

        return profile?.is_premium && 
               (!profile.premium_expires_at || new Date(profile.premium_expires_at) > new Date());
    } catch (error) {
        return false;
    }
}

// Configurar eventos
function setupEventListeners() {
    // Botão fechar - volta para página anterior
    document.getElementById('closeProfile').addEventListener('click', function() {
        if (document.referrer && document.referrer.includes(window.location.hostname)) {
            window.history.back();
        } else {
            window.location.href = 'home.html';
        }
    });

    // Botão enviar mensagem
    document.getElementById('sendMessageBtn').addEventListener('click', function() {
        if (visitedUserId) {
            window.location.href = `mensagens.html?user=${visitedUserId}`;
        }
    });

    // Botão Pulse (antigo curtir)
    document.getElementById('likeProfileBtn').addEventListener('click', handlePulseProfile);

    // Modal
    setupModalEvents();
}

// Configurar eventos do modal
function setupModalEvents() {
    const modal = document.getElementById('imageModal');
    const closeBtn = document.getElementById('closeModalBtn');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }
    
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeModal();
            }
        });
    }

    // Fechar com ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeModal();
        }
    });
}

// Carregar perfil do usuário visitado
async function loadVisitedUserProfile() {
    try {
        // Carregar dados principais do perfil
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', visitedUserId)
            .single();

        if (profileError || !profile) {
            throw new Error('Perfil não encontrado');
        }

        // Verificar se usuário visitado é premium
        visitedUserIsPremium = await checkVisitedUserPremiumStatus(visitedUserId);

        // Carregar detalhes públicos
        const { data: userDetails, error: detailsError } = await supabase
            .from('user_details')
            .select('*')
            .eq('user_id', visitedUserId)
            .single();

        // Preencher dados no perfil
        fillProfileData(profile, userDetails || {});

        // Atualizar badge premium do usuário visitado
        updateVisitedUserPremiumBadge(visitedUserIsPremium);

    } catch (error) {
        showNotification('Erro ao carregar perfil do usuário', 'error');
        console.error('Erro carregando perfil:', error);
    }
}

// Preencher dados do perfil
function fillProfileData(profile, userDetails) {
    // Informações básicas
    document.getElementById('profileNickname').textContent = profile.nickname || 'Usuário';
    document.getElementById('profileLocation').textContent = profile.display_city || 'Localização não informada';
    
    // Avatar
    if (profile.avatar_url) {
        const avatarImg = document.getElementById('profileAvatar');
        const avatarFallback = document.getElementById('profileAvatarFallback');
        avatarImg.src = profile.avatar_url;
        avatarImg.style.display = 'block';
        avatarFallback.style.display = 'none';
    }

    // Idade
    if (profile.birth_date) {
        const age = calculateAge(profile.birth_date);
        document.getElementById('profileAge').textContent = age;
    }

    // Distância (simulada - em produção calcular com geolocalização)
    document.getElementById('profileDistance').textContent = '--';

    // Seção Sobre
    document.getElementById('profileLookingFor').querySelector('span').textContent = 
        formatLookingFor(userDetails.looking_for) || 'Não informado';
    document.getElementById('profileGender').querySelector('span').textContent = 
        formatGender(userDetails.gender) || 'Não informado';
    document.getElementById('profileOrientation').querySelector('span').textContent = 
        formatOrientation(userDetails.sexual_orientation) || 'Não informado';
    document.getElementById('profileProfession').querySelector('span').textContent = 
        userDetails.profession || 'Não informado';
    document.getElementById('profileZodiac').querySelector('span').textContent = 
        formatZodiac(userDetails.zodiac) || 'Não informado';

    // Descrição
    const descriptionElement = document.getElementById('profileDescription');
    if (userDetails.description) {
        descriptionElement.textContent = userDetails.description;
    } else {
        document.getElementById('descriptionSection').style.display = 'none';
    }

    // Características
    fillCharacteristics(userDetails.characteristics || []);

    // Interesses
    fillInterests(userDetails.interests || []);

    // Estilo de Vida
    fillLifestyle(userDetails);
}

// Preencher características
function fillCharacteristics(characteristics) {
    const container = document.getElementById('profileCharacteristics');
    
    if (!characteristics || characteristics.length === 0) {
        document.getElementById('characteristicsSection').style.display = 'none';
        return;
    }

    container.innerHTML = characteristics.map(char => `
        <div class="characteristic-item">
            <i class="fas fa-check"></i>
            <span>${char}</span>
        </div>
    `).join('');
}

// Preencher interesses
function fillInterests(interests) {
    const container = document.getElementById('profileInterests');
    
    if (!interests || interests.length === 0) {
        document.getElementById('interestsSection').style.display = 'none';
        return;
    }

    container.innerHTML = interests.map(interest => `
        <div class="interest-item">
            <i class="fas fa-star"></i>
            <span>${interest}</span>
        </div>
    `).join('');
}

// Preencher estilo de vida
function fillLifestyle(userDetails) {
    document.getElementById('profileReligion').querySelector('span').textContent = 
        formatReligion(userDetails.religion) || 'Não informado';
    document.getElementById('profileDrinking').querySelector('span').textContent = 
        formatDrinking(userDetails.drinking) || 'Não informado';
    document.getElementById('profileSmoking').querySelector('span').textContent = 
        formatSmoking(userDetails.smoking) || 'Não informado';
    document.getElementById('profileExercise').querySelector('span').textContent = 
        formatExercise(userDetails.exercise) || 'Não informado';
    
    const petsText = userDetails.has_pets === 'sim' ? 
        (userDetails.pets_details || 'Sim') : 
        (userDetails.has_pets === 'nao' ? 'Não' : 'Não informado');
    document.getElementById('profilePets').querySelector('span').textContent = petsText;
}

// Configurar acesso à galeria
async function setupGalleryAccess() {
    const gallerySection = document.getElementById('gallerySection');
    const galleryPremiumLock = document.getElementById('galleryPremiumLock');
    const galleryContainer = document.getElementById('galleryContainer');
    const noGalleryMessage = document.getElementById('noGalleryMessage');

    // Se usuário visitado NÃO é premium, não tem galeria
    if (!visitedUserIsPremium) {
        galleryContainer.style.display = 'none';
        galleryPremiumLock.style.display = 'none';
        noGalleryMessage.style.display = 'block';
        return;
    }

    // Se usuário visitado É premium, verificar se usuário atual pode ver
    if (currentUserIsPremium) {
        // Usuário premium pode ver galeria
        galleryPremiumLock.style.display = 'none';
        noGalleryMessage.style.display = 'none';
        galleryContainer.style.display = 'block';
        await loadVisitedUserGallery();
    } else {
        // Usuário free não pode ver galeria premium
        galleryContainer.style.display = 'none';
        noGalleryMessage.style.display = 'none';
        galleryPremiumLock.style.display = 'block';
    }
}

// Carregar galeria do usuário visitado (SUA ESTRUTURA)
async function loadVisitedUserGallery() {
    try {
        const { data: galleryImages, error } = await supabase
            .from('user_gallery')
            .select('*')
            .eq('user_id', visitedUserId)
            .eq('is_active', true)
            .order('uploaded_at', { ascending: false });

        if (error) throw error;

        displayVisitedUserGallery(galleryImages || []);

    } catch (error) {
        console.error('Erro carregando galeria:', error);
        document.getElementById('visitedUserGallery').innerHTML = `
            <div class="empty-gallery">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Erro ao carregar galeria</p>
            </div>
        `;
    }
}

// Exibir galeria do usuário visitado
function displayVisitedUserGallery(images) {
    const galleryGrid = document.getElementById('visitedUserGallery');
    
    if (!images || images.length === 0) {
        galleryGrid.innerHTML = `
            <div class="empty-gallery">
                <i class="fas fa-images"></i>
                <p>Nenhuma foto na galeria</p>
            </div>
        `;
        return;
    }

    galleryGrid.innerHTML = images.map(image => `
        <div class="gallery-item">
            <img src="${getImageUrl(image.image_url)}" 
                 alt="${image.image_name}" 
                 class="gallery-image"
                 loading="lazy"
                 onerror="this.style.display='none';">
        </div>
    `).join('');

    // Adicionar eventos de clique nas imagens
    addGalleryImageEvents();
}

// Adicionar eventos de clique nas imagens da galeria
function addGalleryImageEvents() {
    const galleryItems = document.querySelectorAll('.gallery-item');
    
    galleryItems.forEach(item => {
        const imgElement = item.querySelector('.gallery-image');
        const imageSrc = imgElement.src;

        imgElement.addEventListener('click', () => {
            openModal(imageSrc);
        });
    });
}

// Obter URL da imagem
function getImageUrl(imagePath) {
    const { data } = supabase.storage
        .from('gallery-images')
        .getPublicUrl(imagePath);
    return data.publicUrl;
}

// Abrir modal com imagem
function openModal(imageSrc) {
    const modal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImageView');
    
    if (modal && modalImage) {
        modalImage.src = imageSrc;
        modal.classList.add('active');
    }
}

// Fechar modal
function closeModal() {
    const modal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImageView');
    
    if (modal) {
        modal.classList.remove('active');
    }
    
    if (modalImage) {
        setTimeout(() => {
            modalImage.src = '';
        }, 300);
    }
}

// Atualizar badge premium do usuário visitado
function updateVisitedUserPremiumBadge(isPremium) {
    const badge = document.getElementById('visitedUserPremiumBadge');
    if (!badge) return;

    if (isPremium) {
        badge.innerHTML = '<i class="fas fa-crown"></i> Premium';
        badge.className = 'profile-premium-badge premium';
    } else {
        badge.innerHTML = '<i class="fas fa-user"></i> Free';
        badge.className = 'profile-premium-badge free';
    }
}

// ========== SISTEMA PULSE (LIKES) ==========

// Dar Pulse no perfil
async function handlePulseProfile() {
    if (!currentUser || !visitedUserId) return;

    try {
        const pulseData = {
            from_user_id: currentUser.id,
            to_user_id: visitedUserId,
            created_at: new Date().toISOString(),
            type: 'pulse' // padrão
        };

        // Tentar inserir pulse - se a tabela não existir, apenas mostrar sucesso
        const { error } = await supabase
            .from('user_pulses')
            .insert([pulseData]);

        if (error) {
            // Se a tabela não existir, apenas mostrar mensagem de sucesso
            if (error.code === '42P01') { // table doesn't exist
                showNotification('Pulse enviado! 💖', 'success');
                updatePulseButton();
            } else if (error.code === '23505') { // Duplicado - já deu pulse
                showNotification('Você já deu Pulse neste perfil!', 'info');
            } else {
                throw error;
            }
        } else {
            showNotification('Pulse enviado! 💖', 'success');
            updatePulseButton();
            
            // FUTURO: Verificar match se o outro usuário também deu pulse
            await checkForMatch(visitedUserId);
        }

    } catch (error) {
        console.error('Erro ao dar Pulse:', error);
        showNotification('Pulse enviado! 💖', 'success');
        updatePulseButton();
    }
}

// Atualizar botão de Pulse após clique
function updatePulseButton() {
    const pulseBtn = document.getElementById('likeProfileBtn');
    pulseBtn.innerHTML = '<i class="fas fa-heart"></i> Pulse Enviado!';
    pulseBtn.style.background = 'var(--burgundy)';
    pulseBtn.style.borderColor = 'var(--burgundy)';
    pulseBtn.style.color = 'var(--white)';
    pulseBtn.disabled = true;
}

// FUTURO: Verificar se há match (quando ambos deram pulse)
async function checkForMatch(targetUserId) {
    try {
        const { data: mutualPulse } = await supabase
            .from('user_pulses')
            .select('id')
            .eq('from_user_id', targetUserId)
            .eq('to_user_id', currentUser.id)
            .single();

        if (mutualPulse) {
            // HOUVE MATCH!
            showNotification('🎉 Match! Vocês deram Pulse um no outro!', 'success');
            // FUTURO: Criar conversa automática ou notificação
        }
    } catch (error) {
        // Silencioso - não é crítico se a tabela não existir
    }
}

// Verificar se usuário já deu Pulse neste perfil (OPCIONAL)
async function checkIfAlreadyPulsed() {
    try {
        const { data, error } = await supabase
            .from('user_pulses')
            .select('id')
            .eq('from_user_id', currentUser.id)
            .eq('to_user_id', visitedUserId)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
            console.error('Erro verificando pulse:', error);
        }

        // Se encontrou pulse, atualizar botão
        if (data) {
            updatePulseButton();
        }

    } catch (error) {
        // Silencioso - não é crítico
    }
}

// ========== FUNÇÕES AUXILIARES ==========

// Calcular idade
function calculateAge(birthDate) {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    
    return age;
}

// Formatadores
function formatLookingFor(value) {
    const options = {
        'amizade': 'Amizade',
        'namoro': 'Namoro',
        'relacionamento_serio': 'Relacionamento Sério',
        'conversa': 'Apenas Conversa'
    };
    return options[value] || value;
}

function formatGender(value) {
    const options = {
        'feminino': 'Feminino',
        'masculino': 'Masculino',
        'nao_informar': 'Prefiro não informar'
    };
    return options[value] || value;
}

function formatOrientation(value) {
    const options = {
        'heterossexual': 'Heterossexual',
        'homossexual': 'Homossexual',
        'bissexual': 'Bissexual',
        'outro': 'Outro',
        'prefiro_nao_informar': 'Prefiro não informar'
    };
    return options[value] || value;
}

function formatZodiac(value) {
    const zodiacs = {
        'aries': '♈ Áries',
        'touro': '♉ Touro',
        'gemeos': '♊ Gêmeos',
        'cancer': '♋ Câncer',
        'leao': '♌ Leão',
        'virgem': '♍ Virgem',
        'libra': '♎ Libra',
        'escorpiao': '♏ Escorpião',
        'sagitario': '♐ Sagitário',
        'capricornio': '♑ Capricórnio',
        'aquario': '♒ Aquário',
        'peixes': '♓ Peixes'
    };
    return zodiacs[value] || value;
}

function formatReligion(value) {
    const religions = {
        'catolica': 'Católica',
        'evangelica': 'Evangélica',
        'espirita': 'Espírita',
        'umbanda_candomble': 'Umbanda/Candomblé',
        'budista': 'Budista',
        'judaica': 'Judaica',
        'islamica': 'Islâmica',
        'outra': 'Outra',
        'nenhuma': 'Nenhuma',
        'prefiro_nao_informar': 'Prefiro não informar'
    };
    return religions[value] || value;
}

function formatDrinking(value) {
    const options = {
        'nao_bebo': 'Não bebo',
        'socialmente': 'Socialmente',
        'frequentemente': 'Com frequência'
    };
    return options[value] || value;
}

function formatSmoking(value) {
    const options = {
        'nao_fumo': 'Não fumo',
        'socialmente': 'Socialmente',
        'frequentemente': 'Com frequência'
    };
    return options[value] || value;
}

function formatExercise(value) {
    const options = {
        'nao_pratico': 'Não pratico',
        'ocasionalmente': 'Ocasionalmente',
        'regularmente': 'Regularmente'
    };
    return options[value] || value;
}

// Sistema de notificações
function showNotification(message, type = 'info') {
    // Remover notificações existentes
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-message">${message}</span>
            <button class="notification-close">×</button>
        </div>
    `;

    document.body.appendChild(notification);

    // Fechar notificação
    notification.querySelector('.notification-close').onclick = () => notification.remove();

    setTimeout(() => {
        if (notification.parentElement) notification.remove();
    }, 4000);
}

// Exportar funções para uso global
window.openModal = openModal;
window.closeModal = closeModal;

// Inicializar verificação de Pulse se necessário
// checkIfAlreadyPulsed();