// 时段数据定义 - 12节课
const timeSlots = [
    { id: 1, name: '第1节', startTime: '08:00', endTime: '08:45', period: 'morning' },
    { id: 2, name: '第2节', startTime: '08:55', endTime: '09:40', period: 'morning' },
    { id: 3, name: '第3节', startTime: '10:10', endTime: '10:55', period: 'morning' },
    { id: 4, name: '第4节', startTime: '11:05', endTime: '11:50', period: 'morning' },
    { id: 5, name: '第5节', startTime: '14:00', endTime: '14:45', period: 'afternoon' },
    { id: 6, name: '第6节', startTime: '14:55', endTime: '15:40', period: 'afternoon' },
    { id: 7, name: '第7节', startTime: '16:10', endTime: '16:55', period: 'afternoon' },
    { id: 8, name: '第8节', startTime: '17:05', endTime: '17:50', period: 'afternoon' },
    { id: 9, name: '第9节', startTime: '19:00', endTime: '19:45', period: 'evening' },
    { id: 10, name: '第10节', startTime: '19:55', endTime: '20:40', period: 'evening' },
    { id: 11, name: '第11节', startTime: '21:10', endTime: '21:55', period: 'evening' },
    { id: 12, name: '第12节', startTime: '22:05', endTime: '22:50', period: 'evening' }
];

// 楼宇数据
const buildings = [
    { id: 'shushan', name: '书善楼', desc: '主教学楼，设施完善', count: 15 },
    { id: 'shuxin1', name: '书新1号楼', desc: '综合教学楼', count: 12 },
    { id: 'shuxin2', name: '书新2号楼', desc: '综合教学楼', count: 12 },
    { id: 'shuxin3', name: '书新3号楼', desc: '综合教学楼', count: 12 },
    { id: 'shuxin4', name: '书新4号楼', desc: '综合教学楼', count: 12 },
    { id: 'shuxin5', name: '书新5号楼', desc: '综合教学楼', count: 12 },
    { id: 'shuxin6', name: '书新6号楼', desc: '综合教学楼', count: 12 },
    { id: 'shuxing', name: '书行楼', desc: '实验实训楼', count: 10 },
    { id: 'shuming', name: '书明楼', desc: '行政教学楼', count: 8 }
];

// 状态变量
let currentUser = null;
let currentBuilding = null;
let currentClassrooms = [];
let selectedClassroom = null;
let selectedSlots = [];
let currentFilter = 'all';
let reservations = [];
let currentSelectedDate = '';
let currentCancellingReservation = null;
let previousPage = 'buildings-page';

// 从本地存储加载预约记录
function loadReservations() {
    try {
        const saved = localStorage.getItem('classroom_reservations');
        if (saved) {
            reservations = JSON.parse(saved);
        } else {
            reservations = [];
        }
    } catch (e) {
        console.error('加载预约记录失败:', e);
        reservations = [];
    }
}

// 保存预约记录到本地存储
function saveReservations() {
    try {
        localStorage.setItem('classroom_reservations', JSON.stringify(reservations));
    } catch (e) {
        console.error('保存预约记录失败:', e);
    }
}

// 保存用户信息到本地存储
function saveCurrentUser() {
    try {
        localStorage.setItem('current_user', JSON.stringify(currentUser));
    } catch (e) {
        console.error('保存用户信息失败:', e);
    }
}

// 从本地存储加载用户信息
function loadCurrentUser() {
    try {
        const saved = localStorage.getItem('current_user');
        if (saved) {
            currentUser = JSON.parse(saved);
            return true;
        }
    } catch (e) {
        console.error('加载用户信息失败:', e);
    }
    return false;
}

// 清除用户信息
function clearCurrentUser() {
    currentUser = null;
    localStorage.removeItem('current_user');
}

// 生成教室数据
function generateClassrooms(buildingId, buildingName) {
    const classrooms = [];
    const building = buildings.find(b => b.id === buildingId);
    const count = building ? building.count : 10;
    
    for (let i = 1; i <= count; i++) {
        const floor = Math.ceil(i / 5);
        const roomNum = i % 5 === 0 ? 5 : i % 5;
        const capacity = [30, 40, 50, 60, 80, 100, 120][Math.floor(Math.random() * 7)];
        const types = ['公共教室', '多媒体教室', '实验室', '研讨室'];
        const type = types[Math.floor(Math.random() * types.length)];
        
        classrooms.push({
            id: `${buildingId}-${i}`,
            buildingId: buildingId,
            buildingName: buildingName,
            roomNumber: `${floor}${roomNum.toString().padStart(2, '0')}`,
            capacity: capacity,
            type: type
        });
    }
    
    return classrooms;
}

