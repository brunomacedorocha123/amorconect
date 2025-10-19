// index.js - JavaScript específico para a página inicial
document.addEventListener('DOMContentLoaded', function() {
    // ========== MENU MOBILE ==========
    const menuToggle = document.querySelector('.menu-toggle');
    const nav = document.querySelector('.nav');
    const body = document.querySelector('body');
    
    function toggleMenu() {
        if (menuToggle && nav) {
            menuToggle.classList.toggle('active');
            nav.classList.toggle('active');
            
            // Previne scroll do body quando menu está aberto
            if (nav.classList.contains('active')) {
                body.style.overflow = 'hidden';
            } else {
                body.style.overflow = '';
            }
        }
    }
    
    if (menuToggle) {
        menuToggle.addEventListener('click', toggleMenu);
    }
    
    // Fechar menu ao clicar em links
    document.querySelectorAll('.nav-list a').forEach(link => {
        link.addEventListener('click', (e) => {
            // Se é link interno (começa com #), faz smooth scroll
            if (link.getAttribute('href').startsWith('#')) {
                e.preventDefault();
                const targetId = link.getAttribute('href');
                const targetElement = document.querySelector(targetId);
                
                if (targetElement) {
                    // Fecha o menu mobile
                    if (menuToggle && menuToggle.classList.contains('active')) {
                        toggleMenu();
                    }
                    
                    // Smooth scroll para a seção
                    const headerHeight = document.querySelector('.header').offsetHeight;
                    const targetPosition = targetElement.offsetTop - headerHeight - 20;
                    
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                }
            } else {
                // Se é link externo, só fecha o menu
                if (menuToggle && menuToggle.classList.contains('active')) {
                    toggleMenu();
                }
            }
        });
    });
    
    // Fechar menu ao clicar fora
    document.addEventListener('click', (e) => {
        if (nav && nav.classList.contains('active') && 
            !nav.contains(e.target) && 
            !menuToggle.contains(e.target)) {
            toggleMenu();
        }
    });
    
    // Fechar menu com ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && nav && nav.classList.contains('active')) {
            toggleMenu();
        }
    });
    
    // ========== SCROLL SUAVE PARA LINKS INTERNOS ==========
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            
            // Ignora links que são só "#"
            if (href === '#') return;
            
            const targetElement = document.querySelector(href);
            
            if (targetElement) {
                e.preventDefault();
                const headerHeight = document.querySelector('.header').offsetHeight;
                const targetPosition = targetElement.offsetTop - headerHeight - 20;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // ========== ANIMAÇÃO ON SCROLL ==========
    function initScrollAnimations() {
        const animatedElements = document.querySelectorAll('.feature-card, .step, .testimonial-card');
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });
        
        // Configura estado inicial dos elementos
        animatedElements.forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(30px)';
            el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            observer.observe(el);
        });
    }
    
    // ========== HEADER SCROLL EFFECT ==========
    function initHeaderScroll() {
        const header = document.querySelector('.header');
        let lastScrollY = window.scrollY;
        
        window.addEventListener('scroll', () => {
            if (window.scrollY > 100) {
                header.style.background = 'var(--primary)';
                header.style.boxShadow = 'var(--shadow-lg)';
            } else {
                header.style.background = 'var(--primary)';
                header.style.boxShadow = 'var(--shadow)';
            }
            
            lastScrollY = window.scrollY;
        });
    }
    
    // ========== BOTÃO "SAIBA MAIS" HERO ==========
    function initHeroButton() {
        const saibaMaisBtn = document.querySelector('.hero-buttons .btn-outline');
        
        if (saibaMaisBtn) {
            saibaMaisBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const targetSection = document.querySelector('#como-funciona');
                
                if (targetSection) {
                    const headerHeight = document.querySelector('.header').offsetHeight;
                    const targetPosition = targetSection.offsetTop - headerHeight - 20;
                    
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                }
            });
        }
    }
    
    // ========== INICIALIZAÇÃO ==========
    function init() {
        initScrollAnimations();
        initHeaderScroll();
        initHeroButton();
        
        // Remove focus outline para clicks, mantém para keyboard
        document.addEventListener('click', (e) => {
            if (e.target.matches('button, a')) {
                e.target.classList.add('clicked');
            }
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                document.querySelectorAll('.clicked').forEach(el => {
                    el.classList.remove('clicked');
                });
            }
        });
    }
    
    // Inicializa quando DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // ========== TRATAMENTO DE ERROS ==========
    window.addEventListener('error', (e) => {
        console.error('Erro na página:', e.error);
    });
});