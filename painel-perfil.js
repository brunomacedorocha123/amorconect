// ==================== SISTEMA DE PERFIL COMPLETO CORRIGIDO ====================
console.log('📝 painel-perfil.js carregando...');

let selectedAvatarFile = null;

// ==================== INICIALIZAÇÃO ====================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando módulo de perfil...');
    initializeProfileModule();
});

async function initializeProfileModule() {
    console.log('🔍 Verificando dependências...');
    
    // Aguardar autenticação carregar
    if (!window.currentUser || !window.supabase) {
        console.log('⏳ Aguardando autenticação...');
        setTimeout(initializeProfileModule, 1000);
        return;
    }
    
    console.log('✅ Usuário autenticado:', currentUser.email);
    
    setupProfileFormEvents();
    await loadProfileData();
}

function setupProfileFormEvents() {
    console.log('⚙️ Configurando eventos do formulário...');
    
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', saveProfile);
        console.log('✅ Evento de submit configurado');
    }

    const avatarButton = document.getElementById('avatarButton');
    const avatarInput = document.getElementById('avatarInput');
    
    if (avatarButton && avatarInput) {
        avatarButton.addEventListener('click', () => avatarInput.click());
        avatarInput.addEventListener('change', handleAvatarSelect);
        console.log('✅ Eventos de avatar configurados');
    }

    // Eventos de validação
    const birthDateInput = document.getElementById('birthDate');
    if (birthDateInput) birthDateInput.addEventListener('change', validateAge);
    
    const descriptionInput = document.getElementById('description');
    if (descriptionInput) descriptionInput.addEventListener('input', updateCharCount);

    console.log('✅ Todos os eventos configurados');
}

// ==================== CARREGAR DADOS DO PERFIL ====================
async function loadProfileData() {
    try {
        console.log('📋 Carregando dados do perfil...');
        
        // ✅ 1. BUSCAR DADOS DO CADASTRO (AUTH) - FONTE PRINCIPAL
        console.log('🔍 Buscando dados do cadastro...');
        const { data: authData, error: authError } = await supabase.auth.getUser();
        
        if (authError) {
            console.error('❌ Erro ao buscar dados do auth:', authError);
            throw authError;
        }

        const authUser = authData.user;
        console.log('📦 Dados do auth:', authUser);

        // ✅ 2. BUSCAR DADOS DO PERFIL (BANCO) - DADOS ADICIONAIS
        console.log('🔍 Buscando dados do perfil...');
        const [profileResult, detailsResult] = await Promise.all([
            supabase.from('profiles').select('*').eq('id', currentUser.id).single(),
            supabase.from('user_details').select('*').eq('user_id', currentUser.id).single()
        ]);

        console.log('📊 Resultado perfil:', profileResult);
        console.log('📊 Resultado detalhes:', detailsResult);

        // ✅ 3. PREENCHER FORMULÁRIO COM DADOS DO CADASTRO + PERFIL
        await fillProfileForm(authUser, profileResult.data, detailsResult.data);

        console.log('✅ Dados do perfil carregados com sucesso!');

    } catch (error) {
        console.error('❌ Erro ao carregar perfil:', error);
        showNotification('Erro ao carregar dados do perfil', 'error');
    }
}

