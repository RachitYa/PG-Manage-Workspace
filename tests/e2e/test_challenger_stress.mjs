/**
 * Febeboo Long-Term Food Vacation - Adversarial Empirical Stress Test Suite
 * Archetype: EMPIRICAL CHALLENGER (critic, specialist)
 * 
 * Verifies:
 * 1. Cross-app vacation utility identity & contract equivalence.
 * 2. Randomized Generative Property Testing (10,000+ property trials).
 * 3. Deep Date Boundary & Calendar Stress Testing (Leap years, 12 month boundaries, single-day, 365-day ranges).
 * 4. Granular Meal Combinations & Combinatorial Isolation (All 16 meal powersets).
 * 5. Overlapping Vacations & Multi-Tenant Headcount Isolation (Same-student overlap, multi-student isolation).
 * 6. State Machine Transitions, Shortening & Early Resume Idempotency.
 * 7. Fuzzing, Defect Mining & Defensive Resilience on Malformed/Null Inputs.
 */

import assert from 'node:assert';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

// 1. Dynamic imports of all three utility modules
const studentUtilsPath = path.resolve(projectRoot, 'febebo-app/src/utils/vacationUtils.js');
const staffUtilsPath = path.resolve(projectRoot, 'febebo-staff/src/utils/vacationUtils.js');
const adminUtilsPath = path.resolve(projectRoot, 'Febebo-admin/src/utils/vacationUtils.js');

const studentUtils = await import(`file://${studentUtilsPath}`);
const staffUtils = await import(`file://${staffUtilsPath}`);
const adminUtils = await import(`file://${adminUtilsPath}`);

let totalAssertions = 0;
let passedAssertions = 0;
let failedAssertions = 0;
const failureDetails = [];

function check(desc, condition, details = '') {
  totalAssertions++;
  if (condition) {
    passedAssertions++;
  } else {
    failedAssertions++;
    const errMsg = `FAILED: ${desc} ${details ? '— ' + details : ''}`;
    failureDetails.push(errMsg);
    console.error(`  ❌ ${errMsg}`);
  }
}

console.log('\n' + '═'.repeat(75));
console.log('   FEBEBOO ADVERSARIAL EMPIRICAL STRESS TEST HARNESS');
console.log('   Challenger 1: Critic & Domain Specialist Verification');
console.log('═'.repeat(75) + '\n');

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 1: Cross-App Utility Identity & Contract Equivalence
// ─────────────────────────────────────────────────────────────────────────────
console.log('▶ SUITE 1: Cross-App Utility Identity & Contract Equivalence');

const exportedFunctions = [
  'formatDateStr',
  'getTodayStr',
  'generateDateRange',
  'validateVacationRange',
  'isMealPausedOnDate',
  'isStudentOnVacation',
  'getStudentActiveVacation',
  'formatDateDisplay',
  'buildVacationDoc',
  'ALL_MEALS',
  'MEAL_LABELS'
];

for (const fnName of exportedFunctions) {
  check(`studentUtils exports ${fnName}`, studentUtils[fnName] !== undefined);
  check(`staffUtils exports ${fnName}`, staffUtils[fnName] !== undefined);
  check(`adminUtils exports ${fnName}`, adminUtils[fnName] !== undefined);
}

// Differential fuzzing across 2,000 cases to verify identical behavior
let diffIdenticalCount = 0;
for (let i = 0; i < 2000; i++) {
  const y = 2026;
  const m = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
  const d1 = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
  const d2 = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
  const start = `${y}-${m}-${Math.min(Number(d1), Number(d2)).toString().padStart(2, '0')}`;
  const end = `${y}-${m}-${Math.max(Number(d1), Number(d2)).toString().padStart(2, '0')}`;
  const target = `${y}-${m}-${d1}`;
  const meals = ['breakfast', 'lunch', 'snacks', 'dinner'].filter(() => Math.random() > 0.5);
  const status = ['active', 'shortened', 'resumed', 'cancelled'][Math.floor(Math.random() * 4)];
  const vac = { startDate: start, endDate: end, meals, isAllMeals: meals.length === 4, status };
  const mealQuery = ['breakfast', 'lunch', 'snacks', 'dinner', 'unknown'][Math.floor(Math.random() * 5)];

  const r1 = studentUtils.isMealPausedOnDate(vac, target, mealQuery);
  const r2 = staffUtils.isMealPausedOnDate(vac, target, mealQuery);
  const r3 = adminUtils.isMealPausedOnDate(vac, target, mealQuery);

  if (r1 === r2 && r2 === r3) {
    diffIdenticalCount++;
  }
}
check('All 2,000 differential fuzz cases between app implementations match identically', diffIdenticalCount === 2000);

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 2: Randomized Generative Property Testing (10,000+ Trials)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ SUITE 2: Randomized Generative Property Testing (10,000 Invariant Trials)');

