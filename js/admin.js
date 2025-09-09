
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
// 관리자 패널 관리

class AdminManager {
    constructor() {
        this.currentSection = null;
        this.categories = [];
        this.questions = [];
        this.exams = [];
        this.departments = [];
        this.mockData = this.getMockData();
    }

    // Mock 데이터 정의
    getMockData() {
        return {
            categories: [
                { name: '부가가치세', code: 'VAT' },
                { name: '소득세', code: 'INCOME' },
                { name: '법인세', code: 'CORPORATE' },
                { name: '원천세', code: 'WITHHOLDING' },
                { name: '기타', code: 'OTHER' }
            ],
            questions: [
                {
                    type: 'multiple_choice',
                    content: '부가가치세 과세대상이 아닌 것은? 부가가치세법상 과세대상이 아닌 거래를 고르시오.',
                    explanation: '의료서비스는 부가가치세법상 면세 대상입니다.',
                    difficulty: 3,
                    category_name: '부가가치세',
                    options: [
                        { content: '의료서비스', is_correct: true },
                        { content: '상품 판매', is_correct: false },
                        { content: '건설업 서비스', is_correct: false },
                        { content: '금융서비스', is_correct: false }
                    ]
                },
                {
                    type: 'multiple_choice',
                    content: '종합소득세 과세표준 계산에서 공제되는 항목은? 종합소득세 과세표준 계산 시 공제되는 항목을 고르시오.',
                    explanation: '기본공제, 특별공제, 표준공제 등 모든 공제 항목이 과세표준 계산에서 차감됩니다.',
                    difficulty: 3,
                    category_name: '소득세',
                    options: [
                        { content: '기본공제', is_correct: false },
                        { content: '특별공제', is_correct: false },
                        { content: '표준공제', is_correct: false },
                        { content: '모든 항목', is_correct: true }
                    ]
                },
                {
                    type: 'multiple_choice',
                    content: '법인세 손금불산입 항목이 아닌 것은? 법인세법상 손금불산입 항목이 아닌 것을 고르시오.',
                    explanation: '급여는 일반적으로 손금산입 대상입니다.',
                    difficulty: 3,
                    category_name: '법인세',
                    options: [
                        { content: '업무상 접대비', is_correct: false },
                        { content: '법인세', is_correct: false },
                        { content: '부가가치세', is_correct: false },
                        { content: '급여', is_correct: true }
                    ]
                }
            ]
        };
    }

    // Mock 데이터 마이그레이션 체크 및 실행
    async checkAndMigrateMockData() {
        try {
            // Supabase에 데이터가 있는지 확인
            const { data: existingQuestions, error: questionsError } = await window.supabase
                .from('questions')
                .select('count')
                .limit(1);

            const { data: existingCategories, error: categoriesError } = await window.supabase
                .from('categories')
                .select('count')
                .limit(1);

            // 데이터가 없으면 Mock 데이터 마이그레이션 실행
            if ((!existingQuestions || existingQuestions.length === 0) && 
                (!existingCategories || existingCategories.length === 0)) {
                console.log('🔄 Mock 데이터 마이그레이션 시작...');
                await this.migrateMockData();
            } else {
                console.log('✅ Supabase에 이미 데이터가 존재합니다.');
            }
        } catch (error) {
            console.error('Mock 데이터 마이그레이션 체크 오류:', error);
        }
    }

    // Mock 데이터를 Supabase로 마이그레이션
    async migrateMockData() {
        try {
            Utils.showAlert('Mock 데이터를 Supabase로 마이그레이션 중...', 'info');
            
            // 1. 카테고리 마이그레이션
            console.log('📁 카테고리 마이그레이션 중...');
            const categoryMap = new Map();
            
            for (const category of this.mockData.categories) {
                const { data: newCategory, error } = await window.supabase
                    .from('categories')
                    .insert([{
                        name: category.name,
                        code: category.code
                    }])
                    .select()
                    .single();

                if (error) {
                    console.error('카테고리 생성 오류:', error);
                    continue;
                }
                
                categoryMap.set(category.name, newCategory.id);
                console.log(`✅ 카테고리 생성됨: ${category.name}`);
            }

            // 2. 문제 마이그레이션
            console.log('❓ 문제 마이그레이션 중...');
            for (const question of this.mockData.questions) {
                // 카테고리 ID 찾기
                const categoryId = categoryMap.get(question.category_name);
                
                const questionData = {
                    type: question.type,
                    content: question.content,
                    explanation: question.explanation,
                    difficulty: question.difficulty,
                    category_id: categoryId,
                    created_by: window.currentUser?.id || null
                };

                const { data: newQuestion, error: questionError } = await window.supabase
                    .from('questions')
                    .insert([questionData])
                    .select()
                    .single();

                if (questionError) {
                    console.error('문제 생성 오류:', questionError);
                    continue;
                }

                // 선택지 생성
                if (question.options && question.options.length > 0) {
                    const options = question.options.map((option, index) => ({
                        question_id: newQuestion.id,
                        content: option.content,
                        is_correct: option.is_correct,
                        order_index: index
                    }));

                    const { error: optionsError } = await window.supabase
                        .from('question_options')
                        .insert(options);

                    if (optionsError) {
                        console.error('선택지 생성 오류:', optionsError);
                    }
                }

                console.log(`✅ 문제 생성됨: ${question.content.substring(0, 50)}...`);
            }

            Utils.showAlert('Mock 데이터 마이그레이션이 완료되었습니다!', 'success');
            
            // 데이터 새로고침
            await this.loadBaseData();
            
        } catch (error) {
            console.error('Mock 데이터 마이그레이션 오류:', error);
            Utils.showAlert('Mock 데이터 마이그레이션에 실패했습니다.', 'error');
        }
    }

    // Mock/Local 데이터를 Supabase로 마이그레이션
    async migrateToSupabase(questionId) {
        try {
            const question = this.questions.find(q => q.id === questionId);
            if (!question) {
                Utils.showAlert('문제를 찾을 수 없습니다.', 'error');
                return;
            }

            Utils.showAlert('Supabase로 마이그레이션 중...', 'info');

            // 카테고리 ID 찾기
            let categoryId = null;
            if (question.categories?.name) {
                const { data: category } = await window.supabase
                    .from('categories')
                    .select('id')
                    .eq('name', question.categories.name)
                    .single();
                categoryId = category?.id;
            }

            const questionData = {
                type: question.type,
                content: question.content,
                explanation: question.explanation,
                difficulty: question.difficulty,
                category_id: categoryId,
                created_by: window.currentUser?.id || null
            };

            // 문제 저장
            const { data: newQuestion, error: questionError } = await window.supabase
                .from('questions')
                .insert([questionData])
                .select()
                .single();

            if (questionError) {
                console.error('문제 마이그레이션 오류:', questionError);
                Utils.showAlert('마이그레이션에 실패했습니다.', 'error');
                return;
            }

            // 선택지 저장
            if (question.question_options && question.question_options.length > 0) {
                const options = question.question_options.map((option, index) => ({
                    question_id: newQuestion.id,
                    content: option.content,
                    is_correct: option.is_correct,
                    order_index: index
                }));

                const { error: optionsError } = await window.supabase
                    .from('question_options')
                    .insert(options);

                if (optionsError) {
                    console.error('선택지 마이그레이션 오류:', optionsError);
                }
            }

            // 로컬 스토리지에서 제거 (Mock 데이터는 유지)
            if (questionId.startsWith('local-')) {
                const localQuestions = JSON.parse(localStorage.getItem('localQuestions') || '[]');
                const updatedLocalQuestions = localQuestions.filter(q => q.id !== questionId);
                localStorage.setItem('localQuestions', JSON.stringify(updatedLocalQuestions));
            }

            Utils.showAlert('마이그레이션이 완료되었습니다!', 'success');
            
            // 목록 새로고침
            await this.loadQuestions();
            await this.showQuestionManagement();

        } catch (error) {
            console.error('마이그레이션 오류:', error);
            Utils.showAlert('마이그레이션에 실패했습니다.', 'error');
        }
    }