// 格式化日期为 YYYY-MM-DD
function formatDate(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 获取今天日期
function getTodayDate() {
    return formatDate(new Date());
}

// 判断日期是否是今天或未来
function isUpcoming(dateStr) {
    const today = formatDate(new Date());
    return dateStr >= today;
}

// 获取某个教室在指定日期的已预约时段ID列表
function getOccupiedSlotIds(classroomId, date) {
    const dateStr = formatDate(date);
    const dayReservations = reservations.filter(r => 
        r.classroomId === classroomId && r.date === dateStr
    );
    const occupiedIds = new Set();
    dayReservations.forEach(r => {
        if (r.slots && Array.isArray(r.slots)) {
            r.slots.forEach(slotId => occupiedIds.add(slotId));
        }
    });
    return Array.from(occupiedIds);
}

// 检查教室在指定日期是否完全可用（至少有一个时段可用）
function isClassroomAvailable(classroomId, date) {
    const occupied = getOccupiedSlotIds(classroomId, date);
    return occupied.length < 12;
}

// 获取时段信息
function getSlotInfo(slotId) {
    return timeSlots.find(s => s.id === slotId);
}

// 获取当前用户的预约记录（按姓名匹配）
function getUserReservations() {
    if (!currentUser || !currentUser.name) return [];
    return reservations.filter(r => r.userName === currentUser.name);
}

// 页面切换
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');
    }
    window.scrollTo(0, 0);
}

// 跳转到我的预约页面
function goToMyReservations() {
    const activePage = document.querySelector('.page.active');
    if (activePage && activePage.id) {
        previousPage = activePage.id;
    }
    if (!currentUser) {
        alert('请先登录');
        showPage('login-page');
        return;
    }
    renderMyReservations();
    showPage('reservations-page');
}

// 从我的预约页面返回
function backFromReservations() {
    showPage(previousPage);
}

// 渲染我的预约列表
function renderMyReservations() {
    if (!currentUser) return;
    
    const userReservations = getUserReservations();
    const list = document.getElementById('reservations-list');
    const emptyState = document.getElementById('empty-state');
    
    if (!list || !emptyState) return;
    
    document.getElementById('header-username-3').textContent = currentUser.name;
    const roleNames = { student: '学生', teacher: '教师', leader: '领导' };
    document.getElementById('header-role-3').textContent = roleNames[currentUser.role] || '用户';
    
    const upcoming = userReservations.filter(r => isUpcoming(r.date));
    const past = userReservations.filter(r => !isUpcoming(r.date));
    
    document.getElementById('stat-total').textContent = userReservations.length;
    document.getElementById('stat-upcoming').textContent = upcoming.length;
    document.getElementById('stat-past').textContent = past.length;
    
    if (userReservations.length === 0) {
        list.style.display = 'none';
        emptyState.style.display = 'flex';
        return;
    }
    
    list.style.display = 'block';
    emptyState.style.display = 'none';
    
    const sortedReservations = [...userReservations].sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        const minA = a.slots ? Math.min(...a.slots) : 0;
        const minB = b.slots ? Math.min(...b.slots) : 0;
        return minB - minA;
    });
    
    list.innerHTML = '';
    sortedReservations.forEach((reservation, index) => {
        const isUpcomingFlag = isUpcoming(reservation.date);
        const slotNames = reservation.slots
            .map(id => {
                const slot = getSlotInfo(id);
                return slot ? `${slot.name}(${slot.startTime}-${slot.endTime})` : '';
            })
            .join('、');
        
        const card = document.createElement('div');
        card.className = `reservation-card ${isUpcomingFlag ? 'upcoming' : 'past'}`;
        card.style.animationDelay = `${index * 0.05}s`;
        
        card.innerHTML = `
            <div class="reservation-status">
                <span class="status-badge ${isUpcomingFlag ? 'upcoming' : 'past'}">
                    ${isUpcomingFlag ? '待使用' : '已完成'}
                </span>
            </div>
            <div class="reservation-body">
                <div class="reservation-header">
                    <h4 class="reservation-title">${reservation.buildingName} ${reservation.classroomNumber}教室</h4>
                </div>
                <div class="reservation-details">
                    <div class="detail-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                            <line x1="16" y1="2" x2="16" y2="6"/>
                            <line x1="8" y1="2" x2="8" y2="6"/>
                            <line x1="3" y1="10" x2="21" y2="10"/>
                        </svg>
                        <span>${reservation.date}</span>
                    </div>
                    <div class="detail-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                        </svg>
                        <span>${slotNames}</span>
                    </div>
                    <div class="detail-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                        </svg>
                        <span>${reservation.userPhone || '-'}</span>
                    </div>
                    <div class="detail-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                            <line x1="16" y1="13" x2="8" y2="13"/>
                            <line x1="16" y1="17" x2="8" y2="17"/>
                        </svg>
                        <span>${reservation.purpose || '-'}</span>
                    </div>
                </div>
            </div>
            <div class="reservation-actions">
                ${isUpcomingFlag ? `
                    <button class="action-btn change-btn" data-id="${reservation.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 20h9"/>
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                        </svg>
                        更换教室
                    </button>
                    <button class="action-btn cancel-btn" data-id="${reservation.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="15" y1="9" x2="9" y2="15"/>
                            <line x1="9" y1="9" x2="15" y2="15"/>
                        </svg>
                        取消预约
                    </button>
                ` : `
                    <span class="past-label">已结束</span>
                `}
            </div>
        `;
        
        list.appendChild(card);
    });
    
    document.querySelectorAll('.cancel-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            openCancelModal(id);
        });
    });
    
    document.querySelectorAll('.change-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            changeReservation(id);
        });
    });
}