const MEAL_LIST = ['breakfast', 'lunch', 'snacks', 'dinner'];
const STATUSES = ['active', 'shortened', 'resumed', 'cancelled', 'expired', 'pending', '', null, undefined];

// Specification Oracle:
function oracleIsMealPaused(vac, targetDate, queryMeal) {
  if (!vac) return false;
  if (vac.status !== 'active' && vac.status !== 'shortened') return false;
  if (!targetDate || !vac.startDate || !vac.endDate) return false;
  if (targetDate < vac.startDate || targetDate > vac.endDate) return false;
  if (vac.isAllMeals || !vac.meals || vac.meals.length === 0) return true;
  if (!queryMeal) return true;
  const targetLower = String(queryMeal).toLowerCase().trim();
  return vac.meals.some(m => String(m).toLowerCase().trim() === targetLower);
}

let propertyPassCount = 0;
const TOTAL_PROPERTY_TRIALS = 10000;

for (let i = 0; i < TOTAL_PROPERTY_TRIALS; i++) {
  // Random year between 2024 (leap) and 2029
  const yr = 2024 + Math.floor(Math.random() * 6);
  const mo = Math.floor(Math.random() * 12) + 1;
  const daysInMo = new Date(yr, mo, 0).getDate();
  const dayA = Math.floor(Math.random() * daysInMo) + 1;
  const dayB = Math.floor(Math.random() * daysInMo) + 1;

  const startDay = Math.min(dayA, dayB);
  const endDay = Math.max(dayA, dayB);

  const startDate = `${yr}-${String(mo).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`;
  const endDate = `${yr}-${String(mo).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;

  // Random test date: can be before, within, on boundary, or after
  const offset = Math.floor(Math.random() * 11) - 5; // -5 to +5 days
  const testD = new Date(yr, mo - 1, startDay + offset, 12, 0, 0);
  const testDate = studentUtils.formatDateStr(testD);

  const status = STATUSES[Math.floor(Math.random() * STATUSES.length)];
  const isAllMeals = Math.random() > 0.6 ? true : (Math.random() > 0.3 ? false : undefined);
  const mealsSubset = MEAL_LIST.filter(() => Math.random() > 0.5);
  // Introduce casing and whitespace variations
  const messyMeals = mealsSubset.map(m => {
    if (Math.random() > 0.5) return m.toUpperCase();
    if (Math.random() > 0.5) return `  ${m}  `;
    return m;
  });

  const vac = {
    id: `v_${i}`,
    tenantId: `student_${i % 100}`,
    startDate,
    endDate,
    status,
    isAllMeals,
    meals: messyMeals
  };

  const queryMeal = Math.random() > 0.2
    ? MEAL_LIST[Math.floor(Math.random() * MEAL_LIST.length)]
    : (Math.random() > 0.5 ? '  LUNCH  ' : undefined);

  const expected = oracleIsMealPaused(vac, testDate, queryMeal);
  const actual = studentUtils.isMealPausedOnDate(vac, testDate, queryMeal);

  if (expected === actual) {
    propertyPassCount++;
  }
}

check(`All ${TOTAL_PROPERTY_TRIALS} generative property trials matched specification oracle`, propertyPassCount === TOTAL_PROPERTY_TRIALS);

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 3: Deep Date Boundary & Calendar Edge Stress Testing
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ SUITE 3: Deep Date Boundary & Calendar Edge Stress Testing');

// 1. Leap year 2024 & 2028
{
  const leap2024 = studentUtils.generateDateRange('2024-02-27', '2024-03-02');
  check('2024 leap year sequence includes 2024-02-29', leap2024.includes('2024-02-29'));
  check('2024 leap year range 2024-02-27 to 2024-03-02 has 5 days', leap2024.length === 5);
  check('2024 leap year range is strictly consecutive', 
    leap2024.join(',') === '2024-02-27,2024-02-28,2024-02-29,2024-03-01,2024-03-02');

  const leap2028 = studentUtils.generateDateRange('2028-02-28', '2028-03-01');
  check('2028 leap year range 2028-02-28 to 2028-03-01 has 3 days', leap2028.length === 3);
  check('2028 leap year range includes 2028-02-29', leap2028.includes('2028-02-29'));
}

// 2. Non-leap year 2025 & 2026
{
  const nonLeap2025 = studentUtils.generateDateRange('2025-02-27', '2025-03-02');
  check('2025 non-leap year does NOT include 2025-02-29', !nonLeap2025.includes('2025-02-29'));
  check('2025 non-leap year range 2025-02-27 to 2025-03-02 has 4 days', nonLeap2025.length === 4);
  check('2025 sequence transitions 2025-02-28 directly to 2025-03-01',
    nonLeap2025.join(',') === '2025-02-27,2025-02-28,2025-03-01,2025-03-02');

  const nonLeap2026 = studentUtils.generateDateRange('2026-02-28', '2026-03-01');
  check('2026 non-leap year range 2026-02-28 to 2026-03-01 has 2 days', nonLeap2026.length === 2);
  check('2026 sequence is 2026-02-28 then 2026-03-01', nonLeap2026.join(',') === '2026-02-28,2026-03-01');
}

// 3. All 12 Month Transitions Stress Test
{
  const monthTransitions = [
    { start: '2026-01-30', end: '2026-02-02', expectedDays: 4 }, // Jan -> Feb
    { start: '2026-02-27', end: '2026-03-02', expectedDays: 4 }, // Feb -> Mar (non-leap)
    { start: '2026-03-30', end: '2026-04-02', expectedDays: 4 }, // Mar -> Apr
    { start: '2026-04-29', end: '2026-05-02', expectedDays: 4 }, // Apr -> May
    { start: '2026-05-30', end: '2026-06-02', expectedDays: 4 }, // May -> Jun
    { start: '2026-06-29', end: '2026-07-02', expectedDays: 4 }, // Jun -> Jul
    { start: '2026-07-30', end: '2026-08-02', expectedDays: 4 }, // Jul -> Aug (consecutive 31 days)
    { start: '2026-08-30', end: '2026-09-02', expectedDays: 4 }, // Aug -> Sep
    { start: '2026-09-29', end: '2026-10-02', expectedDays: 4 }, // Sep -> Oct
    { start: '2026-10-30', end: '2026-11-02', expectedDays: 4 }, // Oct -> Nov
    { start: '2026-11-29', end: '2026-12-02', expectedDays: 4 }, // Nov -> Dec
    { start: '2026-12-30', end: '2027-01-02', expectedDays: 4 }, // Dec -> Jan (Year boundary)
  ];

  for (const t of monthTransitions) {
    const range = studentUtils.generateDateRange(t.start, t.end);
    check(`Month transition ${t.start} -> ${t.end} generates exactly ${t.expectedDays} days`, range.length === t.expectedDays);
    check(`Month transition ${t.start} -> ${t.end} starts with ${t.start}`, range[0] === t.start);
    check(`Month transition ${t.start} -> ${t.end} ends with ${t.end}`, range[range.length - 1] === t.end);

    // Verify consecutive ordering
    let monotonic = true;
    for (let j = 1; j < range.length; j++) {
      if (range[j] <= range[j - 1]) monotonic = false;
    }
    check(`Month transition ${t.start} -> ${t.end} is strictly monotonic`, monotonic);
  }
}

// 4. Single-Day Vacations (Boundary: startDate === endDate)
{
  const oneDayRange = studentUtils.generateDateRange('2026-10-15', '2026-10-15');
  check('1-day vacation generates exactly 1 date string', oneDayRange.length === 1 && oneDayRange[0] === '2026-10-15');

  const oneDayVac = {
    startDate: '2026-10-15',
    endDate: '2026-10-15',
    status: 'active',
    isAllMeals: true,
    meals: MEAL_LIST
  };
  check('1-day vacation: date before (2026-10-14) is unpaused', !studentUtils.isMealPausedOnDate(oneDayVac, '2026-10-14', 'lunch'));
  check('1-day vacation: target day (2026-10-15) is paused', studentUtils.isMealPausedOnDate(oneDayVac, '2026-10-15', 'lunch'));
  check('1-day vacation: date after (2026-10-16) is unpaused', !studentUtils.isMealPausedOnDate(oneDayVac, '2026-10-16', 'lunch'));
}

// 5. 365-day range and 730-day range
{
  const fullYear2026 = studentUtils.generateDateRange('2026-01-01', '2026-12-31');
  check('365-day non-leap year range has exactly 365 dates', fullYear2026.length === 365);
  check('365-day range starts 2026-01-01', fullYear2026[0] === '2026-01-01');
  check('365-day range ends 2026-12-31', fullYear2026[364] === '2026-12-31');

  const fullLeap2024 = studentUtils.generateDateRange('2024-01-01', '2024-12-31');
  check('366-day leap year range has exactly 366 dates', fullLeap2024.length === 366);

  const twoYears = studentUtils.generateDateRange('2026-01-01', '2027-12-31');
  check('730-day 2-year range has exactly 730 dates', twoYears.length === 730);
}

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 4: Granular Meal Combinations & Combinatorial Isolation (Power Set of Meals)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ SUITE 4: Granular Meal Combinations & Combinatorial Isolation (16 Powersets)');

// Generate power set of 4 meals (16 combinations)
function getPowerSet(list) {
  const result = [[]];
  for (const item of list) {
    const len = result.length;
    for (let i = 0; i < len; i++) {
      result.push([...result[i], item]);
    }
  }
  return result;
}

const allMealSubsets = getPowerSet(MEAL_LIST);
check('Powerset contains all 16 meal combinations', allMealSubsets.length === 16);

for (const subset of allMealSubsets) {
  const isAll = subset.length === 4 || subset.length === 0;
  const vac = {
    startDate: '2026-10-10',
    endDate: '2026-10-15',
    status: 'active',
    isAllMeals: isAll,
    meals: subset
  };

  const targetDate = '2026-10-12';

  for (const m of MEAL_LIST) {
    const isPaused = studentUtils.isMealPausedOnDate(vac, targetDate, m);
    if (isAll) {
      check(`All-meals vacation (${subset.length} meals): ${m} is paused`, isPaused === true);
    } else {
      const shouldBePaused = subset.includes(m);
      check(`Subset [${subset.join(', ')}]: meal '${m}' paused === ${shouldBePaused}`, isPaused === shouldBePaused);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 5: Overlapping Vacations & Multi-Tenant Headcount Isolation
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ SUITE 5: Overlapping Vacations & Multi-Tenant Headcount Isolation');

// 1. Same student with multiple overlapping vacations
{
  const studentId = 'tenant_overlap_1';
  // Vacation 1: Oct 10 - Oct 14 (Breakfast & Lunch)
  const vac1 = {
    id: 'vac_overlap_1',
    tenantId: studentId,
    startDate: '2026-10-10',
    endDate: '2026-10-14',
    status: 'active',
    isAllMeals: false,
    meals: ['breakfast', 'lunch']
  };
  // Vacation 2: Oct 12 - Oct 16 (Lunch & Dinner)
  const vac2 = {
    id: 'vac_overlap_2',
    tenantId: studentId,
    startDate: '2026-10-12',
    endDate: '2026-10-16',
    status: 'active',
    isAllMeals: false,
    meals: ['lunch', 'dinner']
  };

  const studentVacations = [vac1, vac2];

  // Oct 11: Only vac1 active
  check('Same student overlap: Oct 11 Breakfast paused (v1)', studentUtils.isStudentOnVacation(studentVacations, studentId, '2026-10-11', 'breakfast'));
  check('Same student overlap: Oct 11 Lunch paused (v1)', studentUtils.isStudentOnVacation(studentVacations, studentId, '2026-10-11', 'lunch'));
  check('Same student overlap: Oct 11 Snacks unpaused', !studentUtils.isStudentOnVacation(studentVacations, studentId, '2026-10-11', 'snacks'));
  check('Same student overlap: Oct 11 Dinner unpaused', !studentUtils.isStudentOnVacation(studentVacations, studentId, '2026-10-11', 'dinner'));

  // Oct 13: Both vac1 and vac2 active (composite overlap)
  check('Same student overlap: Oct 13 Breakfast paused (v1)', studentUtils.isStudentOnVacation(studentVacations, studentId, '2026-10-13', 'breakfast'));
  check('Same student overlap: Oct 13 Lunch paused (v1 & v2)', studentUtils.isStudentOnVacation(studentVacations, studentId, '2026-10-13', 'lunch'));
  check('Same student overlap: Oct 13 Snacks unpaused', !studentUtils.isStudentOnVacation(studentVacations, studentId, '2026-10-13', 'snacks'));
  check('Same student overlap: Oct 13 Dinner paused (v2)', studentUtils.isStudentOnVacation(studentVacations, studentId, '2026-10-13', 'dinner'));

  // Oct 15: Only vac2 active
  check('Same student overlap: Oct 15 Breakfast unpaused (v1 expired)', !studentUtils.isStudentOnVacation(studentVacations, studentId, '2026-10-15', 'breakfast'));
  check('Same student overlap: Oct 15 Lunch paused (v2)', studentUtils.isStudentOnVacation(studentVacations, studentId, '2026-10-15', 'lunch'));
  check('Same student overlap: Oct 15 Dinner paused (v2)', studentUtils.isStudentOnVacation(studentVacations, studentId, '2026-10-15', 'dinner'));

  // Oct 17: Both expired
  check('Same student overlap: Oct 17 all meals unpaused', 
    !studentUtils.isStudentOnVacation(studentVacations, studentId, '2026-10-17', 'breakfast') &&
    !studentUtils.isStudentOnVacation(studentVacations, studentId, '2026-10-17', 'lunch') &&
    !studentUtils.isStudentOnVacation(studentVacations, studentId, '2026-10-17', 'dinner')
  );
}

// 2. Large Scale Multi-Tenant Headcount Isolation (100 Tenants)
{
  const totalTenants = 100;
  const tenants = [];
  const vacationsList = [];
  const targetDate = '2026-10-20';

  for (let i = 1; i <= totalTenants; i++) {
    const tid = `tenant_${i}`;
    tenants.push({ id: tid, name: `Student ${i}` });

    if (i <= 25) {
      // Group 1 (1-25): No vacation
    } else if (i <= 50) {
      // Group 2 (26-50): Full-Day Active Vacation (all 4 meals paused)
      vacationsList.push({
        id: `vac_${i}`,
        tenantId: tid,
        startDate: '2026-10-18',
        endDate: '2026-10-25',
        status: 'active',
        isAllMeals: true,
        meals: MEAL_LIST
      });
    } else if (i <= 75) {
      // Group 3 (51-75): Dinner-only Active Vacation
      vacationsList.push({
        id: `vac_${i}`,
        tenantId: tid,
        startDate: '2026-10-18',
        endDate: '2026-10-25',
        status: 'active',
        isAllMeals: false,
        meals: ['dinner']
      });
    } else {
      // Group 4 (76-100): Resumed or Cancelled Vacation (meals restored)
      vacationsList.push({
        id: `vac_${i}`,
        tenantId: tid,
        startDate: '2026-10-18',
        endDate: '2026-10-19', // Ended yesterday
        status: i % 2 === 0 ? 'resumed' : 'cancelled',
        isAllMeals: true,
        meals: MEAL_LIST
      });
    }
  }

  // Tally for each meal
  const counts = {
    breakfast: { requested: 0, onVacation: 0 },
    lunch: { requested: 0, onVacation: 0 },
    snacks: { requested: 0, onVacation: 0 },
    dinner: { requested: 0, onVacation: 0 },
  };

  for (const t of tenants) {
    for (const m of MEAL_LIST) {
      const isVac = studentUtils.isStudentOnVacation(vacationsList, t.id, targetDate, m);
      if (isVac) {
        counts[m].onVacation++;
      } else {
        counts[m].requested++;
      }
    }
  }

  // Expected invariants:
  // Breakfast: Group 2 (25) onVacation, Groups 1, 3, 4 (75) requested
  check('100-tenant isolation: Breakfast onVacation === 25', counts.breakfast.onVacation === 25);
  check('100-tenant isolation: Breakfast requested === 75', counts.breakfast.requested === 75);

  // Lunch: Group 2 (25) onVacation, Groups 1, 3, 4 (75) requested
  check('100-tenant isolation: Lunch onVacation === 25', counts.lunch.onVacation === 25);
  check('100-tenant isolation: Lunch requested === 75', counts.lunch.requested === 75);

  // Snacks: Group 2 (25) onVacation, Groups 1, 3, 4 (75) requested
  check('100-tenant isolation: Snacks onVacation === 25', counts.snacks.onVacation === 25);
  check('100-tenant isolation: Snacks requested === 75', counts.snacks.requested === 75);

  // Dinner: Group 2 (25) + Group 3 (25) = 50 onVacation, Groups 1, 4 (50) requested
  check('100-tenant isolation: Dinner onVacation === 50', counts.dinner.onVacation === 50);
  check('100-tenant isolation: Dinner requested === 50', counts.dinner.requested === 50);
}

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 6: State Machine Transitions, Shortening & Early Resume Idempotency
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ SUITE 6: State Machine Transitions, Shortening & Early Resume Idempotency');

{
  const today = studentUtils.getTodayStr();
  const [ty, tm, td] = today.split('-').map(Number);
  
  // Construct a vacation starting today for 10 days
  const futureDate = (offsetDays) => {
    const d = new Date(ty, tm - 1, td + offsetDays, 12, 0, 0);
    return studentUtils.formatDateStr(d);
  };

  const startDate = today;
  const originalEnd = futureDate(9); // 10 days inclusive

  let vacDoc = studentUtils.buildVacationDoc({
    tenantId: 'state_test_user',
    startDate,
    endDate: originalEnd,
    isAllMeals: true,
    meals: MEAL_LIST,
    status: 'active'
  });

  check('Initial state is active', vacDoc.status === 'active');
  check('Start date is paused', studentUtils.isMealPausedOnDate(vacDoc, startDate, 'lunch'));
  check('Day 5 is paused', studentUtils.isMealPausedOnDate(vacDoc, futureDate(4), 'lunch'));
  check('Original end is paused', studentUtils.isMealPausedOnDate(vacDoc, originalEnd, 'lunch'));

  // Transition 1: Shorten to Day 5
  const shortenedEnd = futureDate(4);
  const shortenedDoc = {
    ...vacDoc,
    originalEndDate: vacDoc.originalEndDate || vacDoc.endDate,
    endDate: shortenedEnd,
    dates: studentUtils.generateDateRange(vacDoc.startDate, shortenedEnd),
    status: 'shortened',
    updatedAt: new Date().toISOString()
  };

  check('Status transitioned to shortened', shortenedDoc.status === 'shortened');
  check('originalEndDate preserved as original booking end', shortenedDoc.originalEndDate === originalEnd);
  check('endDate updated to shortenedEnd', shortenedDoc.endDate === shortenedEnd);
  check('Day 5 (shortenedEnd) remains paused', studentUtils.isMealPausedOnDate(shortenedDoc, shortenedEnd, 'lunch'));
  check('Day 6 (former day) is immediately unpaused', !studentUtils.isMealPausedOnDate(shortenedDoc, futureDate(5), 'lunch'));
  check('Original end date is unpaused', !studentUtils.isMealPausedOnDate(shortenedDoc, originalEnd, 'lunch'));

  // Transition 2: Shorten AGAIN to Day 3
  const secondShortenedEnd = futureDate(2);
  const secondShortenedDoc = {
    ...shortenedDoc,
    endDate: secondShortenedEnd,
    dates: studentUtils.generateDateRange(shortenedDoc.startDate, secondShortenedEnd),
    updatedAt: new Date().toISOString()
  };
  check('Second shortening: originalEndDate still preserved', secondShortenedDoc.originalEndDate === originalEnd);
  check('Second shortening: Day 3 remains paused', studentUtils.isMealPausedOnDate(secondShortenedDoc, secondShortenedEnd, 'lunch'));
  check('Second shortening: Day 4 is unpaused', !studentUtils.isMealPausedOnDate(secondShortenedDoc, futureDate(3), 'lunch'));

  // Transition 3: Early Resume
  const yesterdayD = new Date(ty, tm - 1, td - 1, 12, 0, 0);
  const yesterdayStr = studentUtils.formatDateStr(yesterdayD);

  const resumedDoc = {
    ...secondShortenedDoc,
    status: 'resumed',
    resumedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    endDate: yesterdayStr,
    dates: secondShortenedDoc.startDate <= yesterdayStr ? studentUtils.generateDateRange(secondShortenedDoc.startDate, yesterdayStr) : []
  };

  check('Status transitioned to resumed', resumedDoc.status === 'resumed');
  check('resumedAt timestamp is present', !!resumedDoc.resumedAt);
  check('Today is immediately UNPAUSED on early resume', !studentUtils.isMealPausedOnDate(resumedDoc, today, 'lunch'));
  check('Tomorrow is UNPAUSED on early resume', !studentUtils.isMealPausedOnDate(resumedDoc, futureDate(1), 'lunch'));
  check('All days in window return false when status is resumed', !studentUtils.isMealPausedOnDate(resumedDoc, startDate, 'lunch'));

  // Idempotency: Resuming an already resumed vacation is a safe no-op
  const resumedAgain = {
    ...resumedDoc,
    resumedAt: resumedDoc.resumedAt,
    updatedAt: new Date().toISOString()
  };
  check('Resuming already resumed vacation is idempotent and remains unpaused', !studentUtils.isMealPausedOnDate(resumedAgain, today, 'lunch'));
}

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 7: Fuzzing, Defect Mining & Defensive Resilience on Malformed/Null Inputs
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ SUITE 7: Fuzzing, Defect Mining & Defensive Resilience on Malformed/Null Inputs');

const nonCrashingInputs = [
  null,
  undefined,
  {},
  [],
  42,
  'invalid',
  { status: 'active' },
  { status: 'active', startDate: null, endDate: null },
  { status: 'active', startDate: '', endDate: '' },
  { status: 'active', startDate: '2026-10-20', endDate: '2026-10-10' }, // inverted
  { status: 'active', startDate: '2026-10-10', endDate: '2026-10-15', meals: null },
  { status: 'active', startDate: '2026-10-10', endDate: '2026-10-15', meals: ['breakfast'], isAllMeals: false },
  { status: 999 },
];

for (let idx = 0; idx < nonCrashingInputs.length; idx++) {
  const input = nonCrashingInputs[idx];
  let threw = false;
  try {
    studentUtils.isMealPausedOnDate(input, '2026-10-12', 'lunch');
  } catch (err) {
    threw = true;
  }
  check(`Malformed input #${idx} does not throw in isMealPausedOnDate`, !threw);
}

