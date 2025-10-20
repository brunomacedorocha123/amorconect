// ==================== SISTEMA DE PERFIL COMPLETO ====================
console.log('📝 painel-perfil.js carregando...');

// Variáveis globais do módulo perfil
let selectedAvatarFile = null;

// ==================== INICIALIZAÇÃO DO MÓDULO PERFIL ====================
document.addEventListener('DOMContentLoaded', function() {
    // Configurar eventos específicos do formulário de perfil
    setupProfileFormEvents();
});

function setupProfileFormEvents() {
    console.log('⚙️ Configurando eventos do formulário de perfil...');
    
    // Form submission
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', saveProfile);
        console.log('✅ Evento de submit configurado');
    }

    // Avatar upload
    const avatarButton = document.getElementById('avatarButton');
    const avatarInput = document.getElementById('avatarInput');
    
    if (avatarButton && avatarInput) {
        avatarButton.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('📷 Clicou no botão de avatar');
            avatarInput.click();
        });
        
        avatarInput.addEventListener('change', handleAvatarSelect);
        console.log('✅ Eventos de avatar configurados');
    }

    // Validação de idade em tempo real
    const birthDateInput = document.getElementById('birthDate');
    if (birthDateInput) {
        birthDateInput.addEventListener('change', validateAge);
    }
}

// ==================== UPLOAD DE AVATAR ====================
function handleAvatarSelect(event) {
    console.log('📁 Arquivo selecionado:', event.target.files[0]);
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

    // Criar preview
    const reader = new FileReader();
    reader.onload = function(e) {
        console.log('🖼️ Criando preview da imagem...');
        
        updateAvatarPreview(e.target.result);
        showNotification('✅ Imagem selecionada! Clique em Salvar Perfil para confirmar.', 'success');
    };
    reader.onerror = function() {
        console.error('❌ Erro ao ler arquivo');
        showNotification('❌ Erro ao carregar imagem', 'error');
    };
    reader.readAsDataURL(file);
}

function updateAvatarPreview(imageData) {
    const previewImg = document.getElementById('avatarPreviewImg');
    const fallback = document.getElementById('avatarFallback');
    const avatarImgs = document.querySelectorAll('.user-avatar-img');
    const headerFallbacks = document.querySelectorAll('.user-avatar-fallback');
    
    if (previewImg) {
        previewImg.src = imageData;
        previewImg.style.display = 'block';
    }
    if (fallback) fallback.style.display = 'none';
    
    avatarImgs.forEach(img => {
        img.src = imageData;
        img.style.display = 'block';
    });
    
    headerFallbacks.forEach(fb => {
        fb.style.display = 'none';
    });
}

