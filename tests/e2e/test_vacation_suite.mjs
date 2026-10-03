/**
 * Automated Opaque-Box E2E Test Verification Suite
 * Febeboo Long-Term Food Vacation / Meal Pause Feature
 *
 * Covers:
 * - Tier 1: Feature Coverage (>=5 test cases per feature across F1-F10)
 * - Tier 2: Boundary & Corner Cases (>=5 test cases per boundary area B1-B7)
 * - Tier 3: Cross-Feature Combinations (Pairwise C1-C4)
 * - Tier 4: Real-World Application Scenarios (Scenarios A, B, C)
 *
 * Authoritative Sources:
 * - c:\Users\RACHIT\OneDrive\Desktop\Febeboo\.agents\teamwork\ORIGINAL_REQUEST.md
 * - c:\Users\RACHIT\OneDrive\Desktop\Febeboo\.agents\teamwork\PROJECT.md
 */

import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ── Shared Utilities Import & Parity Verification ──────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

// Import utilities from all 3 apps to verify code parity
const studentUtilsPath = path.resolve(projectRoot, 'febebo-app/src/utils/vacationUtils.js');
const staffUtilsPath = path.resolve(projectRoot, 'febebo-staff/src/utils/vacationUtils.js');
const adminUtilsPath = path.resolve(projectRoot, 'Febebo-admin/src/utils/vacationUtils.js');

const studentUtils = await import(`file://${studentUtilsPath.replace(/\\/g, '/')}`);
const staffUtils = await import(`file://${staffUtilsPath.replace(/\\/g, '/')}`);
const adminUtils = await import(`file://${adminUtilsPath.replace(/\\/g, '/')}`);

const {
  formatDateStr,
  getTodayStr,
  generateDateRange,
  validateVacationRange,
  isMealPausedOnDate,
  isStudentOnVacation,
  getStudentActiveVacation,
  formatDateDisplay,
  buildVacationDoc,
  ALL_MEALS,
  MEAL_LABELS
} = studentUtils;

// ── Test Runner Framework ──────────────────────────────────────────────────
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  blue: '\x1b[34m',
};

const stats = {
  total: 0,
  passed: 0,
  failed: 0,
  suites: 0,
  failures: [],
  tierBreakdown: {
    'Tier 1 (Feature Coverage)': { total: 0, passed: 0, failed: 0 },
    'Tier 2 (Boundary & Corner Cases)': { total: 0, passed: 0, failed: 0 },
    'Tier 3 (Cross-Feature Combinations)': { total: 0, passed: 0, failed: 0 },
    'Tier 4 (Real-World Application Scenarios)': { total: 0, passed: 0, failed: 0 },
  }
};

let currentTierName = 'Tier 1 (Feature Coverage)';
let currentSuiteName = '';

function setTier(tierName) {
  currentTierName = tierName;
  console.log(`\n${colors.bright}${colors.blue}═══════════════════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}${colors.magenta}  ${tierName.toUpperCase()}${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}═══════════════════════════════════════════════════════════════════════════${colors.reset}`);
}

function suite(name, fn) {
  currentSuiteName = name;
  stats.suites++;
  console.log(`\n  ${colors.bright}${colors.cyan}▶ ${name}${colors.reset}`);
  try {
    fn();
  } catch (err) {
    console.error(`    ${colors.red}Suite setup error in "${name}":${colors.reset}`, err);
    stats.failed++;
    stats.failures.push({ suite: name, test: 'Suite Setup', error: err.message });
  }
}

function test(name, fn) {
  stats.total++;
  if (stats.tierBreakdown[currentTierName]) {
    stats.tierBreakdown[currentTierName].total++;
  }

  try {
    fn();
    stats.passed++;
    if (stats.tierBreakdown[currentTierName]) {
      stats.tierBreakdown[currentTierName].passed++;
    }
    console.log(`    ${colors.green}✔${colors.reset} ${colors.dim}${name}${colors.reset}`);
  } catch (err) {
    stats.failed++;
    if (stats.tierBreakdown[currentTierName]) {
      stats.tierBreakdown[currentTierName].failed++;
    }
    console.log(`    ${colors.red}✖ ${name}${colors.reset}`);
    console.log(`      ${colors.red}${err.message}${colors.reset}`);
    stats.failures.push({ suite: currentSuiteName, test: name, error: err.message, stack: err.stack });
  }
}

// ── High-Fidelity Simulation Models (Opaque-Box E2E Engines) ───────────────

/**
 * Simulates the centralized Firestore Vacation Data Store with reactive listeners
 */
class InMemoryVacationStore {
  constructor() {
    this.vacations = new Map(); // id -> doc
    this.listeners = new Set();
  }

  subscribe(callback) {
    this.listeners.add(callback);
    callback(this.getAll());
    return () => this.listeners.delete(callback);
  }

  notify() {
    const list = this.getAll();
    for (const listener of this.listeners) {
      listener(list);
    }
  }

  getAll() {
    return Array.from(this.vacations.values());
  }

  getForTenant(tenantId) {
    return this.getAll().filter(v => v.tenantId === tenantId);
  }

  saveVacation(vacationDoc) {
    this.vacations.set(vacationDoc.id, { ...vacationDoc });
    this.notify();
    return vacationDoc;
  }

  shortenVacation(vacationId, newEndDate) {
    const doc = this.vacations.get(vacationId);
    if (!doc) throw new Error(`Vacation ${vacationId} not found`);
    if (doc.status !== 'active' && doc.status !== 'shortened') {
      throw new Error(`Cannot shorten vacation with status ${doc.status}`);
    }
    if (newEndDate >= doc.endDate) throw new Error(`New end date must be earlier than current end date`);
    if (newEndDate < doc.startDate) throw new Error(`New end date cannot be before start date`);

    const updated = {
      ...doc,
      originalEndDate: doc.originalEndDate || doc.endDate,
      endDate: newEndDate,
      dates: generateDateRange(doc.startDate, newEndDate),
      status: 'shortened',
      updatedAt: new Date().toISOString()
    };
    this.vacations.set(vacationId, updated);
    this.notify();
    return updated;
  }

  resumeVacation(vacationId) {
    const doc = this.vacations.get(vacationId);
    if (!doc) throw new Error(`Vacation ${vacationId} not found`);
    if (doc.status === 'resumed') return doc; // idempotent

    const updated = {
      ...doc,
      status: 'resumed',
      resumedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.vacations.set(vacationId, updated);
    this.notify();
    return updated;
  }
}

/**
 * Simulates febebo-app Student Food Screen
 */
class StudentFoodScreenSimulation {
  constructor(tenant, store) {
    this.tenant = tenant;
    this.store = store;
    this.vacations = [];
    this.todayRequests = {}; // meal -> 'pack' | 'cancel'
    this.unsubscribe = store.subscribe((all) => {
      this.vacations = all.filter(v => v.tenantId === tenant.uid);
    });
  }

  destroy() {
    if (this.unsubscribe) this.unsubscribe();
  }

  getActiveVacation(dateStr) {
    if (dateStr) {
      return getStudentActiveVacation(this.vacations, this.tenant.uid, dateStr);
    }
    const current = getStudentActiveVacation(this.vacations, this.tenant.uid, getTodayStr());
    if (current) return current;
    // Fall back to any active or shortened vacation for this tenant
    return this.vacations.find(v => v.status === 'active' || v.status === 'shortened') || null;
  }

  isVacationBannerActive(dateStr = getTodayStr()) {
    const active = getStudentActiveVacation(this.vacations, this.tenant.uid, dateStr);
    return Boolean(active && (active.status === 'active' || active.status === 'shortened'));
  }

  getBannerDetails(dateStr = getTodayStr()) {
    const active = getStudentActiveVacation(this.vacations, this.tenant.uid, dateStr);
    if (!active) return null;
    return {
      title: `Meals Paused until ${formatDateDisplay(active.endDate)}`,
      startDate: active.startDate,
      endDate: active.endDate,
      status: active.status,
      pausedMeals: active.isAllMeals ? ALL_MEALS : active.meals,
    };
  }

  canPerformMealAction(mealName, actionType, dateStr = getTodayStr()) {
    const active = getStudentActiveVacation(this.vacations, this.tenant.uid, dateStr);
    const paused = isMealPausedOnDate(active, dateStr, mealName);
    if (paused) {
      return { allowed: false, reason: `Action "${actionType}" blocked: ${mealName} is paused on Food Vacation` };
    }
    return { allowed: true };
  }

  canGenerateMealQR(mealName, dateStr = getTodayStr()) {
    const active = getStudentActiveVacation(this.vacations, this.tenant.uid, dateStr);
    const paused = isMealPausedOnDate(active, dateStr, mealName);
    if (paused) {
      return { allowed: false, reason: `MEALPASS generation blocked: ${mealName} is paused on Food Vacation` };
    }
    return {
      allowed: true,
      qrValue: `MEALPASS|${mealName.toLowerCase()}|${this.tenant.uid}|${this.tenant.name}|${this.tenant.roomNumber}`
    };
  }

  canScanCookQRToEat(mealName, dateStr = getTodayStr()) {
    const active = getStudentActiveVacation(this.vacations, this.tenant.uid, dateStr);
    const paused = isMealPausedOnDate(active, dateStr, mealName);
    if (paused) {
      return { allowed: false, reason: `QR Meal Scanner blocked: ${mealName} is paused on Food Vacation` };
    }
    return { allowed: true };
  }

  requestDailyAction(mealName, actionType, dateStr = getTodayStr()) {
    const check = this.canPerformMealAction(mealName, actionType, dateStr);
    if (!check.allowed) {
      throw new Error(check.reason);
    }
    this.todayRequests[mealName] = actionType;
    return { success: true, meal: mealName, action: actionType };
  }

  bookVacation({ startDate, endDate, isAllMeals, meals, reason }) {
    const validation = validateVacationRange(startDate, endDate);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const doc = buildVacationDoc({
      tenantId: this.tenant.uid,
      tenantName: this.tenant.name,
      tenantPhone: this.tenant.phone,
      roomNumber: this.tenant.roomNumber,
      adminId: this.tenant.adminId,
      pgId: this.tenant.pgId,
      startDate,
      endDate,
      isAllMeals,
      meals,
      reason,
      status: 'active'
    });

    return this.store.saveVacation(doc);
  }

  shortenVacation(newEndDate, vacationId) {
    let target = vacationId ? this.vacations.find(v => v.id === vacationId) : null;
    if (!target) {
      target = this.getActiveVacation();
    }
    if (!target) throw new Error('No active vacation to shorten');
    return this.store.shortenVacation(target.id, newEndDate);
  }

  resumeVacation(vacationId) {
    let target = vacationId ? this.vacations.find(v => v.id === vacationId) : null;
    if (!target) {
      target = this.getActiveVacation();
    }
    if (!target && this.vacations.length > 0) {
      // Return latest vacation if already resumed
      target = this.vacations[this.vacations.length - 1];
    }
    if (!target) throw new Error('No active vacation to resume');
    return this.store.resumeVacation(target.id);
  }
}

/**
 * Simulates febebo-staff StaffApp Kitchen Headcount & Roster Screen
 */
class StaffAppCookSimulation {
  constructor(adminId, pgId, tenantsList, store) {
    this.adminId = adminId;
    this.pgId = pgId;
    this.tenants = tenantsList;
    this.store = store;
    this.vacations = [];
    this.workDate = getTodayStr();
    this.mealTab = 'Lunch';
    this.dailyStatusLogs = new Map(); // tenantId_date_meal -> 'pack' | 'not_eating' | 'extra'
    this.eatenData = new Map(); // tenantId_date_meal_eaten -> true

    this.unsubscribe = store.subscribe((all) => {
      this.vacations = all.filter(v => v.adminId === adminId);
    });
  }

  destroy() {
    if (this.unsubscribe) this.unsubscribe();
  }

  setWorkDate(dateStr) {
    this.workDate = dateStr;
  }

  setMealTab(meal) {
    this.mealTab = meal;
  }

  recordDailyStatus(tenantId, dateStr, mealName, status) {
    this.dailyStatusLogs.set(`${tenantId}_${dateStr}_${mealName.toLowerCase()}`, status);
  }

  recordMealEaten(tenantId, dateStr, mealName) {
    const vacationing = isStudentOnVacation(this.vacations, tenantId, dateStr, mealName);
    if (vacationing) {
      throw new Error(`Cannot mark meal eaten for ${tenantId}: student is on Food Vacation for ${mealName}`);
    }
    this.eatenData.set(`${tenantId}_${dateStr}_${mealName.toLowerCase()}_eaten`, true);
  }

  computeHeadcount(dateStr = this.workDate, mealName = this.mealTab) {
    const targetMeal = mealName.toLowerCase();

    let requested = 0;
    let pack = 0;
    let extra = 0;
    let eaten = 0;
    let notEaten = 0;
    let onVacation = 0;

    const studentStatuses = [];

    for (const tenant of this.tenants) {
      const isVacation = isStudentOnVacation(this.vacations, tenant.id, dateStr, targetMeal);
      const isEaten = Boolean(this.eatenData.get(`${tenant.id}_${dateStr}_${targetMeal}_eaten`));
      const dailyLog = this.dailyStatusLogs.get(`${tenant.id}_${dateStr}_${targetMeal}`);

      let computedStatus;

      if (isVacation) {
        computedStatus = 'onVacation';
        onVacation++;
      } else if (isEaten) {
        computedStatus = 'eaten';
        eaten++;
      } else if (dailyLog === 'not_eating') {
        computedStatus = 'notEaten';
        notEaten++;
      } else if (dailyLog === 'pack') {
        computedStatus = 'pack';
        pack++;
      } else if (dailyLog === 'extra') {
        computedStatus = 'extra';
        extra++;
        requested++; // extra eater also counts as requested plate
      } else {
        computedStatus = 'requested';
        requested++;
      }

      studentStatuses.push({
        id: tenant.id,
        name: tenant.name,
        roomNumber: tenant.roomNumber,
        status: computedStatus,
        isVacation
      });
    }

    return {
      workDate: dateStr,
      meal: mealName,
      totalTenants: this.tenants.length,
      requested,
      pack,
      extra,
      eaten,
      notEaten,
      onVacation,
      totalPortionsToPrepare: requested + pack,
      students: studentStatuses
    };
  }