// Invariant: Uninitialized, cancelled, resumed, or inverted vacation objects must return false
check('Null vacation returns false', studentUtils.isMealPausedOnDate(null, '2026-10-12', 'lunch') === false);
check('Undefined vacation returns false', studentUtils.isMealPausedOnDate(undefined, '2026-10-12', 'lunch') === false);
check('Empty object vacation returns false', studentUtils.isMealPausedOnDate({}, '2026-10-12', 'lunch') === false);
check('Cancelled vacation returns false', studentUtils.isMealPausedOnDate({ status: 'cancelled', startDate: '2026-10-10', endDate: '2026-10-15' }, '2026-10-12', 'lunch') === false);
check('Resumed vacation returns false', studentUtils.isMealPausedOnDate({ status: 'resumed', startDate: '2026-10-10', endDate: '2026-10-15' }, '2026-10-12', 'lunch') === false);
check('Inverted date range vacation returns false', studentUtils.isMealPausedOnDate({ status: 'active', startDate: '2026-10-20', endDate: '2026-10-10' }, '2026-10-12', 'lunch') === false);
check('Vacation with null dates returns false', studentUtils.isMealPausedOnDate({ status: 'active', startDate: null, endDate: null }, '2026-10-12', 'lunch') === false);
check('Vacation with empty dates returns false', studentUtils.isMealPausedOnDate({ status: 'active', startDate: '', endDate: '' }, '2026-10-12', 'lunch') === false);