// ==================== VALIDAÇÕES DE FORMULÁRIO ====================
function validateAge() {
    const birthDateInput = document.getElementById('birthDate');
    if (!birthDateInput || !birthDateInput.value) return true;
    
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
        'nickname',
        'fullName', 
        'cpf',
        'birthDate',
        'phone',
        'street',
        'number',
        'neighborhood', 
        'city',
        'state',
        'zipCode',
        'gender',
        'lookingFor'
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

// ==================== SALVAMENTO DO PERFIL ====================
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

        // Validações
        if (!validateRequiredFields()) {
            saveButton.innerHTML = originalText;
            saveButton.disabled = false;
            return;
        }
        
        if (!validateAge()) {
            saveButton.innerHTML = originalText;
            saveButton.disabled = false;
            return;
        }

        let avatarPath = null;

        // Upload da imagem se houver nova
        if (selectedAvatarFile) {
            console.log('📤 Fazendo upload da imagem...');
            showNotification('📤 Enviando imagem...', 'info');
            try {
                avatarPath = await uploadAvatar(selectedAvatarFile);
                if (avatarPath) {
                    console.log('✅ Upload do avatar realizado:', avatarPath);
                    showNotification('✅ Imagem enviada com sucesso!', 'success');
                }
            } catch (uploadError) {
                console.error('❌ Upload falhou, continuando sem imagem:', uploadError);
                showNotification('⚠️ Imagem não enviada, mas perfil será salvo', 'warning');
            }
        }

        // Coletar dados do formulário
        const profileData = collectProfileData();
        const userDetailsData = collectUserDetailsData();

        // ✅ NOVO: Coletar características pessoais
        userDetailsData.personal_traits = collectPersonalTraits();

        // Adicionar avatar path se upload foi bem sucedido
        if (avatarPath) {
            profileData.avatar_url = avatarPath;
            console.log('✅ Avatar URL adicionado aos dados:', avatarPath);
        }

        console.log('💾 Salvando no banco de dados...');
        showNotification('💾 Salvando dados do perfil...', 'info');

        // Salvar perfil principal
        const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
                id: currentUser.id,
                ...profileData
            }, { 
                onConflict: 'id',
                ignoreDuplicates: false
            });

        if (profileError) {
            console.error('❌ Erro ao salvar perfil:', profileError);
            throw new Error(`Erro no perfil: ${profileError.message}`);
        }

        // Salvar detalhes do usuário
        const { error: detailsError } = await supabase
            .from('user_details')
            .upsert({
                user_id: currentUser.id,
                ...userDetailsData
            }, { 
                onConflict: 'user_id',
                ignoreDuplicates: false
            });

        if (detailsError) {
            console.error('❌ Erro ao salvar detalhes:', detailsError);
            throw new Error(`Erro nos detalhes: ${detailsError.message}`);
        }

        // ✅ Atualizar interface
        updateUserInterfaceAfterSave(profileData.nickname);
        
        // Resetar estado do formulário
        selectedAvatarFile = null;
        const avatarInput = document.getElementById('avatarInput');
        if (avatarInput) avatarInput.value = '';
        
        console.log('✅ Perfil salvo com sucesso!');
        showNotification('✅ Perfil salvo com sucesso!', 'success');
        
        // Atualizar sistemas
        await updateProfileCompletion();
        
        // Recarregar avatar se foi atualizado
        if (avatarPath) {
            console.log('🔄 Recarregando avatar atualizado...');
            setTimeout(() => {
                loadAvatar(avatarPath);
            }, 1500);
        }

    } catch (error) {
        console.error('❌ Erro ao salvar perfil:', error);
        showNotification('❌ Erro ao salvar perfil: ' + error.message, 'error');
    } finally {
        saveButton.innerHTML = originalText;
        saveButton.disabled = false;
    }
}

function collectProfileData() {
    const getFormValue = (id) => {
        const element = document.getElementById(id);
        return element ? element.value.trim() : '';
    };

    return {
        full_name: getFormValue('fullName'),
        cpf: getFormValue('cpf').replace(/\D/g, ''),
        birth_date: getFormValue('birthDate'),
        phone: getFormValue('phone').replace(/\D/g, ''),
        street: getFormValue('street'),
        number: getFormValue('number'),
        neighborhood: getFormValue('neighborhood'),
        city: getFormValue('city'),
        state: getFormValue('state'),
        zip_code: getFormValue('zipCode').replace(/\D/g, ''),
        nickname: getFormValue('nickname'),
        updated_at: new Date().toISOString()
    };
}

function collectUserDetailsData() {
    const getFormValue = (id) => {
        const element = document.getElementById(id);
        return element ? element.value.trim() : '';
    };

    // Coletar interesses
    const selectedInterests = [];
    document.querySelectorAll('input[name="interests"]:checked').forEach(checkbox => {
        selectedInterests.push(checkbox.value);
    });

    return {
        display_city: getFormValue('displayCity'),
        gender: getFormValue('gender'),
        sexual_orientation: getFormValue('sexualOrientation'),
        profession: getFormValue('profession'),
        education: getFormValue('education'),
        zodiac: getFormValue('zodiac'),
        looking_for: getFormValue('lookingFor'),
        description: getFormValue('description'),
        religion: getFormValue('religion'),
        drinking: getFormValue('drinking'),
        smoking: getFormValue('smoking'),
        exercise: getFormValue('exercise'),
        exercise_details: getFormValue('exerciseDetails'),
        has_pets: getFormValue('hasPets'),
        pets_details: getFormValue('petsDetails'),
        interests: selectedInterests,
        updated_at: new Date().toISOString()
    };
}