async function fillProfileForm(authUser, profile, userDetails) {
    console.log('🔄 Preenchendo formulário...');
    
    // ✅ DADOS DO CADASTRO (AUTH) - SEMPRE USAR ESTES PRIMEIRO
    if (authUser) {
        console.log('👤 Dados do auth user:', {
            email: authUser.email,
            user_metadata: authUser.user_metadata
        });

        // ✅ Email (SEMPRE do auth) - TRAVADO
        const emailInput = document.getElementById('email');
        if (emailInput) {
            emailInput.value = authUser.email || '';
            console.log('✅ Email preenchido:', authUser.email);
        }

        // ✅ Nome completo (do cadastro) - TRAVADO
        const fullNameInput = document.getElementById('fullName');
        if (fullNameInput) {
            // Prioridade: 1. Perfil salvo, 2. Cadastro
            if (profile?.full_name) {
                fullNameInput.value = profile.full_name;
                console.log('✅ Nome completo do perfil:', profile.full_name);
            } else if (authUser.user_metadata?.full_name) {
                fullNameInput.value = authUser.user_metadata.full_name;
                console.log('✅ Nome completo do cadastro:', authUser.user_metadata.full_name);
            }
        }

        // ✅ Nickname (do cadastro) - TRAVADO
        const nicknameInput = document.getElementById('nickname');
        if (nicknameInput) {
            // Prioridade: 1. Perfil salvo, 2. Cadastro, 3. Email
            if (profile?.nickname) {
                nicknameInput.value = profile.nickname;
            } else if (authUser.user_metadata?.nickname) {
                nicknameInput.value = authUser.user_metadata.nickname;
            } else {
                nicknameInput.value = authUser.email?.split('@')[0] || '';
            }
            console.log('✅ Nickname definido:', nicknameInput.value);
        }

        // ✅ Data de nascimento (do cadastro) - TRAVADA
        const birthDateInput = document.getElementById('birthDate');
        if (birthDateInput) {
            // Prioridade: 1. Perfil salvo, 2. Cadastro
            if (profile?.birth_date) {
                birthDateInput.value = formatDateForInput(profile.birth_date);
                console.log('✅ Data nascimento do perfil:', profile.birth_date);
            } else if (authUser.user_metadata?.birth_date) {
                birthDateInput.value = formatDateForInput(authUser.user_metadata.birth_date);
                console.log('✅ Data nascimento do cadastro:', authUser.user_metadata.birth_date);
            }
        }
    }

    // ✅ DADOS DO PERFIL SALVO (BANCO) - EDITÁVEIS
    if (profile) {
        console.log('💾 Dados do perfil encontrados:', profile);
        
        const profileFields = {
            'cpf': profile.cpf,
            'phone': profile.phone,
            'street': profile.street,
            'number': profile.number,
            'neighborhood': profile.neighborhood,
            'city': profile.city,
            'state': profile.state,
            'zipCode': profile.zip_code
        };

        for (const [fieldId, value] of Object.entries(profileFields)) {
            const element = document.getElementById(fieldId);
            if (element && value) {
                element.value = value;
                console.log(`✅ Campo ${fieldId} preenchido:`, value);
            }
        }

        // Avatar
        if (profile.avatar_url) {
            console.log('🖼️ Carregando avatar...');
            loadAvatar(profile.avatar_url);
        }
    }

    // ✅ DADOS DETALHADOS (USER_DETAILS) - EDITÁVEIS
    if (userDetails) {
        console.log('📝 Dados detalhados encontrados:', userDetails);
        
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
            if (element && value) {
                element.value = value;
                console.log(`✅ Campo ${fieldId} preenchido:`, value);
            }
        }
        
        // Checkboxes - Interesses
        if (userDetails.interests && userDetails.interests.length > 0) {
            console.log('🎯 Preenchendo interesses:', userDetails.interests);
            document.querySelectorAll('input[name="interests"]').forEach(checkbox => {
                checkbox.checked = userDetails.interests.includes(checkbox.value);
            });
        }
        
        // Checkboxes - Características pessoais
        if (userDetails.personal_traits && userDetails.personal_traits.length > 0) {
            console.log('🎭 Preenchendo características:', userDetails.personal_traits);
            document.querySelectorAll('input[name="caracteristicas"]').forEach(checkbox => {
                checkbox.checked = userDetails.personal_traits.includes(checkbox.value);
            });
        }
    }

    updateCharCount();
    console.log('✅ Formulário preenchido completamente!');
}

// ==================== UPLOAD DE AVATAR ====================
function handleAvatarSelect(event) {
    const file = event.target.files[0];
    if (!file) {
        console.log('❌ Nenhum arquivo selecionado');
        return;
    }

    // Validações
    if (file.size > 256000) {
        showNotification('❌ A imagem deve ter no máximo 250KB!', 'error');
        return;
    }

    if (!file.type.startsWith('image/')) {
        showNotification('❌ Selecione uma imagem válida (JPG, PNG, GIF)!', 'error');
        return;
    }

    selectedAvatarFile = file;
    console.log('✅ Arquivo validado:', file.name, file.size, 'bytes');

    // Preview
    const reader = new FileReader();
    reader.onload = function(e) {
        updateAvatarPreview(e.target.result);
        showNotification('✅ Imagem selecionada! Clique em Salvar Perfil.', 'success');
    };
    reader.readAsDataURL(file);
}

