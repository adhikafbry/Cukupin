/**
 * CUKUPIN - Budgeting Ramah Mahasiswa Rantau
 * Technical: Vanilla JavaScript, LocalStorage, Pure Logic Separation, Chart.js.
 */

// =============================================================================
// 1. ENGINE PERHITUNGAN (CALCULATION MODULE - PURE LOGIC, TESTABLE)
// =============================================================================

const CukupinCalc = {
  /**
   * Mengembalikan tanggal hari ini dalam format YYYY-MM-DD lokal
   */
  getTodayString(d = new Date()) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  /**
   * Format tanggal lokal ke format bahasa Indonesia santai
   * Contoh: "25 November 2026"
   */
  formatDateIndo(dateStr) {
    if (!dateStr) return '-';
    const [y, m, d] = dateStr.split('-').map(Number);
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return `${d} ${months[m - 1]} ${y}`;
  },

  /**
   * Menghitung sisa hari sampai tanggal kiriman berikutnya.
   * Hari ini dihitung sebagai 1 hari masa hidup jatah.
   * Minimal 1 hari jika tanggal kiriman adalah hari ini atau sudah lewat.
   */
  getRemainingDays(nextDateStr, todayStr = CukupinCalc.getTodayString()) {
    if (!nextDateStr) return 1;
    const [tY, tM, tD] = todayStr.split('-').map(Number);
    const [nY, nM, nD] = nextDateStr.split('-').map(Number);

    const todayDate = new Date(tY, tM - 1, tD);
    const nextDate = new Date(nY, nM - 1, nD);

    const diffTime = nextDate.getTime() - todayDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    // Hari ini tetap dihitung butuh makan/jajan (minimal 1 hari)
    return Math.max(diffDays, 1);
  },

  /**
   * Menghitung selisih hari antara dua tanggal (d2 - d1)
   */
  daysBetween(d1Str, d2Str) {
    if (!d1Str || !d2Str) return 0;
    const [y1, m1, day1] = d1Str.split('-').map(Number);
    const [y2, m2, day2] = d2Str.split('-').map(Number);
    const dt1 = new Date(y1, m1 - 1, day1);
    const dt2 = new Date(y2, m2 - 1, day2);
    return Math.round((dt2 - dt1) / (1000 * 60 * 60 * 24));
  },

  /**
   * Menambahkan sejumlah hari ke sebuah tanggal dan mengembalikan YYYY-MM-DD
   */
  addDaysToDate(dateStr, daysToAdd) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + daysToAdd);
    return CukupinCalc.getTodayString(date);
  },

  /**
   * Menghitung total biaya tetap yang BELUM dibayar
   */
  getUnpaidFixedCosts(fixedCosts = []) {
    return fixedCosts
      .filter(item => !item.paid)
      .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  },

  /**
   * Menghitung total biaya tetap yang SUDAH dibayar
   */
  getPaidFixedCosts(fixedCosts = []) {
    return fixedCosts
      .filter(item => item.paid)
      .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  },

  /**
   * Menghitung total pengeluaran jajan pada hari tertentu
   */
  getDailyExpensesTotal(expenses = [], targetDateStr = CukupinCalc.getTodayString()) {
    return expenses
      .filter(item => item.date === targetDateStr)
      .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  },

  /**
   * Menghitung total semua pengeluaran jajan yang tercatat
   */
  getAllExpensesTotal(expenses = []) {
    return expenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  },

  /**
   * Menghitung total pemasukan tambahan (extra income)
   */
  getTotalExtraIncomes(extraIncomes = []) {
    return extraIncomes.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  },

  /**
   * Menghitung saldo uang riil yang dipegang saat ini:
   * Saldo awal + Pemasukan tambahan - Total semua pengeluaran - Biaya tetap yang sudah dibayar
   */
  getCurrentBalance(initialBalance = 0, extraIncomes = [], expenses = [], fixedCosts = []) {
    const totalExtra = CukupinCalc.getTotalExtraIncomes(extraIncomes);
    const totalExpenses = CukupinCalc.getAllExpensesTotal(expenses);
    const paidFixed = CukupinCalc.getPaidFixedCosts(fixedCosts);

    return (Number(initialBalance) || 0) + totalExtra - totalExpenses - paidFixed;
  },

  /**
   * Menghitung sisa jatah harian dan status keuangan:
   * Jatah harian = (saldo sekarang - total biaya tetap yang belum dibayar) / sisa hari
   * Sisa jatah hari ini = Jatah harian dasar hari ini - Total jajan hari ini
   */
  calculateDailyAllowance({
    currentBalance = 0,
    unpaidFixedCosts = 0,
    daysRemaining = 1,
    todaySpent = 0
  }) {
    const days = Math.max(daysRemaining, 1);
    
    // Saldo awal hari ini sebelum jajan hari ini dikeluarkan
    const balanceStartOfDay = currentBalance + todaySpent;

    // Uang bebas di awal hari ini setelah dikurangi komitmen biaya tetap yang belum dibayar
    const availableFunds = balanceStartOfDay - unpaidFixedCosts;

    // Jatah harian dasar yang dialokasikan untuk hari ini
    const baseDailyAllowance = availableFunds / days;

    // Sisa jatah yang boleh dihabiskan hari ini
    const remainingToday = baseDailyAllowance - todaySpent;

    // Penentuan persentase sisa dan status:
    // - Hijau (aman): sisa > 30% dari jatah dasar
    // - Kuning (warning): sisa <= 30% dan >= 0
    // - Merah (exceeded): sisa < 0 (melebihi jatah) atau uang bebas minus
    let status = 'safe';
    let percentage = 100;

    if (baseDailyAllowance <= 0) {
      status = 'exceeded';
      percentage = 0;
    } else {
      percentage = (remainingToday / baseDailyAllowance) * 100;
      if (remainingToday < 0) {
        status = 'exceeded';
      } else if (percentage <= 30) {
        status = 'warning';
      } else {
        status = 'safe';
      }
    }

    return {
      balanceStartOfDay: Math.round(balanceStartOfDay),
      availableFunds: Math.round(availableFunds),
      baseDailyAllowance: Math.round(baseDailyAllowance),
      remainingToday: Math.round(remainingToday),
      todaySpent: Math.round(todaySpent),
      percentage: Math.max(0, Math.min(100, Math.round(percentage))),
      status
    };
  },

  /**
   * Prediksi Ketahanan Uang:
   * "Uangmu cukup sampai tanggal X", berdasarkan rata-rata pengeluaran harian sejauh ini.
   */
  calculatePrediction({
    currentBalance = 0,
    unpaidFixedCosts = 0,
    expenses = [],
    cycleStartDate = '',
    nextAllowanceDate = '',
    todayStr = CukupinCalc.getTodayString()
  }) {
    const availableFundsNow = currentBalance - unpaidFixedCosts;

    // Hitung hari yang sudah berjalan sejak siklus dimulai
    const start = cycleStartDate || todayStr;
    const elapsedDays = Math.max(1, CukupinCalc.daysBetween(start, todayStr) + 1);

    // Total pengeluaran dalam siklus berjalan
    const totalSpentInCycle = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const avgDailySpend = Math.round(totalSpentInCycle / elapsedDays);

    // Kasus 1: Uang bebas sudah habis atau minus
    if (availableFundsNow <= 0) {
      return {
        predictedDateStr: todayStr,
        predictedDateFormatted: CukupinCalc.formatDateIndo(todayStr),
        avgDailySpend,
        daysWillLast: 0,
        status: 'danger',
        message: 'Uang bebasmu sudah habis untuk biaya tetap / jajan. Rem pengeluaran sekarang!',
        subInfo: 'Saldo aktifmu tersisa hanya cukup untuk biaya wajib atau bahkan minus.'
      };
    }

    // Kasus 2: Belum pernah jajan sama sekali
    if (avgDailySpend === 0) {
      return {
        predictedDateStr: nextAllowanceDate,
        predictedDateFormatted: CukupinCalc.formatDateIndo(nextAllowanceDate),
        avgDailySpend: 0,
        daysWillLast: 999,
        status: 'safe',
        message: `Uangmu diprediksi aman sampai tanggal ${CukupinCalc.formatDateIndo(nextAllowanceDate)} dan seterusnya.`,
        subInfo: 'Belum ada jajan yang dicatat di siklus ini. Dompetmu masih utuh!'
      };
    }

    // Kasus 3: Menghitung berapa hari sisa uang bebas akan bertahan dengan gaya jajan saat ini
    const daysWillLast = Math.floor(availableFundsNow / avgDailySpend);
    const predictedDateStr = CukupinCalc.addDaysToDate(todayStr, daysWillLast);
    const predictedDateFormatted = CukupinCalc.formatDateIndo(predictedDateStr);

    const remainingDaysToNext = CukupinCalc.getRemainingDays(nextAllowanceDate, todayStr);
    const diffWithTarget = daysWillLast - remainingDaysToNext;

    if (diffWithTarget >= 0) {
      return {
        predictedDateStr,
        predictedDateFormatted,
        avgDailySpend,
        daysWillLast,
        status: 'safe',
        message: `Mantap! Uangmu cukup sampai ${predictedDateFormatted} 🎉`,
        subInfo: `Rata-rata jajanmu ${formatRupiah(avgDailySpend)}/hari. Gaya jajanmu aman melewati tanggal kiriman!`
      };
    } else {
      const shortageDays = Math.abs(diffWithTarget);
      return {
        predictedDateStr,
        predictedDateFormatted,
        avgDailySpend,
        daysWillLast,
        status: 'warning',
        message: `Hati-hati! Uangmu diprediksi cuma cukup sampai ${predictedDateFormatted} ⚠️`,
        subInfo: `Dengan jajan rata-rata ${formatRupiah(avgDailySpend)}/hari, uangmu bisa habis ${shortageDays} hari sebelum kiriman datang.`
      };
    }
  }
};

