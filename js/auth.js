
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
// 인증 시스템 관리

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
    }

    // Supabase 클라이언트 초기화
    async init() {
        try {
            console.log('Starting auth initialization...');
            
            // 임시로 Supabase 연결을 시뮬레이션
            if (typeof window.supabase === 'undefined') {
                console.warn('Supabase not loaded, using mock mode for testing');
                window.supabase = {
                    auth: {
                        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
                        signUp: (data) => {
                            console.log('Mock signup:', data);
                            return Promise.resolve({ 
                                data: { user: { id: 'mock-user-id', email: data.email } }, 
                                error: null 
                            });
                        },
                        signInWithPassword: (data) => {
                            console.log('Mock login:', data);
                            return Promise.resolve({ 
                                data: { user: { id: 'mock-user-id', email: data.email } }, 
                                error: null 
                            });
                        },
                        signOut: () => Promise.resolve({ error: null })
                    },
                    from: (table) => ({
                        select: () => ({ eq: () => ({ single: () => Promise.resolve({ 
                            data: { 
                                id: 'mock-user-id', 
                                name: '테스트 사용자', 
                                email: 'test@test.com',
                                role: 'employee',
                                departments: { name: '테스트팀' }
                            }, 
                            error: null 
                        }) }) }),
                        insert: (data) => Promise.resolve({ data, error: null }),
                        update: (data) => Promise.resolve({ data, error: null })
                    })
                };
                
                Utils.showAlert('임시 테스트 모드로 실행 중입니다.', 'warning');
                return true;
            }
            
            // 실제 Supabase 연결 시도
            const { createClient } = window.supabase || {};
            if (!createClient) {
                throw new Error('Supabase createClient not available');
            }
            
            window.supabase = createClient(
                SUPABASE_CONFIG.url,
                SUPABASE_CONFIG.anonKey
            );

            // 현재 세션 확인
            const { data: { session }, error } = await window.supabase.auth.getSession();
            
            if (error) {
                console.error('Session check error:', error);
                return false;
            }

            if (session) {
                await this.setCurrentUser(session.user);
                return true;
            }

            return false;
        } catch (error) {
            console.error('Auth initialization error:', error);
            Utils.showAlert('인증 시스템 초기화에 실패했습니다.', 'error');
            return false;
        }
    }

    // 현재 사용자 정보 설정
    async setCurrentUser(user) {
        try {
            // 프로필 정보 가져오기
            const { data: profile, error } = await window.supabase
                .from('profiles')
                .select(`
                    *,
                    departments:department_id (
                        id,
                        name,
                        code
                    )
                `)
                .eq('id', user.id)
                .single();

            if (error) {
                console.error('Profile fetch error:', error);
                throw error;
            }

            this.currentUser = {
                id: user.id,
                email: user.email,
                ...profile
            };

            window.currentUser = this.currentUser;
            this.isAuthenticated = true;

            // UI 업데이트
            this.updateUserDisplay();

            return this.currentUser;
        } catch (error) {
            console.error('Set current user error:', error);
            throw error;
        }
    }

    // 로그인
    async login(email, password) {
        try {
            Utils.showLoading();

            const { data, error } = await window.supabase.auth.signInWithPassword({
                email: email.trim(),
                password: password
            });

            if (error) {
                throw error;
            }

            await this.setCurrentUser(data.user);
            Utils.showAlert('로그인에 성공했습니다!', 'success');
            
            return { success: true, user: this.currentUser };
        } catch (error) {
            console.error('Login error:', error);
            let message = '로그인에 실패했습니다.';
            
            if (error.message.includes('Invalid login credentials')) {
                message = '이메일 또는 비밀번호가 올바르지 않습니다.';
            } else if (error.message.includes('Email not confirmed')) {
                message = '이메일 인증이 필요합니다.';
            }
            
            Utils.showAlert(message, 'error');
            return { success: false, error: message };
        } finally {
            Utils.hideLoading();
        }
    }

    // 회원가입
    async register(userData) {
        try {
            Utils.showLoading();

            // 1. 사용자 계정 생성
            const { data: authData, error: authError } = await window.supabase.auth.signUp({
                email: userData.email.trim(),
                password: userData.password,
                options: {
                    data: {
                        name: userData.name
                    }
                }
            });

            if (authError) {
                throw authError;
            }

            // 2. 프로필 정보 저장
            const { error: profileError } = await window.supabase
                .from('profiles')
                .insert([
                    {
                        id: authData.user.id,
                        name: userData.name,
                        email: userData.email.trim(),
                        department_id: await this.getDepartmentId(userData.department),
                        hire_date: userData.hire_date,
                        phone: userData.phone,
                        role: 'employee'
                    }
                ]);

            if (profileError) {
                throw profileError;
            }

            Utils.showAlert('회원가입이 완료되었습니다! 로그인해주세요.', 'success');
            return { success: true };

        } catch (error) {
            console.error('Registration error:', error);
            let message = '회원가입에 실패했습니다.';
            
            if (error.message.includes('User already registered')) {
                message = '이미 등록된 이메일입니다.';
            } else if (error.message.includes('Password should be')) {
                message = '비밀번호는 최소 6자 이상이어야 합니다.';
            } else if (error.message.includes('Invalid email')) {
                message = '올바른 이메일 형식이 아닙니다.';
            }
            
            Utils.showAlert(message, 'error');
            return { success: false, error: message };
        } finally {
            Utils.hideLoading();
        }
    }

    // 부서 ID 조회
    async getDepartmentId(departmentCode) {
        try {
            const { data, error } = await window.supabase
                .from('departments')
                .select('id')
                .eq('code', departmentCode.toUpperCase())
                .single();

            if (error) {
                throw error;
            }

            return data.id;
        } catch (error) {
            console.error('Department lookup error:', error);
            // 기본값으로 첫 번째 부서 반환
            const { data } = await window.supabase
                .from('departments')
                .select('id')
                .limit(1)
                .single();
            
            return data?.id || null;
        }
    }

    // 로그아웃
    async logout() {
        try {
            Utils.showLoading();

            const { error } = await window.supabase.auth.signOut();
            
            if (error) {
                throw error;
            }

            this.currentUser = null;
            window.currentUser = null;
            this.isAuthenticated = false;

            // 로컬 스토리지 정리
            Utils.storage.remove('currentExamSession');
            Utils.storage.remove('examAnswers');

            Utils.showAlert('로그아웃되었습니다.', 'success');
            
            // 로그인 페이지로 이동
            this.showLoginPage();

        } catch (error) {
            console.error('Logout error:', error);
            Utils.showAlert('로그아웃 중 오류가 발생했습니다.', 'error');
        } finally {
            Utils.hideLoading();
        }
    }

    // 프로필 업데이트
    async updateProfile(profileData) {
        try {
            Utils.showLoading();

            const { data, error } = await window.supabase
                .from('profiles')
                .update({
                    phone: profileData.phone,
                    updated_at: new Date().toISOString()
                })
                .eq('id', this.currentUser.id)
                .select()
                .single();

            if (error) {
                throw error;
            }

            // 현재 사용자 정보 업데이트
            this.currentUser = { ...this.currentUser, ...data };
            window.currentUser = this.currentUser;

            Utils.showAlert('프로필이 업데이트되었습니다.', 'success');
            return { success: true, data };

        } catch (error) {
            console.error('Profile update error:', error);
            Utils.showAlert('프로필 업데이트에 실패했습니다.', 'error');
            return { success: false, error };
        } finally {
            Utils.hideLoading();
        }
    }

    // 비밀번호 변경
    async changePassword(newPassword) {
        try {
            Utils.showLoading();

            const { error } = await window.supabase.auth.updateUser({
                password: newPassword
            });

            if (error) {
                throw error;
            }

            Utils.showAlert('비밀번호가 변경되었습니다.', 'success');
            return { success: true };

        } catch (error) {
            console.error('Password change error:', error);
            Utils.showAlert('비밀번호 변경에 실패했습니다.', 'error');
            return { success: false, error };
        } finally {
            Utils.hideLoading();
        }
    }

    // 비밀번호 재설정 이메일 발송
    async resetPassword(email) {
        try {
            Utils.showLoading();

            const { error } = await window.supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`
            });

            if (error) {
                throw error;
            }

            Utils.showAlert('비밀번호 재설정 이메일이 발송되었습니다.', 'success');
            return { success: true };

        } catch (error) {
            console.error('Password reset error:', error);
            Utils.showAlert('비밀번호 재설정 이메일 발송에 실패했습니다.', 'error');
            return { success: false, error };
        } finally {
            Utils.hideLoading();
        }
    }

    // 권한 확인
    hasPermission(permission) {
        if (!this.currentUser) return false;
        return PERMISSIONS[permission](this.currentUser.role);
    }

    // 관리자 권한 확인
    isAdmin() {
        return this.currentUser && 
               (this.currentUser.role === ROLES.ADMIN || this.currentUser.role === ROLES.SUPER_ADMIN);
    }

    // UI 표시 제어
    showLoginPage() {
        // 모든 페이지 숨기기
        document.querySelectorAll('.page').forEach(page => {
            page.classList.add('hidden');
        });
        
        // 로그인 페이지 표시
        document.getElementById('login-page').classList.remove('hidden');
    }

    showRegisterPage() {
        // 모든 페이지 숨기기
        document.querySelectorAll('.page').forEach(page => {
            page.classList.add('hidden');
        });
        
        // 회원가입 페이지 표시
        document.getElementById('register-page').classList.remove('hidden');
    }

    showDashboard() {
        // 모든 페이지 숨기기
        document.querySelectorAll('.page').forEach(page => {
            page.classList.add('hidden');
        });
        
        // 대시보드 표시
        document.getElementById('dashboard').classList.remove('hidden');
        
        // 관리자 메뉴 표시/숨김
        const adminNav = document.querySelector('.admin-only');
        if (adminNav) {
            if (this.isAdmin()) {
                adminNav.classList.remove('hidden');
            } else {
                adminNav.classList.add('hidden');
            }
        }
    }

    // 사용자 표시 정보 업데이트
    updateUserDisplay() {
        const userNameElement = document.getElementById('user-name');
        if (userNameElement && this.currentUser) {
            userNameElement.textContent = this.currentUser.name;
        }

        // 프로필 폼 업데이트
        this.updateProfileForm();
    }

    // 프로필 폼 업데이트
    updateProfileForm() {
        if (!this.currentUser) return;

        const form = document.getElementById('profile-form');
        if (!form) return;

        form.querySelector('#profile-name').value = this.currentUser.name || '';
        form.querySelector('#profile-email').value = this.currentUser.email || '';
        form.querySelector('#profile-department').value = this.currentUser.departments?.name || '';
        form.querySelector('#profile-hire-date').value = this.currentUser.hire_date || '';
        form.querySelector('#profile-phone').value = this.currentUser.phone || '';
    }
}

// AuthManager 인스턴스 생성
const authManager = new AuthManager();

// DOM이 로드된 후 이벤트 리스너 설정
document.addEventListener('DOMContentLoaded', () => {
    // 로그인 폼 이벤트
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(loginForm);
            const email = formData.get('email');
            const password = formData.get('password');

            const result = await authManager.login(email, password);
            if (result.success) {
                authManager.showDashboard();
                // 대시보드 초기화
                if (window.dashboardManager) {
                    window.dashboardManager.loadExams();
                }
            }
        });
    }

    // 회원가입 폼 이벤트
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(registerForm);
            const userData = {
                name: formData.get('name'),
                email: formData.get('email'),
                password: formData.get('password'),
                department: formData.get('department'),
                hire_date: formData.get('hire_date'),
                phone: formData.get('phone')
            };

            const result = await authManager.register(userData);
            if (result.success) {
                authManager.showLoginPage();
                registerForm.reset();
            }
        });
    }

    // 로그아웃 버튼 이벤트
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            authManager.logout();
        });
    }

    // 인증 모드 전환 이벤트
    const showRegisterLink = document.getElementById('show-register');
    const showLoginLink = document.getElementById('show-login');

    if (showRegisterLink) {
        showRegisterLink.addEventListener('click', (e) => {
            e.preventDefault();
            authManager.showRegisterPage();
        });
    }

    if (showLoginLink) {
        showLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            authManager.showLoginPage();
        });
    }

    // 프로필 편집 이벤트
    const editProfileBtn = document.getElementById('edit-profile-btn');
    const saveProfileBtn = document.getElementById('save-profile-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const profileForm = document.getElementById('profile-form');

    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', () => {
            // 편집 모드 활성화
            profileForm.querySelector('#profile-phone').removeAttribute('readonly');
            
            editProfileBtn.classList.add('hidden');
            saveProfileBtn.classList.remove('hidden');
            cancelEditBtn.classList.remove('hidden');
        });
    }

    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', async () => {
            const phone = profileForm.querySelector('#profile-phone').value;
            
            const result = await authManager.updateProfile({ phone });
            if (result.success) {
                // 편집 모드 해제
                profileForm.querySelector('#profile-phone').setAttribute('readonly', true);
                
                editProfileBtn.classList.remove('hidden');
                saveProfileBtn.classList.add('hidden');
                cancelEditBtn.classList.add('hidden');
            }
        });
    }

    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', () => {
            // 편집 모드 해제 및 원래 값 복원
            authManager.updateProfileForm();
            profileForm.querySelector('#profile-phone').setAttribute('readonly', true);
            
            editProfileBtn.classList.remove('hidden');
            saveProfileBtn.classList.add('hidden');
            cancelEditBtn.classList.add('hidden');
        });
    }
});

// 전역으로 노출
window.authManager = authManager;
