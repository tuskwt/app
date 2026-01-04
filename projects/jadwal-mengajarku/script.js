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

const SHIFT_STORAGE_KEY = 'jadwal_dayShifts';
// Default to 0 for each day
let dayShifts = JSON.parse(localStorage.getItem(SHIFT_STORAGE_KEY)) || {
    'Senin': 0, 'Selasa': 0, 'Rabu': 0, 'Kamis': 0, 'Jumat': 0
};

// backward compatibility
if (typeof dayShifts === 'number') {
    const val = dayShifts;
    dayShifts = { 'Senin': val, 'Selasa': val, 'Rabu': val, 'Kamis': val, 'Jumat': val };
}

// --- Init ---
function initApp() {
    renderTeacherSelector();
    renderSchedule();
    initSearch();
}

// --- Search Logic ---
function initSearch() {
    const searchInput = document.getElementById('schedule-search');
    const searchResults = document.getElementById('search-results');

    if (!searchInput || !searchResults) return;

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        if (query.length < 2) {
            searchResults.classList.remove('active');
            return;
        }

        const teacher = teachers.find(t => t.id === currentTeacherId);
        if (!teacher) return;

        const results = [];
        days.forEach(day => {
            const daySchedule = teacher.schedule[day] || [];
            const currentShift = dayShifts[day] || 0;
            daySchedule.forEach(cls => {
                if (cls.class.toLowerCase().includes(query)) {
                    // Find period details
                    const periods = cls.periods.join(', ');
                    const timeRange = getTimeRangeForPeriods(day, cls.periods, currentShift);

                    results.push({
                        day,
                        class: cls.class,
                        periods,
                        time: timeRange
                    });
                }
            });
        });

        renderSearchResults(results);
    });

    // Close results when clicking outside
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.classList.remove('active');
        }
    });
}

function getTimeRangeForPeriods(day, periods, shift = 0) {
    const dayBell = bellSchedule[day];
    // If shift is 1, a class at period 2 moves to period 1's time slot.
    // So we lookup the bell schedule for (period - shift)
    const firstPeriod = periods[0] - shift;
    const lastPeriod = periods[periods.length - 1] - shift;

    const startSlot = dayBell.find(s => s.period === firstPeriod);
    const endSlot = dayBell.find(s => s.period === lastPeriod);

    if (!startSlot || !endSlot) return '';

    const startTime = startSlot.time.split('-')[0].trim();
    const endTime = endSlot.time.indexOf('-') !== -1 ? endSlot.time.split('-')[1].trim() : '';

    return `${startTime} - ${endTime}`;
}

