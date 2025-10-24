// avatar.js - Sistema Completo de Upload de Avatar
class AvatarUpload {
    constructor() {
        this.supabase = supabase;
        this.currentUser = null;
        this.MAX_FILE_SIZE = 5 * 1024 * 1024;
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
        const { data: { user } } = await this.supabase.auth.getUser();
        if (user) {
            this.currentUser = user;
        }
    }

    createUploadInterface() {
        if (!document.getElementById('avatarUpload')) {
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.id = 'avatarUpload';
            fileInput.name = 'avatarUpload';
            fileInput.accept = 'image/jpeg,image/jpg,image/png,image/webp';
            fileInput.style.display = 'none';
            document.body.appendChild(fileInput);
        }

        const avatarLarge = document.querySelector('.user-avatar-large');
        if (avatarLarge) {
            avatarLarge.style.cursor = 'pointer';
            avatarLarge.title = 'Clique para alterar a foto';
            
            if (!avatarLarge.querySelector('.avatar-overlay-large')) {
                const overlay = document.createElement('div');
                overlay.className = 'avatar-overlay-large';
                overlay.innerHTML = '<i class="fas fa-camera"></i><span>Clique para alterar</span>';
                avatarLarge.appendChild(overlay);
            }
        }
    }

    setupEventListeners() {
        const avatarLarge = document.querySelector('.user-avatar-large');
        if (avatarLarge) {
            avatarLarge.addEventListener('click', (e) => {
                this.triggerFileInput();
            });
        }

        const uploadBtn = document.getElementById('uploadAvatarBtn');
        if (uploadBtn) {
            uploadBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.triggerFileInput();
            });
        }

        const removeBtn = document.getElementById('removeAvatarBtn');
        if (removeBtn) {
            removeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.removeAvatar();
            });
        }

        const fileInput = document.getElementById('avatarUpload');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                this.handleFileSelect(e);
            });
        }

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
                this.updateAllAvatarsWithData(e.target.result);
                
                const removeBtn = document.getElementById('removeAvatarBtn');
                if (removeBtn) {
                    removeBtn.style.display = 'block';
                }

                resolve();
            };
            reader.readAsDataURL(file);
        });
    }

    updateAllAvatarsWithData(imageData) {
        const headerAvatar = document.querySelector('.user-avatar');
        if (headerAvatar) {
            let headerImg = headerAvatar.querySelector('.avatar-image');
            let headerFallback = headerAvatar.querySelector('.user-avatar-fallback, .avatar-fallback');
            
            if (!headerImg) {
                headerImg = document.createElement('img');
                headerImg.className = 'avatar-image';
                headerImg.style.cssText = `
                    width: 100%;
                    height: 100%;
                    border-radius: 50%;
                    object-fit: cover;
                    display: block;
                `;
                headerAvatar.appendChild(headerImg);
            }
            
            headerImg.src = imageData;
            headerImg.style.display = 'block';
            
            if (headerFallback) {
                headerFallback.style.display = 'none';
            }
        }

        const largeAvatar = document.querySelector('.user-avatar-large');
        if (largeAvatar) {
            let largeImg = largeAvatar.querySelector('.avatar-image-large');
            let largeFallback = largeAvatar.querySelector('.user-avatar-fallback-large, .avatar-fallback');
            
            if (!largeImg) {
                largeImg = document.createElement('img');
                largeImg.className = 'avatar-image-large';
                largeImg.style.cssText = `
                    width: 100%;
                    height: 100%;
                    border-radius: 50%;
                    object-fit: cover;
                    display: block;
                `;
                largeAvatar.appendChild(largeImg);
            }
            
            largeImg.src = imageData;
            largeImg.style.display = 'block';
            
            if (largeFallback) {
                largeFallback.style.display = 'none';
            }
        }
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

            const { data, error } = await this.supabase.storage
                .from(this.STORAGE_BUCKET)
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: true
                });

            if (error) {
                throw new Error('Erro no upload');
            }

            const { data: { publicUrl } } = this.supabase.storage
                .from(this.STORAGE_BUCKET)
                .getPublicUrl(filePath);

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
        const headerAvatar = document.querySelector('.user-avatar');
        if (headerAvatar) {
            let headerImg = headerAvatar.querySelector('.avatar-image');
            let headerFallback = headerAvatar.querySelector('.user-avatar-fallback, .avatar-fallback');
            
            if (!headerImg) {
                headerImg = document.createElement('img');
                headerImg.className = 'avatar-image';
                headerImg.style.cssText = `
                    width: 100%;
                    height: 100%;
                    border-radius: 50%;
                    object-fit: cover;
                    display: block;
                `;
                headerAvatar.appendChild(headerImg);
            }
            
            headerImg.src = avatarUrl;
            headerImg.style.display = 'block';
            
            if (headerFallback) {
                headerFallback.style.display = 'none';
            }
        }

        const largeAvatar = document.querySelector('.user-avatar-large');
        if (largeAvatar) {
            let largeImg = largeAvatar.querySelector('.avatar-image-large');
            let largeFallback = largeAvatar.querySelector('.user-avatar-fallback-large, .avatar-fallback');
            
            if (!largeImg) {
                largeImg = document.createElement('img');
                largeImg.className = 'avatar-image-large';
                largeImg.style.cssText = `
                    width: 100%;
                    height: 100%;
                    border-radius: 50%;
                    object-fit: cover;
                    display: block;
                `;
                largeAvatar.appendChild(largeImg);
            }
            
            largeImg.src = avatarUrl;
            largeImg.style.display = 'block';
            
            if (largeFallback) {
                largeFallback.style.display = 'none';
            }
        }

        const removeBtn = document.getElementById('removeAvatarBtn');
        if (removeBtn) {
            removeBtn.style.display = 'block';
        }
    }

    async removeAvatar() {
        if (!this.currentUser) return;

        try {
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

            await this.supabase
                .from('profiles')
                .update({
                    avatar_url: null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', this.currentUser.id);

            const headerAvatar = document.querySelector('.user-avatar');
            if (headerAvatar) {
                const headerImg = headerAvatar.querySelector('.avatar-image');
                const headerFallback = headerAvatar.querySelector('.user-avatar-fallback, .avatar-fallback');
                
                if (headerImg) {
                    headerImg.style.display = 'none';
                }
                
                if (headerFallback) {
                    headerFallback.style.display = 'flex';
                }
            }

            const largeAvatar = document.querySelector('.user-avatar-large');
            if (largeAvatar) {
                const largeImg = largeAvatar.querySelector('.avatar-image-large');
                const largeFallback = largeAvatar.querySelector('.user-avatar-fallback-large, .avatar-fallback');
                
                if (largeImg) {
                    largeImg.style.display = 'none';
                }
                
                if (largeFallback) {
                    largeFallback.style.display = 'flex';
                }
            }

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
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, type);
            return;
        }

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

document.addEventListener('DOMContentLoaded', function() {
    new AvatarUpload();
});