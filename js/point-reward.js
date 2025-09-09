
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
// 포인트 지급 시스템

class PointRewardManager {
    constructor() {
        this.config = GPT_CONFIG.pointRewardConfig;
    }

    /**
     * 시험 완료 후 포인트 계산 및 지급
     * @param {string} userId - 사용자 ID
     * @param {string} sessionId - 시험 세션 ID
     * @returns {Object} 지급된 포인트 상세 정보
     */
    async calculateAndAwardPoints(userId, sessionId) {
        try {
            console.log('🎯 포인트 계산 시작:', { userId, sessionId });

            // 1. 시험 세션 정보 조회
            const sessionData = await this.getSessionData(sessionId);
            const examData = sessionData.exams;
            const answers = await this.getAnswersData(sessionId);

            // 2. 포인트 계산
            const pointBreakdown = this.calculatePoints(sessionData, answers, examData);

            // 3. 포인트 지급
            await this.awardPoints(userId, pointBreakdown, sessionId);

            console.log('✅ 포인트 지급 완료:', pointBreakdown);
            return pointBreakdown;

        } catch (error) {
            console.error('❌ 포인트 계산/지급 실패:', error);
            throw error;
        }
    }

    /**
     * 포인트 계산 로직
     */
    calculatePoints(sessionData, answers, examData) {
        const breakdown = {
            questionPoints: 0,      // 문제별 포인트
            difficultyBonus: 0,     // 난이도 보너스
            streakBonus: 0,         // 연속 정답 보너스
            completionBonus: 0,     // 완료 보너스
            passingBonus: 0,        // 합격 보너스
            timeBonus: 0,           // 시간 보너스
            totalPoints: 0,
            details: []
        };

        // 1. 문제별 포인트 계산
        let correctStreak = 0;
        let maxStreak = 0;
        
        answers.forEach((answer, index) => {
            const question = answer.questions;
            const isCorrect = answer.is_correct;
            const difficulty = question.difficulty || 1;

            let questionReward = 0;
            
            if (isCorrect) {
                // 기본 정답 포인트
                questionReward += this.config.perQuestion.correct;
                
                // 난이도 보너스
                const diffBonus = this.config.difficultyBonus[difficulty] || 0;
                questionReward += diffBonus;
                breakdown.difficultyBonus += diffBonus;
                
                // 연속 정답 추적
                correctStreak++;
                maxStreak = Math.max(maxStreak, correctStreak);
            } else {
                questionReward += this.config.perQuestion.incorrect;
                correctStreak = 0; // 연속 정답 끊김
            }

            breakdown.questionPoints += questionReward;
            breakdown.details.push({
                questionNumber: index + 1,
                isCorrect,
                difficulty,
                points: questionReward,
                reason: isCorrect ? 
                    `정답 (난이도 ${difficulty})` : 
                    '오답'
            });
        });

        // 2. 연속 정답 보너스
        Object.entries(this.config.streakBonus).forEach(([streak, bonus]) => {
            if (maxStreak >= parseInt(streak)) {
                breakdown.streakBonus = Math.max(breakdown.streakBonus, bonus);
            }
        });

        // 3. 시험 완료 보너스
        breakdown.completionBonus = this.config.examCompletion.bonus;

        // 4. 합격 보너스
        const isPassing = sessionData.score >= (examData.passing_score || 60);
        if (isPassing) {
            breakdown.passingBonus = this.config.examCompletion.passingBonus;
        }

        // 5. 시간 보너스
        if (this.config.timeBonus.enabled && sessionData.duration_minutes && examData.duration) {
            const timeRatio = sessionData.duration_minutes / examData.duration;
            if (timeRatio <= this.config.timeBonus.threshold) {
                const timeBonus = Math.floor(
                    this.config.timeBonus.maxBonus * (1 - timeRatio)
                );
                breakdown.timeBonus = timeBonus;
            }
        }

        // 총 포인트 계산
        breakdown.totalPoints = 
            breakdown.questionPoints +
            breakdown.difficultyBonus +
            breakdown.streakBonus +
            breakdown.completionBonus +
            breakdown.passingBonus +
            breakdown.timeBonus;

        return breakdown;
    }

