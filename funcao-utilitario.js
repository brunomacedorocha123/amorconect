// 📄 /scripts/funcao-utilitario.js
import { supabase } from './supabase.js'

export const funcaoUtilitario = {
    // ✅ CALCULAR IDADE
    calcularIdade(dataNascimento) {
        try {
            if (!dataNascimento) return null
            const hoje = new Date()
            const nascimento = new Date(dataNascimento)
            let idade = hoje.getFullYear() - nascimento.getFullYear()
            const diffMes = hoje.getMonth() - nascimento.getMonth()
            
            if (diffMes < 0 || (diffMes === 0 && hoje.getDate() < nascimento.getDate())) {
                idade--
            }
            
            return idade
            
        } catch (error) {
            console.error('❌ Erro ao calcular idade:', error)
            return null
        }
    },

    // ✅ FORMATAR TEMPO RELATIVO
    formatarTempoRelativo(dataString) {
        try {
            const data = new Date(dataString)
            const agora = new Date()
            const diffMs = agora - data
            const diffMinutos = Math.floor(diffMs / 60000)
            const diffHoras = Math.floor(diffMs / 3600000)
            const diffDias = Math.floor(diffMs / 86400000)
            
            if (diffMinutos < 1) return 'Agora'
            if (diffMinutos < 60) return `${diffMinutos}min`
            if (diffHoras < 24) return `${diffHoras}h`
            if (diffDias < 7) return `${diffDias}d`
            return `${Math.floor(diffDias / 7)}sem`
            
        } catch (error) {
            console.error('❌ Erro ao formatar tempo:', error)
            return '--'
        }
    },

    // ✅ OBTER ÍCONE DO ZODÍACO
    obterIconeZodiaco(zodiaco) {
        const icones = {
            'aries': '♈', 'touro': '♉', 'gemeos': '♊', 'cancer': '♋',
            'leao': '♌', 'virgem': '♍', 'libra': '♎', 'escorpiao': '♏',
            'sagitario': '♐', 'capricornio': '♑', 'aquario': '♒', 'peixes': '♓'
        }
        return icones[zodiaco?.toLowerCase()] || '⭐'
    },

    // ✅ FORMATAR ZODÍACO
    formatarZodiaco(zodiaco) {
        const nomes = {
            'aries': 'Áries', 'touro': 'Touro', 'gemeos': 'Gêmeos', 'cancer': 'Câncer',
            'leao': 'Leão', 'virgem': 'Virgem', 'libra': 'Libra', 'escorpiao': 'Escorpião',
            'sagitario': 'Sagitário', 'capricornio': 'Capricórnio', 'aquario': 'Aquário', 'peixes': 'Peixes'
        }
        return nomes[zodiaco?.toLowerCase()] || zodiaco
    },

    // ✅ FORMATAR O QUE PROCURA
    formatarProcurando(procurando) {
        const opcoes = {
            'amizade': 'Amizade',
            'namoro': 'Namoro',
            'relacionamento_serio': 'Relacionamento Sério',
            'conversa': 'Apenas Conversa'
        }
        return opcoes[procurando] || procurando
    },

    // ✅ MOSTRAR ALERTA
    mostrarAlerta(mensagem, tipo = 'sucesso') {
        try {
            // Remover alertas existentes
            const existentes = document.querySelectorAll('.alerta-customizado')
            existentes.forEach(alerta => alerta.remove())
            
            // Cores por tipo
            const cores = {
                'sucesso': { bg: '#38a169', border: '#2f855a' },
                'erro': { bg: '#e53e3e', border: '#c53030' },
                'aviso': { bg: '#d69e2e', border: '#b7791f' },
                'info': { bg: '#3182ce', border: '#2c5aa0' }
            }
            
            const cor = cores[tipo] || cores.sucesso
            
            // Criar novo alerta
            const alerta = document.createElement('div')
            alerta.className = `alerta-customizado ${tipo}`
            alerta.textContent = mensagem
            alerta.style.cssText = `
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 1001;
                padding: 1rem 2rem;
                border-radius: 10px;
                color: white;
                font-weight: 600;
                background: ${cor.bg};
                box-shadow: 0 8px 25px rgba(0,0,0,0.15);
                animation: slideInDown 0.3s ease;
                text-align: center;
                min-width: 300px;
                max-width: 90%;
                border: 2px solid ${cor.border};
            `
            
            document.body.appendChild(alerta)
            
            // Remover após 3 segundos
            setTimeout(() => {
                alerta.style.animation = 'slideOutUp 0.3s ease'
                setTimeout(() => alerta.remove(), 300)
            }, 3000)
            
        } catch (error) {
            console.error('❌ Erro ao mostrar alerta:', error)
        }
    },

    // ✅ VALIDAR EMAIL
    validarEmail(email) {
        try {
            const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            return regexEmail.test(email)
        } catch (error) {
            console.error('❌ Erro ao validar email:', error)
            return false
        }
    },

    // ✅ FORMATAR NOME
    formatarNome(nome) {
        try {
            if (!nome) return ''
            return nome.trim().replace(/\b\w/g, l => l.toUpperCase())
        } catch (error) {
            console.error('❌ Erro ao formatar nome:', error)
            return nome || ''
        }
    },

    // ✅ OBTER INICIAIS
    obterIniciais(nome) {
        try {
            if (!nome) return 'U'
            return nome.trim().charAt(0).toUpperCase()
        } catch (error) {
            console.error('❌ Erro ao obter iniciais:', error)
            return 'U'
        }
    },

    // ✅ FORMATAÇÃO DE DATA
    formatarData(data, formato = 'pt-BR') {
        try {
            if (!data) return '--'
            const dataObj = new Date(data)
            return dataObj.toLocaleDateString(formato)
        } catch (error) {
            console.error('❌ Erro ao formatar data:', error)
            return '--'
        }
    },

    // ✅ FORMATAÇÃO DE MOEDA (BRL)
    formatarMoeda(valor, moeda = 'BRL') {
        try {
            if (!valor) return 'R$ 0,00'
            return new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: moeda
            }).format(valor)
        } catch (error) {
            console.error('❌ Erro ao formatar moeda:', error)
            return 'R$ 0,00'
        }
    },

    // ✅ TRUNCAR TEXTO
    truncarTexto(texto, limite = 100) {
        try {
            if (!texto) return ''
            if (texto.length <= limite) return texto
            return texto.substring(0, limite) + '...'
        } catch (error) {
            console.error('❌ Erro ao truncar texto:', error)
            return texto || ''
        }
    },

    // ✅ GERAR COR ALEATÓRIA
    gerarCorAleatoria() {
        const cores = [
            '#d1656d', '#dfc9ed', '#f6ecc5', '#38a169', 
            '#3182ce', '#d69e2e', '#805ad5', '#dd6b20'
        ]
        return cores[Math.floor(Math.random() * cores.length)]
    },

    // ✅ DEBOUNCE PARA PESQUISAS
    debounce(func, wait) {
        let timeout
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout)
                func(...args)
            }
            clearTimeout(timeout)
            timeout = setTimeout(later, wait)
        }
    },

    // ✅ VALIDAR SENHA
    validarSenha(senha) {
        try {
            if (!senha) return { valido: false, erro: 'Senha é obrigatória' }
            if (senha.length < 6) return { valido: false, erro: 'Senha deve ter pelo menos 6 caracteres' }
            return { valido: true, erro: null }
        } catch (error) {
            console.error('❌ Erro ao validar senha:', error)
            return { valido: false, erro: 'Erro ao validar senha' }
        }
    },

    // ✅ COPIAR PARA ÁREA DE TRANSFERÊNCIA
    async copiarParaClipboard(texto) {
        try {
            await navigator.clipboard.writeText(texto)
            this.mostrarAlerta('Copiado para a área de transferência!', 'sucesso')
            return true
        } catch (error) {
            console.error('❌ Erro ao copiar para clipboard:', error)
            this.mostrarAlerta('Erro ao copiar texto', 'erro')
            return false
        }
    },

    // ✅ DOWNLOAD DE IMAGEM
    async downloadImagem(url, nomeArquivo) {
        try {
            const response = await fetch(url)
            const blob = await response.blob()
            const blobUrl = window.URL.createObjectURL(blob)
            
            const link = document.createElement('a')
            link.href = blobUrl
            link.download = nomeArquivo
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            
            window.URL.revokeObjectURL(blobUrl)
            this.mostrarAlerta('Imagem baixada com sucesso!', 'sucesso')
            
        } catch (error) {
            console.error('❌ Erro ao baixar imagem:', error)
            this.mostrarAlerta('Erro ao baixar imagem', 'erro')
        }
    },

    // ✅ FORMATAR TELEFONE
    formatarTelefone(telefone) {
        try {
            if (!telefone) return ''
            
            // Remove tudo que não é número
            const numeros = telefone.replace(/\D/g, '')
            
            // Formatação para (11) 99999-9999
            if (numeros.length === 11) {
                return `(${numeros.substring(0, 2)}) ${numeros.substring(2, 7)}-${numeros.substring(7)}`
            }
            
            // Formatação para (11) 9999-9999
            if (numeros.length === 10) {
                return `(${numeros.substring(0, 2)}) ${numeros.substring(2, 6)}-${numeros.substring(6)}`
            }
            
            return telefone
            
        } catch (error) {
            console.error('❌ Erro ao formatar telefone:', error)
            return telefone
        }
    },

    // ✅ CALCULAR DISTÂNCIA ENTRE COORDENADAS (Haversine)
    calcularDistancia(lat1, lon1, lat2, lon2) {
        try {
            const R = 6371 // Raio da Terra em km
            const dLat = this.grausParaRadianos(lat2 - lat1)
            const dLon = this.grausParaRadianos(lon2 - lon1)
            
            const a = 
                Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(this.grausParaRadianos(lat1)) * Math.cos(this.grausParaRadianos(lat2)) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2)
            
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
            const distancia = R * c
            
            return Math.round(distancia)
            
        } catch (error) {
            console.error('❌ Erro ao calcular distância:', error)
            return null
        }
    },

    // ✅ CONVERTER GRAUS PARA RADIANOS
    grausParaRadianos(graus) {
        return graus * (Math.PI / 180)
    },

    // ✅ GERAR ID ÚNICO
    gerarIdUnico() {
        return 'id_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36)
    },

    // ✅ VERIFICAR SE É MOBILE
    isMobile() {
        return window.innerWidth <= 768
    },

    // ✅ SCROLL SUAVE
    scrollSuave(seletor, offset = 80) {
        try {
            const elemento = typeof seletor === 'string' 
                ? document.querySelector(seletor) 
                : seletor
            
            if (elemento) {
                const posicao = elemento.offsetTop - offset
                window.scrollTo({
                    top: posicao,
                    behavior: 'smooth'
                })
            }
        } catch (error) {
            console.error('❌ Erro no scroll suave:', error)
        }
    },

    // ✅ FORMATAR NÚMERO COM PONTUAÇÃO
    formatarNumero(numero) {
        try {
            if (!numero) return '0'
            return new Intl.NumberFormat('pt-BR').format(numero)
        } catch (error) {
            console.error('❌ Erro ao formatar número:', error)
            return numero.toString()
        }
    }
}

// ✅ EXPORTAÇÃO PADRÃO
export default funcaoUtilitario