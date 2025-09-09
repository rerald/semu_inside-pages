
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
// 프로덕션 환경 설정 (배포용)
// 이 파일은 빌드 시 config.js를 대체합니다

// Supabase 설정 - 환경변수에서 로드
const SUPABASE_CONFIG = {
    url: 'https://skpvtqohyspfsmvwrgoc.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNrcHZ0cW9oeXNwZnNtdndyZ29jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxNzU4ODUsImV4cCI6MjA3MTc1MTg4NX0.tMW3hiZR5JcXlbES2tKl1ZNOVRtYqGO04m-YSbqKUhY'
};

// GPT API 설정 - 프로덕션에서는 사용자 입력으로만 처리
const GPT_CONFIG = {
    // 프로덕션에서는 API 키를 하드코딩하지 않음
    get apiKey() {
        // 로컬스토리지에서만 확인
        const storedKey = localStorage.getItem('openai_api_key');
        if (storedKey) return storedKey;
        
        // 프로덕션에서는 null 반환 (사용자가 직접 입력해야 함)
        return null;
    },
    
    model: 'gpt-4o-mini',
    maxTokens: 1000,
    temperature: 0.3,
    generationTemperature: 0.7,
    generationMaxTokens: 1200,
    
    // 채점 프롬프트 설정 (동일)
    gradingPrompt: {
        system: `당신은 우리 세무법인청년들의 교육담당입니다. 
        이들이 준 답변은 우선 성의를 보여야 하며 기본 철학에 맞아야 합니다. 
        그리고 모범답안에서 제시하는 단어나 개념과 일치도가 중요합니다. 
        추가로 성의가 있고 그들이 어느정도 모범답안에 일치하는 개념을 일치하는 생각을 가지고 있으면 좋은 점수를 주시기 바랍니다.
        
        평가 기준:
        1. 모범답안의 핵심 내용 포함 여부 (만점: 40점)
        2. 논리적 구조와 설명의 명확성 (만점: 30점)
        3. 핵심 개념·용어의 정확성 [보조 지표] (만점: 10점)
           - 전문 용어를 사용하지 않아도 감점하지 마세요
           - 개념을 일상어로 정확히 설명하면 높은 점수 가능
           - 용어 오용·오해 유발 시에만 감점, 정확한 사용은 가산점
        4. 창의성과 추가 인사이트 (만점: 20점)
        
        평가 시 다음 형식으로 응답해주세요:
        총점: [0-100]점
        
        평가 의견:
        [일반 텍스트로 작성, 마크다운 형식 사용하지 않음]
        
        점수 세부 내역:
        - 항목1 (핵심 내용 포함): [획득점수]/40점 (이유)
        - 항목2 (논리적 구조): [획득점수]/30점 (이유)
        - 항목3 (개념·용어 정확성, 보조지표): [획득점수]/10점 (이유)
        - 항목4 (창의성): [획득점수]/20점 (이유)
        총점: [합계]/100점`,
        
        user: `문제: {question}
        모범답안: {modelAnswer}
        학생 답안: {studentAnswer}
        
        위 기준에 따라 평가해주세요.`
    },
    
    // 포인트 지급 설정 (동일)
    pointRewardConfig: {
        perQuestion: {
            correct: 100,
            incorrect: 0
        },
        examCompletion: {
            bonus: 200,
            passingBonus: 300
        },
        difficultyBonus: {
            1: 0, 2: 10, 3: 25, 4: 50, 5: 100
        },
        streakBonus: {
            5: 50, 10: 150, 15: 300
        },
        timeBonus: {
            enabled: true,
            maxBonus: 200,
            threshold: 0.5
        }
    },
    
    // 문제 생성 프롬프트 설정 (원본과 동일)
    generationPrompt: {
        system: `당신은 세무/회계 교육용 문제를 만드는 전문 출제자입니다.
정확하고 교육적인 문제를 생성하세요. 아래 의미와 제약을 반드시 지키세요.

필드 의미:
- title: 수험생에게 제시되는 실제 질문(문항)
- content: 출제 의도/취지 및 학습 목표(이 문제를 통해 무엇을 알게 하는가)
- explanation: 해설(정답 이유·오답 피드백)
  - 해설은 보기 번호(예: 1번/2번/3번/4번 등)를 언급하지 않습니다. 
    보기 순서는 서비스에서 무작위로 섞이므로, 번호 지시형 표현("n번이 정답/오답")을 금지하고
    내용 기반 근거로만 정답과 오답의 이유를 설명하세요.

공통 필드: title, content, explanation, difficulty (1-5)

객관식(multiple) JSON 예시:
{
  "type": "multiple",
  "title": "수험생에게 제시될 질문",
  "content": "출제 취지와 학습 목표",
  "difficulty": 3,
  "choices": [
    { "text": "...", "isCorrect": true },
    { "text": "...", "isCorrect": false },
    { "text": "...", "isCorrect": false },
    { "text": "...", "isCorrect": false }
  ],
  "explanation": "..."
}

단답형(short) JSON 예시:
{
  "type": "short",
  "title": "수험생에게 제시될 질문",
  "content": "출제 취지와 학습 목표",
  "difficulty": 3,
  "model_answer": "...",
  "explanation": "..."
}

서술형(essay) JSON 예시:
{
  "type": "essay",
  "title": "수험생에게 제시될 질문",
  "content": "출제 취지와 학습 목표",
  "difficulty": 3,
  "model_answer": "핵심 채점 기준에 해당하는 모범답안",
  "explanation": "채점 포인트와 배점 기준 요약"
}

JSON 외의 텍스트나 마크다운을 섞어 출력하지 마세요. 코드블록 없이 순수 JSON만 반환하세요.`,
        user: `유형: {type}\n주제: {topic}\n난이도: {difficulty}\n보기 개수: {choiceCount}\n정답 개수: {correctCount}\n추가 지시사항: {extra}\n\n위 조건을 충족하는 하나의 문제를 생성하세요.`
    }
};