// 打开取消预约弹窗
function openCancelModal(reservationId) {
    const reservation = reservations.find(r => r.id === reservationId);
    if (!reservation) return;
    
    currentCancellingReservation = reservation;
    
    const slotNames = reservation.slots
        .map(id => {
            const slot = getSlotInfo(id);
            return slot ? `${slot.name}(${slot.startTime}-${slot.endTime})` : '';
        })
        .join('、');
    
    document.getElementById('cancel-info').innerHTML = `
        <p><strong>教学楼：</strong>${reservation.buildingName}</p>
        <p><strong>教室：</strong>${reservation.classroomNumber} 教室</p>
        <p><strong>预约人：</strong>${reservation.userName}</p>
        <p><strong>联系电话：</strong>${reservation.userPhone || '-'}</p>
        <p><strong>日期：</strong>${reservation.date}</p>
        <p><strong>时段：</strong>${slotNames}</p>
    `;
    
    document.getElementById('cancel-modal').classList.add('active');
}

// 确认取消预约
function confirmCancel() {
    if (!currentCancellingReservation) return;
    
    const reservationId = currentCancellingReservation.id;
    reservations = reservations.filter(r => r.id !== reservationId);
    saveReservations();
    
    currentCancellingReservation = null;
    closeModal('cancel-modal');
    
    setTimeout(() => {
        document.getElementById('cancel-success-modal').classList.add('active');
    }, 200);
    
    renderMyReservations();
    renderClassrooms();
}

// 更换预约教室
function changeReservation(reservationId) {
    const reservation = reservations.find(r => r.id === reservationId);
    if (!reservation) return;
    
    const building = buildings.find(b => b.name === reservation.buildingName);
    if (building) {
        selectBuilding(building);
    } else {
        showPage('buildings-page');
    }
}

// 身份切换
function initRoleTabs() {
    const tabs = document.querySelectorAll('.role-tab');
    const studentFields = document.querySelectorAll('.student-only');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            const role = tab.dataset.role;
            if (role === 'student') {
                studentFields.forEach(field => field.classList.add('show'));
            } else {
                studentFields.forEach(field => field.classList.remove('show'));
            }
        });
    });
}

