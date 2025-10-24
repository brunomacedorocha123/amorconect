// avatar.js - Sistema Completo de Upload de Avatar
class AvatarUpload {
    constructor() {
        this.supabase = supabase;
        this.currentUser = null;
        this.MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
        this.ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        this.STORAGE_BUCKET = 'avatars';
        this.initialize();
    }

    async initialize() {
        await this.checkAuth();
        this.createUploadInterface();
        this.setupEventListeners();
        await this.loadCurrentAvatar();
    }

    async checkAuth() {
        try {
            const { data: { user }, error } = await this.supabase.auth.getUser();
            if (error || !user) {
                return;
            }
            this.currentUser = user;
        } catch (error) {
            // Silencioso - sem logs
        }
    }

    createUploadInterface() {
        // Input de arquivo hidden
        if (!document.getElementById('avatarUpload')) {
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.id = 'avatarUpload';
            fileInput.name = 'avatarUpload';
            fileInput.accept = 'image/jpeg,image/jpg,image/png,image/webp';
            fileInput.style.display = 'none';
            document.body.appendChild(fileInput);
        }

        // Tornar avatars clicáveis
        const avatars = document.querySelectorAll('.user-avatar, .user-avatar-large');
        avatars.forEach(avatar => {
            avatar.style.cursor = 'pointer';
            avatar.title = 'Clique para alterar a foto';
            
            if (!avatar.querySelector('.avatar-overlay')) {
                const overlay = document.createElement('div');
                overlay.className = avatar.classList.contains('user-avatar-large') ? 'avatar-overlay-large' : 'avatar-overlay';
                overlay.innerHTML = avatar.classList.contains('user-avatar-large') 
                    ? '<i class="fas fa-camera"></i><span>Clique para alterar</span>' 
                    : '<i class="fas fa-camera"></i>';
                avatar.appendChild(overlay);
            }
        });
    }

