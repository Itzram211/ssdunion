 /**
 * main.js
 * South Sudan Student Union - Jimma University
 *
 * This file handles all interactive and data-driven aspects of the website,
 * including theme switching, smooth scrolling, data fetching, and dynamic content rendering.
 */

// --- Global Configuration ---
const DATA_PATHS = {
    members: 'data/community.json',
    events: 'data/events.json',
    gallery: 'data/gallery.json'
};

const STATS_DATA = {
    // These numbers will be updated by the fetched community data
    totalMembers: 0,
    majorCount: 0, // Calculated from unique majors
    alumni: 0, // Calculated from community data
    annualEvents: 4, // Placeholder, can be updated from events.json
};

const MEMBERS_PER_PAGE = 9;
let allMembers = [];
let filteredMembers = [];
let currentPage = 1;
let currentFilter = 'All';

// 🌟 GALLERY SCROLL GLOBALS
let galleryInterval = null; 
const GALLERY_SCROLL_INTERVAL_MS = 4000;


// --- Global Utility Functions (Exposed to HTML) ---

/**
 * Toggles the dark/light theme of the website.
 */
function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateThemeIcons(isDark ? 'dark' : 'light');
}

/**
 * Updates the moon/sun icons for both desktop and mobile theme toggles.
 * @param {string} theme 'dark' or 'light'
 */
function updateThemeIcons(theme) {
    const iconDesktop = document.getElementById('theme-icon-desktop');
    const iconMobile = document.getElementById('theme-icon-mobile');
    const isDark = theme === 'dark';

    if (iconDesktop) {
        iconDesktop.classList.remove(isDark ? 'fa-sun' : 'fa-moon');
        iconDesktop.classList.add(isDark ? 'fa-moon' : 'fa-sun');
    }
    if (iconMobile) {
        iconMobile.classList.remove(isDark ? 'fa-sun' : 'fa-moon');
        iconMobile.classList.add(isDark ? 'fa-moon' : 'fa-sun');
    }
}

/**
 * Applies the stored theme on page load.
 */
function initializeTheme() {
    const theme = localStorage.getItem('theme');
    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
    }
    updateThemeIcons(theme);
}

/**
 * Copies text to the clipboard and gives visual feedback.
 * @param {string} elementId The ID of the element whose content to copy.
 * @param {HTMLElement} button The button element that was clicked.
 */
function copyToClipboard(elementId, button) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const textToCopy = el.textContent.replace(/\s/g, '');
    // Using execCommand for better compatibility inside iframes
    const textarea = document.createElement('textarea');
    textarea.value = textToCopy;
    document.body.appendChild(textarea);
    textarea.select();
    try {
        document.execCommand('copy');
        const originalText = button ? button.textContent : '';
        if (button) {
            button.textContent = 'Copied!';
            setTimeout(() => {
                button.textContent = originalText;
            }, 1500);
        }
    } catch (err) {
        console.error('Could not copy text: ', err);
    }
    document.body.removeChild(textarea);
}

/**
 * Toggles a generic dropdown menu (used for desktop 'Community' nav).
 * Closes other active dropdowns and prevents event propagation.
 * @param {string} menuId The ID of the menu to toggle.
 * @param {Event} event The click event.
 */
function toggleDropdown(menuId, event) {
    if (event && event.stopPropagation) event.stopPropagation();
    const menu = document.getElementById(menuId);
    const icon = document.getElementById('dropdown-icon');

    if (!menu) return;

    const isActive = menu.classList.contains('dropdown-active');

    // Close all other dropdowns
    document.querySelectorAll('.dropdown-transition').forEach(el => {
        el.classList.remove('dropdown-active');
        el.classList.add('dropdown-hidden');
    });
    const allIcons = document.querySelectorAll('#community-dropdown #dropdown-icon');
    allIcons.forEach(i => i.classList.remove('rotate-180'));

    if (!isActive) {
        menu.classList.remove('dropdown-hidden');
        menu.classList.add('dropdown-active');
        if (icon) icon.classList.add('rotate-180');
    } else {
        menu.classList.remove('dropdown-active');
        menu.classList.add('dropdown-hidden');
        if (icon) icon.classList.remove('rotate-180');
    }
}

/**
 * Closes the active desktop dropdown.
 */
function closeActiveDropdown() {
    const menu = document.getElementById('community-menu');
    const icon = document.getElementById('dropdown-icon');
    if (menu) {
        menu.classList.remove('dropdown-active');
        menu.classList.add('dropdown-hidden');
    }
    if (icon) icon.classList.remove('rotate-180');
}

/**
 * Toggles the mobile navigation menu.
 */
