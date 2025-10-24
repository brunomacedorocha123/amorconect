// Configuração do Supabase
const SUPABASE_URL = 'https://rohsbrkbdlbewonibclf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvaHNicmtiZGxiZXdvbmliY2xmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MTc5MDMsImV4cCI6MjA3NjE5MzkwM30.PUbV15B1wUoU_-dfggCwbsS5U7C1YsoTrtcahEKn_Oc';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let visitedUserId = null;

// Botão X - FUNCIONA
document.getElementById('closeProfile').addEventListener('click', function() {
    window.history.back();
});

// Carregar perfil quando a página abrir
document.addEventListener('DOMContentLoaded', async function() {
    await loadProfile();
});

// FUNÇÃO PRINCIPAL - CARREGAR PERFIL
async function loadProfile() {
    try {
        // Verificar se usuário está logado
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            window.location.href = 'login.html';
            return;
        }
        currentUser = user;

        // Pegar ID da URL
        const urlParams = new URLSearchParams(window.location.search);
        visitedUserId = urlParams.get('id');
        
        if (!visitedUserId) {
            showNotification('Perfil não encontrado', 'error');
            return;
        }

        // CARREGAR DADOS DO PERFIL VISITADO
        await loadUserData();

    } catch (error) {
        showNotification('Erro ao carregar perfil', 'error');
    }
}

// CARREGAR DADOS DO USUÁRIO - SIMPLES E DIRETO
async function loadUserData() {
    try {
        // Buscar perfil principal
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', visitedUserId)
            .single();

        if (profileError) throw profileError;

        // Buscar detalhes
        const { data: details, error: detailsError } = await supabase
            .from('user_details')
            .select('*')
            .eq('user_id', visitedUserId)
            .single();

        // PREENCHER OS DADOS NA PÁGINA
        fillProfileData(profile, details || {});

    } catch (error) {
        showNotification('Erro ao carregar dados do usuário', 'error');
    }
}

// PREENCHER OS DADOS - SIMPLES
function fillProfileData(profile, details) {
    // Informações básicas
    document.getElementById('profileNickname').textContent = profile.nickname || 'Usuário';
    document.getElementById('profileLocation').textContent = profile.display_city || 'Cidade não informada';
    
    // Avatar
    if (profile.avatar_url) {
        document.getElementById('profileAvatar').src = profile.avatar_url;
        document.getElementById('profileAvatar').style.display = 'block';
        document.getElementById('profileAvatarFallback').style.display = 'none';
    }

    // Idade
    if (profile.birth_date) {
        const age = calculateAge(profile.birth_date);
        document.getElementById('profileAge').textContent = age;
    }

    // Seção Sobre
    document.getElementById('profileLookingFor').querySelector('span').textContent = details.looking_for || 'Não informado';
    document.getElementById('profileGender').querySelector('span').textContent = details.gender || 'Não informado';
    document.getElementById('profileOrientation').querySelector('span').textContent = details.sexual_orientation || 'Não informado';
    document.getElementById('profileProfession').querySelector('span').textContent = details.profession || 'Não informado';
    document.getElementById('profileZodiac').querySelector('span').textContent = details.zodiac || 'Não informado';

    // Descrição
    if (details.description) {
        document.getElementById('profileDescription').textContent = details.description;
    }

    // Características
    if (details.characteristics && details.characteristics.length > 0) {
        const container = document.getElementById('profileCharacteristics');
        container.innerHTML = details.characteristics.map(char => `
            <div class="characteristic-item">
                <i class="fas fa-check"></i>
                <span>${char}</span>
            </div>
        `).join('');
    }

    // Interesses
    if (details.interests && details.interests.length > 0) {
        const container = document.getElementById('profileInterests');
        container.innerHTML = details.interests.map(interest => `
            <div class="interest-item">
                <i class="fas fa-star"></i>
                <span>${interest}</span>
            </div>
        `).join('');
    }

    // Estilo de vida
    document.getElementById('profileReligion').querySelector('span').textContent = details.religion || 'Não informado';
    document.getElementById('profileDrinking').querySelector('span').textContent = details.drinking || 'Não informado';
    document.getElementById('profileSmoking').querySelector('span').textContent = details.smoking || 'Não informado';
    document.getElementById('profileExercise').querySelector('span').textContent = details.exercise || 'Não informado';
    document.getElementById('profilePets').querySelector('span').textContent = details.has_pets || 'Não informado';
}

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

// Botão enviar mensagem
document.getElementById('sendMessageBtn').addEventListener('click', function() {
    window.location.href = `mensagens.html?user=${visitedUserId}`;
});

// Botão curtir
document.getElementById('likeProfileBtn').addEventListener('click', function() {
    showNotification('Curtido! 💖', 'success');
});

// Notificação simples
function showNotification(message, type) {
    alert(message); // Simples e funciona
}

console.log('Perfil.js carregado - AGORA VAI!');