// 나머지 설정들은 원본과 동일
const EXAM_CONFIG = {
    AUTO_SAVE_INTERVAL: 30000,
    WARNING_TIME: 300,
    GRACE_PERIOD: 60,
    MAX_FILE_SIZE: 10 * 1024 * 1024,
    ALLOWED_FILE_TYPES: ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx']
};

const ROLES = {
    EMPLOYEE: 'employee',
    ADMIN: 'admin',
    SUPER_ADMIN: 'super_admin'
};

const PERMISSIONS = {
    canManageQuestions: (role) => role === ROLES.ADMIN || role === ROLES.SUPER_ADMIN,
    canManageExams: (role) => role === ROLES.ADMIN || role === ROLES.SUPER_ADMIN,
    canViewAllResults: (role) => role === ROLES.ADMIN || role === ROLES.SUPER_ADMIN,
    canGradeSubjective: (role) => role === ROLES.ADMIN || role === ROLES.SUPER_ADMIN,
    canManageUsers: (role) => role === ROLES.SUPER_ADMIN
};

const QUESTION_TYPES = {
    MULTIPLE_CHOICE: 'multiple_choice',
    SUBJECTIVE: 'subjective',
    GROUP: 'group'
};

const EXAM_STATUS = {
    DRAFT: 'draft',
    PUBLISHED: 'published',
    CLOSED: 'closed'
};

const SESSION_STATUS = {
    IN_PROGRESS: 'in_progress',
    SUBMITTED: 'submitted',
    GRADED: 'graded'
};

const DEPARTMENTS = {
    TAX: { code: 'TAX', name: '세무팀' },
    AUDIT: { code: 'AUDIT', name: '감사팀' },
    CONSULTING: { code: 'CONSULTING', name: '컨설팅팀' },
    ADMIN: { code: 'ADMIN', name: '관리팀' }
};

const CATEGORY_TYPES = {
    SUBJECT: 'subject',
    AREA: 'area',
    CHAPTER: 'chapter'
};

// 유틸리티 함수들 (축약된 버전)
const Utils = {
    formatTime: (seconds) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    },

    formatDate: (date) => {
        return new Date(date).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    formatScore: (score, total) => {
        if (total === 0) return '0%';
        return `${score}/${total} (${Math.round((score / total) * 100)}%)`;
    },

    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    storage: {
        set: (key, value) => {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (e) {
                return false;
            }
        },
        get: (key) => {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : null;
            } catch (e) {
                return null;
            }
        },
        remove: (key) => {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (e) {
                return false;
            }
        }
    },

    showAlert: (message, type = 'info') => {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type}`;
        alertDiv.innerHTML = `
            <i class="fas fa-${type === 'error' ? 'exclamation-triangle' : type === 'success' ? 'check-circle' : 'info-circle'}"></i>
            ${message}
        `;
        
        const existingAlert = document.querySelector('.alert');
        if (existingAlert) {
            existingAlert.remove();
        }
        
        const container = document.querySelector('.main-content') || document.body;
        container.insertBefore(alertDiv, container.firstChild);
        
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 3000);
    },

    showLoading: () => {
        const loading = document.getElementById('loading');
        if (loading) loading.classList.remove('hidden');
    },

    hideLoading: () => {
        const loading = document.getElementById('loading');
        if (loading) loading.classList.add('hidden');
    },

    escapeHtml: (text) => {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, (m) => map[m]);
    },

    formatFileSize: (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    deepClone: (obj) => {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => Utils.deepClone(item));
        if (typeof obj === 'object') {
            const clonedObj = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    clonedObj[key] = Utils.deepClone(obj[key]);
                }
            }
            return clonedObj;
        }
    },

    shuffleArray: (array) => {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
};

// 전역 변수
window.supabase = null;
window.currentUser = null;
window.currentExamSession = null;
window.examTimer = null;
window.appInitialized = false;

// 전역에서 접근 가능하도록 설정 객체 할당
window.SUPABASE_CONFIG = SUPABASE_CONFIG;
window.GPT_CONFIG = GPT_CONFIG;