function toggleMobileMenu() {
    const menu = document.getElementById('mobile-menu');
    const openIcon = document.getElementById('menu-icon-open');
    const closeIcon = document.getElementById('menu-icon-close');
    if (!menu) return;
    const isHidden = menu.classList.toggle('hidden');

    if (isHidden) {
        if (openIcon) openIcon.classList.remove('hidden');
        if (closeIcon) closeIcon.classList.add('hidden');
        // Also close mobile community dropdown if open
        const communityMenu = document.getElementById('mobile-community-menu');
        if (communityMenu && !communityMenu.classList.contains('hidden')) {
            toggleMobileCommunityDropdown(false);
        }
    } else {
        if (openIcon) openIcon.classList.add('hidden');
        if (closeIcon) closeIcon.classList.remove('hidden');
    }
}

/**
 * Closes the mobile navigation menu.
 */
function closeMobileMenu() {
    const menu = document.getElementById('mobile-menu');
    const openIcon = document.getElementById('menu-icon-open');
    const closeIcon = document.getElementById('menu-icon-close');
    if (!menu) return;
    menu.classList.add('hidden');
    if (openIcon) openIcon.classList.remove('hidden');
    if (closeIcon) closeIcon.classList.add('hidden');
    // Also close mobile community dropdown if open
    const communityMenu = document.getElementById('mobile-community-menu');
    if (communityMenu && !communityMenu.classList.contains('hidden')) {
        toggleMobileCommunityDropdown(false);
    }
}

/**
 * Toggles the mobile community dropdown menu.
 * @param {boolean} [shouldToggle=true] Force open/close if needed, defaults to toggle.
 */
function toggleMobileCommunityDropdown(shouldToggle = true) {
    const menu = document.getElementById('mobile-community-menu');
    const icon = document.getElementById('mobile-dropdown-icon');
    if (!menu) return;
    
    if (shouldToggle) {
        menu.classList.toggle('hidden');
        if (icon) icon.classList.toggle('rotate-180');
    } else if (menu && !menu.classList.contains('hidden')) {
        // Force close
        menu.classList.add('hidden');
        if (icon) icon.classList.remove('rotate-180');
    }
}

/**
 * Opens the bank details modal.
 */
function openBankDetailsModal() {
    const modal = document.getElementById('bank-details-modal');
    if (modal) modal.classList.remove('hidden');
}

/**
 * Closes the bank details modal.
 */
function closeBankDetailsModal() {
    const modal = document.getElementById('bank-details-modal');
    if (modal) modal.classList.add('hidden');
}

/**
 * Opens a modal with detailed member information.
 * @param {number|string} memberId The ID of the member to show.
 */
function openMemberModal(memberId) {
    const member = allMembers.find(m => m.id === memberId || String(m.id) === String(memberId));
    if (!member) return;

    const modalContainer = document.getElementById('member-modal-container');
    if (!modalContainer) return;
    
    const modalHtml = `
        <div id="member-detail-modal" class="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-[300]">
            <div class="bg-card p-8 rounded-2xl w-full max-w-md card transform transition-all duration-300 relative">
                <button onclick="closeMemberModal()" class="absolute top-4 right-4 text-gray-500 hover:text-primary-blue transition"><i class="fas fa-times text-2xl"></i></button>
                <div class="text-center">
                    <img class="w-32 h-32 rounded-full object-cover mx-auto mb-4 ring-4 ring-gold/50" src="${member.profilePic || 'images/avatar-placeholder.jpg'}" alt="${member.name}" onerror="this.onerror=null;this.src='images/avatar-placeholder.jpg';">
                    <h3 class="text-3xl font-extrabold text-primary-blue mb-1">${member.name}</h3>
                    <p class="text-lg font-semibold text-text-color mb-3">${member.role} - ${member.category}</p>
                    <div class="space-y-2 text-left">
                        <p class="text-text-muted"><i class="fas fa-book-open w-5 text-gold mr-2"></i><strong>Major:</strong> ${member.major || 'N/A'}</p>
                        <p class="text-text-muted"><i class="fas fa-calendar-alt w-5 text-gold mr-2"></i><strong>Entry Year:</strong> ${member.entryYear || 'N/A'}</p>
                        ${member.graduationYear ? `<p class="text-text-muted"><i class="fas fa-award w-5 text-gold mr-2"></i><strong>Graduation:</strong> ${member.graduationYear}</p>` : ''}
                        <p class="text-text-muted"><i class="fas fa-map-marked-alt w-5 text-gold mr-2"></i><strong>State:</strong> ${member.state || 'South Sudan'}</p>
                        ${member.whatsapp ? `<a href="https://wa.me/${member.whatsapp.replace(/\D/g, '')}" target="_blank" class="text-text-muted hover:text-green-500 flex items-center mt-3"><i class="fab fa-whatsapp w-5 text-green-500 mr-2"></i><strong>WhatsApp:</strong> ${member.whatsapp}</a>` : ''}
                    </div>
                </div>
            </div>
        </div>
    `;

    modalContainer.innerHTML = modalHtml;
    modalContainer.classList.remove('hidden');
}

