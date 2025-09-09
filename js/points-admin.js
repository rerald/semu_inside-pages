
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
// 포인트 관리 시스템 - 관리자 전용
class PointsAdminManager {
    constructor() {
        this.currentTab = 'overview';
        this.currentPage = 1;
        this.pageSize = 20;
        this.selectedUser = null;
    }

    /**
     * 관리자 권한 확인
     */
    async checkAdminAccess() {
        try {
            console.log('🔍 관리자 권한 확인 중...');
            
            // 실제 사용자 인증 확인
            const { data: { user }, error: authError } = await window.supabase.auth.getUser();
            
            if (authError || !user) {
                console.log('❌ 사용자 인증 실패:', authError?.message || '사용자 없음');
                
                // 개발 모드에서는 목업 사용자로 처리
                if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                    console.log('🔧 개발 모드: 목업 사용자로 인증');
                    return true;
                }
                
                window.location.href = './admin-login.html';
                return false;
            }

            console.log('✅ 사용자 인증 성공:', user.email);

            // 관리자 권한 확인
            const { data: profile, error: profileError } = await window.supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();

            if (profileError) {
                console.warn('⚠️ 프로필 조회 실패:', profileError.message);
                
                // 개발 모드에서는 허용
                if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                    console.log('🔧 개발 모드: 프로필 오류 무시');
                    return true;
                }
                
                this.showAlert('사용자 정보를 불러올 수 없습니다.', 'error');
                setTimeout(() => {
                    window.location.href = './index.html';
                }, 2000);
                return false;
            }

