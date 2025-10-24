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

// Carregar perfil
document.addEventListener('DOMContentLoaded', async function() {
    await loadProfile();
});

// MESMA LÓGICA DA HOME
async function loadProfile() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            window.location.href = 'login.html';
            return;
        }
        currentUser = user;

        const urlParams = new URLSearchParams(window.location.search);
        visitedUserId = urlParams.get('id');
        
        if (!visitedUserId) {
            alert('Perfil não encontrado');
            return;
        }

        // USAR A MESMA CONSULTA DA HOME
        await loadUserData();

    } catch (error) {
        alert('Erro ao carregar perfil');
    }
}

// CONSULTA IGUAL À DA HOME
async function loadUserData() {
    try {
        // Buscar perfil IGUAL na home
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', visitedUserId)
            .single();

        if (profileError) throw profileError;

        // Buscar detalhes IGUAL na home  
        const { data: details, error: detailsError } = await supabase
            .from('user_details')
            .select('*')
            .eq('user_id', visitedUserId)
            .single();

        // Preencher dados
        fillProfileData(profile, details || {});

    } catch (error) {
        alert('Erro ao carregar dados');
    }
}

// Preencher dados
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

    // Seção Sobre - MESMO que na home
    document.getElementById('profileLookingFor').querySelector('span').textContent = 
        formatLookingFor(details.looking_for) || 'Não informado';
    document.getElementById('profileGender').querySelector('span').textContent = 
        details.gender || 'Não informado';
    document.getElementById('profileOrientation').querySelector('span').textContent = 
        details.sexual_orientation || 'Não informado';
    document.getElementById('profileProfession').querySelector('span').textContent = 
        details.profession || 'Não informado';
    document.getElementById('profileZodiac').querySelector('span').textContent = 
        details.zodiac || 'Não informado';

    // Descrição
    if (details.description) {
        document.getElementById('profileDescription').textContent = details.description;
    }

    // Características - MESMO que na home
    if (details.characteristics) {
        const container = document.getElementById('profileCharacteristics');
        container.innerHTML = details.characteristics.map(char => `
            <div class="characteristic-item">
                <i class="fas fa-check"></i>
                <span>${char}</span>
            </div>
        `).join('');
    }

    // Interesses - MESMO que na home
    if (details.interests) {
        const container = document.getElementById('profileInterests');
        container.innerHTML = details.interests.map(interest => `
            <div class="interest-item">
                <i class="fas fa-star"></i>
                <span>${interest}</span>
            </div>
        `).join('');
    }
}

// Funções auxiliares da home
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

function formatLookingFor(value) {
    const options = {
        'amizade': 'Amizade',
        'namoro': 'Namoro', 
        'relacionamento_serio': 'Relacionamento Sério',
        'conversa': 'Apenas Conversa'
    };
    return options[value] || value;
}

// Botões
document.getElementById('sendMessageBtn').addEventListener('click', function() {
    window.location.href = `mensagens.html?user=${visitedUserId}`;
});

document.getElementById('likeProfileBtn').addEventListener('click', function() {
    alert('Curtido! 💖');
});