// 登录表单提交
function initLoginForm() {
    const form = document.getElementById('login-form');
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const activeTab = document.querySelector('.role-tab.active');
        const role = activeTab.dataset.role;
        const name = document.getElementById('name').value.trim();
        const purpose = document.getElementById('purpose').value.trim();
        const phone = document.getElementById('phone').value.trim();
        
        if (!name || !purpose || !phone) {
            alert('请填写完整信息');
            return;
        }
        
        if (!/^1[3-9]\d{9}$/.test(phone)) {
            alert('请输入正确的手机号码');
            return;
        }
        
        if (role === 'student') {
            const className = document.getElementById('className').value.trim();
            const studentId = document.getElementById('studentId').value.trim();
            
            if (!className || !studentId) {
                alert('请填写班级和学号');
                return;
            }
            
            currentUser = {
                role: role,
                name: name,
                className: className,
                studentId: studentId,
                purpose: purpose,
                phone: phone
            };
        } else {
            currentUser = {
                role: role,
                name: name,
                purpose: purpose,
                phone: phone
            };
        }
        
        saveCurrentUser();
        updateUserInfo();
        renderBuildings();
        showPage('buildings-page');
    });
}

// 更新用户信息显示
function updateUserInfo() {
    if (!currentUser) return;
    
    const roleNames = {
        student: '学生',
        teacher: '教师',
        leader: '领导'
    };
    
    const usernameEls = ['header-username', 'header-username-2', 'header-username-3'];
    const roleEls = ['header-role', 'header-role-2', 'header-role-3'];
    
    usernameEls.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = currentUser.name;
    });
    
    roleEls.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = roleNames[currentUser.role] || '用户';
    });
}

// 渲染楼宇列表
function renderBuildings() {
    const grid = document.getElementById('buildings-grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    buildings.forEach((building, index) => {
        const card = document.createElement('div');
        card.className = 'building-card';
        card.style.animationDelay = `${index * 0.05}s`;
        card.innerHTML = `
            <div class="building-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="4" y="2" width="16" height="20" rx="2" ry="2"/>
                    <path d="M9 22v-4h6v4"/>
                    <path d="M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/>
                </svg>
            </div>
            <h3 class="building-name">${building.name}</h3>
            <p class="building-desc">${building.desc}</p>
            <div class="building-meta">
                <div class="classroom-count">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 21h18"/>
                        <path d="M5 21V7l8-4v18"/>
                        <path d="M19 21V11l-6-4"/>
                    </svg>
                    <strong>${building.count}</strong>
                    <span>间教室</span>
                </div>
                <svg class="building-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
            </div>
        `;
        
        card.addEventListener('click', () => {
            selectBuilding(building);
        });
        
        grid.appendChild(card);
    });
}

// 选择楼宇
function selectBuilding(building) {
    currentBuilding = building;
    currentClassrooms = generateClassrooms(building.id, building.name);
    currentFilter = 'all';
    currentSelectedDate = getTodayDate();
    
    document.getElementById('crumb-building').textContent = building.name;
    document.getElementById('classrooms-page-title').textContent = building.name + ' - 公共教室';
    document.getElementById('classrooms-page-subtitle').textContent = '请选择您想要预约的教室';
    
    updateFilterButtons();
    renderClassrooms();
    showPage('classrooms-page');
}

// 更新筛选按钮状态
function updateFilterButtons() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.status === currentFilter) {
            btn.classList.add('active');
        }
    });
}

// 渲染教室列表
function renderClassrooms() {
    const grid = document.getElementById('classrooms-grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    const today = getTodayDate();
    const viewDate = currentSelectedDate || today;
    
    let filteredClassrooms = currentClassrooms;
    if (currentFilter === 'available') {
        filteredClassrooms = currentClassrooms.filter(c => isClassroomAvailable(c.id, viewDate));
    } else if (currentFilter === 'occupied') {
        filteredClassrooms = currentClassrooms.filter(c => !isClassroomAvailable(c.id, viewDate));
    }
    
    const totalEl = document.getElementById('classrooms-total');
    if (totalEl) {
        totalEl.textContent = filteredClassrooms.length;
    }
    
    filteredClassrooms.forEach((classroom, index) => {
        const available = isClassroomAvailable(classroom.id, viewDate);
        const occupiedCount = getOccupiedSlotIds(classroom.id, viewDate).length;
        
        const card = document.createElement('div');
        card.className = `classroom-card ${available ? 'available' : 'occupied'}`;
        card.style.animationDelay = `${index * 0.03}s`;
        
        const statusText = available ? '可预约' : '已满';
        
        card.innerHTML = `
            <div class="classroom-header">
                <span class="classroom-number">${classroom.roomNumber}</span>
                <span class="classroom-status ${available ? 'available' : 'occupied'}">${statusText}</span>
            </div>
            <div class="classroom-info">
                <div class="classroom-info-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                    容纳 ${classroom.capacity} 人
                </div>
                <div class="classroom-info-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12 6 12 12 16 14"/>
                    </svg>
                    已约 ${occupiedCount}/12 节
                </div>
            </div>
            <div class="classroom-type">
                类型：<span>${classroom.type}</span>
            </div>
        `;
        
        if (available) {
            card.addEventListener('click', () => {
                openReserveModal(classroom);
            });
        }
        
        grid.appendChild(card);
    });
}

// 初始化筛选功能
function initFilter() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentFilter = btn.dataset.status;
            updateFilterButtons();
            renderClassrooms();
        });
    });
}