    setupEventListeners() {
        // Click nos avatars
        const avatars = document.querySelectorAll('.user-avatar, .user-avatar-large');
        avatars.forEach(avatar => {
            avatar.addEventListener('click', (e) => {
                this.triggerFileInput();
            });
        });

        // Botão de upload específico
        const uploadBtn = document.getElementById('uploadAvatarBtn');
        if (uploadBtn) {
            uploadBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.triggerFileInput();
            });
        }

        // Botão de remover avatar
        const removeBtn = document.getElementById('removeAvatarBtn');
        if (removeBtn) {
            removeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.removeAvatar();
            });
        }

        // Change no input de arquivo
        const fileInput = document.getElementById('avatarUpload');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                this.handleFileSelect(e);
            });
        }

        // Drag and drop
        this.setupDragAndDrop();
    }

    setupDragAndDrop() {
        const avatarLarge = document.querySelector('.user-avatar-large');
        if (!avatarLarge) return;

        avatarLarge.addEventListener('dragover', (e) => {
            e.preventDefault();
            avatarLarge.classList.add('drag-over');
        });

        avatarLarge.addEventListener('dragleave', (e) => {
            e.preventDefault();
            avatarLarge.classList.remove('drag-over');
        });

        avatarLarge.addEventListener('drop', (e) => {
            e.preventDefault();
            avatarLarge.classList.remove('drag-over');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileSelect({ target: { files: files } });
            }
        });
    }

    triggerFileInput() {
        const fileInput = document.getElementById('avatarUpload');
        if (fileInput) {
            fileInput.value = '';
            fileInput.click();
        }
    }

    validateFile(file) {
        if (!this.ALLOWED_TYPES.includes(file.type)) {
            this.showNotification('Tipo de arquivo não permitido. Use JPEG, PNG ou WebP.', 'error');
            return false;
        }

        if (file.size > this.MAX_FILE_SIZE) {
            this.showNotification('Arquivo muito grande. Máximo 5MB.', 'error');
            return false;
        }

        return true;
    }

    async handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!this.validateFile(file)) {
            return;
        }

        try {
            await this.showPreview(file);
            await this.uploadToSupabase(file);
            
        } catch (error) {
            this.showNotification('Erro ao processar a imagem', 'error');
        }
    }

    async showPreview(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                // Atualizar todos os avatars
                const avatars = document.querySelectorAll('.user-avatar, .user-avatar-large');
                avatars.forEach(avatar => {
                    let img = avatar.querySelector('.avatar-image, .avatar-image-large');
                    let fallback = avatar.querySelector('.user-avatar-fallback, .user-avatar-fallback-large, .avatar-fallback');
                    
                    if (!img) {
                        img = document.createElement('img');
                        img.className = avatar.classList.contains('user-avatar-large') ? 'avatar-image-large' : 'avatar-image';
                        // CORREÇÃO: Estilo com !important para mobile
                        img.style.cssText = `
                            width: 100% !important;
                            height: 100% !important;
                            border-radius: 50% !important;
                            object-fit: cover !important;
                            display: block !important;
                        `;
                        avatar.appendChild(img);
                    }
                    
                    img.src = e.target.result;
                    // CORREÇÃO: Garantir que mostra no mobile
                    img.style.cssText = `
                        width: 100% !important;
                        height: 100% !important;
                        border-radius: 50% !important;
                        object-fit: cover !important;
                        display: block !important;
                    `;
                    
                    if (fallback) {
                        // CORREÇÃO: Garantir que esconde no mobile
                        fallback.style.cssText = `
                            display: none !important;
                        `;
                    }
                });

                // Mostrar botão de remover
                const removeBtn = document.getElementById('removeAvatarBtn');
                if (removeBtn) {
                    removeBtn.style.display = 'block';
                }

                resolve();
            };
            reader.readAsDataURL(file);
        });
    }

    async uploadToSupabase(file) {
        if (!this.currentUser) {
            throw new Error('Usuário não autenticado');
        }

        this.showProgress(true);

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${this.currentUser.id}/${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            // Upload para o Storage
            const { data, error } = await this.supabase.storage
                .from(this.STORAGE_BUCKET)
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: true
                });

            if (error) {
                throw new Error('Erro no upload');
            }

            // Obter URL pública
            const { data: { publicUrl } } = this.supabase.storage
                .from(this.STORAGE_BUCKET)
                .getPublicUrl(filePath);

            // Atualizar perfil
            await this.updateProfileWithAvatar(publicUrl);

            this.showNotification('Avatar atualizado com sucesso!', 'success');
            return publicUrl;

        } finally {
            this.showProgress(false);
        }
    }

    async updateProfileWithAvatar(avatarUrl) {
        const { error } = await this.supabase
            .from('profiles')
            .update({
                avatar_url: avatarUrl,
                updated_at: new Date().toISOString()
            })
            .eq('id', this.currentUser.id);

        if (error) {
            throw new Error('Erro ao atualizar perfil');
        }

        this.updateAllAvatars(avatarUrl);
    }

    updateAllAvatars(avatarUrl) {
        const avatars = document.querySelectorAll('.user-avatar, .user-avatar-large');
        
        avatars.forEach(avatar => {
            const img = avatar.querySelector('.avatar-image, .avatar-image-large');
            const fallback = avatar.querySelector('.user-avatar-fallback, .user-avatar-fallback-large, .avatar-fallback');
            
            if (img) {
                img.src = avatarUrl;
                // CORREÇÃO: Estilo com !important para sobrepor CSS mobile
                img.style.cssText = `
                    width: 100% !important;
                    height: 100% !important;
                    border-radius: 50% !important;
                    object-fit: cover !important;
                    display: block !important;
                `;
            }
            
            if (fallback) {
                // CORREÇÃO: Garantir que esconde no mobile
                fallback.style.cssText = `
                    display: none !important;
                `;
            }
        });

        // Mostrar botão de remover
        const removeBtn = document.getElementById('removeAvatarBtn');
        if (removeBtn) {
            removeBtn.style.display = 'block';
        }
    }

    async removeAvatar() {
        if (!this.currentUser) return;

        try {
            // Remover do storage se existir
            const { data: profile } = await this.supabase
                .from('profiles')
                .select('avatar_url')
                .eq('id', this.currentUser.id)
                .single();

            if (profile && profile.avatar_url) {
                const fileName = profile.avatar_url.split('/').pop();
                await this.supabase.storage
                    .from(this.STORAGE_BUCKET)
                    .remove([`${this.currentUser.id}/${fileName}`]);
            }

            // Remover do perfil
            await this.supabase
                .from('profiles')
                .update({
                    avatar_url: null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', this.currentUser.id);

            // Restaurar fallbacks - CORREÇÃO PARA MOBILE
            const avatars = document.querySelectorAll('.user-avatar, .user-avatar-large');
            avatars.forEach(avatar => {
                const img = avatar.querySelector('.avatar-image, .avatar-image-large');
                const fallback = avatar.querySelector('.user-avatar-fallback, .user-avatar-fallback-large, .avatar-fallback');
                
                if (img) {
                    // CORREÇÃO: Garantir que esconde no mobile
                    img.style.cssText = `
                        display: none !important;
                    `;
                }
                
                if (fallback) {
                    // CORREÇÃO: Garantir que mostra no mobile
                    fallback.style.cssText = `
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        width: 100% !important;
                        height: 100% !important;
                    `;
                }
            });

            // Esconder botão de remover
            const removeBtn = document.getElementById('removeAvatarBtn');
            if (removeBtn) {
                removeBtn.style.display = 'none';
            }

            this.showNotification('Avatar removido com sucesso!', 'success');

        } catch (error) {
            this.showNotification('Erro ao remover avatar', 'error');
        }
    }

    async loadCurrentAvatar() {
        if (!this.currentUser) return;

        try {
            const { data: profile, error } = await this.supabase
                .from('profiles')
                .select('avatar_url')
                .eq('id', this.currentUser.id)
                .single();

            if (error) return;

            if (profile && profile.avatar_url) {
                this.updateAllAvatars(profile.avatar_url);
            }

        } catch (error) {
            // Silencioso
        }
    }

    showProgress(show) {
        const progress = document.querySelector('.upload-progress');
        if (!progress) return;

        if (show) {
            progress.style.display = 'block';
            const progressFill = progress.querySelector('.progress-fill');
            if (progressFill) {
                progressFill.style.width = '0%';
                setTimeout(() => {
                    progressFill.style.width = '70%';
                }, 100);
            }
        } else {
            progress.style.display = 'none';
        }
    }

    showNotification(message, type = 'info') {
        // Usar sistema de notificação existente se disponível
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, type);
            return;
        }

        // Fallback simples
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-message">${message}</span>
                <button class="notification-close">×</button>
            </div>
        `;

        document.body.appendChild(notification);

        notification.querySelector('.notification-close').onclick = () => notification.remove();

        setTimeout(() => {
            if (notification.parentElement) notification.remove();
        }, 4000);
    }
}

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    new AvatarUpload();
});