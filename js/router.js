
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
// 📍 세무인사이드 라우팅 시스템
console.log('Router system loaded');

// 라우터 클래스
class Router {
    constructor() {
        this.routes = {
            '/': 'login',
            '/login': 'login',
            '/register': 'register',
            '/signup': 'register', 
            '/dashboard': 'dashboard',
            '/home': 'dashboard',
            '/mypage': 'mypage',
            '/profile': 'mypage',
            '/admin': 'admin',
            '/exam': 'exam'
        };
        
        this.currentPath = '';
        this.init();
    }
    
    init() {
        // 브라우저 뒤로가기/앞으로가기 처리
        window.addEventListener('popstate', (e) => {
            this.handleRoute(window.location.pathname + window.location.hash);
        });
        
        // 해시 변경 처리
        window.addEventListener('hashchange', () => {
            this.handleRoute(window.location.hash);
        });
        
        // URL 정리 후 초기 라우트 처리
        this.cleanCurrentURL();
        this.handleRoute(window.location.hash || '/');
        
        // URL 표시 업데이트 (테스트용)
        this.updateURLDisplay();
    }
    
    // 현재 URL 정리 함수
    cleanCurrentURL() {
        const currentURL = window.location.href;
        
        // 중복된 해시나 잘못된 형태 확인
        if (currentURL.includes('#/index.html#/') || currentURL.includes('##')) {
            console.log('🧹 Cleaning malformed URL:', currentURL);
            
            // 기본 URL 추출
            const baseURL = window.location.origin + window.location.pathname.split('#')[0];
            
            // 해시 부분 추출 및 정리
            let hashPart = '';
            if (currentURL.includes('#/')) {
                const parts = currentURL.split('#/');
                hashPart = parts[parts.length - 1]; // 마지막 부분 사용
                
                if (hashPart && !hashPart.startsWith('/')) {
                    hashPart = '/' + hashPart;
                }
            }
            
            // 정리된 URL 생성
            const cleanURL = hashPart ? `${baseURL}#${hashPart}` : baseURL;
            
            console.log('✅ URL cleaned to:', cleanURL);
            window.history.replaceState({}, '', cleanURL);
        }
    }
    
    updateURLDisplay() {
        const urlElement = document.getElementById('current-url');
        if (urlElement) {
            urlElement.textContent = window.location.href;
        }
        
        // 1초마다 URL 업데이트
        setTimeout(() => this.updateURLDisplay(), 1000);
    }
    
    handleRoute(path) {
        // 해시 경로 정리 - 중복 해시 제거
        if (path.startsWith('#')) {
            path = path.substring(1);
        }
        
        // 중복된 경로 정리 (예: /index.html#/login → /login)
        if (path.includes('#/')) {
            path = path.split('#/').pop();
            if (!path.startsWith('/')) {
                path = '/' + path;
            }
        }
        
        if (!path || path === '/' || path === '') {
            path = '/login';
        }
        
        const route = this.routes[path] || 'login';
        this.currentPath = path;
        
        console.log(`🛣️ Navigating to: ${path} -> ${route}`);
        
        // URL 업데이트
        this.updateURL(path);
        
        // 페이지 표시
        this.showPage(route);
        
        // 페이지 제목 업데이트
        this.updatePageTitle(route);
    }
    
    updateURL(path) {
        // 기본 URL (index.html까지)
        const baseURL = window.location.origin + window.location.pathname;
        let newURL;
        
        // URL 정리 (기존 해시 제거)
        const cleanBaseURL = baseURL.split('#')[0];
        
        if (path === '/login' || path === '/') {
            newURL = cleanBaseURL;
        } else {
            newURL = `${cleanBaseURL}#${path}`;
        }
        
        console.log(`🔗 URL Update: ${window.location.href} → ${newURL}`);
        
        // 현재 URL과 다를 때만 업데이트
        if (window.location.href !== newURL) {
            window.history.replaceState({ path }, '', newURL);
            console.log(`✅ URL updated to: ${newURL}`);
        }
    }
    
