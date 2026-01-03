document.addEventListener('DOMContentLoaded', () => {

    const menuItems = document.querySelectorAll('.nav-links li');
    const iframe = document.getElementById('project-frame');
    const dashboardView = document.getElementById('dashboard-view');
    const pageTitle = document.getElementById('current-page-title');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.overlay');



    // Toggle Sidebar (Mobile)
    window.toggleSidebar = function () {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('active');
    }

    // Navigation Logic
    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            // Ignore sectional titles
            if (item.classList.contains('section-title')) return;

            // Remove active class from all
            menuItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            const target = item.getAttribute('data-target');
            const text = item.querySelector('.text').textContent;

            if (target === 'home') {
                showDashboard();
            } else {
                loadProject(target, text);
            }

            // Close Sidebar on Click (Mobile experience)
            if (window.innerWidth <= 768) {
                toggleSidebar();
            }
        });
    });

    // Function to show Dashboard
    window.showDashboard = function () {
        iframe.classList.remove('active');
        iframe.src = 'about:blank';
        dashboardView.classList.add('active');
        pageTitle.textContent = 'Dashboard';

        localStorage.setItem('last_active_url', 'home');
        localStorage.removeItem('last_active_title');
    }

    // Function to load Project
    window.loadProject = function (url, title) {
        dashboardView.classList.remove('active');

        iframe.src = url;
        iframe.classList.add('active');

        if (title) pageTitle.textContent = title;

        updateSidebarActiveState(url);

        localStorage.setItem('last_active_url', url);
        if (title) localStorage.setItem('last_active_title', title);
    }

    // Refresh Iframe
    window.refreshFrame = function () {
        if (iframe.classList.contains('active') && iframe.contentWindow) {
            iframe.contentWindow.location.reload();
        } else {
            window.location.reload();
        }
    }

    // Open New Tab
    window.openNewTab = function () {
        if (iframe.classList.contains('active') && iframe.src) {
            window.open(iframe.src, '_blank');
        }
    }

    function updateSidebarActiveState(url) {
        menuItems.forEach(nav => nav.classList.remove('active'));
        const match = Array.from(menuItems).find(li => li.getAttribute('data-target') === url);
        if (match) {
            match.classList.add('active');
        }
    }


    // Check for saved state on load (Must be last, after functions are defined)
    const savedUrl = localStorage.getItem('last_active_url');
    const savedTitle = localStorage.getItem('last_active_title');

    if (savedUrl && savedUrl !== 'home') {
        loadProject(savedUrl, savedTitle);
    } else {
        const homeItem = document.querySelector('li[data-target="home"]');
        if (homeItem) homeItem.classList.add('active');
    }
});