            if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
                console.log('❌ 관리자 권한 없음, 사용자 역할:', profile?.role);
                this.showAlert('관리자 권한이 필요합니다.', 'error');
                setTimeout(() => {
                    window.location.href = './index.html';
                }, 2000);
                return false;
            }

            console.log('✅ 관리자 권한 확인 완료, 역할:', profile.role);
            return true;
            
        } catch (error) {
            console.error('권한 확인 중 오류 발생:', error);
            
            // 개발 모드에서는 오류가 발생해도 접근 허용
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                console.log('🔧 개발 모드: 오류 발생해도 접근 허용');
                return true;
            }
            
            window.location.href = './admin-login.html';
            return false;
        }
    }

    /**
     * 탭 네비게이션 설정
     */
    setupTabNavigation() {
        const tabButtons = document.querySelectorAll('.nav-btn[data-tab]');
        
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabName = button.dataset.tab;
                this.switchTab(tabName);
            });
        });

        // 부서별 선택 시 부서 목록 표시
        const bulkTarget = document.getElementById('bulkTarget');
        if (bulkTarget) {
            bulkTarget.addEventListener('change', (e) => {
                const departmentSelect = document.getElementById('departmentSelect');
                if (e.target.value === 'department') {
                    departmentSelect.style.display = 'block';
                    this.loadDepartments();
                } else {
                    departmentSelect.style.display = 'none';
                }
            });
        }
    }

    /**
     * 탭 전환
     */
    switchTab(tabName) {
        // 모든 탭 숨기기
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.add('hidden');
        });

        // 네비게이션 버튼 상태 업데이트
        document.querySelectorAll('.nav-btn[data-tab]').forEach(btn => {
            btn.classList.remove('active');
        });

        // 선택된 탭 표시
        const targetTab = document.getElementById(tabName + 'Tab');
        if (targetTab) {
            targetTab.classList.remove('hidden');
        }

        const targetBtn = document.querySelector(`[data-tab="${tabName}"]`);
        if (targetBtn) {
            targetBtn.classList.add('active');
        }

        this.currentTab = tabName;

        // 탭별 데이터 로드
        switch (tabName) {
            case 'overview':
                this.loadDashboardData();
                break;
            case 'management':
                this.loadDepartments();
                break;
            case 'history':
                this.loadTransactionHistory();
                break;
            case 'analytics':
                this.loadAnalytics();
                break;
        }
    }

    /**
     * 대시보드 데이터 로드
     */
    async loadDashboardData() {
        try {
            // 통계 데이터 로드
            await Promise.all([
                this.loadBasicStats(),
                this.loadRecentTransactions(),
                this.loadPointsLeaderboard()
            ]);
        } catch (error) {
            console.error('대시보드 데이터 로드 실패:', error);
            this.showAlert('데이터를 불러오는데 실패했습니다.', 'error');
        }
    }

    /**
     * 기본 통계 로드
     */
    async loadBasicStats() {
        try {
            // 총 사용자 수
            const { count: totalUsers } = await window.supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true });

            // 총 발급 포인트
            const { data: earnedPoints } = await window.supabase
                .from('point_transactions')
                .select('amount')
                .eq('transaction_type', 'earn');

            const totalEarned = earnedPoints?.reduce((sum, t) => sum + t.amount, 0) || 0;

            // 총 사용 포인트
            const { data: spentPoints } = await window.supabase
                .from('point_transactions')
                .select('amount')
                .eq('transaction_type', 'spend');

            const totalSpent = spentPoints?.reduce((sum, t) => sum + t.amount, 0) || 0;

            // 오늘 활동 사용자 (오늘 포인트 거래가 있는 사용자)
            const today = new Date().toISOString().split('T')[0];
            const { data: activeToday } = await window.supabase
                .from('point_transactions')
                .select('user_id')
                .gte('created_at', today + 'T00:00:00Z')
                .lt('created_at', today + 'T23:59:59Z');

            const uniqueActiveUsers = new Set(activeToday?.map(t => t.user_id) || []).size;

            // UI 업데이트
            document.getElementById('totalUsers').textContent = totalUsers?.toLocaleString() || '0';
            document.getElementById('totalPointsIssued').textContent = totalEarned.toLocaleString();
            document.getElementById('totalPointsSpent').textContent = totalSpent.toLocaleString();
            document.getElementById('activeUsersToday').textContent = uniqueActiveUsers.toLocaleString();
            
            console.log('✅ 기본 통계 로드 완료:', {
                totalUsers,
                totalEarned,
                totalSpent,
                uniqueActiveUsers
            });

        } catch (error) {
            console.error('기본 통계 로드 실패:', error);
        }
    }

    /**
     * 최근 거래 내역 로드
     */
    async loadRecentTransactions() {
        try {
            const { data: transactions } = await window.supabase
                .from('point_transactions')
                .select(`
                    *,
                    profiles (name),
                    avatar_items (name)
                `)
                .order('created_at', { ascending: false })
                .limit(10);

            const container = document.getElementById('recentTransactions');
            
            if (!transactions || transactions.length === 0) {
                container.innerHTML = '<p>최근 거래 내역이 없습니다.</p>';
                return;
            }

            const transactionsHtml = transactions.map(transaction => {
                const userName = transaction.profiles?.name || '알 수 없음';
                const itemName = transaction.avatar_items?.name || '';
                const typeClass = transaction.transaction_type;
                const typeText = transaction.transaction_type === 'earn' ? '획득' : '사용';
                const amount = transaction.transaction_type === 'earn' ? 
                    `+${transaction.amount}` : `-${transaction.amount}`;
                const date = new Date(transaction.created_at).toLocaleDateString('ko-KR');

                return `
                    <div class="transaction-item-compact ${typeClass}">
                        <span class="user-name">${userName}</span>
                        <span class="description">${transaction.description}${itemName ? ` (${itemName})` : ''}</span>
                        <span class="date">${date}</span>
                        <span class="amount ${transaction.transaction_type === 'earn' ? 'positive' : 'negative'}">${amount} P</span>
                    </div>
                `;
            }).join('');

            container.innerHTML = transactionsHtml;

        } catch (error) {
            console.error('최근 거래 내역 로드 실패:', error);
            document.getElementById('recentTransactions').innerHTML = '<p>데이터 로드에 실패했습니다.</p>';
        }
    }

    /**
     * 포인트 랭킹 로드
     */
    async loadPointsLeaderboard() {
        try {
            console.log('🏆 포인트 랭킹 로딩 중...');
            
            // user_points와 profiles, departments를 조인하여 랭킹 조회
            const { data: leaderboard, error } = await window.supabase
                .from('user_points')
                .select(`
                    points,
                    profiles!user_points_user_id_fkey (
                        name,
                        email,
                        departments!profiles_department_id_fkey (
                            name
                        )
                    )
                `)
                .order('points', { ascending: false })
                .limit(10);

            if (error) {
                console.error('❌ 랭킹 조회 실패:', error.message);
                document.getElementById('pointsLeaderboard').innerHTML = '<p>데이터 로드에 실패했습니다.</p>';
                return;
            }

            const container = document.getElementById('pointsLeaderboard');
            
            if (!leaderboard || leaderboard.length === 0) {
                container.innerHTML = '<p>랭킹 데이터가 없습니다.</p>';
                console.log('ℹ️ 랭킹 데이터 없음');
                return;
            }

            console.log('✅ 랭킹 로드 성공:', leaderboard.length, '명');

            const leaderboardHtml = leaderboard.map((userPoint, index) => {
                const rankText = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
                const rankClass = index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : 'other';
                const userName = userPoint.profiles?.name || '알 수 없음';
                const departmentText = userPoint.profiles?.departments?.name || '미분류';
                
                return `
                    <div class="ranking-item-compact">
                        <span class="rank ${rankClass}">${rankText}</span>
                        <span class="name">${userName}</span>
                        <span class="dept">${departmentText}</span>
                        <span class="points">${userPoint.points.toLocaleString()} P</span>
                    </div>
                `;
            }).join('');

            container.innerHTML = leaderboardHtml;

        } catch (error) {
            console.error('❌ 포인트 랭킹 로드 실패:', error);
            document.getElementById('pointsLeaderboard').innerHTML = '<p>데이터 로드에 실패했습니다.</p>';
        }
    }

    /**
     * 사용자 검색
     */
    async searchUser() {
        const searchTerm = document.getElementById('userSearch').value.trim();
        if (!searchTerm) {
            this.showAlert('검색할 사용자명 또는 이메일을 입력하세요.', 'error');
            return;
        }

        try {
            const { data: users } = await window.supabase
                .from('profiles')
                .select(`
                    *,
                    user_points (points),
                    departments (name)
                `)
                .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
                .limit(10);

            const resultsContainer = document.getElementById('userSearchResults');
            const userInfoContainer = document.getElementById('userInfo');

            if (!users || users.length === 0) {
                this.showAlert('검색 결과가 없습니다.', 'error');
                resultsContainer.classList.add('hidden');
                return;
            }

            if (users.length === 1) {
                // 사용자가 1명인 경우 직접 선택
                this.selectUser(users[0]);
            } else {
                // 여러 사용자가 있는 경우 선택 목록 표시
                const usersHtml = users.map(user => {
                    const points = user.user_points?.[0]?.points || 0;
                    const department = user.departments?.name || '미분류';
                    
                    return `
                        <div class="user-item" style="padding: 1rem; border: 1px solid #ddd; margin-bottom: 0.5rem; border-radius: 8px; cursor: pointer;" 
                             onclick="pointsAdmin.selectUser(${JSON.stringify(user).replace(/"/g, '&quot;')})">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <div>
                                    <strong>${user.name}</strong><br>
                                    <small style="color: #666;">${user.email} | ${department}</small>
                                </div>
                                <div style="text-align: right;">
                                    <strong style="color: var(--primary-color);">${points.toLocaleString()} P</strong>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');

                userInfoContainer.innerHTML = `
                    <h4>검색 결과 (${users.length}명)</h4>
                    ${usersHtml}
                `;
                resultsContainer.classList.remove('hidden');
            }

        } catch (error) {
            console.error('사용자 검색 실패:', error);
            this.showAlert('사용자 검색에 실패했습니다.', 'error');
        }
    }

    /**
     * 사용자 선택
     */
    selectUser(user) {
        this.selectedUser = user;
        const points = user.user_points?.[0]?.points || 0;
        const department = user.departments?.name || '미분류';
        
        const userInfoContainer = document.getElementById('userInfo');
        userInfoContainer.innerHTML = `
            <div style="padding: 1rem; background: #f8f9fa; border-radius: 8px; margin-bottom: 1rem;">
                <h4 style="margin-bottom: 0.5rem;">선택된 사용자</h4>
                <p><strong>이름:</strong> ${user.name}</p>
                <p><strong>이메일:</strong> ${user.email}</p>
                <p><strong>부서:</strong> ${department}</p>
                <p><strong>현재 포인트:</strong> <span style="color: var(--primary-color); font-weight: bold;">${points.toLocaleString()} P</span></p>
            </div>
        `;
        
        document.getElementById('userSearchResults').classList.remove('hidden');
    }

    /**
     * 포인트 지급
     */
    async addPoints() {
        if (!this.selectedUser) {
            this.showAlert('먼저 사용자를 선택하세요.', 'error');
            return;
        }

        const amount = parseInt(document.getElementById('pointAmount').value);
        const reason = document.getElementById('pointReason').value.trim();

        if (!amount || amount <= 0) {
            this.showAlert('유효한 포인트 수량을 입력하세요.', 'error');
            return;
        }

        if (!reason) {
            this.showAlert('포인트 지급 사유를 입력하세요.', 'error');
            return;
        }

        try {
            // 포인트 거래 내역 추가
            const { error: transactionError } = await window.supabase
                .from('point_transactions')
                .insert({
                    user_id: this.selectedUser.id,
                    amount: amount,
                    transaction_type: 'earn',
                    description: `[관리자 지급] ${reason}`
                });

            if (transactionError) throw transactionError;

            // 사용자 포인트 업데이트
            const { error: pointsError } = await window.supabase.rpc('add_user_points', {
                user_id: this.selectedUser.id,
                points_to_add: amount
            });

            if (pointsError) throw pointsError;

            this.showAlert(`${this.selectedUser.name}님에게 ${amount.toLocaleString()} 포인트를 지급했습니다.`, 'success');
            
            // 폼 초기화
            document.getElementById('pointAmount').value = '';
            document.getElementById('pointReason').value = '';
            
            // 사용자 정보 새로고침
            this.refreshSelectedUser();

        } catch (error) {
            console.error('포인트 지급 실패:', error);
            this.showAlert('포인트 지급에 실패했습니다.', 'error');
        }
    }

    /**
     * 포인트 차감
     */
    async subtractPoints() {
        if (!this.selectedUser) {
            this.showAlert('먼저 사용자를 선택하세요.', 'error');
            return;
        }

        const amount = parseInt(document.getElementById('pointAmount').value);
        const reason = document.getElementById('pointReason').value.trim();

        if (!amount || amount <= 0) {
            this.showAlert('유효한 포인트 수량을 입력하세요.', 'error');
            return;
        }

        if (!reason) {
            this.showAlert('포인트 차감 사유를 입력하세요.', 'error');
            return;
        }

        const currentPoints = this.selectedUser.user_points?.[0]?.points || 0;
        if (currentPoints < amount) {
            this.showAlert(`현재 포인트(${currentPoints.toLocaleString()})가 부족합니다.`, 'error');
            return;
        }

        try {
            // 포인트 차감 확인
            const confirmed = confirm(`${this.selectedUser.name}님의 포인트를 ${amount.toLocaleString()} 포인트 차감하시겠습니까?\n\n사유: ${reason}`);
            if (!confirmed) return;

            // 포인트 거래 내역 추가
            const { error: transactionError } = await window.supabase
                .from('point_transactions')
                .insert({
                    user_id: this.selectedUser.id,
                    amount: amount,
                    transaction_type: 'spend',
                    description: `[관리자 차감] ${reason}`
                });

            if (transactionError) throw transactionError;

            // 사용자 포인트 차감
            const { error: pointsError } = await window.supabase.rpc('quizbank_subtract_points', {
                user_uuid: this.selectedUser.id,
                points_to_subtract: amount
            });

            if (pointsError) throw pointsError;

            this.showAlert(`${this.selectedUser.name}님의 포인트를 ${amount.toLocaleString()} 포인트 차감했습니다.`, 'success');
            
            // 폼 초기화
            document.getElementById('pointAmount').value = '';
            document.getElementById('pointReason').value = '';
            
            // 사용자 정보 새로고침
            this.refreshSelectedUser();

        } catch (error) {
            console.error('포인트 차감 실패:', error);
            this.showAlert('포인트 차감에 실패했습니다.', 'error');
        }
    }

    /**
     * 선택된 사용자 정보 새로고침
     */
    async refreshSelectedUser() {
        if (!this.selectedUser) return;

        try {
            const { data: updatedUser } = await window.supabase
                .from('profiles')
                .select(`
                    *,
                    user_points (points),
                    departments (name)
                `)
                .eq('id', this.selectedUser.id)
                .single();

            if (updatedUser) {
                this.selectUser(updatedUser);
            }
        } catch (error) {
            console.error('사용자 정보 새로고침 실패:', error);
        }
    }

    /**
     * 부서 목록 로드
     */
    async loadDepartments() {
        try {
            const { data: departments } = await window.supabase
                .from('departments')
                .select('*')
                .order('name');

            const select = document.getElementById('targetDepartment');
            if (select && departments) {
                select.innerHTML = '<option value="">부서 선택</option>' + 
                    departments.map(dept => `<option value="${dept.id}">${dept.name}</option>`).join('');
            }
        } catch (error) {
            console.error('부서 목록 로드 실패:', error);
        }
    }

    /**
     * 일괄 포인트 지급
     */
    async bulkAddPoints() {
        const target = document.getElementById('bulkTarget').value;
        const amount = parseInt(document.getElementById('bulkAmount').value);
        const reason = document.getElementById('bulkReason').value.trim();

        if (!amount || amount <= 0) {
            this.showAlert('유효한 포인트 수량을 입력하세요.', 'error');
            return;
        }

        if (!reason) {
            this.showAlert('지급 사유를 입력하세요.', 'error');
            return;
        }

        try {
            let query = window.supabase.from('profiles').select('id, name');

            // 대상 필터링
            switch (target) {
                case 'department':
                    const departmentId = document.getElementById('targetDepartment').value;
                    if (!departmentId) {
                        this.showAlert('대상 부서를 선택하세요.', 'error');
                        return;
                    }
                    query = query.eq('department_id', departmentId);
                    break;
                case 'active':
                    // 최근 30일 내 활동한 사용자
                    const thirtyDaysAgo = new Date();
                    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                    
                    const { data: activeUsers } = await window.supabase
                        .from('point_transactions')
                        .select('user_id')
                        .gte('created_at', thirtyDaysAgo.toISOString());
                    
                    const activeUserIds = [...new Set(activeUsers?.map(t => t.user_id) || [])];
                    if (activeUserIds.length === 0) {
                        this.showAlert('활성 사용자가 없습니다.', 'error');
                        return;
                    }
                    query = query.in('id', activeUserIds);
                    break;
                // 'all'인 경우 필터링 없음
            }

            const { data: targetUsers } = await query;

            if (!targetUsers || targetUsers.length === 0) {
                this.showAlert('대상 사용자가 없습니다.', 'error');
                return;
            }

            const confirmed = confirm(`${targetUsers.length}명의 사용자에게 각각 ${amount.toLocaleString()} 포인트를 지급하시겠습니까?\n\n총 ${(targetUsers.length * amount).toLocaleString()} 포인트가 지급됩니다.\n\n사유: ${reason}`);
            if (!confirmed) return;

            // 거래 내역 일괄 생성
            const transactions = targetUsers.map(user => ({
                user_id: user.id,
                amount: amount,
                transaction_type: 'earn',
                description: `[일괄 지급] ${reason}`
            }));

            const { error: transactionError } = await window.supabase
                .from('point_transactions')
                .insert(transactions);

            if (transactionError) throw transactionError;

            // 각 사용자별 포인트 업데이트
            for (const user of targetUsers) {
                await window.supabase.rpc('add_user_points', {
                    user_id: user.id,
                    points_to_add: amount
                });
            }

            this.showAlert(`${targetUsers.length}명에게 각각 ${amount.toLocaleString()} 포인트를 지급했습니다.`, 'success');
            
            // 폼 초기화
            document.getElementById('bulkAmount').value = '';
            document.getElementById('bulkReason').value = '';

        } catch (error) {
            console.error('일괄 포인트 지급 실패:', error);
            this.showAlert('일괄 포인트 지급에 실패했습니다.', 'error');
        }
    }

    /**
     * 거래 내역 로드
     */
    async loadTransactionHistory() {
        const dateFrom = document.getElementById('dateFrom')?.value;
        const dateTo = document.getElementById('dateTo')?.value;
        const transactionType = document.getElementById('transactionTypeFilter')?.value;
        const userFilter = document.getElementById('userFilter')?.value?.trim();

        try {
            let query = window.supabase
                .from('point_transactions')
                .select(`
                    *,
                    profiles (name, email),
                    avatar_items (name)
                `)
                .order('created_at', { ascending: false });

            // 필터 적용
            if (dateFrom) {
                query = query.gte('created_at', dateFrom + 'T00:00:00Z');
            }
            if (dateTo) {
                query = query.lte('created_at', dateTo + 'T23:59:59Z');
            }
            if (transactionType) {
                query = query.eq('transaction_type', transactionType);
            }

            const { data: transactions, count } = await query
                .range((this.currentPage - 1) * this.pageSize, this.currentPage * this.pageSize - 1);

            let filteredTransactions = transactions || [];

            // 사용자 필터 (클라이언트 사이드)
            if (userFilter) {
                filteredTransactions = filteredTransactions.filter(t => 
                    t.profiles?.name?.toLowerCase().includes(userFilter.toLowerCase()) ||
                    t.profiles?.email?.toLowerCase().includes(userFilter.toLowerCase())
                );
            }

            const container = document.getElementById('transactionHistory');
            
            if (filteredTransactions.length === 0) {
                container.innerHTML = '<p>조건에 맞는 거래 내역이 없습니다.</p>';
                return;
            }

            const tableHtml = `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>날짜</th>
                            <th>사용자</th>
                            <th>유형</th>
                            <th>금액</th>
                            <th>설명</th>
                            <th>아이템</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredTransactions.map(transaction => {
                            const date = new Date(transaction.created_at).toLocaleString('ko-KR');
                            const userName = transaction.profiles?.name || '알 수 없음';
                            const userEmail = transaction.profiles?.email || '';
                            const typeClass = transaction.transaction_type;
                            const typeText = transaction.transaction_type === 'earn' ? '획득' : '사용';
                            const amount = transaction.transaction_type === 'earn' ? 
                                `+${transaction.amount}` : `-${transaction.amount}`;
                            const itemName = transaction.avatar_items?.name || '-';

                            return `
                                <tr>
                                    <td>${date}</td>
                                    <td>
                                        <strong>${userName}</strong><br>
                                        <small style="color: #666;">${userEmail}</small>
                                    </td>
                                    <td><span class="transaction-type ${typeClass}">${typeText}</span></td>
                                    <td style="color: ${transaction.transaction_type === 'earn' ? '#28a745' : '#dc3545'}; font-weight: bold;">
                                        ${amount} P
                                    </td>
                                    <td>${transaction.description}</td>
                                    <td>${itemName}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            `;

            container.innerHTML = tableHtml;

        } catch (error) {
            console.error('거래 내역 로드 실패:', error);
            document.getElementById('transactionHistory').innerHTML = '<p>데이터 로드에 실패했습니다.</p>';
        }
    }

    /**
     * 거래 내역 내보내기
     */
    async exportTransactions() {
        try {
            const { data: transactions } = await window.supabase
                .from('point_transactions')
                .select(`
                    *,
                    profiles (name, email),
                    avatar_items (name)
                `)
                .order('created_at', { ascending: false });

            if (!transactions || transactions.length === 0) {
                this.showAlert('내보낼 데이터가 없습니다.', 'error');
                return;
            }

            // CSV 데이터 생성
            const csvHeaders = ['날짜', '사용자명', '이메일', '거래유형', '금액', '설명', '아이템'];
            const csvData = transactions.map(t => [
                new Date(t.created_at).toLocaleString('ko-KR'),
                t.profiles?.name || '',
                t.profiles?.email || '',
                t.transaction_type === 'earn' ? '획득' : '사용',
                t.amount,
                t.description,
                t.avatar_items?.name || ''
            ]);

            const csvContent = [csvHeaders, ...csvData]
                .map(row => row.map(field => `"${field}"`).join(','))
                .join('\n');

            // BOM 추가 (한글 깨짐 방지)
            const bom = '\uFEFF';
            const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `포인트_거래내역_${new Date().toISOString().split('T')[0]}.csv`;
            link.click();

            this.showAlert('거래 내역을 성공적으로 내보냈습니다.', 'success');

        } catch (error) {
            console.error('거래 내역 내보내기 실패:', error);
            this.showAlert('거래 내역 내보내기에 실패했습니다.', 'error');
        }
    }

    /**
     * 분석 데이터 로드
     */
    async loadAnalytics() {
        try {
            await this.loadUserActivityAnalysis();
            // 차트 라이브러리가 있다면 일일 포인트 차트도 로드
        } catch (error) {
            console.error('분석 데이터 로드 실패:', error);
        }
    }

    /**
     * 사용자 활동 분석 로드
     */
    async loadUserActivityAnalysis() {
        try {
            // 최근 30일간의 데이터
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const { data: recentActivity } = await window.supabase
                .from('point_transactions')
                .select('user_id, created_at, amount, transaction_type')
                .gte('created_at', thirtyDaysAgo.toISOString());

            if (!recentActivity) {
                document.getElementById('userActivityAnalysis').innerHTML = '<p>활동 데이터가 없습니다.</p>';
                return;
            }

            // 사용자별 활동 분석
            const userActivity = {};
            recentActivity.forEach(transaction => {
                if (!userActivity[transaction.user_id]) {
                    userActivity[transaction.user_id] = {
                        totalEarned: 0,
                        totalSpent: 0,
                        transactionCount: 0,
                        lastActivity: transaction.created_at
                    };
                }

                const activity = userActivity[transaction.user_id];
                if (transaction.transaction_type === 'earn') {
                    activity.totalEarned += transaction.amount;
                } else {
                    activity.totalSpent += transaction.amount;
                }
                activity.transactionCount++;
                
                if (new Date(transaction.created_at) > new Date(activity.lastActivity)) {
                    activity.lastActivity = transaction.created_at;
                }
            });

            const activeUsers = Object.keys(userActivity).length;
            const totalTransactions = recentActivity.length;
            const avgTransactionsPerUser = totalTransactions / activeUsers;

            const analysisHtml = `
                <div class="stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));">
                    <div class="stat-card">
                        <div class="stat-number">${activeUsers}</div>
                        <div class="stat-label">활성 사용자 (30일)</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${totalTransactions}</div>
                        <div class="stat-label">총 거래 수</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${avgTransactionsPerUser.toFixed(1)}</div>
                        <div class="stat-label">사용자당 평균 거래</div>
                    </div>
                </div>
                
                <h4 style="margin-top: 2rem; margin-bottom: 1rem;">📊 활동 요약</h4>
                <p><strong>최근 30일간 ${activeUsers}명의 사용자가 총 ${totalTransactions}건의 포인트 거래를 진행했습니다.</strong></p>
                <p>사용자당 평균 ${avgTransactionsPerUser.toFixed(1)}건의 거래를 기록하고 있으며, 이는 활발한 포인트 시스템 활용을 보여줍니다.</p>
            `;

            document.getElementById('userActivityAnalysis').innerHTML = analysisHtml;

        } catch (error) {
            console.error('사용자 활동 분석 로드 실패:', error);
            document.getElementById('userActivityAnalysis').innerHTML = '<p>분석 데이터 로드에 실패했습니다.</p>';
        }
    }

    /**
     * 알림 표시
     */
    showAlert(message, type = 'info') {
        const alertContainer = document.getElementById('alertContainer');
        if (!alertContainer) return;

        const alert = document.createElement('div');
        alert.className = `alert ${type}`;
        alert.textContent = message;

        alertContainer.appendChild(alert);

        // 3초 후 자동 제거
        setTimeout(() => {
            if (alert.parentNode) {
                alert.parentNode.removeChild(alert);
            }
        }, 3000);
    }
}

// 전역 인스턴스 생성
const pointsAdmin = new PointsAdminManager();

// 전역 함수들 (HTML onclick에서 사용)
function checkAdminAccess() {
    return pointsAdmin.checkAdminAccess();
}

function setupTabNavigation() {
    return pointsAdmin.setupTabNavigation();
}

function loadDashboardData() {
    return pointsAdmin.loadDashboardData();
}

function searchUser() {
    return pointsAdmin.searchUser();
}

function addPoints() {
    return pointsAdmin.addPoints();
}

function subtractPoints() {
    return pointsAdmin.subtractPoints();
}

function bulkAddPoints() {
    return pointsAdmin.bulkAddPoints();
}

function loadTransactionHistory() {
    return pointsAdmin.loadTransactionHistory();
}

function exportTransactions() {
    return pointsAdmin.exportTransactions();
}