function updateAvatarPreview(imageData) {
    const previewImg = document.getElementById('avatarPreviewImg');
    const fallback = document.getElementById('avatarFallback');
    
    if (previewImg) {
        previewImg.src = imageData;
        previewImg.style.display = 'block';
    }
    if (fallback) fallback.style.display = 'none';
    
    // Atualizar preview apenas - os avatares principais só após salvar
    console.log('✅ Preview do avatar atualizado');
}

// ==================== UPLOAD DE AVATAR CORRIGIDO ====================
async function uploadAvatar(file) {
    try {
        const fileExt = file.name.split('.').pop().toLowerCase();
        const fileName = `${Date.now()}_avatar.${fileExt}`;
        const filePath = `${currentUser.id}/${fileName}`;

        console.log('📤 Upload para:', filePath);

        // Fazer upload do arquivo
        const { data, error } = await supabase.storage
            .from('avatars')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: true
            });

        if (error) {
            console.error('❌ Erro no upload:', error);
            throw error;
        }
        
        console.log('✅ Upload realizado:', data);
        
        // Obter URL pública
        const { data: urlData } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);
            
        console.log('✅ URL pública obtida:', urlData.publicUrl);
        return urlData.publicUrl;
        
    } catch (error) {
        console.error('❌ Erro completo no upload:', error);
        throw error;
    }
}

// ==================== VALIDAÇÕES ====================
function validateAge() {
    const birthDateInput = document.getElementById('birthDate');
    if (!birthDateInput?.value) return true;
    
    const birthDate = new Date(birthDateInput.value);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    
    if (age < 18) {
        showNotification('❌ Você deve ter pelo menos 18 anos!', 'error');
        birthDateInput.focus();
        return false;
    }
    
    return true;
}

function validateRequiredFields() {
    const requiredFields = [
        'nickname', 'fullName', 'cpf', 'birthDate', 'phone',
        'street', 'number', 'neighborhood', 'city', 'state', 
        'zipCode', 'gender', 'lookingFor'
    ];
    
    for (const fieldId of requiredFields) {
        const element = document.getElementById(fieldId);
        if (element && !element.value.trim()) {
            showNotification(`❌ O campo ${getFieldLabel(fieldId)} é obrigatório!`, 'error');
            element.focus();
            return false;
        }
    }
    
    return true;
}

function getFieldLabel(fieldId) {
    const labels = {
        'nickname': 'Apelido/Nickname',
        'fullName': 'Nome Completo',
        'cpf': 'CPF',
        'birthDate': 'Data de Nascimento',
        'phone': 'Telefone',
        'street': 'Rua',
        'number': 'Número',
        'neighborhood': 'Bairro',
        'city': 'Cidade',
        'state': 'Estado',
        'zipCode': 'CEP',
        'gender': 'Gênero',
        'lookingFor': 'Procura por'
    };
    
    return labels[fieldId] || fieldId;
}