// =============================================================================
// 2. HELPER UTILS (FORMAT RUPIAH, TANGGAL, PESAN STATUS)
// =============================================================================

function formatRupiah(amount, withPrefix = true) {
  const num = Number(amount) || 0;
  const isNegative = num < 0;
  const absNum = Math.abs(num);
  const formatted = new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 0
  }).format(absNum);

  if (!withPrefix) {
    return (isNegative ? '-' : '') + formatted;
  }
  return (isNegative ? '-Rp ' : 'Rp ') + formatted;
}

function parseRupiahInput(str) {
  if (!str) return 0;
  return parseInt(String(str).replace(/[^0-9]/g, ''), 10) || 0;
}

function getCategoryIcon(catKey) {
  const icons = {
    makan: '🍲',
    transport: '🛵',
    nongkrong: '☕',
    lainnya: '📦'
  };
  return icons[catKey] || '💸';
}

function getCategoryLabel(catKey) {
  const labels = {
    makan: 'Makan',
    transport: 'Transport',
    nongkrong: 'Nongkrong',
    lainnya: 'Lainnya'
  };
  return labels[catKey] || 'Pengeluaran';
}

function getFriendlyStatus(status, remaining, baseAllowance) {
  if (status === 'safe') {
    if (remaining === baseAllowance) {
      return {
        emoji: '✨',
        text: 'Jatah hari ini masih utuh. Gas ngopi atau makan enak!'
      };
    }
    return {
      emoji: '☕',
      text: 'Aman, jatahmu masih longgar. Lanjut ngopi santai!'
    };
  }

  if (status === 'warning') {
    return {
      emoji: '⚠️',
      text: 'Jatah tinggal dikit nih, rem dulu jajan sorenya ya.'
    };
  }

  // Exceeded
  const overspent = Math.abs(remaining);
  return {
    emoji: '🥲',
    text: `Hari ini over ${formatRupiah(overspent)}! Puasa jajan dulu biar hari esok aman.`
  };
}

function getGreetingByHour() {
  const hour = new Date().getHours();
  if (hour >= 4 && hour < 11) return 'Selamat pagi! 🌅';
  if (hour >= 11 && hour < 15) return 'Selamat siang! ☀️';
  if (hour >= 15 && hour < 18) return 'Selamat sore! 🌇';
  return 'Selamat malam! 🌙';
}

// =============================================================================
// 3. STORAGE & STATE MANAGEMENT (LOCALSTORAGE)
// =============================================================================

const STORAGE_KEY = 'cukupin_data';

const AppState = {
  data: {
    initialBalance: 0,
    nextAllowanceDate: '',
    cycleStartDate: '',
    fixedCosts: [],
    expenses: [],
    extraIncomes: [],
    isSetupCompleted: false,
    theme: 'light'
  },

  load() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.data = { ...this.data, ...parsed };
      }
      if (!this.data.cycleStartDate) {
        this.data.cycleStartDate = CukupinCalc.getTodayString();
      }
    } catch (e) {
      console.error('Gagal memuat data dari localStorage:', e);
    }
    return this.data;
  },

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.error('Gagal menyimpan data ke localStorage:', e);
    }
  },

  reset() {
    localStorage.removeItem(STORAGE_KEY);
    this.data = {
      initialBalance: 0,
      nextAllowanceDate: '',
      cycleStartDate: CukupinCalc.getTodayString(),
      fixedCosts: [],
      expenses: [],
      extraIncomes: [],
      isSetupCompleted: false,
      theme: 'light'
    };
  }
};

// =============================================================================
// 4. UI CONTROLLER & EVENT LISTENERS
// =============================================================================

