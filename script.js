/**
 * D-Day & Schedule Web Application (v2.0 Stitch UI)
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
  const MEMO_STORAGE_KEY = 'daymark-v5-memos';
  const MEMO_CATEGORY_STORAGE_KEY = 'daymark-v5-memo-categories';
  const PRIVACY_PIN_STORAGE_KEY = 'daymark-hidden-pin-hash';
  const PRIVACY_SESSION_KEY = 'daymark-hidden-unlocked';
  const DATA_MANAGEMENT_HISTORY_KEY = 'daymark-data-management-history';
  const AUTO_BACKUP_SETTINGS_KEY = 'daymark-auto-backup-settings';
  const AUTO_BACKUP_SNAPSHOTS_KEY = 'daymark-auto-backup-snapshots';
  const AUTO_BACKUP_MAX_SNAPSHOTS = 3;
  const LEGACY_STORAGE_KEY = 'dday-count-items';
  const LEGACY_CATEGORY_STORAGE_KEY = 'dday-count-categories';
  const LEGACY_SETTINGS_STORAGE_KEY = 'dday-count-settings';
  const APP_VERSION = 'v1.3';
  const BACKUP_FORMAT_VERSION = '1.0';
  const BACKUP_STORAGE_KEYS = [STORAGE_KEY, CATEGORY_STORAGE_KEY, SETTINGS_STORAGE_KEY, MEMO_STORAGE_KEY, MEMO_CATEGORY_STORAGE_KEY, PRIVACY_PIN_STORAGE_KEY, LEGACY_STORAGE_KEY, LEGACY_CATEGORY_STORAGE_KEY, LEGACY_SETTINGS_STORAGE_KEY];
  const DEFAULT_SETTINGS = { fontFamily: 'system', fontSize: 'medium', showLunarCalendar: false, viewMode: 'list', memoViewMode: 'card' };
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
  const REPEAT_LABELS = { weekly: '매주', monthly: '매월', yearly: '매년' };
  const LUNAR_YEAR_MIN = 1900;
  const LUNAR_YEAR_MAX = 2100;

  function migrateLegacyStorageKeys() {
    try {
      if (!localStorage.getItem(STORAGE_KEY) && localStorage.getItem(LEGACY_STORAGE_KEY)) {
        localStorage.setItem(STORAGE_KEY, localStorage.getItem(LEGACY_STORAGE_KEY));
      }
      if (!localStorage.getItem(CATEGORY_STORAGE_KEY) && localStorage.getItem(LEGACY_CATEGORY_STORAGE_KEY)) {
        localStorage.setItem(CATEGORY_STORAGE_KEY, localStorage.getItem(LEGACY_CATEGORY_STORAGE_KEY));
      }
      if (!localStorage.getItem(SETTINGS_STORAGE_KEY) && localStorage.getItem(LEGACY_SETTINGS_STORAGE_KEY)) {
        localStorage.setItem(SETTINGS_STORAGE_KEY, localStorage.getItem(LEGACY_SETTINGS_STORAGE_KEY));
      }
    } catch (error) {
      console.warn('DayMark legacy storage migration skipped:', error);
    }
  }

  migrateLegacyStorageKeys();
  const DEFAULT_CATEGORIES = [
    { id: 'work', name: '업무', icon: 'briefcase', color: '#4F46E5', isDefault: true },
    { id: 'company', name: '회사', icon: 'building', color: '#7C3AED', isDefault: true },
    { id: 'personal', name: '개인', icon: 'user', color: '#059669', isDefault: true },
    { id: 'other', name: '기타', icon: 'pin', color: '#64748B', isDefault: true }
  ];
  const DEFAULT_MEMO_CATEGORIES = [
    { id:'memo-experiment', name:'실험' },
    { id:'memo-draft', name:'기안' },
    { id:'memo-meeting', name:'회의' },
    { id:'memo-idea', name:'아이디어' },
    { id:'memo-other', name:'기타' }
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
    memos: [],
    memoCategories: [],
    categories: [],
    settings: { ...DEFAULT_SETTINGS },
    currentView: 'dashboard', // 'dashboard' | 'calendar' | 'memo'
    activeCategory: 'all',    // 'all' | 'work' | 'company' | 'personal' | 'other'
    activeStatus: 'all',      // 'all' | 'upcoming' | 'ongoing' | 'completed'
    searchQuery: '',
    memoSearchQuery: '',
    activeMemoCategory: 'all',
    memoViewMode: 'card',     // 'card' | 'list' | 'sticky'
    sortBy: 'closest',        // 'closest' | 'farthest' | 'newest' | 'oldest'
    viewMode: 'list',         // 'card' | 'list'
    
    // Calendar Navigation State
    calendarYear: now.getFullYear(),
    calendarMonth: now.getMonth(), // 0-indexed (0 = Jan, 7 = Aug)
    selectedCalendarDate: toIsoDateString(now),

    currentEditId: null,
    currentMemoEditId: null,
    currentMemoDeleteId: null,
    currentDeleteId: null,
    currentDetailId: null,
    currentCategoryEditId: null,
    currentCategoryDeleteId: null,
    pendingPrivacyAction: null
  };

  // ==========================================
  // DOM Elements
  // ==========================================
  const currentDateDisplay = document.getElementById('currentDateDisplay');
  const heroSection = document.getElementById('heroSection');
  const cardsContainer = document.getElementById('cardsContainer');
  const listHeaderTitle = document.getElementById('listHeaderTitle');
  const toastContainer = document.getElementById('toastContainer');

  // View Switch Elements
  const tabDashboardBtn = document.getElementById('tabDashboardBtn');
  const tabCalendarBtn = document.getElementById('tabCalendarBtn');
  const tabMemoBtn = document.getElementById('tabMemoBtn');
  const dashboardView = document.getElementById('dashboardView');
  const calendarView = document.getElementById('calendarView');
  const memoView = document.getElementById('memoView');
  const memoList = document.getElementById('memoList');
  const memoSearchInput = document.getElementById('memoSearchInput');
  const clearMemoSearchBtn = document.getElementById('clearMemoSearchBtn');
  const openMemoModalBtn = document.getElementById('openMemoModalBtn');
  const memoViewModeButtons = document.querySelectorAll('[data-memo-view-mode]');
  const memoCategoryBar = document.getElementById('memoCategoryBar');
  const memoModal = document.getElementById('memoModal');
  const memoModalTitle = document.getElementById('memoModalTitle');
  const memoForm = document.getElementById('memoForm');
  const memoEditId = document.getElementById('memoEditId');
  const memoTitleInput = document.getElementById('memoTitleInput');
  const memoContentInput = document.getElementById('memoContentInput');
  const memoCategorySelect = document.getElementById('memoCategorySelect');
  const memoLinkedEventSelect = document.getElementById('memoLinkedEventSelect');
  const memoFormError = document.getElementById('memoFormError');
  const closeMemoModalBtn = document.getElementById('closeMemoModalBtn');
  const cancelMemoBtn = document.getElementById('cancelMemoBtn');
  const memoDeleteModal = document.getElementById('memoDeleteModal');
  const closeMemoDeleteBtn = document.getElementById('closeMemoDeleteBtn');
  const cancelMemoDeleteBtn = document.getElementById('cancelMemoDeleteBtn');
  const confirmMemoDeleteBtn = document.getElementById('confirmMemoDeleteBtn');
  const memoCategoryModal = document.getElementById('memoCategoryModal');
  const closeMemoCategoryModalBtn = document.getElementById('closeMemoCategoryModalBtn');
  const doneMemoCategoryBtn = document.getElementById('doneMemoCategoryBtn');
  const memoCategoryForm = document.getElementById('memoCategoryForm');
  const memoCategoryNameInput = document.getElementById('memoCategoryNameInput');
  const memoCategoryError = document.getElementById('memoCategoryError');
  const memoCategoryManagementList = document.getElementById('memoCategoryManagementList');

  // Calendar Elements
  const calTodayBtn = document.getElementById('calTodayBtn');
  const calPrevMonthBtn = document.getElementById('calPrevMonthBtn');
  const calNextMonthBtn = document.getElementById('calNextMonthBtn');
  const calMonthTitle = document.getElementById('calMonthTitle');
  const calCategoryIndicator = document.getElementById('calCategoryIndicator');
  const calendarGrid = document.getElementById('calendarGrid');
  const mobileCalendarAgenda = document.getElementById('mobileCalendarAgenda');
  const lunarCalendarToggle = document.getElementById('lunarCalendarToggle');
  const calendarMoreModal = document.getElementById('calendarMoreModal');
  const calendarMoreTitle = document.getElementById('calendarMoreTitle');
  const calendarMoreList = document.getElementById('calendarMoreList');
  const closeCalendarMoreBtn = document.getElementById('closeCalendarMoreBtn');

  // Sidebar & Drawer Elements
  const sidebar = document.getElementById('sidebar');
  const sidebarBackdrop = document.getElementById('sidebarBackdrop');
  const drawerToggleBtn = document.getElementById('drawerToggleBtn');
  const closeDrawerBtn = document.getElementById('closeDrawerBtn');
  const sidebarAddBtn = document.getElementById('sidebarAddBtn');
  const openAddModalBtn = document.getElementById('openAddModalBtn');
  const mobileAddBtn = document.getElementById('mobileAddBtn');
  const miniCalendarTitle = document.getElementById('miniCalendarTitle');
  const miniCalendarDays = document.getElementById('miniCalendarDays');

  // Sidebar Category Badges
  const countAll = document.getElementById('countAll');
  const countWork = document.getElementById('countWork');
  const countCompany = document.getElementById('countCompany');
  const countPersonal = document.getElementById('countPersonal');
  const countOther = document.getElementById('countOther');
  const sidebarNav = document.querySelector('.sidebar-nav');
  const mobileCategoryChips = document.getElementById('mobileCategoryChips');
  const categoryNavList = document.getElementById('categoryNavList');
  const manageCategoryBtn = document.getElementById('manageCategoryBtn');
  const categoryRadioGroup = document.getElementById('categoryRadioGroup');

  // Dashboard Controls Elements
  const searchInput = document.getElementById('searchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const sortSelect = document.getElementById('sortSelect');
  const statusFilterTabs = document.getElementById('statusFilterTabs');
  const viewModeButtons = document.querySelectorAll('[data-view-mode]');

  // Form Modal Elements
  const formModal = document.getElementById('formModal');
  const ddayForm = document.getElementById('ddayForm');
  const modalTitle = document.getElementById('modalTitle');
  const editItemId = document.getElementById('editItemId');
  const titleInput = document.getElementById('titleInput');
  const startDateInput = document.getElementById('startDateInput');
  const endDateInput = document.getElementById('endDateInput');
  const solarDateFields = document.getElementById('solarDateFields');
  const lunarDateFields = document.getElementById('lunarDateFields');
  const lunarYearSelect = document.getElementById('lunarYearSelect');
  const lunarYearField = document.getElementById('lunarYearField');
  const lunarMonthSelect = document.getElementById('lunarMonthSelect');
  const lunarDaySelect = document.getElementById('lunarDaySelect');
  const lunarLeapCheckbox = document.getElementById('lunarLeapCheckbox');
  const lunarDateError = document.getElementById('lunarDateError');
  const importantCheckbox = document.getElementById('importantCheckbox');
  const repeatCheckbox = document.getElementById('repeatCheckbox');
  const repeatTypeSelect = document.getElementById('repeatTypeSelect');
  const solarRepeatFields = document.getElementById('solarRepeatFields');
  const solarRepeatFieldLabel = document.getElementById('solarRepeatFieldLabel');
  const repeatWeekdaySelect = document.getElementById('repeatWeekdaySelect');
  const repeatMonthSelect = document.getElementById('repeatMonthSelect');
  const repeatDaySelect = document.getElementById('repeatDaySelect');
  const solarRepeatError = document.getElementById('solarRepeatError');
  const hiddenCheckbox = document.getElementById('hiddenCheckbox');
  const titleError = document.getElementById('titleError');
  const startDateError = document.getElementById('startDateError');
  const endDateError = document.getElementById('endDateError');
  const closeFormModalBtn = document.getElementById('closeFormModalBtn');
  const cancelFormBtn = document.getElementById('cancelFormBtn');
  const saveFormBtn = document.getElementById('saveFormBtn');
  const deleteFormItemBtn = document.getElementById('deleteFormItemBtn');

  // Detail Modal Elements
  const detailModal = document.getElementById('detailModal');
  const detailHeaderTags = document.getElementById('detailHeaderTags');
  const detailTitle = document.getElementById('detailTitle');
  const detailDDayBadge = document.getElementById('detailDDayBadge');
  const detailDateRange = document.getElementById('detailDateRange');
  const detailLinkedMemosSection = document.getElementById('detailLinkedMemosSection');
  const detailLinkedMemosList = document.getElementById('detailLinkedMemosList');
  const detailRepeatRow = document.getElementById('detailRepeatRow');
  const detailRepeatValue = document.getElementById('detailRepeatValue');
  const detailLunarRow = document.getElementById('detailLunarRow');
  const detailLunarValue = document.getElementById('detailLunarValue');
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
  const hiddenItemsBtn = document.getElementById('hiddenItemsBtn');
  const pinModal = document.getElementById('pinModal');
  const pinForm = document.getElementById('pinForm');
  const pinInput = document.getElementById('pinInput');
  const pinInputLabel = document.getElementById('pinInputLabel');
  const pinError = document.getElementById('pinError');
  const pinModalTitle = document.getElementById('pinModalTitle');
  const pinModalSubtitle = document.getElementById('pinModalSubtitle');
  const closePinModalBtn = document.getElementById('closePinModalBtn');
  const cancelPinBtn = document.getElementById('cancelPinBtn');
  const confirmPinBtn = document.getElementById('confirmPinBtn');
  const pinConfirmInput = document.getElementById('pinConfirmInput');
  const pinConfirmGroup = document.getElementById('pinConfirmGroup');
  const pinLostNotice = document.getElementById('pinLostNotice');
  const hiddenItemsModal = document.getElementById('hiddenItemsModal');
  const hiddenItemsList = document.getElementById('hiddenItemsList');
  const closeHiddenItemsBtn = document.getElementById('closeHiddenItemsBtn');
  const pinRequiredModal = document.getElementById('pinRequiredModal');
  const closePinRequiredBtn = document.getElementById('closePinRequiredBtn');
  const cancelPinRequiredBtn = document.getElementById('cancelPinRequiredBtn');
  const openPinSettingsBtn = document.getElementById('openPinSettingsBtn');
  const changePinModal = document.getElementById('changePinModal');
  const changePinForm = document.getElementById('changePinForm');
  const oldPinInput = document.getElementById('oldPinInput');
  const newPinInput = document.getElementById('newPinInput');
  const newPinConfirmInput = document.getElementById('newPinConfirmInput');
  const changePinError = document.getElementById('changePinError');
  const closeChangePinBtn = document.getElementById('closeChangePinBtn');
  const cancelChangePinBtn = document.getElementById('cancelChangePinBtn');
  const calendarJumpModal = document.getElementById('calendarJumpModal');
  const calendarJumpForm = document.getElementById('calendarJumpForm');
  const calendarJumpYear = document.getElementById('calendarJumpYear');
  const calendarJumpMonth = document.getElementById('calendarJumpMonth');
  const closeCalendarJumpBtn = document.getElementById('closeCalendarJumpBtn');
  const cancelCalendarJumpBtn = document.getElementById('cancelCalendarJumpBtn');

  // Typography Settings Elements
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsModal = document.getElementById('settingsModal');
  const settingsForm = document.getElementById('settingsForm');
  const closeSettingsBtn = document.getElementById('closeSettingsBtn');
  const cancelSettingsBtn = document.getElementById('cancelSettingsBtn');
  const resetSettingsBtn = document.getElementById('resetSettingsBtn');
  const fontFamilySelect = document.getElementById('fontFamilySelect');
  const settingsPreview = document.getElementById('settingsPreview');
  const settingsSecuritySection = document.getElementById('settingsSecuritySection');
  const settingsPinStatus = document.getElementById('settingsPinStatus');
  const managePinBtn = document.getElementById('managePinBtn');
  const resetPinBtn = document.getElementById('resetPinBtn');
  const resetPinModal = document.getElementById('resetPinModal');
  const resetPinForm = document.getElementById('resetPinForm');
  const resetCurrentPinInput = document.getElementById('resetCurrentPinInput');
  const resetPinError = document.getElementById('resetPinError');
  const closeResetPinBtn = document.getElementById('closeResetPinBtn');
  const cancelResetPinBtn = document.getElementById('cancelResetPinBtn');
  const confirmResetPinModal = document.getElementById('confirmResetPinModal');
  const closeConfirmResetPinBtn = document.getElementById('closeConfirmResetPinBtn');
  const cancelConfirmResetPinBtn = document.getElementById('cancelConfirmResetPinBtn');
  const confirmResetPinBtn = document.getElementById('confirmResetPinBtn');
  const backupDataBtn = document.getElementById('backupDataBtn');
  const restoreDataBtn = document.getElementById('restoreDataBtn');
  const restoreFileInput = document.getElementById('restoreFileInput');
  const restoreConfirmModal = document.getElementById('restoreConfirmModal');
  const closeRestoreConfirmBtn = document.getElementById('closeRestoreConfirmBtn');
  const cancelRestoreBtn = document.getElementById('cancelRestoreBtn');
  const confirmRestoreBtn = document.getElementById('confirmRestoreBtn');
  const restoreCreatedAt = document.getElementById('restoreCreatedAt');
  const restoreItemCount = document.getElementById('restoreItemCount');
  const restoreCategoryCount = document.getElementById('restoreCategoryCount');
  const restoreAppVersion = document.getElementById('restoreAppVersion');
  const restoreFormatVersion = document.getElementById('restoreFormatVersion');
  const lastBackupAt = document.getElementById('lastBackupAt');
  const lastRestoreAt = document.getElementById('lastRestoreAt');
  const restoredBackupAt = document.getElementById('restoredBackupAt');
  const autoBackupEnabled = document.getElementById('autoBackupEnabled');
  const autoBackupEnabledLabel = document.getElementById('autoBackupEnabledLabel');
  const autoBackupPeriod = document.getElementById('autoBackupPeriod');
  const lastAutoBackupAt = document.getElementById('lastAutoBackupAt');
  const autoBackupCount = document.getElementById('autoBackupCount');
  const manageAutoBackupsBtn = document.getElementById('manageAutoBackupsBtn');
  const autoBackupManagerModal = document.getElementById('autoBackupManagerModal');
  const closeAutoBackupManagerBtn = document.getElementById('closeAutoBackupManagerBtn');
  const doneAutoBackupManagerBtn = document.getElementById('doneAutoBackupManagerBtn');
  const autoBackupList = document.getElementById('autoBackupList');
  const deleteAllAutoBackupsBtn = document.getElementById('deleteAllAutoBackupsBtn');
  const autoBackupConfirmModal = document.getElementById('autoBackupConfirmModal');
  const discardConfirmModal = document.getElementById('discardConfirmModal');
  const closeDiscardConfirmBtn = document.getElementById('closeDiscardConfirmBtn');
  const continueEditingBtn = document.getElementById('continueEditingBtn');
  const confirmDiscardBtn = document.getElementById('confirmDiscardBtn');
  let scheduleFormBaseline = '';
  let memoFormBaseline = '';
  let categoryFormBaseline = '';
  let pendingDiscardAction = null;
  const autoBackupConfirmTitle = document.getElementById('autoBackupConfirmTitle');
  const autoBackupConfirmMessage = document.getElementById('autoBackupConfirmMessage');
  const autoBackupConfirmSubtext = document.getElementById('autoBackupConfirmSubtext');
  const closeAutoBackupConfirmBtn = document.getElementById('closeAutoBackupConfirmBtn');
  const cancelAutoBackupActionBtn = document.getElementById('cancelAutoBackupActionBtn');
  const confirmAutoBackupActionBtn = document.getElementById('confirmAutoBackupActionBtn');
  let pendingRestoreBackup = null;
  let pendingAutoBackupAction = null;

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

  let lunarDateFormatter = null;
  try {
    lunarDateFormatter = new Intl.DateTimeFormat('ko-KR-u-ca-chinese', {
      year: 'numeric', month: 'numeric', day: 'numeric'
    });
  } catch (error) {
    console.warn('이 브라우저에서는 음력 표시를 지원하지 않습니다.', error);
  }

  function getLunarDateInfo(dateVal) {
    if (!lunarDateFormatter) return null;
    try {
      const date = typeof dateVal === 'string' ? parseLocalDate(dateVal) : dateVal;
      const parts = lunarDateFormatter.formatToParts(date);
      const getPart = type => parts.find(part => part.type === type)?.value || '';
      const monthText = getPart('month');
      const month = Number((monthText.match(/\d+/) || [0])[0]);
      const day = Number(getPart('day'));
      const year = Number(getPart('relatedYear') || getPart('year'));
      if (!month || !day) return null;
      return { year, month, day, isLeapMonth: /윤|leap|bis/i.test(monthText) };
    } catch (error) {
      return null;
    }
  }

  function formatLunarCompact(dateVal) {
    const lunar = getLunarDateInfo(dateVal);
    if (!lunar) return '';
    return `${lunar.isLeapMonth ? '윤' : '음 '}${lunar.month}.${lunar.day}`;
  }

  function formatLunarFull(dateVal) {
    const lunar = getLunarDateInfo(dateVal);
    if (!lunar) return '';
    return `음력 ${lunar.year}년 ${lunar.isLeapMonth ? '윤' : ''}${lunar.month}월 ${lunar.day}일`;
  }

  const lunarToSolarCache = new Map();
  function lunarToSolar(year, month, day, isLeapMonth = false) {
    const key = `${year}-${month}-${day}-${isLeapMonth ? 1 : 0}`;
    if (lunarToSolarCache.has(key)) return lunarToSolarCache.get(key);
    const start = new Date(year, 0, 1);
    const end = new Date(year + 1, 2, 1);
    for (let cursor = start; cursor <= end; cursor = addDays(cursor, 1)) {
      const lunar = getLunarDateInfo(cursor);
      if (lunar && lunar.year === year && lunar.month === month && lunar.day === day && lunar.isLeapMonth === isLeapMonth) {
        const result = toIsoDateString(cursor);
        lunarToSolarCache.set(key, result);
        return result;
      }
    }
    lunarToSolarCache.set(key, null);
    return null;
  }

  function normalizeLunar(lunar) {
    if (!lunar) return null;
    const year = Number(lunar.year), month = Number(lunar.month), day = Number(lunar.day);
    if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day) || month < 1 || month > 12 || day < 1 || day > 30) return null;
    return { year, month, day, isLeapMonth: Boolean(lunar.isLeapMonth) };
  }

  function isLunarItem(item) {
    return item.calendarType === 'lunar' && Boolean(normalizeLunar(item.lunar));
  }

  function formatLunarOriginal(item, year = null) {
    const lunar = normalizeLunar(item.lunar);
    if (!lunar) return '';
    return `${year || lunar.year}년 ${lunar.isLeapMonth ? '윤' : ''}${lunar.month}월 ${lunar.day}일`;
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

  function normalizeRepeat(repeat) {
    const enabled = Boolean(repeat && repeat.enabled && REPEAT_LABELS[repeat.type]);
    const normalized = { enabled, type: enabled ? repeat.type : null };
    if (enabled && Number.isInteger(Number(repeat.repeatWeekday)) && Number(repeat.repeatWeekday) >= 0 && Number(repeat.repeatWeekday) <= 6) normalized.repeatWeekday = Number(repeat.repeatWeekday);
    if (enabled && Number.isInteger(Number(repeat.repeatDay)) && Number(repeat.repeatDay) >= 1 && Number(repeat.repeatDay) <= 31) normalized.repeatDay = Number(repeat.repeatDay);
    if (enabled && Number.isInteger(Number(repeat.repeatMonth)) && Number(repeat.repeatMonth) >= 1 && Number(repeat.repeatMonth) <= 12) normalized.repeatMonth = Number(repeat.repeatMonth);
    return normalized;
  }

  function normalizeCompletedOccurrences(value) {
    if (!Array.isArray(value)) return [];
    return [...new Set(value.filter(date => typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)))];
  }

  function isRepeatingItem(item) {
    return normalizeRepeat(item.repeat).enabled;
  }

  function isTaskOccurrenceCompleted(item, occurrenceStart = null) {
    if (isRepeatingItem(item)) {
      return Boolean(occurrenceStart) && normalizeCompletedOccurrences(item.completedOccurrences).includes(occurrenceStart);
    }
    return item.isTaskCompleted === true;
  }

  function toggleTaskCompletion(id, occurrenceStart = null) {
    const item = state.items.find(entry => entry.id === id);
    if (!item) return;
    if (isRepeatingItem(item)) {
      const occurrenceKey = occurrenceStart || getEffectiveOccurrence(item).startDate;
      const completed = new Set(normalizeCompletedOccurrences(item.completedOccurrences));
      if (completed.has(occurrenceKey)) completed.delete(occurrenceKey);
      else completed.add(occurrenceKey);
      item.completedOccurrences = [...completed].sort();
    } else {
      item.isTaskCompleted = item.isTaskCompleted !== true;
    }
    saveDDays(state.items);
    renderApp();
  }

  function getRepeatRule(item) {
    const repeat = normalizeRepeat(item.repeat);
    const base = parseLocalDate(item.startDate);
    return { ...repeat, repeatWeekday: repeat.repeatWeekday ?? base.getDay(), repeatDay: repeat.repeatDay ?? base.getDate(), repeatMonth: repeat.repeatMonth ?? (base.getMonth() + 1) };
  }

  function addDays(date, days) {
    const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    result.setDate(result.getDate() + days);
    return result;
  }

  function getDurationDays(item) {
    const start = parseLocalDate(item.startDate);
    const end = parseLocalDate(item.endDate || item.startDate);
    return Math.max(0, Math.round((end - start) / 86400000));
  }

  function monthlyOccurrence(year, month, baseDay) {
    const lastDay = new Date(year, month + 1, 0).getDate();
    return new Date(year, month, Math.min(baseDay, lastDay));
  }

  function yearlyOccurrence(year, baseMonth, baseDay) {
    return monthlyOccurrence(year, baseMonth, baseDay);
  }

  function makeOccurrence(item, startDate) {
    const endDate = addDays(startDate, getDurationDays(item));
    return { startDate: toIsoDateString(startDate), endDate: toIsoDateString(endDate) };
  }

  function getEffectiveOccurrence(item, referenceDate = getTodayMidnight()) {
    const repeat = getRepeatRule(item);
    if (isLunarItem(item)) {
      if (!repeat.enabled) return { startDate: item.startDate, endDate: item.startDate };
      const lunar = normalizeLunar(item.lunar);
      const currentLunarYear = getLunarDateInfo(referenceDate)?.year || referenceDate.getFullYear();
      for (let year = currentLunarYear; year <= Math.min(LUNAR_YEAR_MAX, currentLunarYear + 30); year += 1) {
        const solarDate = lunarToSolar(year, lunar.month, lunar.day, lunar.isLeapMonth);
        if (solarDate && solarDate >= toIsoDateString(referenceDate)) return { startDate: solarDate, endDate: solarDate, lunarYear: year };
      }
      return { startDate: item.startDate, endDate: item.startDate };
    }
    if (!repeat.enabled) return { startDate: item.startDate, endDate: item.endDate || item.startDate };

    const base = parseLocalDate(item.startDate);
    const threshold = addDays(referenceDate, -getDurationDays(item));
    let candidate = base;

    if (repeat.type === 'weekly') {
      candidate = addDays(threshold, (repeat.repeatWeekday - threshold.getDay() + 7) % 7);
      if (candidate < base) candidate = addDays(candidate, 7);
      while (addDays(candidate, getDurationDays(item)) < referenceDate) candidate = addDays(candidate, 7);
    } else if (repeat.type === 'monthly') {
      let year = threshold.getFullYear();
      let month = threshold.getMonth();
      candidate = monthlyOccurrence(year, month, repeat.repeatDay);
      while (candidate < base || addDays(candidate, getDurationDays(item)) < referenceDate) {
        month += 1;
        candidate = monthlyOccurrence(year, month, repeat.repeatDay);
        year = candidate.getFullYear();
        month = candidate.getMonth();
      }
    } else {
      let year = Math.max(base.getFullYear(), threshold.getFullYear());
      candidate = yearlyOccurrence(year, repeat.repeatMonth - 1, repeat.repeatDay);
      while (candidate < base || addDays(candidate, getDurationDays(item)) < referenceDate) {
        year += 1;
        candidate = yearlyOccurrence(year, repeat.repeatMonth - 1, repeat.repeatDay);
      }
    }
    return makeOccurrence(item, candidate);
  }

  function getOccurrencesInRange(item, rangeStartStr, rangeEndStr) {
    const repeat = getRepeatRule(item);
    const originalEnd = item.endDate || item.startDate;
    if (isLunarItem(item) && repeat.enabled) {
      const lunar = normalizeLunar(item.lunar);
      const occurrences = [];
      const startYear = Math.max(LUNAR_YEAR_MIN, parseLocalDate(rangeStartStr).getFullYear() - 1);
      const endYear = Math.min(LUNAR_YEAR_MAX, parseLocalDate(rangeEndStr).getFullYear() + 1);
      for (let year = startYear; year <= endYear; year += 1) {
        const solarDate = lunarToSolar(year, lunar.month, lunar.day, lunar.isLeapMonth);
        if (solarDate && solarDate >= rangeStartStr && solarDate <= rangeEndStr) occurrences.push({ ...item, startDate: solarDate, endDate: solarDate, occurrenceLunarYear: year });
      }
      return occurrences;
    }
    if (!repeat.enabled) {
      return item.startDate <= rangeEndStr && originalEnd >= rangeStartStr ? [{ ...item }] : [];
    }

    const rangeStart = parseLocalDate(rangeStartStr);
    const rangeEnd = parseLocalDate(rangeEndStr);
    const threshold = addDays(rangeStart, -getDurationDays(item));
    const base = parseLocalDate(item.startDate);
    const occurrences = [];
    const addOccurrence = start => {
      if (start < base) return;
      const occurrence = makeOccurrence(item, start);
      if (occurrence.startDate <= rangeEndStr && occurrence.endDate >= rangeStartStr) {
        occurrences.push({ ...item, startDate: occurrence.startDate, endDate: occurrence.endDate });
      }
    };

    if (repeat.type === 'weekly') {
      let start = addDays(threshold, (repeat.repeatWeekday - threshold.getDay() + 7) % 7);
      while (start < base) start = addDays(start, 7);
      for (; start <= rangeEnd; start = addDays(start, 7)) addOccurrence(start);
    } else if (repeat.type === 'monthly') {
      let cursor = new Date(threshold.getFullYear(), threshold.getMonth(), 1);
      while (cursor <= rangeEnd) {
        addOccurrence(monthlyOccurrence(cursor.getFullYear(), cursor.getMonth(), repeat.repeatDay));
        cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      }
    } else {
      for (let year = Math.max(base.getFullYear(), threshold.getFullYear()); year <= rangeEnd.getFullYear(); year += 1) {
        addOccurrence(yearlyOccurrence(year, repeat.repeatMonth - 1, repeat.repeatDay));
      }
    }
    return occurrences;
  }

  function getRepeatLabel(item) {
    const repeat = normalizeRepeat(item.repeat);
    return repeat.enabled ? REPEAT_LABELS[repeat.type] : '';
  }

  function getDetailedRepeatLabel(item) {
    const repeat = getRepeatRule(item);
    if (!repeat.enabled) return '';
    if (isLunarItem(item)) return `매년 · 음력 ${item.lunar.month}월 ${item.lunar.day}일${item.lunar.isLeapMonth ? ' (윤달)' : ''}`;
    if (repeat.type === 'weekly') return `매주 · ${['일요일','월요일','화요일','수요일','목요일','금요일','토요일'][repeat.repeatWeekday]}`;
    if (repeat.type === 'monthly') return `매월 · ${repeat.repeatDay}일`;
    return `매년 · ${repeat.repeatMonth}월 ${repeat.repeatDay}일`;
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
      if (Array.isArray(parsed) && parsed.length) {
        const migrated = parsed.filter(cat => cat && cat.id && cat.name).map(cat => ({ id:cat.id, name:cat.name, color:cat.color || '#64748B', icon:ICON_NAMES.includes(cat.icon) ? cat.icon : 'pin', isDefault:Boolean(cat.isDefault) }));
        localStorage.setItem(CATEGORY_STORAGE_KEY, JSON.stringify(migrated));
        return migrated;
      }
    } catch (e) { console.error('Failed to parse category data:', e); }
    localStorage.setItem(CATEGORY_STORAGE_KEY, JSON.stringify(DEFAULT_CATEGORIES));
    return DEFAULT_CATEGORIES.map(cat => ({ ...cat }));
  }

  function saveCategories() {
    try { localStorage.setItem(CATEGORY_STORAGE_KEY, JSON.stringify(state.categories)); } catch (e) { console.error('Failed to save category data:', e); showToast('카테고리 저장 중 오류가 발생했습니다.'); }
    syncCategoryMap();
  }

  function getCategoryById(id) { return CATEGORIES[id] || CATEGORIES.other || CATEGORIES[state.categories[0]?.id]; }

  function isHiddenUnlocked() { return sessionStorage.getItem(PRIVACY_SESSION_KEY) === 'true'; }

  async function hashPin(pin) {
    const data = new TextEncoder().encode(`DayMark:v1.1:${pin}`);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  }

  function closePinModal() { pinModal.hidden=true; pinInput.value=''; pinConfirmInput.value=''; pinError.textContent=''; state.pendingPrivacyAction=null; document.body.style.overflow=(formModal.hidden&&settingsModal.hidden)?'':'hidden'; }
  function requestPin(action, createMode = false) {
    state.pendingPrivacyAction = { action, createMode };
    pinModalTitle.textContent = createMode ? 'PIN 설정' : '숨김 일정';
    pinModalSubtitle.textContent = createMode ? '숨김 일정을 보호할 4자리 PIN을 설정하세요.' : '보호된 일정입니다. 4자리 PIN을 입력하세요.';
    pinInputLabel.textContent = createMode ? '새 PIN' : 'PIN';
    confirmPinBtn.textContent = createMode ? '설정' : '확인';
    pinConfirmGroup.hidden=!createMode; pinLostNotice.hidden=!createMode; pinInput.value=''; pinConfirmInput.value=''; pinError.textContent=''; pinModal.hidden=false; document.body.style.overflow='hidden';
    setTimeout(() => pinInput.focus(), 50);
  }

  async function handlePinSubmit(event) {
    event.preventDefault();
    const pin = pinInput.value.trim();
    if (!/^\d{4}$/.test(pin)) { pinError.textContent = '숫자 4자리를 입력해 주세요.'; return; }
    const pending = state.pendingPrivacyAction;
    if (!pending) return;
    if (pending.createMode && pinConfirmInput.value.trim() !== pin) { pinError.textContent='PIN이 일치하지 않습니다.'; return; }
    const pinHash = await hashPin(pin);
    const savedHash = localStorage.getItem(PRIVACY_PIN_STORAGE_KEY);
    if (pending.createMode) localStorage.setItem(PRIVACY_PIN_STORAGE_KEY, pinHash);
    else if (!savedHash || savedHash !== pinHash) { pinError.textContent = 'PIN이 올바르지 않습니다.'; return; }
    sessionStorage.setItem(PRIVACY_SESSION_KEY, 'true');
    const action = pending.action;
    pinModal.hidden = true; pinInput.value = ''; pinError.textContent = ''; state.pendingPrivacyAction = null; document.body.style.overflow = '';
    if (pending.createMode) showToast('PIN이 설정되었습니다.');
    if (typeof action === 'function') action();
  }

  function showPinRequired() { pinRequiredModal.hidden = false; document.body.style.overflow = 'hidden'; setTimeout(() => openPinSettingsBtn.focus(), 50); }
  function closePinRequired() { pinRequiredModal.hidden = true; document.body.style.overflow = formModal.hidden ? '' : 'hidden'; }
  function requestHiddenAccess(action) {
    if (isHiddenUnlocked()) action();
    else if (localStorage.getItem(PRIVACY_PIN_STORAGE_KEY)) requestPin(action);
    else showPinRequired();
  }

  function getUrgencyState(startDate, endDate) {
    const status = getScheduleStatus(startDate, endDate);
    if (status === 'completed') return { key:'completed', label:'지난 일정', color:'#64748B' };
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
              hidden: Boolean(item.hidden),
              calendarType: item.calendarType === 'lunar' && normalizeLunar(item.lunar) ? 'lunar' : 'solar',
              lunar: item.calendarType === 'lunar' ? normalizeLunar(item.lunar) : null,
              repeat: normalizeRepeat(item.repeat),
              isTaskCompleted: item.isTaskCompleted === true,
              completedOccurrences: normalizeCompletedOccurrences(item.completedOccurrences),
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
        fontSize: Object.hasOwn(FONT_SCALES, saved.fontSize) ? saved.fontSize : DEFAULT_SETTINGS.fontSize,
        showLunarCalendar: saved.showLunarCalendar === true,
        viewMode: saved.viewMode === 'card' ? 'card' : 'list',
        memoViewMode: ['card', 'list', 'sticky'].includes(saved.memoViewMode) ? saved.memoViewMode : DEFAULT_SETTINGS.memoViewMode
      };
    } catch (error) {
      console.warn('설정 데이터를 불러오지 못했습니다. 기본값을 사용합니다.', error);
      return { ...DEFAULT_SETTINGS };
    }
  }

  function applySettings(settings) {
    document.documentElement.dataset.fontFamily = settings.fontFamily;
    document.documentElement.dataset.fontSize = settings.fontSize;
    if (lunarCalendarToggle) lunarCalendarToggle.checked = settings.showLunarCalendar === true;
    state.viewMode = settings.viewMode === 'card' ? 'card' : 'list';
    state.memoViewMode = ['card', 'list', 'sticky'].includes(settings.memoViewMode) ? settings.memoViewMode : DEFAULT_SETTINGS.memoViewMode;
    viewModeButtons.forEach(button => {
      const isActive = button.dataset.viewMode === state.viewMode;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });
    memoViewModeButtons.forEach(button => {
      const isActive = button.dataset.memoViewMode === state.memoViewMode;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });
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
      fontSize: selectedSize && Object.hasOwn(FONT_SCALES, selectedSize.value) ? selectedSize.value : 'medium',
      showLunarCalendar: state.settings.showLunarCalendar === true,
      viewMode: state.viewMode,
      memoViewMode: state.memoViewMode
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

  function updatePinSettingsUI() {
    const hasPin = Boolean(localStorage.getItem(PRIVACY_PIN_STORAGE_KEY));
    settingsPinStatus.innerHTML = hasPin ? 'PIN이 설정되어 있습니다.' : 'PIN이 설정되어 있지 않습니다.<br>숨긴 일정을 보호하려면 4자리 PIN을 설정해 주세요.';
    managePinBtn.textContent = hasPin ? 'PIN 변경' : 'PIN 설정';
    resetPinBtn.hidden = !hasPin;
  }

  function openSettings(focusSecurity = false) {
    setSettingsFormValues(state.settings);
    updatePinSettingsUI();
    updateDataManagementHistoryUI();
    updateAutoBackupUI();
    closeDrawer();
    settingsModal.hidden = false;
    document.body.style.overflow = 'hidden';
    setTimeout(() => {
      if (focusSecurity === true) { settingsSecuritySection.scrollIntoView({ block:'center' }); settingsSecuritySection.focus(); }
      else fontFamilySelect.focus();
    }, 50);
  }

  function closeSettings() {
    settingsModal.hidden = true;
    document.body.style.overflow = '';
  }

  function getBackupTimestamp(date = new Date()) {
    const pad = value => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}`;
  }

  function loadDataManagementHistory() {
    try {
      const saved = JSON.parse(localStorage.getItem(DATA_MANAGEMENT_HISTORY_KEY) || '{}');
      return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
    } catch (error) {
      console.warn('데이터 관리 이력을 불러오지 못했습니다.', error);
      return {};
    }
  }

  function saveDataManagementHistory(changes) {
    try {
      const history = { ...loadDataManagementHistory(), ...changes };
      localStorage.setItem(DATA_MANAGEMENT_HISTORY_KEY, JSON.stringify(history));
      updateDataManagementHistoryUI(history);
      return true;
    } catch (error) {
      console.warn('데이터 관리 이력을 저장하지 못했습니다.', error);
      return false;
    }
  }

  function formatDataManagementDate(isoString) {
    if (!isoString || Number.isNaN(Date.parse(isoString))) return '—';
    const date = new Date(isoString);
    const pad = value => String(value).padStart(2, '0');
    return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function updateDataManagementHistoryUI(history = loadDataManagementHistory()) {
    lastBackupAt.textContent = formatDataManagementDate(history.lastBackupAt);
    lastRestoreAt.textContent = formatDataManagementDate(history.lastRestoreAt);
    restoredBackupAt.textContent = formatDataManagementDate(history.restoredBackupAt);
  }

  function loadAutoBackupSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem(AUTO_BACKUP_SETTINGS_KEY) || '{}');
      return { enabled:saved.enabled === true, period:saved.period === 'monthly' ? 'monthly' : 'weekly' };
    } catch (error) {
      console.warn('자동 백업 설정을 불러오지 못했습니다.', error);
      return { enabled:false, period:'weekly' };
    }
  }

  function saveAutoBackupSettings(settings) {
    try {
      localStorage.setItem(AUTO_BACKUP_SETTINGS_KEY, JSON.stringify({ enabled:settings.enabled === true, period:settings.period === 'monthly' ? 'monthly' : 'weekly' }));
      return true;
    } catch (error) {
      console.warn('자동 백업 설정을 저장하지 못했습니다.', error);
      return false;
    }
  }

  function loadAutoBackupSnapshots() {
    try {
      const saved = JSON.parse(localStorage.getItem(AUTO_BACKUP_SNAPSHOTS_KEY) || '[]');
      if (!Array.isArray(saved)) return [];
      return saved.filter(snapshot => snapshot && typeof snapshot.snapshotId === 'string' && !Number.isNaN(Date.parse(snapshot.createdAt)) && snapshot.data && typeof snapshot.data === 'object')
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, AUTO_BACKUP_MAX_SNAPSHOTS);
    } catch (error) {
      console.warn('자동 백업 Snapshot을 불러오지 못했습니다.', error);
      return [];
    }
  }

  function updateAutoBackupUI() {
    const settings = loadAutoBackupSettings();
    const snapshots = loadAutoBackupSnapshots();
    autoBackupEnabled.checked = settings.enabled;
    autoBackupEnabledLabel.textContent = settings.enabled ? 'ON' : 'OFF';
    autoBackupPeriod.value = settings.period;
    autoBackupPeriod.disabled = !settings.enabled;
    lastAutoBackupAt.textContent = snapshots.length ? formatDataManagementDate(snapshots[0].createdAt) : '—';
    autoBackupCount.textContent = `${snapshots.length}개`;
  }

  function createSnapshotId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') return `snapshot_${window.crypto.randomUUID()}`;
    return `snapshot_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }

  function createAutoBackupSnapshot() {
    try {
      if (!Array.isArray(state.items) || !Array.isArray(state.categories) || !Array.isArray(state.memos)) throw new Error('DATA_NOT_READY');
      const payload = createBackupPayload();
      validateBackupPayload(JSON.parse(JSON.stringify(payload)));
      const snapshot = { snapshotId:createSnapshotId(), createdAt:payload.createdAt, data:payload };
      const snapshots = [snapshot, ...loadAutoBackupSnapshots()].slice(0, AUTO_BACKUP_MAX_SNAPSHOTS);
      JSON.stringify(snapshots);
      localStorage.setItem(AUTO_BACKUP_SNAPSHOTS_KEY, JSON.stringify(snapshots));
      updateAutoBackupUI();
      return true;
    } catch (error) {
      console.warn('자동 백업 Snapshot을 저장하지 못했습니다.', error);
      return false;
    }
  }

  function addCalendarMonthClamped(date) {
    const result = new Date(date.getTime());
    const targetMonth = result.getMonth() + 1;
    const day = result.getDate();
    result.setDate(1);
    result.setMonth(targetMonth);
    const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
    result.setDate(Math.min(day, lastDay));
    return result;
  }

  function isAutoBackupDue(lastCreatedAt, period, currentDate = new Date()) {
    const last = new Date(lastCreatedAt);
    if (Number.isNaN(last.getTime())) return true;
    const dueAt = period === 'monthly' ? addCalendarMonthClamped(last) : new Date(last.getTime() + 7 * 24 * 60 * 60 * 1000);
    return currentDate.getTime() >= dueAt.getTime();
  }

  function checkScheduledAutoBackup() {
    const settings = loadAutoBackupSettings();
    if (!settings.enabled) return;
    const snapshots = loadAutoBackupSnapshots();
    if (!snapshots.length || isAutoBackupDue(snapshots[0].createdAt, settings.period)) createAutoBackupSnapshot();
  }

  function renderAutoBackupManager() {
    const snapshots = loadAutoBackupSnapshots();
    autoBackupList.innerHTML = snapshots.length ? snapshots.map(snapshot => `
      <div class="auto-backup-item">
        <time datetime="${escapeHtml(snapshot.createdAt)}">${escapeHtml(formatDataManagementDate(snapshot.createdAt))}</time>
        <div class="auto-backup-item-actions"><button type="button" class="btn btn-secondary" data-snapshot-restore="${escapeHtml(snapshot.snapshotId)}">복원</button><button type="button" class="btn btn-danger" data-snapshot-delete="${escapeHtml(snapshot.snapshotId)}">삭제</button></div>
      </div>`).join('') : '<p class="auto-backup-empty">저장된 자동 백업이 없습니다.</p>';
    deleteAllAutoBackupsBtn.hidden = snapshots.length === 0;
    updateAutoBackupUI();
  }

  function openAutoBackupManager() {
    renderAutoBackupManager();
    autoBackupManagerModal.hidden = false;
    document.body.style.overflow = 'hidden';
    setTimeout(() => closeAutoBackupManagerBtn.focus(), 50);
  }

  function closeAutoBackupManager() {
    autoBackupManagerModal.hidden = true;
    document.body.style.overflow = settingsModal.hidden ? '' : 'hidden';
  }

  function openAutoBackupConfirmation(action, snapshot = null) {
    pendingAutoBackupAction = { action, snapshotId:snapshot?.snapshotId || null };
    const isRestore = action === 'restore';
    autoBackupConfirmTitle.textContent = isRestore ? '자동 백업 복원' : '자동 백업 삭제';
    autoBackupConfirmMessage.textContent = isRestore ? `${formatDataManagementDate(snapshot.createdAt)} 상태로 복원하시겠습니까?` : action === 'deleteAll' ? '저장된 자동 백업을 모두 삭제하시겠습니까?' : '이 자동 백업을 삭제하시겠습니까?';
    autoBackupConfirmSubtext.textContent = isRestore ? '현재 데이터는 복원 전 JSON 파일로 안전 백업됩니다.' : '현재 일정과 Memo 데이터에는 영향을 주지 않습니다.';
    confirmAutoBackupActionBtn.textContent = isRestore ? '복원' : '삭제';
    confirmAutoBackupActionBtn.classList.toggle('btn-danger', !isRestore);
    confirmAutoBackupActionBtn.classList.toggle('btn-primary', isRestore);
    autoBackupConfirmModal.hidden = false;
    document.body.style.overflow = 'hidden';
    setTimeout(() => confirmAutoBackupActionBtn.focus(), 50);
  }

  function closeAutoBackupConfirmation() {
    autoBackupConfirmModal.hidden = true;
    pendingAutoBackupAction = null;
    document.body.style.overflow = autoBackupManagerModal.hidden && settingsModal.hidden ? '' : 'hidden';
  }

  function applyBackupPayload(payload) {
    const beforeRestore = {};
    BACKUP_STORAGE_KEYS.forEach(key => { beforeRestore[key] = localStorage.getItem(key); });
    try {
      const validated = validateBackupPayload(JSON.parse(JSON.stringify(payload)));
      const storage = validated.payload.data.storage;
      BACKUP_STORAGE_KEYS.forEach(key => {
        const value = Object.hasOwn(storage, key) ? storage[key] : null;
        if (value === null || value === undefined) localStorage.removeItem(key);
        else if (typeof value === 'string') localStorage.setItem(key, value);
        else throw new Error(`Invalid storage value: ${key}`);
      });
      sessionStorage.removeItem(PRIVACY_SESSION_KEY);
      state.settings = loadSettings();
      applySettings(state.settings);
      state.categories = loadCategories();
      syncCategoryMap();
      state.items = loadDDays();
      state.memos = loadMemos();
      state.memoCategories = loadMemoCategories();
      state.activeCategory = 'all';
      state.activeMemoCategory = 'all';
      updatePinSettingsUI();
      renderApp();
      return true;
    } catch (error) {
      BACKUP_STORAGE_KEYS.forEach(key => {
        const value = beforeRestore[key];
        if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value);
      });
      state.settings = loadSettings(); applySettings(state.settings); state.categories = loadCategories(); syncCategoryMap(); state.items = loadDDays(); state.memos = loadMemos(); state.memoCategories = loadMemoCategories(); renderApp();
      console.error('DayMark Snapshot restore failed:', error);
      return false;
    }
  }

  function executeAutoBackupAction() {
    if (!pendingAutoBackupAction) return;
    const { action, snapshotId } = pendingAutoBackupAction;
    if (action === 'restore') {
      const snapshot = loadAutoBackupSnapshots().find(entry => entry.snapshotId === snapshotId);
      if (!snapshot) { closeAutoBackupConfirmation(); renderAutoBackupManager(); showToast('자동 백업을 찾을 수 없습니다.'); return; }
      if (!backupCurrentData('DayMark_AutoBackup_BeforeRestore')) { showToast('현재 데이터의 안전 백업을 만들지 못해 복원을 중단했습니다.'); return; }
      const restored = applyBackupPayload(snapshot.data);
      closeAutoBackupConfirmation();
      closeAutoBackupManager();
      closeSettings();
      showToast(restored ? '자동 백업 복원이 완료되었습니다.' : '복원 중 오류가 발생해 기존 데이터를 유지했습니다.');
      return;
    }
    try {
      const remaining = action === 'deleteAll' ? [] : loadAutoBackupSnapshots().filter(entry => entry.snapshotId !== snapshotId);
      localStorage.setItem(AUTO_BACKUP_SNAPSHOTS_KEY, JSON.stringify(remaining));
      closeAutoBackupConfirmation();
      renderAutoBackupManager();
      showToast(action === 'deleteAll' ? '자동 백업을 모두 삭제했습니다.' : '자동 백업을 삭제했습니다.');
    } catch (error) {
      console.warn('자동 백업 삭제에 실패했습니다.', error);
      showToast('자동 백업을 삭제하지 못했습니다.');
    }
  }

  function createBackupPayload() {
    const storage = {};
    BACKUP_STORAGE_KEYS.forEach(key => { storage[key] = localStorage.getItem(key); });
    return { app:'DayMark', backupFormatVersion:BACKUP_FORMAT_VERSION, createdAt:new Date().toISOString(), appVersion:APP_VERSION, data:{ storage } };
  }

  function downloadBackupFile(payload, filename) {
    let objectUrl = '';
    try {
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type:'application/json;charset=utf-8' });
      objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl; link.download = filename; link.style.display = 'none';
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      return true;
    } catch (error) {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      console.error('DayMark backup download failed:', error);
      return false;
    }
  }

  function backupCurrentData(prefix = 'DayMark_Backup') {
    const payload = createBackupPayload();
    const filename = `${prefix}_${getBackupTimestamp()}.json`;
    return downloadBackupFile(payload, filename);
  }

  function validateBackupPayload(payload) {
    if (!payload || payload.app !== 'DayMark' || !payload.backupFormatVersion || !payload.data || typeof payload.data !== 'object') throw new Error('NOT_DAYMARK');
    if (payload.backupFormatVersion !== BACKUP_FORMAT_VERSION) throw new Error('UNSUPPORTED_VERSION');
    if (!payload.data.storage || typeof payload.data.storage !== 'object') throw new Error('NOT_DAYMARK');
    const storage = payload.data.storage;
    if (typeof storage[STORAGE_KEY] !== 'string' || typeof storage[CATEGORY_STORAGE_KEY] !== 'string' || (storage[SETTINGS_STORAGE_KEY] !== null && typeof storage[SETTINGS_STORAGE_KEY] !== 'string')) throw new Error('NOT_DAYMARK');
    let items, categories, settings, memos;
    try {
      items = JSON.parse(storage[STORAGE_KEY]);
      categories = JSON.parse(storage[CATEGORY_STORAGE_KEY]);
      settings = storage[SETTINGS_STORAGE_KEY] === null ? { ...DEFAULT_SETTINGS } : JSON.parse(storage[SETTINGS_STORAGE_KEY]);
      const memoStorage = Object.hasOwn(storage, MEMO_STORAGE_KEY) ? storage[MEMO_STORAGE_KEY] : null;
      if (memoStorage !== null && typeof memoStorage !== 'string') throw new Error('INVALID_MEMOS');
      memos = memoStorage === null ? [] : JSON.parse(memoStorage);
    } catch (_) { throw new Error('NOT_DAYMARK'); }
    if (!Array.isArray(items) || !Array.isArray(categories) || !settings || typeof settings !== 'object' || Array.isArray(settings) || !Array.isArray(memos)) throw new Error('NOT_DAYMARK');
    if (typeof payload.appVersion !== 'string') throw new Error('NOT_DAYMARK');
    const eventIds = new Set(items.filter(item => item && item.id && item.title && (item.startDate || item.targetDate)).map(item => String(item.id)));
    const restoredMemos = memos.map(memo => {
      if (!memo || typeof memo !== 'object' || Array.isArray(memo)) return memo;
      const linkedEventId = typeof memo.linkedEventId === 'string' && memo.linkedEventId ? memo.linkedEventId : null;
      return { ...memo, linkedEventId: linkedEventId && eventIds.has(linkedEventId) ? linkedEventId : null };
    });
    storage[MEMO_STORAGE_KEY] = JSON.stringify(restoredMemos);
    return { payload, items, categories };
  }

  function formatRestoreDate(isoString) {
    if (!isoString || Number.isNaN(Date.parse(isoString))) return '—';
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('ko-KR', { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hour12:false }).format(date);
  }

  function openRestoreConfirmation(validated) {
    pendingRestoreBackup = validated.payload;
    restoreCreatedAt.textContent = formatRestoreDate(validated.payload.createdAt);
    restoreItemCount.textContent = `${validated.items.length}개`;
    restoreCategoryCount.textContent = `${validated.categories.length}개`;
    restoreAppVersion.textContent = validated.payload.appVersion;
    restoreFormatVersion.textContent = validated.payload.backupFormatVersion;
    restoreConfirmModal.hidden = false;
    document.body.style.overflow = 'hidden';
    setTimeout(() => confirmRestoreBtn.focus(), 50);
  }

  function closeRestoreConfirmation() {
    restoreConfirmModal.hidden = true;
    pendingRestoreBackup = null;
    document.body.style.overflow = settingsModal.hidden ? '' : 'hidden';
  }

  async function handleRestoreFile(file) {
    if (!file) return;
    try {
      let text;
      try { text = await file.text(); } catch (_) { throw new Error('UNREADABLE'); }
      let payload;
      try { payload = JSON.parse(text); } catch (_) { throw new Error('UNREADABLE'); }
      openRestoreConfirmation(validateBackupPayload(payload));
    } catch (error) {
      if (error.message === 'UNREADABLE') showToast('백업 파일을 읽을 수 없습니다.');
      else if (error.message === 'UNSUPPORTED_VERSION') showToast('지원하지 않는 백업 형식입니다.');
      else showToast('DayMark 백업 파일이 아닙니다.');
    } finally { restoreFileInput.value = ''; }
  }

  function restorePendingBackup() {
    if (!pendingRestoreBackup) return;
    if (!backupCurrentData('DayMark_AutoBackup_BeforeRestore')) {
      showToast('현재 데이터의 안전 백업을 만들지 못해 복원을 중단했습니다.');
      return;
    }
    const beforeRestore = {};
    const restoredBackupCreatedAt = !pendingRestoreBackup.createdAt || Number.isNaN(Date.parse(pendingRestoreBackup.createdAt)) ? null : pendingRestoreBackup.createdAt;
    BACKUP_STORAGE_KEYS.forEach(key => { beforeRestore[key] = localStorage.getItem(key); });
    try {
      const storage = pendingRestoreBackup.data.storage;
      BACKUP_STORAGE_KEYS.forEach(key => {
        const value = Object.hasOwn(storage, key) ? storage[key] : null;
        if (value === null || value === undefined) localStorage.removeItem(key);
        else if (typeof value === 'string') localStorage.setItem(key, value);
        else throw new Error(`Invalid storage value: ${key}`);
      });
      sessionStorage.removeItem(PRIVACY_SESSION_KEY);
      restoreConfirmModal.hidden = true;
      pendingRestoreBackup = null;
      state.settings = loadSettings();
      applySettings(state.settings);
      state.categories = loadCategories();
      syncCategoryMap();
      state.items = loadDDays();
      state.memos = loadMemos();
      state.memoCategories = loadMemoCategories();
      state.activeCategory = 'all';
      state.activeMemoCategory = 'all';
      updatePinSettingsUI();
      closeSettings();
      renderApp();
      saveDataManagementHistory({ lastRestoreAt:new Date().toISOString(), restoredBackupAt:restoredBackupCreatedAt });
      showToast('데이터 복원이 완료되었습니다.');
    } catch (error) {
      BACKUP_STORAGE_KEYS.forEach(key => {
        const value = beforeRestore[key];
        if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value);
      });
      state.settings = loadSettings();
      applySettings(state.settings);
      state.categories = loadCategories();
      syncCategoryMap();
      state.items = loadDDays();
      state.memos = loadMemos();
      state.memoCategories = loadMemoCategories();
      renderApp();
      console.error('DayMark restore failed:', error);
      showToast('데이터 복원 중 오류가 발생해 기존 데이터를 유지했습니다.');
    }
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
    const visibleItems=state.items.filter(item=>!item.hidden);
    categoryNavList.innerHTML = `<li class="nav-item"><button type="button" class="nav-link" data-category="all"><span class="nav-icon-text"><span class="nav-icon">▣</span><span>전체</span></span><span class="nav-count-badge">${visibleItems.length}</span></button></li>` + state.categories.map(cat => {
      const count = visibleItems.filter(item => item.category === cat.id).length;
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
      const calcA = calculateDDay(getEffectiveOccurrence(a).startDate);
      const calcB = calculateDDay(getEffectiveOccurrence(b).startDate);

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
    let result = state.items.filter(item => !item.hidden);

    // 1. Filter by category
    if (state.activeCategory !== 'all') {
      result = result.filter(item => item.category === state.activeCategory);
    }

    // 2. Filter by status: 'all' | 'upcoming' | 'ongoing' | 'completed'
    if (state.activeStatus !== 'all') {
      result = result.filter(item => {
        const occurrence = getEffectiveOccurrence(item);
        return getScheduleStatus(occurrence.startDate, occurrence.endDate) === state.activeStatus;
      });
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

    const todayAndFuture = items.filter(item => calculateDDay(getEffectiveOccurrence(item).startDate).diffDays >= 0);

    if (todayAndFuture.length > 0) {
      return todayAndFuture.reduce((closest, curr) => {
        const diffClosest = calculateDDay(getEffectiveOccurrence(closest).startDate).diffDays;
        const diffCurr = calculateDDay(getEffectiveOccurrence(curr).startDate).diffDays;
        return diffCurr < diffClosest ? curr : closest;
      });
    }

    // Only past items exist: find the most recent past item (max diffDays, closest to 0)
    return items.reduce((mostRecent, curr) => {
      const diffMostRecent = calculateDDay(getEffectiveOccurrence(mostRecent).startDate).diffDays;
      const diffCurr = calculateDDay(getEffectiveOccurrence(curr).startDate).diffDays;
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

  function renderTodaySchedule(items) {
    const todayStr = toIsoDateString(getTodayMidnight());
    const todayItems = sortItems(items, state.sortBy)
      .flatMap(item => getOccurrencesInRange(item, todayStr, todayStr).map(occurrence => ({ item, occurrence })));

    const rowsHtml = todayItems.map(({ item, occurrence }) => {
      const categoryInfo = getCategoryById(item.category);
      const hasLinkedMemo = state.memos.some(memo => memo.linkedEventId === item.id);
      const taskCompleted = isTaskOccurrenceCompleted(item, occurrence.startDate);
      return `
        <article class="today-schedule-row" data-id="${item.id}" data-occurrence-start="${occurrence.startDate}" data-occurrence-end="${occurrence.endDate || occurrence.startDate}" tabindex="0" aria-label="${escapeHtml(item.title)} 상세 보기">
          <div class="today-schedule-main">
            <button type="button" class="today-task-checkbox${taskCompleted ? ' completed' : ''}" data-task-completion data-id="${item.id}" data-occurrence-start="${occurrence.startDate}" aria-pressed="${taskCompleted}" aria-label="${escapeHtml(item.title)} 일정 ${taskCompleted ? '완료 취소' : '완료 처리'}"><span aria-hidden="true">${taskCompleted ? '✓' : ''}</span></button>
            <span class="card-category-badge ${categoryInfo.badgeClass}" style="color:${categoryInfo.color};background:${categoryInfo.color}18">${categoryInfo.icon} ${escapeHtml(categoryInfo.label)}</span>
            <h3 class="today-schedule-title">${escapeHtml(item.title)}</h3>
          </div>
          <div class="today-schedule-meta">
            ${item.important ? '<span class="card-important-tag">⭐ 중요</span>' : ''}
            ${hasLinkedMemo ? '<span class="memo-link-badge">📝 메모</span>' : ''}
            ${getRepeatLabel(item) ? `<span class="repeat-badge">🔁 ${getRepeatLabel(item)}</span>` : ''}
          </div>
        </article>`;
    }).join('');

    heroSection.innerHTML = `
      <div class="today-schedule-card">
        <header class="today-schedule-header">
          <h2>오늘 일정</h2>
          <p>${formatDateDot(todayStr)}${todayItems.length ? ` <span aria-hidden="true">·</span> 총 ${todayItems.length}개` : ''}</p>
        </header>
        ${todayItems.length
          ? `<div class="today-schedule-list">${rowsHtml}</div>`
          : '<p class="today-schedule-empty">오늘 예정된 일정이 없습니다.</p>'}
      </div>`;
  }

  function renderLegacyHeroSection(repItem) {
    if (!repItem) {
      heroSection.innerHTML = `
        <div class="empty-state-card" role="region" aria-label="대표 D-Day 안내">
          <div class="empty-icon-wrap" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </div>
          <h3 class="empty-title">아직 등록된 일정이 없습니다.</h3>
          <p class="empty-description">중요한 일정이나 기념일을 등록하고 한눈에 관리해 보세요.</p>
          <button type="button" class="btn btn-primary btn-add" id="emptyHeroAddBtn">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>새 일정 추가</span>
          </button>
        </div>
      `;

      const emptyHeroAddBtn = document.getElementById('emptyHeroAddBtn');
      if (emptyHeroAddBtn) {
        emptyHeroAddBtn.addEventListener('click', openAddModal);
      }
      return;
    }

    const occurrence = getEffectiveOccurrence(repItem);
    const calc = calculateDDay(occurrence.startDate);
    const scheduleStatus = getScheduleStatus(occurrence.startDate, occurrence.endDate);
    const categoryInfo = getCategoryById(repItem.category);
    const urgency = getUrgencyState(occurrence.startDate, occurrence.endDate);
    
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
              <span class="hero-period">${formatDateRange(occurrence.startDate, occurrence.endDate)}</span>
              ${getRepeatLabel(repItem) ? `<span class="repeat-badge">🔁 ${getRepeatLabel(repItem)}</span>` : ''}
              ${isLunarItem(repItem) ? `<span class="lunar-schedule-badge">🌙 음력 ${repItem.lunar.month}.${repItem.lunar.day}</span>` : ''}
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

    // Keep the Dashboard list title independent from category/status/search filters.
    listHeaderTitle.textContent = 'My DayMark';
  }

  // ==========================================
  // UI Rendering: Dashboard Cards List
  // ==========================================

  function renderScheduleList(items) {
    const rowsHtml = items.map(item => {
      const occurrence = getEffectiveOccurrence(item);
      const calc = calculateDDay(occurrence.startDate);
      const categoryInfo = getCategoryById(item.category);
      const urgency = getUrgencyState(occurrence.startDate, occurrence.endDate);
      const checklistStats = getChecklistStats(item);
      const hasLinkedMemo = state.memos.some(memo => memo.linkedEventId === item.id);
      const taskCompleted = isTaskOccurrenceCompleted(item, occurrence.startDate);

      return `
        <article class="schedule-list-row" data-id="${item.id}" tabindex="0" aria-label="${escapeHtml(item.title)} 상세 보기">
          <div class="schedule-list-dday urgency-${urgency.key}" style="color:${urgency.color}">${calc.dDayText}</div>
          <div class="schedule-list-date">${formatDateRange(occurrence.startDate, occurrence.endDate)}</div>
          <div class="schedule-list-category"><span class="card-category-badge ${categoryInfo.badgeClass}" style="color:${categoryInfo.color};background:${categoryInfo.color}18">${categoryInfo.icon} ${escapeHtml(categoryInfo.label)}</span></div>
          <h3 class="schedule-list-title" title="${escapeHtml(item.title)}">${item.important ? '<span class="schedule-list-important" title="중요 일정" aria-label="중요 일정">⭐</span> ' : ''}${escapeHtml(item.title)}</h3>
          <div class="schedule-list-memo" aria-label="메모">${hasLinkedMemo ? '<span title="연결된 메모">📝</span>' : ''}</div>
          <div class="schedule-list-checklist" aria-label="Check list">${checklistStats.total ? `${checklistStats.completed}/${checklistStats.total}` : ''}</div>
          <div class="schedule-list-complete">
            <button type="button" class="list-complete-btn btn-action-complete${taskCompleted ? ' completed' : ''}" data-id="${item.id}" data-occurrence-start="${occurrence.startDate}" aria-pressed="${taskCompleted}" aria-label="${escapeHtml(item.title)} 일정 ${taskCompleted ? '완료 취소' : '완료 처리'}">${taskCompleted ? '☑' : '□'}</button>
          </div>
        </article>`;
    }).join('');

    cardsContainer.innerHTML = `
      <div class="schedule-list" role="table" aria-label="My DayMark 일정 목록">
        <div class="schedule-list-head" role="row">
          <span>D-Day</span><span>날짜</span><span>카테고리</span><span>일정명</span><span>메모</span><span>Check list</span><span>완료</span>
        </div>
        <div class="schedule-list-body">${rowsHtml}</div>
      </div>`;
  }

  function renderListSection(items) {
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

    if (state.viewMode === 'list') {
      renderScheduleList(items);
      return;
    }

    const cardsHtml = items.map(item => {
      const occurrence = getEffectiveOccurrence(item);
      const calc = calculateDDay(occurrence.startDate);
      const scheduleStatus = getScheduleStatus(occurrence.startDate, occurrence.endDate);
      const categoryInfo = getCategoryById(item.category);
      const urgency = getUrgencyState(occurrence.startDate, occurrence.endDate);
      const cardStateClass = calc.status === 'today' ? 'card-today' : (calc.status === 'past' ? 'card-past' : '');
      const importantClass = item.important ? 'card-important' : '';
      const checklistStats = getChecklistStats(item);
      const hasLinkedMemo = state.memos.some(memo => memo.linkedEventId === item.id);
      const taskCompleted = isTaskOccurrenceCompleted(item, occurrence.startDate);

      return `
        <article class="dday-card ${cardStateClass} ${importantClass}" data-id="${item.id}" tabindex="0" aria-label="${escapeHtml(item.title)} 상세 보기">
          <div class="card-meta-row">
            <div class="card-meta-left">
              <span class="card-category-badge ${categoryInfo.badgeClass}" style="color:${categoryInfo.color};background:${categoryInfo.color}18">
                ${categoryInfo.icon} ${escapeHtml(categoryInfo.label)}
              </span>
              ${scheduleStatus === 'ongoing' ? '<span class="badge-ongoing-tag">진행 중</span>' : ''}
              ${item.important ? '<span class="card-important-tag">⭐ 중요</span>' : ''}
              ${hasLinkedMemo ? '<span class="memo-link-badge">📝 메모</span>' : ''}
              ${getRepeatLabel(item) ? `<span class="repeat-badge">🔁 ${getRepeatLabel(item)}</span>` : ''}
              ${isLunarItem(item) ? `<span class="lunar-schedule-badge">🌙 음력 ${item.lunar.isLeapMonth ? '윤' : ''}${item.lunar.month}.${item.lunar.day}</span>` : ''}
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
                  <span>${formatDateRange(occurrence.startDate, occurrence.endDate)}</span>
                </span>
                ${checklistStats.total ? `<span class="card-checklist-compact ${checklistStats.completed === checklistStats.total ? 'completed' : ''}">${checklistStats.completed === checklistStats.total ? '✓ Check list 완료' : 'Check list'} ${checklistStats.completed}/${checklistStats.total}</span>` : ''}
              </div>
            </div>
          </div>

          <div class="card-bottom-row">
            <button type="button" class="btn-card-action btn-action-complete${taskCompleted ? ' completed' : ''}" data-id="${item.id}" data-occurrence-start="${occurrence.startDate}" aria-pressed="${taskCompleted}" aria-label="${escapeHtml(item.title)} 일정 ${taskCompleted ? '완료 취소' : '완료 처리'}"><span>${taskCompleted ? '✓ 완료' : '완료'}</span></button>
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

  function sortCalendarEvents(events) {
    return events.sort((a, b) => {
      const spanA = parseLocalDate(a.endDate).getTime() - parseLocalDate(a.startDate).getTime();
      const spanB = parseLocalDate(b.endDate).getTime() - parseLocalDate(b.startDate).getTime();
      if (spanB !== spanA) return spanB - spanA;
      return a.startDate.localeCompare(b.startDate);
    });
  }

  function getCalendarEventsForDate(date) {
    const sourceItems = state.activeCategory === 'all'
      ? state.items.filter(item => !item.hidden)
      : state.items.filter(item => !item.hidden && item.category === state.activeCategory);
    return sortCalendarEvents(sourceItems.flatMap(item => getOccurrencesInRange(item, date, date)));
  }

  /**
   * Renders the entire month calendar grid with multi-day connected event bars.
   */
  function renderCalendar() {
    const year = state.calendarYear;
    const month = state.calendarMonth;

    // Update Month Header Title
    calMonthTitle.textContent = `${year}년 ${month + 1}월 ▼`;

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
    const sourceItems = state.activeCategory === 'all'
      ? state.items.filter(item=>!item.hidden)
      : state.items.filter(item => !item.hidden && item.category === state.activeCategory);
    const activeItems = sourceItems.flatMap(item => getOccurrencesInRange(item, cells[0].dateStr, cells[cells.length - 1].dateStr));

    // Build HTML for each cell
    const cellsHtml = cells.map((cell) => {
      const isToday = cell.dateStr === todayStr;
      const cellDateStr = cell.dateStr;
      const lunarText = state.settings.showLunarCalendar ? formatLunarCompact(cellDateStr) : '';

      // Filter events spanning this cell date
      const matchingEvents = activeItems.filter(item => {
        const start = item.startDate;
        const end = item.endDate || item.startDate;
        return cellDateStr >= start && cellDateStr <= end;
      });

      // Sort matching events: multi-day first, then by startDate, then createdAt
      sortCalendarEvents(matchingEvents);

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
        const eventLabel = `${event.important ? '⭐ ' : ''}${escapeHtml(event.title)}`;
        const eventTitle = `${escapeHtml(event.title)} (${formatDateRange(event.startDate, event.endDate)})`;

        return `
          <div 
            class="cal-event-bar ${connectorClass} ${categoryInfo.eventClass}" style="background-color:${categoryInfo.color};border-color:${categoryInfo.color}" 
            data-id="${event.id}" 
            data-occurrence-start="${event.startDate}"
            data-occurrence-end="${event.endDate}"
            title="${eventTitle}"
            role="button"
            tabindex="0"
          >
            ${shouldShowText ? eventLabel : '&nbsp;'}
          </div>
        `;
      }).join('');

      const overflowHtml = overflowCount > 0 
        ? `<button type="button" class="cal-more-badge" data-more-date="${cellDateStr}" aria-label="${cellDateStr} 전체 일정 ${matchingEvents.length}개 보기">+${overflowCount}개 더보기</button>` 
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
            <span class="cell-date-stack"><span class="cell-day-number">${cell.dayNum}</span>${lunarText ? `<span class="lunar-date">${lunarText}</span>` : ''}</span>
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

  function openCalendarMoreModal(date) {
    const items = getCalendarEventsForDate(date);
    calendarMoreTitle.textContent = `${formatDateWithDay(date).replace(/ \(.\)$/, '')} · 총 ${items.length}개`;
    calendarMoreList.innerHTML = items.map(item => {
      const categoryInfo = getCategoryById(item.category);
      const isCompleted = isTaskOccurrenceCompleted(item, item.startDate);
      return `<button type="button" class="calendar-more-item" data-id="${item.id}" data-occurrence-start="${item.startDate}" data-occurrence-end="${item.endDate}">
        <span class="card-category-badge ${categoryInfo.badgeClass}" style="color:${categoryInfo.color};background:${categoryInfo.color}18">${categoryInfo.icon} ${escapeHtml(categoryInfo.label)}</span>
        <span class="calendar-more-item-title">${item.important ? '⭐ ' : ''}${escapeHtml(item.title)}</span>
        ${isCompleted ? '<span class="task-completed-badge">✓ 완료</span>' : ''}
      </button>`;
    }).join('');
    calendarMoreModal.hidden = false;
    document.body.style.overflow = 'hidden';
    setTimeout(() => closeCalendarMoreBtn.focus(), 50);
  }

  function closeCalendarMoreModal() {
    calendarMoreModal.hidden = true;
    document.body.style.overflow = '';
  }

  function renderMobileCalendarAgenda() {
    if (!mobileCalendarAgenda) return;
    const date = state.selectedCalendarDate || toIsoDateString(getTodayMidnight());
    const lunarFullText = state.settings.showLunarCalendar ? formatLunarFull(date) : '';
    const items = state.items
      .filter(item => !item.hidden && (state.activeCategory === 'all' || item.category === state.activeCategory))
      .flatMap(item => getOccurrencesInRange(item, date, date));
    mobileCalendarAgenda.innerHTML = `<div class="mobile-agenda-header"><h3>${formatDateWithDay(date)}${lunarFullText ? `<span class="mobile-agenda-lunar">${lunarFullText}</span>` : ''}</h3><button type="button" class="mobile-date-add-btn" data-add-date="${date}">＋ 이 날짜에 일정 추가</button></div>` + (items.length ? items.map(item => { const cat=getCategoryById(item.category); return `<button class="mobile-agenda-item" data-id="${item.id}" data-occurrence-start="${item.startDate}" data-occurrence-end="${item.endDate}" style="--agenda-color:${cat.color}"><span class="agenda-line"></span><span><b>${escapeHtml(item.title)}</b><small>${cat.icon} ${escapeHtml(cat.label)}</small></span></button>`; }).join('') : '<p>선택한 날짜의 일정이 없습니다.</p>');
  }

  // ==========================================
  // Memo
  function loadMemoCategories() {
    try {
      const raw = localStorage.getItem(MEMO_CATEGORY_STORAGE_KEY);
      if (raw === null) return DEFAULT_MEMO_CATEGORIES.map(category => ({ ...category }));
      const saved = JSON.parse(raw);
      if (!Array.isArray(saved)) return DEFAULT_MEMO_CATEGORIES.map(category => ({ ...category }));
      return saved.filter(category => category && typeof category.id === 'string' && typeof category.name === 'string' && category.name.trim())
        .map(category => ({ id:category.id, name:category.name.trim() }));
    } catch (error) {
      console.error('Failed to load memo category data:', error);
      return DEFAULT_MEMO_CATEGORIES.map(category => ({ ...category }));
    }
  }

  function saveMemoCategories() {
    try {
      localStorage.setItem(MEMO_CATEGORY_STORAGE_KEY, JSON.stringify(state.memoCategories));
      return true;
    } catch (error) {
      console.error('Failed to save memo category data:', error);
      showToast('메모 분류 저장 중 오류가 발생했습니다.');
      return false;
    }
  }

  function loadMemos() {
    try {
      const saved = JSON.parse(localStorage.getItem(MEMO_STORAGE_KEY) || '[]');
      return Array.isArray(saved) ? saved.filter(memo => memo && typeof memo.id === 'string').map(memo => ({
        ...memo,
        linkedEventId: typeof memo.linkedEventId === 'string' && memo.linkedEventId ? memo.linkedEventId : null,
        isMinimized: memo.isMinimized === true
      })) : [];
    } catch (error) {
      console.error('Failed to load memo data:', error);
      return [];
    }
  }

  function saveMemos() {
    try {
      localStorage.setItem(MEMO_STORAGE_KEY, JSON.stringify(state.memos));
      return true;
    } catch (error) {
      console.error('Failed to save memo data:', error);
      showToast('메모 저장 중 오류가 발생했습니다.');
      return false;
    }
  }

  function generateMemoId() {
    return typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `memo-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function formatMemoDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    const pad = number => String(number).padStart(2, '0');
    return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function getMemoLinkedItem(memo) {
    return memo.linkedEventId ? state.items.find(item => item.id === memo.linkedEventId && !item.hidden) || null : null;
  }

  function getMemoCategory(memo) {
    if (!memo || typeof memo.memoCategoryId !== 'string') return null;
    return state.memoCategories.find(category => category.id === memo.memoCategoryId) || null;
  }

  function getMemoCategoryName(memo) {
    return getMemoCategory(memo)?.name || '미분류';
  }

  function renderMemoCategoryBadge(memo) {
    return `<span class="memo-category-badge">${escapeHtml(getMemoCategoryName(memo))}</span>`;
  }

  function formatMemoLinkedEvent(item) {
    const occurrence = getEffectiveOccurrence(item);
    const dateText = formatDateRange(occurrence.startDate, occurrence.endDate);
    const repeatLabel = getRepeatLabel(item);
    return `${item.title} · ${repeatLabel ? `${repeatLabel} · ` : ''}${dateText}`;
  }

  function renderMemoFlags(memo) {
    return `<div class="memo-card-flags">
      <button type="button" class="memo-flag-btn memo-flag-important${memo.important ? ' active' : ''}" data-memo-action="important" aria-label="${memo.important ? '중요 메모 해제' : '중요 메모로 설정'}" aria-pressed="${Boolean(memo.important)}" title="${memo.important ? '중요 메모 해제' : '중요 메모로 설정'}">${memo.important ? '★' : '☆'}</button>
      <button type="button" class="memo-flag-btn memo-flag-pin${memo.pinned ? ' active' : ''}" data-memo-action="pin" aria-label="${memo.pinned ? '메모 고정 해제' : '메모 고정'}" aria-pressed="${Boolean(memo.pinned)}" title="${memo.pinned ? '메모 고정 해제' : '메모 고정'}">📌</button>
    </div>`;
  }

  function renderMemoLinkedEvent(memo) {
    const linkedItem = getMemoLinkedItem(memo);
    return linkedItem ? `<button type="button" class="memo-linked-event" data-memo-action="open-event" data-event-id="${escapeHtml(linkedItem.id)}" aria-label="${escapeHtml(linkedItem.title)} 일정 열기">📅 <span>${escapeHtml(formatMemoLinkedEvent(linkedItem))}</span></button>` : '';
  }

  function linkifyMemoContent(content) {
    const escaped = escapeHtml(content || '');
    return escaped.replace(/https?:\/\/[^\s&lt;&gt;]+/g, url => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
  }

  function renderMemoListRows(memos) {
    return memos.map(memo => {
      const title = (memo.title || '').trim() || '제목 없음';
      return `<article class="memo-list-row" data-memo-id="${escapeHtml(memo.id)}" tabindex="0" aria-label="${escapeHtml(title)} 메모 열기">
        <div class="memo-list-flags">${renderMemoFlags(memo)}</div>
        <h3 class="memo-list-title">${escapeHtml(title)}</h3>
        <span class="memo-list-category">${renderMemoCategoryBadge(memo)}</span>
        <div class="memo-list-event">${renderMemoLinkedEvent(memo) || '<span>—</span>'}</div>
        <time class="memo-updated-at" datetime="${escapeHtml(memo.updatedAt)}">${formatMemoDate(memo.updatedAt)}</time>
      </article>`;
    }).join('');
  }

  function renderStickyMemos(memos) {
    return memos.map(memo => {
      const title = (memo.title || '').trim() || '제목 없음';
      const content = memo.content || '내용 없음';
      const isMinimized = memo.isMinimized === true;
      const toggleButton = `<button type="button" class="memo-minimize-btn" data-memo-action="minimize" aria-label="${isMinimized ? '메모 펼치기' : '메모 최소화'}" aria-expanded="${!isMinimized}" title="${isMinimized ? '메모 펼치기' : '메모 최소화'}">${isMinimized ? '+' : '−'}</button>`;
      if (isMinimized) {
        return `<article class="memo-sticky memo-sticky-minimized" data-memo-id="${escapeHtml(memo.id)}" tabindex="0" aria-label="${escapeHtml(title)} 메모 열기">
          <div class="memo-sticky-compact-top">${renderMemoCategoryBadge(memo)}<div class="memo-sticky-compact-controls">${memo.pinned ? '<span class="memo-sticky-pin" aria-label="고정된 메모" title="고정된 메모">📌</span>' : ''}${toggleButton}</div></div>
          <h3 class="memo-card-title memo-sticky-compact-title">${escapeHtml(title)}</h3>
        </article>`;
      }
      return `<article class="memo-sticky" data-memo-id="${escapeHtml(memo.id)}" tabindex="0" aria-label="${escapeHtml(title)} 메모 열기">
        <div class="memo-sticky-header">${renderMemoCategoryBadge(memo)}${toggleButton}</div>
        <div class="memo-card-top"><h3 class="memo-card-title">${escapeHtml(title)}</h3>${renderMemoFlags(memo)}</div>
        <div class="memo-sticky-content${memo.content ? '' : ' memo-card-preview-empty'}">${linkifyMemoContent(content)}</div>
        <div class="memo-sticky-bottom">
          ${renderMemoLinkedEvent(memo)}
          <div class="memo-card-footer"><time class="memo-updated-at" datetime="${escapeHtml(memo.updatedAt)}">수정 ${formatMemoDate(memo.updatedAt)}</time><button type="button" class="memo-action-btn memo-action-delete" data-memo-action="delete" aria-label="${escapeHtml(title)} 삭제">삭제</button></div>
        </div>
      </article>`;
    }).join('');
  }

  function renderMemoLinkedEventOptions(selectedId = null) {
    const options = state.items
      .filter(item => !item.hidden)
      .sort((a, b) => getEffectiveOccurrence(a).startDate.localeCompare(getEffectiveOccurrence(b).startDate));
    memoLinkedEventSelect.innerHTML = '<option value="">연결 안 함</option>' + options.map(item =>
      `<option value="${escapeHtml(item.id)}"${item.id === selectedId ? ' selected' : ''}>${escapeHtml(formatMemoLinkedEvent(item))}</option>`
    ).join('');
  }

  function renderMemoCategoryOptions(selectedId = null) {
    memoCategorySelect.innerHTML = '<option value="">미분류</option>' + state.memoCategories.map(category =>
      `<option value="${escapeHtml(category.id)}"${category.id === selectedId ? ' selected' : ''}>${escapeHtml(category.name)}</option>`
    ).join('');
  }

  function renderMemoCategoryBar() {
    const filters = [{ id:'all', name:'전체' }, ...state.memoCategories, { id:'uncategorized', name:'미분류' }];
    memoCategoryBar.innerHTML = filters.map(category => `<button type="button" class="memo-category-filter${state.activeMemoCategory === category.id ? ' active' : ''}" data-memo-category-filter="${escapeHtml(category.id)}" aria-pressed="${state.activeMemoCategory === category.id}">${escapeHtml(category.name)}</button>`).join('') + '<button type="button" class="memo-category-filter memo-category-manage-btn" data-memo-category-manage aria-label="메모 분류 관리">＋ 분류 관리</button>';
  }

  function renderMemos() {
    renderMemoCategoryBar();
    memoList.dataset.memoViewMode = state.memoViewMode;
    if (!state.memos.length) {
      memoList.innerHTML = '<section class="memo-empty-state"><h3>아직 작성된 메모가 없습니다.</h3><p>필요한 내용을 간단하게 기록해 보세요.</p><button type="button" class="btn btn-primary" data-memo-action="new">＋ 새 메모</button></section>';
      return;
    }
    const query = state.memoSearchQuery.trim().toLocaleLowerCase();
    const memos = state.memos
      .filter(memo => state.activeMemoCategory === 'all' || (state.activeMemoCategory === 'uncategorized' ? !getMemoCategory(memo) : memo.memoCategoryId === state.activeMemoCategory))
      .filter(memo => !query || `${memo.title || ''}\n${memo.content || ''}`.toLocaleLowerCase().includes(query))
      .sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    if (!memos.length) {
      memoList.innerHTML = `<section class="memo-empty-state memo-search-empty"><h3>${query ? '검색 결과가 없습니다.' : '이 분류의 메모가 없습니다.'}</h3><p>${query ? '검색어 또는 분류를 바꿔 보세요.' : '다른 분류를 선택해 보세요.'}</p></section>`;
      return;
    }
    if (state.memoViewMode === 'list') {
      memoList.innerHTML = renderMemoListRows(memos);
      return;
    }
    if (state.memoViewMode === 'sticky') {
      memoList.innerHTML = renderStickyMemos(memos);
      return;
    }
    memoList.innerHTML = memos.map(memo => {
      const title = (memo.title || '').trim() || '제목 없음';
      const preview = memo.content || '내용 없음';
      const linkedItem = getMemoLinkedItem(memo);
      return `<article class="memo-card" data-memo-id="${escapeHtml(memo.id)}">
        ${renderMemoCategoryBadge(memo)}
        <div class="memo-card-top"><h3 class="memo-card-title">${escapeHtml(title)}</h3><div class="memo-card-flags">
          <button type="button" class="memo-flag-btn memo-flag-important${memo.important ? ' active' : ''}" data-memo-action="important" aria-label="${memo.important ? '중요 메모 해제' : '중요 메모로 설정'}" aria-pressed="${Boolean(memo.important)}" title="${memo.important ? '중요 메모 해제' : '중요 메모로 설정'}">${memo.important ? '★' : '☆'}</button>
          <button type="button" class="memo-flag-btn memo-flag-pin${memo.pinned ? ' active' : ''}" data-memo-action="pin" aria-label="${memo.pinned ? '메모 고정 해제' : '메모 고정'}" aria-pressed="${Boolean(memo.pinned)}" title="${memo.pinned ? '메모 고정 해제' : '메모 고정'}">📌</button>
        </div></div>
        <p class="memo-card-preview${memo.content ? '' : ' memo-card-preview-empty'}">${escapeHtml(preview)}</p>
        ${linkedItem ? `<button type="button" class="memo-linked-event" data-memo-action="open-event" data-event-id="${escapeHtml(linkedItem.id)}" aria-label="${escapeHtml(linkedItem.title)} 일정 열기">📅 <span>${escapeHtml(formatMemoLinkedEvent(linkedItem))}</span></button>` : ''}
        <div class="memo-card-footer">
          <time class="memo-updated-at" datetime="${escapeHtml(memo.updatedAt)}">수정 ${formatMemoDate(memo.updatedAt)}</time>
          <div class="memo-card-actions">
            <button type="button" class="memo-action-btn" data-memo-action="edit">수정</button>
            <button type="button" class="memo-action-btn memo-action-delete" data-memo-action="delete">삭제</button>
          </div>
        </div>
      </article>`;
    }).join('');
  }

  function getScheduleFormSnapshot() {
    return JSON.stringify({
      title: titleInput.value,
      category: getSelectedCategory(),
      calendarType: getSelectedCalendarType(),
      startDate: startDateInput.value,
      endDate: endDateInput.value,
      lunarYear: lunarYearSelect.value,
      lunarMonth: lunarMonthSelect.value,
      lunarDay: lunarDaySelect.value,
      lunarLeap: lunarLeapCheckbox.checked,
      important: importantCheckbox.checked,
      repeat: repeatCheckbox.checked,
      repeatType: repeatTypeSelect.value,
      repeatWeekday: repeatWeekdaySelect.value,
      repeatMonth: repeatMonthSelect.value,
      repeatDay: repeatDaySelect.value,
      hidden: hiddenCheckbox.checked
    });
  }

  function getMemoFormSnapshot() {
    return JSON.stringify({ title: memoTitleInput.value, content: memoContentInput.value, memoCategoryId:memoCategorySelect.value, linkedEventId: memoLinkedEventSelect.value });
  }

  function getCategoryFormSnapshot() {
    return JSON.stringify({
      name: categoryNameInput.value,
      icon: iconPicker.querySelector('.selected')?.dataset.icon || 'calendar',
      color: colorPicker.querySelector('.selected')?.dataset.color || CATEGORY_COLORS[0]
    });
  }

  function requestDiscardConfirmation(action) {
    pendingDiscardAction = action;
    discardConfirmModal.hidden = false;
    document.body.style.overflow = 'hidden';
    setTimeout(() => continueEditingBtn.focus(), 50);
  }

  function continueEditing() {
    discardConfirmModal.hidden = true;
    pendingDiscardAction = null;
    document.body.style.overflow = 'hidden';
  }

  function confirmDiscard() {
    const action = pendingDiscardAction;
    discardConfirmModal.hidden = true;
    pendingDiscardAction = null;
    if (action) action();
  }

  function openMemoModal(id = null) {
    const memo = id ? state.memos.find(entry => entry.id === id) : null;
    state.currentMemoEditId = memo ? memo.id : null;
    memoEditId.value = memo ? memo.id : '';
    memoModalTitle.textContent = memo ? '메모 수정' : '새 메모';
    memoTitleInput.value = memo ? memo.title : '';
    memoContentInput.value = memo ? memo.content : '';
    renderMemoCategoryOptions(memo ? memo.memoCategoryId : null);
    renderMemoLinkedEventOptions(memo ? memo.linkedEventId : null);
    memoFormError.textContent = '';
    memoFormBaseline = getMemoFormSnapshot();
    memoModal.hidden = false;
    document.body.style.overflow = 'hidden';
    setTimeout(() => memoTitleInput.focus(), 50);
  }

  function closeMemoModal(force = false) {
    if (!force && getMemoFormSnapshot() !== memoFormBaseline) {
      requestDiscardConfirmation(() => closeMemoModal(true));
      return;
    }
    memoModal.hidden = true;
    memoForm.reset();
    memoFormError.textContent = '';
    state.currentMemoEditId = null;
    document.body.style.overflow = '';
  }

  function handleMemoSubmit(event) {
    event.preventDefault();
    const title = memoTitleInput.value.trim();
    const content = memoContentInput.value;
    const memoCategoryId = state.memoCategories.some(category => category.id === memoCategorySelect.value) ? memoCategorySelect.value : null;
    const linkedEventId = memoLinkedEventSelect.value || null;
    if (!title && !content.trim()) {
      memoFormError.textContent = '제목 또는 내용을 입력해 주세요.';
      return;
    }
    const timestamp = new Date().toISOString();
    const existing = state.currentMemoEditId && state.memos.find(memo => memo.id === state.currentMemoEditId);
    if (existing) {
      existing.title = title;
      existing.content = content;
      existing.memoCategoryId = memoCategoryId;
      existing.linkedEventId = linkedEventId;
      existing.updatedAt = timestamp;
    } else {
      state.memos.push({ id: generateMemoId(), title, content, createdAt: timestamp, updatedAt: timestamp, important: false, pinned: false, isMinimized: false, memoCategoryId, linkedEventId });
    }
    if (!saveMemos()) return;
    renderApp();
    closeMemoModal(true);
    showToast(existing ? '메모가 수정되었습니다.' : '메모가 저장되었습니다.');
  }

  function openMemoDeleteModal(id) {
    if (!state.memos.some(memo => memo.id === id)) return;
    state.currentMemoDeleteId = id;
    memoDeleteModal.hidden = false;
    document.body.style.overflow = 'hidden';
    setTimeout(() => cancelMemoDeleteBtn.focus(), 50);
  }

  function closeMemoDeleteModal() {
    memoDeleteModal.hidden = true;
    state.currentMemoDeleteId = null;
    document.body.style.overflow = '';
  }

  function confirmMemoDelete() {
    if (!state.currentMemoDeleteId) return;
    const previous = state.memos;
    state.memos = state.memos.filter(memo => memo.id !== state.currentMemoDeleteId);
    if (!saveMemos()) { state.memos = previous; return; }
    renderApp();
    closeMemoDeleteModal();
    showToast('메모가 삭제되었습니다.');
  }

  function toggleMemoFlag(id, field) {
    const memo = state.memos.find(entry => entry.id === id);
    if (!memo || !['important', 'pinned'].includes(field)) return;
    const previous = memo[field];
    memo[field] = !Boolean(memo[field]);
    if (!saveMemos()) { if (previous === undefined) delete memo[field]; else memo[field] = previous; return; }
    renderMemos();
  }

  function toggleMemoMinimized(id) {
    const memo = state.memos.find(entry => entry.id === id);
    if (!memo) return;
    const previous = memo.isMinimized;
    memo.isMinimized = !Boolean(memo.isMinimized);
    if (!saveMemos()) {
      if (previous === undefined) delete memo.isMinimized; else memo.isMinimized = previous;
      return;
    }
    renderMemos();
  }

  function renderMemoCategoryManagement() {
    memoCategoryManagementList.innerHTML = state.memoCategories.length ? state.memoCategories.map(category => {
      const count = state.memos.filter(memo => memo.memoCategoryId === category.id).length;
      return `<div class="memo-category-management-row" data-memo-category-id="${escapeHtml(category.id)}"><span>${escapeHtml(category.name)} (${count})</span><button type="button" class="memo-category-row-btn" data-memo-category-action="edit">수정</button><button type="button" class="memo-category-row-btn memo-category-row-delete" data-memo-category-action="delete">삭제</button></div>`;
    }).join('') : '<p class="memo-empty-state">등록된 메모 분류가 없습니다.</p>';
  }

  function openMemoCategoryManagement() {
    memoCategoryError.textContent = '';
    memoCategoryNameInput.value = '';
    renderMemoCategoryManagement();
    memoCategoryModal.hidden = false;
    document.body.style.overflow = 'hidden';
    setTimeout(() => memoCategoryNameInput.focus(), 50);
  }

  function closeMemoCategoryManagement() {
    memoCategoryModal.hidden = true;
    memoCategoryError.textContent = '';
    document.body.style.overflow = '';
  }

  function isDuplicateMemoCategoryName(name, excludeId = null) {
    return state.memoCategories.some(category => category.id !== excludeId && category.name.toLocaleLowerCase() === name.toLocaleLowerCase());
  }

  function addMemoCategory(event) {
    event.preventDefault();
    const name = memoCategoryNameInput.value.trim();
    if (!name) { memoCategoryError.textContent = '분류 이름을 입력해 주세요.'; return; }
    if (isDuplicateMemoCategoryName(name)) { memoCategoryError.textContent = '같은 이름의 분류가 이미 있습니다.'; return; }
    state.memoCategories.push({ id:`memo-category-${Date.now()}-${Math.random().toString(36).slice(2,7)}`, name });
    if (!saveMemoCategories()) { state.memoCategories.pop(); return; }
    memoCategoryNameInput.value = '';
    memoCategoryError.textContent = '';
    renderMemoCategoryManagement();
    renderMemos();
  }

  function editMemoCategory(id) {
    const category = state.memoCategories.find(entry => entry.id === id);
    if (!category) return;
    const nextName = window.prompt('수정할 메모 분류 이름을 입력하세요.', category.name);
    if (nextName === null) return;
    const name = nextName.trim();
    if (!name || name.length > 20) { showToast('분류 이름은 1~20자로 입력해 주세요.'); return; }
    if (isDuplicateMemoCategoryName(name, id)) { showToast('같은 이름의 분류가 이미 있습니다.'); return; }
    const previousName = category.name;
    category.name = name;
    if (!saveMemoCategories()) { category.name = previousName; return; }
    renderMemoCategoryManagement();
    renderMemos();
  }

  function deleteMemoCategory(id) {
    const category = state.memoCategories.find(entry => entry.id === id);
    if (!category) return;
    const used = state.memos.some(memo => memo.memoCategoryId === id);
    const message = used ? `'${category.name}' 분류를 삭제하면 해당 메모는 미분류로 변경됩니다. 삭제하시겠습니까?` : `'${category.name}' 분류를 삭제하시겠습니까?`;
    if (!window.confirm(message)) return;
    const previousCategories = state.memoCategories;
    const previousMemos = state.memos.map(memo => ({ ...memo }));
    state.memoCategories = state.memoCategories.filter(entry => entry.id !== id);
    state.memos.forEach(memo => { if (memo.memoCategoryId === id) memo.memoCategoryId = null; });
    if (!saveMemoCategories() || !saveMemos()) { state.memoCategories = previousCategories; state.memos = previousMemos; return; }
    if (state.activeMemoCategory === id) state.activeMemoCategory = 'all';
    renderMemoCategoryManagement();
    renderMemos();
  }

  // Main Render Orchestration
  // ==========================================

  function renderMiniCalendar() {
    if (!miniCalendarTitle || !miniCalendarDays) return;

    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    const cells = [];

    miniCalendarTitle.textContent = `${year}년 ${month + 1}월`;

    for (let index = 0; index < 42; index++) {
      const date = index - firstWeekday + 1;
      if (date < 1 || date > lastDate) {
        cells.push('<span class="mini-calendar-day is-empty" role="gridcell" aria-hidden="true"></span>');
        continue;
      }

      const weekday = index % 7;
      const isToday = date === today.getDate();
      const dayClass = weekday === 0 ? ' sunday' : weekday === 6 ? ' saturday' : '';
      cells.push(`<span class="mini-calendar-day${dayClass}${isToday ? ' is-today' : ''}" role="gridcell"${isToday ? ' aria-current="date"' : ''} aria-label="${year}년 ${month + 1}월 ${date}일${isToday ? ', 오늘' : ''}">${date}</span>`);
    }

    miniCalendarDays.innerHTML = cells.join('');
  }

  function renderApp() {
    renderMiniCalendar();
    renderHeaderDate();
    updateCategoryCounts();
    renderCategoryActiveStates();

    if (state.currentView === 'dashboard') {
      const filteredItems = getFilteredAndSortedItems();
      const todayScheduleItems = state.items.filter(item => !item.hidden);
      renderTodaySchedule(todayScheduleItems);
      renderListSection(filteredItems);
    } else if (state.currentView === 'calendar') {
      renderCalendar();
    } else {
      renderMemos();
    }
  }

  function switchView(viewName) {
    state.currentView = viewName;
    const views = { dashboard: [tabDashboardBtn, dashboardView], calendar: [tabCalendarBtn, calendarView], memo: [tabMemoBtn, memoView] };
    Object.entries(views).forEach(([name, elements]) => {
      const active = name === viewName;
      elements[0].classList.toggle('active', active);
      elements[0].setAttribute('aria-selected', String(active));
      elements[1].hidden = !active;
    });
    renderApp();
  }

  function handleSidebarCategoryClick(categoryId) {
    state.activeCategory = categoryId;
    switchView('dashboard');
    if (window.innerWidth < 1024) closeDrawer();
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

  function openDetailModal(id, occurrenceStart = null, occurrenceEnd = null) {
    const item = state.items.find(item => item.id === id);
    if (!item) return;

    state.currentDetailId = id;
    const occurrence = occurrenceStart
      ? { startDate: occurrenceStart, endDate: occurrenceEnd || occurrenceStart }
      : getEffectiveOccurrence(item);
    const calc = calculateDDay(occurrence.startDate);
    const scheduleStatus = getScheduleStatus(occurrence.startDate, occurrence.endDate);
    const categoryInfo = getCategoryById(item.category);
    const urgency = getUrgencyState(occurrence.startDate, occurrence.endDate);

    detailTitle.textContent = `${item.important ? '⭐ ' : ''}${item.title}`;
    detailDDayBadge.textContent = scheduleStatus === 'ongoing' ? '진행 중' : `${calc.dDayText} (${urgency.label})`;
    detailDDayBadge.style.color = urgency.color;
    detailDateRange.textContent = formatDateRange(occurrence.startDate, occurrence.endDate);
    const repeatLabel = getDetailedRepeatLabel(item);
    detailRepeatRow.hidden = !repeatLabel;
    detailRepeatValue.textContent = repeatLabel ? `🔁 ${repeatLabel}` : '';
    detailLunarRow.hidden = !isLunarItem(item);
    if (isLunarItem(item)) {
      const occurrenceLunarYear = getLunarDateInfo(occurrence.startDate)?.year || item.lunar.year;
      detailLunarValue.textContent = formatLunarOriginal(item, occurrenceLunarYear);
    } else {
      detailLunarValue.textContent = '';
    }

    detailHeaderTags.innerHTML = `
      <span class="card-category-badge ${categoryInfo.badgeClass}" style="color:${categoryInfo.color};background:${categoryInfo.color}18">
        ${categoryInfo.icon} ${escapeHtml(categoryInfo.label)}
      </span>
      ${scheduleStatus === 'ongoing' ? '<span class="badge-ongoing-tag">진행 중</span>' : ''}
      ${isTaskOccurrenceCompleted(item, occurrence.startDate)
        ? `<button type="button" class="task-completion-toggle completed" data-detail-task-completion data-occurrence-start="${occurrence.startDate}" data-occurrence-end="${occurrence.endDate}" aria-pressed="true" aria-label="이 일정 완료 취소">✓ 완료</button>`
        : `<button type="button" class="task-completion-toggle" data-detail-task-completion data-occurrence-start="${occurrence.startDate}" data-occurrence-end="${occurrence.endDate}" aria-pressed="false" aria-label="이 일정 완료 처리">○ 미완료</button>`}
    `;

    checklistAddForm.hidden = true;
    checklistInput.value = '';
    checklistError.textContent = '';
    checklistAddToggle.textContent = '＋ Check list 추가';
    refreshChecklistUI();

    const linkedMemos = state.memos.filter(memo => memo.linkedEventId === item.id);
    detailLinkedMemosSection.hidden = linkedMemos.length === 0;
    detailLinkedMemosList.innerHTML = linkedMemos.map(memo => {
      const title = (memo.title || '').trim() || '제목 없음';
      return `<button type="button" class="detail-linked-memo" data-linked-memo-id="${escapeHtml(memo.id)}" aria-label="${escapeHtml(title)} 메모로 이동">${escapeHtml(title)}</button>`;
    }).join('');

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

  function focusMemoFromDetail(memoId) {
    closeDetailModal();
    state.memoSearchQuery = '';
    memoSearchInput.value = '';
    clearMemoSearchBtn.hidden = true;
    switchView('memo');
    requestAnimationFrame(() => {
      const card = Array.from(memoList.querySelectorAll('[data-memo-id]')).find(element => element.dataset.memoId === memoId);
      if (!card) return;
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.classList.add('memo-card-highlight');
      setTimeout(() => card.classList.remove('memo-card-highlight'), 1800);
    });
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
    lunarDateError.textContent = '';
    solarRepeatError.textContent = '';
    titleInput.classList.remove('input-error');
    startDateInput.classList.remove('input-error');
    endDateInput.classList.remove('input-error');
  }

  function getSelectedCalendarType() {
    return ddayForm.querySelector('input[name="calendarType"]:checked')?.value === 'lunar' ? 'lunar' : 'solar';
  }

  function setCalendarType(type) {
    const normalized = type === 'lunar' ? 'lunar' : 'solar';
    const input = ddayForm.querySelector(`input[name="calendarType"][value="${normalized}"]`);
    if (input) input.checked = true;
    const lunarMode = normalized === 'lunar';
    solarDateFields.hidden = lunarMode || repeatCheckbox.checked;
    lunarDateFields.hidden = !lunarMode;
    startDateInput.required = !lunarMode && !repeatCheckbox.checked;
    endDateInput.required = !lunarMode && !repeatCheckbox.checked;
    if (lunarMode) {
      repeatTypeSelect.value = 'yearly';
      repeatTypeSelect.disabled = true;
      if (repeatCheckbox.checked) repeatTypeSelect.hidden = false;
    } else {
      repeatTypeSelect.disabled = false;
    }
    updateSolarRepeatFields();
    updateLunarYearVisibility();
  }

  function getSolarRepeatBaseDate() {
    return parseLocalDate(startDateInput.value || toIsoDateString(getTodayMidnight()));
  }

  function updateRepeatDayOptions(preferredDay) {
    const yearly = repeatTypeSelect.value === 'yearly';
    const month = Number(repeatMonthSelect.value) || 1;
    const maxDay = yearly ? new Date(2024, month, 0).getDate() : 31;
    const selected = Math.min(Number(preferredDay || repeatDaySelect.value) || getSolarRepeatBaseDate().getDate(), maxDay);
    repeatDaySelect.innerHTML = Array.from({ length:maxDay }, (_, index) => `<option value="${index + 1}">${index + 1}일</option>`).join('');
    repeatDaySelect.value = String(selected);
  }

  function setSolarRepeatDefaults(repeat = null) {
    const base = getSolarRepeatBaseDate();
    repeatWeekdaySelect.value = String(repeat?.repeatWeekday ?? base.getDay());
    repeatMonthSelect.value = String(repeat?.repeatMonth ?? (base.getMonth() + 1));
    updateRepeatDayOptions(repeat?.repeatDay ?? base.getDate());
  }

  function updateSolarRepeatFields() {
    const visible = getSelectedCalendarType() === 'solar' && repeatCheckbox.checked;
    solarRepeatFields.hidden = !visible;
    solarDateFields.hidden = getSelectedCalendarType() === 'lunar' || visible;
    startDateInput.required = getSelectedCalendarType() === 'solar' && !visible;
    endDateInput.required = getSelectedCalendarType() === 'solar' && !visible;
    if (!visible) return;
    const type = repeatTypeSelect.value;
    repeatWeekdaySelect.hidden = type !== 'weekly';
    repeatMonthSelect.hidden = type !== 'yearly';
    repeatDaySelect.hidden = type === 'weekly';
    solarRepeatFields.querySelector('.solar-repeat-selects').classList.toggle('single', type !== 'yearly');
    solarRepeatFieldLabel.textContent = type === 'weekly' ? '반복 요일' : (type === 'monthly' ? '반복 날짜' : '양력 날짜');
    if (type !== 'weekly') updateRepeatDayOptions();
  }

  function updateLunarYearVisibility() {
    const hideYear = getSelectedCalendarType() === 'lunar' && repeatCheckbox.checked;
    lunarYearField.hidden = hideYear;
    lunarYearSelect.disabled = hideYear;
    lunarDateFields.classList.toggle('lunar-repeat-mode', hideYear);
  }

  function setLunarFormValues(lunar) {
    const value = lunar || getLunarDateInfo(startDateInput.value || getTodayMidnight()) || { year:new Date().getFullYear(), month:1, day:1, isLeapMonth:false };
    lunarYearSelect.value = String(value.year);
    lunarMonthSelect.value = String(value.month);
    lunarDaySelect.value = String(value.day);
    lunarLeapCheckbox.checked = Boolean(value.isLeapMonth);
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
    deleteFormItemBtn.hidden = true;
    editItemId.value = '';
    titleInput.value = '';
    
    const initialDate = typeof selectedDate === 'string' ? selectedDate : toIsoDateString(getTodayMidnight());
    startDateInput.value = initialDate;
    endDateInput.value = initialDate;
    setCalendarType('solar');
    setLunarFormValues(getLunarDateInfo(initialDate));
    
    setCategoryRadio('personal');
    importantCheckbox.checked = false;
    repeatCheckbox.checked = false;
    repeatTypeSelect.value = 'monthly';
    repeatTypeSelect.hidden = true;
    setSolarRepeatDefaults();
    updateSolarRepeatFields();
    updateLunarYearVisibility();
    hiddenCheckbox.checked = false;
    clearFormErrors();
    scheduleFormBaseline = getScheduleFormSnapshot();
    
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
    deleteFormItemBtn.hidden = false;
    editItemId.value = item.id;
    titleInput.value = item.title;
    startDateInput.value = item.startDate;
    endDateInput.value = item.endDate || item.startDate;
    setCalendarType(item.calendarType || 'solar');
    setLunarFormValues(normalizeLunar(item.lunar));
    setCategoryRadio(item.category || 'personal');
    importantCheckbox.checked = Boolean(item.important);
    const repeat = normalizeRepeat(item.repeat);
    repeatCheckbox.checked = repeat.enabled;
    repeatTypeSelect.value = repeat.type || 'monthly';
    if (isLunarItem(item)) repeatTypeSelect.value = 'yearly';
    repeatTypeSelect.hidden = !repeat.enabled;
    repeatTypeSelect.disabled = isLunarItem(item);
    setSolarRepeatDefaults(getRepeatRule(item));
    updateSolarRepeatFields();
    updateLunarYearVisibility();
    hiddenCheckbox.checked = Boolean(item.hidden);
    clearFormErrors();
    scheduleFormBaseline = getScheduleFormSnapshot();

    closeDetailModal();
    closeDrawer();
    formModal.hidden = false;
    document.body.style.overflow = 'hidden';
    setTimeout(() => titleInput.focus(), 50);
  }

  function closeFormModal(force = false) {
    if (!force && getScheduleFormSnapshot() !== scheduleFormBaseline) {
      requestDiscardConfirmation(() => closeFormModal(true));
      return;
    }
    formModal.hidden = true;
    document.body.style.overflow = '';
    state.currentEditId = null;
    clearFormErrors();
  }

  function handleFormSubmit(e) {
    e.preventDefault();
    clearFormErrors();

    const titleVal = titleInput.value.trim();
    let startVal = startDateInput.value.trim();
    let endVal = endDateInput.value.trim() || startVal;
    const calendarTypeVal = getSelectedCalendarType();
    const repeatRequested = repeatCheckbox.checked;
    const existingLunarYear = normalizeLunar(state.items.find(item => item.id === state.currentEditId)?.lunar)?.year;
    const currentLunarYear = getLunarDateInfo(getTodayMidnight())?.year || new Date().getFullYear();
    const lunarVal = calendarTypeVal === 'lunar' ? {
      year: repeatRequested ? (existingLunarYear || currentLunarYear) : Number(lunarYearSelect.value),
      month: Number(lunarMonthSelect.value), day: Number(lunarDaySelect.value), isLeapMonth: lunarLeapCheckbox.checked
    } : null;
    const categoryVal = getSelectedCategory();
    const importantVal = importantCheckbox.checked;
    const repeatVal = { enabled: repeatRequested, type: repeatRequested ? (calendarTypeVal === 'lunar' ? 'yearly' : repeatTypeSelect.value) : null };
    if (repeatRequested && calendarTypeVal === 'solar') {
      if (repeatVal.type === 'weekly') repeatVal.repeatWeekday = Number(repeatWeekdaySelect.value);
      if (repeatVal.type === 'monthly') repeatVal.repeatDay = Number(repeatDaySelect.value);
      if (repeatVal.type === 'yearly') { repeatVal.repeatMonth = Number(repeatMonthSelect.value); repeatVal.repeatDay = Number(repeatDaySelect.value); }
    }
    const hiddenVal = hiddenCheckbox.checked;

    let hasError = false;

    if (calendarTypeVal === 'lunar') {
      let convertedDate = null;
      if (repeatRequested) {
        for (let year = currentLunarYear; year <= Math.min(LUNAR_YEAR_MAX, currentLunarYear + 30) && !convertedDate; year += 1) {
          convertedDate = lunarToSolar(year, lunarVal.month, lunarVal.day, lunarVal.isLeapMonth);
        }
      } else {
        convertedDate = lunarToSolar(lunarVal.year, lunarVal.month, lunarVal.day, lunarVal.isLeapMonth);
      }
      if (!convertedDate) {
        lunarDateError.textContent = lunarVal.isLeapMonth
          ? (repeatRequested ? '지원 범위의 향후 연도에서 해당 윤달을 찾을 수 없습니다.' : '선택한 연도에는 해당 윤달 또는 날짜가 존재하지 않습니다.')
          : '선택한 음력 월에는 해당 날짜가 존재하지 않습니다.';
        hasError = true;
      } else {
        startVal = convertedDate;
        endVal = convertedDate;
      }
    }

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
    if (calendarTypeVal === 'solar' && !repeatRequested && !startVal) {
      startDateError.textContent = '일정 시작일을 선택해주세요.';
      startDateInput.classList.add('input-error');
      hasError = true;
    }

    // End Date validation
    if (calendarTypeVal === 'solar' && !repeatRequested && !endVal) {
      endDateError.textContent = '일정 종료일을 선택해주세요.';
      endDateInput.classList.add('input-error');
      hasError = true;
    } else if (!repeatRequested && startVal && endVal < startVal) {
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

    if (hiddenVal && !localStorage.getItem(PRIVACY_PIN_STORAGE_KEY)) {
      showPinRequired();
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
          important: importantVal,
          calendarType: calendarTypeVal,
          lunar: lunarVal,
          repeat: repeatVal
          ,hidden: hiddenVal
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
        calendarType: calendarTypeVal,
        lunar: lunarVal,
        repeat: repeatVal,
        hidden: hiddenVal,
        isTaskCompleted: false,
        completedOccurrences: [],
        checklist: [],
        createdAt: new Date().toISOString()
      };
      state.items.push(newItem);
      saveDDays(state.items);
      renderApp();
      showToast('새 일정이 등록되었습니다.');
    }

    closeFormModal(true);
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
      const deletedId = state.items[itemIndex].id;
      state.items.splice(itemIndex, 1);
      saveDDays(state.items);
      let memoLinksChanged = false;
      state.memos.forEach(memo => {
        if (memo.linkedEventId === deletedId) {
          memo.linkedEventId = null;
          memoLinksChanged = true;
        }
      });
      if (memoLinksChanged) saveMemos();
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
      const count = state.items.filter(item => !item.hidden && item.category === cat.id).length;
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
    categoryFormBaseline = getCategoryFormSnapshot();
    categoryModal.hidden = false;
    document.body.style.overflow = 'hidden';
    setTimeout(() => categoryNameInput.focus(), 50);
  }

  function closeCategoryModal(force = false) {
    if (!force && getCategoryFormSnapshot() !== categoryFormBaseline) {
      requestDiscardConfirmation(() => closeCategoryModal(true));
      return;
    }
    categoryModal.hidden = true; state.currentCategoryEditId = null; document.body.style.overflow = '';
  }

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
      const newCategoryId = `category_${Date.now()}`;
      state.categories.push({ id:newCategoryId, name, icon, color, isDefault:false });
      showToast('카테고리가 추가되었습니다.');
    }
    saveCategories();
    renderApp();
    if (!categoryManagementModal.hidden) renderCategoryManagement();
    closeCategoryModal(true);
  }

  function requestCategoryDelete() {
    const category = state.categories.find(cat => cat.id === state.currentCategoryEditId);
    if (!category || category.isDefault) return;
    const usedItems = state.items.filter(item => item.category === category.id);
    if (!usedItems.length) {
      if (!window.confirm(`'${category.name}' 카테고리를 삭제하시겠습니까?`)) return;
      state.categories = state.categories.filter(cat => cat.id !== category.id);
      saveCategories(); renderApp(); closeCategoryModal(true); showToast('카테고리가 삭제되었습니다.');
      return;
    }
    state.currentCategoryDeleteId = category.id;
    categoryMoveMessage.textContent = `'${category.name}' 카테고리를 사용하는 일정이 있습니다. 이동할 카테고리를 선택하세요.`;
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

  function renderHiddenItems() {
    const items=state.items.filter(item=>item.hidden);
    hiddenItemsList.innerHTML=items.length ? items.map(item=>{const cat=getCategoryById(item.category),occurrence=getEffectiveOccurrence(item),calc=calculateDDay(occurrence.startDate),stats=getChecklistStats(item),repeatLabel=getRepeatLabel(item);return `<article class="dday-card hidden-item-card" data-hidden-id="${item.id}"><div class="card-meta-row"><span class="card-category-badge" style="color:${cat.color};background:${cat.color}18">${cat.icon} ${escapeHtml(cat.label)}</span><span class="card-dday-number">${calc.dDayText}</span></div><h3 class="card-title">${item.important?'⭐ ':''}${escapeHtml(item.title)}</h3><div class="card-target-date"><span>${formatDateRange(occurrence.startDate,occurrence.endDate)}</span>${repeatLabel?`<span class="repeat-badge">🔁 ${repeatLabel}</span>`:''}${stats.total?`<span class="card-checklist-compact">Check list ${stats.completed}/${stats.total}</span>`:''}</div><div class="card-bottom-row"><button class="btn-card-action" data-hidden-action="edit" data-id="${item.id}">수정</button><button class="btn-card-action btn-action-delete" data-hidden-action="delete" data-id="${item.id}">삭제</button></div></article>`}).join('') : '<div class="empty-state-card"><h3 class="empty-title">숨김 일정이 없습니다.</h3></div>';
  }
  function openHiddenItems(){requestHiddenAccess(()=>{renderHiddenItems();hiddenItemsModal.hidden=false;document.body.style.overflow='hidden';});}
  function closeHiddenItems(){hiddenItemsModal.hidden=true;document.body.style.overflow='';}
  function closeChangePin(){changePinModal.hidden=true;changePinError.textContent='';changePinForm.reset();document.body.style.overflow=(hiddenItemsModal.hidden&&settingsModal.hidden)?'':'hidden';}
  function openResetPin(){resetPinForm.reset();resetPinError.textContent='';resetPinModal.hidden=false;document.body.style.overflow='hidden';setTimeout(()=>resetCurrentPinInput.focus(),50);}
  function closeResetPin(){resetPinModal.hidden=true;resetPinForm.reset();resetPinError.textContent='';document.body.style.overflow=settingsModal.hidden?'':'hidden';}
  function closeConfirmResetPin(){confirmResetPinModal.hidden=true;document.body.style.overflow=settingsModal.hidden?'':'hidden';}

  // ==========================================
  // Event Listeners & Binding
  // ==========================================

  function initEventListeners() {
    document.querySelectorAll('[data-home-navigation]').forEach(brand => {
      brand.addEventListener('click', () => {
        state.activeCategory = 'all';
        switchView('dashboard');
        closeDrawer();
      });
    });

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
    if (tabMemoBtn) {
      tabMemoBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        switchView('memo');
      });
    }

    openMemoModalBtn.addEventListener('click', () => openMemoModal());
    closeMemoModalBtn.addEventListener('click', () => closeMemoModal());
    cancelMemoBtn.addEventListener('click', () => closeMemoModal());
    memoForm.addEventListener('submit', handleMemoSubmit);
    memoModal.addEventListener('click', event => { if (event.target === memoModal) closeMemoModal(); });
    memoTitleInput.addEventListener('input', () => { memoFormError.textContent = ''; });
    memoContentInput.addEventListener('input', () => { memoFormError.textContent = ''; });
    memoSearchInput.addEventListener('input', event => { state.memoSearchQuery = event.target.value; clearMemoSearchBtn.hidden = !event.target.value; renderMemos(); });
    clearMemoSearchBtn.addEventListener('click', () => { memoSearchInput.value = ''; state.memoSearchQuery = ''; clearMemoSearchBtn.hidden = true; renderMemos(); memoSearchInput.focus(); });
    memoCategoryBar.addEventListener('click', event => {
      const manageButton = event.target.closest('[data-memo-category-manage]');
      if (manageButton) { openMemoCategoryManagement(); return; }
      const filterButton = event.target.closest('[data-memo-category-filter]');
      if (!filterButton) return;
      state.activeMemoCategory = filterButton.dataset.memoCategoryFilter;
      renderMemos();
    });
    closeMemoCategoryModalBtn.addEventListener('click', closeMemoCategoryManagement);
    doneMemoCategoryBtn.addEventListener('click', closeMemoCategoryManagement);
    memoCategoryModal.addEventListener('click', event => { if (event.target === memoCategoryModal) closeMemoCategoryManagement(); });
    memoCategoryForm.addEventListener('submit', addMemoCategory);
    memoCategoryNameInput.addEventListener('input', () => { memoCategoryError.textContent = ''; });
    memoCategoryManagementList.addEventListener('click', event => {
      const button = event.target.closest('[data-memo-category-action]');
      const row = button?.closest('[data-memo-category-id]');
      if (!button || !row) return;
      if (button.dataset.memoCategoryAction === 'edit') editMemoCategory(row.dataset.memoCategoryId);
      if (button.dataset.memoCategoryAction === 'delete') deleteMemoCategory(row.dataset.memoCategoryId);
    });
    memoViewModeButtons.forEach(button => button.addEventListener('click', () => {
      const nextMode = button.dataset.memoViewMode;
      if (!['card', 'list', 'sticky'].includes(nextMode) || nextMode === state.memoViewMode) return;
      state.memoViewMode = nextMode;
      saveSettings({ ...state.settings, memoViewMode: nextMode });
      renderMemos();
    }));
    memoList.addEventListener('click', event => {
      const action = event.target.closest('[data-memo-action]');
      if (!action) {
        if (event.target.closest('a')) return;
        const memo = event.target.closest('[data-memo-id]');
        if (memo && state.memoViewMode !== 'card') openMemoModal(memo.dataset.memoId);
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      if (action.dataset.memoAction === 'new') { openMemoModal(); return; }
      if (action.dataset.memoAction === 'open-event') { openDetailModal(action.dataset.eventId); return; }
      const card = action.closest('[data-memo-id]');
      if (!card) return;
      if (action.dataset.memoAction === 'minimize') { toggleMemoMinimized(card.dataset.memoId); return; }
      if (action.dataset.memoAction === 'edit') openMemoModal(card.dataset.memoId);
      if (action.dataset.memoAction === 'delete') openMemoDeleteModal(card.dataset.memoId);
      if (action.dataset.memoAction === 'important') toggleMemoFlag(card.dataset.memoId, 'important');
      if (action.dataset.memoAction === 'pin') toggleMemoFlag(card.dataset.memoId, 'pinned');
    });
    memoList.addEventListener('keydown', event => {
      if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('[data-memo-id]') && state.memoViewMode !== 'card') {
        event.preventDefault();
        openMemoModal(event.target.dataset.memoId);
      }
    });
    closeMemoDeleteBtn.addEventListener('click', closeMemoDeleteModal);
    cancelMemoDeleteBtn.addEventListener('click', closeMemoDeleteModal);
    confirmMemoDeleteBtn.addEventListener('click', confirmMemoDelete);
    memoDeleteModal.addEventListener('click', event => { if (event.target === memoDeleteModal) closeMemoDeleteModal(); });

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
    lunarCalendarToggle.addEventListener('change', () => {
      saveSettings({ ...state.settings, showLunarCalendar: lunarCalendarToggle.checked });
      renderCalendar();
    });

    calTodayBtn.addEventListener('click', () => {
      const t = new Date();
      state.calendarYear = t.getFullYear();
      state.calendarMonth = t.getMonth();
      renderCalendar();
    });

    calMonthTitle.addEventListener('click', () => {
      calendarJumpYear.innerHTML = Array.from({length:101}, (_,index) => 2000 + index).map(year => `<option value="${year}" ${year===state.calendarYear?'selected':''}>${year}년</option>`).join('');
      calendarJumpMonth.innerHTML = Array.from({length:12}, (_,index) => `<option value="${index}" ${index===state.calendarMonth?'selected':''}>${index+1}월</option>`).join('');
      calendarJumpModal.hidden = false; document.body.style.overflow = 'hidden'; setTimeout(() => calendarJumpYear.focus(), 50);
    });
    const closeCalendarJump = () => { calendarJumpModal.hidden = true; document.body.style.overflow = ''; };
    closeCalendarJumpBtn.addEventListener('click', closeCalendarJump);
    cancelCalendarJumpBtn.addEventListener('click', closeCalendarJump);
    calendarJumpModal.addEventListener('click', event => { if (event.target === calendarJumpModal) closeCalendarJump(); });
    calendarJumpForm.addEventListener('submit', event => {
      event.preventDefault(); state.calendarYear = Number(calendarJumpYear.value); state.calendarMonth = Number(calendarJumpMonth.value); closeCalendarJump(); renderCalendar();
    });

    // Calendar Grid Event Click & Delegation
    calendarGrid.addEventListener('click', (e) => {
      const moreBadge = e.target.closest('.cal-more-badge[data-more-date]');
      if (moreBadge) {
        e.preventDefault();
        e.stopPropagation();
        openCalendarMoreModal(moreBadge.dataset.moreDate);
        return;
      }
      const eventBar = e.target.closest('.cal-event-bar');
      if (eventBar && eventBar.dataset.id) {
        e.stopPropagation();
        openDetailModal(eventBar.dataset.id, eventBar.dataset.occurrenceStart, eventBar.dataset.occurrenceEnd);
        return;
      }
      const cell = e.target.closest('.calendar-cell[data-date]');
      if (cell) {
        state.selectedCalendarDate = cell.dataset.date;
        if (window.innerWidth < 768) renderCalendar();
        else openAddModal(cell.dataset.date);
      }
    });
    closeCalendarMoreBtn.addEventListener('click', (e) => { e.stopPropagation(); closeCalendarMoreModal(); });
    calendarMoreModal.addEventListener('click', (e) => {
      e.stopPropagation();
      if (e.target === calendarMoreModal) { closeCalendarMoreModal(); return; }
      const item = e.target.closest('.calendar-more-item[data-id]');
      if (item) {
        closeCalendarMoreModal();
        openDetailModal(item.dataset.id, item.dataset.occurrenceStart, item.dataset.occurrenceEnd);
      }
    });
    if (mobileCalendarAgenda) mobileCalendarAgenda.addEventListener('click', e => {
      const addBtn = e.target.closest('[data-add-date]');
      if (addBtn) { openAddModal(addBtn.dataset.addDate); return; }
      const item = e.target.closest('[data-id]');
      if (item) openDetailModal(item.dataset.id, item.dataset.occurrenceStart, item.dataset.occurrenceEnd);
    });

    calendarGrid.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const eventBar = e.target.closest('.cal-event-bar');
        if (eventBar && eventBar.dataset.id) {
          e.preventDefault();
          openDetailModal(eventBar.dataset.id, eventBar.dataset.occurrenceStart, eventBar.dataset.occurrenceEnd);
        }
      }
    });

    // Detail Modal Controls
    closeDetailModalBtn.addEventListener('click', closeDetailModal);
    detailModal.addEventListener('click', (e) => {
      if (e.target === detailModal) closeDetailModal();
      const completionToggle = e.target.closest('[data-detail-task-completion]');
      if (completionToggle && state.currentDetailId) {
        const detailId = state.currentDetailId;
        const occurrenceStart = completionToggle.dataset.occurrenceStart;
        const occurrenceEnd = completionToggle.dataset.occurrenceEnd;
        toggleTaskCompletion(detailId, occurrenceStart);
        openDetailModal(detailId, occurrenceStart, occurrenceEnd);
        setTimeout(() => detailHeaderTags.querySelector('[data-detail-task-completion]')?.focus(), 0);
        return;
      }
      const memoLink = e.target.closest('[data-linked-memo-id]');
      if (memoLink) focusMemoFromDetail(memoLink.dataset.linkedMemoId);
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
      showToast('환경 설정이 저장되었습니다.');
    });
    resetSettingsBtn.addEventListener('click', () => setSettingsFormValues(DEFAULT_SETTINGS));
    cancelSettingsBtn.addEventListener('click', closeSettings);
    closeSettingsBtn.addEventListener('click', closeSettings);
    settingsModal.addEventListener('click', (e) => { if (e.target === settingsModal) closeSettings(); });
    backupDataBtn.addEventListener('click', () => {
      if (backupCurrentData()) {
        saveDataManagementHistory({ lastBackupAt:new Date().toISOString() });
        showToast('DayMark 백업 파일을 만들었습니다.');
      } else showToast('백업 파일을 만들 수 없습니다.');
    });
    restoreDataBtn.addEventListener('click', () => { restoreFileInput.value = ''; restoreFileInput.click(); });
    restoreFileInput.addEventListener('change', () => handleRestoreFile(restoreFileInput.files?.[0]));
    closeRestoreConfirmBtn.addEventListener('click', closeRestoreConfirmation);
    cancelRestoreBtn.addEventListener('click', closeRestoreConfirmation);
    confirmRestoreBtn.addEventListener('click', restorePendingBackup);
    restoreConfirmModal.addEventListener('click', event => { if (event.target === restoreConfirmModal) closeRestoreConfirmation(); });
    autoBackupEnabled.addEventListener('change', () => {
      const previous = loadAutoBackupSettings();
      const next = { enabled:autoBackupEnabled.checked, period:previous.period || 'weekly' };
      if (!saveAutoBackupSettings(next)) {
        autoBackupEnabled.checked = previous.enabled;
        showToast('자동 백업 설정을 저장하지 못했습니다.');
        updateAutoBackupUI();
        return;
      }
      updateAutoBackupUI();
      if (next.enabled) {
        if (createAutoBackupSnapshot()) showToast('현재 상태를 자동 백업했습니다.');
        else showToast('자동 백업을 만들지 못했습니다. 설정은 유지됩니다.');
      }
    });
    autoBackupPeriod.addEventListener('change', () => {
      const settings = loadAutoBackupSettings();
      if (!saveAutoBackupSettings({ ...settings, period:autoBackupPeriod.value })) {
        showToast('자동 백업 주기를 저장하지 못했습니다.');
      }
      updateAutoBackupUI();
    });
    manageAutoBackupsBtn.addEventListener('click', openAutoBackupManager);
    closeAutoBackupManagerBtn.addEventListener('click', closeAutoBackupManager);
    doneAutoBackupManagerBtn.addEventListener('click', closeAutoBackupManager);
    autoBackupManagerModal.addEventListener('click', event => { if (event.target === autoBackupManagerModal) closeAutoBackupManager(); });
    autoBackupList.addEventListener('click', event => {
      const restoreButton = event.target.closest('[data-snapshot-restore]');
      const deleteButton = event.target.closest('[data-snapshot-delete]');
      const snapshotId = restoreButton?.dataset.snapshotRestore || deleteButton?.dataset.snapshotDelete;
      if (!snapshotId) return;
      const snapshot = loadAutoBackupSnapshots().find(entry => entry.snapshotId === snapshotId);
      if (snapshot) openAutoBackupConfirmation(restoreButton ? 'restore' : 'delete', snapshot);
    });
    deleteAllAutoBackupsBtn.addEventListener('click', () => openAutoBackupConfirmation('deleteAll'));
    closeAutoBackupConfirmBtn.addEventListener('click', closeAutoBackupConfirmation);
    cancelAutoBackupActionBtn.addEventListener('click', closeAutoBackupConfirmation);
    confirmAutoBackupActionBtn.addEventListener('click', executeAutoBackupAction);
    autoBackupConfirmModal.addEventListener('click', event => { if (event.target === autoBackupConfirmModal) closeAutoBackupConfirmation(); });

    // Sidebar Category Filter
    // Bind each button directly so clicks also work reliably after visual/UI refactors.
    if (sidebarNav) sidebarNav.addEventListener('click', (e) => {
      const editBtn = e.target.closest('[data-edit-category]');
      if (editBtn) { e.preventDefault(); e.stopPropagation(); openCategoryModal(editBtn.dataset.editCategory); return; }
      const btn = e.target.closest('.nav-link[data-category]');
      if (!btn) return;
      handleSidebarCategoryClick(btn.dataset.category);
    });

    // Mobile Category Chips
    if (mobileCategoryChips) mobileCategoryChips.addEventListener('click', (e) => {
      const chip = e.target.closest('.category-chip');
      if (chip && chip.dataset.category) {
        const categoryId = chip.dataset.category; state.activeCategory = categoryId; renderApp();
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

    viewModeButtons.forEach(button => button.addEventListener('click', () => {
      const nextMode = button.dataset.viewMode === 'card' ? 'card' : 'list';
      if (nextMode === state.viewMode) return;
      state.viewMode = nextMode;
      saveSettings({ ...state.settings, viewMode: nextMode });
      renderApp();
    }));

    // Form Modal Controls
    closeFormModalBtn.addEventListener('click', () => closeFormModal());
    cancelFormBtn.addEventListener('click', () => closeFormModal());
    deleteFormItemBtn.addEventListener('click', () => {
      const id = state.currentEditId;
      if (!id) return;
      closeFormModal(true);
      openDeleteModal(id);
    });
    ddayForm.addEventListener('submit', handleFormSubmit);
    ddayForm.querySelectorAll('input[name="calendarType"]').forEach(input => input.addEventListener('change', () => {
      setCalendarType(input.value);
      if (input.value === 'lunar') setLunarFormValues(getLunarDateInfo(startDateInput.value || getTodayMidnight()));
    }));
    repeatCheckbox.addEventListener('change', () => {
      repeatTypeSelect.hidden = !repeatCheckbox.checked;
      if (getSelectedCalendarType() === 'lunar') repeatTypeSelect.value = 'yearly';
      if (repeatCheckbox.checked && getSelectedCalendarType() === 'solar') setSolarRepeatDefaults();
      updateSolarRepeatFields();
      updateLunarYearVisibility();
      if (repeatCheckbox.checked) repeatTypeSelect.focus();
    });
    repeatTypeSelect.addEventListener('change', () => { setSolarRepeatDefaults(); updateSolarRepeatFields(); });
    repeatMonthSelect.addEventListener('change', () => updateRepeatDayOptions());
    manageCategoryBtn.addEventListener('click', openCategoryManagement);
    closeCategoryManagementBtn.addEventListener('click', closeCategoryManagement);
    categoryManagementModal.addEventListener('click', event => { if (event.target === categoryManagementModal) closeCategoryManagement(); });
    managementAddCategoryBtn.addEventListener('click', () => { closeCategoryManagement(); openCategoryModal(); });
    categoryManagementList.addEventListener('click', e => { const row=e.target.closest('[data-manage-category]'); if(!row)return; closeCategoryManagement(); openCategoryModal(row.dataset.manageCategory); });
    closeCategoryModalBtn.addEventListener('click', () => closeCategoryModal());
    cancelCategoryBtn.addEventListener('click', () => closeCategoryModal());
    categoryModal.addEventListener('click', event => { if (event.target === categoryModal) closeCategoryModal(); });
    categoryForm.addEventListener('submit', handleCategorySubmit);
    iconPicker.addEventListener('click', e => { const btn=e.target.closest('[data-icon]'); if(!btn)return; iconPicker.querySelectorAll('.selected').forEach(el=>el.classList.remove('selected')); btn.classList.add('selected'); updateCategoryPreview(); });
    colorPicker.addEventListener('click', e => { const btn=e.target.closest('[data-color]'); if(!btn)return; colorPicker.querySelectorAll('.selected').forEach(el=>el.classList.remove('selected')); btn.classList.add('selected'); updateCategoryPreview(); });
    categoryNameInput.addEventListener('input', updateCategoryPreview);
    pinForm.addEventListener('submit', handlePinSubmit);
    closePinModalBtn.addEventListener('click', closePinModal);
    cancelPinBtn.addEventListener('click', closePinModal);
    pinModal.addEventListener('click', event => { if (event.target === pinModal) closePinModal(); });
    hiddenItemsBtn.addEventListener('click', openHiddenItems);
    closeHiddenItemsBtn.addEventListener('click', closeHiddenItems);
    hiddenItemsModal.addEventListener('click',e=>{if(e.target===hiddenItemsModal)closeHiddenItems();});
    hiddenItemsList.addEventListener('click',e=>{const action=e.target.closest('[data-hidden-action]');if(action){closeHiddenItems();action.dataset.hiddenAction==='edit'?openEditModal(action.dataset.id):openDeleteModal(action.dataset.id);return;}const card=e.target.closest('[data-hidden-id]');if(card){closeHiddenItems();openDetailModal(card.dataset.hiddenId);}});
    managePinBtn.addEventListener('click',()=>{
      if (localStorage.getItem(PRIVACY_PIN_STORAGE_KEY)) { changePinModal.hidden=false; document.body.style.overflow='hidden'; setTimeout(()=>oldPinInput.focus(),50); }
      else requestPin(updatePinSettingsUI, true);
    });
    resetPinBtn.addEventListener('click',openResetPin);
    closePinRequiredBtn.addEventListener('click',closePinRequired); cancelPinRequiredBtn.addEventListener('click',closePinRequired);
    pinRequiredModal.addEventListener('click',event=>{if(event.target===pinRequiredModal)closePinRequired();});
    openPinSettingsBtn.addEventListener('click',()=>{pinRequiredModal.hidden=true;openSettings(true);});
    closeChangePinBtn.addEventListener('click',closeChangePin);cancelChangePinBtn.addEventListener('click',closeChangePin);
    changePinForm.addEventListener('submit',async e=>{e.preventDefault();const oldPin=oldPinInput.value.trim(),newPin=newPinInput.value.trim(),confirm=newPinConfirmInput.value.trim();if(!/^\d{4}$/.test(oldPin)||!/^\d{4}$/.test(newPin)){changePinError.textContent='PIN은 숫자 4자리여야 합니다.';return;}if(newPin!==confirm){changePinError.textContent='새 PIN이 일치하지 않습니다.';return;}if(await hashPin(oldPin)!==localStorage.getItem(PRIVACY_PIN_STORAGE_KEY)){changePinError.textContent='현재 PIN이 올바르지 않습니다.';return;}localStorage.setItem(PRIVACY_PIN_STORAGE_KEY,await hashPin(newPin));updatePinSettingsUI();closeChangePin();showToast('PIN이 변경되었습니다.');});
    closeResetPinBtn.addEventListener('click',closeResetPin);cancelResetPinBtn.addEventListener('click',closeResetPin);
    resetPinModal.addEventListener('click',event=>{if(event.target===resetPinModal)closeResetPin();});
    resetPinForm.addEventListener('submit',async event=>{event.preventDefault();const currentPin=resetCurrentPinInput.value.trim();if(!/^\d{4}$/.test(currentPin)){resetPinError.textContent='PIN은 숫자 4자리여야 합니다.';return;}if(await hashPin(currentPin)!==localStorage.getItem(PRIVACY_PIN_STORAGE_KEY)){resetPinError.textContent='현재 PIN이 올바르지 않습니다.';return;}resetPinModal.hidden=true;resetPinForm.reset();resetPinError.textContent='';confirmResetPinModal.hidden=false;setTimeout(()=>confirmResetPinBtn.focus(),50);});
    closeConfirmResetPinBtn.addEventListener('click',closeConfirmResetPin);cancelConfirmResetPinBtn.addEventListener('click',closeConfirmResetPin);
    confirmResetPinModal.addEventListener('click',event=>{if(event.target===confirmResetPinModal)closeConfirmResetPin();});
    confirmResetPinBtn.addEventListener('click',()=>{localStorage.removeItem(PRIVACY_PIN_STORAGE_KEY);sessionStorage.removeItem(PRIVACY_SESSION_KEY);closeConfirmResetPin();updatePinSettingsUI();showToast('PIN이 초기화되었습니다.');});
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
    closeDiscardConfirmBtn.addEventListener('click', continueEditing);
    continueEditingBtn.addEventListener('click', continueEditing);
    confirmDiscardBtn.addEventListener('click', confirmDiscard);
    discardConfirmModal.addEventListener('click', event => { if (event.target === discardConfirmModal) continueEditing(); });

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
        if (!discardConfirmModal.hidden) {
          e.preventDefault();
          continueEditing();
        } else if (!autoBackupConfirmModal.hidden) {
          closeAutoBackupConfirmation();
        } else if (!autoBackupManagerModal.hidden) {
          closeAutoBackupManager();
        } else if (!memoDeleteModal.hidden) {
          closeMemoDeleteModal();
        } else if (!memoCategoryModal.hidden) {
          closeMemoCategoryManagement();
        } else if (!memoModal.hidden) {
          closeMemoModal();
        } else if (!restoreConfirmModal.hidden) {
          closeRestoreConfirmation();
        } else if (!changePinModal.hidden) {
          closeChangePin();
        } else if (!confirmResetPinModal.hidden) {
          closeConfirmResetPin();
        } else if (!resetPinModal.hidden) {
          closeResetPin();
        } else if (!pinRequiredModal.hidden) {
          closePinRequired();
        } else if (!hiddenItemsModal.hidden) {
          closeHiddenItems();
        } else if (!pinModal.hidden) {
          closePinModal();
        } else if (!calendarJumpModal.hidden) {
          calendarJumpModal.hidden = true; document.body.style.overflow = '';
        } else if (!calendarMoreModal.hidden) {
          closeCalendarMoreModal();
        } else if (!formModal.hidden) {
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
      const completeBtn = e.target.closest('.btn-action-complete');
      if (completeBtn) {
        toggleTaskCompletion(completeBtn.dataset.id, completeBtn.dataset.occurrenceStart);
        return;
      }
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

      const listRow = e.target.closest('.schedule-list-row[data-id]');
      if (listRow) {
        openDetailModal(listRow.dataset.id);
        return;
      }

      const card = e.target.closest('.dday-card[data-id]');
      if (card) openDetailModal(card.dataset.id);
    });

    cardsContainer.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.schedule-list-row[data-id]')) {
        e.preventDefault();
        openDetailModal(e.target.dataset.id);
      } else if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.dday-card[data-id]')) {
        e.preventDefault();
        openDetailModal(e.target.dataset.id);
      }
    });
    heroSection.addEventListener('click', event => { const completion=event.target.closest('[data-task-completion]'); if(completion){toggleTaskCompletion(completion.dataset.id, completion.dataset.occurrenceStart);return;} const row=event.target.closest('.today-schedule-row[data-id]'); if(row) openDetailModal(row.dataset.id, row.dataset.occurrenceStart, row.dataset.occurrenceEnd); });
    heroSection.addEventListener('keydown', event => { if ((event.key==='Enter'||event.key===' ') && event.target.matches('.today-schedule-row[data-id]')) { event.preventDefault(); openDetailModal(event.target.dataset.id, event.target.dataset.occurrenceStart, event.target.dataset.occurrenceEnd); } });

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
    lunarYearSelect.innerHTML = Array.from({length:LUNAR_YEAR_MAX - LUNAR_YEAR_MIN + 1}, (_, index) => LUNAR_YEAR_MIN + index).map(year => `<option value="${year}">${year}년</option>`).join('');
    lunarMonthSelect.innerHTML = Array.from({length:12}, (_, index) => index + 1).map(month => `<option value="${month}">${month}월</option>`).join('');
    lunarDaySelect.innerHTML = Array.from({length:30}, (_, index) => index + 1).map(day => `<option value="${day}">${day}일</option>`).join('');
    repeatMonthSelect.innerHTML = Array.from({length:12}, (_, index) => index + 1).map(month => `<option value="${month}">${month}월</option>`).join('');
    updateRepeatDayOptions();
    state.settings = loadSettings();
    applySettings(state.settings);
    state.categories = loadCategories();
    syncCategoryMap();
    state.items = loadDDays();
    state.memos = loadMemos();
    state.memoCategories = loadMemoCategories();
    saveDDays(state.items);
    initEventListeners();
    renderApp();
    updateAutoBackupUI();
    checkScheduledAutoBackup();
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }

})();