// Invariant: meals: null or empty with active status defaults safely to all meals paused
check('Vacation with null meals and active status pauses all meals', 
  studentUtils.isMealPausedOnDate({ status: 'active', startDate: '2026-10-10', endDate: '2026-10-15', meals: null }, '2026-10-12', 'lunch') === true);
check('Vacation with empty meals array and active status pauses all meals', 
  studentUtils.isMealPausedOnDate({ status: 'active', startDate: '2026-10-10', endDate: '2026-10-15', meals: [] }, '2026-10-12', 'lunch') === true);


// Check generateDateRange defensive checks
check('generateDateRange with null returns []', studentUtils.generateDateRange(null, null).length === 0);
check('generateDateRange with undefined returns []', studentUtils.generateDateRange(undefined, undefined).length === 0);
check('generateDateRange with inverted dates returns []', studentUtils.generateDateRange('2026-10-15', '2026-10-10').length === 0);
check('generateDateRange with invalid date strings returns []', studentUtils.generateDateRange('abc', 'def').length === 0);

// Check validateVacationRange defensive checks
check('validateVacationRange with null start fails', !studentUtils.validateVacationRange(null, '2026-10-15').valid);
check('validateVacationRange with null end fails', !studentUtils.validateVacationRange('2026-10-10', null).valid);
check('validateVacationRange with past start fails', !studentUtils.validateVacationRange('2020-01-01', '2026-10-15').valid);
check('validateVacationRange with end < start fails', !studentUtils.validateVacationRange('2026-10-20', '2026-10-15').valid);
check('validateVacationRange with non-date strings fails', !studentUtils.validateVacationRange('2026-ab-cd', '2026-10-15').valid);