// 渲染时段选择
function renderTimeSlots(classroomId, date) {
    const occupiedSlotIds = getOccupiedSlotIds(classroomId, date);
    
    const morningContainer = document.getElementById('morning-slots');
    const afternoonContainer = document.getElementById('afternoon-slots');
    const eveningContainer = document.getElementById('evening-slots');
    
    if (!morningContainer || !afternoonContainer || !eveningContainer) return;
    
    morningContainer.innerHTML = '';
    afternoonContainer.innerHTML = '';
    eveningContainer.innerHTML = '';
    
    timeSlots.forEach(slot => {
        const isOccupied = occupiedSlotIds.includes(slot.id);
        const isSelected = selectedSlots.includes(slot.id);
        
        const slotEl = document.createElement('div');
        slotEl.className = `time-slot ${isOccupied ? 'occupied' : ''} ${isSelected ? 'selected' : ''}`;
        slotEl.dataset.slotId = slot.id;
        
        slotEl.innerHTML = `
            <div class="slot-name">${slot.name}</div>
            <div class="slot-time">${slot.startTime}-${slot.endTime}</div>
        `;
        
        if (!isOccupied) {
            slotEl.addEventListener('click', () => {
                toggleSlot(slot.id);
            });
        }
        
        if (slot.period === 'morning') {
            morningContainer.appendChild(slotEl);
        } else if (slot.period === 'afternoon') {
            afternoonContainer.appendChild(slotEl);
        } else {
            eveningContainer.appendChild(slotEl);
        }
    });
}

// 切换时段选择状态
function toggleSlot(slotId) {
    const index = selectedSlots.indexOf(slotId);
    if (index === -1) {
        selectedSlots.push(slotId);
    } else {
        selectedSlots.splice(index, 1);
    }
    
    const slotEl = document.querySelector(`.time-slot[data-slot-id="${slotId}"]`);
    if (slotEl) {
        slotEl.classList.toggle('selected');
    }
}

// 打开预约弹窗
function openReserveModal(classroom) {
    if (!currentUser) {
        alert('请先登录');
        showPage('login-page');
        return;
    }
    
    selectedClassroom = classroom;
    selectedSlots = [];
    currentSelectedDate = getTodayDate();
    
    document.getElementById('modal-building').textContent = classroom.buildingName;
    document.getElementById('modal-classroom').textContent = classroom.roomNumber + ' 教室';
    document.getElementById('modal-capacity').textContent = classroom.capacity + ' 人';
    document.getElementById('modal-user').textContent = currentUser.name;
    document.getElementById('modal-phone').textContent = currentUser.phone;
    document.getElementById('modal-purpose-text').value = currentUser.purpose;
    
    const dateInput = document.getElementById('reserve-date');
    dateInput.value = currentSelectedDate;
    dateInput.min = getTodayDate();
    
    renderTimeSlots(classroom.id, currentSelectedDate);
    
    const newDateInput = dateInput.cloneNode(true);
    dateInput.parentNode.replaceChild(newDateInput, dateInput);
    
    newDateInput.addEventListener('change', (e) => {
        currentSelectedDate = e.target.value;
        selectedSlots = [];
        renderTimeSlots(classroom.id, currentSelectedDate);
    });
    
    document.getElementById('reserve-modal').classList.add('active');
}

// 关闭弹窗
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