    // 관리자 패널 초기화
    async init() {
        if (!window.authManager.isAdmin()) {
            Utils.showAlert('관리자 권한이 필요합니다.', 'error');
            return;
        }

        // Supabase 클라이언트 초기화 확인
        await this.ensureSupabaseClient();
        
        await this.loadBaseData();
        this.setupAdminNavigation();
        
        // Mock 데이터 마이그레이션 체크
        await this.checkAndMigrateMockData();
    }

    // Supabase 클라이언트 확인 및 초기화
    async ensureSupabaseClient() {
        try {
            // 현재 Supabase 클라이언트 상태 확인
            console.log('Supabase 클라이언트 상태 확인...');
            console.log('window.supabase:', typeof window.supabase, window.supabase);
            
            // Supabase 클라이언트가 없거나 잘못 초기화된 경우
            if (!window.supabase || typeof window.supabase.from !== 'function') {
                console.log('Supabase 클라이언트 재초기화 시도...');
                
                // 전역 supabase 확인
                if (typeof supabase !== 'undefined' && supabase.createClient) {
                    window.supabase = supabase.createClient(
                        SUPABASE_CONFIG.url,
                        SUPABASE_CONFIG.anonKey
                    );
                    console.log('✅ Supabase 클라이언트 재초기화 완료');
                } else {
                    console.error('❌ Supabase 라이브러리를 찾을 수 없습니다');
                    return false;
                }
            }
            
            // 연결 테스트
            const testResult = await window.supabase.from('categories').select('count', { count: 'exact' });
            console.log('Supabase 연결 테스트 결과:', testResult);
            
            return true;
        } catch (error) {
            console.error('Supabase 클라이언트 초기화 오류:', error);
            return false;
        }
    }

    // Mock/Local 데이터를 Supabase로 마이그레이션하는 메서드
    async checkAndMigrateMockData() {
        console.log('Mock 데이터 마이그레이션 체크 시작...');
        
        try {
            // Supabase에서 현재 문제 수 확인
            const { data: existingQuestions, error } = await window.supabase
                .from('questions')
                .select('id', { count: 'exact' });
            
            if (error) {
                console.error('Supabase 문제 조회 중 오류:', error);
                return;
            }
            
            const supabaseQuestionCount = existingQuestions ? existingQuestions.length : 0;
            const mockQuestionCount = this.mockData.questions.length;
            
            console.log(`Supabase 문제 수: ${supabaseQuestionCount}, Mock 문제 수: ${mockQuestionCount}`);
            
            if (supabaseQuestionCount === 0 && mockQuestionCount > 0) {
                console.log('Mock 데이터 자동 마이그레이션 시작...');
                await this.migrateMockDataToSupabase();
            }
        } catch (error) {
            console.error('Mock 데이터 마이그레이션 체크 오류:', error);
        }
    }

    // Mock 데이터를 Supabase로 마이그레이션
    async migrateMockDataToSupabase() {
        console.log('Mock 데이터 Supabase 마이그레이션 시작...');
        
        try {
            // Supabase 클라이언트 확인
            if (!window.supabase || typeof window.supabase.from !== 'function') {
                throw new Error('Supabase 클라이언트가 초기화되지 않았습니다.');
            }
            
            // 1. 카테고리 마이그레이션 (upsert 대신 존재 여부 확인 후 insert)
            console.log('카테고리 마이그레이션 중...');
            for (const category of this.mockData.categories) {
                try {
                    // 존재 확인
                    const { data: existsList, error: selErr } = await window.supabase
                        .from('categories')
                        .select('id')
                        .eq('name', category.name)
                        .eq('type', category.type)
                        .limit(1);

                    if (selErr) {
                        console.warn('카테고리 조회 실패(무시):', selErr.message);
                    }

                    if (!existsList || existsList.length === 0) {
                        const { error: insErr } = await window.supabase
                            .from('categories')
                            .insert([{ name: category.name, type: category.type, code: category.code }]);
                        if (insErr) {
                            console.warn('카테고리 저장 실패(무시):', insErr.message);
                        } else {
                            console.log(`✅ 카테고리 생성됨: ${category.name}`);
                        }
                    } else {
                        console.log(`↪︎ 카테고리 존재: ${category.name}`);
                    }
                } catch (catError) {
                    console.warn(`카테고리 ${category.name} 저장 중 오류:`, catError.message);
                }
            }
            
            // 2. 카테고리 ID 조회 및 캐시
            const categoryMap = {};
            try {
                const { data: categories } = await window.supabase
                    .from('categories')
                    .select('id, name');
                
                if (categories) {
                    categories.forEach(cat => {
                        categoryMap[cat.name] = cat.id;
                    });
                }
            } catch (error) {
                console.warn('카테고리 조회 실패:', error.message);
            }
            
            // 3. 문제 마이그레이션
            console.log('문제 마이그레이션 중...');
            let successCount = 0;
            
            for (const question of this.mockData.questions) {
                try {
                    // 카테고리 ID 찾기
                    let categoryId = null;
                    if (question.categories?.name && categoryMap[question.categories.name]) {
                        categoryId = categoryMap[question.categories.name];
                    }
                    
                    // 문제 저장 (최소 필드 중심, 안전 보정)
                    const questionType = question?.type || 'multiple_choice';
                    const questionContent = typeof question?.content === 'string' ? question.content : String(question?.content ?? '');
                    if (!questionContent.trim()) {
                        console.warn('질문 내용 없음으로 스킵');
                        continue;
                    }

                    const questionData = {
                        type: questionType,
                        // 일부 프로젝트 스키마는 title NOT NULL을 요구 → 콘텐츠에서 유도
                        title: (typeof question?.title === 'string' && question.title.trim())
                            ? question.title.trim()
                            : questionContent.substring(0, 50),
                        content: questionContent,
                        // 선택 필드들은 오류 방지를 위해 기본값으로 보정
                        explanation: (typeof question?.explanation === 'string' && question.explanation.trim()) ? question.explanation : null,
                        difficulty: Number.isInteger(question?.difficulty) ? question.difficulty : 3,
                        category_id: categoryId
                        // created_by는 프로필 FK 문제 회피를 위해 제외
                    };
                    
                    const { data: savedQuestion, error: questionError } = await window.supabase
                        .from('questions')
                        .insert([questionData])
                        .select()
                        .single();
                    
                    if (questionError) {
                        console.error('문제 저장 실패:', questionError.message);
                        continue;
                    }
                    
                    console.log(`✅ 문제 저장됨: ${question.content.substring(0, 50)}...`);
                    successCount++;
                    
                    // 4. 객관식 선택지 마이그레이션
                    const optionsSource = Array.isArray(question?.options) ? question.options : (Array.isArray(question?.question_options) ? question.question_options : []);
                    if (questionType === 'multiple_choice' && optionsSource.length > 0) {
                        for (let index = 0; index < optionsSource.length; index++) {
                            const option = optionsSource[index];
                            try {
                                const { error: optionError } = await window.supabase
                                    .from('question_options')
                                    .insert([{
                                        question_id: savedQuestion.id,
                                        content: (typeof option?.content === 'string' ? option.content : (typeof option?.option_text === 'string' ? option.option_text : '')),
                                        is_correct: option.is_correct,
                                        order_index: (typeof option?.order_index === 'number') ? option.order_index : (typeof option?.display_order === 'number' ? option.display_order : index)
                                    }]);
                                
                                if (optionError) {
                                    console.warn('선택지 저장 실패:', optionError.message);
                                }
                            } catch (optError) {
                                console.warn('선택지 처리 오류:', optError.message);
                            }
                        }
                    }
                } catch (questionError) {
                    console.error('문제 처리 오류:', questionError.message);
                }
            }
            
            console.log(`✅ Mock 데이터 마이그레이션 완료 (${successCount}/${this.mockData.questions.length}개 성공)`);
            Utils.showAlert(`Mock 데이터 마이그레이션 완료! ${successCount}개 문제가 저장되었습니다.`, 'success');
            
            // 문제 목록 다시 로드
            await this.loadQuestions();
            
        } catch (error) {
            console.error('마이그레이션 오류:', error);
            Utils.showAlert(`마이그레이션 실패: ${error.message}`, 'error');
        }
    }

    // 수동 동기화 실행
    async manualSync() {
        console.log('수동 동기화 시작...');
        Utils.showAlert('데이터 동기화 중...', 'info');
        
        try {
            await this.migrateMockDataToSupabase();
            await this.updateSyncStatus();
        } catch (error) {
            console.error('수동 동기화 오류:', error);
            Utils.showAlert('동기화에 실패했습니다.', 'error');
        }
    }