const UI = {
  elements: {},
  cycleChartInstance: null,

  init() {
    this.cacheDOMElements();
    this.bindEvents();
    this.initTheme();

    AppState.load();

    if (AppState.data.isSetupCompleted) {
      this.showDashboard();
    } else {
      this.showSetup();
    }

    // Auto-refresh saat ganti hari atau saat kembali fokus ke tab browser
    let lastRenderDate = CukupinCalc.getTodayString();
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && AppState.data.isSetupCompleted) {
        const currentDate = CukupinCalc.getTodayString();
        if (currentDate !== lastRenderDate) {
          lastRenderDate = currentDate;
          this.renderDashboard();
        }
      }
    });

    setInterval(() => {
      if (AppState.data.isSetupCompleted) {
        const currentDate = CukupinCalc.getTodayString();
        if (currentDate !== lastRenderDate) {
          lastRenderDate = currentDate;
          this.renderDashboard();
        }
      }
    }, 60000);
  },

  cacheDOMElements() {
    this.elements = {
      // Views
      viewSetup: document.getElementById('view-setup'),
      viewDashboard: document.getElementById('view-dashboard'),
      fabContainer: document.getElementById('fab-container'),

      // Header
      btnThemeToggle: document.getElementById('btn-theme-toggle'),
      btnOpenSettings: document.getElementById('btn-open-settings'),

      // Setup Form
      formSetup: document.getElementById('form-setup'),
      setupIncome: document.getElementById('setup-income'),
      setupNextDate: document.getElementById('setup-next-date'),
      setupFixedList: document.getElementById('setup-fixed-list'),
      btnAddFixedItem: document.getElementById('btn-add-fixed-item'),

      // Dashboard Greetings & Badges
      greetingTime: document.getElementById('greeting-time'),
      btnEditDateQuick: document.getElementById('btn-edit-date-quick'),
      daysRemainingCount: document.getElementById('days-remaining-count'),
      cycleDueBanner: document.getElementById('cycle-due-banner'),
      btnBannerNewCycle: document.getElementById('btn-banner-new-cycle'),

      // Hero Allowance Card
      allowanceCard: document.getElementById('allowance-card'),
      allowanceAmount: document.getElementById('allowance-amount'),
      allowanceStatusPill: document.getElementById('allowance-status-pill'),
      allowanceStatusText: document.getElementById('allowance-status-text'),
      allowanceProgressFill: document.getElementById('allowance-progress-fill'),
      progressSpentText: document.getElementById('progress-spent-text'),
      progressBudgetText: document.getElementById('progress-budget-text'),
      friendlyEmoji: document.getElementById('friendly-emoji'),
      friendlyText: document.getElementById('friendly-text'),

      // Overspent Recovery Card (Edge Case)
      overspentRecoveryCard: document.getElementById('overspent-recovery-card'),
      overspentRecoveryDesc: document.getElementById('overspent-recovery-desc'),
      recoveryImpactBox: document.getElementById('recovery-impact-box'),

      // Prediction Card
      predictionCard: document.getElementById('prediction-card'),
      predictionHighlightText: document.getElementById('prediction-highlight-text'),
      predictionSubInfo: document.getElementById('prediction-sub-info'),

      // Wallet stats
      statCurrentBalance: document.getElementById('stat-current-balance'),
      statUnpaidFixed: document.getElementById('stat-unpaid-fixed'),
      statAvailableFunds: document.getElementById('stat-available-funds'),
      statFundsNote: document.getElementById('stat-funds-note'),
      btnAddIncomeQuick: document.getElementById('btn-add-income-quick'),
      btnToggleFixedView: document.getElementById('btn-toggle-fixed-view'),
      fixedCostsDrawer: document.getElementById('fixed-costs-drawer'),
      dashboardFixedList: document.getElementById('dashboard-fixed-list'),
      btnAddFixedDashboard: document.getElementById('btn-add-fixed-dashboard'),

      // Chart.js Card
      chartCard: document.getElementById('chart-card'),
      chartCycleLabel: document.getElementById('chart-cycle-label'),
      cycleChartCanvas: document.getElementById('cycleChart'),

      // Today Expenses
      expensesTodayCount: document.getElementById('expenses-today-count'),
      expensesTodayTotal: document.getElementById('expenses-today-total'),
      todayExpensesList: document.getElementById('today-expenses-list'),

      // FAB & Jajan Modal
      btnOpenJajanModal: document.getElementById('btn-open-jajan-modal'),
      modalJajan: document.getElementById('modal-jajan'),
      btnCloseJajan: document.getElementById('btn-close-jajan'),
      formJajan: document.getElementById('form-jajan'),
      editExpenseId: document.getElementById('edit-expense-id'),
      jajanAmount: document.getElementById('jajan-amount'),
      jajanNote: document.getElementById('jajan-note'),
      btnSubmitJajan: document.getElementById('btn-submit-jajan'),

      // Extra Income Modal
      modalIncome: document.getElementById('modal-income'),
      btnCloseIncome: document.getElementById('btn-close-income'),
      btnCancelIncome: document.getElementById('btn-cancel-income'),
      formIncome: document.getElementById('form-income'),
      incomeAmount: document.getElementById('income-amount'),
      incomeNote: document.getElementById('income-note'),

      // Edit Date Modal
      modalEditDate: document.getElementById('modal-edit-date'),
      btnCloseEditDate: document.getElementById('btn-close-edit-date'),
      btnCancelEditDate: document.getElementById('btn-cancel-edit-date'),
      formEditDate: document.getElementById('form-edit-date'),
      editTargetDate: document.getElementById('edit-target-date'),

      // New Cycle Modal
      modalNewCycle: document.getElementById('modal-new-cycle'),
      btnCloseNewCycle: document.getElementById('btn-close-new-cycle'),
      btnCancelNewCycle: document.getElementById('btn-cancel-new-cycle'),
      formNewCycle: document.getElementById('form-new-cycle'),
      newCyclePrevBalance: document.getElementById('new-cycle-prev-balance'),
      checkCarryOver: document.getElementById('check-carry-over'),
      newCycleIncome: document.getElementById('new-cycle-income'),
      newCycleNextDate: document.getElementById('new-cycle-next-date'),
      checkResetFixedCosts: document.getElementById('check-reset-fixed-costs'),

      // Fixed Cost Modal
      modalFixed: document.getElementById('modal-fixed'),
      btnCloseFixed: document.getElementById('btn-close-fixed'),
      btnCancelFixed: document.getElementById('btn-cancel-fixed'),
      formFixedItem: document.getElementById('form-fixed-item'),
      modalFixedTitle: document.getElementById('modal-fixed-title'),
      fixedItemId: document.getElementById('fixed-item-id'),
      fixedName: document.getElementById('fixed-name'),
      fixedAmount: document.getElementById('fixed-amount'),
      fixedPaidStatus: document.getElementById('fixed-paid-status'),

      // Settings Modal
      modalSettings: document.getElementById('modal-settings'),
      btnCloseSettings: document.getElementById('btn-close-settings'),
      settingsCurrentDateLabel: document.getElementById('settings-current-date-label'),
      btnSettingsOpenNewCycle: document.getElementById('btn-settings-open-new-cycle'),
      btnSettingsEditDate: document.getElementById('btn-settings-edit-date'),
      btnSettingsAddIncome: document.getElementById('btn-settings-add-income'),
      btnExportBackup: document.getElementById('btn-export-backup'),
      inputImportBackup: document.getElementById('input-import-backup'),
      btnSettingsToggleTheme: document.getElementById('btn-settings-toggle-theme'),
      btnSettingsReset: document.getElementById('btn-settings-reset'),

      // Confirm Modal
      modalConfirm: document.getElementById('modal-confirm'),
      btnConfirmCancel: document.getElementById('btn-confirm-cancel'),
      btnConfirmOk: document.getElementById('btn-confirm-ok'),
      confirmTitle: document.getElementById('confirm-title'),
      confirmDesc: document.getElementById('confirm-desc')
    };
  },

  bindEvents() {
    // Theme toggle
    this.elements.btnThemeToggle.addEventListener('click', () => this.toggleTheme());
    this.elements.btnSettingsToggleTheme.addEventListener('click', () => this.toggleTheme());

    // Settings Modal
    this.elements.btnOpenSettings.addEventListener('click', () => this.openSettingsModal());
    this.elements.btnCloseSettings.addEventListener('click', () => this.closeSettingsModal());

    // Reset All Data
    this.elements.btnSettingsReset.addEventListener('click', () => {
      this.closeSettingsModal();
      this.openConfirmModal({
        title: 'Mulai Dari Awal?',
        desc: 'Apakah kamu ingin menghapus semua data dan mengatur ulang? Tindakan ini tidak bisa dibatalkan.',
        onConfirm: () => {
          AppState.reset();
          this.showSetup();
        }
      });
    });

    // Setup input number formatting
    this.elements.setupIncome.addEventListener('input', (e) => {
      const val = parseRupiahInput(e.target.value);
      e.target.value = val ? new Intl.NumberFormat('id-ID').format(val) : '';
    });

    // Tambah baris biaya tetap di setup screen
    this.elements.btnAddFixedItem.addEventListener('click', () => {
      this.addFixedItemRowSetup();
    });

    // Submit setup form
    this.elements.formSetup.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSetupSubmit();
    });

    // Ubah tanggal cepat dari badge dashboard & settings
    this.elements.btnEditDateQuick.addEventListener('click', () => this.openEditDateModal());
    this.elements.btnSettingsEditDate.addEventListener('click', () => {
      this.closeSettingsModal();
      this.openEditDateModal();
    });
    this.elements.btnCloseEditDate.addEventListener('click', () => this.closeEditDateModal());
    this.elements.btnCancelEditDate.addEventListener('click', () => this.closeEditDateModal());
    this.elements.formEditDate.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleEditDateSubmit();
    });

    // Pemasukan Ekstra
    this.elements.btnAddIncomeQuick.addEventListener('click', () => this.openIncomeModal());
    this.elements.btnSettingsAddIncome.addEventListener('click', () => {
      this.closeSettingsModal();
      this.openIncomeModal();
    });
    this.elements.btnCloseIncome.addEventListener('click', () => this.closeIncomeModal());
    this.elements.btnCancelIncome.addEventListener('click', () => this.closeIncomeModal());
    this.elements.incomeAmount.addEventListener('input', (e) => {
      const val = parseRupiahInput(e.target.value);
      e.target.value = val ? new Intl.NumberFormat('id-ID').format(val) : '';
    });
    this.elements.formIncome.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleIncomeSubmit();
    });

    // Siklus Baru
    this.elements.btnBannerNewCycle.addEventListener('click', () => this.openNewCycleModal());
    this.elements.btnSettingsOpenNewCycle.addEventListener('click', () => {
      this.closeSettingsModal();
      this.openNewCycleModal();
    });
    this.elements.btnCloseNewCycle.addEventListener('click', () => this.closeNewCycleModal());
    this.elements.btnCancelNewCycle.addEventListener('click', () => this.closeNewCycleModal());
    this.elements.newCycleIncome.addEventListener('input', (e) => {
      const val = parseRupiahInput(e.target.value);
      e.target.value = val ? new Intl.NumberFormat('id-ID').format(val) : '';
    });
    this.elements.formNewCycle.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleNewCycleSubmit();
    });

    // Toggle drawer biaya tetap di dashboard
    this.elements.btnToggleFixedView.addEventListener('click', () => {
      const isHidden = this.elements.fixedCostsDrawer.classList.contains('hidden');
      if (isHidden) {
        this.elements.fixedCostsDrawer.classList.remove('hidden');
        this.elements.btnToggleFixedView.textContent = 'Tutup Biaya';
      } else {
        this.elements.fixedCostsDrawer.classList.add('hidden');
        this.elements.btnToggleFixedView.textContent = 'Biaya Tetap';
      }
    });

    // Tambah biaya tetap dari dashboard
    this.elements.btnAddFixedDashboard.addEventListener('click', () => {
      this.openFixedModal();
    });

    // Modal Fixed Item events
    this.elements.btnCloseFixed.addEventListener('click', () => this.closeFixedModal());
    this.elements.btnCancelFixed.addEventListener('click', () => this.closeFixedModal());
    this.elements.fixedAmount.addEventListener('input', (e) => {
      const val = parseRupiahInput(e.target.value);
      e.target.value = val ? new Intl.NumberFormat('id-ID').format(val) : '';
    });
    this.elements.formFixedItem.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleFixedItemSubmit();
    });

    // FAB Open Jajan Modal
    this.elements.btnOpenJajanModal.addEventListener('click', () => {
      this.openJajanModal();
    });

    // Close Jajan Modal
    this.elements.btnCloseJajan.addEventListener('click', () => {
      this.closeJajanModal();
    });

    // Quick Amount Chips di Jajan Modal
    document.querySelectorAll('.amount-chips .chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const amt = Number(chip.getAttribute('data-amount')) || 0;
        const current = parseRupiahInput(this.elements.jajanAmount.value);
        const newTotal = current + amt;
        this.elements.jajanAmount.value = new Intl.NumberFormat('id-ID').format(newTotal);
      });
    });

    // Jajan amount formatting
    this.elements.jajanAmount.addEventListener('input', (e) => {
      const val = parseRupiahInput(e.target.value);
      e.target.value = val ? new Intl.NumberFormat('id-ID').format(val) : '';
    });

    // Submit Jajan Form
    this.elements.formJajan.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleJajanSubmit();
    });

    // Export Backup JSON
    this.elements.btnExportBackup.addEventListener('click', () => this.handleExportBackup());

    // Import Backup JSON
    this.elements.inputImportBackup.addEventListener('change', (e) => this.handleImportBackup(e));

    // Close modals on clicking overlay backdrop
    const allModals = [
      this.elements.modalJajan,
      this.elements.modalFixed,
      this.elements.modalIncome,
      this.elements.modalEditDate,
      this.elements.modalNewCycle,
      this.elements.modalSettings,
      this.elements.modalConfirm
    ];
    allModals.forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.add('hidden');
        }
      });
    });
  },

  // ===========================================================================
  // THEME (DARK / LIGHT MODE & SYSTEM PREFERENCE SYNC)
  // ===========================================================================
  initTheme() {
    const savedTheme = AppState.data.theme || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    this.applyTheme(savedTheme);

    // Dengar perubahan system theme jika belum diset manual
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        if (!localStorage.getItem(STORAGE_KEY)) {
          this.applyTheme(e.matches ? 'dark' : 'light');
        }
      });
    }
  },

  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    this.applyTheme(next);
  },

  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    AppState.data.theme = theme;
    AppState.save();
    if (this.elements.btnThemeToggle) {
      this.elements.btnThemeToggle.querySelector('.theme-icon').textContent = theme === 'dark' ? '☀️' : '🌙';
    }
    // Update chart colors if chart exists
    if (this.cycleChartInstance) {
      this.renderCycleChart();
    }
  },

  // ===========================================================================
  // SETUP SCREEN LOGIC
  // ===========================================================================
  showSetup() {
    this.elements.viewSetup.classList.remove('hidden');
    this.elements.viewDashboard.classList.add('hidden');
    this.elements.fabContainer.classList.add('hidden');

    const today = new Date();
    let targetYear = today.getFullYear();
    let targetMonth = today.getMonth();
    if (today.getDate() >= 25) {
      targetMonth += 1;
      if (targetMonth > 11) {
        targetMonth = 0;
        targetYear += 1;
      }
    }
    const defaultDate = new Date(targetYear, targetMonth, 25);
    this.elements.setupNextDate.value = CukupinCalc.getTodayString(defaultDate);
    this.elements.setupNextDate.min = CukupinCalc.getTodayString();

    this.elements.setupFixedList.innerHTML = '';
    this.addFixedItemRowSetup('Biaya Kosan', 600000);
    this.addFixedItemRowSetup('Wifi & Kas', 50000);
  },

  addFixedItemRowSetup(name = '', amount = '') {
    const row = document.createElement('div');
    row.className = 'fixed-item-row';
    const formattedAmt = amount ? new Intl.NumberFormat('id-ID').format(amount) : '';

    row.innerHTML = `
      <input type="text" class="fixed-item-name" placeholder="Nama biaya" value="${name}" required>
      <div class="input-prefix-wrapper fixed-item-amt-wrap" style="flex: 1.2;">
        <span class="input-prefix" style="left: 10px; font-size: 0.85rem;">Rp</span>
        <input type="text" inputmode="numeric" class="fixed-item-amt" placeholder="0" value="${formattedAmt}" style="padding-left: 34px;" required>
      </div>
      <button type="button" class="btn-remove-row" title="Hapus">&times;</button>
    `;

    const amtInput = row.querySelector('.fixed-item-amt');
    amtInput.addEventListener('input', (e) => {
      const val = parseRupiahInput(e.target.value);
      e.target.value = val ? new Intl.NumberFormat('id-ID').format(val) : '';
    });

    row.querySelector('.btn-remove-row').addEventListener('click', () => {
      row.remove();
    });

    this.elements.setupFixedList.appendChild(row);
  },

  handleSetupSubmit() {
    const income = parseRupiahInput(this.elements.setupIncome.value);
    const nextDate = this.elements.setupNextDate.value;

    if (!income || income <= 0) {
      alert('Silakan masukkan nominal uang kiriman/saldo awal yang valid ya!');
      return;
    }

    if (!nextDate) {
      alert('Pilih tanggal kiriman berikutnya dulu ya!');
      return;
    }

    const fixedRows = this.elements.setupFixedList.querySelectorAll('.fixed-item-row');
    const fixedCosts = [];

    fixedRows.forEach(row => {
      const nameInput = row.querySelector('.fixed-item-name');
      const amtInput = row.querySelector('.fixed-item-amt');
      const name = nameInput.value.trim();
      const amount = parseRupiahInput(amtInput.value);

      if (name && amount > 0) {
        fixedCosts.push({
          id: 'fc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
          name,
          amount,
          paid: false
        });
      }
    });

    AppState.data.initialBalance = income;
    AppState.data.nextAllowanceDate = nextDate;
    AppState.data.cycleStartDate = CukupinCalc.getTodayString();
    AppState.data.fixedCosts = fixedCosts;
    AppState.data.expenses = [];
    AppState.data.extraIncomes = [];
    AppState.data.isSetupCompleted = true;
    AppState.save();

    this.showDashboard();
  },

  // ===========================================================================
  // DASHBOARD RENDERING & RECALCULATION
  // ===========================================================================
  showDashboard() {
    this.elements.viewSetup.classList.add('hidden');
    this.elements.viewDashboard.classList.remove('hidden');
    this.elements.fabContainer.classList.remove('hidden');

    this.renderDashboard();
  },

  renderDashboard() {
    const { initialBalance, nextAllowanceDate, cycleStartDate, fixedCosts, expenses, extraIncomes } = AppState.data;

    const todayStr = CukupinCalc.getTodayString();
    const daysRemaining = CukupinCalc.getRemainingDays(nextAllowanceDate, todayStr);
    const unpaidFixed = CukupinCalc.getUnpaidFixedCosts(fixedCosts);
    const todaySpent = CukupinCalc.getDailyExpensesTotal(expenses, todayStr);
    const currentBalance = CukupinCalc.getCurrentBalance(initialBalance, extraIncomes, expenses, fixedCosts);

    // Hitung jatah dengan calculation engine
    const allowanceData = CukupinCalc.calculateDailyAllowance({
      currentBalance,
      unpaidFixedCosts: unpaidFixed,
      daysRemaining,
      todaySpent
    });

    // 1. Render Greeting & Countdown
    this.elements.greetingTime.textContent = getGreetingByHour();
    this.elements.daysRemainingCount.textContent = `${daysRemaining} hari`;
    this.elements.settingsCurrentDateLabel.textContent = CukupinCalc.formatDateIndo(nextAllowanceDate);

    // Cek apakah tanggal kiriman hari ini atau sudah lewat (Due banner)
    const isOverdue = todayStr >= nextAllowanceDate;
    if (isOverdue) {
      this.elements.cycleDueBanner.classList.remove('hidden');
    } else {
      this.elements.cycleDueBanner.classList.add('hidden');
    }

    // 2. Render Hero Allowance Card (dengan animasi pop)
    this.renderAllowanceCard(allowanceData);

    // 3. Render Edge Case: Jatah Minus (Overspent Recovery Card)
    this.renderOverspentRecovery(allowanceData, daysRemaining);

    // 4. Render Prediksi Ketahanan Uang
    this.renderPrediction({
      currentBalance,
      unpaidFixedCosts: unpaidFixed,
      expenses,
      cycleStartDate,
      nextAllowanceDate,
      todayStr
    });

    // 5. Render Wallet Summary
    this.elements.statCurrentBalance.textContent = formatRupiah(currentBalance);
    this.elements.statUnpaidFixed.textContent = formatRupiah(unpaidFixed);
    this.elements.statAvailableFunds.textContent = formatRupiah(allowanceData.availableFunds);
    this.elements.statFundsNote.textContent = `Untuk sisa ${daysRemaining} hari`;

    // 6. Render Fixed Costs Items
    this.renderFixedCostsList(fixedCosts);

    // 7. Render Chart.js
    this.renderCycleChart();

    // 8. Render Today Expenses History
    this.renderTodayExpenses(expenses, todayStr);
  },

  renderAllowanceCard(data) {
    const { status, remainingToday, baseDailyAllowance, todaySpent, percentage } = data;
    const card = this.elements.allowanceCard;

    card.classList.remove('status-safe', 'status-warning', 'status-exceeded');
    card.classList.add(`status-${status}`);

    // Update Amount & Status Pill dengan animasi pulse
    const amountEl = this.elements.allowanceAmount;
    amountEl.textContent = formatRupiah(remainingToday);
    amountEl.classList.remove('pop-animation');
    void amountEl.offsetWidth; // trigger reflow
    amountEl.classList.add('pop-animation');

    const statusLabels = {
      safe: 'Aman',
      warning: 'Kurang dari 30%',
      exceeded: 'Melebihi Jatah'
    };
    this.elements.allowanceStatusText.textContent = statusLabels[status];

    // Progress Bar (sisa persentase jatah)
    this.elements.allowanceProgressFill.style.width = `${percentage}%`;
    this.elements.progressSpentText.textContent = `Sudah jajan: ${formatRupiah(todaySpent)}`;
    this.elements.progressBudgetText.textContent = `Jatah awal: ${formatRupiah(baseDailyAllowance)}`;

    // Friendly Message
    const friendly = getFriendlyStatus(status, remainingToday, baseDailyAllowance);
    this.elements.friendlyEmoji.textContent = friendly.emoji;
    this.elements.friendlyText.textContent = friendly.text;
  },

  renderOverspentRecovery(allowanceData, daysRemaining) {
    const { remainingToday, baseDailyAllowance } = allowanceData;
    const card = this.elements.overspentRecoveryCard;

    if (remainingToday < 0) {
      card.classList.remove('hidden');
      const overspent = Math.abs(remainingToday);
      this.elements.overspentRecoveryDesc.textContent = `Hari ini kamu telah melewati jatah sebesar ${formatRupiah(overspent)}.`;

      if (daysRemaining > 1) {
        const nextDays = daysRemaining - 1;
        const deductionPerDay = Math.round(overspent / nextDays);
        this.elements.recoveryImpactBox.innerHTML = `
          <strong>💡 Solusi Otomatis Cukupin:</strong><br>
          Kelebihan jajan hari ini otomatis dibagi rata ke <strong>${nextDays} hari berikutnya</strong>. Jatah harianmu esok hari akan disesuaikan terpangkas sekitar <strong>~${formatRupiah(deductionPerDay)}/hari</strong> agar uangmu tetap cukup sampai kiriman tiba.
        `;
      } else {
        this.elements.recoveryImpactBox.innerHTML = `
          <strong>💡 Hari Kiriman Tiba:</strong><br>
          Jadwal kiriman sudah sampai. Begitu transferan masuk, klik tombol <strong>"Siklus Baru"</strong> untuk memperbarui jatahmu!
        `;
      }
    } else if (baseDailyAllowance <= 0) {
      card.classList.remove('hidden');
      this.elements.overspentRecoveryDesc.textContent = 'Saldo aktifmu tidak mencukupi untuk menutupi biaya tetap!';
      this.elements.recoveryImpactBox.innerHTML = `
        <strong>⚠️ Perhatian:</strong><br>
        Uang peganganmu saat ini lebih kecil dari total biaya tetap yang belum dibayar. Tambahkan pemasukan ekstra atau atur prioritas pembayaranmu.
      `;
    } else {
      card.classList.add('hidden');
    }
  },

  renderPrediction(params) {
    const pred = CukupinCalc.calculatePrediction(params);
    const highlight = this.elements.predictionHighlightText;

    highlight.classList.remove('prediction-safe', 'prediction-warning', 'prediction-danger');
    highlight.classList.add(`prediction-${pred.status}`);
    highlight.textContent = pred.message;

    this.elements.predictionSubInfo.textContent = pred.subInfo;
  },

  renderFixedCostsList(fixedCosts = []) {
    const container = this.elements.dashboardFixedList;
    container.innerHTML = '';

    if (fixedCosts.length === 0) {
      container.innerHTML = '<p class="text-secondary text-sm text-center py-2">Belum ada pengeluaran tetap.</p>';
      return;
    }

    fixedCosts.forEach(item => {
      const itemEl = document.createElement('div');
      itemEl.className = `fixed-toggle-item ${item.paid ? 'is-paid' : ''}`;
      itemEl.innerHTML = `
        <div class="fixed-toggle-left">
          <input type="checkbox" id="check-${item.id}" ${item.paid ? 'checked' : ''}>
          <div>
            <label for="check-${item.id}" class="fixed-item-title">${item.name}</label>
            ${item.paid ? '<span class="badge-paid">Lunas</span>' : '<span class="badge-unpaid">Belum bayar</span>'}
          </div>
        </div>
        <div class="fixed-item-price">${formatRupiah(item.amount)}</div>
      `;

      const checkbox = itemEl.querySelector('input[type="checkbox"]');
      checkbox.addEventListener('change', () => {
        item.paid = checkbox.checked;
        AppState.save();
        this.renderDashboard();
      });

      container.appendChild(itemEl);
    });
  },

  renderTodayExpenses(expenses = [], todayStr) {
    const container = this.elements.todayExpensesList;
    container.innerHTML = '';

    const todayItems = expenses
      .filter(item => item.date === todayStr)
      .sort((a, b) => (b.time || '').localeCompare(a.time || ''));

    const totalToday = todayItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

    this.elements.expensesTodayCount.textContent = `${todayItems.length} transaksi`;
    this.elements.expensesTodayTotal.textContent = formatRupiah(totalToday);

    if (todayItems.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🎉</div>
          <h4>Belum Ada Jajan Hari Ini</h4>
          <p>Mantap! Jatah harianmu masih utuh dan siap dipakai kapan pun kamu butuh.</p>
        </div>
      `;
      return;
    }

    todayItems.forEach(item => {
      const itemEl = document.createElement('div');
      itemEl.className = 'expense-item';
      itemEl.innerHTML = `
        <div class="expense-left">
          <div class="expense-icon-box">
            ${getCategoryIcon(item.category)}
          </div>
          <div class="expense-details">
            <span class="expense-note">${item.note || getCategoryLabel(item.category)}</span>
            <span class="expense-meta">${getCategoryLabel(item.category)} &bull; ${item.time || 'Hari ini'}</span>
          </div>
        </div>
        <div class="expense-right">
          <span class="expense-amount">-${formatRupiah(item.amount)}</span>
          <div class="expense-actions">
            <button class="btn-icon-action edit" title="Edit jajan" data-id="${item.id}">✏️</button>
            <button class="btn-icon-action delete" title="Hapus jajan" data-id="${item.id}">🗑️</button>
          </div>
        </div>
      `;

      itemEl.querySelector('.btn-icon-action.edit').addEventListener('click', () => {
        this.openEditJajanModal(item);
      });

      itemEl.querySelector('.btn-icon-action.delete').addEventListener('click', () => {
        this.openConfirmModal({
          title: 'Hapus Jajan?',
          desc: `Pengeluaran "${item.note || getCategoryLabel(item.category)}" sebesar ${formatRupiah(item.amount)} akan dihapus.`,
          onConfirm: () => {
            AppState.data.expenses = AppState.data.expenses.filter(e => e.id !== item.id);
            AppState.save();
            this.renderDashboard();
          }
        });
      });

      container.appendChild(itemEl);
    });
  },

  // ===========================================================================
  // CHART.JS INTEGRATION (JATAH VS AKTUAL)
  // ===========================================================================
  renderCycleChart() {
    if (typeof Chart === 'undefined') return;

    const ctx = this.elements.cycleChartCanvas.getContext('2d');
    const { expenses, cycleStartDate, initialBalance, fixedCosts, extraIncomes, nextAllowanceDate } = AppState.data;
    const todayStr = CukupinCalc.getTodayString();

    // Buat daftar tanggal dari cycleStartDate sampai hari ini
    const start = cycleStartDate || todayStr;
    const daysCount = Math.max(1, Math.min(31, CukupinCalc.daysBetween(start, todayStr) + 1));

    const labels = [];
    const actualData = [];
    const targetData = [];

    // Hitung jatah dasar rata-rata sebagai garis acuan
    const daysTotalCycle = Math.max(1, CukupinCalc.daysBetween(start, nextAllowanceDate));
    const totalExtra = CukupinCalc.getTotalExtraIncomes(extraIncomes);
    const totalFixed = fixedCosts.reduce((s, f) => s + (Number(f.amount) || 0), 0);
    const avgBaseJatah = Math.max(0, Math.round((initialBalance + totalExtra - totalFixed) / daysTotalCycle));

    for (let i = 0; i < daysCount; i++) {
      const dateStr = CukupinCalc.addDaysToDate(start, i);
      const [, m, d] = dateStr.split('-');
      labels.push(`${Number(d)}/${Number(m)}`);

      const spentOnDate = CukupinCalc.getDailyExpensesTotal(expenses, dateStr);
      actualData.push(spentOnDate);
      targetData.push(avgBaseJatah);
    }

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#94A3B8' : '#64748B';
    const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
    const primaryColor = isDark ? '#60A5FA' : '#2563EB';

    if (this.cycleChartInstance) {
      this.cycleChartInstance.destroy();
    }

    this.cycleChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Jajan Aktual',
            data: actualData,
            backgroundColor: actualData.map(v => v > avgBaseJatah ? 'rgba(239, 68, 68, 0.75)' : 'rgba(37, 99, 235, 0.75)'),
            borderRadius: 6,
            order: 2
          },
          {
            type: 'line',
            label: 'Acuan Jatah',
            data: targetData,
            borderColor: isDark ? '#FBBF24' : '#F59E0B',
            borderWidth: 2,
            borderDash: [4, 4],
            pointRadius: 0,
            fill: false,
            order: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              color: textColor,
              font: { family: 'Plus Jakarta Sans', size: 11, weight: '600' }
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                return `${context.dataset.label}: ${formatRupiah(context.raw)}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: textColor, font: { family: 'Plus Jakarta Sans', size: 10 } }
          },
          y: {
            grid: { color: gridColor },
            ticks: {
              color: textColor,
              font: { family: 'Plus Jakarta Sans', size: 10 },
              callback: (value) => {
                if (value >= 1000000) return `${(value / 1000000).toFixed(value % 1000000 === 0 ? 0 : 1)}jt`;
                if (value >= 1000) return `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`;
                return value;
              }
            }
          }
        }
      }
    });
  },

  // ===========================================================================
  // MODAL "+ JAJAN" (FAST 3-TAP FLOW)
  // ===========================================================================
  openJajanModal() {
    this.elements.editExpenseId.value = '';
    this.elements.jajanAmount.value = '';
    this.elements.jajanNote.value = '';
    this.elements.btnSubmitJajan.textContent = 'Catat Jajan Sekarang ✨';
    
    const defaultRadio = this.elements.formJajan.querySelector('input[name="jajan-category"][value="makan"]');
    if (defaultRadio) defaultRadio.checked = true;

    this.elements.modalJajan.classList.remove('hidden');
    setTimeout(() => this.elements.jajanAmount.focus(), 100);
  },

  openEditJajanModal(expense) {
    this.elements.editExpenseId.value = expense.id;
    this.elements.jajanAmount.value = new Intl.NumberFormat('id-ID').format(expense.amount);
    this.elements.jajanNote.value = expense.note || '';
    this.elements.btnSubmitJajan.textContent = 'Simpan Perubahan 💾';

    const catRadio = this.elements.formJajan.querySelector(`input[name="jajan-category"][value="${expense.category}"]`);
    if (catRadio) catRadio.checked = true;

    this.elements.modalJajan.classList.remove('hidden');
    setTimeout(() => this.elements.jajanAmount.focus(), 100);
  },

  closeJajanModal() {
    this.elements.modalJajan.classList.add('hidden');
  },

  handleJajanSubmit() {
    const amount = parseRupiahInput(this.elements.jajanAmount.value);
    if (!amount || amount <= 0) {
      alert('Masukkan nominal pengeluaran yang valid ya!');
      return;
    }

    const editId = this.elements.editExpenseId.value;
    const catChecked = this.elements.formJajan.querySelector('input[name="jajan-category"]:checked');
    const category = catChecked ? catChecked.value : 'lainnya';
    const note = this.elements.jajanNote.value.trim();

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const todayStr = CukupinCalc.getTodayString();

    if (editId) {
      const index = AppState.data.expenses.findIndex(e => e.id === editId);
      if (index !== -1) {
        AppState.data.expenses[index] = {
          ...AppState.data.expenses[index],
          amount,
          category,
          note
        };
      }
    } else {
      const newExpense = {
        id: 'exp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        amount,
        category,
        note,
        date: todayStr,
        time: timeStr
      };
      AppState.data.expenses.push(newExpense);
    }

    AppState.save();
    this.closeJajanModal();
    this.renderDashboard();
  },

  // ===========================================================================
  // MODAL PEMASUKAN EKSTRA (HONOR / TRANSFERAN ORTU)
  // ===========================================================================
  openIncomeModal() {
    this.elements.incomeAmount.value = '';
    this.elements.incomeNote.value = '';
    this.elements.modalIncome.classList.remove('hidden');
    setTimeout(() => this.elements.incomeAmount.focus(), 100);
  },

  closeIncomeModal() {
    this.elements.modalIncome.classList.add('hidden');
  },

  handleIncomeSubmit() {
    const amount = parseRupiahInput(this.elements.incomeAmount.value);
    const note = this.elements.incomeNote.value.trim();

    if (!amount || amount <= 0) {
      alert('Masukkan nominal uang masuk yang valid ya!');
      return;
    }

    const todayStr = CukupinCalc.getTodayString();
    AppState.data.extraIncomes.push({
      id: 'inc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      amount,
      note: note || 'Pemasukan Ekstra',
      date: todayStr
    });

    AppState.save();
    this.closeIncomeModal();
    this.renderDashboard();
  },

  // ===========================================================================
  // MODAL UBAH TANGGAL KIRIMAN
  // ===========================================================================
  openEditDateModal() {
    this.elements.editTargetDate.value = AppState.data.nextAllowanceDate || CukupinCalc.getTodayString();
    this.elements.editTargetDate.min = CukupinCalc.getTodayString();
    this.elements.modalEditDate.classList.remove('hidden');
  },

  closeEditDateModal() {
    this.elements.modalEditDate.classList.add('hidden');
  },

  handleEditDateSubmit() {
    const newDate = this.elements.editTargetDate.value;
    if (!newDate) {
      alert('Pilih tanggal kiriman berikutnya!');
      return;
    }

    AppState.data.nextAllowanceDate = newDate;
    AppState.save();
    this.closeEditDateModal();
    this.renderDashboard();
  },

  // ===========================================================================
  // MODAL SIKLUS BARU (CARRY OVER)
  // ===========================================================================
  openNewCycleModal() {
    const { initialBalance, extraIncomes, expenses, fixedCosts } = AppState.data;
    const currentBalance = CukupinCalc.getCurrentBalance(initialBalance, extraIncomes, expenses, fixedCosts);

    this.elements.newCyclePrevBalance.textContent = formatRupiah(currentBalance);
    this.elements.newCycleIncome.value = '';

    // Default next date: +30 hari ke depan
    const nextDate = CukupinCalc.addDaysToDate(CukupinCalc.getTodayString(), 30);
    this.elements.newCycleNextDate.value = nextDate;
    this.elements.newCycleNextDate.min = CukupinCalc.getTodayString();

    this.elements.modalNewCycle.classList.remove('hidden');
    setTimeout(() => this.elements.newCycleIncome.focus(), 100);
  },

  closeNewCycleModal() {
    this.elements.modalNewCycle.classList.add('hidden');
  },

  handleNewCycleSubmit() {
    const newIncome = parseRupiahInput(this.elements.newCycleIncome.value);
    const nextDate = this.elements.newCycleNextDate.value;
    const shouldCarryOver = this.elements.checkCarryOver.checked;
    const shouldResetFixed = this.elements.checkResetFixedCosts.checked;

    if (!newIncome || newIncome <= 0) {
      alert('Masukkan nominal kiriman baru yang valid!');
      return;
    }

    if (!nextDate) {
      alert('Pilih tanggal kiriman berikutnya!');
      return;
    }

    const { initialBalance, extraIncomes, expenses, fixedCosts } = AppState.data;
    const oldBalance = CukupinCalc.getCurrentBalance(initialBalance, extraIncomes, expenses, fixedCosts);
    const startBalance = shouldCarryOver ? Math.max(0, oldBalance) + newIncome : newIncome;

    if (shouldResetFixed) {
      AppState.data.fixedCosts.forEach(item => {
        item.paid = false;
      });
    }

    AppState.data.initialBalance = startBalance;
    AppState.data.nextAllowanceDate = nextDate;
    AppState.data.cycleStartDate = CukupinCalc.getTodayString();
    AppState.data.expenses = [];
    AppState.data.extraIncomes = [];
    AppState.save();

    this.closeNewCycleModal();
    this.renderDashboard();
  },

  // ===========================================================================
  // MODAL BIAYA TETAP (DASHBOARD)
  // ===========================================================================
  openFixedModal() {
    this.elements.fixedItemId.value = '';
    this.elements.fixedName.value = '';
    this.elements.fixedAmount.value = '';
    this.elements.fixedPaidStatus.checked = false;
    this.elements.modalFixedTitle.textContent = 'Tambah Biaya Tetap';
    this.elements.modalFixed.classList.remove('hidden');
    setTimeout(() => this.elements.fixedName.focus(), 100);
  },

  closeFixedModal() {
    this.elements.modalFixed.classList.add('hidden');
  },

  handleFixedItemSubmit() {
    const name = this.elements.fixedName.value.trim();
    const amount = parseRupiahInput(this.elements.fixedAmount.value);
    const paid = this.elements.fixedPaidStatus.checked;

    if (!name || amount <= 0) {
      alert('Masukkan nama biaya dan nominal yang valid ya!');
      return;
    }

    const newItem = {
      id: 'fc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      name,
      amount,
      paid
    };

    AppState.data.fixedCosts.push(newItem);
    AppState.save();
    this.closeFixedModal();
    this.renderDashboard();
  },

  // ===========================================================================
  // SETTINGS & BACKUP / RESTORE (JSON VALIDATION)
  // ===========================================================================
  openSettingsModal() {
    this.elements.settingsCurrentDateLabel.textContent = CukupinCalc.formatDateIndo(AppState.data.nextAllowanceDate);
    this.elements.modalSettings.classList.remove('hidden');
  },

  closeSettingsModal() {
    this.elements.modalSettings.classList.add('hidden');
  },

  handleExportBackup() {
    const dataStr = JSON.stringify(AppState.data, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cukupin-backup-${CukupinCalc.getTodayString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  handleImportBackup(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);

        // Validasi struktur JSON cadangan
        if (
          typeof parsed !== 'object' ||
          parsed === null ||
          typeof parsed.initialBalance !== 'number' ||
          !Array.isArray(parsed.fixedCosts) ||
          !Array.isArray(parsed.expenses)
        ) {
          throw new Error('Format file backup tidak sesuai standar Cukupin!');
        }

        AppState.data = { ...AppState.data, ...parsed };
        AppState.save();
        alert('Data berhasil dipulihkan dari file backup! 🎉');
        this.closeSettingsModal();
        this.renderDashboard();
      } catch (err) {
        alert('Gagal memulihkan data: ' + err.message);
      } finally {
        event.target.value = '';
      }
    };
    reader.readAsText(file);
  },

  // ===========================================================================
  // MODAL KONFIRMASI (REUSABLE)
  // ===========================================================================
  openConfirmModal({ title, desc, onConfirm }) {
    this.elements.confirmTitle.textContent = title;
    this.elements.confirmDesc.textContent = desc;
    this.elements.modalConfirm.classList.remove('hidden');

    const handleOk = () => {
      this.elements.btnConfirmOk.removeEventListener('click', handleOk);
      this.elements.modalConfirm.classList.add('hidden');
      if (typeof onConfirm === 'function') onConfirm();
    };

    const handleCancel = () => {
      this.elements.btnConfirmOk.removeEventListener('click', handleOk);
      this.elements.btnConfirmCancel.removeEventListener('click', handleCancel);
      this.elements.modalConfirm.classList.add('hidden');
    };

    this.elements.btnConfirmOk.addEventListener('click', handleOk);
    this.elements.btnConfirmCancel.addEventListener('click', handleCancel);
  }
};

// Initialize Application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  UI.init();
});
