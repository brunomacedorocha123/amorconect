// Configuração Supabase
const SUPABASE_URL = 'https://rohsbrkbdlbewonibclf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvaHNicmtiZGxiZXdvbmliY2xmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MTc5MDMsImV4cCI6MjA3NjE5MzkwM30.PUbV15B1wUoU_-dfggCwbsS5U7C1YsoTrtcahEKn_Oc';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', function() {
    // CONFIGURAR PRAZOS DE VALIDADE - CORRIGIDO
    document.querySelectorAll('.expiration-option').forEach(option => {
        option.addEventListener('click', function(e) {
            // IMPEDIR COMPORTAMENTO PADRÃO
            e.preventDefault();
            e.stopPropagation();
            
            // REMOVER SELEÇÃO ANTERIOR
            document.querySelectorAll('.expiration-option').forEach(opt => {
                opt.classList.remove('selected');
                const radio = opt.querySelector('input[type="radio"]');
                if (radio) radio.checked = false;
            });
            
            // SELECIONAR ATUAL
            this.classList.add('selected');
            const radio = this.querySelector('input[type="radio"]');
            if (radio) radio.checked = true;
        });
        
        // SELECIONAR PADRÃO (7 DIAS)
        const radio = option.querySelector('input[type="radio"]');
        if (radio && radio.checked) {
            option.classList.add('selected');
        }
    });
    
    // CONFIGURAR USUÁRIO ESPECÍFICO
    document.querySelectorAll('input[name="userType"]').forEach(radio => {
        radio.addEventListener('change', function() {
            document.getElementById('userSpecific').style.display = 
                this.value === 'specific' ? 'block' : 'none';
        });
    });
    
    // ENVIAR NOTIFICAÇÃO - CORRIGIDO
    document.getElementById('notificationForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // DADOS DO FORMULÁRIO
        const formData = new FormData(this);
        const title = document.getElementById('notificationTitle').value.trim();
        const message = document.getElementById('notificationMessage').value.trim();
        const category = document.getElementById('notificationCategory').value;
        const userType = document.querySelector('input[name="userType"]:checked').value;
        const specificUserId = document.getElementById('specificUserId').value.trim();
        const expiration = document.querySelector('input[name="expiration"]:checked').value;
        
        // VALIDAÇÃO
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
        
        // BOTÃO DE ENVIO
        const submitBtn = document.getElementById('submitBtn');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '⏳ Enviando...';
        submitBtn.disabled = true;
        
        try {
            // PREPARAR DADOS
            const notificationData = {
                title: title,
                message: message,
                category_id: parseInt(category),
                expiration_days: parseInt(expiration),
                is_active: true
            };
            
            // ENVIAR PARA SUPABASE
            const { data: notification, error } = await supabase
                .from('notifications')
                .insert(notificationData)
                .select()
                .single();
                
            if (error) {
                throw new Error(error.message);
            }
            
            alert('✅ Notificação enviada com sucesso!');
            
            // LIMPAR FORMULÁRIO - MANTENDO CATEGORIAS
            document.getElementById('notificationTitle').value = '';
            document.getElementById('notificationMessage').value = '';
            document.getElementById('specificUserId').value = '';
            document.getElementById('userSpecific').style.display = 'none';
            
            // MANTER CATEGORIA SELECIONADA
            // MANTER PRAZO SELECIONADO (7 dias)
            
        } catch (error) {
            alert('❌ Erro: ' + error.message);
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });
});