// ==================== SALVAMENTO DO PERFIL CORRIGIDO ====================
async function saveProfile(event) {
    event.preventDefault();
    console.log('💾 Iniciando salvamento do perfil...');
    
    const saveButton = document.getElementById('saveButton');
    if (!saveButton) {
        console.error('❌ Botão de salvar não encontrado');
        return;
    }
    
    const originalText = saveButton.innerHTML;
    
    try {
        saveButton.innerHTML = '⏳ Salvando...';
        saveButton.disabled = true;

        // Validações básicas
        if (!validateRequiredFields()) {
            throw new Error('Por favor, preencha todos os campos obrigatórios');
        }
        
        if (!validateAge()) {
            throw new Error('Validação de idade falhou');
        }

        let avatarUrl = null;

        // Upload de avatar se houver nova imagem
        if (selectedAvatarFile) {
            console.log('📤 Fazendo upload do avatar...');
            showNotification('📤 Enviando imagem...', 'info');
            try {
                avatarUrl = await uploadAvatar(selectedAvatarFile);
                if (avatarUrl) {
                    console.log('✅ Upload do avatar realizado:', avatarUrl);
                    showNotification('✅ Imagem enviada com sucesso!', 'success');
                }
            } catch (uploadError) {
                console.error('❌ Upload falhou:', uploadError);
                showNotification('⚠️ Imagem não enviada, mas perfil será salvo', 'warning');
            }
        }

        // Coletar dados do formulário
        const profileData = collectProfileData();
        const userDetailsData = collectUserDetailsData();
        userDetailsData.personal_traits = collectPersonalTraits();

        console.log('📦 Dados coletados para salvar:', {
            profileData,
            userDetailsData
        });

        // Adicionar avatar URL se upload foi bem sucedido
        if (avatarUrl) {
            profileData.avatar_url = avatarUrl;
            console.log('✅ Avatar URL adicionado aos dados:', avatarUrl);
        }

        console.log('💾 Salvando no banco de dados...');
        showNotification('💾 Salvando dados do perfil...', 'info');

        // ✅ SALVAR NO BANCO - COM UPSERT
        const [profileResult, detailsResult] = await Promise.all([
            supabase.from('profiles').upsert({
                id: currentUser.id,
                ...profileData,
                updated_at: new Date().toISOString()
            }),
            supabase.from('user_details').upsert({
                user_id: currentUser.id,
                ...userDetailsData,
                updated_at: new Date().toISOString()
            })
        ]);

        console.log('📊 Resultado do salvamento:', {
            profile: profileResult,
            details: detailsResult
        });

        if (profileResult.error) {
            console.error('❌ Erro ao salvar perfil:', profileResult.error);
            throw new Error(`Erro no perfil: ${profileResult.error.message}`);
        }

        if (detailsResult.error) {
            console.error('❌ Erro ao salvar detalhes:', detailsResult.error);
            throw new Error(`Erro nos detalhes: ${detailsResult.error.message}`);
        }

        // ✅ SUCESSO - ATUALIZAR INTERFACE
        updateUserInterfaceAfterSave(profileData.nickname);
        
        // ✅ ATUALIZAR AVATAR NA INTERFACE SE FOI SALVO
        if (avatarUrl) {
            console.log('🔄 Atualizando avatar na interface...');
            updateAvatarImages(avatarUrl);
        }
        
        // Resetar estado do formulário
        selectedAvatarFile = null;
        const avatarInput = document.getElementById('avatarInput');
        if (avatarInput) avatarInput.value = '';
        
        console.log('✅ Perfil salvo com sucesso!');
        showNotification('✅ Perfil salvo com sucesso!', 'success');
        
        // Atualizar sistemas
        await updateProfileCompletion();
        
    } catch (error) {
        console.error('❌ Erro ao salvar perfil:', error);
        showNotification('❌ Erro ao salvar perfil: ' + error.message, 'error');
    } finally {
        saveButton.innerHTML = originalText;
        saveButton.disabled = false;
    }
}

function collectProfileData() {
    const getValue = (id) => {
        const element = document.getElementById(id);
        return element ? element.value.trim() : '';
    };

    return {
        full_name: getValue('fullName'),
        cpf: getValue('cpf').replace(/\D/g, ''),
        birth_date: getValue('birthDate'),
        phone: getValue('phone').replace(/\D/g, ''),
        street: getValue('street'),
        number: getValue('number'),
        neighborhood: getValue('neighborhood'),
        city: getValue('city'),
        state: getValue('state'),
        zip_code: getValue('zipCode').replace(/\D/g, ''),
        nickname: getValue('nickname')
    };
}

function collectUserDetailsData() {
    const getValue = (id) => {
        const element = document.getElementById(id);
        return element ? element.value.trim() : '';
    };

    const selectedInterests = [];
    document.querySelectorAll('input[name="interests"]:checked').forEach(checkbox => {
        selectedInterests.push(checkbox.value);
    });

    return {
        display_city: getValue('displayCity'),
        gender: getValue('gender'),
        sexual_orientation: getValue('sexualOrientation'),
        profession: getValue('profession'),
        education: getValue('education'),
        zodiac: getValue('zodiac'),
        looking_for: getValue('lookingFor'),
        description: getValue('description'),
        religion: getValue('religion'),
        drinking: getValue('drinking'),
        smoking: getValue('smoking'),
        exercise: getValue('exercise'),
        exercise_details: getValue('exerciseDetails'),
        has_pets: getValue('hasPets'),
        pets_details: getValue('petsDetails'),
        interests: selectedInterests
    };
}

function collectPersonalTraits() {
    const selectedTraits = [];
    document.querySelectorAll('input[name="caracteristicas"]:checked').forEach(checkbox => {
        selectedTraits.push(checkbox.value);
    });
    return selectedTraits;
}