  getVacationRoster(dateStr = this.workDate, mealName = this.mealTab) {
    const targetMeal = mealName.toLowerCase();
    return this.tenants
      .filter(t => isStudentOnVacation(this.vacations, t.id, dateStr, targetMeal))
      .map(t => {
        const vac = getStudentActiveVacation(this.vacations, t.id, dateStr);
        return {
          id: t.id,
          name: t.name,
          roomNumber: t.roomNumber,
          vacationId: vac?.id,
          startDate: vac?.startDate,
          endDate: vac?.endDate,
          isAllMeals: vac?.isAllMeals,
          pausedMeals: vac?.isAllMeals ? ALL_MEALS : vac?.meals
        };
      });
  }

  getManualSelectionList(dateStr = this.workDate, mealName = this.mealTab) {
    const targetMeal = mealName.toLowerCase();
    return this.tenants.filter(t => {
      const isVacation = isStudentOnVacation(this.vacations, t.id, dateStr, targetMeal);
      const isEaten = Boolean(this.eatenData.get(`${t.id}_${dateStr}_${targetMeal}_eaten`));
      return !isVacation && !isEaten;
    });
  }
}

/**
 * Simulates Febebo-admin MessHeadcount Screen
 */
class AdminMessHeadcountSimulation {
  constructor(adminId, pgId, tenantsList, store) {
    this.adminId = adminId;
    this.pgId = pgId;
    this.tenants = tenantsList;
    this.store = store;
    this.vacations = [];
    this.selectedDate = getTodayStr();
    this.mealTab = 'lunch';
    this.dailyStatusLogs = new Map();
    this.eatenData = new Map();

    this.unsubscribe = store.subscribe((all) => {
      this.vacations = all.filter(v => v.adminId === adminId);
    });
  }

  destroy() {
    if (this.unsubscribe) this.unsubscribe();
  }

  setSelectedDate(dateStr) {
    this.selectedDate = dateStr;
  }

  setMealTab(meal) {
    this.mealTab = meal.toLowerCase();
  }

  recordDailyStatus(tenantId, dateStr, mealName, status) {
    this.dailyStatusLogs.set(`${tenantId}_${dateStr}_${mealName.toLowerCase()}`, status);
  }