    /**
     * 실제 포인트 지급
     */
    async awardPoints(userId, pointBreakdown, sessionId) {
        if (pointBreakdown.totalPoints <= 0) return;

        // 1. 포인트 거래 내역 생성
        const transactions = [];

        // 기본 포인트 (문제 정답 + 난이도 보너스)
        if (pointBreakdown.questionPoints > 0) {
            transactions.push({
                user_id: userId,
                amount: pointBreakdown.questionPoints,
                transaction_type: 'earn',
                description: `시험 문제 정답으로 ${pointBreakdown.questionPoints} 포인트 획득`
            });
        }

        // 연속 정답 보너스
        if (pointBreakdown.streakBonus > 0) {
            transactions.push({
                user_id: userId,
                amount: pointBreakdown.streakBonus,
                transaction_type: 'earn',
                description: `연속 정답 보너스 ${pointBreakdown.streakBonus} 포인트`
            });
        }

        // 완료 보너스
        if (pointBreakdown.completionBonus > 0) {
            transactions.push({
                user_id: userId,
                amount: pointBreakdown.completionBonus,
                transaction_type: 'earn',
                description: `시험 완료 보너스 ${pointBreakdown.completionBonus} 포인트`
            });
        }

        // 합격 보너스
        if (pointBreakdown.passingBonus > 0) {
            transactions.push({
                user_id: userId,
                amount: pointBreakdown.passingBonus,
                transaction_type: 'earn',
                description: `시험 합격 보너스 ${pointBreakdown.passingBonus} 포인트`
            });
        }

        // 시간 보너스
        if (pointBreakdown.timeBonus > 0) {
            transactions.push({
                user_id: userId,
                amount: pointBreakdown.timeBonus,
                transaction_type: 'earn',
                description: `빠른 완료 보너스 ${pointBreakdown.timeBonus} 포인트`
            });
        }

        // 2. 거래 내역 저장
        if (transactions.length > 0) {
            const { error: transactionError } = await window.supabase
                .from('point_transactions')
                .insert(transactions);

            if (transactionError) {
                throw transactionError;
            }
        }

        // 3. 사용자 포인트 잔액 업데이트
        const { error: pointsError } = await window.supabase.rpc('add_user_points', {
            user_id: userId,
            points_to_add: pointBreakdown.totalPoints
        });

        if (pointsError) {
            console.warn('⚠️ 포인트 잔액 업데이트 실패, 수동으로 계산:', pointsError);
            
            // 수동으로 포인트 업데이트
            const { data: currentPoints } = await window.supabase
                .from('user_points')
                .select('points')
                .eq('user_id', userId)
                .single();

            const newPoints = (currentPoints?.points || 0) + pointBreakdown.totalPoints;

            await window.supabase
                .from('user_points')
                .upsert({
                    user_id: userId,
                    points: newPoints,
                    updated_at: new Date().toISOString()
                });
        }
    }

