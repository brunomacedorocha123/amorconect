// Configuração Supabase
const SUPABASE_URL = 'https://rohsbrkbdlbewonibclf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvaHNicmtiZGxiZXdvbmliY2xmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MTc5MDMsImV4cCI6MjA3NjE5MzkwM30.PUbV15B1wUoU_-dfggCwbsS5U7C1YsoTrtcahEKn_Oc';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', function() {
    // CONFIGURAR PRAZOS DE VALIDADE
    document.querySelectorAll('.expiration-option').forEach(option => {
        option.addEventListener('click', function() {
            document.querySelectorAll('.expiration-option').forEach(opt => {
                opt.classList.remove('selected');
                opt.querySelector('input').checked = false;
            });
            this.classList.add('selected');
            this.querySelector('input').checked = true;
        });
    });
    
    // CONFIGURAR USUÁRIO ESPECÍFICO
    document.querySelectorAll('input[name="userType"]').forEach(radio => {
        radio.addEventListener('change', function() {
            document.getElementById('userSpecific').style.display = 
                this.value === 'specific' ? 'block' : 'none';
        });
    });
    
    // PREVIEW EM TEMPO REAL
    document.getElementById('notificationTitle').addEventListener('input', updatePreview);
    document.getElementById('notificationMessage').addEventListener('input', updatePreview);
    document.getElementById('notificationCategory').addEventListener('change', updatePreview);
    document.getElementById('specificUserId').addEventListener('input', updatePreview);
    
    // ENVIAR NOTIFICAÇÃO
    document.getElementById('notificationForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const submitBtn = document.getElementById('submitBtn');
        const originalText = submitBtn.innerHTML;
        
        try {
            submitBtn.innerHTML = '⏳ Enviando...';
            submitBtn.disabled = true;
            
            // VALIDAÇÃO
            const title = document.getElementById('notificationTitle').value.trim();
            const message = document.getElementById('notificationMessage').value.trim();
            const category = document.getElementById('notificationCategory').value;
            const userType = document.querySelector('input[name="userType"]:checked').value;
            const specificUserId = document.getElementById('specificUserId').value.trim();
            const expiration = document.querySelector('input[name="expiration"]:checked').value;
            
            if (!title) {
                alert('❌ Por favor, insira um título para a notificação.');
                return;
            }
            
            if (!message) {
                alert('❌ Por favor, insira uma mensagem para a notificação.');
                return;
            }
            
            if (!category) {
                alert('❌ Por favor, selecione uma categoria.');
                return;
            }
            
            if (userType === 'specific' && !specificUserId) {
                alert('❌ Por favor, insira o ID do usuário específico.');
                return;
            }
            
            // ENVIAR PARA O SUPABASE
            const notificationData = {
                title: title,
                message: message,
                category_id: parseInt(category),
                expiration_days: parseInt(expiration),
                is_active: true
            };
            
            // Buscar user_type_id
            let userTypeName = 'Todos';
            if (userType === 'free') userTypeName = 'Free';
            if (userType === 'premium') userTypeName = 'Premium';
            
            const { data: userTypeData } = await supabase
                .from('user_types')
                .select('id')
                .eq('name', userTypeName)
                .single();
                
            if (userTypeData) {
                notificationData.user_type_id = userTypeData.id;
            }
            
            // Inserir notificação
            const { data: notification, error } = await supabase
                .from('notifications')
                .insert(notificationData)
                .select()
                .single();
                
            if (error) throw error;
            
            // Se for usuário específico, adicionar na tabela de usuários
            if (userType === 'specific' && specificUserId) {
                await supabase
                    .from('notification_users')
                    .insert({
                        notification_id: notification.id,
                        user_id: specificUserId
                    });
            }
            
            alert('✅ Notificação enviada com sucesso!');
            document.getElementById('notificationForm').reset();
            document.getElementById('userSpecific').style.display = 'none';
            document.getElementById('notificationPreview').style.display = 'none';
            
            // Resetar prazos
            document.querySelectorAll('.expiration-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            document.querySelector('.expiration-option:nth-child(2)').classList.add('selected');
            
        } catch (error) {
            alert('❌ Erro ao enviar notificação: ' + error.message);
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });
    
    // INICIAR PREVIEW
    updatePreview();
});

function updatePreview() {
    const title = document.getElementById('notificationTitle').value;
    const message = document.getElementById('notificationMessage').value;
    const category = document.getElementById('notificationCategory');
    const categoryText = category.options[category.selectedIndex].text;
    const userType = document.querySelector('input[name="userType"]:checked').value;
    const specificUserId = document.getElementById('specificUserId').value;
    const preview = document.getElementById('notificationPreview');

    preview.style.display = 'block';
    
    document.getElementById('previewTitle').textContent = title || '(Sem título)';
    document.getElementById('previewMessage').textContent = message || '(Sem mensagem)';
    document.getElementById('previewCategory').textContent = 'Categoria: ' + (category.value ? categoryText : 'Não selecionada');
    
    let destinatarios = '';
    switch(userType) {
        case 'all': destinatarios = '👥 Todos os usuários'; break;
        case 'free': destinatarios = '🆓 Usuários Free'; break;
        case 'premium': destinatarios = '⭐ Usuários Premium'; break;
        case 'specific': destinatarios = specificUserId ? `👤 Usuário específico: ${specificUserId}` : '👤 Usuário específico: (ID não informado)'; break;
    }
    
    let destinatarioElement = document.getElementById('previewDestinatarios');
    if (!destinatarioElement) {
        destinatarioElement = document.createElement('div');
        destinatarioElement.id = 'previewDestinatarios';
        destinatarioElement.style.marginTop = '10px';
        destinatarioElement.style.fontSize = '0.9em';
        destinatarioElement.style.color = '#666';
        document.querySelector('.preview-content').appendChild(destinatarioElement);
    }
    destinatarioElement.textContent = `Para: ${destinatarios}`;
}