/**
 * Closes the member detail modal.
 */
function closeMemberModal() {
    const container = document.getElementById('member-modal-container');
    if (container) {
        container.classList.add('hidden');
        container.innerHTML = ''; // Clear content
    }
}

/**
 * Opens a modal to display a full-size image.
 * @param {string} imageUrl The URL of the image.
 * @param {string} caption The image caption.
 */
function openImageModal(imageUrl, caption) {
    // We add a new container dynamically if it doesn't exist in index.html
    let modalContainer = document.getElementById('image-modal-container');
    if (!modalContainer) {
        modalContainer = document.createElement('div');
        modalContainer.id = 'image-modal-container';
        document.body.appendChild(modalContainer);
    }

    const modalHtml = `
        <div id="image-detail-modal" class="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 z-[400]" onclick="closeImageModal()">
            <div class="max-w-4xl max-h-[90vh] w-full relative" onclick="event.stopPropagation()">
                <button onclick="closeImageModal()" class="absolute top-4 right-4 text-white hover:text-gold transition bg-black/50 p-2 rounded-full z-10"><i class="fas fa-times text-2xl"></i></button>
                <img src="${imageUrl}" alt="${caption}" 
                    onerror="this.onerror=null;this.src='images/placeholder-gallery.jpg';"
                    class="w-full h-auto max-h-[85vh] object-contain rounded-xl shadow-2xl">
                <div class="bg-card p-3 rounded-b-xl text-center">
                    <p class="text-text-color text-sm">${caption || ''}</p>
                </div>
            </div>
        </div>
    `;

    modalContainer.innerHTML = modalHtml;
    modalContainer.classList.remove('hidden');
}

/**
 * Closes the full-size image modal.
 */
function closeImageModal() {
    const modalContainer = document.getElementById('image-modal-container');
    if (modalContainer) {
        modalContainer.classList.add('hidden');
        modalContainer.innerHTML = ''; // Clear content
    }
}

// --- Global Event Listeners (Must be outside functions for global access) ---
document.addEventListener('click', (event) => {
    const communityDropdown = document.getElementById('community-dropdown');
    const communityMenu = document.getElementById('community-menu');
    
    // Desktop dropdown
    if (communityDropdown && communityMenu && !communityDropdown.contains(event.target) && communityMenu.classList.contains('dropdown-active')) {
        closeActiveDropdown();
    }

    // Bank Details Modal
    const modal = document.getElementById('bank-details-modal');
    if (modal && !modal.classList.contains('hidden') && event.target === modal) {
        closeBankDetailsModal();
    }
    
    // Member Modal
    const memberModalContainer = document.getElementById('member-modal-container');
    if (memberModalContainer && !memberModalContainer.classList.contains('hidden') && event.target === memberModalContainer.firstElementChild) {
        closeMemberModal();
    }
    
    // Image Modal (Updated to target the container itself for close-on-backdrop-click)
    const imageModalContainer = document.getElementById('image-modal-container');
    // Check if the click target is the container (the backdrop)
    if (imageModalContainer && !imageModalContainer.classList.contains('hidden') && event.target.id === 'image-modal-container') {
        closeImageModal();
    }
});


// --- Smooth Scrolling Implementation ---

/**
 * Implements smooth scrolling for all anchor links pointing to page sections.
 * This is a fallback/setup and uses the 'scroll-smooth' CSS property.
 */
function setupSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            // Check if scroll-smooth is supported; if not, use JS fallback
            if (getComputedStyle(document.documentElement).scrollBehavior !== 'smooth') {
                e.preventDefault();
                const targetId = this.getAttribute('href').substring(1);
                const targetElement = document.getElementById(targetId);
                
                if (targetElement) {
                    // Get the position of the target element relative to the viewport
                    const elementPosition = targetElement.getBoundingClientRect().top;
                    // Adjust for the fixed navigation bar height (80px)
                    const offsetPosition = elementPosition + window.pageYOffset - 80;

                    window.scrollTo({
                        top: offsetPosition,
                        behavior: "smooth"
                    });
                }
            }
        });
    });
}


// --- Data Fetching and Processing ---

/**
 * Fetches JSON data from a given path.
 * @param {string} path The path to the JSON file.
 * @returns {Promise<any>} The parsed JSON data.
 */