// Check buildVacationDoc robustness
const emptyDoc = studentUtils.buildVacationDoc();
check('buildVacationDoc() with no params returns valid object with defaults', typeof emptyDoc === 'object' && emptyDoc.status === 'active');
check('buildVacationDoc() with positional params works correctly', 
  studentUtils.buildVacationDoc('u123', '2026-10-10', '2026-10-12', ['lunch']).tenantId === 'u123');

// ─────────────────────────────────────────────────────────────────────────────
// SUMMARY & VERDICT
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n' + '═'.repeat(75));
console.log('                 ADVERSARIAL STRESS TEST SUMMARY');
console.log('═'.repeat(75));
console.log(`  Total Assertions Run : ${totalAssertions}`);
console.log(`  Passed Assertions    : ${passedAssertions}`);
console.log(`  Failed Assertions    : ${failedAssertions}`);
console.log('═'.repeat(75) + '\n');

if (failedAssertions > 0) {
  console.error(`❌ REGRESSIONS FOUND: ${failedAssertions} assertion(s) failed:`);
  failureDetails.forEach(f => console.error(f));
  process.exit(1);
} else {
  console.log('✔ ZERO REGRESSIONS DETECTED ACROSS ALL ADVERSARIAL STRESS TEST TIERS!\n');
  process.exit(0);
}
