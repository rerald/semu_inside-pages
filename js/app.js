
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
// 메인 애플리케이션 초기화 및 라우팅

class App {
    constructor() {
        this.isInitialized = false;
        this.currentPage = null;
    }

    // 애플리케이션 초기화
    async init() {
        try {
            console.log('Initializing Semu Inside Exam Platform...');
            
            // 로딩 표시
            Utils.showLoading();

            // 인증 시스템 초기화
            const isAuthenticated = await authManager.init();

            if (isAuthenticated) {
                // 인증된 사용자: 대시보드 표시
                authManager.showDashboard();
                
                // 대시보드 초기화
                await dashboardManager.init();
                
                this.currentPage = 'dashboard';
            } else {
                // 비인증 사용자: 로그인 페이지 표시
                authManager.showLoginPage();
                this.currentPage = 'login';
            }

            // 인증 상태 변화 리스너 설정
            this.setupAuthListener();
            
            // 키보드 단축키 설정
            this.setupKeyboardShortcuts();
            
            // 전역 오류 처리기 설정
            this.setupErrorHandlers();

            this.isInitialized = true;
            console.log('App initialization completed');

        } catch (error) {
            console.error('App initialization error:', error);
            Utils.showAlert('애플리케이션 초기화에 실패했습니다. 페이지를 새로고침해주세요.', 'error');
        } finally {
            Utils.hideLoading();
        }
    }

    // 인증 상태 변화 리스너
    setupAuthListener() {
        if (window.supabase) {
            window.supabase.auth.onAuthStateChange(async (event, session) => {
                console.log('Auth state changed:', event);
                
                switch (event) {
                    case 'SIGNED_IN':
                        if (session?.user) {
                            await authManager.setCurrentUser(session.user);
                            authManager.showDashboard();
                            await dashboardManager.init();
                            this.currentPage = 'dashboard';
                        }
                        break;
                        
                    case 'SIGNED_OUT':
                        authManager.showLoginPage();
                        this.currentPage = 'login';
                        
                        // 타이머 정리
                        if (window.examManager) {
                            examManager.stopTimer();
                            examManager.stopAutoSave();
                        }
                        break;
                        
                    case 'TOKEN_REFRESHED':
                        console.log('Token refreshed');
                        break;
                }
            });
        }
    }

    // 키보드 단축키 설정
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+R 또는 F5: 새로고침
            if ((e.ctrlKey && e.key === 'r') || e.key === 'F5') {
                if (this.currentPage === 'exam') {
                    e.preventDefault();
                    const confirm = window.confirm('시험 중에는 새로고침할 수 없습니다. 정말 새로고침하시겠습니까?');
                    if (confirm) {
                        window.location.reload();
                    }
                }
                return;
            }

            // ESC: 모달 닫기
            if (e.key === 'Escape') {
                const modal = document.querySelector('.modal-overlay');
                if (modal) {
                    modal.remove();
                }
            }

            // 시험 중 키보드 단축키
            if (this.currentPage === 'exam' && window.examManager?.currentExam) {
                switch (e.key) {
                    case 'ArrowLeft':
                        if (!e.target.matches('input, textarea, select')) {
                            e.preventDefault();
                            document.getElementById('prev-question')?.click();
                        }
                        break;
                        
                    case 'ArrowRight':
                        if (!e.target.matches('input, textarea, select')) {
                            e.preventDefault();
                            document.getElementById('next-question')?.click();
                        }
                        break;
                        
                    case 'Enter':
                        if (e.ctrlKey && !e.target.matches('textarea')) {
                            e.preventDefault();
                            document.getElementById('submit-exam-btn')?.click();
                        }
                        break;
                }
            }
        });
    }

    // 전역 오류 처리기 설정
    setupErrorHandlers() {
        // JavaScript 오류 처리
        window.addEventListener('error', (e) => {
            console.error('Global error:', e.error);
            
            // 네트워크 오류인 경우
            if (e.error?.message?.includes('NetworkError') || 
                e.error?.message?.includes('fetch')) {
                Utils.showAlert('네트워크 연결을 확인해주세요.', 'error');
            }
        });

        // Promise rejection 처리
        window.addEventListener('unhandledrejection', (e) => {
            console.error('Unhandled promise rejection:', e.reason);
            
            // Supabase 관련 오류 처리
            if (e.reason?.message?.includes('Failed to fetch') ||
                e.reason?.message?.includes('NetworkError')) {
                Utils.showAlert('서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.', 'error');
            }
        });
    }

    // 페이지 전환
    navigateTo(page, params = {}) {
        this.currentPage = page;
        
        switch (page) {
            case 'login':
                authManager.showLoginPage();
                break;
                
            case 'register':
                authManager.showRegisterPage();
                break;
                
            case 'dashboard':
                authManager.showDashboard();
                break;
                
            case 'exam':
                if (params.examId && params.sessionId) {
                    examManager.startExam(params.examId, params.sessionId);
                }
                break;
        }
    }

    // 애플리케이션 상태 확인
    getStatus() {
        return {
            initialized: this.isInitialized,
            currentPage: this.currentPage,
            authenticated: authManager.isAuthenticated,
            user: window.currentUser
        };
    }

    // 개발자 도구용 디버그 정보
    debug() {
        console.log('=== Semu Inside Debug Info ===');
        console.log('App Status:', this.getStatus());
        console.log('Current User:', window.currentUser);
        console.log('Supabase Client:', window.supabase);
        console.log('Managers:', {
            auth: window.authManager,
            dashboard: window.dashboardManager,
            exam: window.examManager,
            admin: window.adminManager
        });
        console.log('================================');
    }
}

// 애플리케이션 인스턴스 생성
const app = new App();

// DOM 로드 완료 후 앱 초기화
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM loaded, initializing app...');
    await app.init();
});

// 개발 환경에서 디버그 기능 노출
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.app = app;
    window.debug = () => app.debug();
    
    // 개발자 도구 단축키 설정
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'D') {
            app.debug();
        }
    });
}

// Supabase 연결 상태 모니터링
setInterval(() => {
    if (window.supabase && authManager.isAuthenticated) {
        // 주기적으로 연결 상태 확인 (간단한 쿼리 실행)
        window.supabase
            .from('profiles')
            .select('id')
            .limit(1)
            .then(() => {
                // 연결 성공 - 특별한 처리 불필요
            })
            .catch((error) => {
                console.warn('Connection check failed:', error);
                // 연결 실패 시 사용자에게 알림 (너무 자주 표시되지 않도록 조절)
                if (!document.querySelector('.alert-error')) {
                    Utils.showAlert('서버 연결이 불안정합니다.', 'warning');
                }
            });
    }
}, 60000); // 1분마다 체크

// 사용자 활동 추적 (선택사항)
let userActivityTimer = null;
const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30분

function resetActivityTimer() {
    if (userActivityTimer) {
        clearTimeout(userActivityTimer);
    }
    
    userActivityTimer = setTimeout(() => {
        if (authManager.isAuthenticated && !window.examManager?.currentExam) {
            Utils.showAlert('장시간 비활성 상태입니다. 보안을 위해 다시 로그인해주세요.', 'warning');
            // 자동 로그아웃은 시험 중이 아닐 때만
            setTimeout(() => {
                authManager.logout();
            }, 5000);
        }
    }, INACTIVITY_TIMEOUT);
}

// 사용자 활동 이벤트 리스너
['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'].forEach(event => {
    document.addEventListener(event, resetActivityTimer, true);
});

// 초기 타이머 설정
resetActivityTimer();

// 전역으로 앱 인스턴스 노출
window.SemuInsideApp = app;