async function fetchData(path) {
    try {
        const response = await fetch(path);
        if (!response.ok) {
            // Return null or throw error if resource is not found (expected for mock files in some environments)
            console.warn(`Resource not found or failed to fetch: ${path}. Status: ${response.status}`);
            return null; 
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching data:', error);
        return null;
    }
}

/**
 * Determines the student category based on their entry year and program duration.
 * @param {object} member The member object.
 * @returns {string} The calculated category.
 */
function getStudentCategory(member) {
    if (!member) return 'Undergraduate';
    if (member.graduationYear) {
        return 'Alumni';
    }
    if (member.role === 'Faculty' || member.role === 'Staff') {
        return 'Faculty';
    }
    if (member.programType && (member.programType.includes('MSc') || member.programType.includes('PhD') || member.programType.includes('Graduate'))) {
        return 'Graduate Student';
    }

    const CURRENT_YEAR = new Date().getFullYear();
    const currentAcademicYear = CURRENT_YEAR; // Simplification for a fixed-date-check
    const entryYear = parseInt(member.entryYear, 10);
    const programDuration = parseInt(member.programDuration, 10);
    
    if (isNaN(entryYear) || isNaN(programDuration)) {
        return 'Undergraduate'; // Default for incomplete data
    }
    
    // Check if the current academic year is the final year of the program
    const yearsInProgram = currentAcademicYear - entryYear;
    
    // A simplified check: if the member is in the program duration-1 year
    if (yearsInProgram >= (programDuration - 1) && yearsInProgram < programDuration) {
        return 'Final Year';
    }
    
    return 'Undergraduate';
}

/**
 * Fetches and processes all data (community, leadership, events, gallery).
 * UPDATED to use Promise.all for concurrent fetching.
 */
async function fetchAndRenderAllData() {
    // Start all fetch operations concurrently
    const [communityData, eventsData, galleryData] = await Promise.all([
        fetchData(DATA_PATHS.members),
        fetchData(DATA_PATHS.events),
        fetchData(DATA_PATHS.gallery)
    ]);

    // Process and render community/leadership
    const communityListEl = document.getElementById('community-list');
    const leadershipListEl = document.getElementById('leadership-list');

    if (communityData && Array.isArray(communityData.members)) {
        processCommunityData(communityData.members);
        renderLeadership(communityData.members);
    } else {
        // Defensive: only manipulate DOM if elements exist
        if (communityListEl) communityListEl.innerHTML = '<p class="col-span-full text-center text-red-500">Failed to load community data.</p>';
        if (leadershipListEl) leadershipListEl.innerHTML = '<p class="col-span-full text-center text-red-500">Failed to load leadership data.</p>';
        // Ensure internal state is empty to avoid previous stale data
        allMembers = [];
        filteredMembers = [];
    }

    // Process and render events
    if (eventsData && Array.isArray(eventsData.events)) {
        renderEvents(eventsData.events);
        // Update annualEvents stat
        STATS_DATA.annualEvents = eventsData.events.length;
    } else {
        const placeholder = document.getElementById('event-list-container');
        if (placeholder) placeholder.innerHTML = '<p class="col-span-full text-center text-red-500">Failed to load event schedule.</p>';
        // keep STATS_DATA.annualEvents as-is or set to 0
        STATS_DATA.annualEvents = eventsData && Array.isArray(eventsData.events) ? eventsData.events.length : 0;
    }

    // Process and render gallery
    const galleryItems = (galleryData && Array.isArray(galleryData.galleryItems)) ? galleryData.galleryItems : [];
    renderGallery(galleryItems);
    // Call the scroll setup immediately after rendering the gallery.
    setupGalleryScroll(galleryItems.length > 0); 
    
    renderStats();
}

/**
 * Processes and renders community data.
 * @param {Array<object>} members The raw member list.
 */
function processCommunityData(members) {
    if (!Array.isArray(members)) {
        allMembers = [];
        filteredMembers = [];
        return;
    }

    // 1. Enrich member data with calculated category and filter for current students
    const enrichedMembers = members.map(member => ({
        ...member,
        // Ensure ID is present for openMemberModal
        id: member.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`), 
        category: getStudentCategory(member)
    }));
    
    allMembers = enrichedMembers;

    // 2. Calculate statistics
    const currentStudents = allMembers.filter(m => m.category !== 'Alumni' && m.category !== 'Faculty');
    const uniqueMajors = new Set(currentStudents.map(m => m.major || '').filter(Boolean));
    
    STATS_DATA.totalMembers = currentStudents.length;
    STATS_DATA.majorCount = uniqueMajors.size;
    STATS_DATA.alumni = allMembers.filter(m => m.category === 'Alumni').length;

    // 3. Set initial community view
    filterCommunity();
}


/**
 * Renders the statistics section with animated counters.
 */
function renderStats() {
    const statsElements = document.querySelectorAll('[data-stat]');
    
    statsElements.forEach(el => {
        const key = el.getAttribute('data-stat');
        const targetValue = STATS_DATA[key];
        
        if (targetValue !== undefined) {
            animateValue(el, 0, targetValue, 1500);
        }
    });
}

/**
 * Animates a number value in an element.
 * @param {HTMLElement} obj The element to update.
 * @param {number} start The starting value.
 * @param {number} end The final value.
 * @param {number} duration The animation duration in ms.
 */
function animateValue(obj, start, end, duration) {
    let startTime = null;

    const step = (timestamp) => {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        const value = Math.floor(progress * (end - start) + start);
        obj.textContent = value.toLocaleString();

        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            obj.textContent = end.toLocaleString();
        }
    };

    // Only run animation if the element is visible (optional optimization)
    window.requestAnimationFrame(step);
}

// --- Community Rendering and Filtering ---

/**
 * Handles the community filter selection from the nav dropdowns.
 * @param {string} filterValue The filter category to apply.
 */
function handleCommunityFilter(filterValue) {
    const selectElement = document.getElementById('community-filter');
    if (selectElement) {
        selectElement.value = filterValue;
    }
    currentFilter = filterValue;
    currentPage = 1;
    filterCommunity();
    closeActiveDropdown(); // For desktop nav
    // Smooth scroll to the community section after filtering
    const communityEl = document.getElementById('community');
    if (communityEl) communityEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Filters and searches the community list based on current settings.
 */
function filterCommunity() {
    const searchInput = document.getElementById('community-search');
    const filterSelect = document.getElementById('community-filter');

    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const filterTerm = filterSelect ? filterSelect.value : 'All';
    currentFilter = filterTerm;

    let tempMembers = allMembers.filter(member => {
        // Apply category filter
        const categoryMatch = filterTerm === 'All' || member.category === filterTerm;
        
        // Apply search term filter
        const searchMatch = !searchTerm || 
                             (member.name && member.name.toLowerCase().includes(searchTerm)) ||
                             (member.major && member.major.toLowerCase().includes(searchTerm)) ||
                             (member.state && member.state.toLowerCase().includes(searchTerm));

        return categoryMatch && searchMatch;
    });

    // Handle 'All Current Students' explicitly to exclude Alumni and Faculty
    // We treat 'All' as 'All Current Students' if no other filter is selected.
    if (filterTerm === 'All') {
        tempMembers = tempMembers.filter(m => m.category !== 'Alumni' && m.category !== 'Faculty');
    }
    // If specific non-student filters like Alumni or Faculty are selected, we keep them.
    // If a specific student category like 'Final Year' is selected, we keep only those.

    // Sort alphabetically by name
    filteredMembers = tempMembers.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    currentPage = 1;
    renderCommunityList();
}

/**
 * Renders the current page of the filtered community list.
 */
function renderCommunityList() {
    const listContainer = document.getElementById('community-list');
    const toggleContainer = document.getElementById('community-toggle-container');
    const toggleButton = document.getElementById('community-toggle-btn');
    
    if (!listContainer) return;

    // Renders members from the start up to the limit of the current page count
    const startIndex = 0;
    const endIndex = currentPage * MEMBERS_PER_PAGE;
    const membersToShow = filteredMembers.slice(startIndex, endIndex);

    listContainer.innerHTML = '';

    if (filteredMembers.length === 0) {
        let message = `No members found matching your criteria.`;
        if (currentFilter !== 'All') {
            message = `No members found matching your criteria in the ${currentFilter} group. Try a different filter or search term.`;
        }
        listContainer.innerHTML = `<p class="col-span-full text-center text-lg text-gray-500 py-8">${message}</p>`;
        if (toggleContainer) toggleContainer.classList.add('hidden');
        return;
    }

    membersToShow.forEach(member => {
        const html = createMemberCard(member);
        listContainer.innerHTML += html;
    });

    // Update 'View More/Less' button state
    if (toggleContainer && toggleButton) {
        if (filteredMembers.length > MEMBERS_PER_PAGE) {
            toggleContainer.classList.remove('hidden');
            if (endIndex >= filteredMembers.length) {
                toggleButton.textContent = 'View Less';
            } else {
                toggleButton.textContent = 'View More';
            }
        } else {
            toggleContainer.classList.add('hidden');
        }
    }
}

/**
 * Toggles between showing the initial set of members and all members (in increments).
 * This implements the professional 'load next batch' functionality.
 */
function toggleCommunityView() {
    const totalPages = Math.ceil(filteredMembers.length / MEMBERS_PER_PAGE);

    if (currentPage < totalPages) {
        // Current state is 'View More', so load the next page
        currentPage++;
    } else {
        // Current state is 'View Less' (i.e., we are on or past the last page)
        // Reset to the initial view (page 1)
        currentPage = 1;
        // Smooth scroll back to the top of the community section for 'View Less'
        const communityEl = document.getElementById('community');
        if (communityEl) communityEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    renderCommunityList();
}


/**
 * Creates the HTML for a single member card.
 * @param {object} member The member data.
 * @returns {string} The HTML string for the card.
 */
function createMemberCard(member) {
    const defaultAvatar = 'images/avatar-placeholder.jpg';
    const profileImage = member.profilePic || defaultAvatar;

    let statusTag = '';
    let categoryIcon = '';
    
    switch(member.category) {
        case 'Final Year':
            statusTag = `<span class="inline-block bg-gold-light text-primary-blue text-xs font-semibold px-2 py-1 rounded-full absolute top-3 right-3 shadow-md">Final Year</span>`;
            categoryIcon = `<i class="fas fa-graduation-cap text-gold mr-2"></i>`;
            break;
        case 'Alumni':
            statusTag = `<span class="inline-block bg-primary-blue text-white text-xs font-semibold px-2 py-1 rounded-full absolute top-3 right-3 shadow-md">Alumnus</span>`;
            categoryIcon = `<i class="fas fa-history text-gold mr-2"></i>`;
            break;
        case 'Faculty':
            statusTag = `<span class="inline-block bg-green-500 text-white text-xs font-semibold px-2 py-1 rounded-full absolute top-3 right-3 shadow-md">Faculty</span>`;
            categoryIcon = `<i class="fas fa-chalkboard-teacher text-gold mr-2"></i>`;
            break;
        default: // Undergraduate/Graduate
            categoryIcon = `<i class="fas fa-user-graduate text-gold mr-2"></i>`;
            break;
    }
    
    let infoLine = `${categoryIcon}${member.major || ''}`;
    if (member.category === 'Graduate Student' && member.programType) {
        infoLine = `${categoryIcon}${member.programType} - ${member.major || ''}`;
    } else if (member.category === 'Alumni' && member.graduationYear) {
            infoLine = `<i class="fas fa-calendar-check text-gold mr-2"></i>Graduated ${member.graduationYear}`;
    }

    // Use a safe ID rendering (string) in case id is not a plain number
    const safeId = typeof member.id === 'string' ? `'${member.id.replace(/'/g, "\\'")}'` : member.id;

    return `
        <div class="card p-6 rounded-2xl shadow-xl hover:shadow-2xl transition duration-300 transform hover:scale-[1.02] relative border-b-4 border-gold" onclick="openMemberModal(${safeId})">
            ${statusTag}
            <div class="flex flex-col items-center text-center">
                <img class="w-24 h-24 rounded-full object-cover mx-auto mb-4 ring-4 ring-gold/50" src="${profileImage}" alt="${member.name || ''}" onerror="this.onerror=null;this.src='images/avatar-placeholder.jpg';">
                <h3 class="text-xl font-bold text-primary-blue mb-1">${member.name || 'Unnamed'}</h3>
                <p class="text-sm font-medium text-text-color mb-2">${member.role || ''}</p>
                <div class="text-sm text-text-muted mb-3 flex items-center justify-center">
                    ${infoLine}
                </div>
                <p class="text-xs text-text-muted"><i class="fas fa-map-marker-alt mr-1 text-gold"></i>${member.state || 'South Sudan'}</p>
                <button class="mt-4 text-primary-blue hover:text-gold text-sm font-semibold transition duration-150 flex items-center">
                    View Details <i class="fas fa-arrow-right ml-2 text-xs"></i>
                </button>
            </div>
        </div>
    `;
}


// --- Leadership Rendering ---

/**
 * Renders the leadership team.
 * @param {Array<object>} members The raw member list.
 */
function renderLeadership(members) {
    const leadershipList = document.getElementById('leadership-list');
    if (!leadershipList) return;
    const leaders = members.filter(member => member.isLeader).sort((a, b) => (a.leaderRank || 99) - (b.leaderRank || 99));

    leadershipList.innerHTML = ''; // Clear loading text

    if (leaders.length === 0) {
        leadershipList.innerHTML = '<p class="col-span-full text-center text-lg text-gray-500 py-8">Leadership team details are being updated.</p>';
        return;
    }

    leaders.forEach(leader => {
        const html = `
            <div class="card p-6 rounded-2xl shadow-xl text-center border-t-4 border-primary-blue transform hover:scale-105 transition duration-300">
                <img class="w-28 h-28 rounded-full object-cover mx-auto mb-4 ring-4 ring-gold" src="${leader.profilePic || 'images/avatar-placeholder.jpg'}" alt="${leader.name || ''}" onerror="this.onerror=null;this.src='images/avatar-placeholder.jpg';">
                <h3 class="text-xl font-bold text-primary-blue mb-1">${leader.name || 'Unnamed'}</h3>
                <p class="text-sm font-medium text-gold mb-3">${leader.leadershipRole || 'Union Leader'}</p>
                <p class="text-xs text-text-muted">${leader.major || ''}</p>
            </div>
        `;
        leadershipList.innerHTML += html;
    });
}


// --- Events Rendering ---

/**
 * Renders the event list and sets up the countdown timer.
 * @param {Array<object>} events The list of events.
 */
function renderEvents(events) {
    const listContainer = document.getElementById('event-list-container');
    if (!listContainer) return;
    listContainer.innerHTML = '';
    
    if (!Array.isArray(events) || events.length === 0) {
        listContainer.innerHTML = '<p class="col-span-full text-center text-lg text-gray-500 py-8">There are no upcoming events currently scheduled. Check back soon!</p>';
        const countdownBanner = document.getElementById('next-event-countdown-banner');
        if (countdownBanner) countdownBanner.classList.add('hidden');
        return;
    }

    // Sort events to put upcoming ones first
    const sortedEvents = events.sort((a, b) => new Date(a.date) - new Date(b.date));
    const now = new Date();
    
    // Find the next upcoming event
    const nextEvent = sortedEvents.find(e => new Date(e.date) > now);

    if (nextEvent) {
        setupCountdown(nextEvent);
    } else {
        const countdownBanner = document.getElementById('next-event-countdown-banner');
        if (countdownBanner) countdownBanner.classList.add('hidden');
    }

    // Render the event list
    events.forEach(event => {
        const eventDate = new Date(event.date);
        const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: true };

        const formattedDate = isNaN(eventDate.getTime()) ? 'Date TBD' : eventDate.toLocaleDateString('en-US', dateOptions);
        const formattedTime = isNaN(eventDate.getTime()) ? '' : eventDate.toLocaleTimeString('en-US', timeOptions);

        const isPast = !isNaN(eventDate.getTime()) && eventDate < now;
        const statusClass = isPast ? 'bg-gray-400' : 'bg-green-500';
        const statusText = isPast ? 'Completed' : 'Upcoming';
        
        const html = `
            <div class="event-card card p-6 rounded-2xl shadow-xl flex flex-col justify-between border-l-8 ${isPast ? 'border-gray-500' : 'border-gold'} transition duration-300 hover:shadow-2xl">
                <div>
                    <span class="inline-block ${statusClass} text-white text-xs font-semibold px-3 py-1 rounded-full mb-3">${statusText}</span>
                    <h3 class="text-2xl font-bold text-primary-blue mb-2">${event.title}</h3>
                    <p class="text-text-color mb-4">${event.description || ''}</p>
                </div>
                <div class="text-sm space-y-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <p class="text-text-muted"><i class="fas fa-calendar-day w-5 text-gold mr-2"></i>${formattedDate}${formattedTime ? ` at ${formattedTime}` : ''}</p>
                    <p class="text-text-muted"><i class="fas fa-map-marker-alt w-5 text-gold mr-2"></i>${event.location || ''}</p>
                    ${event.link ? `<a href="${event.link}" target="_blank" class="text-primary-blue hover:text-gold font-medium flex items-center mt-2"><i class="fas fa-info-circle w-5 mr-2"></i>More Info</a>` : ''}
                </div>
            </div>
        `;
        listContainer.innerHTML += html;
    });
}

/**
 * Sets up and starts the countdown timer for the next event.
 * @param {object} event The next upcoming event object.
 */
function setupCountdown(event) {
    const countdownBanner = document.getElementById('next-event-countdown-banner');
    const eventTitleEl = document.getElementById('countdown-event-title');
    if (!event || !event.date) {
        if (countdownBanner) countdownBanner.classList.add('hidden');
        return;
    }
    const targetDate = new Date(event.date).getTime();
    
    if (countdownBanner) countdownBanner.classList.remove('hidden');
    if (eventTitleEl) eventTitleEl.textContent = event.title || '';

    const updateCountdown = () => {
        const now = new Date().getTime();
        const distance = targetDate - now;

        const daysEl = document.getElementById('days');
        const hoursEl = document.getElementById('hours');
        const minutesEl = document.getElementById('minutes');
        const secondsEl = document.getElementById('seconds');

        if (isNaN(targetDate) || distance < 0) {
            if (window.countdownInterval) clearInterval(window.countdownInterval);
            if (countdownBanner) countdownBanner.classList.add('hidden');
            // Re-render to clear the timer and potentially find the next event
            fetchAndRenderAllData(); 
            return;
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        const pad = (num) => num.toString().padStart(2, '0');

        if (daysEl) daysEl.textContent = pad(days);
        if (hoursEl) hoursEl.textContent = pad(hours);
        if (minutesEl) minutesEl.textContent = pad(minutes);
        if (secondsEl) secondsEl.textContent = pad(seconds);
    };

    // Clear any existing interval to prevent multiple timers running
    if (window.countdownInterval) clearInterval(window.countdownInterval);

    // Initial call and set interval
    updateCountdown();
    window.countdownInterval = setInterval(updateCountdown, 1000);
}


// --- GALLERY CAROUSEL LOGIC ---

/**
 * Renders the gallery images into the scroll container.
 * @param {Array<object>} items The list of gallery items.
 */
function renderGallery(items) {
    const listContainer = document.getElementById('gallery-list');
    if (!listContainer) return;

    listContainer.innerHTML = ''; // Clear loading text

    if (!Array.isArray(items) || items.length === 0) {
        listContainer.innerHTML = '<p class="col-span-full text-center text-lg text-gray-500 py-8">No photos available at this time.</p>';
        return;
    }

    items.forEach(item => {
        const safeUrl = (item.imageUrl || '').replace(/'/g, "\\'");
        const safeCaption = (item.caption || '').replace(/'/g, "\\'");
        const html = `
            <div class="gallery-item flex-shrink-0 w-full md:w-1/2 lg:w-1/3 p-2 snap-center cursor-pointer" onclick="openImageModal('${safeUrl}', '${safeCaption}')">
                <div class="card overflow-hidden h-full">
                    <img 
                        src="${item.imageUrl}" 
                        alt="${item.caption}" 
                        class="w-full h-80 object-cover transition duration-300 transform hover:scale-105"
                        onerror="this.onerror=null;this.src='images/placeholder-gallery.jpg';"
                    >
                    <div class="p-3 text-center">
                        <p class="text-sm text-text-muted font-medium truncate">${item.caption}</p>
                    </div>
                </div>
            </div>
        `;
        listContainer.innerHTML += html;
    });
}

/**
 * Sets up the automatic horizontal scrolling for the gallery.
 * @param {boolean} hasItems True if the gallery has items to scroll.
 */
function setupGalleryScroll(hasItems) {
    const listContainer = document.getElementById('gallery-list');
    if (!listContainer || !hasItems) {
        if (galleryInterval) clearInterval(galleryInterval);
        return;
    }

    // Clear existing interval
    if (galleryInterval) clearInterval(galleryInterval);

    // Remove previous listeners to avoid duplicates
    listContainer.replaceWith(listContainer.cloneNode(true));
    const newContainer = document.getElementById('gallery-list');

    // Start the new interval
    galleryInterval = setInterval(() => {
        scrollGallery(newContainer);
    }, GALLERY_SCROLL_INTERVAL_MS);

    // Optional: Pause scrolling on hover/focus
    newContainer.addEventListener('mouseenter', () => clearInterval(galleryInterval));
    newContainer.addEventListener('mouseleave', () => {
        if (hasItems) {
            galleryInterval = setInterval(() => scrollGallery(newContainer), GALLERY_SCROLL_INTERVAL_MS);
        }
    });
}

/**
 * Advances the gallery scroll position by one item width.
 * @param {HTMLElement} container The #gallery-list element.
 */
function scrollGallery(container) {
    if (!container || !container.firstElementChild) return;

    // Get the width of one single gallery item (which is w-full of the container's visible area)
    // The clientWidth of the container itself represents the step size for the snap
    const scrollStep = container.clientWidth;
    const currentScroll = container.scrollLeft;
    const maxScroll = container.scrollWidth - scrollStep;

    let targetScroll;
    
    // Check if we are at the end (or near the end)
    if (currentScroll >= maxScroll - 1) {
        // Reset to start for continuous loop (smooth behavior from CSS)
        targetScroll = 0;
    } else {
        // Scroll to the next snap point
        targetScroll = currentScroll + scrollStep;
    }

    container.scrollTo({
        left: targetScroll,
        behavior: 'smooth'
    });
}


// --- Initialization ---

// Call the main setup function when the DOM is fully loaded.
document.addEventListener('DOMContentLoaded', () => {
    // Ensure theme is initialized and UI behaviors are wired
    initializeTheme();
    setupSmoothScrolling();

    // Fetch and render all remote/local JSON data (community, events, gallery)
    // This ensures the website loads the data from data/community.json, data/events.json, data/gallery.json
    fetchAndRenderAllData();
});

// fetchAndRenderAllData() is also safe to be called from body onload if index.html uses that.