// 初始化弹窗
function initModals() {
    document.getElementById('close-modal').addEventListener('click', () => {
        closeModal('reserve-modal');
    });
    
    document.getElementById('cancel-reserve').addEventListener('click', () => {
        closeModal('reserve-modal');
    });
    
    document.getElementById('confirm-reserve').addEventListener('click', () => {
        confirmReserve();
    });
    
    document.getElementById('success-btn').addEventListener('click', () => {
        closeModal('success-modal');
    });
    
    document.getElementById('close-cancel-modal').addEventListener('click', () => {
        closeModal('cancel-modal');
    });
    
    document.getElementById('cancel-cancel-btn').addEventListener('click', () => {
        closeModal('cancel-modal');
    });
    
    document.getElementById('confirm-cancel-btn').addEventListener('click', () => {
        confirmCancel();
    });
    
    document.getElementById('cancel-success-btn').addEventListener('click', () => {
        closeModal('cancel-success-modal');
    });
    
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            if (modal) {
                modal.classList.remove('active');
            }
        });
    });
}

// 确认预约
function confirmReserve() {
    if (!selectedClassroom || !currentUser) return;
    
    const date = document.getElementById('reserve-date').value;
    const purpose = document.getElementById('modal-purpose-text').value.trim();
    
    if (!date) {
        alert('请选择预约日期');
        return;
    }
    
    if (selectedSlots.length === 0) {
        alert('请选择至少一个时段');
        return;
    }
    
    if (!purpose) {
        alert('请填写使用用途');
        return;
    }
    
    const occupiedSlotIds = getOccupiedSlotIds(selectedClassroom.id, date);
    const conflictSlots = selectedSlots.filter(id => occupiedSlotIds.includes(id));
    
    if (conflictSlots.length > 0) {
        const conflictNames = conflictSlots.map(id => {
            const slot = getSlotInfo(id);
            return slot ? slot.name : '';
        }).join('、');
        alert(`以下时段已被预约：${conflictNames}\n请重新选择。`);
        selectedSlots = [];
        renderTimeSlots(selectedClassroom.id, date);
        return;
    }
    
    const reservation = {
        id: Date.now().toString(),
        userName: currentUser.name,
        userRole: currentUser.role,
        userPhone: currentUser.phone,
        classroomId: selectedClassroom.id,
        buildingName: selectedClassroom.buildingName,
        classroomNumber: selectedClassroom.roomNumber,
        date: date,
        slots: [...selectedSlots].sort((a, b) => a - b),
        purpose: purpose,
        createdAt: new Date().toISOString()
    };
    
    reservations.push(reservation);
    saveReservations();
    
    closeModal('reserve-modal');
    
    const slotNames = reservation.slots
        .map(id => {
            const slot = getSlotInfo(id);
            return slot ? `${slot.name}(${slot.startTime}-${slot.endTime})` : '';
        })
        .join('、');
    
    document.getElementById('success-detail').innerHTML = `
        <p><strong>教学楼：</strong>${selectedClassroom.buildingName}</p>
        <p><strong>教室：</strong>${selectedClassroom.roomNumber} 教室</p>
        <p><strong>预约人：</strong>${currentUser.name}</p>
        <p><strong>联系电话：</strong>${currentUser.phone}</p>
        <p><strong>日期：</strong>${date}</p>
        <p><strong>时段：</strong>${slotNames}</p>
        <p><strong>用途：</strong>${purpose}</p>
    `;
    
    setTimeout(() => {
        document.getElementById('success-modal').classList.add('active');
    }, 200);
    
    renderClassrooms();
}

// 初始化返回按钮
function initBackButtons() {
    document.getElementById('back-to-login').addEventListener('click', () => {
        showPage('login-page');
    });
    
    document.getElementById('back-to-buildings').addEventListener('click', () => {
        showPage('buildings-page');
    });
    
    document.getElementById('back-from-reservations').addEventListener('click', () => {
        backFromReservations();
    });
}

// 初始化我的预约按钮
function initMyReservationsButtons() {
    const btn1 = document.getElementById('my-reservations-btn');
    if (btn1) {
        btn1.addEventListener('click', () => {
            previousPage = 'buildings-page';
            goToMyReservations();
        });
    }
    
    const btn2 = document.getElementById('my-reservations-btn-2');
    if (btn2) {
        btn2.addEventListener('click', () => {
            previousPage = 'classrooms-page';
            goToMyReservations();
        });
    }
}

// 初始化
function init() {
    loadReservations();
    
    if (loadCurrentUser() && currentUser) {
        updateUserInfo();
        renderBuildings();
        showPage('buildings-page');
    }
    
    initRoleTabs();
    initLoginForm();
    initFilter();
    initModals();
    initBackButtons();
    initMyReservationsButtons();
}

document.addEventListener('DOMContentLoaded', init);