    updatePageTitle(route) {
        const titles = {
            'login': '세무인사이드 - 로그인',
            'register': '세무인사이드 - 회원가입', 
            'dashboard': '세무인사이드 - 대시보드',
            'mypage': '세무인사이드 - 마이페이지',
            'admin': '세무인사이드 - 관리자',
            'exam': '세무인사이드 - 시험응시'
        };
        
        document.title = titles[route] || '세무인사이드';
    }
    
    showPage(route) {
        // 모든 페이지 숨기기
        document.querySelectorAll('.page-section').forEach(section => {
            section.classList.add('hidden');
        });
        
        // 해당 페이지 표시
        switch(route) {
            case 'register':
                this.showRegisterPage();
                break;
            case 'dashboard':
                this.showDashboardPage();
                break;
            case 'mypage':
                this.showMyPage();
                break;
            case 'admin':
                this.showAdminPage();
                break;
            case 'exam':
                this.showExamPage();
                break;
            case 'login':
            default:
                this.showLoginPage();
                break;
        }
    }
    
    // 페이지 표시 함수들
    showLoginPage() {
        document.getElementById('login-page').classList.remove('hidden');
        console.log('📱 Login page displayed');
    }
    
    showRegisterPage() {
        document.getElementById('register-page').classList.remove('hidden');
        console.log('📱 Register page displayed');
    }
    
    showDashboardPage() {
        console.log('🔍 Attempting to show dashboard page...');
        
        // 실제 HTML ID는 'dashboard'입니다
        const dashboardPage = document.getElementById('dashboard');
        if (dashboardPage) {
            dashboardPage.classList.remove('hidden');
            console.log('✅ Dashboard page element found and shown');
        } else {
            console.error('❌ Dashboard page element not found! Available elements:', 
                Array.from(document.querySelectorAll('[id]')).map(el => el.id));
        }
        
        // 대시보드 콘텐츠 로드
        this.loadDashboardContent();
        console.log('📱 Dashboard page displayed');
    }
    
    showMyPage() {
        // 마이페이지는 대시보드와 같은 레이아웃을 사용하되 콘텐츠만 변경
        const dashboardPage = document.getElementById('dashboard');
        if (dashboardPage) {
            dashboardPage.classList.remove('hidden');
            console.log('✅ MyPage using dashboard layout');
        }
        
        // 마이페이지 콘텐츠로 변경
        this.loadMyPageContent();
        console.log('📱 MyPage displayed');
    }
    
    showAdminPage() {
        document.getElementById('admin-page').classList.remove('hidden');
        console.log('📱 Admin page displayed');
    }
    
    showExamPage() {
        document.getElementById('exam-page').classList.remove('hidden');
        console.log('📱 Exam page displayed');
    }
    
    // 네비게이션 함수
    navigateTo(path) {
        if (!path.startsWith('/')) {
            path = '/' + path;
        }
        window.location.hash = path;
    }
    
    // 대시보드 콘텐츠 로드
    loadDashboardContent() {
        // 대시보드는 기존 HTML 구조를 그대로 사용
        const examsList = document.getElementById('exams-list');
        if (examsList) {
            examsList.innerHTML = `
                <div class="exam-card">
                    <div class="exam-header">
                        <div>
                            <h4 class="exam-title">2024년 1분기 부가가치세 평가</h4>
                            <span class="exam-status available">응시 가능</span>
                        </div>
                    </div>
                    <p class="exam-description">부가가치세 기본 개념과 실무 적용 능력을 평가하는 시험입니다.</p>
                    <div class="exam-meta">
                        <span><i class="fas fa-clock"></i> 60분</span>
                        <span><i class="fas fa-question-circle"></i> 20문항</span>
                        <span><i class="fas fa-calendar"></i> 언제든지</span>
                    </div>
                    <div class="exam-actions">
                        <button class="btn btn-primary" onclick="router.navigateTo('/exam')">
                            <i class="fas fa-play"></i> 시험 시작
                        </button>
                    </div>
                </div>
                
                <div class="exam-card">
                    <div class="exam-header">
                        <div>
                            <h4 class="exam-title">소득세법 기본 평가</h4>
                            <span class="exam-status available">응시 가능</span>
                        </div>
                    </div>
                    <p class="exam-description">소득세법의 기본 이론과 계산 능력을 평가합니다.</p>
                    <div class="exam-meta">
                        <span><i class="fas fa-clock"></i> 45분</span>
                        <span><i class="fas fa-question-circle"></i> 15문항</span>
                        <span><i class="fas fa-calendar"></i> 언제든지</span>
                    </div>
                    <div class="exam-actions">
                        <button class="btn btn-primary" onclick="router.navigateTo('/exam')">
                            <i class="fas fa-play"></i> 시험 시작
                        </button>
                    </div>
                </div>
            `;
            console.log('✅ Dashboard content loaded');
        } else {
            console.error('❌ Exams list element not found');
        }
        
        // 네비게이션 메뉴에 라우터 연결
        this.setupNavigation();
    }
    
