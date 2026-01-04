const { days, bellSchedule, teachers } = appData;

// --- Clock ---
function updateClock() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const dateString = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' });

    document.getElementById('clock').textContent = timeString;
    const dateEl = document.getElementById('date');
    if (dateEl) dateEl.textContent = dateString;
}
setInterval(updateClock, 1000);
updateClock();

// --- State ---
// Load last viewed teacher from localStorage, fallback to first teacher
const STORAGE_KEY = 'jadwal_lastTeacherId';
let currentTeacherId = localStorage.getItem(STORAGE_KEY) || teachers[0]?.id || null;

// Validate that the stored ID exists in current data
if (!teachers.find(t => t.id === currentTeacherId)) {
    currentTeacherId = teachers[0]?.id || null;
}

// --- Init ---
function initApp() {
    renderTeacherSelector();
    renderSchedule();
}

// --- Teacher Selector ---
function renderTeacherSelector() {
    const profileSection = document.querySelector('.profile-section');
    profileSection.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'custom-select-wrapper';

    const select = document.createElement('div');
    select.className = 'custom-select';

    const trigger = document.createElement('div');
    trigger.className = 'custom-select-trigger';
    const currentTeacher = teachers.find(t => t.id === currentTeacherId) || teachers[0];
    trigger.innerHTML = `<span>${currentTeacher.name}</span> <span class="teacher-code-badge">${currentTeacher.code}</span>`;

    const options = document.createElement('div');
    options.className = 'custom-options';

    teachers.forEach(t => {
        const option = document.createElement('div');
        option.className = 'custom-option';
        if (t.id === currentTeacherId) option.classList.add('selected');

        option.innerHTML = `<span>${t.name}</span> <span class="teacher-code-badge">${t.code}</span>`;

        option.addEventListener('click', (e) => {
            currentTeacherId = t.id;

            // Save to localStorage
            localStorage.setItem(STORAGE_KEY, currentTeacherId);

            trigger.innerHTML = `<span>${t.name}</span> <span class="teacher-code-badge">${t.code}</span>`;
            select.classList.remove('open');
            document.querySelectorAll('.custom-option').forEach(el => el.classList.remove('selected'));
            option.classList.add('selected');

            renderSchedule();
            e.stopPropagation();
        });

        options.appendChild(option);
    });

    select.appendChild(trigger);
    select.appendChild(options);
    wrapper.appendChild(select);
    profileSection.appendChild(wrapper);

    trigger.addEventListener('click', (e) => {
        select.classList.toggle('open');
        e.stopPropagation();
    });

    document.addEventListener('click', (e) => {
        if (!select.contains(e.target)) {
            select.classList.remove('open');
        }
    });
}

