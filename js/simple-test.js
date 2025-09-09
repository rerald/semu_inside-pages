
// 프로덕션 환경에서 선택적 console.log 비활성화
if (typeof window !== "undefined" && window.location && !window.location.hostname.includes("localhost")) {
    const originalConsoleLog = console.log;
    const originalConsoleWarn = console.warn;
    const originalConsoleError = console.error;
    
    // AI 관련 로그와 중요한 디버깅 로그만 허용
    console.log = function(...args) {
        if (args[0] && typeof args[0] === 'string' && (
            args[0].includes('🔍 AI') || 
            args[0].includes('🔧 파싱') || 
            args[0].includes('✅ JSON') ||
            args[0].includes('🆘 긴급') ||
            args[0].includes('❌ AI') ||
            args[0].includes('⚠️ AI')
        )) {
            originalConsoleLog.apply(console, args);
        }
    };
    
    console.warn = function(...args) {
        if (args[0] && typeof args[0] === 'string' && args[0].includes('AI')) {
            originalConsoleWarn.apply(console, args);
        }
    };
    
    console.error = function(...args) {
        // 에러는 항상 표시
        originalConsoleError.apply(console, args);
    };
    
    console.info = function() {};
    console.debug = function() {};
}
// 간단한 테스트용 스크립트
console.log('Simple test script loaded');

// DOM 로드 완료 후 실행
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, setting up simple handlers...');
    
    // 로딩 화면 즉시 숨기기
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
        loadingElement.classList.add('hidden');
        console.log('Loading screen hidden');
    }
    
    // 회원가입 폼 처리
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            console.log('Register form submitted!');
            
            const formData = new FormData(registerForm);
            const userData = {
                name: formData.get('name'),
                email: formData.get('email'),
                department: formData.get('department'),
                hire_date: formData.get('hire_date'),
                phone: formData.get('phone')
            };
            
            console.log('User data:', userData);
            
            // 성공 메시지 표시
            alert('회원가입이 완료되었습니다!\n테스트 모드로 실행 중입니다.');
            
            // 로그인 페이지로 이동
            showLoginPage();
        });
    }
    
    // 로그인 폼 처리
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            console.log('Login form submitted!');
            
            const formData = new FormData(loginForm);
            const loginData = {
                email: formData.get('email'),
                password: formData.get('password')
            };
            
            console.log('Login data:', loginData);
            
            // 성공 메시지 표시
            alert('로그인 성공!\n테스트 모드로 실행 중입니다.');
            
            // 대시보드로 이동
            showDashboard();
        });
    }
    
    // 페이지 전환 함수들
    function showLoginPage() {
        hideAllPages();
        document.getElementById('login-page').classList.remove('hidden');
    }
    
    function showRegisterPage() {
        hideAllPages();
        document.getElementById('register-page').classList.remove('hidden');
    }
    
    function showDashboard() {
        hideAllPages();
        document.getElementById('dashboard').classList.remove('hidden');
        
        // 사용자 이름 표시
        const userNameEl = document.getElementById('user-name');
        if (userNameEl) {
            userNameEl.textContent = '테스트 사용자';
        }
    }
    
    function hideAllPages() {
        document.querySelectorAll('.page').forEach(page => {
            page.classList.add('hidden');
        });
    }
    
    // 회원가입/로그인 전환 링크
    const showRegisterLink = document.getElementById('show-register');
    const showLoginLink = document.getElementById('show-login');
    
    if (showRegisterLink) {
        showRegisterLink.addEventListener('click', function(e) {
            e.preventDefault();
            showRegisterPage();
        });
    }
    
    if (showLoginLink) {
        showLoginLink.addEventListener('click', function(e) {
            e.preventDefault();
            showLoginPage();
        });
    }
    
    // 로그아웃 버튼
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            alert('로그아웃되었습니다.');
            showLoginPage();
        });
    }
    
    // 탭 네비게이션
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // 활성 탭 변경
            document.querySelectorAll('.nav-link').forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
            
            // 탭 콘텐츠 변경
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            const targetTab = this.getAttribute('data-tab');
            const targetContent = document.getElementById(`${targetTab}-tab`);
            if (targetContent) {
                targetContent.classList.add('active');
            }
        });
    });
    
    // 초기 페이지 표시
    showLoginPage();
    
    console.log('Simple test handlers setup complete!');
});