// ✅ NOVA FUNÇÃO: Coletar características pessoais
function collectPersonalTraits() {
    const selectedTraits = [];
    document.querySelectorAll('input[name="caracteristicas"]:checked').forEach(checkbox => {
        selectedTraits.push(checkbox.value);
    });
    return selectedTraits;
}

function updateUserInterfaceAfterSave(nickname) {
    // Atualizar nicknames na interface
    const userNickname = document.getElementById('userNickname');
    const mobileUserNickname = document.getElementById('mobileUserNickname');
    
    if (userNickname) userNickname.textContent = nickname;
    if (mobileUserNickname) mobileUserNickname.textContent = nickname;
}

// ==================== UPLOAD DE AVATAR ====================
async function uploadAvatar(file) {
    try {
        console.log('📤 Iniciando upload do avatar...');
        
        const fileExt = file.name.split('.').pop().toLowerCase();
        const fileName = `${Date.now()}_avatar.${fileExt}`;
        const filePath = `${currentUser.id}/${fileName}`;

        console.log('📁 Fazendo upload para:', filePath);

        // Verificar se a pasta existe
        try {
            await supabase.storage
                .from('avatars')
                .list(currentUser.id);
        } catch (e) {
            console.log('📁 Pasta não existe, será criada automaticamente');
        }

        // Upload simples
        const { data, error } = await supabase.storage
            .from('avatars')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) {
            console.error('❌ Erro no upload:', error);
            
            // Tentar com upsert true se falhar
            const { data: retryData, error: retryError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, {
                    upsert: true
                });
                
            if (retryError) {
                console.error('❌ Erro na segunda tentativa:', retryError);
                throw new Error(`Falha no upload: ${retryError.message}`);
            }
            
            console.log('✅ Upload realizado na segunda tentativa');
            return filePath;
        }

        console.log('✅ Upload realizado com sucesso:', data);
        return filePath;

    } catch (error) {
        console.error('❌ Erro completo no upload:', error);
        showNotification('⚠️ Imagem não pôde ser enviada, mas o perfil será salvo.', 'warning');
        return null;
    }
}

async function loadAvatar(avatarPath) {
    try {
        console.log('🔄 Carregando avatar:', avatarPath);
        
        const { data } = supabase.storage
            .from('avatars')
            .getPublicUrl(avatarPath);

        if (data && data.publicUrl) {
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
    const avatarImgs = document.querySelectorAll('.user-avatar-img');
    const previewImg = document.getElementById('avatarPreviewImg');
    const fallbacks = document.querySelectorAll('.user-avatar-fallback, .avatar-fallback');
    
    console.log('✅ Atualizando avatares com URL:', imageUrl);
    
    avatarImgs.forEach(img => {
        img.src = imageUrl;
        img.style.display = 'block';
        img.onerror = () => {
            console.log('❌ Erro ao carregar imagem do avatar');
            img.style.display = 'none';
        };
    });
    
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
    
    fallbacks.forEach(fb => {
        fb.style.display = 'none';
    });
}

function showFallbackAvatars() {
    document.querySelectorAll('.user-avatar-fallback, .avatar-fallback').forEach(fb => {
        fb.style.display = 'flex';
    });
}

// ==================== FUNÇÕES DE UTILIDADE ====================
function formatDateForInput(dateString) {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        return date.toISOString().split('T')[0];
    } catch (error) {
        return '';
    }
}

function formatCPF(cpf) {
    if (!cpf) return '';
    cpf = cpf.replace(/\D/g, '');
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function formatPhone(phone) {
    if (!phone) return '';
    phone = phone.replace(/\D/g, '');
    if (phone.length === 11) {
        return phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    return phone;
}

// ==================== EXPORTAÇÕES GLOBAIS ====================
window.handleAvatarSelect = handleAvatarSelect;
window.saveProfile = saveProfile;
window.validateAge = validateAge;

console.log('✅ painel-perfil.js carregado e pronto!');