// --- Render Schedule ---
function renderSchedule() {
    const teacher = teachers.find(t => t.id === currentTeacherId);
    if (!teacher) return;

    const container = document.getElementById('schedule-view');
    container.innerHTML = '';

    const tabsContainer = document.getElementById('day-tabs');
    tabsContainer.innerHTML = '';

    // Track hours per day for statistics
    const hoursPerDay = {};
    let totalWeeklyHours = 0;

    // Create Tabs for Mobile
    days.forEach((day, index) => {
        const tab = document.createElement('button');
        tab.className = 'day-tab';
        tab.textContent = day.substring(0, 3);

        tab.onclick = () => {
            document.querySelectorAll('.day-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const dayCard = document.getElementById(`day-${day}`);
            if (dayCard) {
                dayCard.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                document.querySelectorAll('.day-column').forEach(d => d.classList.remove('mobile-active'));
                dayCard.classList.add('mobile-active');
            }
        };
        tabsContainer.appendChild(tab);
    });

    // Render Columns
    days.forEach((day, index) => {
        const column = document.createElement('div');
        column.className = 'day-column';
        column.id = `day-${day}`;
        if (index === 0) column.classList.add('mobile-active');

        const header = document.createElement('div');
        header.className = 'day-header';
        header.innerHTML = `<h3>${day}</h3>`;
        column.appendChild(header);

        const timeline = document.createElement('div');
        timeline.className = 'timeline-list';

        const daySchedule = bellSchedule[day];

        // Calculate hours for this day
        const teacherClasses = teacher.schedule[day] || [];
        let dayHours = 0;
        teacherClasses.forEach(cls => {
            dayHours += cls.periods.length; // Each period = 1 jam pelajaran
        });
        hoursPerDay[day] = dayHours;
        totalWeeklyHours += dayHours;

        daySchedule.forEach((slot, sIndex) => {
            const item = document.createElement('div');
            item.className = 'timeline-item';

            const timeCol = document.createElement('div');
            timeCol.className = 'time-col';
            const startTime = slot.time.split('-')[0].trim();
            const endTime = slot.time.split('-')[1] ? slot.time.split('-')[1].trim() : '';
            timeCol.innerHTML = `<span class="start-time">${startTime}</span><span class="end-time">${endTime}</span>`;
            item.appendChild(timeCol);

            const contentCol = document.createElement('div');
            contentCol.className = 'content-col';

            if (slot.period === "Rest") {
                item.classList.add('item-rest');
                contentCol.innerHTML = `<div class="event-title">☕ ${slot.label || 'Istirahat'}</div>`;
            } else {
                const classInfo = teacherClasses.find(c => c.periods.includes(slot.period));
                const periodBadge = `<span class="period-badge">${slot.period}</span>`;

                if (classInfo) {
                    item.classList.add('item-class');

                    let colorClass = 'border-default';
                    if (classInfo.class.includes('TP')) colorClass = 'border-tp';
                    else if (classInfo.class.includes('TKR')) colorClass = 'border-tkr';
                    else if (classInfo.class.includes('TSM')) colorClass = 'border-tsm';
                    else if (classInfo.class.includes('TJKT') || classInfo.class.includes('DKV')) colorClass = 'border-tjkt';

                    item.classList.add(colorClass);

                    contentCol.innerHTML = `
                        <div class="class-header">
                            ${periodBadge}
                            <span class="class-title">${classInfo.class}</span>
                        </div>
                        <div class="class-details">Ruang Kelas</div>
                    `;
                } else if (slot.type) {
                    item.classList.add('item-special');
                    contentCol.innerHTML = `
                        <div class="special-header">
                            ${periodBadge}
                            <span class="special-title">${slot.type}</span>
                        </div>
                    `;
                } else {
                    item.classList.add('item-empty');
                    contentCol.innerHTML = `
                        <div class="empty-header">
                            ${periodBadge}
                            <span class="empty-title">Kosong</span>
                        </div>
                    `;
                }
            }
            item.appendChild(contentCol);
            timeline.appendChild(item);
        });

        column.appendChild(timeline);
        container.appendChild(column);
    });

    // Render Statistics
    renderClassStats(teacher);
    renderStats(hoursPerDay, totalWeeklyHours);

    // Auto-select today
    const currentDayName = new Date().toLocaleDateString('id-ID', { weekday: 'long' });
    const todayIndex = days.indexOf(currentDayName);
    if (todayIndex !== -1) {
        const tabs = document.querySelectorAll('.day-tab');
        if (tabs[todayIndex]) {
            tabs[todayIndex].click();
        }
    } else {
        const tabs = document.querySelectorAll('.day-tab');
        if (tabs.length > 0) tabs[0].click();
    }
}

// --- Helper ---
function isTeachingPeriod(day, period) {
    const daySchedule = bellSchedule[day];
    const slot = daySchedule.find(s => s.period === period);
    if (!slot) return false;
    // Hitungan tidak termasuk Upacara & P5
    if (slot.type === "Upacara" || slot.type === "P5") return false;
    if (slot.period === "Rest") return false;
    return true;
}

// --- Render Class Statistics ---
function renderClassStats(teacher) {
    const classStatsSection = document.getElementById('class-stats-section');
    if (!classStatsSection) return;

    classStatsSection.innerHTML = '';

    const classHours = {};

    // Calculate hours per class
    days.forEach(day => {
        const teacherClasses = teacher.schedule[day] || [];
        teacherClasses.forEach(cls => {
            const className = cls.class;
            if (!classHours[className]) {
                classHours[className] = {
                    total: 0,
                    breakdown: []
                };
            }

            const validPeriods = cls.periods.filter(p => isTeachingPeriod(day, p));
            const count = validPeriods.length;

            if (count > 0) {
                classHours[className].total += count;
                classHours[className].breakdown.push(`${day}: ${count} Jam`);
            }
        });
    });

    if (Object.keys(classHours).length === 0) return;

    const container = document.createElement('div');
    container.className = 'class-stats-container';

    const title = document.createElement('h3');
    title.className = 'stats-title';
    title.textContent = '📚 Jumlah Jam Per Kelas';
    container.appendChild(title);

    const list = document.createElement('div');
    list.className = 'class-stats-list';

    for (const className in classHours) {
        const data = classHours[className];
        const item = document.createElement('div');
        item.className = 'class-stat-item';

        // Determine color class
        let colorClass = 'border-default';
        if (className.includes('TP')) colorClass = 'border-tp';
        else if (className.includes('TKR')) colorClass = 'border-tkr';
        else if (className.includes('TSM')) colorClass = 'border-tsm';
        else if (className.includes('TJKT') || className.includes('DKV')) colorClass = 'border-tjkt';

        item.classList.add(colorClass);

        item.innerHTML = `
            <div class="class-stat-main">
                <span class="class-stat-name">${className}</span>
                <span class="class-stat-total"> = ${data.total} Jam</span>
            </div>
            <div class="class-stat-details">(${data.breakdown.join(' & ')})</div>
        `;
        list.appendChild(item);
    }

    container.appendChild(list);
    classStatsSection.appendChild(container);
}

// --- Render Statistics ---
function renderStats(hoursPerDay, totalWeeklyHours) {
    const statsSection = document.getElementById('stats-section');
    if (!statsSection) return;

    statsSection.innerHTML = '';

    // Create stats container
    const statsContainer = document.createElement('div');
    statsContainer.className = 'stats-container';

    // Title
    const title = document.createElement('h3');
    title.className = 'stats-title';
    title.textContent = '📊 Statistik Jam Mengajar';
    statsContainer.appendChild(title);

    // Daily Stats Grid
    const dailyGrid = document.createElement('div');
    dailyGrid.className = 'stats-grid';

    days.forEach(day => {
        const hours = hoursPerDay[day] || 0;
        const statCard = document.createElement('div');
        statCard.className = 'stat-card';
        statCard.innerHTML = `
            <span class="stat-day">${day}</span>
            <span class="stat-hours">${hours}</span>
            <span class="stat-label">Jam</span>
        `;
        dailyGrid.appendChild(statCard);
    });

    statsContainer.appendChild(dailyGrid);

    // Total Weekly
    const totalCard = document.createElement('div');
    totalCard.className = 'stat-total';
    totalCard.innerHTML = `
        <span class="total-label">Total Jam Minggu Ini</span>
        <span class="total-hours">${totalWeeklyHours} Jam Pelajaran</span>
    `;
    statsContainer.appendChild(totalCard);

    statsSection.appendChild(statsContainer);
}

document.addEventListener('DOMContentLoaded', initApp);