    // 동기화 상태 업데이트
    async updateSyncStatus() {
        try {
            const statusElement = document.getElementById('sync-status');
            if (!statusElement) return;
            
            const { data: supabaseQuestions, error } = await window.supabase
                .from('questions')
                .select('id', { count: 'exact' });
            
            const supabaseCount = supabaseQuestions ? supabaseQuestions.length : 0;
            const localCount = this.questions.length;
            
            if (error) {
                statusElement.innerHTML = '<span class="text-danger">❌ 데이터베이스 연결 오류</span>';
            } else if (supabaseCount === 0 && localCount > 0) {
                statusElement.innerHTML = `<span class="text-warning">⚠️ 로컬에 ${localCount}개 문제가 있지만 Supabase에는 없음 (동기화 필요)</span>`;
            } else if (supabaseCount === localCount && supabaseCount > 0) {
                statusElement.innerHTML = `<span class="text-success">✅ 동기화됨 (${supabaseCount}개 문제)</span>`;
            } else {
                statusElement.innerHTML = `<span class="text-info">📊 Supabase: ${supabaseCount}개, 로컬: ${localCount}개</span>`;
            }
        } catch (error) {
            console.error('동기화 상태 업데이트 오류:', error);
        }
    }

    // 기본 데이터 로드
    async loadBaseData() {
        try {
            // 카테고리 로드
            const { data: categories, error: catError } = await window.supabase
                .from('categories')
                .select('*')
                .order('name');

            if (catError) {
                console.error('카테고리 로드 오류:', catError);
                // 오류 발생 시 Mock 데이터 사용
                this.categories = this.mockData.categories.map(cat => ({
                    id: cat.code,
                    name: cat.name,
                    type: cat.type,
                    code: cat.code
                }));
            } else {
                this.categories = categories || [];
            }

            // 부서 로드
            const { data: departments, error: deptError } = await window.supabase
                .from('departments')
                .select('*')
                .order('name');

            if (deptError) {
                console.error('부서 로드 오류:', deptError);
                this.departments = [];
            } else {
                this.departments = departments || [];
            }

        } catch (error) {
            console.error('Load base data error:', error);
            Utils.showAlert('기본 데이터 로드에 실패했습니다.', 'error');
        }
    }

    // 관리자 네비게이션 설정
    setupAdminNavigation() {
        const adminMenuButtons = document.querySelectorAll('.admin-menu-btn');
        
        adminMenuButtons.forEach(button => {
            button.addEventListener('click', () => {
                const section = button.getAttribute('data-admin-section');
                this.showAdminSection(section);
            });
        });
    }

    // 관리자 섹션 표시
    async showAdminSection(section) {
        this.currentSection = section;
        const contentContainer = document.getElementById('admin-content');
        
        if (!contentContainer) return;

        try {
            Utils.showLoading();

            switch (section) {
                case 'questions':
                    await this.showQuestionManagement();
                    break;
                case 'exams':
                    await this.showExamManagement();
                    break;
                case 'grading':
                    await this.showGradingManagement();
                    break;
                case 'stats':
                    await this.showStatistics();
                    break;
                case 'points':
                    await this.showPointManagement();
                    break;
                default:
                    contentContainer.innerHTML = '<p>섹션을 선택해주세요.</p>';
            }

        } catch (error) {
            console.error('Show admin section error:', error);
            Utils.showAlert('섹션을 로드할 수 없습니다.', 'error');
        } finally {
            Utils.hideLoading();
        }
    }

    // 문제 관리 화면
    async showQuestionManagement() {
        await this.loadQuestions();
        
        const contentContainer = document.getElementById('admin-content');
        contentContainer.innerHTML = `
            <div class="admin-section-header">
                <h4>문제 관리</h4>
                <button class="btn btn-primary" onclick="adminManager.showCreateQuestionModal()">
                    <i class="fas fa-plus"></i> 새 문제 등록
                </button>
            </div>
            
            <div class="sync-status-alert">
                <div class="alert alert-info">
                    <i class="fas fa-info-circle"></i>
                    <strong>데이터 동기화 상태:</strong>
                    <span id="sync-status">확인 중...</span>
                    <button class="btn btn-sm" style="background: #28a745; color: white; padding: 6px 12px; border: none; border-radius: 4px; cursor: pointer;" onclick="adminManager.manualSync()">
                        <i class="fas fa-sync"></i> 수동 동기화
                    </button>
                    <button class="btn btn-sm" style="background: #17a2b8; color: white; padding: 6px 12px; border: none; border-radius: 4px; cursor: pointer; margin-left: 5px;" onclick="adminManager.updateSyncStatus()">
                        <i class="fas fa-refresh"></i> 상태 새로고침
                    </button>
                </div>
            </div>
            
            <div class="question-filters">
                <select id="category-filter" onchange="adminManager.filterQuestions()">
                    <option value="">전체 카테고리</option>
                    ${this.categories.map(cat => 
                        `<option value="${cat.id}">${cat.name}</option>`
                    ).join('')}
                </select>
                
                <select id="type-filter" onchange="adminManager.filterQuestions()">
                    <option value="">전체 유형</option>
                    <option value="multiple_choice">객관식</option>
                    <option value="subjective">주관식</option>
                    <option value="group">그룹형</option>
                </select>
                
                <input type="text" id="search-input" placeholder="문제 내용 검색..." 
                       oninput="adminManager.searchQuestions(this.value)">
            </div>
            
            <div id="questions-list" class="questions-container">
                ${this.renderQuestionsList()}
            </div>
        `;
        
        // 동기화 상태 업데이트
        this.updateSyncStatus();
    }

    // 동기화 상태 업데이트
    async updateSyncStatus() {
        const statusElement = document.getElementById('sync-status');
        if (!statusElement) return;
        
        try {
            // Supabase에서 문제 수 확인
            const { data: supabaseQuestions, error } = await window.supabase
                .from('questions')
                .select('count')
                .limit(1);
            
            const supabaseCount = supabaseQuestions?.length || 0;
            const localCount = this.questions.length;
            
            if (error) {
                statusElement.innerHTML = `
                    <span class="text-danger">
                        <i class="fas fa-exclamation-triangle"></i>
                        Supabase 연결 오류: ${error.message}
                    </span>
                `;
            } else if (supabaseCount === 0 && localCount > 0) {
                statusElement.innerHTML = `
                    <span class="text-warning">
                        <i class="fas fa-exclamation-triangle"></i>
                        로컬에 ${localCount}개 문제가 있지만 Supabase에는 없음 (동기화 필요)
                    </span>
                    <button class="btn btn-sm btn-success ml-2" onclick="adminManager.manualSync()">
                        <i class="fas fa-upload"></i> 수동 동기화
                    </button>
                `;
            } else if (supabaseCount > 0 && localCount > 0) {
                statusElement.innerHTML = `
                    <span class="text-success">
                        <i class="fas fa-check-circle"></i>
                        Supabase: ${supabaseCount}개, 로컬: ${localCount}개 (부분 동기화됨)
                    </span>
                `;
            } else if (supabaseCount > 0 && localCount === 0) {
                statusElement.innerHTML = `
                    <span class="text-info">
                        <i class="fas fa-info-circle"></i>
                        Supabase에만 ${supabaseCount}개 문제가 있음
                    </span>
                `;
            } else {
                statusElement.innerHTML = `
                    <span class="text-muted">
                        <i class="fas fa-info-circle"></i>
                        문제가 없음
                    </span>
                `;
            }
        } catch (error) {
            statusElement.innerHTML = `
                <span class="text-danger">
                    <i class="fas fa-exclamation-triangle"></i>
                    상태 확인 오류: ${error.message}
                </span>
            `;
        }
    }

    // 수동 동기화 실행
    async manualSync() {
        try {
            Utils.showAlert('수동 동기화를 시작합니다...', 'info');
            
            // Mock 데이터를 Supabase로 마이그레이션
            await this.migrateMockData();
            
            // 상태 업데이트
            await this.updateSyncStatus();
            
        } catch (error) {
            console.error('수동 동기화 오류:', error);
            Utils.showAlert('수동 동기화에 실패했습니다.', 'error');
        }
    }

