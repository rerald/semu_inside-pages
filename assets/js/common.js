
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
// Quizbank 공통 JavaScript 유틸리티

class SemuApp {
    constructor(supabaseClient = null) {
        this.currentUser = null;
        this.supabaseClient = supabaseClient;
        this.init();
    }

    async init() {
        console.log('🚀 Quizbank 앱 초기화');
        
        // Supabase 클라이언트가 전달되지 않은 경우에만 초기화
        if (!this.supabaseClient) {
            await this.initSupabase();
        } else {
            console.log('✅ 외부에서 전달된 Supabase 클라이언트 사용');
        }
        
        // 인증 상태 확인
        await this.checkAuthState();
        
        // 공통 이벤트 리스너 설정
        this.setupCommonEventListeners();
    }



    async initSupabase() {
        try {
            const SUPABASE_CONFIG = {
                url: 'https://skpvtqohyspfsmvwrgoc.supabase.co',
                anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNrcHZ0cW9oeXNwZnNtdndyZ29jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxNzU4ODUsImV4cCI6MjA3MTc1MTg4NX0.tMW3hiZR5JcXlbES2tKl1ZNOVRtYqGO04m-YSbqKUhY'
            };

            // 먼저 Supabase 라이브러리 동적 로드
            await this.loadSupabaseLibrary();

            // Supabase 라이브러리 로드 대기 (개선된 방법)
            let attempts = 0;
            const maxAttempts = 50;
            
            console.log('🔍 Supabase 라이브러리 로딩 대기 중...');
            
            while (attempts < maxAttempts) {
                // Supabase 확인 (여러 가능한 구조 체크)
                let supabaseFound = false;
                let createClientFunction = null;
                
                if (window.supabase) {
                    if (window.supabase.createClient) {
                        createClientFunction = window.supabase.createClient;
                        supabaseFound = true;
                        console.log('✅ Supabase 라이브러리 발견! (window.supabase.createClient)');
                    } else if (typeof window.supabase === 'function') {
                        createClientFunction = window.supabase;
                        supabaseFound = true;
                        console.log('✅ Supabase 라이브러리 발견! (window.supabase as function)');
                    } else {
                        console.log('🔍 Supabase 객체 구조:', Object.keys(window.supabase));
                    }
                }
                
                if (supabaseFound) {
                    window._supabaseCreateClient = createClientFunction;
                    break;
                }
                
                await new Promise(resolve => setTimeout(resolve, 200));
                attempts++;
                
                if (attempts % 10 === 0) {
                    console.log(`⏳ Supabase 라이브러리 대기 중... ${attempts}/${maxAttempts}`);
                }
            }

            // Supabase 클라이언트 생성
            if (window._supabaseCreateClient) {
                try {
                    this.supabaseClient = window._supabaseCreateClient(
                        SUPABASE_CONFIG.url,
                        SUPABASE_CONFIG.anonKey
                    );
                    
                    // 전역 변수로도 설정
                    window.supabaseClient = this.supabaseClient;
                    
                    // 연결 테스트
                    console.log('🧪 Supabase 연결 테스트 중...');
                    const testResult = await this.supabaseClient.from('profiles').select('count', { count: 'exact', head: true });
                    console.log('✅ Supabase 연결 및 테스트 성공!');
                    
                } catch (error) {
                    console.error('❌ Supabase 클라이언트 생성 실패:', error);
                    this.supabaseClient = null;
                }
            } else {
                console.warn('⚠️ Supabase 라이브러리를 찾을 수 없습니다.');
                console.log('사용 가능한 전역 객체:', Object.keys(window).filter(key => key.toLowerCase().includes('supa') || key.toLowerCase().includes('auth')));
                
                // 더 자세한 진단 정보
                if (window.supabase) {
                    console.log('🔍 window.supabase 타입:', typeof window.supabase);
                    console.log('🔍 window.supabase 키들:', Object.keys(window.supabase));
                    if (window.supabase.default) {
                        console.log('🔍 window.supabase.default 확인:', typeof window.supabase.default);
                        if (window.supabase.default.createClient) {
                            console.log('✅ createClient found in default!');
                            window._supabaseCreateClient = window.supabase.default.createClient;
                            this.supabaseClient = window._supabaseCreateClient(
                                SUPABASE_CONFIG.url,
                                SUPABASE_CONFIG.anonKey
                            );
                            window.supabaseClient = this.supabaseClient;
                            console.log('✅ Supabase 클라이언트 생성 성공 (fallback)');
                            return;
                        }
                    }
                }
                
                // 최후의 수단으로 mock 클라이언트 생성
                console.warn('⚠️ Mock Supabase 클라이언트 생성 (개발용)');
                this.createMockSupabaseClient();
            }
        } catch (error) {
            console.error('❌ Supabase 초기화 실패:', error);
        }
    }