    // 네비게이션 설정
    setupNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const tab = link.getAttribute('data-tab');
                
                // 네비게이션 활성 상태 변경
                navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
                
                // 탭 콘텐츠 변경
                if (tab === 'profile') {
                    this.navigateTo('/mypage');
                } else if (tab === 'admin') {
                    this.navigateTo('/admin');
                }
            });
        });
        
        // 로그아웃 버튼
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.navigateTo('/login');
            });
        }
    }
    
    // 마이페이지 콘텐츠 로드
    loadMyPageContent() {
        const mainContent = document.querySelector('#dashboard .main-content');
        if (mainContent) {
            mainContent.innerHTML = `
                <div class="page-header">
                    <h2><i class="fas fa-user"></i> 마이페이지</h2>
                    <p>개인 정보 및 시험 이력을 관리할 수 있습니다.</p>
                    <button class="btn btn-secondary" onclick="router.navigateTo('/dashboard')">
                        <i class="fas fa-arrow-left"></i> 대시보드로
                    </button>
                </div>
                
                <div class="profile-section">
                    <div class="profile-card">
                        <h3><i class="fas fa-id-card"></i> 개인정보</h3>
                        <div class="profile-info">
                            <div class="info-row">
                                <span class="label">이름:</span>
                                <span class="value" id="profile-name">로딩중...</span>
                            </div>
                            <div class="info-row">
                                <span class="label">이메일:</span>
                                <span class="value" id="profile-email">로딩중...</span>
                            </div>
                            <div class="info-row">
                                <span class="label">부서:</span>
                                <span class="value" id="profile-department">로딩중...</span>
                            </div>
                            <div class="info-row">
                                <span class="label">입사일:</span>
                                <span class="value" id="profile-hire-date">로딩중...</span>
                            </div>
                        </div>
                        <button class="btn btn-primary" onclick="editProfile()">
                            <i class="fas fa-edit"></i> 정보 수정
                        </button>
                    </div>
                    
                    <div class="exam-history-card">
                        <h3><i class="fas fa-history"></i> 시험 이력</h3>
                        <div id="exam-history">
                            <p>시험 이력을 불러오는 중...</p>
                        </div>
                    </div>
                </div>
            `;
            
            // 프로필 정보 로드
            this.loadProfileInfo();
        }
    }
    
    // 프로필 정보 로드
    async loadProfileInfo() {
        try {
            if (currentUser) {
                document.getElementById('profile-name').textContent = currentUser.name || 'N/A';
                document.getElementById('profile-email').textContent = currentUser.email || 'N/A';
                document.getElementById('profile-department').textContent = currentUser.department || 'N/A';
                document.getElementById('profile-hire-date').textContent = currentUser.hire_date || 'N/A';
            } else {
                document.getElementById('profile-name').textContent = '로그인이 필요합니다';
                document.getElementById('profile-email').textContent = '-';
                document.getElementById('profile-department').textContent = '-';
                document.getElementById('profile-hire-date').textContent = '-';
            }
        } catch (error) {
            console.error('프로필 정보 로드 실패:', error);
        }
    }
}

// 전역 라우터 인스턴스 생성
const router = new Router();

// 전역 함수로 내보내기
window.router = router;
window.navigateTo = (path) => router.navigateTo(path);

// 프로필 수정 함수
function editProfile() {
    alert('프로필 수정 기능은 추후 구현 예정입니다.');
}

console.log('✅ Router system initialized');
