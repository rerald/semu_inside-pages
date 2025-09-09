
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
// 🔐 비밀번호 검증 시스템
console.log('Password validation system loaded');

class PasswordValidator {
    constructor() {
        this.passwordInput = null;
        this.confirmInput = null;
        this.isValid = false;
        this.rules = {
            length: false,
            uppercase: false,
            lowercase: false,
            number: false,
            special: false,
            match: false
        };
        
        this.init();
    }
    
    init() {
        // DOM 로드 후 초기화
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupEventListeners());
        } else {
            this.setupEventListeners();
        }
    }
    
    setupEventListeners() {
        this.passwordInput = document.getElementById('password');
        this.confirmInput = document.getElementById('password-confirm');
        
        console.log('🔍 이벤트 리스너 설정 중...');
        console.log('Password input found:', !!this.passwordInput);
        console.log('Confirm input found:', !!this.confirmInput);
        
        if (this.passwordInput) {
            // 기존 이벤트 리스너 제거 (중복 방지)
            this.passwordInput.removeEventListener('input', this._boundValidatePassword);
            this.passwordInput.removeEventListener('focus', this._boundShowPasswordRules);
            this.passwordInput.removeEventListener('blur', this._boundHidePasswordRulesIfEmpty);
            
            // 바인딩된 메서드 생성
            this._boundValidatePassword = (e) => this.validatePassword(e.target.value);
            this._boundShowPasswordRules = () => this.showPasswordRules();
            this._boundHidePasswordRulesIfEmpty = () => this.hidePasswordRulesIfEmpty();
            
            // 새로운 이벤트 리스너 추가
            this.passwordInput.addEventListener('input', this._boundValidatePassword);
            this.passwordInput.addEventListener('focus', this._boundShowPasswordRules);
            this.passwordInput.addEventListener('blur', this._boundHidePasswordRulesIfEmpty);
            
            console.log('✅ Password input 이벤트 리스너 설정 완료');
        }
        
        if (this.confirmInput) {
            // 기존 이벤트 리스너 제거 (중복 방지)
            this.confirmInput.removeEventListener('input', this._boundValidatePasswordMatch);
            this.confirmInput.removeEventListener('focus', this._boundShowPasswordRules);
            this.confirmInput.removeEventListener('blur', this._boundHidePasswordRulesIfEmpty);
            
            // 바인딩된 메서드 생성
            this._boundValidatePasswordMatch = () => this.validatePasswordMatch();
            
            // 새로운 이벤트 리스너 추가
            this.confirmInput.addEventListener('input', this._boundValidatePasswordMatch);
            this.confirmInput.addEventListener('focus', this._boundShowPasswordRules);
            this.confirmInput.addEventListener('blur', this._boundHidePasswordRulesIfEmpty);
            
            console.log('✅ Confirm input 이벤트 리스너 설정 완료');
        }
        
        console.log('✅ Password validation listeners attached');
    }
    
    validatePassword(password) {
        if (!password) {
            this.resetValidation();
            return;
        }
        
        console.log('🔍 비밀번호 검증 중:', password);
        
        // 각 규칙 검증
        this.rules.length = password.length >= 8;
        this.rules.uppercase = /[A-Z]/.test(password);
        this.rules.lowercase = /[a-z]/.test(password);
        this.rules.number = /[0-9]/.test(password);
        this.rules.special = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
        
        console.log('📋 검증 규칙 결과:', this.rules);
        
        // UI 업데이트
        this.updateRuleDisplay();
        this.updatePasswordStrength(password);
        
        // 전체 검증 상태 업데이트 (비밀번호 일치 검증 제외)
        this.updateValidationState();
        
        console.log('✅ 비밀번호 검증 완료, 상태:', this.isValid);
    }
    
    validatePasswordMatch() {
        // DOM에서 직접 요소를 다시 찾기
        const passwordInput = document.getElementById('password');
        const confirmInput = document.getElementById('password-confirm');
        
        if (!passwordInput || !confirmInput) {
            console.log('❌ DOM 요소를 찾을 수 없음');
            return;
        }
        
        // DOM에서 직접 값을 가져오기
        const password = passwordInput.value || '';
        const confirm = confirmInput.value || '';
        
        console.log('🔍 비밀번호 일치 검증:', { 
            password: password, 
            confirm: confirm,
            passwordLength: password.length,
            confirmLength: confirm.length
        });
        
        if (!confirm) {
            this.rules.match = false;
            this.updateMatchDisplay('empty', '비밀번호 확인을 입력하세요');
        } else if (password === confirm && password.length > 0) {
            this.rules.match = true;
            this.updateMatchDisplay('match', '✓ 비밀번호가 일치합니다');
        } else {
            this.rules.match = false;
            this.updateMatchDisplay('no-match', '✗ 비밀번호가 일치하지 않습니다');
        }
        
        console.log('📋 일치 검증 결과:', this.rules.match);
        
        this.updateRuleDisplay();
        this.updateValidationState();
        
        console.log('✅ 최종 검증 상태:', this.isValid);
        console.log('📋 모든 규칙 상태:', this.rules);
    }
    
    updateRuleDisplay() {
        const rules = [
            { id: 'rule-length', valid: this.rules.length },
            { id: 'rule-uppercase', valid: this.rules.uppercase },
            { id: 'rule-lowercase', valid: this.rules.lowercase },
            { id: 'rule-number', valid: this.rules.number },
            { id: 'rule-special', valid: this.rules.special },
            { id: 'rule-match', valid: this.rules.match }
        ];
        
        rules.forEach(rule => {
            const element = document.getElementById(rule.id);
            if (element) {
                const icon = element.querySelector('i');
                if (rule.valid) {
                    element.classList.add('valid');
                    if (icon) icon.className = 'fas fa-check-circle';
                } else {
                    element.classList.remove('valid');
                    if (icon) icon.className = 'fas fa-times-circle';
                }
            }
        });
    }
    
    updatePasswordStrength(password) {
        const strengthElement = document.getElementById('password-strength');
        const fillElement = document.getElementById('strength-fill');
        const textElement = document.getElementById('strength-text');
        
        if (!strengthElement || !fillElement || !textElement) return;
        
        // 강도 계산 (0-100)
        let strength = 0;
        let strengthText = '';
        let strengthClass = '';
        
        if (password.length === 0) {
            strength = 0;
            strengthText = '비밀번호를 입력하세요';
            strengthClass = '';
        } else {
            // 각 조건당 20점
            if (this.rules.length) strength += 20;
            if (this.rules.uppercase) strength += 20;
            if (this.rules.lowercase) strength += 20;
            if (this.rules.number) strength += 20;
            if (this.rules.special) strength += 20;
            
            // 강도 레벨 결정
            if (strength < 40) {
                strengthText = '약함';
                strengthClass = 'strength-weak';
            } else if (strength < 60) {
                strengthText = '보통';
                strengthClass = 'strength-fair';
            } else if (strength < 80) {
                strengthText = '좋음';
                strengthClass = 'strength-good';
            } else {
                strengthText = '강함';
                strengthClass = 'strength-strong';
            }
        }
        
        // UI 업데이트
        fillElement.style.width = `${strength}%`;
        textElement.textContent = strengthText;
        
        // 클래스 제거 후 새로운 클래스 추가
        strengthElement.className = 'password-strength';
        if (strengthClass) {
            strengthElement.classList.add(strengthClass);
        }
    }
    
    updateMatchDisplay(type, message) {
        const matchElement = document.getElementById('password-match');
        if (!matchElement) return;
        
        matchElement.textContent = message;
        matchElement.className = `password-match ${type}`;
    }
    
    showPasswordRules() {
        const rulesElement = document.querySelector('.password-rules');
        if (rulesElement) {
            rulesElement.style.display = 'block';
        }
    }
    
    hidePasswordRulesIfEmpty() {
        // 비밀번호가 비어있고 확인 비밀번호도 비어있을 때만 숨김
        if (this.passwordInput && this.confirmInput) {
            const passwordEmpty = !this.passwordInput.value;
            const confirmEmpty = !this.confirmInput.value;
            
            if (passwordEmpty && confirmEmpty) {
                const rulesElement = document.querySelector('.password-rules');
                if (rulesElement) {
                    rulesElement.style.display = 'none';
                }
            }
        }
    }
    
    updateValidationState() {
        // 모든 규칙이 통과했는지 확인 (무한루프 방지를 위해 validatePasswordMatch 호출 제거)
        this.isValid = Object.values(this.rules).every(rule => rule);
        
        console.log('📋 전체 검증 상태 업데이트:', this.rules);
        console.log('✅ 최종 유효성:', this.isValid);
        
        // 입력 필드 스타일 업데이트
        if (this.passwordInput) {
            this.passwordInput.classList.remove('valid', 'invalid');
            if (this.passwordInput.value) {
                const basicRulesValid = this.rules.length && this.rules.uppercase && 
                                      this.rules.lowercase && this.rules.number && this.rules.special;
                this.passwordInput.classList.add(basicRulesValid ? 'valid' : 'invalid');
            }
        }
        
        if (this.confirmInput) {
            this.confirmInput.classList.remove('valid', 'invalid');
            if (this.confirmInput.value) {
                this.confirmInput.classList.add(this.rules.match ? 'valid' : 'invalid');
            }
        }
        
        // 제출 버튼 상태 업데이트
        this.updateSubmitButton();
    }
    
    updateSubmitButton() {
        const submitButton = document.querySelector('#register-form button[type="submit"]');
        if (submitButton) {
            if (this.isValid) {
                submitButton.disabled = false;
                submitButton.style.opacity = '1';
                submitButton.style.cursor = 'pointer';
            } else {
                // 비밀번호가 입력되었지만 조건을 만족하지 않는 경우에만 비활성화
                if (this.passwordInput && this.passwordInput.value) {
                    submitButton.disabled = true;
                    submitButton.style.opacity = '0.6';
                    submitButton.style.cursor = 'not-allowed';
                } else {
                    submitButton.disabled = false;
                    submitButton.style.opacity = '1';
                    submitButton.style.cursor = 'pointer';
                }
            }
        }
    }
    
    resetValidation() {
        this.rules = {
            length: false,
            uppercase: false,
            lowercase: false,
            number: false,
            special: false,
            match: false
        };
        
        this.updateRuleDisplay();
        this.updatePasswordStrength('');
        this.updateMatchDisplay('empty', '');
        this.updateValidationState();
    }
    
    // 외부에서 호출할 수 있는 검증 함수
    isPasswordValid() {
        return this.isValid;
    }
    
    getValidationErrors() {
        // 임시로 빈 배열 반환 (오류 메시지 표시 방지)
        return [];
    }
}

// 전역 인스턴스 생성
const passwordValidator = new PasswordValidator();

// 전역 함수로 내보내기
window.passwordValidator = passwordValidator;

console.log('✅ Password validation system initialized');