// ==================== CARREGAR E ATUALIZAR AVATAR ====================
async function loadAvatar(avatarPath) {
    try {
        console.log('🔄 Carregando avatar:', avatarPath);
        
        // Se já é uma URL completa, usar diretamente
        if (avatarPath.startsWith('http')) {
            updateAvatarImages(avatarPath);
            return;
        }
        
        // Se é um caminho do storage, obter URL pública
        const { data } = supabase.storage
            .from('avatars')
            .getPublicUrl(avatarPath);

        if (data?.publicUrl) {
            console.log('✅ URL pública do avatar:', data.publicUrl);
            updateAvatarImages(data.publicUrl);
        } else {
            console.log('❌ Não foi possível obter URL pública');
            showFallbackAvatars();
        }
    } catch (error) {
        console.log('❌ Erro ao carregar avatar:', error);
        showFallbackAvatars();
    }
}

function updateAvatarImages(imageUrl) {
    // Atualizar todos os avatares da interface
    document.querySelectorAll('.user-avatar-img').forEach(img => {
        img.src = imageUrl;
        img.style.display = 'block';
        img.onerror = () => {
            console.log('❌ Erro ao carregar imagem do avatar');
            img.style.display = 'none';
        };
    });
    
    // Atualizar preview do formulário
    const previewImg = document.getElementById('avatarPreviewImg');
    if (previewImg) {
        previewImg.src = imageUrl;
        previewImg.style.display = 'block';
        previewImg.onerror = () => {
            console.log('❌ Erro ao carregar preview do avatar');
            previewImg.style.display = 'none';
            const avatarFallback = document.getElementById('avatarFallback');
            if (avatarFallback) avatarFallback.style.display = 'flex';
        };
    }
    
    // Esconder fallbacks
    document.querySelectorAll('.user-avatar-fallback').forEach(fb => {
        fb.style.display = 'none';
    });
    
    document.querySelectorAll('.avatar-fallback').forEach(fb => {
        fb.style.display = 'none';
    });
}

function showFallbackAvatars() {
    document.querySelectorAll('.user-avatar-fallback').forEach(fb => {
        fb.style.display = 'flex';
    });
    document.querySelectorAll('.avatar-fallback').forEach(fb => {
        fb.style.display = 'flex';
    });
}

// ==================== UTILITÁRIOS ====================
function updateUserInterfaceAfterSave(nickname) {
    console.log('👤 Atualizando interface com nickname:', nickname);
    
    const userNickname = document.getElementById('userNickname');
    const mobileUserNickname = document.getElementById('mobileUserNickname');
    
    if (userNickname) {
        userNickname.textContent = nickname;
        console.log('✅ Header nickname atualizado:', nickname);
    }
    if (mobileUserNickname) {
        mobileUserNickname.textContent = nickname;
        console.log('✅ Mobile nickname atualizado:', nickname);
    }
}

function updateCharCount() {
    const textarea = document.getElementById('description');
    const charCount = document.getElementById('charCount');
    
    if (textarea && charCount) {
        const count = textarea.value.length;
        charCount.textContent = `${count}/100`;
        
        // Cor baseada na quantidade
        if (count > 80) charCount.style.color = '#f56565';
        else if (count > 50) charCount.style.color = '#ed8936';
        else charCount.style.color = '#48bb78';
    }
}

function formatDateForInput(dateString) {
    if (!dateString) return '';
    try {
        return new Date(dateString).toISOString().split('T')[0];
    } catch (error) {
        return '';
    }
}

// ==================== ATUALIZAR PROGRESSO ====================
async function updateProfileCompletion() {
    try {
        console.log('📊 Atualizando progresso do perfil...');
        
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

// ==================== FUNÇÃO DE NOTIFICAÇÃO ====================
function showNotification(message, type = 'info') {
    // Remove notificações existentes
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => {
        notification.remove();
    });

    // Cria nova notificação
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
            <button class="notification-close">&times;</button>
        </div>
    `;

    document.body.appendChild(notification);

    // Auto-remove após 5 segundos
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);

    // Fechar ao clicar no X
    const closeBtn = notification.querySelector('.notification-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            notification.remove();
        });
    }
}

// ==================== EXPORTAÇÕES ====================
window.handleAvatarSelect = handleAvatarSelect;
window.saveProfile = saveProfile;
window.validateAge = validateAge;
window.updateCharCount = updateCharCount;

console.log('✅ painel-perfil.js carregado e pronto!');