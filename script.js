/**
 * DayMark Web Application (v5.0)
 * Vanilla JavaScript implementation with start/end date periods, month calendar view,
 * multi-day event bars, category filters, and detail modal.
 */

(() => {
  'use strict';

  // ==========================================
  // Constants & Category Definitions
  // ==========================================
  const STORAGE_KEY = 'daymark-v5-items';
  const CATEGORY_STORAGE_KEY = 'daymark-v5-categories';
  const SETTINGS_STORAGE_KEY = 'daymark-v5-settings';
  const DEFAULT_SETTINGS = { fontFamily: 'system', fontSize: 'medium' };
  const FONT_FAMILIES = {
    system: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Malgun Gothic", Arial, sans-serif',
    pretendard: 'Pretendard, "Malgun Gothic", "Apple SD Gothic Neo", Arial, sans-serif',
    malgun: '"Malgun Gothic", "Segoe UI", Arial, sans-serif',
    arial: 'Arial, "Malgun Gothic", sans-serif',
    georgia: 'Georgia, "Malgun Gothic", serif',
    gulim: '"Gulim", "굴림", sans-serif',
    batang: '"Batang", "바탕", serif'
  };
  const FONT_SCALES = { small: 0.94, medium: 1, large: 1.1 };
  const DEFAULT_CATEGORIES = [
    { id: 'work', name: '업무', icon: 'briefcase', color: '#4F46E5', isDefault: true },
    { id: 'company', name: '회사', icon: 'building', color: '#7C3AED', isDefault: true },
    { id: 'personal', name: '개인', icon: 'user', color: '#059669', isDefault: true },
    { id: 'other', name: '기타', icon: 'pin', color: '#64748B', isDefault: true }
  ];
  const ICON_NAMES = ['briefcase','building','user','pin','calendar','graduation-cap','plane','flask','chart','document','home','heart','star','flag','clock','target','book','folder','check','gift'];
  const CATEGORY_COLORS = ['#4F46E5','#2563EB','#0891B2','#0D9488','#059669','#EA580C','#DC2626','#DB2777','#7C3AED','#64748B'];
  let CATEGORIES = {};

  // ==========================================
  // Application State
  // ==========================================
  const now = new Date();
  const state = {
    items: [],
    categories: [],
    settings: { ...DEFAULT_SETTINGS },
    currentView: 'dashboard', // 'dashboard' | 'calendar'
    activeCategory: 'all',    // 'all' | 'work' | 'company' | 'personal' | 'other'
    activeStatus: 'all',      // 'all' | 'upcoming' | 'ongoing' | 'completed'
    searchQuery: '',
    sortBy: 'closest',        // 'closest' | 'farthest' | 'newest' | 'oldest'
    
    // Calendar Navigation State
    calendarYear: now.getFullYear(),
    calendarMonth: now.getMonth(), // 0-indexed (0 = Jan, 7 = Aug)
    selectedCalendarDate: toIsoDateString(now),

    currentEditId: null,
    currentDeleteId: null,
    currentDetailId: null,
    currentCategoryEditId: null,
    currentCategoryDeleteId: null
  };

  // ==========================================
  // DOM Elements
  // ==========================================
  const currentDateDisplay = document.getElementById('currentDateDisplay');
  const heroSection = document.getElementById('heroSection');
  const cardsContainer = document.getElementById('cardsContainer');
  const listHeaderTitle = document.getElementById('listHeaderTitle');
  const listCountBadge = document.getElementById('listCountBadge');
  const toastContainer = document.getElementById('toastContainer');

  // View Switch Elements
  const tabDashboardBtn = document.getElementById('tabDashboardBtn');
  const tabCalendarBtn = document.getElementById('tabCalendarBtn');
  const dashboardView = document.getElementById('dashboardView');
  const calendarView = document.getElementById('calendarView');

  // Calendar Elements
  const calTodayBtn = document.getElementById('calTodayBtn');
  const calPrevMonthBtn = document.getElementById('calPrevMonthBtn');
  const calNextMonthBtn = document.getElementById('calNextMonthBtn');
  const calMonthTitle = document.getElementById('calMonthTitle');
  const calCategoryIndicator = document.getElementById('calCategoryIndicator');
  const calendarGrid = document.getElementById('calendarGrid');
  const mobileCalendarAgenda = document.getElementById('mobileCalendarAgenda');

  // Sidebar & Drawer Elements
  const sidebar = document.getElementById('sidebar');
  const sidebarBackdrop = document.getElementById('sidebarBackdrop');
  const drawerToggleBtn = document.getElementById('drawerToggleBtn');
  const closeDrawerBtn = document.getElementById('closeDrawerBtn');
  const sidebarAddBtn = document.getElementById('sidebarAddBtn');
  const openAddModalBtn = document.getElementById('openAddModalBtn');
  const mobileAddBtn = document.getElementById('mobileAddBtn');

  // Sidebar Category Badges
  const countAll = document.getElementById('countAll');
  const countWork = document.getElementById('countWork');
  const countCompany = document.getElementById('countCompany');
  const countPersonal = document.getElementById('countPersonal');
  const countOther = document.getElementById('countOther');
  const sidebarNav = document.querySelector('.sidebar-nav');
  const mobileCategoryChips = document.getElementById('mobileCategoryChips');
  const categoryNavList = document.getElementById('categoryNavList');
  const addCategoryBtn = document.getElementById('addCategoryBtn');
  const manageCategoryBtn = document.getElementById('manageCategoryBtn');
  const categoryRadioGroup = document.getElementById('categoryRadioGroup');

  // Dashboard Controls Elements
  const searchInput = document.getElementById('searchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const sortSelect = document.getElementById('sortSelect');
  const statusFilterTabs = document.getElementById('statusFilterTabs');

  // Form Modal Elements
  const formModal = document.getElementById('formModal');
  const ddayForm = document.getElementById('ddayForm');
  const modalTitle = document.getElementById('modalTitle');
  const editItemId = document.getElementById('editItemId');
  const titleInput = document.getElementById('titleInput');
  const startDateInput = document.getElementById('startDateInput');
  const endDateInput = document.getElementById('endDateInput');
  const importantCheckbox = document.getElementById('importantCheckbox');
  const titleError = document.getElementById('titleError');
  const startDateError = document.getElementById('startDateError');
  const endDateError = document.getElementById('endDateError');
  const closeFormModalBtn = document.getElementById('closeFormModalBtn');
  const cancelFormBtn = document.getElementById('cancelFormBtn');
  const saveFormBtn = document.getElementById('saveFormBtn');

  // Detail Modal Elements
  const detailModal = document.getElementById('detailModal');
  const detailHeaderTags = document.getElementById('detailHeaderTags');
  const detailTitle = document.getElementById('detailTitle');
  const detailDDayBadge = document.getElementById('detailDDayBadge');
  const detailDateRange = document.getElementById('detailDateRange');
  const closeDetailModalBtn = document.getElementById('closeDetailModalBtn');
  const detailEditBtn = document.getElementById('detailEditBtn');
  const detailDeleteBtn = document.getElementById('detailDeleteBtn');
  const checklistCount = document.getElementById('checklistCount');
  const checklistSecondary = document.getElementById('checklistSecondary');
  const checklistProgress = document.getElementById('checklistProgress');
  const checklistProgressBar = document.getElementById('checklistProgressBar');
  const checklistPercentage = document.getElementById('checklistPercentage');
  const checklistCompleteMessage = document.getElementById('checklistCompleteMessage');
  const checklistList = document.getElementById('checklistList');
  const checklistEmpty = document.getElementById('checklistEmpty');
  const checklistAddToggle = document.getElementById('checklistAddToggle');
  const checklistAddForm = document.getElementById('checklistAddForm');
  const checklistInput = document.getElementById('checklistInput');
  const checklistError = document.getElementById('checklistError');

  // Delete Modal Elements
  const deleteModal = document.getElementById('deleteModal');
  const deleteTargetTitle = document.getElementById('deleteTargetTitle');
  const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
  const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
  const categoryModal = document.getElementById('categoryModal');
  const categoryForm = document.getElementById('categoryForm');
  const categoryModalTitle = document.getElementById('categoryModalTitle');
  const categoryEditId = document.getElementById('categoryEditId');
  const categoryNameInput = document.getElementById('categoryNameInput');
  const categoryNameError = document.getElementById('categoryNameError');
  const iconPicker = document.getElementById('iconPicker');
  const colorPicker = document.getElementById('colorPicker');
  const categoryDeleteArea = document.getElementById('categoryDeleteArea');
  const deleteCategoryBtn = document.getElementById('deleteCategoryBtn');
  const defaultCategoryNotice = document.getElementById('defaultCategoryNotice');
  const closeCategoryModalBtn = document.getElementById('closeCategoryModalBtn');
  const cancelCategoryBtn = document.getElementById('cancelCategoryBtn');
  const categoryMoveModal = document.getElementById('categoryMoveModal');
  const categoryMoveMessage = document.getElementById('categoryMoveMessage');
  const categoryMoveSelect = document.getElementById('categoryMoveSelect');
  const cancelCategoryMoveBtn = document.getElementById('cancelCategoryMoveBtn');
  const confirmCategoryMoveBtn = document.getElementById('confirmCategoryMoveBtn');
  const categoryPreviewBadge = document.getElementById('categoryPreviewBadge');
  const categoryPreviewBar = document.getElementById('categoryPreviewBar');
  const categoryManagementModal = document.getElementById('categoryManagementModal');
  const categoryManagementList = document.getElementById('categoryManagementList');
  const closeCategoryManagementBtn = document.getElementById('closeCategoryManagementBtn');
  const managementAddCategoryBtn = document.getElementById('managementAddCategoryBtn');

  // Typography Settings Elements
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsModal = document.getElementById('settingsModal');
  const settingsForm = document.getElementById('settingsForm');
  const closeSettingsBtn = document.getElementById('closeSettingsBtn');
  const cancelSettingsBtn = document.getElementById('cancelSettingsBtn');
  const resetSettingsBtn = document.getElementById('resetSettingsBtn');
  const fontFamilySelect = document.getElementById('fontFamilySelect');
  const settingsPreview = document.getElementById('settingsPreview');

  // ==========================================
  // Date Utilities
  // ==========================================

  /**
   * Returns a Date object set to local midnight for a given "YYYY-MM-DD" string.
   * @param {string} dateString - "YYYY-MM-DD"
   * @returns {Date}
   */
  function parseLocalDate(dateString) {
    if (!dateString || typeof dateString !== 'string') return new Date();
    const parts = dateString.split('-').map(Number);
    if (parts.length !== 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
      return new Date();
    }
    return new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
  }

  /**
   * Returns today's Date object normalized to local midnight (00:00:00.000).
   * @returns {Date}
   */
  function getTodayMidnight() {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  }

  /**
   * Formats a Date or "YYYY-MM-DD" string into "YYYY-MM-DD".
   * @param {Date|string} d 
   * @returns {string}
   */
  function toIsoDateString(d) {
    const dateObj = typeof d === 'string' ? parseLocalDate(d) : d;
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  /**
   * Formats a "YYYY-MM-DD" string or Date object into "YYYY.MM.DD (요일)".
   * @param {string|Date} dateVal 
   * @returns {string}
   */
  function formatDateWithDay(dateVal) {
    const d = typeof dateVal === 'string' ? parseLocalDate(dateVal) : dateVal;
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const dayName = days[d.getDay()];
    return `${yyyy}.${mm}.${dd} (${dayName})`;
  }

  /**
   * Formats a "YYYY-MM-DD" string into "YYYY.MM.DD".
   * @param {string} dateStr 
   * @returns {string}
   */
  function formatDateDot(dateStr) {
    if (!dateStr) return '';
    const d = parseLocalDate(dateStr);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}.${mm}.${dd}`;
  }

  /**
   * Formats start and end dates as a period:
   * - 1 day event: "2026.08.24"
   * - Multi-day event: "2026.08.24 ~ 2026.08.26"
   * @param {string} startStr 
   * @param {string} endStr 
   * @returns {string}
   */
  function formatDateRange(startStr, endStr) {
    const formattedStart = formatDateDot(startStr);
    if (!endStr || startStr === endStr) {
      return formattedStart;
    }
    const formattedEnd = formatDateDot(endStr);
    return `${formattedStart} ~ ${formattedEnd}`;
  }

  /**
   * Calculates D-Day based on startDate.
   * @param {string} startDateStr - "YYYY-MM-DD"
   * @returns {{ diffDays: number, status: 'today'|'future'|'past', dDayText: string, statusLabel: string }}
   */
  function calculateDDay(startDateStr) {
    const targetDate = parseLocalDate(startDateStr);
    const today = getTodayMidnight();

    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return {
        diffDays: 0,
        status: 'today',
        dDayText: 'D-Day',
        statusLabel: '오늘'
      };
    } else if (diffDays > 0) {
      return {
        diffDays,
        status: 'future',
        dDayText: `D-${diffDays}`,
        statusLabel: `${diffDays}일 남음`
      };
    } else {
      const pastDays = Math.abs(diffDays);
      return {
        diffDays,
        status: 'past',
        dDayText: `D+${pastDays}`,
        statusLabel: `${pastDays}일 지남`
      };
    }
  }

  /**
   * Determines the schedule period status:
   * - 'upcoming': today < startDate
   * - 'ongoing': startDate <= today <= endDate
   * - 'completed': today > endDate
   * @param {string} startDateStr 
   * @param {string} endDateStr 
   * @returns {'upcoming'|'ongoing'|'completed'}
   */
  function getScheduleStatus(startDateStr, endDateStr) {
    const todayStr = toIsoDateString(getTodayMidnight());
    const start = startDateStr;
    const end = endDateStr || startDateStr;

    if (todayStr < start) {
      return 'upcoming';
    } else if (todayStr >= start && todayStr <= end) {
      return 'ongoing';
    } else {
      return 'completed';
    }
  }

  // ==========================================
  // Storage & Data Migration
  // ==========================================

  function getIconSvg(name, size = 16) {
    const paths = {
      briefcase:'<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V4h8v3M3 12h18M10 12v2h4v-2"/>', building:'<path d="M4 21V3h12v18M16 9h4v12M8 7h4M8 11h4M8 15h4M8 19h4"/>', user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>', pin:'<path d="M12 22s7-6 7-13a7 7 0 1 0-14 0c0 7 7 13 7 13z"/><circle cx="12" cy="9" r="2"/>', calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>', 'graduation-cap':'<path d="M2 10l10-5 10 5-10 5L2 10zM6 12v5c3 3 9 3 12 0v-5M22 10v6"/>', plane:'<path d="M22 2L9 15M22 2l-7 20-4-9-9-4 20-7z"/>', flask:'<path d="M9 3h6M10 3v6l-6 10a2 2 0 0 0 2 3h12a2 2 0 0 0 2-3L14 9V3M7 16h10"/>', chart:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>', document:'<path d="M6 2h9l5 5v15H6zM14 2v6h6M9 13h8M9 17h8"/>', home:'<path d="M3 11l9-8 9 8v10h-6v-6H9v6H3z"/>', heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z"/>', star:'<path d="M12 2l3 6 7 .9-5 4.8 1.3 7-6.3-3.3-6.3 3.3 1.3-7-5-4.8L9 8z"/>', flag:'<path d="M5 22V3M5 4h13l-2 4 2 4H5"/>', clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>', book:'<path d="M4 4h6a3 3 0 0 1 3 3v14a3 3 0 0 0-3-3H4zM20 4h-6a3 3 0 0 0-3 3v14a3 3 0 0 1 3-3h6z"/>', folder:'<path d="M3 5h7l2 3h9v12H3z"/>', check:'<path d="M20 6L9 17l-5-5"/>', gift:'<path d="M3 10h18v11H3zM2 7h20v3H2zM12 7v14M12 7H8a2 2 0 1 1 4-2v2zm0 0h4a2 2 0 1 0-4-2v2z"/>'
    };
    return `<svg class="category-svg" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.pin}</svg>`;
  }

  function syncCategoryMap() {
    CATEGORIES = {};
    state.categories.forEach(cat => { CATEGORIES[cat.id] = { ...cat, key: cat.id, label: cat.name, icon: getIconSvg(cat.icon), badgeClass: 'badge-dynamic', eventClass: 'event-dynamic' }; });
  }

  function loadCategories() {
    try {
      const parsed = JSON.parse(localStorage.getItem(CATEGORY_STORAGE_KEY));
      if (Array.isArray(parsed) && parsed.length) return parsed.filter(cat => cat && cat.id && cat.name).map(cat => ({ ...cat, color: cat.color || '#64748B', icon: ICON_NAMES.includes(cat.icon) ? cat.icon : 'pin', isDefault: Boolean(cat.isDefault) }));
    } catch (e) { console.error('Failed to parse category data:', e); }
    localStorage.setItem(CATEGORY_STORAGE_KEY, JSON.stringify(DEFAULT_CATEGORIES));
    return DEFAULT_CATEGORIES.map(cat => ({ ...cat }));
  }

  function saveCategories() {
    try { localStorage.setItem(CATEGORY_STORAGE_KEY, JSON.stringify(state.categories)); } catch (e) { console.error('Failed to save category data:', e); showToast('카테고리 저장 중 오류가 발생했습니다.'); }
    syncCategoryMap();
  }

  function getCategoryById(id) { return CATEGORIES[id] || CATEGORIES.other || CATEGORIES[state.categories[0]?.id]; }

  function getUrgencyState(startDate, endDate) {
    const status = getScheduleStatus(startDate, endDate);
    if (status === 'completed') return { key:'completed', label:'완료', color:'#64748B' };
    if (status === 'ongoing') return { key:'ongoing', label:'진행 중', color:'#059669' };
    const days = calculateDDay(startDate).diffDays;
    if (days === 0) return { key:'today', label:'오늘', color:'#DC2626' };
    if (days === 1) return { key:'urgent', label:'긴급', color:'#DC2626' };
    if (days >= 2 && days <= 7) return { key:'soon', label:'임박', color:'#EA580C' };
    return { key:'normal', label:'예정', color:'#1646D8' };
  }

  /**
   * Loads D-Day items safely from localStorage with migration:
   * - startDate = item.startDate || item.targetDate
   * - endDate = item.endDate || startDate
   * - category = item.category || 'other'
   * - important = Boolean(item.important)
   * @returns {Array}
   */
  function loadDDays() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return [];
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed
          .filter(item => item && item.id && item.title && (item.startDate || item.targetDate))
          .map(item => {
            const start = item.startDate || item.targetDate;
            const end = item.endDate || start;
            return {
              id: String(item.id),
              title: String(item.title),
              startDate: String(start),
              endDate: String(end),
              category: (item.category && CATEGORIES[item.category]) ? item.category : 'other',
              important: Boolean(item.important),
              checklist: Array.isArray(item.checklist) ? item.checklist.filter(check => check && check.id && typeof check.text === 'string' && check.text.trim()).map(check => ({ id:String(check.id), text:String(check.text).trim().slice(0,100), completed:Boolean(check.completed) })) : [],
              createdAt: item.createdAt || new Date().toISOString()
            };
          });
      }
      return [];
    } catch (e) {
      console.error('Failed to parse localStorage D-Day data:', e);
      showToast('저장된 데이터를 불러오는 중 오류가 발생했습니다.');
      return [];
    }
  }

  /**
   * Saves D-Day items to localStorage.
   * @param {Array} items 
   */
  function saveDDays(items) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
      showToast('데이터 저장 중 오류가 발생했습니다.');
    }
  }

  function loadSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) || '{}');
      return {
        fontFamily: Object.hasOwn(FONT_FAMILIES, saved.fontFamily) ? saved.fontFamily : DEFAULT_SETTINGS.fontFamily,
        fontSize: Object.hasOwn(FONT_SCALES, saved.fontSize) ? saved.fontSize : DEFAULT_SETTINGS.fontSize
      };
    } catch (error) {
      console.warn('설정 데이터를 불러오지 못했습니다. 기본값을 사용합니다.', error);
      return { ...DEFAULT_SETTINGS };
    }
  }

  function applySettings(settings) {
    document.documentElement.dataset.fontFamily = settings.fontFamily;
    document.documentElement.dataset.fontSize = settings.fontSize;
  }

  function saveSettings(settings) {
    state.settings = { ...settings };
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(state.settings));
    applySettings(state.settings);
  }

  function getSettingsDraft() {
    const selectedSize = settingsForm.querySelector('input[name="fontSize"]:checked');
    return {
      fontFamily: Object.hasOwn(FONT_FAMILIES, fontFamilySelect.value) ? fontFamilySelect.value : 'system',
      fontSize: selectedSize && Object.hasOwn(FONT_SCALES, selectedSize.value) ? selectedSize.value : 'medium'
    };
  }

  function updateSettingsPreview() {
    const draft = getSettingsDraft();
    settingsPreview.style.fontFamily = FONT_FAMILIES[draft.fontFamily];
    settingsPreview.style.fontSize = `${FONT_SCALES[draft.fontSize]}rem`;
  }

  function setSettingsFormValues(settings) {
    fontFamilySelect.value = settings.fontFamily;
    const sizeInput = settingsForm.querySelector(`input[name="fontSize"][value="${settings.fontSize}"]`);
    if (sizeInput) sizeInput.checked = true;
    updateSettingsPreview();
  }

  function openSettings() {
    setSettingsFormValues(state.settings);
    closeDrawer();
    settingsModal.hidden = false;
    document.body.style.overflow = 'hidden';
    setTimeout(() => fontFamilySelect.focus(), 50);
  }

  function closeSettings() {
    settingsModal.hidden = true;
    document.body.style.overflow = '';
  }

  /**
   * Generates a unique ID for a D-Day entry.
   * @returns {string}
   */
  function generateId() {
    return 'dday_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
  }

  function generateChecklistId() { return 'check_' + Date.now() + '_' + Math.random().toString(36).slice(2,8); }
  function getChecklistStats(item) {
    const list = Array.isArray(item?.checklist) ? item.checklist : [];
    const completed = list.filter(check => check.completed).length;
    return { total:list.length, completed, percentage:list.length ? Math.round(completed / list.length * 100) : 0 };
  }

  // ==========================================
  // Filtering & Sorting Logic
  // ==========================================

  /**
   * Updates sidebar category counters.
   */
  function updateCategoryCounts() {
    categoryNavList.innerHTML = `<li class="nav-item"><button type="button" class="nav-link" data-category="all"><span class="nav-icon-text"><span class="nav-icon">▣</span><span>전체 일정</span></span><span class="nav-count-badge">${state.items.length}</span></button></li>` + state.categories.map(cat => {
      const count = state.items.filter(item => item.category === cat.id).length;
      return `<li class="nav-item category-nav-item"><button type="button" class="nav-link" data-category="${cat.id}"><span class="nav-icon-text"><span class="nav-icon" style="color:${cat.color}">${getIconSvg(cat.icon)}</span><span>${escapeHtml(cat.name)}</span></span><span class="nav-count-badge">${count}</span></button><button class="category-edit-btn" data-edit-category="${cat.id}" aria-label="${escapeHtml(cat.name)} 카테고리 수정">⋮</button></li>`;
    }).join('');
    mobileCategoryChips.innerHTML = `<button type="button" class="category-chip" data-category="all">전체</button>` + state.categories.map(cat => `<button type="button" class="category-chip" data-category="${cat.id}" style="--category-color:${cat.color}">${getIconSvg(cat.icon,14)} ${escapeHtml(cat.name)}</button>`).join('');
    categoryRadioGroup.innerHTML = state.categories.map((cat,index) => `<label class="category-radio-label"><input type="radio" name="category" value="${cat.id}" class="category-radio-input" ${index===0?'checked':''}><span class="category-radio-button" style="--category-color:${cat.color}">${getIconSvg(cat.icon,15)}<span>${escapeHtml(cat.name)}</span></span></label>`).join('');
  }

  /**
   * Sorts D-Day items based on selected sort option.
   * @param {Array} items 
   * @param {string} sortBy 
   * @returns {Array}
   */
  function sortItems(items, sortBy) {
    return [...items].sort((a, b) => {
      const calcA = calculateDDay(a.startDate);
      const calcB = calculateDDay(b.startDate);

      if (sortBy === 'closest') {
        // 1. Today, 2. Future ascending (closest first), 3. Past descending (recent past first)
        const getCat = (calc) => calc.status === 'today' ? 1 : (calc.status === 'future' ? 2 : 3);
        const catA = getCat(calcA);
        const catB = getCat(calcB);
        if (catA !== catB) return catA - catB;
        if (catA === 2) return calcA.diffDays - calcB.diffDays;
        if (catA === 3) return calcB.diffDays - calcA.diffDays;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }

      if (sortBy === 'farthest') {
        // Future farthest first (largest diffDays), then Today, then Past farthest first
        if (calcA.diffDays >= 0 && calcB.diffDays >= 0) {
          return calcB.diffDays - calcA.diffDays;
        }
        if (calcA.diffDays >= 0 && calcB.diffDays < 0) return -1;
        if (calcA.diffDays < 0 && calcB.diffDays >= 0) return 1;
        return calcA.diffDays - calcB.diffDays;
      }

      if (sortBy === 'newest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }

      if (sortBy === 'oldest') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }

      return 0;
    });
  }

  /**
   * Filters and sorts the master item list for Dashboard view.
   * @returns {Array}
   */
  function getFilteredAndSortedItems() {
    let result = state.items;

    // 1. Filter by category
    if (state.activeCategory !== 'all') {
      result = result.filter(item => item.category === state.activeCategory);
    }

    // 2. Filter by status: 'all' | 'upcoming' | 'ongoing' | 'completed'
    if (state.activeStatus !== 'all') {
      result = result.filter(item => getScheduleStatus(item.startDate, item.endDate) === state.activeStatus);
    }

    // 3. Filter by search query
    const q = state.searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(item => item.title.toLowerCase().includes(q));
    }

    // 4. Sort
    return sortItems(result, state.sortBy);
  }

  /**
   * Finds the representative D-Day from ALL items (unfiltered):
   * 1. Nearest today or future D-Day (diffDays >= 0)
   * 2. If no future D-Day exists, most recent past D-Day (diffDays < 0)
   * 3. null if no items exist
   * @param {Array} items 
   * @returns {Object|null}
   */
  function getRepresentativeDDay(items) {
    if (!items || items.length === 0) return null;

    const todayAndFuture = items.filter(item => calculateDDay(item.startDate).diffDays >= 0);

    if (todayAndFuture.length > 0) {
      return todayAndFuture.reduce((closest, curr) => {
        const diffClosest = calculateDDay(closest.startDate).diffDays;
        const diffCurr = calculateDDay(curr.startDate).diffDays;
        return diffCurr < diffClosest ? curr : closest;
      });
    }

    // Only past items exist: find the most recent past item (max diffDays, closest to 0)
    return items.reduce((mostRecent, curr) => {
      const diffMostRecent = calculateDDay(mostRecent.startDate).diffDays;
      const diffCurr = calculateDDay(curr.startDate).diffDays;
      return diffCurr > diffMostRecent ? curr : mostRecent;
    });
  }

  // ==========================================
  // Security & String Escaping
  // ==========================================
  function escapeHtml(text) {
    if (typeof text !== 'string') return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ==========================================
  // UI Rendering: Header & Hero
  // ==========================================

  function renderHeaderDate() {
    const today = new Date();
    currentDateDisplay.textContent = `오늘: ${formatDateWithDay(today)}`;
  }

  function renderHeroSection(repItem) {
    if (!repItem) {
      heroSection.innerHTML = `
        <div class="empty-state-card" role="region" aria-label="대표 D-Day 안내">
          <div class="empty-icon-wrap" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </div>
          <h3 class="empty-title">아직 등록된 D-Day가 없습니다.</h3>
          <p class="empty-description">중요한 일정이나 기념일을 추가하고 남은 시간을 확인해보세요.</p>
          <button type="button" class="btn btn-primary btn-add" id="emptyHeroAddBtn">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>D-Day 추가하기</span>
          </button>
        </div>
      `;

      const emptyHeroAddBtn = document.getElementById('emptyHeroAddBtn');
      if (emptyHeroAddBtn) {
        emptyHeroAddBtn.addEventListener('click', openAddModal);
      }
      return;
    }

    const calc = calculateDDay(repItem.startDate);
    const scheduleStatus = getScheduleStatus(repItem.startDate, repItem.endDate);
    const categoryInfo = getCategoryById(repItem.category);
    const urgency = getUrgencyState(repItem.startDate, repItem.endDate);
    
    let categoryClass = '';
    if (scheduleStatus === 'ongoing') {
      categoryClass = 'hero-ongoing';
    } else if (calc.status === 'today') {
      categoryClass = 'hero-today';
    } else if (calc.status === 'past') {
      categoryClass = 'hero-past';
    }

    let badgeLabel = '가장 가까운 D-Day';
    if (scheduleStatus === 'ongoing') {
      badgeLabel = '진행 중인 일정';
    } else if (calc.status === 'today') {
      badgeLabel = '오늘의 D-Day';
    } else if (calc.status === 'past') {
      badgeLabel = '최근 지난 D-Day';
    }

    heroSection.innerHTML = `
      <div class="hero-card ${categoryClass}">
        <div class="hero-main">
          <div class="hero-copy">
            <div class="hero-kicker-row">
              <span class="card-category-badge ${categoryInfo.badgeClass}" style="color:${categoryInfo.color};background:${categoryInfo.color}18">${categoryInfo.icon} ${escapeHtml(categoryInfo.label)}</span>
              <span class="hero-period">${formatDateRange(repItem.startDate, repItem.endDate)}</span>
              ${scheduleStatus === 'ongoing' ? '<span class="badge-ongoing-tag">진행 중</span>' : ''}
            </div>
            <h2 class="hero-title">${repItem.important ? '⭐ ' : ''}${escapeHtml(repItem.title)}</h2>
            <div class="hero-progress" aria-hidden="true"><span></span></div>
          </div>
          <div class="hero-dday-panel">
            <span class="hero-dday-number urgency-${urgency.key}" style="color:${urgency.color}">${scheduleStatus === 'ongoing' ? '진행 중' : calc.dDayText}</span>
            <span class="hero-status-caption">${badgeLabel}</span>
          </div>
        </div>
      </div>
    `;
  }

  // ==========================================
  // UI Rendering: Category & Status Navigation
  // ==========================================

  function renderCategoryActiveStates() {
    // Sidebar nav links
    const navLinks = sidebarNav.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      const cat = link.dataset.category;
      if (cat === state.activeCategory) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      } else {
        link.classList.remove('active');
        link.removeAttribute('aria-current');
      }
    });

    // Mobile category chips
    const chips = mobileCategoryChips.querySelectorAll('.category-chip');
    chips.forEach(chip => {
      const cat = chip.dataset.category;
      if (cat === state.activeCategory) {
        chip.classList.add('active');
      } else {
        chip.classList.remove('active');
      }
    });

    // Status filter tabs
    const statusTabs = statusFilterTabs.querySelectorAll('.status-tab-btn');
    statusTabs.forEach(tab => {
      const status = tab.dataset.status;
      if (status === state.activeStatus) {
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
      } else {
        tab.classList.remove('active');
        tab.setAttribute('aria-selected', 'false');
      }
    });

    // Calendar category indicator
    const activeCategoryInfo = state.activeCategory === 'all' ? null : getCategoryById(state.activeCategory);
    let catLabel = activeCategoryInfo ? `${activeCategoryInfo.label} 일정` : '전체 일정';
    calCategoryIndicator.textContent = catLabel;

    // Update List Section Title
    let catTitle = activeCategoryInfo ? `${activeCategoryInfo.label} 일정` : 'My D-Days';

    if (state.activeStatus === 'upcoming') catTitle += ' (예정)';
    else if (state.activeStatus === 'ongoing') catTitle += ' (진행 중)';
    else if (state.activeStatus === 'completed') catTitle += ' (완료)';

    if (state.searchQuery.trim()) {
      catTitle += ` - "${state.searchQuery.trim()}" 검색 결과`;
    }

    listHeaderTitle.textContent = catTitle;
  }

  // ==========================================
  // UI Rendering: Dashboard Cards List
  // ==========================================

  function renderListSection(items) {
    listCountBadge.textContent = items.length;

    if (items.length === 0) {
      const isFiltered = state.activeCategory !== 'all' || state.activeStatus !== 'all' || state.searchQuery.trim() !== '';
      const emptyMsg = isFiltered 
        ? '선택한 조건에 일치하는 일정이 없습니다.' 
        : '등록된 일정이 없습니다.';
      const emptySubmsg = isFiltered 
        ? '검색어나 필터 조건을 변경해보세요.' 
        : '상단의 버튼을 눌러 새로운 일정을 등록해보세요.';

      cardsContainer.innerHTML = `
        <div class="empty-state-card" style="grid-column: 1 / -1;">
          <div class="empty-icon-wrap" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="12" y1="18" x2="12" y2="12"></line>
              <line x1="9" y1="15" x2="15" y2="15"></line>
            </svg>
          </div>
          <h3 class="empty-title">${emptyMsg}</h3>
          <p class="empty-description">${emptySubmsg}</p>
          ${isFiltered ? `
            <button type="button" class="btn btn-secondary" id="resetFilterBtn" style="margin-top: 0.25rem;">
              필터 초기화
            </button>
          ` : ''}
        </div>
      `;

      const resetFilterBtn = document.getElementById('resetFilterBtn');
      if (resetFilterBtn) {
        resetFilterBtn.addEventListener('click', () => {
          state.activeCategory = 'all';
          state.activeStatus = 'all';
          state.searchQuery = '';
          searchInput.value = '';
          clearSearchBtn.hidden = true;
          renderApp();
        });
      }
      return;
    }

    const cardsHtml = items.map(item => {
      const calc = calculateDDay(item.startDate);
      const scheduleStatus = getScheduleStatus(item.startDate, item.endDate);
      const categoryInfo = getCategoryById(item.category);
      const urgency = getUrgencyState(item.startDate, item.endDate);
      const cardStateClass = calc.status === 'today' ? 'card-today' : (calc.status === 'past' ? 'card-past' : '');
      const importantClass = item.important ? 'card-important' : '';
      const checklistStats = getChecklistStats(item);

      return `
        <article class="dday-card ${cardStateClass} ${importantClass}" data-id="${item.id}" tabindex="0" aria-label="${escapeHtml(item.title)} 상세 보기">
          <div class="card-meta-row">
            <div class="card-meta-left">
              <span class="card-category-badge ${categoryInfo.badgeClass}" style="color:${categoryInfo.color};background:${categoryInfo.color}18">
                ${categoryInfo.icon} ${escapeHtml(categoryInfo.label)}
              </span>
              ${scheduleStatus === 'ongoing' ? '<span class="badge-ongoing-tag">진행 중</span>' : ''}
              ${item.important ? '<span class="card-important-tag">⭐ 중요</span>' : ''}
            </div>
            <div class="card-dday-badge-wrap">
              <span class="card-dday-number urgency-${urgency.key}" style="color:${urgency.color}">${scheduleStatus === 'ongoing' ? '진행 중' : calc.dDayText}</span>
              <span class="card-status-text">${calc.statusLabel}</span>
            </div>
          </div>

          <div class="card-top-row">
            <div class="card-title-area">
              <h3 class="card-title">${escapeHtml(item.title)}</h3>
              <div class="card-target-date">
                <span class="card-date-value">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  <span>${formatDateRange(item.startDate, item.endDate)}</span>
                </span>
                ${checklistStats.total ? `<span class="card-checklist-compact ${checklistStats.completed === checklistStats.total ? 'completed' : ''}">${checklistStats.completed === checklistStats.total ? '✓ Check list 완료' : 'Check list'} ${checklistStats.completed}/${checklistStats.total}</span>` : ''}
              </div>
            </div>
          </div>

          <div class="card-bottom-row">
            <button type="button" class="btn-card-action btn-action-edit" data-id="${item.id}" aria-label="${escapeHtml(item.title)} 일정 수정">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              <span>수정</span>
            </button>
            <button type="button" class="btn-card-action btn-action-delete" data-id="${item.id}" aria-label="${escapeHtml(item.title)} 일정 삭제">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
              <span>삭제</span>
            </button>
          </div>
        </article>
      `;
    }).join('');

    cardsContainer.innerHTML = cardsHtml;
  }

  // ==========================================
  // UI Rendering: Calendar Month View
  // ==========================================

  /**
   * Renders the entire month calendar grid with multi-day connected event bars.
   */
  function renderCalendar() {
    const year = state.calendarYear;
    const month = state.calendarMonth;

    // Update Month Header Title
    calMonthTitle.textContent = `${year}년 ${month + 1}월`;

    const firstDayOfMonth = new Date(year, month, 1);
    const startDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sun, 1 = Mon, ...
    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const todayStr = toIsoDateString(getTodayMidnight());

    // Build the array of all cells (including prev/next month buffer days)
    const cells = [];

    // Previous month trailing days
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const dateObj = new Date(year, month - 1, dayNum);
      cells.push({
        dateStr: toIsoDateString(dateObj),
        dayNum: dayNum,
        isCurrentMonth: false,
        dayOfWeek: dateObj.getDay()
      });
    }

    // Current month days
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const dateObj = new Date(year, month, d);
      cells.push({
        dateStr: toIsoDateString(dateObj),
        dayNum: d,
        isCurrentMonth: true,
        dayOfWeek: dateObj.getDay()
      });
    }

    // Next month leading days to complete full weeks (multiples of 7)
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const dateObj = new Date(year, month + 1, d);
      cells.push({
        dateStr: toIsoDateString(dateObj),
        dayNum: d,
        isCurrentMonth: false,
        dayOfWeek: dateObj.getDay()
      });
    }

    // Get active items according to category filter
    const activeItems = state.activeCategory === 'all'
      ? state.items
      : state.items.filter(item => item.category === state.activeCategory);

    // Build HTML for each cell
    const cellsHtml = cells.map((cell) => {
      const isToday = cell.dateStr === todayStr;
      const cellDateStr = cell.dateStr;

      // Filter events spanning this cell date
      const matchingEvents = activeItems.filter(item => {
        const start = item.startDate;
        const end = item.endDate || item.startDate;
        return cellDateStr >= start && cellDateStr <= end;
      });

      // Sort matching events: multi-day first, then by startDate, then createdAt
      matchingEvents.sort((a, b) => {
        const spanA = parseLocalDate(a.endDate).getTime() - parseLocalDate(a.startDate).getTime();
        const spanB = parseLocalDate(b.endDate).getTime() - parseLocalDate(b.startDate).getTime();
        if (spanB !== spanA) return spanB - spanA;
        return a.startDate.localeCompare(b.startDate);
      });

      const maxDisplay = 3;
      const visibleEvents = matchingEvents.slice(0, maxDisplay);
      const overflowCount = matchingEvents.length - maxDisplay;

      const eventsHtml = visibleEvents.map(event => {
        const start = event.startDate;
        const end = event.endDate || event.startDate;
        const isSingleDay = (start === end);

        let connectorClass = 'event-single';
        if (!isSingleDay) {
          const isEventStart = (cellDateStr === start);
          const isEventEnd = (cellDateStr === end);
          const isWeekStart = (cell.dayOfWeek === 0); // Sunday
          const isWeekEnd = (cell.dayOfWeek === 6);   // Saturday

          const atLeftBoundary = isEventStart || isWeekStart;
          const atRightBoundary = isEventEnd || isWeekEnd;

          if (atLeftBoundary && atRightBoundary) {
            connectorClass = 'event-single';
          } else if (atLeftBoundary) {
            connectorClass = 'event-start';
          } else if (atRightBoundary) {
            connectorClass = 'event-end';
          } else {
            connectorClass = 'event-middle';
          }
        }

        const categoryInfo = getCategoryById(event.category);
        const shouldShowText = (connectorClass === 'event-single' || connectorClass === 'event-start');

        return `
          <div 
            class="cal-event-bar ${connectorClass} ${categoryInfo.eventClass}" style="background-color:${categoryInfo.color};border-color:${categoryInfo.color}" 
            data-id="${event.id}" 
            title="${escapeHtml(event.title)} (${formatDateRange(event.startDate, event.endDate)})"
            role="button"
            tabindex="0"
          >
            ${shouldShowText ? `${event.important ? '⭐ ' : ''}${escapeHtml(event.title)}` : '&nbsp;'}
          </div>
        `;
      }).join('');

      const overflowHtml = overflowCount > 0 
        ? `<div class="cal-more-badge">+${overflowCount}개 더보기</div>` 
        : '';

      const cellClasses = [
        'calendar-cell',
        cell.isCurrentMonth ? '' : 'cell-other-month',
        isToday ? 'cell-today' : '',
        cellDateStr === state.selectedCalendarDate ? 'cell-selected' : '',
        cell.dayOfWeek === 0 ? 'cell-sun' : '',
        cell.dayOfWeek === 6 ? 'cell-sat' : ''
      ].filter(Boolean).join(' ');

      return `
        <div class="${cellClasses}" data-date="${cellDateStr}">
          <div class="cell-header">
            <span class="cell-day-number">${cell.dayNum}</span>
            <span class="cell-add-indicator" aria-hidden="true">＋</span>
          </div>
          <div class="cell-events-list">
            ${eventsHtml}
            ${overflowHtml}
          </div>
        </div>
      `;
    }).join('');

    calendarGrid.innerHTML = cellsHtml;
    renderMobileCalendarAgenda();
  }

  function renderMobileCalendarAgenda() {
    if (!mobileCalendarAgenda) return;
    const date = state.selectedCalendarDate || toIsoDateString(getTodayMidnight());
    const items = state.items.filter(item => item.startDate <= date && (item.endDate || item.startDate) >= date && (state.activeCategory === 'all' || item.category === state.activeCategory));
    mobileCalendarAgenda.innerHTML = `<div class="mobile-agenda-header"><h3>${formatDateWithDay(date)}</h3><button type="button" class="mobile-date-add-btn" data-add-date="${date}">＋ 이 날짜에 일정 추가</button></div>` + (items.length ? items.map(item => { const cat=getCategoryById(item.category); return `<button class="mobile-agenda-item" data-id="${item.id}" style="--agenda-color:${cat.color}"><span class="agenda-line"></span><span><b>${escapeHtml(item.title)}</b><small>${cat.icon} ${escapeHtml(cat.label)}</small></span></button>`; }).join('') : '<p>선택한 날짜의 일정이 없습니다.</p>');
  }

  // ==========================================
  // Main Render Orchestration
  // ==========================================

  function renderApp() {
    renderHeaderDate();
    updateCategoryCounts();
    renderCategoryActiveStates();

    if (state.currentView === 'dashboard') {
      const representativeItem = getRepresentativeDDay(state.items);
      renderHeroSection(representativeItem);
      const filteredItems = getFilteredAndSortedItems();
      renderListSection(filteredItems);
    } else {
      renderCalendar();
    }
  }

  function switchView(viewName) {
    state.currentView = viewName;
    if (viewName === 'dashboard') {
      tabDashboardBtn.classList.add('active');
      tabDashboardBtn.setAttribute('aria-selected', 'true');
      tabCalendarBtn.classList.remove('active');
      tabCalendarBtn.setAttribute('aria-selected', 'false');
      dashboardView.hidden = false;
      calendarView.hidden = true;
    } else {
      tabCalendarBtn.classList.add('active');
      tabCalendarBtn.setAttribute('aria-selected', 'true');
      tabDashboardBtn.classList.remove('active');
      tabDashboardBtn.setAttribute('aria-selected', 'false');
      dashboardView.hidden = true;
      calendarView.hidden = false;
    }
    renderApp();
  }

  /**
   * Shows a brief toast notification.
   * @param {string} message 
   */
  function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast-item';
    toast.textContent = message;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      if (toast.parentNode === toastContainer) {
        toastContainer.removeChild(toast);
      }
    }, 3000);
  }

  // ==========================================
  // Event Detail Modal (Calendar Click)
  // ==========================================

  function getCurrentDetailItem() {
    return state.items.find(item => item.id === state.currentDetailId);
  }

  function refreshChecklistUI() {
    const item = getCurrentDetailItem();
    if (!item) return;
    if (!Array.isArray(item.checklist)) item.checklist = [];
    const stats = getChecklistStats(item);
    checklistCount.textContent = `${stats.completed} / ${stats.total}`;
    checklistSecondary.textContent = stats.total ? `Check list 항목 ${stats.total}개` : 'Check list 항목을 추가해 보세요.';
    checklistProgress.hidden = stats.total === 0;
    checklistProgressBar.style.width = `${stats.percentage}%`;
    checklistPercentage.textContent = `${stats.percentage}%`;
    checklistCompleteMessage.hidden = !stats.total || stats.completed !== stats.total;
    checklistEmpty.hidden = stats.total > 0;
    checklistList.innerHTML = item.checklist.map(check => `
      <div class="checklist-item ${check.completed ? 'completed' : ''}" data-check-id="${escapeHtml(check.id)}">
        <label class="checklist-check-label"><input class="checklist-checkbox" type="checkbox" ${check.completed ? 'checked' : ''} aria-label="${escapeHtml(check.text)} 완료 상태"><span class="checklist-text">${escapeHtml(check.text)}</span></label>
        <div class="checklist-actions"><button type="button" class="checklist-action edit" data-action="edit" aria-label="${escapeHtml(check.text)} 수정">수정</button><button type="button" class="checklist-action delete" data-action="delete" aria-label="${escapeHtml(check.text)} 삭제">삭제</button></div>
      </div>`).join('');
  }

  function saveChecklistChanges() {
    saveDDays(state.items);
    renderApp();
    refreshChecklistUI();
  }

  function beginChecklistEdit(row) {
    const item = getCurrentDetailItem();
    const check = item && item.checklist.find(entry => entry.id === row.dataset.checkId);
    if (!check) return;
    row.innerHTML = `<form class="checklist-edit-form"><label class="sr-only" for="check-edit-${escapeHtml(check.id)}">Check list 항목 수정</label><input class="checklist-edit-input" id="check-edit-${escapeHtml(check.id)}" maxlength="100" value="${escapeHtml(check.text)}"><button type="submit">저장</button><button type="button" data-action="cancel">취소</button></form>`;
    row.querySelector('input').focus();
    row.querySelector('input').select();
  }

  function openDetailModal(id) {
    const item = state.items.find(item => item.id === id);
    if (!item) return;

    state.currentDetailId = id;
    const calc = calculateDDay(item.startDate);
    const scheduleStatus = getScheduleStatus(item.startDate, item.endDate);
    const categoryInfo = getCategoryById(item.category);
    const urgency = getUrgencyState(item.startDate, item.endDate);

    detailTitle.textContent = `${item.important ? '⭐ ' : ''}${item.title}`;
    detailDDayBadge.textContent = scheduleStatus === 'ongoing' ? '진행 중' : `${calc.dDayText} (${urgency.label})`;
    detailDDayBadge.style.color = urgency.color;
    detailDateRange.textContent = formatDateRange(item.startDate, item.endDate);

    detailHeaderTags.innerHTML = `
      <span class="card-category-badge ${categoryInfo.badgeClass}" style="color:${categoryInfo.color};background:${categoryInfo.color}18">
        ${categoryInfo.icon} ${escapeHtml(categoryInfo.label)}
      </span>
      ${scheduleStatus === 'ongoing' ? '<span class="badge-ongoing-tag">진행 중</span>' : ''}
    `;

    checklistAddForm.hidden = true;
    checklistInput.value = '';
    checklistError.textContent = '';
    checklistAddToggle.textContent = '＋ Check list 추가';
    refreshChecklistUI();

    detailModal.hidden = false;
    document.body.style.overflow = 'hidden';
    setTimeout(() => closeDetailModalBtn.focus(), 50);
  }

  function closeDetailModal() {
    detailModal.hidden = true;
    document.body.style.overflow = '';
    checklistAddForm.hidden = true;
    checklistError.textContent = '';
    state.currentDetailId = null;
  }

  // ==========================================
  // Drawer Management (Mobile)
  // ==========================================

  function openDrawer() {
    sidebar.classList.add('active');
    sidebarBackdrop.classList.add('active');
    drawerToggleBtn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    sidebar.classList.remove('active');
    sidebarBackdrop.classList.remove('active');
    drawerToggleBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  // ==========================================
  // Form Validation & Modal Management
  // ==========================================

  function clearFormErrors() {
    titleError.textContent = '';
    startDateError.textContent = '';
    endDateError.textContent = '';
    titleInput.classList.remove('input-error');
    startDateInput.classList.remove('input-error');
    endDateInput.classList.remove('input-error');
  }

  function setCategoryRadio(catValue) {
    const radio = ddayForm.querySelector(`input[name="category"][value="${catValue}"]`);
    if (radio) {
      radio.checked = true;
    } else {
      const defaultRadio = ddayForm.querySelector('input[name="category"][value="personal"]');
      if (defaultRadio) defaultRadio.checked = true;
    }
  }

  function getSelectedCategory() {
    const selected = ddayForm.querySelector('input[name="category"]:checked');
    return selected ? selected.value : 'personal';
  }

  function openAddModal(selectedDate = null) {
    state.currentEditId = null;
    modalTitle.textContent = '새 일정 추가';
    saveFormBtn.textContent = '저장';
    editItemId.value = '';
    titleInput.value = '';
    
    const initialDate = typeof selectedDate === 'string' ? selectedDate : toIsoDateString(getTodayMidnight());
    startDateInput.value = initialDate;
    endDateInput.value = initialDate;
    
    setCategoryRadio('personal');
    importantCheckbox.checked = false;
    clearFormErrors();
    
    closeDrawer();
    formModal.hidden = false;
    document.body.style.overflow = 'hidden';
    setTimeout(() => titleInput.focus(), 50);
  }

  function openEditModal(id) {
    const item = state.items.find(item => item.id === id);
    if (!item) return;

    state.currentEditId = id;
    modalTitle.textContent = '일정 수정';
    saveFormBtn.textContent = '수정 완료';
    editItemId.value = item.id;
    titleInput.value = item.title;
    startDateInput.value = item.startDate;
    endDateInput.value = item.endDate || item.startDate;
    setCategoryRadio(item.category || 'personal');
    importantCheckbox.checked = Boolean(item.important);
    clearFormErrors();

    closeDetailModal();
    closeDrawer();
    formModal.hidden = false;
    document.body.style.overflow = 'hidden';
    setTimeout(() => titleInput.focus(), 50);
  }

  function closeFormModal() {
    formModal.hidden = true;
    document.body.style.overflow = '';
    state.currentEditId = null;
    clearFormErrors();
  }

  function handleFormSubmit(e) {
    e.preventDefault();
    clearFormErrors();

    const titleVal = titleInput.value.trim();
    const startVal = startDateInput.value.trim();
    const endVal = endDateInput.value.trim() || startVal;
    const categoryVal = getSelectedCategory();
    const importantVal = importantCheckbox.checked;

    let hasError = false;

    // Title validation
    if (!titleVal) {
      titleError.textContent = '일정명을 입력해주세요.';
      titleInput.classList.add('input-error');
      hasError = true;
    } else if (titleVal.length > 60) {
      titleError.textContent = '일정명은 60자 이내로 입력해주세요.';
      titleInput.classList.add('input-error');
      hasError = true;
    }

    // Start Date validation
    if (!startVal) {
      startDateError.textContent = '일정 시작일을 선택해주세요.';
      startDateInput.classList.add('input-error');
      hasError = true;
    }

    // End Date validation
    if (!endVal) {
      endDateError.textContent = '일정 종료일을 선택해주세요.';
      endDateInput.classList.add('input-error');
      hasError = true;
    } else if (startVal && endVal < startVal) {
      endDateError.textContent = '종료일은 시작일보다 빠를 수 없습니다.';
      endDateInput.classList.add('input-error');
      hasError = true;
    }

    if (hasError) {
      if (titleInput.classList.contains('input-error')) {
        titleInput.focus();
      } else if (startDateInput.classList.contains('input-error')) {
        startDateInput.focus();
      } else {
        endDateInput.focus();
      }
      return;
    }

    if (state.currentEditId) {
      // Edit existing D-Day
      const itemIndex = state.items.findIndex(item => item.id === state.currentEditId);
      if (itemIndex > -1) {
        state.items[itemIndex] = {
          ...state.items[itemIndex],
          title: titleVal,
          startDate: startVal,
          endDate: endVal,
          category: categoryVal,
          important: importantVal
        };
        saveDDays(state.items);
        renderApp();
        showToast('일정이 수정되었습니다.');
      }
    } else {
      // Create new D-Day
      const newItem = {
        id: generateId(),
        title: titleVal,
        startDate: startVal,
        endDate: endVal,
        category: categoryVal,
        important: importantVal,
        checklist: [],
        createdAt: new Date().toISOString()
      };
      state.items.push(newItem);
      saveDDays(state.items);
      renderApp();
      showToast('새 일정이 등록되었습니다.');
    }

    closeFormModal();
  }

  // ==========================================
  // Delete Modal Management
  // ==========================================

  function openDeleteModal(id) {
    const item = state.items.find(item => item.id === id);
    if (!item) return;

    state.currentDeleteId = id;
    deleteTargetTitle.textContent = item.title;
    deleteModal.hidden = false;
    document.body.style.overflow = 'hidden';
    setTimeout(() => confirmDeleteBtn.focus(), 50);
  }

  function closeDeleteModal() {
    deleteModal.hidden = true;
    document.body.style.overflow = '';
    state.currentDeleteId = null;
  }

  function confirmDelete() {
    if (!state.currentDeleteId) return;

    const itemIndex = state.items.findIndex(item => item.id === state.currentDeleteId);
    if (itemIndex > -1) {
      const deletedTitle = state.items[itemIndex].title;
      state.items.splice(itemIndex, 1);
      saveDDays(state.items);
      renderApp();
      showToast(`"${deletedTitle}" 일정이 삭제되었습니다.`);
    }

    closeDetailModal();
    closeDeleteModal();
  }

  function renderCategoryPickers(selectedIcon = 'calendar', selectedColor = CATEGORY_COLORS[0]) {
    iconPicker.innerHTML = ICON_NAMES.map(name => `<button type="button" class="picker-option icon-option ${name===selectedIcon?'selected':''}" data-icon="${name}" title="${name}">${getIconSvg(name,20)}</button>`).join('');
    colorPicker.innerHTML = CATEGORY_COLORS.map(color => `<button type="button" class="picker-option color-option ${color===selectedColor?'selected':''}" data-color="${color}" style="background:${color}" aria-label="색상 ${color}"></button>`).join('');
    updateCategoryPreview();
  }

  function updateCategoryPreview() {
    if (!categoryPreviewBadge) return;
    const name = categoryNameInput.value.trim() || '카테고리';
    const icon = iconPicker.querySelector('.selected')?.dataset.icon || 'calendar';
    const color = colorPicker.querySelector('.selected')?.dataset.color || CATEGORY_COLORS[0];
    categoryPreviewBadge.innerHTML = `${getIconSvg(icon,18)} ${escapeHtml(name)}`;
    categoryPreviewBadge.style.color = color;
    categoryPreviewBadge.style.background = `${color}18`;
    categoryPreviewBar.innerHTML = `${getIconSvg(icon,13)} ${escapeHtml(name)} 일정`;
    categoryPreviewBar.style.background = color;
  }

  function openCategoryManagement() {
    renderCategoryManagement();
    closeDrawer();
    categoryManagementModal.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeCategoryManagement() { categoryManagementModal.hidden = true; document.body.style.overflow = ''; }

  function renderCategoryManagement() {
    categoryManagementList.innerHTML = state.categories.map(cat => {
      const count = state.items.filter(item => item.category === cat.id).length;
      return `<button type="button" class="category-management-row" data-manage-category="${cat.id}"><span class="category-management-icon" style="color:${cat.color};background:${cat.color}15">${getIconSvg(cat.icon,22)}</span><span class="category-management-copy"><b>${escapeHtml(cat.name)}</b><small>${count} items</small></span><span class="category-management-color" style="background:${cat.color}"></span><span class="category-management-edit" aria-hidden="true">✎</span></button>`;
    }).join('');
  }

  function openCategoryModal(id = null) {
    const category = id ? state.categories.find(cat => cat.id === id) : null;
    state.currentCategoryEditId = category?.id || null;
    categoryModalTitle.textContent = category ? '카테고리 수정' : '카테고리 추가';
    categoryEditId.value = category?.id || '';
    categoryNameInput.value = category?.name || '';
    categoryNameError.textContent = '';
    renderCategoryPickers(category?.icon || 'calendar', category?.color || CATEGORY_COLORS[0]);
    categoryDeleteArea.hidden = !category;
    deleteCategoryBtn.hidden = Boolean(category?.isDefault);
    defaultCategoryNotice.hidden = !category?.isDefault;
    categoryModal.hidden = false;
    document.body.style.overflow = 'hidden';
    setTimeout(() => categoryNameInput.focus(), 50);
  }

  function closeCategoryModal() { categoryModal.hidden = true; state.currentCategoryEditId = null; document.body.style.overflow = ''; }

  function handleCategorySubmit(e) {
    e.preventDefault();
    const name = categoryNameInput.value.trim();
    const icon = iconPicker.querySelector('.selected')?.dataset.icon || 'calendar';
    const color = colorPicker.querySelector('.selected')?.dataset.color || CATEGORY_COLORS[0];
    if (!name) { categoryNameError.textContent = '카테고리 이름을 입력해주세요.'; return; }
    if (name.length > 20) { categoryNameError.textContent = '카테고리 이름은 20자 이내로 입력해주세요.'; return; }
    if (state.categories.some(cat => cat.name.toLowerCase() === name.toLowerCase() && cat.id !== state.currentCategoryEditId)) { categoryNameError.textContent = '같은 이름의 카테고리가 이미 있습니다.'; return; }
    if (state.currentCategoryEditId) {
      const index = state.categories.findIndex(cat => cat.id === state.currentCategoryEditId);
      if (index >= 0) state.categories[index] = { ...state.categories[index], name, icon, color };
      showToast('카테고리가 수정되었습니다.');
    } else {
      state.categories.push({ id:`category_${Date.now()}`, name, icon, color, isDefault:false });
      showToast('카테고리가 추가되었습니다.');
    }
    saveCategories();
    renderApp();
    if (!categoryManagementModal.hidden) renderCategoryManagement();
    closeCategoryModal();
  }

  function requestCategoryDelete() {
    const category = state.categories.find(cat => cat.id === state.currentCategoryEditId);
    if (!category || category.isDefault) return;
    const usedItems = state.items.filter(item => item.category === category.id);
    if (!usedItems.length) {
      if (!window.confirm(`'${category.name}' 카테고리를 삭제하시겠습니까?`)) return;
      state.categories = state.categories.filter(cat => cat.id !== category.id);
      saveCategories(); renderApp(); closeCategoryModal(); showToast('카테고리가 삭제되었습니다.');
      return;
    }
    state.currentCategoryDeleteId = category.id;
    categoryMoveMessage.textContent = `'${category.name}' 카테고리를 사용하는 일정이 ${usedItems.length}개 있습니다. 이동할 카테고리를 선택하세요.`;
    categoryMoveSelect.innerHTML = state.categories.filter(cat => cat.id !== category.id).map(cat => `<option value="${cat.id}">${escapeHtml(cat.name)}</option>`).join('');
    categoryModal.hidden = true;
    categoryMoveModal.hidden = false;
  }

  function confirmCategoryMoveAndDelete() {
    const sourceId = state.currentCategoryDeleteId;
    const targetId = categoryMoveSelect.value;
    if (!sourceId || !targetId) return;
    state.items = state.items.map(item => item.category === sourceId ? { ...item, category:targetId } : item);
    state.categories = state.categories.filter(cat => cat.id !== sourceId);
    if (state.activeCategory === sourceId) state.activeCategory = 'all';
    saveDDays(state.items); saveCategories(); renderApp();
    categoryMoveModal.hidden = true; state.currentCategoryDeleteId = null; document.body.style.overflow = ''; showToast('일정을 이동하고 카테고리를 삭제했습니다.');
  }

  // ==========================================
  // Event Listeners & Binding
  // ==========================================

  function initEventListeners() {
    // View tab switching (robust direct binding)
    if (tabDashboardBtn) {
      tabDashboardBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        switchView('dashboard');
      });
    }
    if (tabCalendarBtn) {
      tabCalendarBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        switchView('calendar');
      });
    }

    // Calendar Navigation
    calPrevMonthBtn.addEventListener('click', () => {
      state.calendarMonth--;
      if (state.calendarMonth < 0) {
        state.calendarMonth = 11;
        state.calendarYear--;
      }
      renderCalendar();
    });

    calNextMonthBtn.addEventListener('click', () => {
      state.calendarMonth++;
      if (state.calendarMonth > 11) {
        state.calendarMonth = 0;
        state.calendarYear++;
      }
      renderCalendar();
    });

    calTodayBtn.addEventListener('click', () => {
      const t = new Date();
      state.calendarYear = t.getFullYear();
      state.calendarMonth = t.getMonth();
      renderCalendar();
    });

    // Calendar Grid Event Click & Delegation
    calendarGrid.addEventListener('click', (e) => {
      const eventBar = e.target.closest('.cal-event-bar');
      if (eventBar && eventBar.dataset.id) {
        e.stopPropagation();
        openDetailModal(eventBar.dataset.id);
        return;
      }
      const cell = e.target.closest('.calendar-cell[data-date]');
      if (cell) {
        state.selectedCalendarDate = cell.dataset.date;
        if (window.innerWidth < 768) renderCalendar();
        else openAddModal(cell.dataset.date);
      }
    });
    if (mobileCalendarAgenda) mobileCalendarAgenda.addEventListener('click', e => {
      const addBtn = e.target.closest('[data-add-date]');
      if (addBtn) { openAddModal(addBtn.dataset.addDate); return; }
      const item = e.target.closest('[data-id]');
      if (item) openDetailModal(item.dataset.id);
    });

    calendarGrid.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const eventBar = e.target.closest('.cal-event-bar');
        if (eventBar && eventBar.dataset.id) {
          e.preventDefault();
          openDetailModal(eventBar.dataset.id);
        }
      }
    });

    // Detail Modal Controls
    closeDetailModalBtn.addEventListener('click', closeDetailModal);
    detailModal.addEventListener('click', (e) => {
      if (e.target === detailModal) closeDetailModal();
    });

    detailEditBtn.addEventListener('click', () => {
      if (state.currentDetailId) {
        openEditModal(state.currentDetailId);
      }
    });

    detailDeleteBtn.addEventListener('click', () => {
      if (state.currentDetailId) {
        openDeleteModal(state.currentDetailId);
      }
    });

    checklistAddToggle.addEventListener('click', () => {
      checklistAddForm.hidden = !checklistAddForm.hidden;
      checklistAddToggle.textContent = checklistAddForm.hidden ? '＋ Check list 추가' : '취소';
      checklistError.textContent = '';
      if (!checklistAddForm.hidden) checklistInput.focus();
    });

    checklistAddForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const item = getCurrentDetailItem();
      const text = checklistInput.value.trim();
      if (!item || !text) { checklistError.textContent = 'Check list 항목을 입력해 주세요.'; return; }
      item.checklist.push({ id: generateChecklistId(), text: text.slice(0, 100), completed: false });
      checklistInput.value = '';
      checklistError.textContent = '';
      saveChecklistChanges();
      checklistInput.focus();
    });

    checklistList.addEventListener('change', (e) => {
      const checkbox = e.target.closest('.checklist-checkbox');
      if (!checkbox) return;
      const item = getCurrentDetailItem();
      const row = checkbox.closest('.checklist-item');
      const check = item && item.checklist.find(entry => entry.id === row.dataset.checkId);
      if (check) { check.completed = checkbox.checked; saveChecklistChanges(); }
    });

    checklistList.addEventListener('click', (e) => {
      const action = e.target.closest('[data-action]');
      if (!action) return;
      const row = action.closest('.checklist-item');
      const item = getCurrentDetailItem();
      const check = item && item.checklist.find(entry => entry.id === row.dataset.checkId);
      if (!check) return;
      if (action.dataset.action === 'edit') beginChecklistEdit(row);
      if (action.dataset.action === 'cancel') refreshChecklistUI();
      if (action.dataset.action === 'delete') { item.checklist = item.checklist.filter(entry => entry.id !== check.id); saveChecklistChanges(); }
    });

    checklistList.addEventListener('submit', (e) => {
      const form = e.target.closest('.checklist-edit-form');
      if (!form) return;
      e.preventDefault();
      const item = getCurrentDetailItem();
      const row = form.closest('.checklist-item');
      const check = item && item.checklist.find(entry => entry.id === row.dataset.checkId);
      const text = form.querySelector('input').value.trim();
      if (!check || !text) return;
      check.text = text.slice(0, 100);
      saveChecklistChanges();
    });

    // Drawer controls
    if (drawerToggleBtn) drawerToggleBtn.addEventListener('click', openDrawer);
    if (closeDrawerBtn) closeDrawerBtn.addEventListener('click', closeDrawer);
    if (sidebarBackdrop) sidebarBackdrop.addEventListener('click', closeDrawer);

    // Open Add Modal from various buttons
    if (sidebarAddBtn) sidebarAddBtn.addEventListener('click', openAddModal);
    if (openAddModalBtn) openAddModalBtn.addEventListener('click', openAddModal);
    if (mobileAddBtn) mobileAddBtn.addEventListener('click', openAddModal);
    if (settingsBtn) settingsBtn.addEventListener('click', openSettings);

    settingsForm.addEventListener('change', updateSettingsPreview);
    settingsForm.addEventListener('submit', (e) => {
      e.preventDefault();
      saveSettings(getSettingsDraft());
      closeSettings();
      showToast('화면 설정이 저장되었습니다.');
    });
    resetSettingsBtn.addEventListener('click', () => setSettingsFormValues(DEFAULT_SETTINGS));
    cancelSettingsBtn.addEventListener('click', closeSettings);
    closeSettingsBtn.addEventListener('click', closeSettings);
    settingsModal.addEventListener('click', (e) => { if (e.target === settingsModal) closeSettings(); });

    // Sidebar Category Filter
    // Bind each button directly so clicks also work reliably after visual/UI refactors.
    if (sidebarNav) sidebarNav.addEventListener('click', (e) => {
      const editBtn = e.target.closest('[data-edit-category]');
      if (editBtn) { e.preventDefault(); e.stopPropagation(); openCategoryModal(editBtn.dataset.editCategory); return; }
      const btn = e.target.closest('.nav-link[data-category]');
      if (!btn) return;
      state.activeCategory = btn.dataset.category;
      renderApp();
      if (window.innerWidth < 1024) closeDrawer();
    });

    // Mobile Category Chips
    if (mobileCategoryChips) mobileCategoryChips.addEventListener('click', (e) => {
      const chip = e.target.closest('.category-chip');
      if (chip && chip.dataset.category) {
        state.activeCategory = chip.dataset.category;
        renderApp();
      }
    });

    // Status Filter Tabs
    if (statusFilterTabs) statusFilterTabs.addEventListener('click', (e) => {
      const tab = e.target.closest('.status-tab-btn');
      if (tab && tab.dataset.status) {
        state.activeStatus = tab.dataset.status;
        renderApp();
      }
    });

    // Search Input
    if (searchInput) searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      clearSearchBtn.hidden = !e.target.value;
      renderApp();
    });

    if (clearSearchBtn) clearSearchBtn.addEventListener('click', () => {
      searchInput.value = '';
      state.searchQuery = '';
      clearSearchBtn.hidden = true;
      searchInput.focus();
      renderApp();
    });

    // Sort Dropdown
    if (sortSelect) sortSelect.addEventListener('change', (e) => {
      state.sortBy = e.target.value;
      renderApp();
    });

    // Form Modal Controls
    closeFormModalBtn.addEventListener('click', closeFormModal);
    cancelFormBtn.addEventListener('click', closeFormModal);
    ddayForm.addEventListener('submit', handleFormSubmit);
    addCategoryBtn.addEventListener('click', () => openCategoryModal());
    manageCategoryBtn.addEventListener('click', openCategoryManagement);
    closeCategoryManagementBtn.addEventListener('click', closeCategoryManagement);
    managementAddCategoryBtn.addEventListener('click', () => { closeCategoryManagement(); openCategoryModal(); });
    categoryManagementList.addEventListener('click', e => { const row=e.target.closest('[data-manage-category]'); if(!row)return; closeCategoryManagement(); openCategoryModal(row.dataset.manageCategory); });
    closeCategoryModalBtn.addEventListener('click', closeCategoryModal);
    cancelCategoryBtn.addEventListener('click', closeCategoryModal);
    categoryForm.addEventListener('submit', handleCategorySubmit);
    iconPicker.addEventListener('click', e => { const btn=e.target.closest('[data-icon]'); if(!btn)return; iconPicker.querySelectorAll('.selected').forEach(el=>el.classList.remove('selected')); btn.classList.add('selected'); updateCategoryPreview(); });
    colorPicker.addEventListener('click', e => { const btn=e.target.closest('[data-color]'); if(!btn)return; colorPicker.querySelectorAll('.selected').forEach(el=>el.classList.remove('selected')); btn.classList.add('selected'); updateCategoryPreview(); });
    categoryNameInput.addEventListener('input', updateCategoryPreview);
    deleteCategoryBtn.addEventListener('click', requestCategoryDelete);
    cancelCategoryMoveBtn.addEventListener('click', () => { categoryMoveModal.hidden=true; state.currentCategoryDeleteId=null; document.body.style.overflow=''; });
    confirmCategoryMoveBtn.addEventListener('click', confirmCategoryMoveAndDelete);

    // UX: Auto-sync endDate when startDate is chosen and endDate was empty or matching
    let prevStartDateVal = '';
    startDateInput.addEventListener('focus', () => {
      prevStartDateVal = startDateInput.value;
    });
    startDateInput.addEventListener('change', () => {
      if (!endDateInput.value || endDateInput.value === prevStartDateVal || endDateInput.value < startDateInput.value) {
        endDateInput.value = startDateInput.value;
      }
      prevStartDateVal = startDateInput.value;
      if (startDateInput.classList.contains('input-error')) {
        startDateError.textContent = '';
        startDateInput.classList.remove('input-error');
      }
    });

    endDateInput.addEventListener('input', () => {
      if (endDateInput.classList.contains('input-error')) {
        endDateError.textContent = '';
        endDateInput.classList.remove('input-error');
      }
    });

    // Delete Modal Controls
    cancelDeleteBtn.addEventListener('click', closeDeleteModal);
    confirmDeleteBtn.addEventListener('click', confirmDelete);

    // Backdrop Click for Modals
    formModal.addEventListener('click', (e) => {
      if (e.target === formModal) closeFormModal();
    });

    deleteModal.addEventListener('click', (e) => {
      if (e.target === deleteModal) closeDeleteModal();
    });

    // Global Keyboard Support
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (!formModal.hidden) {
          closeFormModal();
        } else if (!settingsModal.hidden) {
          closeSettings();
        } else if (!categoryModal.hidden) {
          closeCategoryModal();
        } else if (!categoryMoveModal.hidden) {
          categoryMoveModal.hidden = true; document.body.style.overflow = '';
        } else if (!categoryManagementModal.hidden) {
          closeCategoryManagement();
        } else if (!detailModal.hidden) {
          closeDetailModal();
        } else if (!deleteModal.hidden) {
          closeDeleteModal();
        } else if (sidebar.classList.contains('active')) {
          closeDrawer();
        }
      }
    });

    // Event delegation for card action buttons in Dashboard
    cardsContainer.addEventListener('click', (e) => {
      const editBtn = e.target.closest('.btn-action-edit');
      if (editBtn) {
        const id = editBtn.dataset.id;
        if (id) openEditModal(id);
        return;
      }

      const deleteBtn = e.target.closest('.btn-action-delete');
      if (deleteBtn) {
        const id = deleteBtn.dataset.id;
        if (id) openDeleteModal(id);
        return;
      }

      const card = e.target.closest('.dday-card[data-id]');
      if (card) openDetailModal(card.dataset.id);
    });

    cardsContainer.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.dday-card[data-id]')) {
        e.preventDefault();
        openDetailModal(e.target.dataset.id);
      }
    });

    // Input error clears
    titleInput.addEventListener('input', () => {
      if (titleInput.classList.contains('input-error')) {
        titleError.textContent = '';
        titleInput.classList.remove('input-error');
      }
    });
  }

  // ==========================================
  // App Initialization
  // ==========================================
  function initApp() {
    state.settings = loadSettings();
    applySettings(state.settings);
    state.categories = loadCategories();
    syncCategoryMap();
    state.items = loadDDays();
    initEventListeners();
    renderApp();
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }

})();