    // 동기화 상태 확인
    async checkSyncStatus() {
        await this.updateSyncStatus();
        Utils.showAlert('동기화 상태를 새로고침했습니다.', 'info');
    }

    // 문제 목록 로드
    async loadQuestions() {
        try {
            console.log('Supabase에서 문제 목록 가져오는 중...');
            
            const { data: questions, error } = await window.supabase
                .from('questions')
                .select(`
                    *,
                    categories (name),
                    question_groups (title),
                    question_options (*)
                `)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Supabase 문제 로드 오류:', error);
                // 오류 발생 시 빈 배열 사용 (Mock 데이터 사용 안 함)
                this.questions = [];
                Utils.showAlert(`데이터베이스 연결 오류: ${error.message}`, 'error');
            } else {
                this.questions = questions || [];
                console.log('Supabase에서 실제 문제 로드됨:', this.questions.length);
                
                if (this.questions.length === 0) {
                    console.log('⚠️ Supabase에 등록된 문제가 없습니다.');
                } else {
                    console.log('✅ 실제 데이터베이스 문제를 표시합니다.');
                }
            }

            // 로컬 스토리지 정리 - Supabase 데이터만 유지
            if (this.questions.length > 0) {
                const cleanedQuestions = this.questions.map(q => ({
                    id: q.id,
                    title: q.title,
                    content: q.content,
                    type: q.type || 'multiple_choice',
                    explanation: q.explanation,
                    difficulty: q.difficulty || 3,
                    category_id: q.category_id,
                    created_at: q.created_at,
                    options: q.question_options || [],
                    isLocal: false
                }));
                
                localStorage.setItem('questions', JSON.stringify(cleanedQuestions));
                console.log('로컬 스토리지 정리 완료. Supabase 데이터만 유지:', cleanedQuestions.length);
            }

        } catch (error) {
            console.error('Load questions error:', error);
            Utils.showAlert('문제 목록을 불러올 수 없습니다. 네트워크 연결을 확인해주세요.', 'error');
            // catch에서도 Mock 데이터 사용하지 않음
            this.questions = [];
        }
    }

    // 문제 목록 렌더링
    renderQuestionsList() {
        if (this.questions.length === 0) {
            return '<p class="text-center">등록된 문제가 없습니다.</p>';
        }

        return `
            <div class="questions-grid">
                ${this.questions.map(question => {
                    const isMock = question.id.startsWith('mock-');
                    const isLocal = question.id.startsWith('local-');
                    const dataSource = isMock ? 'Mock' : isLocal ? 'Local' : 'Supabase';
                    
                    return `
                        <div class="question-item question-card ${isMock ? 'mock-data' : isLocal ? 'local-data' : 'supabase-data'}" 
                             data-category="${question.category_id || ''}" 
                             data-type="${question.type || ''}">
                            <div class="question-card-header">
                                <span class="question-type ${question.type}">${this.getQuestionTypeText(question.type)}</span>
                                <span class="question-difficulty">난이도 ${question.difficulty}</span>
                                <span class="data-source ${dataSource.toLowerCase()}">${dataSource}</span>
                            </div>
                            
                            <div class="question-content question-content-preview">
                                ${Utils.escapeHtml(question.content.substring(0, 100))}
                                ${question.content.length > 100 ? '...' : ''}
                            </div>
                            
                            <div class="question-meta">
                                <span class="category">${question.categories?.name || '미분류'}</span>
                                ${question.tags ? question.tags.map(tag => `<span class="tag">${tag}</span>`).join('') : ''}
                            </div>
                            
                            <div class="question-actions">
                                <button class="btn btn-sm btn-outline" onclick="adminManager.editQuestion('${question.id}')">
                                    <i class="fas fa-edit"></i> 수정
                                </button>
                                <button class="btn btn-sm btn-danger" onclick="adminManager.deleteQuestion('${question.id}')">
                                    <i class="fas fa-trash"></i> 삭제
                                </button>
                                ${isMock || isLocal ? `
                                    <button class="btn btn-sm btn-success" onclick="adminManager.migrateToSupabase('${question.id}')">
                                        <i class="fas fa-upload"></i> Supabase로
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    // 문제 유형 텍스트
    getQuestionTypeText(type) {
        const typeMap = {
            'multiple_choice': '객관식',
            'subjective': '주관식',
            'group': '그룹형'
        };
        return typeMap[type] || type;
    }

    // 문제 생성 모달 표시
    showCreateQuestionModal() {
        const modalHtml = `
            <div class="modal-overlay" id="question-modal">
                <div class="modal-content" style="max-width: 800px;">
                    <div class="modal-header">
                        <h3>새 문제 등록</h3>
                        <button class="modal-close" onclick="document.getElementById('question-modal').remove()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div class="modal-body">
                        <form id="question-form" onsubmit="adminManager.saveQuestion(event)">
                            <div class="form-group">
                                <label for="question-type">문제 유형</label>
                                <select id="question-type" name="type" required onchange="adminManager.toggleQuestionOptions()">
                                    <option value="">선택하세요</option>
                                    <option value="multiple_choice">객관식</option>
                                    <option value="subjective">주관식</option>
                                    <option value="group">그룹형</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label for="question-category">카테고리</label>
                                <select id="question-category" name="category_id">
                                    <option value="">선택하세요</option>
                                    ${this.categories.map(cat => 
                                        `<option value="${cat.id}">${cat.name}</option>`
                                    ).join('')}
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label for="question-difficulty">난이도</label>
                                <select id="question-difficulty" name="difficulty">
                                    <option value="1">1 (쉬움)</option>
                                    <option value="2">2</option>
                                    <option value="3" selected>3 (보통)</option>
                                    <option value="4">4</option>
                                    <option value="5">5 (어려움)</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label for="question-content">문제 내용</label>
                                <textarea id="question-content" name="content" rows="5" required></textarea>
                            </div>
                            
                            <div class="form-group">
                                <label for="question-explanation">해설 (선택사항)</label>
                                <textarea id="question-explanation" name="explanation" rows="3"></textarea>
                            </div>
                            
                            <div class="form-group">
                                <label for="question-tags">태그 (쉼표로 구분)</label>
                                <input type="text" id="question-tags" name="tags" placeholder="예: 부가세, 신고, 과세표준">
                            </div>
                            
                            <div id="options-container" class="hidden">
                                <h4>선택지</h4>
                                <div id="options-list">
                                    <div class="option-item">
                                        <input type="text" placeholder="선택지 1" class="option-text">
                                        <label><input type="radio" name="correct-option" value="0"> 정답</label>
                                    </div>
                                    <div class="option-item">
                                        <input type="text" placeholder="선택지 2" class="option-text">
                                        <label><input type="radio" name="correct-option" value="1"> 정답</label>
                                    </div>
                                    <div class="option-item">
                                        <input type="text" placeholder="선택지 3" class="option-text">
                                        <label><input type="radio" name="correct-option" value="2"> 정답</label>
                                    </div>
                                    <div class="option-item">
                                        <input type="text" placeholder="선택지 4" class="option-text">
                                        <label><input type="radio" name="correct-option" value="3"> 정답</label>
                                    </div>
                                </div>
                                <button type="button" onclick="adminManager.addOption()" class="btn btn-outline">
                                    <i class="fas fa-plus"></i> 선택지 추가
                                </button>
                            </div>
                            
                            <div class="modal-actions">
                                <button type="button" onclick="document.getElementById('question-modal').remove()" 
                                        class="btn btn-outline">취소</button>
                                <button type="submit" class="btn btn-primary">저장</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    // 문제 옵션 토글
    toggleQuestionOptions() {
        const type = document.getElementById('question-type').value;
        const optionsContainer = document.getElementById('options-container');
        
        if (type === 'multiple_choice') {
            optionsContainer.classList.remove('hidden');
        } else {
            optionsContainer.classList.add('hidden');
        }
    }

    // 선택지 추가
    addOption() {
        const optionsList = document.getElementById('options-list');
        const optionCount = optionsList.children.length;
        
        const optionHtml = `
            <div class="option-item">
                <input type="text" placeholder="선택지 ${optionCount + 1}" class="option-text">
                <label><input type="radio" name="correct-option" value="${optionCount}"> 정답</label>
                <button type="button" onclick="this.parentNode.remove()" class="btn btn-sm btn-danger">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        optionsList.insertAdjacentHTML('beforeend', optionHtml);
    }

    // 문제 편집 모달 표시
    async editQuestion(questionId) {
        try {
            Utils.showLoading();

            const { data: question, error } = await window.supabase
                .from('questions')
                .select(`
                    *,
                    question_options (*)
                `)
                .eq('id', questionId)
                .single();

            if (error) throw error;

            // 편집 모달 렌더
            const optionsHiddenClass = question.type === 'multiple_choice' ? '' : 'hidden';
            const sortedOptions = (question.question_options || [])
                .slice()
                .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

            let correctIndex = sortedOptions.findIndex(o => o.is_correct);
            if (correctIndex < 0) correctIndex = 0;

            const optionsHtml = (sortedOptions.length > 0 ? sortedOptions : new Array(4).fill(null))
                .map((opt, idx) => {
                    const text = opt ? Utils.escapeHtml(opt.content || '') : '';
                    const checked = opt ? (opt.is_correct ? 'checked' : '') : (idx === 0 ? 'checked' : '');
                    return `
                        <div class="option-item">
                            <input type="text" placeholder="선택지 ${idx + 1}" class="option-text" value="${text}">
                            <label><input type="radio" name="correct-option" value="${idx}" ${checked}> 정답</label>
                            <button type="button" onclick="this.parentNode.remove()" class="btn btn-sm btn-danger">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    `;
                }).join('');

            const modalHtml = `
                <div class="modal-overlay" id="question-modal">
                    <div class="modal-content" style="max-width: 800px;">
                        <div class="modal-header">
                            <h3>문제 수정</h3>
                            <button class="modal-close" onclick="document.getElementById('question-modal').remove()">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <div class="modal-body">
                            <form id="question-form" onsubmit="adminManager.updateQuestion(event, '${question.id}')">
                                <div class="form-group">
                                    <label for="question-type">문제 유형</label>
                                    <select id="question-type" name="type" required onchange="adminManager.toggleQuestionOptions()">
                                        <option value="">선택하세요</option>
                                        <option value="multiple_choice" ${question.type === 'multiple_choice' ? 'selected' : ''}>객관식</option>
                                        <option value="subjective" ${question.type === 'subjective' ? 'selected' : ''}>주관식</option>
                                        <option value="group" ${question.type === 'group' ? 'selected' : ''}>그룹형</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label for="question-category">카테고리</label>
                                    <select id="question-category" name="category_id">
                                        <option value="">선택하세요</option>
                                        ${this.categories.map(cat => 
                                            `<option value="${cat.id}" ${cat.id === question.category_id ? 'selected' : ''}>${cat.name}</option>`
                                        ).join('')}
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label for="question-difficulty">난이도</label>
                                    <select id="question-difficulty" name="difficulty">
                                        ${[1,2,3,4,5].map(n => `<option value="${n}" ${question.difficulty === n ? 'selected' : ''}>${n}${n===1?' (쉬움)':n===3?' (보통)':n===5?' (어려움)':''}</option>`).join('')}
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label for="question-content">문제 내용</label>
                                    <textarea id="question-content" name="content" rows="5" required>${Utils.escapeHtml(question.content || '')}</textarea>
                                </div>
                                <div class="form-group">
                                    <label for="question-explanation">해설 (선택사항)</label>
                                    <textarea id="question-explanation" name="explanation" rows="3">${Utils.escapeHtml(question.explanation || '')}</textarea>
                                </div>
                                <div class="form-group">
                                    <label for="question-tags">태그 (쉼표로 구분)</label>
                                    <input type="text" id="question-tags" name="tags" value="${(question.tags || []).join(', ')}" placeholder="예: 부가세, 신고, 과세표준">
                                </div>
                                <div id="options-container" class="${optionsHiddenClass}">
                                    <h4>선택지</h4>
                                    <div id="options-list">${optionsHtml}</div>
                                    <button type="button" onclick="adminManager.addOption()" class="btn btn-outline">
                                        <i class="fas fa-plus"></i> 선택지 추가
                                    </button>
                                </div>
                                <div class="modal-actions">
                                    <button type="button" onclick="document.getElementById('question-modal').remove()" class="btn btn-outline">취소</button>
                                    <button type="submit" class="btn btn-primary">수정 저장</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>`;

            document.body.insertAdjacentHTML('beforeend', modalHtml);

        } catch (error) {
            console.error('Edit question load error:', error);
            Utils.showAlert('문제를 불러오지 못했습니다.', 'error');
        } finally {
            Utils.hideLoading();
        }
    }

    // 문제 수정 저장
    async updateQuestion(event, questionId) {
        event.preventDefault();
        try {
            Utils.showLoading();

            const formData = new FormData(event.target);
            const content = formData.get('content') || '';
            const type = formData.get('type');
            const baseData = {
                type,
                title: content.substring(0, 50),
                content,
                explanation: formData.get('explanation') || null,
                difficulty: parseInt(formData.get('difficulty')) || 3,
                category_id: formData.get('category_id') || null,
                tags: formData.get('tags') ? formData.get('tags').split(',').map(t => t.trim()).filter(Boolean) : null
            };

            const { data: updated, error: updError } = await window.supabase
                .from('questions')
                .update(baseData)
                .eq('id', questionId)
                .select()
                .single();

            if (updError) throw updError;

            // 객관식 선택지 처리: 기존 전량 삭제 후 재삽입
            if (type === 'multiple_choice') {
                const { error: delErr } = await window.supabase
                    .from('question_options')
                    .delete()
                    .eq('question_id', questionId);
                if (delErr) {
                    console.warn('선택지 삭제 경고:', delErr.message);
                }

                const optionItems = document.querySelectorAll('.option-item');
                const correctOptionIndex = parseInt(document.querySelector('input[name="correct-option"]:checked')?.value);
                const options = [];
                optionItems.forEach((item, index) => {
                    const text = item.querySelector('.option-text').value.trim();
                    if (text) {
                        options.push({
                            question_id: questionId,
                            content: text,
                            is_correct: index === correctOptionIndex,
                            order_index: index
                        });
                    }
                });

                if (options.length > 0) {
                    const { error: insErr } = await window.supabase
                        .from('question_options')
                        .insert(options);
                    if (insErr) {
                        console.warn('선택지 저장 경고:', insErr.message);
                    }
                }
            }

            Utils.showAlert('문제가 수정되었습니다.', 'success');
            document.getElementById('question-modal').remove();
            await this.showQuestionManagement();

        } catch (error) {
            console.error('Update question error:', error);
            Utils.showAlert('문제 수정에 실패했습니다.', 'error');
        } finally {
            Utils.hideLoading();
        }
    }

    // 문제 저장
    async saveQuestion(event) {
        event.preventDefault();
        
        try {
            Utils.showLoading();
            
            const formData = new FormData(event.target);
            const questionData = {
                type: formData.get('type'),
                content: formData.get('content'),
                explanation: formData.get('explanation'),
                difficulty: parseInt(formData.get('difficulty')),
                category_id: formData.get('category_id') || null,
                tags: formData.get('tags') ? formData.get('tags').split(',').map(tag => tag.trim()) : null,
                created_by: window.currentUser?.id || null
            };

            console.log('저장할 문제 데이터:', questionData);

            // 문제 저장
            const { data: question, error: questionError } = await window.supabase
                .from('questions')
                .insert([questionData])
                .select()
                .single();

            if (questionError) {
                console.error('Supabase 문제 저장 오류:', questionError);
                
                // Supabase 저장 실패 시 로컬 스토리지에 저장
                const localQuestions = JSON.parse(localStorage.getItem('localQuestions') || '[]');
                const newQuestion = {
                    id: `local-${Date.now()}`,
                    ...questionData,
                    created_at: new Date().toISOString()
                };
                localQuestions.push(newQuestion);
                localStorage.setItem('localQuestions', JSON.stringify(localQuestions));
                
                Utils.showAlert('Supabase 저장 실패. 로컬에 저장되었습니다.', 'warning');
                document.getElementById('question-modal').remove();
                await this.showQuestionManagement();
                return;
            }

            // 객관식인 경우 선택지 저장
            if (questionData.type === 'multiple_choice') {
                const optionItems = document.querySelectorAll('.option-item');
                const correctOptionIndex = parseInt(document.querySelector('input[name="correct-option"]:checked')?.value);
                const options = [];

                optionItems.forEach((item, index) => {
                    const text = item.querySelector('.option-text').value.trim();
                    if (text) {
                        options.push({
                            question_id: question.id,
                            content: text,
                            is_correct: index === correctOptionIndex,
                            order_index: index
                        });
                    }
                });

                if (options.length > 0) {
                    const { error: optionsError } = await window.supabase
                        .from('question_options')
                        .insert(options);

                    if (optionsError) {
                        console.error('선택지 저장 오류:', optionsError);
                        Utils.showAlert('문제는 저장되었지만 선택지 저장에 실패했습니다.', 'warning');
                    }
                }
            }

            Utils.showAlert('문제가 성공적으로 등록되었습니다!', 'success');
            document.getElementById('question-modal').remove();
            await this.showQuestionManagement(); // 목록 새로고침

        } catch (error) {
            console.error('Save question error:', error);
            Utils.showAlert('문제 등록에 실패했습니다.', 'error');
        } finally {
            Utils.hideLoading();
        }
    }

    // 시험 관리 화면
    async showExamManagement() {
        await this.loadExams();
        
        const contentContainer = document.getElementById('admin-content');
        contentContainer.innerHTML = `
            <div class="admin-section-header">
                <h4>시험지 관리</h4>
                <button class="btn btn-primary" onclick="adminManager.showCreateExamModal()">
                    <i class="fas fa-plus"></i> 새 시험지 생성
                </button>
            </div>
            
            <div id="exams-list" class="exams-admin-container">
                ${this.renderExamsList()}
            </div>
        `;
    }

    // 시험 목록 로드
    async loadExams() {
        try {
            const { data: exams, error } = await window.supabase
                .from('exams')
                .select(`
                    *,
                    exam_questions (count),
                    exam_sessions (count)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            this.exams = exams || [];

        } catch (error) {
            console.error('Load exams error:', error);
            Utils.showAlert('시험 목록을 불러올 수 없습니다.', 'error');
        }
    }

    // 시험 목록 렌더링
    renderExamsList() {
        if (this.exams.length === 0) {
            return '<p class="text-center">등록된 시험이 없습니다.</p>';
        }

        return `
            <div class="exams-admin-grid">
                ${this.exams.map(exam => `
                    <div class="exam-admin-card">
                        <div class="exam-admin-header">
                            <h5>${Utils.escapeHtml(exam.title)}</h5>
                            <span class="exam-status ${exam.status}">${this.getExamStatusText(exam.status)}</span>
                        </div>
                        
                        <div class="exam-admin-meta">
                            <span><i class="fas fa-clock"></i> ${exam.duration}분</span>
                            <span><i class="fas fa-question-circle"></i> ${exam.exam_questions?.length || 0}문항</span>
                            <span><i class="fas fa-users"></i> ${exam.exam_sessions?.length || 0}명 응시</span>
                        </div>
                        
                        <div class="exam-admin-actions">
                            <button class="btn btn-sm btn-outline" onclick="adminManager.editExam('${exam.id}')">
                                <i class="fas fa-edit"></i> 수정
                            </button>
                            <button class="btn btn-sm btn-primary" onclick="adminManager.manageExamQuestions('${exam.id}')">
                                <i class="fas fa-list"></i> 문항 관리
                            </button>
                            <button class="btn btn-sm btn-success" onclick="adminManager.manageExamPermissions('${exam.id}')">
                                <i class="fas fa-users"></i> 권한 관리
                            </button>
                            ${exam.status === 'draft' ? 
                                `<button class="btn btn-sm btn-warning" onclick="adminManager.publishExam('${exam.id}')">
                                    <i class="fas fa-paper-plane"></i> 배포
                                </button>` : ''
                            }
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // 시험 상태 텍스트
    getExamStatusText(status) {
        const statusMap = {
            'draft': '초안',
            'published': '배포됨',
            'closed': '종료됨'
        };
        return statusMap[status] || status;
    }

    // 채점 관리 화면
    async showGradingManagement() {
        const contentContainer = document.getElementById('admin-content');
        contentContainer.innerHTML = `
            <div class="admin-section-header">
                <h4>채점 관리</h4>
                <p>주관식 문항의 수동 채점을 진행합니다.</p>
            </div>
            
            <div id="grading-list" class="grading-container">
                <div class="text-center">
                    <i class="fas fa-spinner fa-spin"></i> 채점 대기 목록을 불러오는 중...
                </div>
            </div>
        `;

        await this.loadPendingGrading();
    }

    // 채점 대기 목록 로드
    async loadPendingGrading() {
        try {
            const { data: pendingAnswers, error } = await window.supabase
                .from('exam_answers')
                .select(`
                    *,
                    exam_sessions (
                        id,
                        exams (title),
                        profiles (name)
                    ),
                    questions (content, type)
                `)
                .eq('questions.type', 'subjective')
                .is('is_correct', null)
                .order('created_at');

            if (error) throw error;

            const container = document.getElementById('grading-list');
            
            if (!pendingAnswers || pendingAnswers.length === 0) {
                container.innerHTML = '<p class="text-center">채점할 주관식 답안이 없습니다.</p>';
                return;
            }

            container.innerHTML = pendingAnswers.map(answer => `
                <div class="grading-item">
                    <div class="grading-header">
                        <h5>${Utils.escapeHtml(answer.exam_sessions.exams.title)}</h5>
                        <span>응시자: ${Utils.escapeHtml(answer.exam_sessions.profiles.name)}</span>
                    </div>
                    
                    <div class="question-content">
                        <strong>문제:</strong> ${Utils.escapeHtml(answer.questions.content)}
                    </div>
                    
                    <div class="answer-content">
                        <strong>답안:</strong> ${Utils.escapeHtml(answer.answer || '답안 없음')}
                    </div>
                    
                    <div class="grading-actions">
                        <input type="number" min="0" max="10" placeholder="점수" class="score-input" id="score-${answer.id}">
                        <button class="btn btn-success" onclick="adminManager.gradeAnswer('${answer.id}', true)">
                            <i class="fas fa-check"></i> 정답
                        </button>
                        <button class="btn btn-danger" onclick="adminManager.gradeAnswer('${answer.id}', false)">
                            <i class="fas fa-times"></i> 오답
                        </button>
                    </div>
                </div>
            `).join('');

        } catch (error) {
            console.error('Load pending grading error:', error);
            Utils.showAlert('채점 목록을 불러올 수 없습니다.', 'error');
        }
    }

    // 답안 채점
    async gradeAnswer(answerId, isCorrect) {
        try {
            const scoreInput = document.getElementById(`score-${answerId}`);
            const points = parseInt(scoreInput.value) || (isCorrect ? 1 : 0);

            const { error } = await window.supabase
                .from('exam_answers')
                .update({
                    is_correct: isCorrect,
                    points: points,
                    graded_by: window.currentUser.id,
                    graded_at: new Date().toISOString()
                })
                .eq('id', answerId);

            if (error) throw error;

            Utils.showAlert('채점이 완료되었습니다.', 'success');
            await this.loadPendingGrading(); // 목록 새로고침

        } catch (error) {
            console.error('Grade answer error:', error);
            Utils.showAlert('채점에 실패했습니다.', 'error');
        }
    }

    // 통계 화면
    async showStatistics() {
        const contentContainer = document.getElementById('admin-content');
        contentContainer.innerHTML = `
            <div class="admin-section-header">
                <h4>통계 분석</h4>
            </div>
            
            <div id="statistics-content" class="statistics-container">
                <div class="text-center">
                    <i class="fas fa-spinner fa-spin"></i> 통계를 생성하는 중...
                </div>
            </div>
        `;

        await this.loadStatistics();
    }

    // 통계 데이터 로드
    async loadStatistics() {
        try {
            // 시험 통계
            const { data: examStats, error: examError } = await window.supabase
                .from('exam_statistics')
                .select('*');

            if (examError) throw examError;

            // 문제 통계
            const { data: questionStats, error: questionError } = await window.supabase
                .from('question_statistics')
                .select('*')
                .order('correct_rate', { ascending: false });

            if (questionError) throw questionError;

            const container = document.getElementById('statistics-content');
            container.innerHTML = `
                <div class="stats-section">
                    <h5>시험별 통계</h5>
                    <div class="stats-table">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>시험명</th>
                                    <th>응시자 수</th>
                                    <th>평균 점수</th>
                                    <th>합격률</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${examStats.map(stat => `
                                    <tr>
                                        <td>${Utils.escapeHtml(stat.exam_title)}</td>
                                        <td>${stat.total_participants}</td>
                                        <td>${stat.average_score ? Math.round(stat.average_score) : 0}점</td>
                                        <td>${stat.completed_count > 0 ? Math.round((stat.passed_count / stat.completed_count) * 100) : 0}%</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <div class="stats-section">
                    <h5>문제별 정답률</h5>
                    <div class="stats-table">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>문제</th>
                                    <th>카테고리</th>
                                    <th>유형</th>
                                    <th>정답률</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${questionStats.slice(0, 20).map(stat => `
                                    <tr>
                                        <td>${Utils.escapeHtml(stat.question_content.substring(0, 50))}...</td>
                                        <td>${Utils.escapeHtml(stat.category_name || '미분류')}</td>
                                        <td>${this.getQuestionTypeText(stat.question_type)}</td>
                                        <td>${stat.correct_rate}%</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;

        } catch (error) {
            console.error('Load statistics error:', error);
            Utils.showAlert('통계를 불러올 수 없습니다.', 'error');
        }
    }

    // 문제 필터링 함수
    filterQuestions() {
        const categoryFilter = document.getElementById('category-filter').value;
        const typeFilter = document.getElementById('type-filter').value;
        const searchInput = document.getElementById('search-input').value;
        
        console.log('필터링 실행:', { categoryFilter, typeFilter, searchInput });
        
        // 모든 문제 요소 가져오기
        const questionElements = document.querySelectorAll('.question-item');
        
        questionElements.forEach(element => {
            let shouldShow = true;
            
            // 카테고리 필터
            if (categoryFilter && element.dataset.category !== categoryFilter) {
                shouldShow = false;
            }
            
            // 유형 필터
            if (typeFilter && element.dataset.type !== typeFilter) {
                shouldShow = false;
            }
            
            // 검색어 필터
            if (searchInput) {
                const questionText = element.querySelector('.question-content').textContent.toLowerCase();
                const searchLower = searchInput.toLowerCase();
                if (!questionText.includes(searchLower)) {
                    shouldShow = false;
                }
            }
            
            // 표시/숨김 처리
            element.style.display = shouldShow ? 'block' : 'none';
        });
        
        // 필터링 결과 표시
        const visibleCount = document.querySelectorAll('.question-item[style*="display: block"], .question-item:not([style*="display: none"])').length;
        const totalCount = questionElements.length;
        
        console.log(`필터링 결과: ${visibleCount}/${totalCount} 문제 표시`);
    }

    // 문제 검색 함수
    searchQuestions(searchTerm) {
        console.log('검색 실행:', searchTerm);
        this.filterQuestions(); // 기존 필터와 함께 검색 실행
    }

    // 문제 유형 텍스트 변환
    getQuestionTypeText(type) {
        const typeMap = {
            'multiple_choice': '객관식',
            'subjective': '주관식',
            'group': '그룹형'
        };
        return typeMap[type] || type;
    }

    // 시험지 생성 모달 표시
    showCreateExamModal() {
        const modalHtml = `
            <div class="modal-overlay" id="exam-modal">
                <div class="modal-content" style="max-width: 1000px;">
                    <div class="modal-header">
                        <h3>새 시험지 생성</h3>
                        <button class="modal-close" onclick="document.getElementById('exam-modal').remove()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div class="modal-body">
                        <form id="exam-form" onsubmit="adminManager.saveExam(event)">
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="exam-title">시험 제목 *</label>
                                    <input type="text" id="exam-title" name="title" required>
                                </div>
                                
                                <div class="form-group">
                                    <label for="exam-duration">시험 시간 (분) *</label>
                                    <input type="number" id="exam-duration" name="duration" min="1" max="480" required>
                                </div>
                                
                                <div class="form-group">
                                    <label for="exam-passing-score">합격 점수 (%) *</label>
                                    <input type="number" id="exam-passing-score" name="passing_score" min="0" max="100" required>
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label for="exam-description">시험 설명</label>
                                <textarea id="exam-description" name="description" rows="3"></textarea>
                            </div>
                            
                            <div class="form-group">
                                <label>문제 선택</label>
                                <div class="question-filters">
                                    <select id="exam-category-filter" onchange="adminManager.filterExamQuestions()">
                                        <option value="">전체 카테고리</option>
                                        ${this.categories.map(cat => 
                                            `<option value="${cat.id}">${cat.name}</option>`
                                        ).join('')}
                                    </select>
                                    
                                    <select id="exam-type-filter" onchange="adminManager.filterExamQuestions()">
                                        <option value="">전체 유형</option>
                                        <option value="multiple_choice">객관식</option>
                                        <option value="subjective">주관식</option>
                                        <option value="group">그룹형</option>
                                    </select>
                                    
                                    <input type="text" id="exam-search-input" placeholder="문제 검색..." 
                                           oninput="adminManager.searchExamQuestions(this.value)">
                                </div>
                                
                                <div id="exam-questions-list" class="questions-container">
                                    ${this.renderExamQuestionsList()}
                                </div>
                            </div>
                            
                            <div class="form-actions">
                                <button type="button" class="btn btn-secondary" onclick="document.getElementById('exam-modal').remove()">
                                    취소
                                </button>
                                <button type="submit" class="btn btn-primary">
                                    <i class="fas fa-save"></i> 시험지 생성
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    // 시험지용 문제 목록 렌더링
    renderExamQuestionsList() {
        if (this.questions.length === 0) {
            return '<p class="text-center">등록된 문제가 없습니다.</p>';
        }

        return `
            <div class="questions-grid">
                ${this.questions.map(question => {
                    const isMock = question.id.startsWith('mock-');
                    const isLocal = question.id.startsWith('local-');
                    const dataSource = isMock ? 'Mock' : isLocal ? 'Local' : 'Supabase';
                    
                    return `
                        <div class="exam-question-item question-card ${isMock ? 'mock-data' : isLocal ? 'local-data' : 'supabase-data'}" 
                             data-category="${question.category_id || ''}" 
                             data-type="${question.type || ''}">
                            <div class="question-card-header">
                                <span class="question-type ${question.type}">${this.getQuestionTypeText(question.type)}</span>
                                <span class="question-difficulty">난이도 ${question.difficulty}</span>
                                <span class="data-source ${dataSource.toLowerCase()}">${dataSource}</span>
                            </div>
                            
                            <div class="question-content question-content-preview">
                                ${Utils.escapeHtml(question.content.substring(0, 100))}
                                ${question.content.length > 100 ? '...' : ''}
                            </div>
                            
                            <div class="question-meta">
                                <span class="category">${question.categories?.name || '미분류'}</span>
                                ${question.tags ? question.tags.map(tag => `<span class="tag">${tag}</span>`).join('') : ''}
                            </div>
                            
                            <div class="question-actions">
                                <button type="button" class="btn btn-sm btn-success" onclick="adminManager.addQuestionToExam('${question.id}')">
                                    <i class="fas fa-plus"></i> 선택
                                </button>
                                <span class="points-label">배점 1</span>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    // 시험지용 문제 필터링
    filterExamQuestions() {
        const categoryFilter = document.getElementById('exam-category-filter').value;
        const typeFilter = document.getElementById('exam-type-filter').value;
        const searchInput = document.getElementById('exam-search-input').value;
        
        console.log('시험지 문제 필터링 실행:', { categoryFilter, typeFilter, searchInput });
        
        // 모든 문제 요소 가져오기
        const questionElements = document.querySelectorAll('.exam-question-item');
        
        questionElements.forEach(element => {
            let shouldShow = true;
            
            // 카테고리 필터
            if (categoryFilter && element.dataset.category !== categoryFilter) {
                shouldShow = false;
            }
            
            // 유형 필터
            if (typeFilter && element.dataset.type !== typeFilter) {
                shouldShow = false;
            }
            
            // 검색어 필터
            if (searchInput) {
                const questionText = element.querySelector('.question-content').textContent.toLowerCase();
                const searchLower = searchInput.toLowerCase();
                if (!questionText.includes(searchLower)) {
                    shouldShow = false;
                }
            }
            
            // 표시/숨김 처리
            element.style.display = shouldShow ? 'block' : 'none';
        });
        
        // 필터링 결과 표시
        const visibleCount = document.querySelectorAll('.exam-question-item[style*="display: block"], .exam-question-item:not([style*="display: none"])').length;
        const totalCount = questionElements.length;
        
        console.log(`시험지 필터링 결과: ${visibleCount}/${totalCount} 문제 표시`);
    }

    // 시험지용 문제 검색
    searchExamQuestions(searchTerm) {
        console.log('시험지 검색 실행:', searchTerm);
        this.filterExamQuestions(); // 기존 필터와 함께 검색 실행
    }

    // 시험지에 문제 추가
    addQuestionToExam(questionId) {
        console.log('시험지에 문제 추가:', questionId);
        // TODO: 선택된 문제를 시험지에 추가하는 로직 구현
        Utils.showAlert('문제가 시험지에 추가되었습니다.', 'success');
    }

    // 시험지 저장
    saveExam(event) {
        event.preventDefault();
        console.log('시험지 저장 실행');
        // TODO: 시험지 저장 로직 구현
        Utils.showAlert('시험지가 생성되었습니다.', 'success');
        document.getElementById('exam-modal').remove();
    }

    // 포인트 관리 화면
    async showPointManagement() {
        const contentContainer = document.getElementById('admin-content');
        
        try {
            // 현재 포인트 정책 조회
            const { data: policies, error } = await window.supabase
                .rpc('get_all_point_policies');
            
            if (error) {
                console.error('포인트 정책 조회 오류:', error);
                throw error;
            }

            // 정책 데이터를 객체로 변환
            const policyMap = {};
            policies.forEach(policy => {
                policyMap[policy.policy_name] = policy.policy_value;
            });

            contentContainer.innerHTML = `
                <div class="admin-section-header">
                    <h4><i class="fas fa-coins"></i> 포인트 정책 설정</h4>
                    <button class="btn btn-success" onclick="adminManager.savePointPolicies()">
                        <i class="fas fa-save"></i> 정책 저장
                    </button>
                </div>

                <div class="row">
                    <div class="col-md-8">
                        <div class="card">
                            <div class="card-header">
                                <h5><i class="fas fa-award"></i> 기본 포인트 정책</h5>
                            </div>
                            <div class="card-body">
                                <div class="form-group">
                                    <label for="exam_completion_base">시험 완료 기본 포인트:</label>
                                    <input type="number" 
                                           id="exam_completion_base" 
                                           class="form-control" 
                                           value="${policyMap.exam_completion_base || 50}"
                                           min="0" max="1000">
                                    <small class="form-text text-muted">시험을 완료했을 때 기본으로 지급되는 포인트</small>
                                </div>

                                <div class="form-group">
                                    <label for="correct_answer_bonus">정답당 추가 포인트:</label>
                                    <input type="number" 
                                           id="correct_answer_bonus" 
                                           class="form-control" 
                                           value="${policyMap.correct_answer_bonus || 100}"
                                           min="0" max="1000">
                                    <small class="form-text text-muted">문제를 맞힐 때마다 추가로 지급되는 포인트</small>
                                </div>

                                <div class="form-group">
                                    <label for="perfect_score_bonus">만점 보너스 포인트:</label>
                                    <input type="number" 
                                           id="perfect_score_bonus" 
                                           class="form-control" 
                                           value="${policyMap.perfect_score_bonus || 100}"
                                           min="0" max="1000">
                                    <small class="form-text text-muted">만점을 받았을 때 추가로 지급되는 보너스 포인트</small>
                                </div>


                                <div class="form-group">
                                    <label for="time_bonus_max">시간 보너스 최대 포인트:</label>
                                    <input type="number" 
                                           id="time_bonus_max" 
                                           class="form-control" 
                                           value="${policyMap.time_bonus_max || 200}"
                                           min="0" max="1000">
                                    <small class="form-text text-muted">빨리 완료했을 때 지급되는 최대 시간 보너스</small>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="col-md-4">
                        <div class="card">
                            <div class="card-header">
                                <h5><i class="fas fa-info-circle"></i> 정책 설명</h5>
                            </div>
                            <div class="card-body">
                                <div class="alert alert-info">
                                    <h6>💡 포인트 계산 예시</h6>
                                    <p><strong>5문제 시험, 모두 정답인 경우:</strong></p>
                                    <ul>
                                        <li>완료 기본: <span id="preview_base">50</span>P</li>
                                        <li>정답 보너스: 5 × <span id="preview_correct">100</span>P = <span id="preview_total_correct">500</span>P</li>
                                        <li>만점 보너스: <span id="preview_perfect">100</span>P</li>
                                    </ul>
                                    <hr>
                                    <strong>총 예상 포인트: <span id="preview_total">650</span>P</strong>
                                </div>

                                <div class="alert alert-warning">
                                    <h6>⚠️ 주의사항</h6>
                                    <ul>
                                        <li>정책 변경은 새로 응시하는 시험부터 적용됩니다</li>
                                        <li>기존에 지급된 포인트는 영향받지 않습니다</li>
                                        <li>변경 후 "정책 저장" 버튼을 눌러야 적용됩니다</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // 실시간 미리보기 업데이트
            this.setupPointPolicyPreview();

        } catch (error) {
            console.error('포인트 관리 화면 로드 오류:', error);
            contentContainer.innerHTML = `
                <div class="admin-section-header">
                    <h4><i class="fas fa-coins"></i> 포인트 정책 설정</h4>
                </div>
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle"></i>
                    포인트 정책을 불러올 수 없습니다. 데이터베이스 설정을 확인해주세요.
                    <br><small>오류: ${error.message}</small>
                </div>
            `;
        }
    }

    // 포인트 정책 미리보기 설정
    setupPointPolicyPreview() {
        const inputs = ['exam_completion_base', 'correct_answer_bonus', 'perfect_score_bonus'];
        
        const updatePreview = () => {
            const base = parseInt(document.getElementById('exam_completion_base').value) || 0;
            const correct = parseInt(document.getElementById('correct_answer_bonus').value) || 0;
            const perfect = parseInt(document.getElementById('perfect_score_bonus').value) || 0;
            
            const totalCorrect = correct * 5; // 5문제 기준
            const total = base + totalCorrect + perfect;
            
            document.getElementById('preview_base').textContent = base;
            document.getElementById('preview_correct').textContent = correct;
            document.getElementById('preview_total_correct').textContent = totalCorrect;
            document.getElementById('preview_perfect').textContent = perfect;
            document.getElementById('preview_total').textContent = total;
        };

        inputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) {
                input.addEventListener('input', updatePreview);
            }
        });

        // 초기 미리보기 업데이트
        updatePreview();
    }

    // 포인트 정책 저장
    async savePointPolicies() {
        try {
            const policies = [
                { name: 'exam_completion_base', value: parseInt(document.getElementById('exam_completion_base').value) || 0 },
                { name: 'correct_answer_bonus', value: parseInt(document.getElementById('correct_answer_bonus').value) || 0 },
                { name: 'perfect_score_bonus', value: parseInt(document.getElementById('perfect_score_bonus').value) || 0 },
                { name: 'time_bonus_max', value: parseInt(document.getElementById('time_bonus_max').value) || 0 }
            ];

            Utils.showLoading();

            // 각 정책을 개별적으로 업데이트
            for (const policy of policies) {
                const { error } = await window.supabase
                    .rpc('update_point_policy', {
                        policy_name_param: policy.name,
                        new_value: policy.value
                    });

                if (error) {
                    throw error;
                }
            }

            Utils.showAlert('포인트 정책이 성공적으로 저장되었습니다!', 'success');
            
        } catch (error) {
            console.error('포인트 정책 저장 오류:', error);
            Utils.showAlert('포인트 정책 저장에 실패했습니다.', 'error');
        } finally {
            Utils.hideLoading();
        }
    }
}

// AdminManager 인스턴스 생성
const adminManager = new AdminManager();

// 전역으로 노출
window.adminManager = adminManager;