function renderSearchResults(results) {
    const searchResults = document.getElementById('search-results');
    searchResults.innerHTML = '';

    if (results.length === 0) {
        searchResults.innerHTML = '<div class="search-result-item" style="color: var(--text-muted); text-align: center;">Tidak ada jadwal ditemukan</div>';
    } else {
        results.forEach(res => {
            const item = document.createElement('div');
            item.className = 'search-result-item';
            item.innerHTML = `
                <span class="result-day">${res.day}</span>
                <span class="result-class">${res.class}</span>
                <div class="result-info">
                    <span>Jam Ke: ${res.periods}</span>
                    <span>${res.time}</span>
                </div>
            `;

            item.addEventListener('click', () => {
                // Focus on the day
                const tab = Array.from(document.querySelectorAll('.day-tab')).find(t => t.textContent.toLowerCase() === res.day.substring(0, 3).toLowerCase());
                if (tab) tab.click();

                document.getElementById('schedule-search').value = res.class;
                searchResults.classList.remove('active');
            });

            searchResults.appendChild(item);
        });
    }

    searchResults.classList.add('active');
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

// Global function for day header inputs
window.toggleDayShift = (day) => {
    // Toggle between 0 and 1
    dayShifts[day] = dayShifts[day] === 0 ? 1 : 0;
    localStorage.setItem(SHIFT_STORAGE_KEY, JSON.stringify(dayShifts));
    renderSchedule();
};

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

        const currentShift = dayShifts[day] || 0;

        const header = document.createElement('div');
        header.className = 'day-header';

        let shiftControlHtml = '';
        if (day === 'Senin' || day === 'Jumat') {
            shiftControlHtml = `
                <button class="shift-toggle-btn ${currentShift > 0 ? 'active' : ''}" 
                        onclick="toggleDayShift('${day}')">
                    ${currentShift > 0 ? 'Normal' : 'Maju 1X'}
                </button>
            `;
        }

        header.innerHTML = `
            <div class="day-header-content">
                <h3>${day}</h3>
                ${shiftControlHtml}
            </div>
        `;
        column.appendChild(header);

        const timeline = document.createElement('div');
        timeline.className = 'timeline-list';

        const daySchedule = bellSchedule[day];
        const numericPeriods = daySchedule.filter(s => typeof s.period === 'number').map(s => s.period);
        const maxDayPeriod = numericPeriods.length > 0 ? Math.max(...numericPeriods) : 0;

        // Calculate hours for this day
        const teacherClasses = teacher.schedule[day] || [];
        let dayHours = 0;
        teacherClasses.forEach(cls => {
            dayHours += cls.periods.length;
        });
        hoursPerDay[day] = dayHours;
        totalWeeklyHours += dayHours;

        daySchedule.forEach((slot, sIndex) => {
            const originalPeriod = slot.period;

            // If shifting, hide the empty slots at the end of the day
            if (currentShift > 0 && typeof originalPeriod === 'number' && originalPeriod > (maxDayPeriod - currentShift)) {
                return;
            }
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

            if (originalPeriod === "Rest") {
                item.classList.add('item-rest');
                contentCol.innerHTML = `
                    <div class="class-header">
                        <span class="period-badge">☕</span>
                        <span class="rest-title">${slot.label || 'Istirahat'}</span>
                    </div>
                `;
            } else if (currentShift > 0 && typeof originalPeriod === 'number') {
                const advancedPeriod = originalPeriod + currentShift;
                const classInfoShift = teacherClasses.find(c => c.periods.includes(advancedPeriod));

                // Info aslinya untuk tooltip/konteks
                const classInfoOrig = teacherClasses.find(c => c.periods.includes(originalPeriod));
                const originalType = slot.type;
                let origDesc = originalType || (classInfoOrig ? classInfoOrig.class : 'Kosong');

                if (classInfoShift) {
                    item.classList.add('item-class');
                    let colorClass = 'border-default';
                    if (classInfoShift.class.includes('TP')) colorClass = 'border-tp';
                    else if (classInfoShift.class.includes('TKR')) colorClass = 'border-tkr';
                    else if (classInfoShift.class.includes('TSM')) colorClass = 'border-tsm';
                    else if (classInfoShift.class.includes('TJKT') || classInfoShift.class.includes('DKV')) colorClass = 'border-tjkt';
                    item.classList.add(colorClass);

                    contentCol.innerHTML = `
                        <div class="class-header">
                            <div class="badge-group">
                                <span class="period-badge shift-orig-badge" title="Aslinya: ${origDesc}">${advancedPeriod}</span>
                                <span class="period-badge shift-current-badge">${originalPeriod}</span>
                            </div>
                            <span class="class-title">${classInfoShift.class}</span>
                        </div>
                    `;
                } else {
                    item.classList.add('item-empty');
                    contentCol.innerHTML = `
                        <div class="empty-header">
                            <div class="badge-group">
                                <span class="period-badge shift-orig-badge" title="Aslinya: ${origDesc}">${advancedPeriod}</span>
                                <span class="period-badge shift-current-badge">${originalPeriod}</span>
                            </div>
                            <span class="empty-title">Kosong</span>
                        </div>
                    `;
                }
            } else {
                const classInfo = teacherClasses.find(c => c.periods.includes(originalPeriod));
                const periodBadge = `<span class="period-badge">${originalPeriod}</span>`;

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

    const sortedClasses = Object.keys(classHours).sort((a, b) => {
        const getGrade = (name) => {
            if (name.includes('XII')) return 3;
            if (name.includes('XI')) return 2;
            if (name.includes('X')) return 1;
            return 0;
        };
        const getMajorPriority = (name) => {
            const majors = ['TP', 'TKR', 'TSM', 'TJKT', 'DKV'];
            for (let i = 0; i < majors.length; i++) {
                if (name.includes(majors[i])) return i + 1;
            }
            return 99;
        };

        const gradeA = getGrade(a);
        const gradeB = getGrade(b);
        if (gradeA !== gradeB) return gradeA - gradeB;

        const majorA = getMajorPriority(a);
        const majorB = getMajorPriority(b);
        if (majorA !== majorB) return majorA - majorB;

        return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    });

    for (const className of sortedClasses) {
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
