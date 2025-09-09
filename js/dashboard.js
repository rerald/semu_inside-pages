
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
// 대시보드 관리

class DashboardManager {
    constructor() {
        this.currentTab = 'exams';
        this.exams = [];
        this.results = [];
        this.filters = {
            status: 'all'
        };
    }

    // 대시보드 초기화
    async init() {
        this.setupTabNavigation();
        await this.loadExams();
        await this.loadResults();
    }

    // 탭 네비게이션 설정
    setupTabNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');
        const tabContents = document.querySelectorAll('.tab-content');

        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                
                const targetTab = link.getAttribute('data-tab');
                
                // 네비게이션 활성화 상태 변경
                navLinks.forEach(nav => nav.classList.remove('active'));
                link.classList.add('active');
                
                // 탭 콘텐츠 표시/숨김
                tabContents.forEach(content => {
                    content.classList.remove('active');
                });
                
                const targetContent = document.getElementById(`${targetTab}-tab`);
                if (targetContent) {
                    targetContent.classList.add('active');
                    this.currentTab = targetTab;
                    
                    // 탭별 데이터 로드
                    this.handleTabSwitch(targetTab);
                }
            });
        });

        // 필터 이벤트 설정
        const statusFilter = document.getElementById('exam-status-filter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.filters.status = e.target.value;
                this.renderExams();
            });
        }
    }

    // 탭 전환 처리
    async handleTabSwitch(tab) {
        switch (tab) {
            case 'exams':
                await this.loadExams();
                break;
            case 'results':
                await this.loadResults();
                break;
            case 'profile':
                // 프로필은 이미 authManager에서 처리
                break;
            case 'admin':
                if (window.adminManager) {
                    await window.adminManager.init();
                }
                break;
        }
    }

    // 시험 목록 로드
    async loadExams() {
        try {
            Utils.showLoading();

            // 사용자가 응시 가능한 시험 조회
            const { data: permissions, error: permError } = await window.supabase
                .from('exam_permissions')
                .select('exam_id')
                .or(`employee_id.eq.${window.currentUser.id},department_id.eq.${window.currentUser.department_id}`);

            if (permError) {
                throw permError;
            }

            const examIds = permissions.map(p => p.exam_id);

            if (examIds.length === 0) {
                this.exams = [];
                this.renderExams();
                return;
            }

            // 시험 정보 조회
            const { data: exams, error: examError } = await window.supabase
                .from('exams')
                .select(`
                    *,
                    exam_sessions!inner(
                        id,
                        employee_id,
                        status,
                        score,
                        submit_time
                    )
                `)
                .in('id', examIds)
                .eq('status', 'published')
                .order('created_at', { ascending: false });

            if (examError) {
                throw examError;
            }

            // 각 시험의 응시 상태 확인
            this.exams = await Promise.all(exams.map(async (exam) => {
                const userSession = exam.exam_sessions.find(s => s.employee_id === window.currentUser.id);
                
                const now = new Date();
                const startTime = exam.start_time ? new Date(exam.start_time) : null;
                const endTime = exam.end_time ? new Date(exam.end_time) : null;

                let status = 'available';
                let canTake = true;

                if (userSession) {
                    if (userSession.status === 'submitted' || userSession.status === 'graded') {
                        status = 'completed';
                        canTake = false;
                    }
                } else if (startTime && now < startTime) {
                    status = 'upcoming';
                    canTake = false;
                } else if (endTime && now > endTime) {
                    status = 'expired';
                    canTake = false;
                }

                return {
                    ...exam,
                    userStatus: status,
                    canTake,
                    userSession,
                    questionCount: await this.getQuestionCount(exam.id)
                };
            }));

            this.renderExams();

        } catch (error) {
            console.error('Load exams error:', error);
            Utils.showAlert('시험 목록을 불러오는데 실패했습니다.', 'error');
        } finally {
            Utils.hideLoading();
        }
    }

    // 시험 문항 수 조회
    async getQuestionCount(examId) {
        try {
            const { count, error } = await window.supabase
                .from('exam_questions')
                .select('*', { count: 'exact', head: true })
                .eq('exam_id', examId);

            if (error) {
                throw error;
            }

            return count || 0;
        } catch (error) {
            console.error('Question count error:', error);
            return 0;
        }
    }

    // 시험 목록 렌더링
    renderExams() {
        const container = document.getElementById('exams-list');
        if (!container) return;

        let filteredExams = this.exams;

        // 필터 적용
        if (this.filters.status !== 'all') {
            if (this.filters.status === 'available') {
                filteredExams = this.exams.filter(exam => exam.canTake);
            } else if (this.filters.status === 'completed') {
                filteredExams = this.exams.filter(exam => exam.userStatus === 'completed');
            }
        }

        if (filteredExams.length === 0) {
            container.innerHTML = `
                <div class="text-center" style="grid-column: 1 / -1; padding: 3rem;">
                    <i class="fas fa-clipboard-list" style="font-size: 3rem; color: var(--gray-300); margin-bottom: 1rem;"></i>
                    <p style="color: var(--gray-500);">표시할 시험이 없습니다.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filteredExams.map(exam => `
            <div class="exam-card">
                <div class="exam-card-header">
                    <div>
                        <h4 class="exam-title">${Utils.escapeHtml(exam.title)}</h4>
                        <span class="exam-status ${exam.userStatus}">${this.getStatusText(exam.userStatus)}</span>
                    </div>
                </div>
                
                <p class="exam-description">${Utils.escapeHtml(exam.description || '')}</p>
                
                <div class="exam-meta">
                    <span><i class="fas fa-clock"></i> ${exam.duration}분</span>
                    <span><i class="fas fa-question-circle"></i> ${exam.questionCount}문항</span>
                    <span><i class="fas fa-calendar"></i> ${this.formatExamDate(exam)}</span>
                    ${this.getDeadlineBadge(exam)}
                </div>
                
                <div class="exam-actions">
                    ${exam.canTake ? 
                        `<button class="btn btn-primary" onclick="dashboardManager.startExam('${exam.id}')">
                            <i class="fas fa-play"></i> 시험 시작
                        </button>` :
                        exam.userStatus === 'completed' ?
                        `<button class="btn btn-outline" onclick="dashboardManager.viewResult('${exam.id}')">
                            <i class="fas fa-chart-bar"></i> 결과 보기
                        </button>` :
                        `<button class="btn btn-outline" disabled>
                            ${exam.userStatus === 'upcoming' ? '시작 전' : '기간 만료'}
                        </button>`
                    }
                </div>
            </div>
        `).join('');
    }

    // 상태 텍스트 반환
    getStatusText(status) {
        const statusMap = {
            'available': '응시 가능',
            'completed': '응시 완료',
            'upcoming': '시작 전',
            'expired': '기간 만료'
        };
        return statusMap[status] || status;
    }

    // 시험 날짜 포맷팅
    formatExamDate(exam) {
        if (exam.start_time && exam.end_time) {
            return `${Utils.formatDate(exam.start_time)} ~ ${Utils.formatDate(exam.end_time)}`;
        } else if (exam.start_time) {
            return `${Utils.formatDate(exam.start_time)} 부터`;
        } else if (exam.end_time) {
            return `${Utils.formatDate(exam.end_time)} 까지`;
        }
        return '언제든지';
    }

    // 마감 뱃지 표시
    getDeadlineBadge(exam) {
        if (!exam.end_time) return '';
        const now = new Date();
        const end = new Date(exam.end_time);
        if (isNaN(end.getTime())) return '';
        const diffMs = end - now;
        const icon = diffMs >= 0 ? '<i class="fas fa-hourglass-half"></i>' : '<i class="fas fa-hourglass-end"></i>';
        const { text, cls } = this.formatRemaining(diffMs);
        const endText = Utils.formatDate(exam.end_time);
        return `<span class="deadline-badge ${cls}" title="마감: ${endText}">${icon} ${diffMs >= 0 ? `${text} 남음` : `${text} 지남`}</span>`;
    }

    // 남은 시간 포맷팅
    formatRemaining(diffMs) {
        const abs = Math.abs(diffMs);
        const minute = 60 * 1000;
        const hour = 60 * minute;
        const day = 24 * hour;
        let text = '';
        let cls = '';
        if (abs >= day) {
            const d = Math.floor(abs / day);
            text = `${d}일`;
        } else if (abs >= hour) {
            const h = Math.floor(abs / hour);
            text = `${h}시간`;
        } else {
            const m = Math.max(1, Math.floor(abs / minute));
            text = `${m}분`;
        }
        // 시각적 경고 단계: 24시간 이내 warning, 1시간 이내 danger, 지났으면 dark
        if (diffMs < 0) {
            cls = 'expired';
        } else if (abs <= hour) {
            cls = 'urgent';
        } else if (abs <= 24 * hour) {
            cls = 'warning';
        } else {
            cls = 'normal';
        }
        return { text, cls };
    }

    // 시험 시작
    async startExam(examId) {
        try {
            Utils.showLoading();

            // 시험 세션 생성 또는 기존 세션 조회
            let { data: session, error: sessionError } = await window.supabase
                .from('exam_sessions')
                .select('*')
                .eq('exam_id', examId)
                .eq('employee_id', window.currentUser.id)
                .single();

            if (sessionError && sessionError.code !== 'PGRST116') {
                throw sessionError;
            }

            if (!session) {
                // 새 세션 생성
                const { data: newSession, error: createError } = await window.supabase
                    .from('exam_sessions')
                    .insert([{
                        exam_id: examId,
                        employee_id: window.currentUser.id,
                        status: 'in_progress'
                    }])
                    .select()
                    .single();

                if (createError) {
                    throw createError;
                }

                session = newSession;
            }

            // 시험 응시 화면으로 이동
            if (window.examManager) {
                await window.examManager.startExam(examId, session.id);
            }

        } catch (error) {
            console.error('Start exam error:', error);
            Utils.showAlert('시험을 시작할 수 없습니다.', 'error');
        } finally {
            Utils.hideLoading();
        }
    }

    // 결과 보기
    async viewResult(examId) {
        try {
            // 결과 탭으로 이동하고 해당 시험 결과 표시
            document.querySelector('[data-tab="results"]').click();
            
            // 잠시 후 해당 결과로 스크롤
            setTimeout(() => {
                const resultCard = document.querySelector(`[data-exam-id="${examId}"]`);
                if (resultCard) {
                    resultCard.scrollIntoView({ behavior: 'smooth' });
                    resultCard.style.backgroundColor = '#f0f9ff';
                    setTimeout(() => {
                        resultCard.style.backgroundColor = '';
                    }, 2000);
                }
            }, 300);

        } catch (error) {
            console.error('View result error:', error);
            Utils.showAlert('결과를 불러올 수 없습니다.', 'error');
        }
    }

    // 결과 목록 로드
    async loadResults() {
        try {
            Utils.showLoading();

            const { data: sessions, error } = await window.supabase
                .from('exam_sessions')
                .select(`
                    *,
                    exams (
                        id,
                        title,
                        description,
                        duration,
                        passing_score
                    )
                `)
                .eq('employee_id', window.currentUser.id)
                .in('status', ['submitted', 'graded'])
                .order('submit_time', { ascending: false });

            if (error) {
                throw error;
            }

            this.results = sessions || [];
            this.renderResults();

        } catch (error) {
            console.error('Load results error:', error);
            Utils.showAlert('시험 결과를 불러오는데 실패했습니다.', 'error');
        } finally {
            Utils.hideLoading();
        }
    }

    // 결과 목록 렌더링
    renderResults() {
        const container = document.getElementById('results-list');
        if (!container) return;

        if (this.results.length === 0) {
            container.innerHTML = `
                <div class="text-center" style="padding: 3rem;">
                    <i class="fas fa-chart-bar" style="font-size: 3rem; color: var(--gray-300); margin-bottom: 1rem;"></i>
                    <p style="color: var(--gray-500);">아직 응시한 시험이 없습니다.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.results.map(result => {
            const exam = result.exams;
            const percentage = result.total_points > 0 ? Math.round((result.score / result.total_points) * 100) : 0;
            const passed = result.score >= exam.passing_score;

            return `
                <div class="result-card" data-exam-id="${exam.id}">
                    <div class="result-info">
                        <h4 class="result-title">${Utils.escapeHtml(exam.title)}</h4>
                        <div class="result-meta">
                            <span><i class="fas fa-calendar"></i> ${Utils.formatDate(result.submit_time)}</span>
                            <span><i class="fas fa-clock"></i> ${result.duration_minutes || exam.duration}분 소요</span>
                            <span class="${passed ? 'text-success' : 'text-danger'}">
                                <i class="fas fa-${passed ? 'check-circle' : 'times-circle'}"></i> 
                                ${passed ? '합격' : '불합격'}
                            </span>
                        </div>
                    </div>
                    
                    <div class="result-score">
                        <div class="score-value ${passed ? 'text-success' : 'text-danger'}">${percentage}%</div>
                        <div class="score-label">${result.score}/${result.total_points}점</div>
                        <button class="btn btn-outline" onclick="dashboardManager.viewDetailedResult('${result.id}')">
                            <i class="fas fa-eye"></i> 상세보기
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // 상세 결과 보기
    async viewDetailedResult(sessionId) {
        try {
            Utils.showLoading();

            // 상세 결과 데이터 조회
            const { data: session, error: sessionError } = await window.supabase
                .from('exam_sessions')
                .select(`
                    *,
                    exams (
                        id,
                        title,
                        description,
                        show_results
                    )
                `)
                .eq('id', sessionId)
                .single();

            if (sessionError) {
                throw sessionError;
            }

            if (!session.exams.show_results) {
                Utils.showAlert('이 시험의 결과는 공개되지 않습니다.', 'warning');
                return;
            }

            // 답안 상세 조회
            const { data: answers, error: answersError } = await window.supabase
                .from('exam_answers')
                .select(`
                    *,
                    questions (
                        id,
                        type,
                        content,
                        explanation,
                        question_options (
                            id,
                            content,
                            is_correct
                        )
                    )
                `)
                .eq('session_id', sessionId)
                .order('created_at');

            if (answersError) {
                throw answersError;
            }

            // 상세 결과 모달 표시
            this.showDetailedResultModal(session, answers);

        } catch (error) {
            console.error('View detailed result error:', error);
            Utils.showAlert('상세 결과를 불러올 수 없습니다.', 'error');
        } finally {
            Utils.hideLoading();
        }
    }

    // 상세 결과 모달 표시
    showDetailedResultModal(session, answers) {
        // 모달 HTML 생성
        const modalHtml = `
            <div class="modal-overlay" id="result-modal">
                <div class="modal-content" style="max-width: 800px; max-height: 80vh; overflow-y: auto;">
                    <div class="modal-header">
                        <h3>${Utils.escapeHtml(session.exams.title)} - 상세 결과</h3>
                        <button class="modal-close" onclick="document.getElementById('result-modal').remove()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div class="modal-body">
                        <div class="result-summary">
                            <div class="score-display">
                                <div class="score-circle">
                                    <span class="score-number">${Math.round((session.score / session.total_points) * 100)}%</span>
                                    <span class="score-text">${session.score}/${session.total_points}점</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="answers-review">
                            <h4>문항별 상세</h4>
                            ${answers.map((answer, index) => this.renderAnswerReview(answer, index + 1)).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;

        // 모달 스타일 추가
        if (!document.getElementById('modal-styles')) {
            const modalStyles = document.createElement('style');
            modalStyles.id = 'modal-styles';
            modalStyles.innerHTML = `
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10000;
                }
                
                .modal-content {
                    background: white;
                    border-radius: 12px;
                    padding: 0;
                    margin: 2rem;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                }
                
                .modal-header {
                    padding: 1.5rem;
                    border-bottom: 1px solid var(--gray-200);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .modal-close {
                    background: none;
                    border: none;
                    font-size: 1.5rem;
                    cursor: pointer;
                    color: var(--gray-500);
                }
                
                .modal-body {
                    padding: 1.5rem;
                }
                
                .result-summary {
                    text-align: center;
                    margin-bottom: 2rem;
                }
                
                .score-display {
                    display: flex;
                    justify-content: center;
                }
                
                .score-circle {
                    width: 120px;
                    height: 120px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, var(--primary-color), var(--primary-dark));
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    color: white;
                }
                
                .score-number {
                    font-size: 2rem;
                    font-weight: bold;
                }
                
                .score-text {
                    font-size: 0.9rem;
                }
                
                .answer-review {
                    margin-bottom: 1.5rem;
                    padding: 1rem;
                    border: 1px solid var(--gray-200);
                    border-radius: var(--border-radius);
                    border-left: 4px solid var(--primary-color);
                }
                
                .answer-review.correct {
                    border-left-color: var(--success-color);
                    background-color: #f0fdf4;
                }
                
                .answer-review.incorrect {
                    border-left-color: var(--danger-color);
                    background-color: #fef2f2;
                }
                
                .question-number {
                    font-weight: bold;
                    color: var(--primary-color);
                    margin-bottom: 0.5rem;
                }
                
                .question-text {
                    margin-bottom: 1rem;
                    line-height: 1.6;
                }
                
                .answer-comparison {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1rem;
                    margin-top: 1rem;
                }
                
                .answer-item {
                    padding: 0.5rem;
                    border-radius: var(--border-radius);
                    background: var(--gray-100);
                }
                
                .answer-label {
                    font-size: 0.8rem;
                    font-weight: bold;
                    margin-bottom: 0.25rem;
                }
                
                .text-success { color: var(--success-color); }
                .text-danger { color: var(--danger-color); }
            `;
            document.head.appendChild(modalStyles);
        }

        // 모달을 DOM에 추가
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    // 답안 리뷰 렌더링
    renderAnswerReview(answer, questionNumber) {
        const question = answer.questions;
        const isCorrect = answer.is_correct;
        
        let answerDisplay = '';
        let correctAnswerDisplay = '';

        if (question.type === 'multiple_choice') {
            const selectedOption = question.question_options.find(opt => opt.id === answer.answer);
            const correctOption = question.question_options.find(opt => opt.is_correct);
            
            answerDisplay = selectedOption ? selectedOption.content : '선택 안함';
            correctAnswerDisplay = correctOption ? correctOption.content : '정답 없음';
        } else {
            answerDisplay = answer.answer || '답안 없음';
            correctAnswerDisplay = '주관식 문항';
        }

        return `
            <div class="answer-review ${isCorrect ? 'correct' : 'incorrect'}">
                <div class="question-number">
                    문제 ${questionNumber}
                    <span class="${isCorrect ? 'text-success' : 'text-danger'}">
                        <i class="fas fa-${isCorrect ? 'check-circle' : 'times-circle'}"></i>
                        ${answer.points}점
                    </span>
                </div>
                
                <div class="question-text">${Utils.escapeHtml(question.content)}</div>
                
                <div class="answer-comparison">
                    <div class="answer-item">
                        <div class="answer-label">내 답안</div>
                        <div>${Utils.escapeHtml(answerDisplay)}</div>
                    </div>
                    
                    ${question.type === 'multiple_choice' ? `
                        <div class="answer-item">
                            <div class="answer-label">정답</div>
                            <div>${Utils.escapeHtml(correctAnswerDisplay)}</div>
                        </div>
                    ` : ''}
                </div>
                
                ${question.explanation ? `
                    <div class="explanation" style="margin-top: 1rem; padding: 1rem; background: #f8fafc; border-radius: var(--border-radius);">
                        <strong>해설:</strong> ${Utils.escapeHtml(question.explanation)}
                    </div>
                ` : ''}
            </div>
        `;
    }
}

// DashboardManager 인스턴스 생성
const dashboardManager = new DashboardManager();

// 전역으로 노출
window.dashboardManager = dashboardManager;