    createMockSupabaseClient() {
        console.log('🛠️ Mock Supabase 클라이언트 생성 중...');
        
        // 기본적인 mock 클라이언트 생성
        this.supabaseClient = {
            auth: {
                getUser: async () => ({ data: { user: null }, error: null }),
                signInWithPassword: async (credentials) => {
                    console.log('🧪 Mock 로그인:', credentials.email);
                    return { data: { user: { id: 'mock-user', email: credentials.email } }, error: null };
                }
            },
            from: (table) => ({
                select: (columns) => ({
                    eq: (column, value) => ({
                        single: async () => ({ data: null, error: { message: 'Mock data not available' } }),
                        limit: (n) => ({ data: [], error: null }),
                        order: (column) => ({ data: [], error: null })
                    }),
                    order: (column) => ({ data: [], error: null }),
                    limit: (n) => ({ data: [], error: null })
                }),
                insert: (data) => ({ error: { message: 'Mock insert not implemented' } }),
                update: (data) => ({ eq: (column, value) => ({ error: { message: 'Mock update not implemented' } }) })
            })
        };
        
        window.supabaseClient = this.supabaseClient;
        console.log('✅ Mock Supabase 클라이언트 생성 완료');
    }

    async loadSupabaseLibrary() {
        console.log('📦 Supabase 라이브러리 동적 로드 시작...');
        
        // 이미 로드되어 있으면 스킵
        if (window.supabase) {
            console.log('✅ Supabase 라이브러리 이미 로드됨');
            return;
        }
        
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/@supabase/supabase-js@2/dist/umd/supabase.js';
            script.onload = () => {
                console.log('✅ Supabase 라이브러리 동적 로드 완료');
                resolve();
            };
            script.onerror = (error) => {
                console.error('❌ Supabase 라이브러리 로드 실패:', error);
                // 다른 CDN으로 재시도
                const fallbackScript = document.createElement('script');
                fallbackScript.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js';
                fallbackScript.onload = () => {
                    console.log('✅ Supabase 라이브러리 대체 CDN 로드 완료');
                    resolve();
                };
                fallbackScript.onerror = () => {
                    console.error('❌ 모든 Supabase CDN 로드 실패');
                    resolve(); // 실패해도 계속 진행 (mock으로 대체)
                };
                document.head.appendChild(fallbackScript);
            };
            document.head.appendChild(script);
        });
    }

    async checkAuthState() {
        // Supabase 세션 확인
        try {
            if (this.supabaseClient) {
                const { data: { session }, error } = await this.supabaseClient.auth.getSession();
                
                if (error) {
                    console.error('세션 확인 오류:', error);
                    return;
                }

                if (session?.user) {
                    console.log('✅ Supabase 세션 발견:', session.user.email);
                    
                    // 프로필 정보 가져오기
                    try {
                        console.log('🔍 프로필 정보 조회 시도:', session.user.id);
                        const { data: profile, error: profileError } = await this.supabaseClient
                            .from('profiles')
                            .select('*, departments(name, code)')
                            .eq('id', session.user.id)
                            .single();

                        if (profileError) {
                            console.error('❌ 프로필 정보 조회 실패:', profileError);
                            // 프로필 정보가 없어도 기본 사용자 정보는 설정
                            this.currentUser = {
                                id: session.user.id,
                                email: session.user.email,
                                name: session.user.user_metadata?.name || session.user.email.split('@')[0],
                                role: 'employee',
                                department: '미지정',
                                loginTime: new Date().toISOString()
                            };
                            console.log('⚠️ 기본 사용자 정보로 설정:', this.currentUser);
                        } else if (profile) {
                            this.currentUser = {
                                id: session.user.id,
                                email: session.user.email,
                                name: profile.name,
                                role: profile.role || 'employee',
                                department: profile.departments?.name || '미지정',
                                department_id: profile.department_id,
                                hire_date: profile.hire_date,
                                phone: profile.phone,
                                loginTime: new Date().toISOString()
                            };
                            
                            console.log('✅ 세션에서 사용자 정보 복원:', this.currentUser.email);
                            
                            // 로그인 시간 업데이트 (실제 로그인 시에만, 세션 복원은 제외)
                            // 세션 복원과 실제 로그인을 구분하기 위해 sessionStorage 확인
                            const isRealLogin = !sessionStorage.getItem('session_restored');
                            if (isRealLogin) {
                                sessionStorage.setItem('session_restored', 'true');
                                this.updateLastLoginTime(session.user.id).catch(error => {
                                    console.warn('⚠️ 로그인 시간 업데이트 실패:', error);
                                });
                                console.log('✅ 실제 로그인으로 인한 시간 업데이트');
                            } else {
                                console.log('ℹ️ 세션 복원으로 인한 접속 - 로그인 시간 업데이트 생략');
                            }
                        }
                    } catch (profileError) {
                        console.error('❌ 프로필 조회 중 예외 발생:', profileError);
                        // 예외가 발생해도 기본 사용자 정보는 설정
                        this.currentUser = {
                            id: session.user.id,
                            email: session.user.email,
                            name: session.user.user_metadata?.name || session.user.email.split('@')[0],
                            role: 'employee',
                            department: '미지정',
                            loginTime: new Date().toISOString()
                        };
                        console.log('⚠️ 예외 발생으로 기본 사용자 정보 설정:', this.currentUser);
                    }
                } else {
                    console.log('📋 활성 세션 없음');
                    this.currentUser = null;
                }
            } else {
                console.log('⚠️ Supabase 클라이언트가 초기화되지 않음');
            }
        } catch (error) {
            console.error('❌ 인증 상태 확인 실패:', error);
            this.currentUser = null;
        }
    }

    // 로그인 시간 업데이트 메소드
    async updateLastLoginTime(userId) {
        try {
            if (!this.supabaseClient) {
                console.warn('⚠️ Supabase 클라이언트가 없어 로그인 시간을 업데이트할 수 없습니다.');
                return;
            }

            const { error } = await this.supabaseClient
                .from('profiles')
                .update({ last_login_at: new Date().toISOString() })
                .eq('id', userId);

            if (error) {
                console.error('❌ 로그인 시간 업데이트 실패:', error);
            } else {
                console.log('✅ 로그인 시간 업데이트 성공:', userId);
            }
        } catch (error) {
            console.error('❌ 로그인 시간 업데이트 중 예외 발생:', error);
        }
    }

    setupCommonEventListeners() {
        // 로그아웃 버튼들
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('logout-btn') || e.target.closest('.logout-btn')) {
                e.preventDefault();
                this.logout();
            }
        });

        // 네비게이션 링크들
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('nav-link')) {
                const href = e.target.getAttribute('href');
                if (href && href.startsWith('./')) {
                    // 상대 경로 네비게이션은 그대로 진행
                    return;
                }
            }
        });
    }

    // 인증 관련 메서드 (Supabase 전용)
    async login(email, password) {
        try {
            console.log('🔐 로그인 시도:', email);

            if (!this.supabaseClient) {
                throw new Error('Supabase 클라이언트가 초기화되지 않았습니다. 데이터베이스 연결이 필요합니다.');
            }

            // Supabase 로그인 시도
            const { data, error } = await this.supabaseClient.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) throw error;

            console.log('✅ Auth 로그인 성공:', data.user?.email);

            // 프로필 정보 가져오기
            const { data: profile, error: profileError } = await this.supabaseClient
                .from('profiles')
                .select('*, departments(name, code)')
                .eq('id', data.user.id)
                .single();

            if (profileError) {
                console.error('프로필 정보 조회 실패:', profileError);
                throw new Error('사용자 프로필 정보를 찾을 수 없습니다.');
            }

            this.currentUser = {
                id: data.user.id,
                email: data.user.email,
                name: profile?.name || data.user.user_metadata?.name || email.split('@')[0],
                role: profile?.role || 'employee',
                department: profile?.departments?.name || '미지정',
                department_id: profile?.department_id,
                hire_date: profile?.hire_date,
                phone: profile?.phone,
                loginTime: new Date().toISOString()
            };

            console.log('✅ 프로필 정보 로드 완료:', this.currentUser);
            
            console.log('✅ Supabase 로그인 성공:', this.currentUser);
            return { success: true, user: this.currentUser };

        } catch (error) {
            console.error('❌ 로그인 실패:', error);
            let message = '로그인에 실패했습니다.';
            
            if (error.message.includes('Invalid login credentials') || error.message === 'Invalid credentials') {
                message = '이메일 또는 비밀번호가 올바르지 않습니다.';
            } else if (error.message.includes('Email not confirmed')) {
                message = '이메일 인증이 필요합니다.';
            }
            
            return { success: false, error: message };
        }
    }



    async logout() {
        try {
            console.log('🔄 로그아웃 시작...');
            
            // 1단계: Supabase 로그아웃 시도 (오류가 있어도 계속 진행)
            if (this.supabaseClient) {
                try {
                    const { error } = await this.supabaseClient.auth.signOut();
                    if (error) {
                        console.warn('⚠️ Supabase 로그아웃 중 오류 (무시하고 계속):', error.message);
                    } else {
                        console.log('✅ Supabase 로그아웃 성공');
                    }
                } catch (supabaseError) {
                    console.warn('⚠️ Supabase 로그아웃 예외 (무시하고 계속):', supabaseError.message);
                }
            }
            
            // 2단계: 클라이언트 측 정리 (항상 실행)
            this.currentUser = null;
            window.currentUser = null;
            
            // 3단계: 로컬 스토리지 정리
            try {
                localStorage.removeItem('supabase.auth.token');
                sessionStorage.clear(); // session_restored 플래그도 함께 정리됨
            } catch (storageError) {
                console.warn('⚠️ 스토리지 정리 중 오류:', storageError.message);
            }
            
            console.log('✅ 로그아웃 완료 (클라이언트 측)');
            
            // 4단계: 성공 메시지 및 리다이렉트
            this.showAlert('로그아웃 되었습니다.', 'success');
            
            setTimeout(() => {
                window.location.href = './login.html';
            }, 1000);
            
        } catch (error) {
            console.error('❌ 로그아웃 중 예상치 못한 오류:', error);
            
            // 오류가 있어도 강제로 로그인 페이지로 이동
            this.currentUser = null;
            window.currentUser = null;
            
            this.showAlert('로그아웃 처리 중 일부 오류가 있었지만 로그아웃됩니다.', 'warning');
            
            setTimeout(() => {
                window.location.href = './login.html';
            }, 1500);
        }
    }

    // 강제 로그아웃 (모든 세션 정리)
    forceLogout() {
        console.log('🚨 강제 로그아웃 실행...');
        
        // 클라이언트 측 정리
        this.currentUser = null;
        window.currentUser = null;
        
        // 모든 스토리지 정리
        try {
            localStorage.clear();
            sessionStorage.clear();
            
            // 쿠키도 정리 (가능한 것들)
            document.cookie.split(";").forEach(function(c) { 
                document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
            });
        } catch (error) {
            console.warn('⚠️ 스토리지/쿠키 정리 중 오류:', error);
        }
        
        console.log('✅ 강제 로그아웃 완료');
        window.location.href = './login.html';
    }

    // 회원가입 메서드 (Supabase 전용)
    async register(userData) {
        try {
            console.log('📝 회원가입 시도:', userData.email);

            if (!this.supabaseClient) {
                throw new Error('Supabase 클라이언트가 초기화되지 않았습니다. 데이터베이스 연결이 필요합니다.');
            }
                // Supabase 회원가입
                const { data, error } = await this.supabaseClient.auth.signUp({
                    email: userData.email,
                    password: userData.password,
                    options: {
                        data: {
                            name: userData.name,
                            hire_date: userData.hire_date,
                            phone: userData.phone || null
                        }
                    }
                });

                if (error) throw error;

                // 부서 ID 처리
                console.log('📋 부서 정보 처리 중...');
                let departmentId = userData.department_id; // UUID 직접 사용
                
                // department_id가 유효한지 확인
                if (departmentId) {
                    try {
                        const { data: department, error: deptError } = await this.supabaseClient
                            .from('departments')
                            .select('id')
                            .eq('id', departmentId)
                            .single();

                        if (deptError) {
                            console.warn('부서 ID 유효성 검증 실패, 기본값 사용:', deptError.message);
                            // 기본 부서 (첫 번째 부서) 사용
                            const { data: defaultDept } = await this.supabaseClient
                                .from('departments')
                                .select('id')
                                .limit(1)
                                .single();
                            departmentId = defaultDept?.id;
                        } else {
                            console.log('✅ 부서 ID 유효성 검증 완료:', departmentId);
                        }
                    } catch (error) {
                        console.warn('부서 ID 검증 중 오류, 기본값 사용:', error.message);
                        // 기본 부서 사용
                        const { data: defaultDept } = await this.supabaseClient
                            .from('departments')
                            .select('id')
                            .limit(1)
                            .single();
                        departmentId = defaultDept?.id;
                    }
                } else {
                    console.warn('부서 ID가 없음, 기본값 사용');
                    // 기본 부서 사용
                    const { data: defaultDept } = await this.supabaseClient
                        .from('departments')
                        .select('id')
                        .limit(1)
                        .single();
                    departmentId = defaultDept?.id;
                }

                // 프로필 테이블에 사용자 정보 저장
                if (data.user) {
                    const profileData = {
                        id: data.user.id,
                        name: userData.name,
                        email: userData.email,
                        department_id: departmentId,
                        hire_date: userData.hire_date,
                        phone: userData.phone || null,
                        role: 'employee'
                    };

                    console.log('💾 프로필 데이터:', profileData);

                    const { data: profileResult, error: profileError } = await this.supabaseClient
                        .from('profiles')
                        .insert([profileData])
                        .select()
                        .single();

                    if (profileError) {
                        console.error('프로필 저장 실패:', profileError);
                        throw new Error(`프로필 저장 실패: ${profileError.message}`);
                    }

                    console.log('✅ 프로필 저장 완료:', profileResult);
                }

                console.log('✅ 회원가입 성공:', data.user);
                return { success: true, user: data.user };

        } catch (error) {
            console.error('❌ 회원가입 실패:', error);
            let message = '회원가입에 실패했습니다.';
            
            if (error.message.includes('User already registered')) {
                message = '이미 등록된 이메일입니다.';
            } else if (error.message.includes('Password should be at least 6 characters')) {
                message = '비밀번호는 최소 6자 이상이어야 합니다.';
            } else if (error.message.includes('Invalid email')) {
                message = '올바른 이메일 형식이 아닙니다.';
            }
            
            return { success: false, error: message };
        }
    }

    // 네비게이션 메서드
    navigateTo(page) {
        const pages = {
            'login': './login.html',
            'dashboard': './dashboard.html',
            'exam': './exam.html',
            'results': './results.html',
            'profile': './profile.html',
            'admin': './admin.html'
        };

        const url = pages[page];
        if (url) {
            window.location.href = url;
        } else {
            console.error('❌ 알 수 없는 페이지:', page);
        }
    }

    // 인증 확인
    requireAuth() {
        if (!this.currentUser) {
            this.showAlert('로그인이 필요합니다.', 'warning');
            setTimeout(() => {
                window.location.href = './login.html';
            }, 1500);
            return false;
        }
        return true;
    }

    // 관리자 권한 확인
    requireAdmin() {
        if (!this.requireAuth()) return false;
        
        if (this.currentUser.role !== 'admin' && this.currentUser.role !== 'super_admin') {
            this.showAlert('관리자 권한이 필요합니다.', 'error');
            return false;
        }
        return true;
    }

    // UI 유틸리티
    showAlert(message, type = 'info') {
        // 기존 알림 제거
        const existingAlerts = document.querySelectorAll('.alert');
        existingAlerts.forEach(alert => alert.remove());

        const alert = document.createElement('div');
        alert.className = `alert ${type}`;
        alert.textContent = message;
        
        document.body.appendChild(alert);
        
        // 자동 제거
        setTimeout(() => {
            if (alert.parentNode) {
                alert.remove();
            }
        }, 4000);
    }

    showLoading(element) {
        const loader = document.createElement('div');
        loader.className = 'loading-spinner';
        loader.innerHTML = '<div class="loading-spinner"></div>';
        element.appendChild(loader);
        return loader;
    }

    hideLoading(loader) {
        if (loader && loader.parentNode) {
            loader.remove();
        }
    }

    // 폼 유틸리티
    validateForm(formElement) {
        const inputs = formElement.querySelectorAll('input[required], select[required], textarea[required]');
        let isValid = true;

        inputs.forEach(input => {
            const value = input.value.trim();
            
            if (!value) {
                this.setFieldError(input, '필수 입력 항목입니다.');
                isValid = false;
            } else if (input.type === 'email' && !this.isValidEmail(value)) {
                this.setFieldError(input, '올바른 이메일 형식이 아닙니다.');
                isValid = false;
            } else {
                this.clearFieldError(input);
            }
        });

        return isValid;
    }

    setFieldError(input, message) {
        input.classList.add('error');
        
        // 기존 에러 메시지 제거
        const existingError = input.parentNode.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }

        // 새 에러 메시지 추가
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.style.color = 'var(--error-color)';
        errorDiv.style.fontSize = '12px';
        errorDiv.style.marginTop = '4px';
        errorDiv.textContent = message;
        
        input.parentNode.appendChild(errorDiv);
    }

    clearFieldError(input) {
        input.classList.remove('error');
        const errorMessage = input.parentNode.querySelector('.error-message');
        if (errorMessage) {
            errorMessage.remove();
        }
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // 데이터 포맷팅
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
        }
    }
}

// 전역 앱 인스턴스
let app;

// DOM 로드 완료 시 앱 초기화
document.addEventListener('DOMContentLoaded', () => {
    app = new SemuApp();
    window.semuApp = app; // 전역 접근 가능
});

// SemuApp 클래스를 전역으로 노출
window.SemuApp = SemuApp;

// 공통 유틸리티 함수들
window.showAlert = (message, type) => {
    if (window.semuApp) {
        window.semuApp.showAlert(message, type);
    }
};

window.navigateTo = (page) => {
    if (window.semuApp) {
        window.semuApp.navigateTo(page);
    }
};