    /**
     * 시험 세션 데이터 조회
     */
    async getSessionData(sessionId) {
        const { data, error } = await window.supabase
            .from('exam_sessions')
            .select(`
                *,
                exams (
                    id,
                    title,
                    duration,
                    passing_score
                )
            `)
            .eq('id', sessionId)
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * 답안 데이터 조회
     */
    async getAnswersData(sessionId) {
        const { data, error } = await window.supabase
            .from('exam_answers')
            .select(`
                *,
                questions (
                    id,
                    difficulty,
                    type
                )
            `)
            .eq('session_id', sessionId)
            .order('created_at');

        if (error) throw error;
        return data || [];
    }

    /**
     * 포인트 지급 결과 표시
     */
    showPointRewardModal(pointBreakdown) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content point-reward-modal">
                <div class="modal-header">
                    <h3>🎉 포인트 획득!</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="point-summary">
                        <div class="total-points">
                            <span class="points-number">${pointBreakdown.totalPoints.toLocaleString()}</span>
                            <span class="points-text">포인트 획득!</span>
                        </div>
                    </div>
                    
                    <div class="point-breakdown">
                        <h4>📊 포인트 상세 내역</h4>
                        
                        ${pointBreakdown.questionPoints > 0 ? `
                            <div class="point-item">
                                <span class="point-label">문제 정답</span>
                                <span class="point-value">+${pointBreakdown.questionPoints}</span>
                            </div>
                        ` : ''}
                        
                        ${pointBreakdown.streakBonus > 0 ? `
                            <div class="point-item bonus">
                                <span class="point-label">🔥 연속 정답 보너스</span>
                                <span class="point-value">+${pointBreakdown.streakBonus}</span>
                            </div>
                        ` : ''}
                        
                        ${pointBreakdown.completionBonus > 0 ? `
                            <div class="point-item">
                                <span class="point-label">✅ 완료 보너스</span>
                                <span class="point-value">+${pointBreakdown.completionBonus}</span>
                            </div>
                        ` : ''}
                        
                        ${pointBreakdown.passingBonus > 0 ? `
                            <div class="point-item bonus">
                                <span class="point-label">🏆 합격 보너스</span>
                                <span class="point-value">+${pointBreakdown.passingBonus}</span>
                            </div>
                        ` : ''}
                        
                        ${pointBreakdown.timeBonus > 0 ? `
                            <div class="point-item bonus">
                                <span class="point-label">⚡ 시간 보너스</span>
                                <span class="point-value">+${pointBreakdown.timeBonus}</span>
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="point-actions">
                        <button class="btn btn-primary" onclick="this.closest('.modal-overlay').remove()">
                            확인
                        </button>
                        <button class="btn btn-secondary" onclick="window.location.href='./avatar.html'">
                            아바타 상점 보기
                        </button>
                    </div>
                </div>
            </div>
        `;

        // 스타일 추가
        if (!document.querySelector('#point-reward-styles')) {
            const styles = document.createElement('style');
            styles.id = 'point-reward-styles';
            styles.textContent = `
                .point-reward-modal {
                    max-width: 500px;
                    width: 90%;
                }
                
                .point-summary {
                    text-align: center;
                    margin: 2rem 0;
                    padding: 2rem;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border-radius: 12px;
                    color: white;
                }
                
                .total-points {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }
                
                .points-number {
                    font-size: 3rem;
                    font-weight: bold;
                    margin-bottom: 0.5rem;
                }
                
                .points-text {
                    font-size: 1.2rem;
                    opacity: 0.9;
                }
                
                .point-breakdown {
                    margin: 1.5rem 0;
                }
                
                .point-breakdown h4 {
                    margin-bottom: 1rem;
                    color: var(--dark-gray);
                }
                
                .point-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 0.75rem;
                    margin-bottom: 0.5rem;
                    background: #f8f9fa;
                    border-radius: 8px;
                }
                
                .point-item.bonus {
                    background: linear-gradient(135deg, #fff3cd, #ffeaa7);
                    border-left: 4px solid #f39c12;
                }
                
                .point-label {
                    font-weight: 500;
                }
                
                .point-value {
                    font-weight: bold;
                    color: #27ae60;
                    font-size: 1.1rem;
                }
                
                .point-actions {
                    display: flex;
                    gap: 1rem;
                    justify-content: center;
                    margin-top: 2rem;
                }
            `;
            document.head.appendChild(styles);
        }

        document.body.appendChild(modal);
    }
}

// 전역 인스턴스 생성
window.pointRewardManager = new PointRewardManager();