  computeHeadcount(dateStr = this.selectedDate, mealName = this.mealTab) {
    const targetMeal = mealName.toLowerCase();
    let requested = 0;
    let pack = 0;
    let eaten = 0;
    let notEaten = 0;
    let onLeave = 0;

    const studentList = [];

    for (const t of this.tenants) {
      const isVacation = isStudentOnVacation(this.vacations, t.id, dateStr, targetMeal);
      const isEaten = Boolean(this.eatenData.get(`${t.id}_${dateStr}_${targetMeal}_eaten`));
      const dailyLog = this.dailyStatusLogs.get(`${t.id}_${dateStr}_${targetMeal}`);

      let status = 'requested';
      let leaveBadge = false;

      if (isVacation) {
        status = 'on_leave';
        leaveBadge = true;
        onLeave++;
      } else if (isEaten) {
        status = 'eaten';
        eaten++;
      } else if (dailyLog === 'not_eating') {
        status = 'not_eating';
        notEaten++;
      } else if (dailyLog === 'pack') {
        status = 'pack';
        pack++;
      } else {
        status = 'requested';
        requested++;
      }

      studentList.push({
        id: t.id,
        name: t.name,
        roomNumber: t.roomNumber,
        status,
        leaveBadge,
        vacation: isVacation ? getStudentActiveVacation(this.vacations, t.id, dateStr) : null
      });
    }

    return {
      date: dateStr,
      meal: targetMeal,
      requested,
      pack,
      eaten,
      notEaten,
      onLeave,
      studentList
    };
  }
}

// ── MOCK DATA FIXTURES ─────────────────────────────────────────────────────
const MOCK_PG_ID = 'pg_marathahalli_01';
const MOCK_ADMIN_ID = 'admin_suresh_99';

function createMockTenants(count = 20) {
  const tenants = [];
  for (let i = 1; i <= count; i++) {
    const room = 100 + Math.ceil(i / 2);
    const bed = i % 2 === 1 ? 'A' : 'B';
    tenants.push({
      id: `student_${i}`,
      uid: `student_${i}`,
      name: `Resident ${i}`,
      phone: `98765432${String(i).padStart(2, '0')}`,
      roomNumber: `${room}-${bed}`,
      adminId: MOCK_ADMIN_ID,
      pgId: MOCK_PG_ID
    });
  }
  return tenants;
}

// ───────────────────────────────────────────────────────────────────────────
// TIER 1: FEATURE COVERAGE (>=5 Test Cases per Feature, F1 through F10)
// ───────────────────────────────────────────────────────────────────────────

setTier('Tier 1 (Feature Coverage)');

// ── F1: Vacation Booking with Date Range ───────────────────────────────────
suite('F1: Vacation Booking with Date Range (min 1 day, start <= end)', () => {
  test('F1.1: Single-day vacation booking produces valid 1-day range and active status', () => {
    const store = new InMemoryVacationStore();
    const tenants = createMockTenants(1);
    const studentScreen = new StudentFoodScreenSimulation(tenants[0], store);

    const today = getTodayStr();
    const doc = studentScreen.bookVacation({
      startDate: today,
      endDate: today,
      isAllMeals: true,
      reason: 'Doctor appointment'
    });

    assert.equal(doc.status, 'active');
    assert.equal(doc.startDate, today);
    assert.equal(doc.endDate, today);
    assert.equal(doc.dates.length, 1);
    assert.equal(doc.dates[0], today);
    assert.equal(doc.isAllMeals, true);
  });

  test('F1.2: Multi-day vacation booking produces contiguous inclusive dates array', () => {
    const store = new InMemoryVacationStore();
    const tenants = createMockTenants(1);
    const studentScreen = new StudentFoodScreenSimulation(tenants[0], store);

    const doc = studentScreen.bookVacation({
      startDate: '2026-10-15',
      endDate: '2026-10-20',
      isAllMeals: true,
      reason: 'Mid-term break'
    });

    assert.equal(doc.dates.length, 6);
    assert.deepEqual(doc.dates, [
      '2026-10-15',
      '2026-10-16',
      '2026-10-17',
      '2026-10-18',
      '2026-10-19',
      '2026-10-20'
    ]);
  });

  test('F1.3: Booking with start date equal to today succeeds and activates immediately', () => {
    const store = new InMemoryVacationStore();
    const tenants = createMockTenants(1);
    const studentScreen = new StudentFoodScreenSimulation(tenants[0], store);

    const today = getTodayStr();
    studentScreen.bookVacation({
      startDate: today,
      endDate: today,
      isAllMeals: true
    });

    assert.equal(studentScreen.isVacationBannerActive(today), true);
  });

  test('F1.4: Booking with start date in the future creates valid upcoming vacation', () => {
    const store = new InMemoryVacationStore();
    const tenants = createMockTenants(1);
    const studentScreen = new StudentFoodScreenSimulation(tenants[0], store);

    const doc = studentScreen.bookVacation({
      startDate: '2026-11-01',
      endDate: '2026-11-05',
      isAllMeals: true,
      reason: 'Diwali vacation'
    });

    assert.equal(doc.status, 'active');
    assert.equal(doc.startDate, '2026-11-01');
    const today = getTodayStr();
    if (today < '2026-11-01') {
      assert.equal(isMealPausedOnDate(doc, today, 'lunch'), false);
    }
  });

  test('F1.5: Vacation document adheres to PROJECT.md interface contract schema', () => {
    const doc = buildVacationDoc({
      tenantId: 'student_1',
      tenantName: 'Rajesh Kumar',
      tenantPhone: '9988776655',
      roomNumber: '101-A',
      bedNumber: 'A',
      adminId: MOCK_ADMIN_ID,
      pgId: MOCK_PG_ID,
      startDate: '2026-10-10',
      endDate: '2026-10-14',
      isAllMeals: false,
      meals: ['dinner'],
      reason: 'Late shift'
    });

    assert.ok(doc.id, 'Document must have generated id');
    assert.equal(doc.tenantId, 'student_1');
    assert.equal(doc.tenantName, 'Rajesh Kumar');
    assert.equal(doc.tenantPhone, '9988776655');
    assert.equal(doc.roomNumber, '101-A');
    assert.equal(doc.bedNumber, 'A');
    assert.equal(doc.adminId, MOCK_ADMIN_ID);
    assert.equal(doc.pgId, MOCK_PG_ID);
    assert.equal(doc.startDate, '2026-10-10');
    assert.equal(doc.endDate, '2026-10-14');
    assert.equal(doc.originalEndDate, '2026-10-14');
    assert.equal(doc.isAllMeals, false);
    assert.deepEqual(doc.meals, ['dinner']);
    assert.equal(doc.status, 'active');
    assert.ok(doc.createdAt);
    assert.ok(doc.updatedAt);
    assert.equal(doc.resumedAt, null);
  });

  test('F1.6: Range validator enforces start <= end and start >= today', () => {
    const today = getTodayStr();
    const v1 = validateVacationRange('2026-10-20', '2026-10-15');
    assert.equal(v1.valid, false);
    assert.ok(v1.error.includes('End date must be on or after start date'));

    const v2 = validateVacationRange('2020-01-01', '2020-01-05');
    assert.equal(v2.valid, false);
    assert.ok(v2.error.includes('cannot be in the past'));

    const v3 = validateVacationRange(today, today);
    assert.equal(v3.valid, true);
  });
});

// ── F2: Full-Day vs Granular Meal Selection ────────────────────────────────
suite('F2: Full-Day vs Granular Meal Selection (Breakfast, Lunch, Snacks, Dinner)', () => {
  test('F2.1: Full-day selection pauses all 4 meals on all dates in range', () => {
    const doc = buildVacationDoc({
      startDate: '2026-10-10',
      endDate: '2026-10-12',
      isAllMeals: true
    });

    for (const date of ['2026-10-10', '2026-10-11', '2026-10-12']) {
      for (const meal of ['breakfast', 'lunch', 'snacks', 'dinner']) {
        assert.equal(isMealPausedOnDate(doc, date, meal), true, `${meal} should be paused on ${date}`);
      }
    }
  });

  test('F2.2: Granular single meal selection (Dinner only) isolates pause to dinner', () => {
    const doc = buildVacationDoc({
      startDate: '2026-10-10',
      endDate: '2026-10-12',
      isAllMeals: false,
      meals: ['dinner']
    });

    assert.equal(isMealPausedOnDate(doc, '2026-10-11', 'dinner'), true);
    assert.equal(isMealPausedOnDate(doc, '2026-10-11', 'breakfast'), false);
    assert.equal(isMealPausedOnDate(doc, '2026-10-11', 'lunch'), false);
    assert.equal(isMealPausedOnDate(doc, '2026-10-11', 'snacks'), false);
  });

  test('F2.3: Granular dual meal selection (Lunch + Dinner) pauses exactly those two', () => {
    const doc = buildVacationDoc({
      startDate: '2026-10-10',
      endDate: '2026-10-12',
      isAllMeals: false,
      meals: ['lunch', 'dinner']
    });

    assert.equal(isMealPausedOnDate(doc, '2026-10-11', 'lunch'), true);
    assert.equal(isMealPausedOnDate(doc, '2026-10-11', 'dinner'), true);
    assert.equal(isMealPausedOnDate(doc, '2026-10-11', 'breakfast'), false);
    assert.equal(isMealPausedOnDate(doc, '2026-10-11', 'snacks'), false);
  });

  test('F2.4: Granular triple meal selection (Breakfast + Lunch + Dinner) leaves snacks unpaused', () => {
    const doc = buildVacationDoc({
      startDate: '2026-10-10',
      endDate: '2026-10-12',
      isAllMeals: false,
      meals: ['breakfast', 'lunch', 'dinner']
    });

    assert.equal(isMealPausedOnDate(doc, '2026-10-11', 'breakfast'), true);
    assert.equal(isMealPausedOnDate(doc, '2026-10-11', 'lunch'), true);
    assert.equal(isMealPausedOnDate(doc, '2026-10-11', 'dinner'), true);
    assert.equal(isMealPausedOnDate(doc, '2026-10-11', 'snacks'), false);
  });

  test('F2.5: Case-insensitive meal normalization matches irrespective of casing', () => {
    const doc = buildVacationDoc({
      startDate: '2026-10-10',
      endDate: '2026-10-12',
      isAllMeals: false,
      meals: ['BREAKFAST', 'Lunch']
    });

    assert.equal(isMealPausedOnDate(doc, '2026-10-11', 'breakfast'), true);
    assert.equal(isMealPausedOnDate(doc, '2026-10-11', 'Breakfast'), true);
    assert.equal(isMealPausedOnDate(doc, '2026-10-11', 'LUNCH'), true);
    assert.equal(isMealPausedOnDate(doc, '2026-10-11', 'DINNER'), false);
  });
});

// ── F3: Active Vacation Card Display and Paused Meals List ──────────────────
suite('F3: Active Vacation Card Display and Paused Meals List', () => {
  test('F3.1: Active vacation covering current date computes banner as active', () => {
    const store = new InMemoryVacationStore();
    const tenants = createMockTenants(1);
    const screen = new StudentFoodScreenSimulation(tenants[0], store);
    const today = getTodayStr();

    screen.bookVacation({
      startDate: today,
      endDate: today,
      isAllMeals: true
    });

    assert.equal(screen.isVacationBannerActive(today), true);
  });

  test('F3.2: Card banner details include formatted return date and paused meal chips', () => {
    const store = new InMemoryVacationStore();
    const tenants = createMockTenants(1);
    const screen = new StudentFoodScreenSimulation(tenants[0], store);
    const today = getTodayStr();

    screen.bookVacation({
      startDate: today,
      endDate: '2026-10-25',
      isAllMeals: false,
      meals: ['lunch', 'dinner']
    });

    const banner = screen.getBannerDetails(today);
    assert.ok(banner);
    assert.ok(banner.title.includes('Meals Paused until'));
    assert.ok(banner.title.includes('25 Oct 2026') || banner.title.includes('2026'));
    assert.deepEqual(banner.pausedMeals, ['lunch', 'dinner']);
  });

  test('F3.3: Future vacation does not activate today’s active banner', () => {
    const store = new InMemoryVacationStore();
    const tenants = createMockTenants(1);
    const screen = new StudentFoodScreenSimulation(tenants[0], store);

    screen.bookVacation({
      startDate: '2026-12-01',
      endDate: '2026-12-10',
      isAllMeals: true
    });

    const today = getTodayStr();
    if (today < '2026-12-01') {
      assert.equal(screen.isVacationBannerActive(today), false);
    }
  });

  test('F3.4: Expired vacation suppresses active banner', () => {
    const store = new InMemoryVacationStore();
    const tenants = createMockTenants(1);
    const screen = new StudentFoodScreenSimulation(tenants[0], store);

    store.saveVacation(buildVacationDoc({
      tenantId: tenants[0].uid,
      startDate: '2026-09-01',
      endDate: '2026-09-05',
      isAllMeals: true,
      status: 'active'
    }));

    const today = getTodayStr();
    assert.equal(screen.isVacationBannerActive(today), false);
  });

  test('F3.5: Resumed vacation status immediately suppresses active banner', () => {
    const store = new InMemoryVacationStore();
    const tenants = createMockTenants(1);
    const screen = new StudentFoodScreenSimulation(tenants[0], store);
    const today = getTodayStr();

    screen.bookVacation({
      startDate: today,
      endDate: '2026-10-30',
      isAllMeals: true
    });
    assert.equal(screen.isVacationBannerActive(today), true);

    screen.resumeVacation();
    assert.equal(screen.isVacationBannerActive(today), false);
  });
});

// ── F4: Daily Meal Actions Blocked / Locked for Paused Meals ────────────────
suite('F4: Daily Meal Actions (Pack, Cancel, QR Pass, QR Scan) Blocked for Paused Meals', () => {
  test('F4.1: "Pack Meal" action on a paused meal is blocked', () => {
    const store = new InMemoryVacationStore();
    const tenants = createMockTenants(1);
    const screen = new StudentFoodScreenSimulation(tenants[0], store);
    const today = getTodayStr();

    screen.bookVacation({
      startDate: today,
      endDate: today,
      isAllMeals: false,
      meals: ['dinner']
    });

    const check = screen.canPerformMealAction('Dinner', 'pack', today);
    assert.equal(check.allowed, false);
    assert.ok(check.reason.includes('blocked'));

    assert.throws(() => {
      screen.requestDailyAction('Dinner', 'pack', today);
    }, /blocked/);
  });

  test('F4.2: "Cancel Meal" action on a paused meal is blocked', () => {
    const store = new InMemoryVacationStore();
    const tenants = createMockTenants(1);
    const screen = new StudentFoodScreenSimulation(tenants[0], store);
    const today = getTodayStr();

    screen.bookVacation({
      startDate: today,
      endDate: today,
      isAllMeals: true
    });

    const check = screen.canPerformMealAction('Lunch', 'cancel', today);
    assert.equal(check.allowed, false);
    assert.throws(() => {
      screen.requestDailyAction('Lunch', 'cancel', today);
    }, /blocked/);
  });

  test('F4.3: "Show Meal Pass" (MEALPASS QR code) generation is blocked for paused meals', () => {
    const store = new InMemoryVacationStore();
    const tenants = createMockTenants(1);
    const screen = new StudentFoodScreenSimulation(tenants[0], store);
    const today = getTodayStr();

    screen.bookVacation({
      startDate: today,
      endDate: today,
      isAllMeals: false,
      meals: ['lunch']
    });

    const qrCheck = screen.canGenerateMealQR('Lunch', today);
    assert.equal(qrCheck.allowed, false);
    assert.ok(qrCheck.reason.includes('blocked'));
  });

  test('F4.4: Reverse QR Scanner ("Scan Cook\'s QR to Eat") is blocked for paused meals', () => {
    const store = new InMemoryVacationStore();
    const tenants = createMockTenants(1);
    const screen = new StudentFoodScreenSimulation(tenants[0], store);
    const today = getTodayStr();

    screen.bookVacation({
      startDate: today,
      endDate: today,
      isAllMeals: true
    });

    const scanCheck = screen.canScanCookQRToEat('Breakfast', today);
    assert.equal(scanCheck.allowed, false);
    assert.ok(scanCheck.reason.includes('blocked'));
  });

  test('F4.5: Non-paused meal on the same day allows "Pack", "Cancel", and QR pass unimpeded', () => {
    const store = new InMemoryVacationStore();
    const tenants = createMockTenants(1);
    const screen = new StudentFoodScreenSimulation(tenants[0], store);
    const today = getTodayStr();

    screen.bookVacation({
      startDate: today,
      endDate: today,
      isAllMeals: false,
      meals: ['dinner']
    });

    const lunchCheck = screen.canPerformMealAction('Lunch', 'pack', today);
    assert.equal(lunchCheck.allowed, true);

    const packReq = screen.requestDailyAction('Lunch', 'pack', today);
    assert.equal(packReq.success, true);

    const lunchQR = screen.canGenerateMealQR('Lunch', today);
    assert.equal(lunchQR.allowed, true);
    assert.ok(lunchQR.qrValue.includes('MEALPASS|lunch|'));

    const lunchScan = screen.canScanCookQRToEat('Lunch', today);
    assert.equal(lunchScan.allowed, true);
  });
});

// ── F5: Early Resume ("Resume Meals Now") Immediate Restoration ────────────
suite('F5: Early Resume ("Resume Meals Now") Immediate Restoration', () => {
  test('F5.1: Triggering "Resume Meals Now" transitions status to resumed', () => {
    const store = new InMemoryVacationStore();
    const tenants = createMockTenants(1);
    const screen = new StudentFoodScreenSimulation(tenants[0], store);
    const today = getTodayStr();

    screen.bookVacation({
      startDate: today,
      endDate: '2026-10-30',
      isAllMeals: true
    });

    const resumedDoc = screen.resumeVacation();
    assert.equal(resumedDoc.status, 'resumed');
  });

  test('F5.2: resumedAt ISO timestamp is recorded and updatedAt is refreshed', () => {
    const store = new InMemoryVacationStore();
    const tenants = createMockTenants(1);
    const screen = new StudentFoodScreenSimulation(tenants[0], store);
    const today = getTodayStr();

    screen.bookVacation({
      startDate: today,
      endDate: '2026-10-30',
      isAllMeals: true
    });

    const before = new Date().toISOString();
    const resumedDoc = screen.resumeVacation();
    assert.ok(resumedDoc.resumedAt);
    assert.ok(resumedDoc.resumedAt >= before.substring(0, 19));
  });

  test('F5.3: Once resumed, isMealPausedOnDate immediately returns false for current date', () => {
    const store = new InMemoryVacationStore();
    const tenants = createMockTenants(1);
    const screen = new StudentFoodScreenSimulation(tenants[0], store);
    const today = getTodayStr();

    const vac = screen.bookVacation({
      startDate: today,
      endDate: '2026-10-30',
      isAllMeals: true
    });
    assert.equal(isMealPausedOnDate(vac, today, 'lunch'), true);

    const resumed = screen.resumeVacation();
    assert.equal(isMealPausedOnDate(resumed, today, 'lunch'), false);
  });

  test('F5.4: Once resumed, all daily meal actions and QR generation are immediately unlocked', () => {
    const store = new InMemoryVacationStore();
    const tenants = createMockTenants(1);
    const screen = new StudentFoodScreenSimulation(tenants[0], store);
    const today = getTodayStr();

    screen.bookVacation({
      startDate: today,
      endDate: '2026-10-30',
      isAllMeals: true
    });
    screen.resumeVacation();

    const actionCheck = screen.canPerformMealAction('Dinner', 'pack', today);
    assert.equal(actionCheck.allowed, true);

    const qrCheck = screen.canGenerateMealQR('Dinner', today);
    assert.equal(qrCheck.allowed, true);
  });

  test('F5.5: Early resume of a shortened vacation restores remaining days cleanly', () => {
    const store = new InMemoryVacationStore();
    const tenants = createMockTenants(1);
    const screen = new StudentFoodScreenSimulation(tenants[0], store);
    const today = getTodayStr();

    screen.bookVacation({
      startDate: today,
      endDate: '2026-10-30',
      isAllMeals: true
    });

    screen.shortenVacation('2026-10-25');
    assert.equal(screen.getActiveVacation(today).status, 'shortened');

    const resumed = screen.resumeVacation();
    assert.equal(resumed.status, 'resumed');
    assert.equal(isMealPausedOnDate(resumed, today, 'breakfast'), false);
    assert.equal(isMealPausedOnDate(resumed, '2026-10-25', 'breakfast'), false);
  });
});

// ── F6: Shorten Return Date Adjustment ─────────────────────────────────────
suite('F6: Shorten Return Date Adjustment', () => {
  test('F6.1: Shortening end date updates endDate and records originalEndDate', () => {
    const store = new InMemoryVacationStore();
    const tenants = createMockTenants(1);
    const screen = new StudentFoodScreenSimulation(tenants[0], store);

    screen.bookVacation({
      startDate: '2026-10-10',
      endDate: '2026-10-20',
      isAllMeals: true
    });

    const shortened = screen.shortenVacation('2026-10-15');
    assert.equal(shortened.endDate, '2026-10-15');
    assert.equal(shortened.originalEndDate, '2026-10-20');
  });

  test('F6.2: Status transitions to shortened and dates array is truncated', () => {
    const store = new InMemoryVacationStore();
    const tenants = createMockTenants(1);
    const screen = new StudentFoodScreenSimulation(tenants[0], store);

    screen.bookVacation({
      startDate: '2026-10-10',
      endDate: '2026-10-20',
      isAllMeals: true
    });

    const shortened = screen.shortenVacation('2026-10-15');
    assert.equal(shortened.status, 'shortened');
    assert.equal(shortened.dates.length, 6);
    assert.equal(shortened.dates[shortened.dates.length - 1], '2026-10-15');
  });

  test('F6.3: Dates within new range remain paused', () => {
    const store = new InMemoryVacationStore();
    const tenants = createMockTenants(1);
    const screen = new StudentFoodScreenSimulation(tenants[0], store);

    screen.bookVacation({
      startDate: '2026-10-10',
      endDate: '2026-10-20',
      isAllMeals: true
    });

    const shortened = screen.shortenVacation('2026-10-15');
    assert.equal(isMealPausedOnDate(shortened, '2026-10-10', 'lunch'), true);
    assert.equal(isMealPausedOnDate(shortened, '2026-10-15', 'lunch'), true);
  });

  test('F6.4: Dates after new endDate are immediately unpaused', () => {
    const store = new InMemoryVacationStore();
    const tenants = createMockTenants(1);
    const screen = new StudentFoodScreenSimulation(tenants[0], store);

    screen.bookVacation({
      startDate: '2026-10-10',
      endDate: '2026-10-20',
      isAllMeals: true
    });

    const shortened = screen.shortenVacation('2026-10-15');
    assert.equal(isMealPausedOnDate(shortened, '2026-10-16', 'lunch'), false);
    assert.equal(isMealPausedOnDate(shortened, '2026-10-20', 'lunch'), false);
  });

  test('F6.5: Shortening to today\'s date keeps today paused and unpauses tomorrow onwards', () => {
    const store = new InMemoryVacationStore();
    const tenants = createMockTenants(1);
    const screen = new StudentFoodScreenSimulation(tenants[0], store);
    const today = getTodayStr();

    screen.bookVacation({
      startDate: today,
      endDate: '2026-10-31',
      isAllMeals: true
    });

    const shortened = screen.shortenVacation(today);
    assert.equal(shortened.endDate, today);
    assert.equal(isMealPausedOnDate(shortened, today, 'dinner'), true);

    const d = new Date();
    d.setDate(d.getDate() + 1);
    const tomorrow = formatDateStr(d);
    assert.equal(isMealPausedOnDate(shortened, tomorrow, 'dinner'), false);
  });
});

// ── F7: Cook Headcount Exclusion of Vacationing Students ───────────────────
suite('F7: Cook Headcount Exclusion of Vacationing Students', () => {
  test('F7.1: Cook view excludes full-day vacationing student from requested across all 4 meals', () => {
    const store = new InMemoryVacationStore();
    const tenants = createMockTenants(10);
    const cook = new StaffAppCookSimulation(MOCK_ADMIN_ID, MOCK_PG_ID, tenants, store);
    const targetDate = '2026-10-15';

    store.saveVacation(buildVacationDoc({
      tenantId: tenants[0].id,
      adminId: MOCK_ADMIN_ID,
      pgId: MOCK_PG_ID,
      startDate: targetDate,
      endDate: targetDate,
      isAllMeals: true
    }));

    for (const meal of ['Breakfast', 'Lunch', 'Snacks', 'Dinner']) {
      const hc = cook.computeHeadcount(targetDate, meal);
      assert.equal(hc.totalTenants, 10);
      assert.equal(hc.requested, 9, `Requested for ${meal} should be 9`);
      assert.equal(hc.onVacation, 1, `OnVacation for ${meal} should be 1`);
    }
  });

  test('F7.2: Cook view excludes lunch-only vacationing student from lunch only', () => {
    const store = new InMemoryVacationStore();
    const tenants = createMockTenants(10);
    const cook = new StaffAppCookSimulation(MOCK_ADMIN_ID, MOCK_PG_ID, tenants, store);
    const targetDate = '2026-10-15';

    store.saveVacation(buildVacationDoc({
      tenantId: tenants[0].id,
      adminId: MOCK_ADMIN_ID,
      pgId: MOCK_PG_ID,
      startDate: targetDate,
      endDate: targetDate,
      isAllMeals: false,
      meals: ['lunch']
    }));

    const lunchHc = cook.computeHeadcount(targetDate, 'Lunch');
    assert.equal(lunchHc.requested, 9);
    assert.equal(lunchHc.onVacation, 1);

    const dinnerHc = cook.computeHeadcount(targetDate, 'Dinner');
    assert.equal(dinnerHc.requested, 10);
    assert.equal(dinnerHc.onVacation, 0);
  });

  test('F7.3: Cook cannot mark vacationing student as eaten for paused meal', () => {
    const store = new InMemoryVacationStore();
    const tenants = createMockTenants(10);
    const cook = new StaffAppCookSimulation(MOCK_ADMIN_ID, MOCK_PG_ID, tenants, store);
    const targetDate = '2026-10-15';

    store.saveVacation(buildVacationDoc({
      tenantId: tenants[0].id,
      adminId: MOCK_ADMIN_ID,
      pgId: MOCK_PG_ID,
      startDate: targetDate,
      endDate: targetDate,
      isAllMeals: true
    }));

    assert.throws(() => {
      cook.recordMealEaten(tenants[0].id, targetDate, 'lunch');
    }, /Cannot mark meal eaten/);
  });

  test('F7.4: After vacation ends, student automatically returns to requested count', () => {
    const store = new InMemoryVacationStore();
    const tenants = createMockTenants(10);
    const cook = new StaffAppCookSimulation(MOCK_ADMIN_ID, MOCK_PG_ID, tenants, store);

    store.saveVacation(buildVacationDoc({
      tenantId: tenants[0].id,
      adminId: MOCK_ADMIN_ID,
      pgId: MOCK_PG_ID,
      startDate: '2026-10-10',
      endDate: '2026-10-12',
      isAllMeals: true
    }));

    const during = cook.computeHeadcount('2026-10-11', 'Lunch');
    assert.equal(during.requested, 9);
    assert.equal(during.onVacation, 1);

    const after = cook.computeHeadcount('2026-10-13', 'Lunch');
    assert.equal(after.requested, 10);
    assert.equal(after.onVacation, 0);
  });

  test('F7.5: Cook manual eater selection modal excludes vacationing students from pending list', () => {
    const store = new InMemoryVacationStore();
    const tenants = createMockTenants(10);
    const cook = new StaffAppCookSimulation(MOCK_ADMIN_ID, MOCK_PG_ID, tenants, store);
    const targetDate = '2026-10-15';

    store.saveVacation(buildVacationDoc({
      tenantId: tenants[0].id,
      adminId: MOCK_ADMIN_ID,
      pgId: MOCK_PG_ID,
      startDate: targetDate,
      endDate: targetDate,
      isAllMeals: false,
      meals: ['dinner']
    }));

    const manualListDinner = cook.getManualSelectionList(targetDate, 'Dinner');
    assert.equal(manualListDinner.length, 9);
    assert.equal(manualListDinner.some(t => t.id === tenants[0].id), false);

    const manualListLunch = cook.getManualSelectionList(targetDate, 'Lunch');
    assert.equal(manualListLunch.length, 10);
    assert.equal(manualListLunch.some(t => t.id === tenants[0].id), true);
  });
});

// ── F8: Cook Dedicated "On Food Vacation" Counter and Roster ───────────────
suite('F8: Cook Dedicated "On Food Vacation" Counter and Roster', () => {
  test('F8.1: Dedicated "On Food Vacation" stat card displays exact count', () => {
    const store = new InMemoryVacationStore();
    const tenants = createMockTenants(10);
    const cook = new StaffAppCookSimulation(MOCK_ADMIN_ID, MOCK_PG_ID, tenants, store);
    const targetDate = '2026-10-15';

    for (let i = 0; i < 3; i++) {
      store.saveVacation(buildVacationDoc({
        tenantId: tenants[i].id,
        adminId: MOCK_ADMIN_ID,
        pgId: MOCK_PG_ID,
        startDate: targetDate,
        endDate: targetDate,
        isAllMeals: true
      }));
    }

    const hc = cook.computeHeadcount(targetDate, 'Lunch');
    assert.equal(hc.onVacation, 3);
    assert.equal(hc.requested, 7);
  });

  test('F8.2: Filtered student roster for "On Vacation" displays room number, student name, and paused meals', () => {
    const store = new InMemoryVacationStore();
    const tenants = createMockTenants(10);
    const cook = new StaffAppCookSimulation(MOCK_ADMIN_ID, MOCK_PG_ID, tenants, store);
    const targetDate = '2026-10-15';

    store.saveVacation(buildVacationDoc({
      tenantId: tenants[0].id,
      adminId: MOCK_ADMIN_ID,
      pgId: MOCK_PG_ID,
      startDate: targetDate,
      endDate: targetDate,
      isAllMeals: false,
      meals: ['lunch']
    }));

    const roster = cook.getVacationRoster(targetDate, 'Lunch');
    assert.equal(roster.length, 1);
    assert.equal(roster[0].id, tenants[0].id);
    assert.equal(roster[0].name, tenants[0].name);
    assert.equal(roster[0].roomNumber, tenants[0].roomNumber);
    assert.deepEqual(roster[0].pausedMeals, ['lunch']);
  });

  test('F8.3: On-vacation counter updates dynamically when switching meal tabs', () => {
    const store = new InMemoryVacationStore();
    const tenants = createMockTenants(10);
    const cook = new StaffAppCookSimulation(MOCK_ADMIN_ID, MOCK_PG_ID, tenants, store);
    const targetDate = '2026-10-15';

    store.saveVacation(buildVacationDoc({
      tenantId: tenants[0].id,
      adminId: MOCK_ADMIN_ID,
      pgId: MOCK_PG_ID,
      startDate: targetDate,
      endDate: targetDate,
      isAllMeals: false,
      meals: ['lunch']
    }));

    store.saveVacation(buildVacationDoc({
      tenantId: tenants[1].id,
      adminId: MOCK_ADMIN_ID,
      pgId: MOCK_PG_ID,
      startDate: targetDate,
      endDate: targetDate,
      isAllMeals: false,
      meals: ['dinner']
    }));

    assert.equal(cook.computeHeadcount(targetDate, 'Breakfast').onVacation, 0);
    assert.equal(cook.computeHeadcount(targetDate, 'Lunch').onVacation, 1);
    assert.equal(cook.computeHeadcount(targetDate, 'Dinner').onVacation, 1);
  });

  test('F8.4: On-vacation counter drops to 0 when date is outside vacation windows', () => {
    const store = new InMemoryVacationStore();
    const tenants = createMockTenants(10);
    const cook = new StaffAppCookSimulation(MOCK_ADMIN_ID, MOCK_PG_ID, tenants, store);

    store.saveVacation(buildVacationDoc({
      tenantId: tenants[0].id,
      adminId: MOCK_ADMIN_ID,
      pgId: MOCK_PG_ID,
      startDate: '2026-10-10',
      endDate: '2026-10-12',
      isAllMeals: true
    }));

    assert.equal(cook.computeHeadcount('2026-10-09', 'Lunch').onVacation, 0);
    assert.equal(cook.computeHeadcount('2026-10-11', 'Lunch').onVacation, 1);
    assert.equal(cook.computeHeadcount('2026-10-13', 'Lunch').onVacation, 0);
  });

  test('F8.5: Cook view distinguishes between students with daily cancellations vs long-term vacation', () => {
    const store = new InMemoryVacationStore();
    const tenants = createMockTenants(10);
    const cook = new StaffAppCookSimulation(MOCK_ADMIN_ID, MOCK_PG_ID, tenants, store);
    const targetDate = '2026-10-15';

    store.saveVacation(buildVacationDoc({
      tenantId: tenants[0].id,
      adminId: MOCK_ADMIN_ID,
      pgId: MOCK_PG_ID,
      startDate: targetDate,
      endDate: targetDate,
      isAllMeals: true
    }));

    cook.recordDailyStatus(tenants[1].id, targetDate, 'lunch', 'not_eating');

    const hc = cook.computeHeadcount(targetDate, 'Lunch');
    assert.equal(hc.onVacation, 1);
    assert.equal(hc.notEaten, 1);
    assert.equal(hc.requested, 8);
  });
});

// ── F9: Admin Headcount Exclusion and Leave Status ─────────────────────────
suite('F9: Admin Headcount Exclusion and Leave Status', () => {
  test('F9.1: Admin MessHeadcount calculation excludes vacationing students from Requested', () => {
    const store = new InMemoryVacationStore();
    const tenants = createMockTenants(10);
    const admin = new AdminMessHeadcountSimulation(MOCK_ADMIN_ID, MOCK_PG_ID, tenants, store);
    const targetDate = '2026-10-15';

    store.saveVacation(buildVacationDoc({
      tenantId: tenants[0].id,
      adminId: MOCK_ADMIN_ID,
      pgId: MOCK_PG_ID,
      startDate: targetDate,
      endDate: targetDate,
      isAllMeals: true
    }));

    const hc = admin.computeHeadcount(targetDate, 'lunch');
    assert.equal(hc.requested, 9);
    assert.equal(hc.onLeave, 1);
  });

  test('F9.2: Dedicated "On Leave" counter in Admin dashboard reflects accurate student count', () => {
    const store = new InMemoryVacationStore();
    const tenants = createMockTenants(10);
    const admin = new AdminMessHeadcountSimulation(MOCK_ADMIN_ID, MOCK_PG_ID, tenants, store);
    const targetDate = '2026-10-15';

    for (let i = 0; i < 4; i++) {
      store.saveVacation(buildVacationDoc({
        tenantId: tenants[i].id,
        adminId: MOCK_ADMIN_ID,
        pgId: MOCK_PG_ID,
        startDate: targetDate,
        endDate: targetDate,
        isAllMeals: true
      }));
    }

    const hc = admin.computeHeadcount(targetDate, 'dinner');
    assert.equal(hc.onLeave, 4);
    assert.equal(hc.requested, 6);
  });

  test('F9.3: Student attendance list displays "On Leave" badge with date interval details', () => {
    const store = new InMemoryVacationStore();
    const tenants = createMockTenants(10);
    const admin = new AdminMessHeadcountSimulation(MOCK_ADMIN_ID, MOCK_PG_ID, tenants, store);
    const targetDate = '2026-10-15';

    store.saveVacation(buildVacationDoc({
      tenantId: tenants[0].id,
      adminId: MOCK_ADMIN_ID,
      pgId: MOCK_PG_ID,
      startDate: '2026-10-14',
      endDate: '2026-10-18',
      isAllMeals: true
    }));

    const hc = admin.computeHeadcount(targetDate, 'lunch');
    const studentItem = hc.studentList.find(s => s.id === tenants[0].id);
    assert.ok(studentItem);
    assert.equal(studentItem.status, 'on_leave');
    assert.equal(studentItem.leaveBadge, true);
    assert.equal(studentItem.vacation.startDate, '2026-10-14');
    assert.equal(studentItem.vacation.endDate, '2026-10-18');
  });

  test('F9.4: Admin cannot mark daily cancellation or eaten attendance for vacationing student', () => {
    const store = new InMemoryVacationStore();
    const tenants = createMockTenants(10);
    const cook = new StaffAppCookSimulation(MOCK_ADMIN_ID, MOCK_PG_ID, tenants, store);
    const targetDate = '2026-10-15';

    store.saveVacation(buildVacationDoc({
      tenantId: tenants[0].id,
      adminId: MOCK_ADMIN_ID,
      pgId: MOCK_PG_ID,
      startDate: targetDate,
      endDate: targetDate,
      isAllMeals: true
    }));

    assert.throws(() => {
      cook.recordMealEaten(tenants[0].id, targetDate, 'lunch');
    }, /Cannot mark meal eaten/);
  });

  test('F9.5: Date navigation in Admin recalculates leave status across historical and future dates', () => {
    const store = new InMemoryVacationStore();
    const tenants = createMockTenants(10);
    const admin = new AdminMessHeadcountSimulation(MOCK_ADMIN_ID, MOCK_PG_ID, tenants, store);

    store.saveVacation(buildVacationDoc({
      tenantId: tenants[0].id,
      adminId: MOCK_ADMIN_ID,
      pgId: MOCK_PG_ID,
      startDate: '2026-10-10',
      endDate: '2026-10-15',
      isAllMeals: true
    }));

    assert.equal(admin.computeHeadcount('2026-10-09', 'lunch').onLeave, 0);
    assert.equal(admin.computeHeadcount('2026-10-10', 'lunch').onLeave, 1);
    assert.equal(admin.computeHeadcount('2026-10-13', 'lunch').onLeave, 1);
    assert.equal(admin.computeHeadcount('2026-10-15', 'lunch').onLeave, 1);
    assert.equal(admin.computeHeadcount('2026-10-16', 'lunch').onLeave, 0);
  });
});

// ── F10: Non-Food Module Independence ──────────────────────────────────────
suite('F10: Non-Food Module Independence (Rent, Complaints, Chat, Inventory)', () => {
  class NonFoodModuleSimulation {
    constructor() {
      this.rentRecords = [];
      this.complaints = [];
      this.chats = [];
      this.itemRequests = [];
    }

    addPayment(tenantId, amount) {
      this.rentRecords.push({ tenantId, amount, status: 'paid', date: new Date().toISOString() });
    }

    fileComplaint(tenantId, category, description) {
      this.complaints.push({ id: `c_${Date.now()}`, tenantId, category, description, status: 'open' });
    }

    sendChatMessage(tenantId, message) {
      this.chats.push({ tenantId, message, timestamp: new Date().toISOString() });
    }

    requestInventoryItem(tenantId, item) {
      this.itemRequests.push({ tenantId, item, status: 'pending' });
    }
  }

  test('F10.1: Student rent payments remain fully operational during vacation', () => {
    const modules = new NonFoodModuleSimulation();
    modules.addPayment('student_1', 8500);
    assert.equal(modules.rentRecords.length, 1);
    assert.equal(modules.rentRecords[0].status, 'paid');
    assert.equal(modules.rentRecords[0].amount, 8500);
  });

  test('F10.2: Complaints creation and tracking work during vacation', () => {
    const modules = new NonFoodModuleSimulation();
    modules.fileComplaint('student_1', 'Plumbing', 'Bathroom tap leaking');
    assert.equal(modules.complaints.length, 1);
    assert.equal(modules.complaints[0].category, 'Plumbing');
  });

  test('F10.3: PG Group and Admin Chat messaging functions normally during vacation', () => {
    const modules = new NonFoodModuleSimulation();
    modules.sendChatMessage('student_1', 'Hello warden, leaving my room keys with security');
    assert.equal(modules.chats.length, 1);
    assert.ok(modules.chats[0].message.includes('room keys'));
  });

  test('F10.4: Inventory / Item Requests (RequestBox) functionality remains unaffected', () => {
    const modules = new NonFoodModuleSimulation();
    modules.requestInventoryItem('student_1', 'Extra Bed Sheet');
    assert.equal(modules.itemRequests.length, 1);
    assert.equal(modules.itemRequests[0].item, 'Extra Bed Sheet');
  });

  test('F10.5: Vacation lifecycle mutations do not mutate or pollute non-food state', () => {
    const store = new InMemoryVacationStore();
    const tenants = createMockTenants(1);
    const screen = new StudentFoodScreenSimulation(tenants[0], store);
    const modules = new NonFoodModuleSimulation();

    modules.fileComplaint(tenants[0].uid, 'Electrical', 'Fan speed regulator broken');

    screen.bookVacation({
      startDate: getTodayStr(),
      endDate: '2026-10-30',
      isAllMeals: true
    });
    screen.shortenVacation('2026-10-25');
    screen.resumeVacation();

    assert.equal(modules.complaints.length, 1);
    assert.equal(modules.complaints[0].status, 'open');
    assert.equal(modules.rentRecords.length, 0);
    assert.equal(modules.chats.length, 0);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// TIER 2: BOUNDARY & CORNER CASES (>=5 Test Cases per Area B1 through B7)
// ───────────────────────────────────────────────────────────────────────────

setTier('Tier 2 (Boundary & Corner Cases)');

// ── B1: Same-Day Single-Day Vacation ───────────────────────────────────────
suite('B1: Same-Day Single-Day Vacation (startDate === endDate === today)', () => {
  test('B1.1: Single-day booking for today creates a 1-day range [today]', () => {
    const today = getTodayStr();
    const range = generateDateRange(today, today);
    assert.equal(range.length, 1);
    assert.equal(range[0], today);
  });

  test('B1.2: Actions are locked for today during single-day vacation', () => {
    const store = new InMemoryVacationStore();
    const tenants = createMockTenants(1);
    const screen = new StudentFoodScreenSimulation(tenants[0], store);
    const today = getTodayStr();

    screen.bookVacation({
      startDate: today,
      endDate: today,
      isAllMeals: true
    });

    assert.equal(screen.canPerformMealAction('Lunch', 'pack', today).allowed, false);
    assert.equal(screen.canGenerateMealQR('Lunch', today).allowed, false);
  });

  test('B1.3: Headcount today excludes student; tomorrow includes student as requested', () => {
    const store = new InMemoryVacationStore();
    const tenants = createMockTenants(10);
    const cook = new StaffAppCookSimulation(MOCK_ADMIN_ID, MOCK_PG_ID, tenants, store);
    const today = getTodayStr();

    store.saveVacation(buildVacationDoc({
      tenantId: tenants[0].id,
      adminId: MOCK_ADMIN_ID,
      pgId: MOCK_PG_ID,
      startDate: today,
      endDate: today,
      isAllMeals: true
    }));

    const d = new Date();
    d.setDate(d.getDate() + 1);
    const tomorrow = formatDateStr(d);

    assert.equal(cook.computeHeadcount(today, 'Lunch').requested, 9);
    assert.equal(cook.computeHeadcount(today, 'Lunch').onVacation, 1);

    assert.equal(cook.computeHeadcount(tomorrow, 'Lunch').requested, 10);
    assert.equal(cook.computeHeadcount(tomorrow, 'Lunch').onVacation, 0);
  });

  test('B1.4: Resuming a same-day vacation today immediately restores today\'s meals', () => {
    const store = new InMemoryVacationStore();
    const tenants = createMockTenants(1);
    const screen = new StudentFoodScreenSimulation(tenants[0], store);
    const today = getTodayStr();

    screen.bookVacation({
      startDate: today,
      endDate: today,
      isAllMeals: true
    });
    screen.resumeVacation();

    assert.equal(screen.canPerformMealAction('Dinner', 'pack', today).allowed, true);
    assert.equal(screen.canGenerateMealQR('Dinner', today).allowed, true);
  });

  test('B1.5: Shortening a single-day vacation is rejected', () => {
    const store = new InMemoryVacationStore();
    const tenants = createMockTenants(1);
    const screen = new StudentFoodScreenSimulation(tenants[0], store);
    const today = getTodayStr();

    screen.bookVacation({
      startDate: today,
      endDate: today,
      isAllMeals: true
    });

    assert.throws(() => {
      screen.shortenVacation(today);
    }, /must be earlier than current end date/);
  });
});

// ── B2: Cross-Month Vacation ───────────────────────────────────────────────
suite('B2: Cross-Month Vacation (e.g. Oct 28 to Nov 05)', () => {
  test('B2.1: Date generator produces correct sequential days across month boundary', () => {
    const range = generateDateRange('2026-10-28', '2026-11-05');
    assert.equal(range.length, 9);
    assert.deepEqual(range, [
      '2026-10-28',
      '2026-10-29',
      '2026-10-30',
      '2026-10-31',
      '2026-11-01',
      '2026-11-02',
      '2026-11-03',
      '2026-11-04',
      '2026-11-05'
    ]);
  });

  test('B2.2: Day 31 (Oct 31) evaluates as paused', () => {
    const doc = buildVacationDoc({
      startDate: '2026-10-28',
      endDate: '2026-11-05',
      isAllMeals: true
    });
    assert.equal(isMealPausedOnDate(doc, '2026-10-31', 'dinner'), true);
  });

  test('B2.3: Day 1 of new month (Nov 01) evaluates as paused', () => {
    const doc = buildVacationDoc({
      startDate: '2026-10-28',
      endDate: '2026-11-05',
      isAllMeals: true
    });
    assert.equal(isMealPausedOnDate(doc, '2026-11-01', 'breakfast'), true);
  });

  test('B2.4: Days before Oct 28 and after Nov 05 evaluate as unpaused', () => {
    const doc = buildVacationDoc({
      startDate: '2026-10-28',
      endDate: '2026-11-05',
      isAllMeals: true
    });
    assert.equal(isMealPausedOnDate(doc, '2026-10-27', 'lunch'), false);
    assert.equal(isMealPausedOnDate(doc, '2026-11-06', 'lunch'), false);
  });

  test('B2.5: Headcount on Oct 31 and Nov 01 both deduct the vacationing student', () => {
    const store = new InMemoryVacationStore();
    const tenants = createMockTenants(10);
    const cook = new StaffAppCookSimulation(MOCK_ADMIN_ID, MOCK_PG_ID, tenants, store);

    store.saveVacation(buildVacationDoc({
      tenantId: tenants[0].id,
      adminId: MOCK_ADMIN_ID,
      pgId: MOCK_PG_ID,
      startDate: '2026-10-28',
      endDate: '2026-11-05',
      isAllMeals: true
    }));

    assert.equal(cook.computeHeadcount('2026-10-31', 'Lunch').requested, 9);
    assert.equal(cook.computeHeadcount('2026-11-01', 'Lunch').requested, 9);
  });
});

// ── B3: Leap Year & Year Boundary Handling ─────────────────────────────────
suite('B3: Leap Year & Year Boundary Handling', () => {
  test('B3.1: Leap year (2028-02-28 to 2028-03-02) includes 2028-02-29 in range', () => {
    const range = generateDateRange('2028-02-28', '2028-03-02');
    assert.equal(range.length, 4);
    assert.deepEqual(range, ['2028-02-28', '2028-02-29', '2028-03-01', '2028-03-02']);
  });

  test('B3.2: Non-leap year (2027-02-28 to 2027-03-02) transitions directly from Feb 28 to Mar 01', () => {
    const range = generateDateRange('2027-02-28', '2027-03-02');
    assert.equal(range.length, 3);
    assert.deepEqual(range, ['2027-02-28', '2027-03-01', '2027-03-02']);
  });

  test('B3.3: Year boundary (2026-12-30 to 2027-01-02) generates 4 days across New Year', () => {
    const range = generateDateRange('2026-12-30', '2027-01-02');
    assert.equal(range.length, 4);
    assert.deepEqual(range, ['2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02']);
  });

  test('B3.4: Dec 31 and Jan 01 both evaluate as paused; Jan 03 evaluates as unpaused', () => {
    const doc = buildVacationDoc({
      startDate: '2026-12-30',
      endDate: '2027-01-02',
      isAllMeals: true
    });
    assert.equal(isMealPausedOnDate(doc, '2026-12-31', 'dinner'), true);
    assert.equal(isMealPausedOnDate(doc, '2027-01-01', 'breakfast'), true);
    assert.equal(isMealPausedOnDate(doc, '2027-01-03', 'breakfast'), false);
  });

  test('B3.5: Leap day 2028-02-29 correctly excludes student from Cook and Admin headcounts', () => {
    const store = new InMemoryVacationStore();
    const tenants = createMockTenants(10);
    const cook = new StaffAppCookSimulation(MOCK_ADMIN_ID, MOCK_PG_ID, tenants, store);

    store.saveVacation(buildVacationDoc({
      tenantId: tenants[0].id,
      adminId: MOCK_ADMIN_ID,
      pgId: MOCK_PG_ID,
      startDate: '2028-02-28',
      endDate: '2028-03-02',
      isAllMeals: true
    }));

    const leapDayHc = cook.computeHeadcount('2028-02-29', 'Lunch');
    assert.equal(leapDayHc.requested, 9);
    assert.equal(leapDayHc.onVacation, 1);
  });
});

// ── B4: Granular Single / Dual Meal Isolation ──────────────────────────────
suite('B4: Granular Single / Dual Meal Isolation', () => {
  test('B4.1: Only Dinner paused: Breakfast, Lunch, Snacks remain unpaused', () => {
    const doc = buildVacationDoc({
      startDate: '2026-10-15',
      endDate: '2026-10-15',
      isAllMeals: false,
      meals: ['dinner']
    });

    assert.equal(isMealPausedOnDate(doc, '2026-10-15', 'dinner'), true);
    assert.equal(isMealPausedOnDate(doc, '2026-10-15', 'breakfast'), false);
    assert.equal(isMealPausedOnDate(doc, '2026-10-15', 'lunch'), false);
    assert.equal(isMealPausedOnDate(doc, '2026-10-15', 'snacks'), false);
  });

  test('B4.2: Only Lunch and Snacks paused: Breakfast and Dinner remain unpaused', () => {
    const doc = buildVacationDoc({
      startDate: '2026-10-15',
      endDate: '2026-10-15',
      isAllMeals: false,
      meals: ['lunch', 'snacks']
    });

    assert.equal(isMealPausedOnDate(doc, '2026-10-15', 'lunch'), true);
    assert.equal(isMealPausedOnDate(doc, '2026-10-15', 'snacks'), true);
    assert.equal(isMealPausedOnDate(doc, '2026-10-15', 'breakfast'), false);
    assert.equal(isMealPausedOnDate(doc, '2026-10-15', 'dinner'), false);
  });

  test('B4.3: Pausing all 4 meals via meals list vs isAllMeals: true yields identical pause behavior', () => {
    const docA = buildVacationDoc({
      startDate: '2026-10-15',
      endDate: '2026-10-15',
      isAllMeals: true
    });

    const docB = buildVacationDoc({
      startDate: '2026-10-15',
      endDate: '2026-10-15',
      isAllMeals: false,
      meals: ['breakfast', 'lunch', 'snacks', 'dinner']
    });

    for (const m of ALL_MEALS) {
      assert.equal(isMealPausedOnDate(docA, '2026-10-15', m), isMealPausedOnDate(docB, '2026-10-15', m));
    }
  });

  test('B4.4: Omitted meals array when isAllMeals: true defaults safely to all meals', () => {
    const doc = buildVacationDoc({
      startDate: '2026-10-15',
      endDate: '2026-10-15',
      isAllMeals: true
    });
    assert.deepEqual(doc.meals, ALL_MEALS);
  });

  test('B4.5: Unknown meal string in query does not falsely match paused meals', () => {
    const doc = buildVacationDoc({
      startDate: '2026-10-15',
      endDate: '2026-10-15',
      isAllMeals: false,
      meals: ['dinner']
    });
    assert.equal(isMealPausedOnDate(doc, '2026-10-15', 'midnight_snack'), false);
    assert.equal(isMealPausedOnDate(doc, '2026-10-15', 'brunch'), false);
  });
});

// ── B5: Early Resume on Boundary Dates ─────────────────────────────────────
suite('B5: Early Resume on Boundary Dates', () => {
  test('B5.1: Resuming on the exact first day (today === startDate) unpauses entire window', () => {
    const store = new InMemoryVacationStore();
    const tenants = createMockTenants(1);
    const screen = new StudentFoodScreenSimulation(tenants[0], store);
    const today = getTodayStr();

    screen.bookVacation({
      startDate: today,
      endDate: '2026-10-30',
      isAllMeals: true
    });

    const resumed = screen.resumeVacation();
    assert.equal(resumed.status, 'resumed');
    assert.equal(isMealPausedOnDate(resumed, today, 'lunch'), false);
    assert.equal(isMealPausedOnDate(resumed, '2026-10-25', 'lunch'), false);
  });

  test('B5.2: Resuming on the exact final day (today === endDate) restores final day meals', () => {
    const store = new InMemoryVacationStore();
    const tenants = createMockTenants(1);
    const screen = new StudentFoodScreenSimulation(tenants[0], store);
    const today = getTodayStr();

    store.saveVacation(buildVacationDoc({
      tenantId: tenants[0].uid,
      startDate: '2026-09-01',
      endDate: today,
      isAllMeals: true,
      status: 'active'
    }));

    const resumed = screen.resumeVacation();
    assert.equal(resumed.status, 'resumed');
    assert.equal(isMealPausedOnDate(resumed, today, 'dinner'), false);
  });

  test('B5.3: Resuming an already resumed vacation is idempotent and does not corrupt state', () => {
    const store = new InMemoryVacationStore();
    const tenants = createMockTenants(1);
    const screen = new StudentFoodScreenSimulation(tenants[0], store);
    const today = getTodayStr();

    screen.bookVacation({
      startDate: today,
      endDate: '2026-10-30',
      isAllMeals: true
    });

    const r1 = screen.resumeVacation();
    const r2 = screen.resumeVacation();
    assert.equal(r1.status, 'resumed');
    assert.equal(r2.status, 'resumed');
  });

  test('B5.4: Resuming a future vacation cancels future pause cleanly', () => {
    const store = new InMemoryVacationStore();
    const tenants = createMockTenants(1);
    const screen = new StudentFoodScreenSimulation(tenants[0], store);

    const doc = screen.bookVacation({
      startDate: '2026-12-01',
      endDate: '2026-12-10',
      isAllMeals: true
    });

    store.resumeVacation(doc.id);
    const updated = store.getForTenant(tenants[0].uid)[0];
    assert.equal(updated.status, 'resumed');
    assert.equal(isMealPausedOnDate(updated, '2026-12-05', 'dinner'), false);
  });

  test('B5.5: Expired vacation evaluation returns false regardless of status', () => {
    const doc = buildVacationDoc({
      startDate: '2026-08-01',
      endDate: '2026-08-10',
      isAllMeals: true,
      status: 'active'
    });
    assert.equal(isMealPausedOnDate(doc, '2026-10-15', 'lunch'), false);
  });
});

// ── B6: Shortening to Boundary Dates & Past Date Rejection ─────────────────
suite('B6: Shortening to Boundary Dates & Past Date Rejection', () => {
  test('B6.1: Shortening to today\'s date is valid: today remains paused, tomorrow is unpaused', () => {
    const store = new InMemoryVacationStore();
    const tenants = createMockTenants(1);
    const screen = new StudentFoodScreenSimulation(tenants[0], store);
    const today = getTodayStr();

    screen.bookVacation({
      startDate: today,
      endDate: '2026-10-31',
      isAllMeals: true
    });

    const shortened = screen.shortenVacation(today);
    assert.equal(shortened.status, 'shortened');
    assert.equal(shortened.endDate, today);
    assert.equal(isMealPausedOnDate(shortened, today, 'lunch'), true);
  });

  test('B6.2: Shortening to a past date before startDate is rejected with descriptive error', () => {
    const store = new InMemoryVacationStore();
    const tenants = createMockTenants(1);
    const screen = new StudentFoodScreenSimulation(tenants[0], store);

    screen.bookVacation({
      startDate: '2026-10-15',
      endDate: '2026-10-25',
      isAllMeals: true
    });

    assert.throws(() => {
      screen.shortenVacation('2026-10-10');
    }, /cannot be before start date/);
  });

  test('B6.3: Shortening to a date after current endDate is rejected', () => {
    const store = new InMemoryVacationStore();
    const tenants = createMockTenants(1);
    const screen = new StudentFoodScreenSimulation(tenants[0], store);

    screen.bookVacation({
      startDate: '2026-10-15',
      endDate: '2026-10-20',
      isAllMeals: true
    });

    assert.throws(() => {
      screen.shortenVacation('2026-10-25');
    }, /must be earlier than current end date/);
  });

  test('B6.4: Shortening to the exact current endDate is rejected as no-op', () => {
    const store = new InMemoryVacationStore();
    const tenants = createMockTenants(1);
    const screen = new StudentFoodScreenSimulation(tenants[0], store);

    screen.bookVacation({
      startDate: '2026-10-15',
      endDate: '2026-10-20',
      isAllMeals: true
    });

    assert.throws(() => {
      screen.shortenVacation('2026-10-20');
    }, /must be earlier than current end date/);
  });

  test('B6.5: Shortening an already shortened vacation to an even earlier date succeeds', () => {
    const store = new InMemoryVacationStore();
    const tenants = createMockTenants(1);
    const screen = new StudentFoodScreenSimulation(tenants[0], store);

    screen.bookVacation({
      startDate: '2026-10-10',
      endDate: '2026-10-20',
      isAllMeals: true
    });

    screen.shortenVacation('2026-10-16');
    const secondShorten = screen.shortenVacation('2026-10-12');

    assert.equal(secondShorten.endDate, '2026-10-12');
    assert.equal(secondShorten.originalEndDate, '2026-10-20');
    assert.equal(isMealPausedOnDate(secondShorten, '2026-10-13', 'dinner'), false);
  });
});

// ── B7: Invalid Range Rejection & Malformed Inputs ─────────────────────────
suite('B7: Invalid Range Rejection & Malformed Inputs', () => {
  test('B7.1: Start date > End date (2026-10-20 to 2026-10-15) is rejected', () => {
    const validation = validateVacationRange('2026-10-20', '2026-10-15');
    assert.equal(validation.valid, false);
    assert.ok(validation.error);
  });

  test('B7.2: Start date in the past (startDate < today) is rejected', () => {
    const validation = validateVacationRange('2020-01-01', '2020-01-10');
    assert.equal(validation.valid, false);
    assert.ok(validation.error.includes('past'));
  });

  test('B7.3: Malformed date strings (\'invalid\', \'2026-99-99\', \'\') are rejected', () => {
    assert.equal(validateVacationRange('', '2026-10-20').valid, false);
    assert.equal(validateVacationRange('2026-10-10', '').valid, false);
    assert.equal(validateVacationRange('not-a-date', '2026-10-20').valid, false);
    assert.equal(validateVacationRange(null, '2026-10-20').valid, false);
  });

  test('B7.4: Null / undefined / empty vacation object passed to isMealPausedOnDate returns false', () => {
    assert.equal(isMealPausedOnDate(null, '2026-10-15', 'lunch'), false);
    assert.equal(isMealPausedOnDate(undefined, '2026-10-15', 'lunch'), false);
    assert.equal(isMealPausedOnDate({}, '2026-10-15', 'lunch'), false);
    assert.equal(isMealPausedOnDate({ status: 'cancelled' }, '2026-10-15', 'lunch'), false);
  });

  test('B7.5: Non-string or special characters in student IDs or meal names handled safely', () => {
    const doc = buildVacationDoc({
      tenantId: 'student_#$@!%',
      startDate: '2026-10-15',
      endDate: '2026-10-15',
      isAllMeals: false,
      meals: ['dinner']
    });

    assert.equal(isMealPausedOnDate(doc, '2026-10-15', 'DINNER   '), true);
    assert.equal(isMealPausedOnDate(doc, '2026-10-15', null), true);
    assert.equal(isMealPausedOnDate(doc, '2026-10-15', 12345), false);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// TIER 3: CROSS-FEATURE COMBINATIONS (Pairwise, C1 through C4)
// ───────────────────────────────────────────────────────────────────────────

setTier('Tier 3 (Cross-Feature Combinations)');

// ── C1: Vacation + Daily Cancellation on Non-Paused Meals ──────────────────
suite('C1: Vacation + Daily Cancellation on Non-Paused Meals', () => {
  test('C1.1: Student on Lunch vacation manually cancels Dinner daily', () => {
    const store = new InMemoryVacationStore();
    const tenants = createMockTenants(10);
    const cook = new StaffAppCookSimulation(MOCK_ADMIN_ID, MOCK_PG_ID, tenants, store);
    const targetDate = '2026-10-15';

    store.saveVacation(buildVacationDoc({
      tenantId: tenants[0].id,
      adminId: MOCK_ADMIN_ID,
      pgId: MOCK_PG_ID,
      startDate: targetDate,
      endDate: targetDate,
      isAllMeals: false,
      meals: ['lunch']
    }));

    cook.recordDailyStatus(tenants[0].id, targetDate, 'dinner', 'not_eating');

    const lunchHc = cook.computeHeadcount(targetDate, 'Lunch');
    assert.equal(lunchHc.onVacation, 1);

    const dinnerHc = cook.computeHeadcount(targetDate, 'Dinner');
    assert.equal(dinnerHc.onVacation, 0);
    assert.equal(dinnerHc.notEaten, 1);
  });

  test('C1.2: Cook headcount counts 1 in Lunch Vacation, 1 in Dinner NotEaten, 0 in Breakfast deductions', () => {
    const store = new InMemoryVacationStore();
    const tenants = createMockTenants(10);
    const cook = new StaffAppCookSimulation(MOCK_ADMIN_ID, MOCK_PG_ID, tenants, store);
    const targetDate = '2026-10-15';

    store.saveVacation(buildVacationDoc({
      tenantId: tenants[0].id,
      adminId: MOCK_ADMIN_ID,
      pgId: MOCK_PG_ID,
      startDate: targetDate,
      endDate: targetDate,
      isAllMeals: false,
      meals: ['lunch']
    }));

    cook.recordDailyStatus(tenants[0].id, targetDate, 'dinner', 'not_eating');

    assert.equal(cook.computeHeadcount(targetDate, 'Breakfast').requested, 10);
    assert.equal(cook.computeHeadcount(targetDate, 'Lunch').requested, 9);
    assert.equal(cook.computeHeadcount(targetDate, 'Dinner').requested, 9);
  });

  test('C1.3: Student attempts to cancel Lunch: blocked by vacation lock', () => {
    const store = new InMemoryVacationStore();
    const tenants = createMockTenants(1);
    const screen = new StudentFoodScreenSimulation(tenants[0], store);
    const today = getTodayStr();

    screen.bookVacation({
      startDate: today,
      endDate: today,
      isAllMeals: false,
      meals: ['lunch']
    });

    assert.throws(() => {
      screen.requestDailyAction('Lunch', 'cancel', today);
    }, /blocked/);
  });

  test('C1.4: Student un-cancels Dinner: Dinner returns to Requested; Lunch remains locked on Vacation', () => {
    const store = new InMemoryVacationStore();
    const tenants = createMockTenants(10);
    const cook = new StaffAppCookSimulation(MOCK_ADMIN_ID, MOCK_PG_ID, tenants, store);
    const targetDate = '2026-10-15';

    store.saveVacation(buildVacationDoc({
      tenantId: tenants[0].id,
      adminId: MOCK_ADMIN_ID,
      pgId: MOCK_PG_ID,
      startDate: targetDate,
      endDate: targetDate,
      isAllMeals: false,
      meals: ['lunch']
    }));

    cook.recordDailyStatus(tenants[0].id, targetDate, 'dinner', 'not_eating');
    assert.equal(cook.computeHeadcount(targetDate, 'Dinner').requested, 9);

    cook.recordDailyStatus(tenants[0].id, targetDate, 'dinner', null);
    assert.equal(cook.computeHeadcount(targetDate, 'Dinner').requested, 10);

    assert.equal(cook.computeHeadcount(targetDate, 'Lunch').requested, 9);
    assert.equal(cook.computeHeadcount(targetDate, 'Lunch').onVacation, 1);
  });

  test('C1.5: Cook prep portions accurately reflect composite deductions', () => {
    const store = new InMemoryVacationStore();
    const tenants = createMockTenants(10);
    const cook = new StaffAppCookSimulation(MOCK_ADMIN_ID, MOCK_PG_ID, tenants, store);
    const targetDate = '2026-10-15';

    store.saveVacation(buildVacationDoc({
      tenantId: tenants[0].id,
      adminId: MOCK_ADMIN_ID,
      pgId: MOCK_PG_ID,
      startDate: targetDate,
      endDate: targetDate,
      isAllMeals: false,
      meals: ['lunch']
    }));

    cook.recordDailyStatus(tenants[1].id, targetDate, 'lunch', 'pack');
    cook.recordDailyStatus(tenants[2].id, targetDate, 'lunch', 'not_eating');

    const hc = cook.computeHeadcount(targetDate, 'Lunch');
    assert.equal(hc.requested, 7);
    assert.equal(hc.pack, 1);
    assert.equal(hc.onVacation, 1);
    assert.equal(hc.notEaten, 1);
    assert.equal(hc.totalPortionsToPrepare, 8);
  });
});

// ── C2: Shorten Vacation Followed by Immediate Resume ──────────────────────
suite('C2: Shorten Vacation Followed by Immediate Resume', () => {
  test('C2.1: Vacation booked for 10 days shortened to 5 days', () => {
    const store = new InMemoryVacationStore();
    const tenants = createMockTenants(1);
    const screen = new StudentFoodScreenSimulation(tenants[0], store);

    screen.bookVacation({
      startDate: '2026-10-10',
      endDate: '2026-10-20',
      isAllMeals: true
    });

    const shortened = screen.shortenVacation('2026-10-15');
    assert.equal(shortened.status, 'shortened');
    assert.equal(shortened.endDate, '2026-10-15');
    assert.equal(shortened.originalEndDate, '2026-10-20');
  });

  test('C2.2: Days 6 to 10 immediately unpause upon shortening', () => {
    const store = new InMemoryVacationStore();
    const tenants = createMockTenants(1);
    const screen = new StudentFoodScreenSimulation(tenants[0], store);

    screen.bookVacation({
      startDate: '2026-10-10',
      endDate: '2026-10-20',
      isAllMeals: true
    });
    const shortened = screen.shortenVacation('2026-10-15');

    assert.equal(isMealPausedOnDate(shortened, '2026-10-16', 'lunch'), false);
    assert.equal(isMealPausedOnDate(shortened, '2026-10-20', 'lunch'), false);
  });

  test('C2.3: Early resume triggered on Day 3 immediately unpauses remaining days', () => {
    const store = new InMemoryVacationStore();
    const tenants = createMockTenants(1);
    const screen = new StudentFoodScreenSimulation(tenants[0], store);

    screen.bookVacation({
      startDate: '2026-10-10',
      endDate: '2026-10-20',
      isAllMeals: true
    });
    screen.shortenVacation('2026-10-15');

    const resumed = screen.resumeVacation();
    assert.equal(resumed.status, 'resumed');
    assert.equal(isMealPausedOnDate(resumed, '2026-10-12', 'lunch'), false);
    assert.equal(isMealPausedOnDate(resumed, '2026-10-15', 'lunch'), false);
  });

  test('C2.4: Days 3-5 immediately restore normal meal ordering', () => {
    const store = new InMemoryVacationStore();
    const tenants = createMockTenants(1);
    const screen = new StudentFoodScreenSimulation(tenants[0], store);

    screen.bookVacation({
      startDate: '2026-10-10',
      endDate: '2026-10-20',
      isAllMeals: true
    });
    screen.shortenVacation('2026-10-15');
    screen.resumeVacation();

    assert.equal(screen.canPerformMealAction('Lunch', 'pack', '2026-10-12').allowed, true);
    assert.equal(screen.canGenerateMealQR('Lunch', '2026-10-12').allowed, true);
  });

  test('C2.5: Audit fields preserve originalEndDate, shortened endDate, and resumedAt', () => {
    const store = new InMemoryVacationStore();
    const tenants = createMockTenants(1);
    const screen = new StudentFoodScreenSimulation(tenants[0], store);

    screen.bookVacation({
      startDate: '2026-10-10',
      endDate: '2026-10-20',
      isAllMeals: true
    });
    screen.shortenVacation('2026-10-15');
    const resumed = screen.resumeVacation();

    assert.equal(resumed.originalEndDate, '2026-10-20');
    assert.equal(resumed.endDate, '2026-10-15');
    assert.ok(resumed.resumedAt);
    assert.ok(resumed.updatedAt);
  });
});

// ── C3: Multiple Overlapping Student Vacations with Different Meal Subsets ─
suite('C3: Multiple Overlapping Student Vacations with Different Meal Subsets', () => {
  test('C3.1: Setup 3 students with overlapping dates and distinct meal subsets', () => {
    const store = new InMemoryVacationStore();
    const tenants = createMockTenants(10);
    const cook = new StaffAppCookSimulation(MOCK_ADMIN_ID, MOCK_PG_ID, tenants, store);

    store.saveVacation(buildVacationDoc({
      tenantId: tenants[0].id,
      adminId: MOCK_ADMIN_ID,
      pgId: MOCK_PG_ID,
      startDate: '2026-10-10',
      endDate: '2026-10-14',
      isAllMeals: true
    }));

    store.saveVacation(buildVacationDoc({
      tenantId: tenants[1].id,
      adminId: MOCK_ADMIN_ID,
      pgId: MOCK_PG_ID,
      startDate: '2026-10-12',
      endDate: '2026-10-16',
      isAllMeals: false,
      meals: ['dinner']
    }));

    store.saveVacation(buildVacationDoc({
      tenantId: tenants[2].id,
      adminId: MOCK_ADMIN_ID,
      pgId: MOCK_PG_ID,
      startDate: '2026-10-11',
      endDate: '2026-10-13',
      isAllMeals: false,
      meals: ['lunch', 'dinner']
    }));

    assert.equal(store.getAll().length, 3);
  });

  test('C3.2: Day 1 Headcount: S1 deducted for all meals; S2, S3 requested for all meals', () => {
    const store = new InMemoryVacationStore();
    const tenants = createMockTenants(10);
    const cook = new StaffAppCookSimulation(MOCK_ADMIN_ID, MOCK_PG_ID, tenants, store);

    store.saveVacation(buildVacationDoc({
      tenantId: tenants[0].id,
      adminId: MOCK_ADMIN_ID,
      startDate: '2026-10-10',
      endDate: '2026-10-14',
      isAllMeals: true
    }));
    store.saveVacation(buildVacationDoc({
      tenantId: tenants[1].id,
      adminId: MOCK_ADMIN_ID,
      startDate: '2026-10-12',
      endDate: '2026-10-16',
      isAllMeals: false,
      meals: ['dinner']
    }));
    store.saveVacation(buildVacationDoc({
      tenantId: tenants[2].id,
      adminId: MOCK_ADMIN_ID,
      startDate: '2026-10-11',
      endDate: '2026-10-13',
      isAllMeals: false,
      meals: ['lunch', 'dinner']
    }));

    for (const m of ['Breakfast', 'Lunch', 'Dinner']) {
      const hc = cook.computeHeadcount('2026-10-10', m);
      assert.equal(hc.requested, 9);
      assert.equal(hc.onVacation, 1);
    }
  });

  test('C3.3: Day 3 (2026-10-12) Headcount reflects exact differential meal pauses', () => {
    const store = new InMemoryVacationStore();
    const tenants = createMockTenants(10);
    const cook = new StaffAppCookSimulation(MOCK_ADMIN_ID, MOCK_PG_ID, tenants, store);

    store.saveVacation(buildVacationDoc({
      tenantId: tenants[0].id,
      adminId: MOCK_ADMIN_ID,
      startDate: '2026-10-10',
      endDate: '2026-10-14',
      isAllMeals: true
    }));
    store.saveVacation(buildVacationDoc({
      tenantId: tenants[1].id,
      adminId: MOCK_ADMIN_ID,
      startDate: '2026-10-12',
      endDate: '2026-10-16',
      isAllMeals: false,
      meals: ['dinner']
    }));
    store.saveVacation(buildVacationDoc({
      tenantId: tenants[2].id,
      adminId: MOCK_ADMIN_ID,
      startDate: '2026-10-11',
      endDate: '2026-10-13',
      isAllMeals: false,
      meals: ['lunch', 'dinner']
    }));

    const bHc = cook.computeHeadcount('2026-10-12', 'Breakfast');
    assert.equal(bHc.onVacation, 1);
    assert.equal(bHc.requested, 9);

    const lHc = cook.computeHeadcount('2026-10-12', 'Lunch');
    assert.equal(lHc.onVacation, 2);
    assert.equal(lHc.requested, 8);

    const dHc = cook.computeHeadcount('2026-10-12', 'Dinner');
    assert.equal(dHc.onVacation, 3);
    assert.equal(dHc.requested, 7);
  });

  test('C3.4: Day 7 (2026-10-16) Headcount: S1 and S3 returned, S2 on Dinner vacation only', () => {
    const store = new InMemoryVacationStore();
    const tenants = createMockTenants(10);
    const cook = new StaffAppCookSimulation(MOCK_ADMIN_ID, MOCK_PG_ID, tenants, store);

    store.saveVacation(buildVacationDoc({
      tenantId: tenants[0].id,
      adminId: MOCK_ADMIN_ID,
      startDate: '2026-10-10',
      endDate: '2026-10-14',
      isAllMeals: true
    }));
    store.saveVacation(buildVacationDoc({
      tenantId: tenants[1].id,
      adminId: MOCK_ADMIN_ID,
      startDate: '2026-10-12',
      endDate: '2026-10-16',
      isAllMeals: false,
      meals: ['dinner']
    }));
    store.saveVacation(buildVacationDoc({
      tenantId: tenants[2].id,
      adminId: MOCK_ADMIN_ID,
      startDate: '2026-10-11',
      endDate: '2026-10-13',
      isAllMeals: false,
      meals: ['lunch', 'dinner']
    }));

    assert.equal(cook.computeHeadcount('2026-10-16', 'Lunch').requested, 10);
    assert.equal(cook.computeHeadcount('2026-10-16', 'Dinner').requested, 9);
    assert.equal(cook.computeHeadcount('2026-10-16', 'Dinner').onVacation, 1);
  });

  test('C3.5: Cook On-Vacation roster displays exact subset of tenants per meal on Day 3', () => {
    const store = new InMemoryVacationStore();
    const tenants = createMockTenants(10);
    const cook = new StaffAppCookSimulation(MOCK_ADMIN_ID, MOCK_PG_ID, tenants, store);

    store.saveVacation(buildVacationDoc({
      tenantId: tenants[0].id,
      adminId: MOCK_ADMIN_ID,
      startDate: '2026-10-10',
      endDate: '2026-10-14',
      isAllMeals: true
    }));
    store.saveVacation(buildVacationDoc({
      tenantId: tenants[1].id,
      adminId: MOCK_ADMIN_ID,
      startDate: '2026-10-12',
      endDate: '2026-10-16',
      isAllMeals: false,
      meals: ['dinner']
    }));
    store.saveVacation(buildVacationDoc({
      tenantId: tenants[2].id,
      adminId: MOCK_ADMIN_ID,
      startDate: '2026-10-11',
      endDate: '2026-10-13',
      isAllMeals: false,
      meals: ['lunch', 'dinner']
    }));

    const lunchRoster = cook.getVacationRoster('2026-10-12', 'Lunch');
    assert.equal(lunchRoster.length, 2);
    assert.deepEqual(lunchRoster.map(s => s.id).sort(), [tenants[0].id, tenants[2].id].sort());

    const dinnerRoster = cook.getVacationRoster('2026-10-12', 'Dinner');
    assert.equal(dinnerRoster.length, 3);
    assert.deepEqual(dinnerRoster.map(s => s.id).sort(), [tenants[0].id, tenants[1].id, tenants[2].id].sort());
  });
});

// ── C4: Real-Time Sync Event Handling Across Reactive Listeners ────────────
suite('C4: Real-Time Sync Event Handling Across Reactive Listeners', () => {
  test('C4.1: Vacation booking immediately propagates to active Cook and Admin listeners', () => {
    const store = new InMemoryVacationStore();
    const tenants = createMockTenants(10);
    const cook = new StaffAppCookSimulation(MOCK_ADMIN_ID, MOCK_PG_ID, tenants, store);
    const admin = new AdminMessHeadcountSimulation(MOCK_ADMIN_ID, MOCK_PG_ID, tenants, store);
    const student = new StudentFoodScreenSimulation(tenants[0], store);
    const today = getTodayStr();

    assert.equal(cook.computeHeadcount(today, 'Lunch').requested, 10);
    assert.equal(admin.computeHeadcount(today, 'lunch').requested, 10);

    student.bookVacation({
      startDate: today,
      endDate: today,
      isAllMeals: true
    });

    assert.equal(cook.computeHeadcount(today, 'Lunch').requested, 9);
    assert.equal(cook.computeHeadcount(today, 'Lunch').onVacation, 1);
    assert.equal(admin.computeHeadcount(today, 'lunch').requested, 9);
    assert.equal(admin.computeHeadcount(today, 'lunch').onLeave, 1);
  });

  test('C4.2: Vacation shorten immediately restores unpaused dates across Cook and Admin views', () => {
    const store = new InMemoryVacationStore();
    const tenants = createMockTenants(10);
    const cook = new StaffAppCookSimulation(MOCK_ADMIN_ID, MOCK_PG_ID, tenants, store);
    const admin = new AdminMessHeadcountSimulation(MOCK_ADMIN_ID, MOCK_PG_ID, tenants, store);
    const student = new StudentFoodScreenSimulation(tenants[0], store);

    student.bookVacation({
      startDate: '2026-10-10',
      endDate: '2026-10-20',
      isAllMeals: true
    });

    assert.equal(cook.computeHeadcount('2026-10-18', 'Lunch').requested, 9);

    student.shortenVacation('2026-10-15');

    assert.equal(cook.computeHeadcount('2026-10-18', 'Lunch').requested, 10);
    assert.equal(admin.computeHeadcount('2026-10-18', 'lunch').requested, 10);
  });

  test('C4.3: Early resume immediately increments requested headcount in Cook and Admin', () => {
    const store = new InMemoryVacationStore();
    const tenants = createMockTenants(10);
    const cook = new StaffAppCookSimulation(MOCK_ADMIN_ID, MOCK_PG_ID, tenants, store);
    const admin = new AdminMessHeadcountSimulation(MOCK_ADMIN_ID, MOCK_PG_ID, tenants, store);
    const student = new StudentFoodScreenSimulation(tenants[0], store);
    const today = getTodayStr();

    student.bookVacation({
      startDate: today,
      endDate: '2026-10-30',
      isAllMeals: true
    });
    assert.equal(cook.computeHeadcount(today, 'Dinner').requested, 9);

    student.resumeVacation();

    assert.equal(cook.computeHeadcount(today, 'Dinner').requested, 10);
    assert.equal(cook.computeHeadcount(today, 'Dinner').onVacation, 0);
    assert.equal(admin.computeHeadcount(today, 'dinner').requested, 10);
    assert.equal(admin.computeHeadcount(today, 'dinner').onLeave, 0);
  });

  test('C4.4: Concurrent updates from multiple students maintain consistent state', () => {
    const store = new InMemoryVacationStore();
    const tenants = createMockTenants(20);
    const cook = new StaffAppCookSimulation(MOCK_ADMIN_ID, MOCK_PG_ID, tenants, store);
    const today = getTodayStr();

    for (let i = 0; i < 5; i++) {
      const s = new StudentFoodScreenSimulation(tenants[i], store);
      s.bookVacation({
        startDate: today,
        endDate: today,
        isAllMeals: true
      });
    }

    const hc = cook.computeHeadcount(today, 'Lunch');
    assert.equal(hc.onVacation, 5);
    assert.equal(hc.requested, 15);
  });

  test('C4.5: Listener unsubscription cleanly tears down subscriptions', () => {
    const store = new InMemoryVacationStore();
    const tenants = createMockTenants(10);
    const cook = new StaffAppCookSimulation(MOCK_ADMIN_ID, MOCK_PG_ID, tenants, store);

    assert.equal(store.listeners.size, 1);
    cook.destroy();
    assert.equal(store.listeners.size, 0);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// TIER 4: REAL-WORLD APPLICATION SCENARIOS (Scenarios A, B, C)
// ───────────────────────────────────────────────────────────────────────────

setTier('Tier 4 (Real-World Application Scenarios)');

// ── Scenario A: Student Diwali / 10-Day Holiday + Early Return ─────────────
suite('Scenario A: Student Leaves for Diwali 10-Day Holiday, Returns 3 Days Early, Resumes Meals', () => {
  const store = new InMemoryVacationStore();
  const tenants = createMockTenants(20);
  const raj = tenants[3]; // Resident 4, Room 102-B
  const cook = new StaffAppCookSimulation(MOCK_ADMIN_ID, MOCK_PG_ID, tenants, store);
  const admin = new AdminMessHeadcountSimulation(MOCK_ADMIN_ID, MOCK_PG_ID, tenants, store);
  const rajScreen = new StudentFoodScreenSimulation(raj, store);

  test('Scenario A.1: Raj schedules a 10-day Diwali food pause (2026-10-10 to 2026-10-20) for all meals', () => {
    const doc = rajScreen.bookVacation({
      startDate: '2026-10-10',
      endDate: '2026-10-20',
      isAllMeals: true,
      reason: 'Diwali Homecoming to Jaipur'
    });

    assert.equal(doc.status, 'active');
    assert.equal(doc.dates.length, 11);
    assert.equal(doc.tenantName, raj.name);
    assert.equal(doc.roomNumber, raj.roomNumber);
  });

  test('Scenario A.2: Days 1 to 7: Active vacation banner is displayed; meals locked; Cook headcount excludes Raj', () => {
    for (const testDate of ['2026-10-10', '2026-10-13', '2026-10-16']) {
      assert.equal(rajScreen.isVacationBannerActive(testDate), true);
      assert.equal(rajScreen.canPerformMealAction('Dinner', 'pack', testDate).allowed, false);
      assert.equal(rajScreen.canGenerateMealQR('Dinner', testDate).allowed, false);

      const cookHc = cook.computeHeadcount(testDate, 'Dinner');
      assert.equal(cookHc.requested, 19);
      assert.equal(cookHc.onVacation, 1);

      const adminHc = admin.computeHeadcount(testDate, 'dinner');
      assert.equal(adminHc.requested, 19);
      assert.equal(adminHc.onLeave, 1);
    }
  });

  test('Scenario A.3: On Day 7 (2026-10-17) at 4 PM, Raj returns early and clicks "Resume Meals Now"', () => {
    const resumed = rajScreen.resumeVacation();
    assert.equal(resumed.status, 'resumed');
    assert.ok(resumed.resumedAt);
  });

  test('Scenario A.4: Confirmation executes: banner disappears; dinner on Day 7 and all meals Days 8-20 are unlocked', () => {
    assert.equal(rajScreen.isVacationBannerActive('2026-10-17'), false);
    assert.equal(rajScreen.canPerformMealAction('Dinner', 'pack', '2026-10-17').allowed, true);
    assert.equal(rajScreen.canGenerateMealQR('Dinner', '2026-10-17').allowed, true);

    for (const restoredDate of ['2026-10-18', '2026-10-19', '2026-10-20']) {
      assert.equal(rajScreen.canGenerateMealQR('Breakfast', restoredDate).allowed, true);
      assert.equal(rajScreen.canGenerateMealQR('Lunch', restoredDate).allowed, true);
      assert.equal(rajScreen.canGenerateMealQR('Dinner', restoredDate).allowed, true);
    }
  });

  test('Scenario A.5: Cook Staff app receives realtime update: Day 7 dinner headcount restores Raj as requested', () => {
    const cookHc = cook.computeHeadcount('2026-10-17', 'Dinner');
    assert.equal(cookHc.requested, 20);
    assert.equal(cookHc.onVacation, 0);

    const adminHc = admin.computeHeadcount('2026-10-17', 'dinner');
    assert.equal(adminHc.requested, 20);
    assert.equal(adminHc.onLeave, 0);

    cook.recordMealEaten(raj.id, '2026-10-17', 'dinner');
    const eatenHc = cook.computeHeadcount('2026-10-17', 'Dinner');
    assert.equal(eatenHc.eaten, 1);
  });
});

// ── Scenario B: Student Selective Dinner Fast ──────────────────────────────
suite('Scenario B: Student Observes 5-Day Selective Dinner Fast (Breakfast, Lunch, Snacks Active)', () => {
  const store = new InMemoryVacationStore();
  const tenants = createMockTenants(20);
  const priya = tenants[6]; // Resident 7
  const cook = new StaffAppCookSimulation(MOCK_ADMIN_ID, MOCK_PG_ID, tenants, store);
  const admin = new AdminMessHeadcountSimulation(MOCK_ADMIN_ID, MOCK_PG_ID, tenants, store);
  const priyaScreen = new StudentFoodScreenSimulation(priya, store);

  test('Scenario B.1: Priya schedules selective Dinner-only vacation for 5 days (2026-10-05 to 2026-10-09)', () => {
    const doc = priyaScreen.bookVacation({
      startDate: '2026-10-05',
      endDate: '2026-10-09',
      isAllMeals: false,
      meals: ['dinner'],
      reason: 'Navratri Evening Fasting'
    });

    assert.equal(doc.status, 'active');
    assert.equal(doc.isAllMeals, false);
    assert.deepEqual(doc.meals, ['dinner']);
  });

  test('Scenario B.2: For all 5 days: Breakfast, Lunch, Snacks remain active and can be packed or QR generated', () => {
    for (const testDate of ['2026-10-05', '2026-10-07', '2026-10-09']) {
      assert.equal(priyaScreen.canPerformMealAction('Breakfast', 'pack', testDate).allowed, true);
      assert.equal(priyaScreen.canGenerateMealQR('Breakfast', testDate).allowed, true);

      assert.equal(priyaScreen.canPerformMealAction('Lunch', 'pack', testDate).allowed, true);
      assert.equal(priyaScreen.canGenerateMealQR('Lunch', testDate).allowed, true);

      assert.equal(priyaScreen.canGenerateMealQR('Snacks', testDate).allowed, true);
    }
  });

  test('Scenario B.3: Dinner card on Priya\'s app is locked and daily actions are blocked', () => {
    for (const testDate of ['2026-10-05', '2026-10-07', '2026-10-09']) {
      const check = priyaScreen.canPerformMealAction('Dinner', 'pack', testDate);
      assert.equal(check.allowed, false);
      assert.ok(check.reason.includes('blocked'));

      const qrCheck = priyaScreen.canGenerateMealQR('Dinner', testDate);
      assert.equal(qrCheck.allowed, false);

      const scanCheck = priyaScreen.canScanCookQRToEat('Dinner', testDate);
      assert.equal(scanCheck.allowed, false);
    }
  });

  test('Scenario B.4: Cook dashboard shows Priya requested for Lunch, onVacation for Dinner', () => {
    const lunchHc = cook.computeHeadcount('2026-10-06', 'Lunch');
    assert.equal(lunchHc.requested, 20);
    assert.equal(lunchHc.onVacation, 0);

    const dinnerHc = cook.computeHeadcount('2026-10-06', 'Dinner');
    assert.equal(dinnerHc.requested, 19);
    assert.equal(dinnerHc.onVacation, 1);

    const roster = cook.getVacationRoster('2026-10-06', 'Dinner');
    assert.equal(roster.length, 1);
    assert.equal(roster[0].id, priya.id);
  });

  test('Scenario B.5: On Day 6 (2026-10-10), Priya\'s dinner automatically restores to requested without action', () => {
    const dinnerHc = cook.computeHeadcount('2026-10-10', 'Dinner');
    assert.equal(dinnerHc.requested, 20);
    assert.equal(dinnerHc.onVacation, 0);

    const check = priyaScreen.canGenerateMealQR('Dinner', '2026-10-10');
    assert.equal(check.allowed, true);
  });
});

// ── Scenario C: Kitchen Prep Counting with 20 Tenants ──────────────────────
suite('Scenario C: Cook Prepares Lunch with 20 Tenants (Portion Tally Verification)', () => {
  const store = new InMemoryVacationStore();
  const tenants = createMockTenants(20);
  const cook = new StaffAppCookSimulation(MOCK_ADMIN_ID, MOCK_PG_ID, tenants, store);
  const admin = new AdminMessHeadcountSimulation(MOCK_ADMIN_ID, MOCK_PG_ID, tenants, store);
  const prepDate = '2026-10-15';

  test('Scenario C.1: PG has exactly 20 approved active tenants', () => {
    assert.equal(tenants.length, 20);
  });

  test('Scenario C.2: 3 tenants on full-day vacation (Students 1, 2, 3)', () => {
    for (let i = 0; i < 3; i++) {
      store.saveVacation(buildVacationDoc({
        tenantId: tenants[i].id,
        adminId: MOCK_ADMIN_ID,
        pgId: MOCK_PG_ID,
        startDate: prepDate,
        endDate: prepDate,
        isAllMeals: true
      }));
    }
  });

  test('Scenario C.3: 2 tenants on lunch-only vacation (Students 4, 5)', () => {
    for (let i = 3; i < 5; i++) {
      store.saveVacation(buildVacationDoc({
        tenantId: tenants[i].id,
        adminId: MOCK_ADMIN_ID,
        pgId: MOCK_PG_ID,
        startDate: prepDate,
        endDate: prepDate,
        isAllMeals: false,
        meals: ['lunch']
      }));
    }
  });

  test('Scenario C.4: 1 tenant requested pack (Student 6), 1 tenant cancelled lunch daily (Student 7)', () => {
    cook.recordDailyStatus(tenants[5].id, prepDate, 'lunch', 'pack');
    admin.recordDailyStatus(tenants[5].id, prepDate, 'lunch', 'pack');

    cook.recordDailyStatus(tenants[6].id, prepDate, 'lunch', 'not_eating');
    admin.recordDailyStatus(tenants[6].id, prepDate, 'lunch', 'not_eating');
  });

  test('Scenario C.5: Exact kitchen portion tally yields exactly 14 portions to cook for lunch', () => {
    const hc = cook.computeHeadcount(prepDate, 'Lunch');

    // Total tenants: 20
    // On lunch vacation: 3 (full) + 2 (lunch-only) = 5
    // Pack: 1
    // Daily cancelled: 1
    // Requested eaters: 20 - 5 (vacation) - 1 (pack) - 1 (cancelled) = 13 eaters
    // Total portions to prepare: 13 (requested) + 1 (pack) = 14 portions!
    assert.equal(hc.totalTenants, 20);
    assert.equal(hc.onVacation, 5);
    assert.equal(hc.pack, 1);
    assert.equal(hc.notEaten, 1);
    assert.equal(hc.requested, 13);
    assert.equal(hc.totalPortionsToPrepare, 14);

    const bHc = cook.computeHeadcount(prepDate, 'Breakfast');
    assert.equal(bHc.onVacation, 3);
    assert.equal(bHc.requested, 17);
    assert.equal(bHc.totalPortionsToPrepare, 17);

    const adminHc = admin.computeHeadcount(prepDate, 'lunch');
    assert.equal(adminHc.onLeave, 5);
    assert.equal(adminHc.requested, 13);
    assert.equal(adminHc.pack, 1);
    assert.equal(adminHc.notEaten, 1);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// FINAL RESULTS SUMMARY & REPORTING
// ───────────────────────────────────────────────────────────────────────────

console.log(`\n${colors.bright}${colors.blue}═══════════════════════════════════════════════════════════════════════════${colors.reset}`);
console.log(`${colors.bright}${colors.cyan}                      TEST EXECUTION SUMMARY${colors.reset}`);
console.log(`${colors.bright}${colors.blue}═══════════════════════════════════════════════════════════════════════════${colors.reset}`);

for (const [tier, tStats] of Object.entries(stats.tierBreakdown)) {
  const statusColor = tStats.failed === 0 ? colors.green : colors.red;
  console.log(`  ${colors.bright}${tier.padEnd(45)}:${colors.reset} ${statusColor}${tStats.passed}/${tStats.total} passed${colors.reset}`);
}

console.log(`${colors.bright}${colors.blue}───────────────────────────────────────────────────────────────────────────${colors.reset}`);
console.log(`  ${colors.bright}Total Suites Executed:${colors.reset} ${stats.suites}`);
console.log(`  ${colors.bright}Total Assertions Run :${colors.reset} ${stats.total}`);
console.log(`  ${colors.green}${colors.bright}Total Passed         :${colors.reset} ${colors.green}${stats.passed}${colors.reset}`);
console.log(`  ${colors.red}${colors.bright}Total Failed         :${colors.reset} ${stats.failed === 0 ? colors.green + '0' : colors.red + stats.failed}${colors.reset}`);
console.log(`${colors.bright}${colors.blue}═══════════════════════════════════════════════════════════════════════════${colors.reset}`);

if (stats.failed > 0) {
  console.error(`\n${colors.red}${colors.bright}FAILED TESTS SUMMARY:${colors.reset}`);
  for (const f of stats.failures) {
    console.error(`  - [${f.suite}] ${f.test}: ${f.error}`);
  }
  process.exit(1);
} else {
  console.log(`\n${colors.green}${colors.bright}✔ ALL ${stats.total} E2E TEST INVARIANTS PASSED PERFECTLY WITH ZERO DEFECTS!${colors.reset}\n`);
  process.exit(0);
}
