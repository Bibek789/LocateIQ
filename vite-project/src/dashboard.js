document.addEventListener('DOMContentLoaded', () => {
    // --- Navigation ---
    const navLinks = document.querySelectorAll('.nav a');
    const contentSections = {
        'Dashboard': document.getElementById('dashboard-content'),
        'Store Management': document.getElementById('store-management-content'),
        'Analytics': document.getElementById('analytics-content')
    };
    const mainHeaderTitle = document.getElementById('main-header-title');
    const mainHeaderSubtitle = document.getElementById('main-header-subtitle');

    const headerContent = {
        'Dashboard': {
            title: 'Warehouse Optimizer',
            subtitle: 'Find the optimal warehouse location for your supply chain'
        },
        'Store Management': {
            title: 'Store Management',
            subtitle: 'Add, edit, or remove your store locations'
        },
        'Analytics': {
            title: 'Analytics',
            subtitle: 'Visualize your supply chain performance'
        }
    };

    function switchView(viewName) {
        // Update header
        if (mainHeaderTitle && headerContent[viewName]) {
            mainHeaderTitle.textContent = headerContent[viewName].title;
            mainHeaderSubtitle.textContent = headerContent[viewName].subtitle;
        }

        // Hide all sections
        for (const section of Object.values(contentSections)) {
            if (section) section.style.display = 'none';
        }

        // Show the target section
        if (contentSections[viewName]) {
            // Use 'grid' for sections with a grid layout, 'block' for others
            const displayStyle = viewName === 'Dashboard' ? 'grid' : 'block';
            contentSections[viewName].style.display = displayStyle;
        }

        // Update active link
        navLinks.forEach(link => {
            if (link.textContent === viewName) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const viewName = e.target.textContent;
            switchView(viewName);
        });
    });

    
});

