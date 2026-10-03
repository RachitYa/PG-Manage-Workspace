/**
 * Febeboo Food Vacation Shared Utilities
 * Handles date formatting, range generation, validation, pause evaluations, and document schemas.
 */

export const ALL_MEALS = ['breakfast', 'lunch', 'snacks', 'dinner'];

export const MEAL_LABELS = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  snacks: 'Snacks',
  dinner: 'Dinner'
};

/**
 * Returns local YYYY-MM-DD string using getFullYear(), getMonth() + 1, and getDate().
 * @param {Date|string|number} [date]
 * @returns {string}
 */
export function formatDateStr(date = new Date()) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Returns today's date in local YYYY-MM-DD.
 * @returns {string}
 */
export function getTodayStr() {
  return formatDateStr(new Date());
}

/**
 * Returns array of all date strings [startDateStr, ..., endDateStr] inclusive.
 * @param {string} startDateStr - YYYY-MM-DD
 * @param {string} endDateStr - YYYY-MM-DD
 * @returns {string[]}
 */
export function generateDateRange(startDateStr, endDateStr) {
  if (!startDateStr || !endDateStr || typeof startDateStr !== 'string' || typeof endDateStr !== 'string') {
    return [];
  }
  if (startDateStr > endDateStr) {
    return [];
  }

  const [sYear, sMonth, sDay] = startDateStr.split('-').map(Number);
  const [eYear, eMonth, eDay] = endDateStr.split('-').map(Number);

  if (!sYear || !sMonth || !sDay || !eYear || !eMonth || !eDay) {
    return [];
  }

  const dates = [];
  // Use noon to safely avoid any daylight savings or timezone edge effects
  const curr = new Date(sYear, sMonth - 1, sDay, 12, 0, 0);
  const end = new Date(eYear, eMonth - 1, eDay, 12, 0, 0);

  while (curr <= end) {
    dates.push(formatDateStr(curr));
    curr.setDate(curr.getDate() + 1);
  }

  return dates;
}

/**
 * Validates vacation range:
 * - startDateStr must be >= today (getTodayStr())
 * - endDateStr must be >= startDateStr
 * @param {string} startDateStr - YYYY-MM-DD
 * @param {string} endDateStr - YYYY-MM-DD
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateVacationRange(startDateStr, endDateStr) {
  if (!startDateStr || typeof startDateStr !== 'string') {
    return { valid: false, error: 'Start date is required.' };
  }
  if (!endDateStr || typeof endDateStr !== 'string') {
    return { valid: false, error: 'End date is required.' };
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(startDateStr) || !dateRegex.test(endDateStr)) {
    return { valid: false, error: 'Dates must be in YYYY-MM-DD format.' };
  }

  const today = getTodayStr();
  if (startDateStr < today) {
    return { valid: false, error: 'Start date cannot be in the past.' };
  }

  if (endDateStr < startDateStr) {
    return { valid: false, error: 'End date must be on or after start date.' };
  }

  return { valid: true };
}

/**
 * Checks if a specific meal (or any meal) is paused on targetDateStr for a vacation doc.
 * @param {object} vacation
 * @param {string} targetDateStr - YYYY-MM-DD
 * @param {string} [mealName] - Optional meal name ('breakfast', 'lunch', etc.)
 * @returns {boolean}
 */
export function isMealPausedOnDate(vacation, targetDateStr, mealName) {
  if (!vacation) return false;
  if (vacation.status !== 'active' && vacation.status !== 'shortened') return false;
  if (!targetDateStr || !vacation.startDate || !vacation.endDate) return false;
  if (targetDateStr < vacation.startDate || targetDateStr > vacation.endDate) return false;

  // If all meals paused or meals array is omitted/empty
  if (vacation.isAllMeals || !vacation.meals || vacation.meals.length === 0) {
    return true;
  }

  if (!mealName) {
    return true;
  }

  const targetMealLower = String(mealName).toLowerCase().trim();
  return vacation.meals.some(m => String(m).toLowerCase().trim() === targetMealLower);
}

/**
 * Finds if student is on active/shortened vacation on targetDateStr (and optional mealName).
 * Matches tenantId === studentId, studentId === studentId, userId === studentId, or id === studentId.
 * @param {Array<object>} vacationsList
 * @param {string} studentId
 * @param {string} [targetDateStr] - Defaults to today if not provided
 * @param {string} [mealName]
 * @returns {boolean}
 */
export function isStudentOnVacation(vacationsList, studentId, targetDateStr, mealName) {
  if (!Array.isArray(vacationsList) || !studentId) return false;
  const checkDate = targetDateStr || getTodayStr();

  return vacationsList.some(vacation => {
    if (!vacation) return false;
    const matchesStudent =
      vacation.tenantId === studentId ||
      vacation.studentId === studentId ||
      vacation.userId === studentId ||
      vacation.id === studentId;
    if (!matchesStudent) return false;

    return isMealPausedOnDate(vacation, checkDate, mealName);
  });
}

/**
 * Retrieves the active or shortened vacation object for a student covering targetDateStr.
 * @param {Array<object>} vacationsList
 * @param {string} studentId
 * @param {string} [targetDateStr] - Defaults to today if not provided
 * @returns {object|null}
 */
export function getStudentActiveVacation(vacationsList, studentId, targetDateStr) {
  if (!Array.isArray(vacationsList) || !studentId) return null;
  const checkDate = targetDateStr || getTodayStr();

  const found = vacationsList.find(vacation => {
    if (!vacation) return false;
    const matchesStudent =
      vacation.tenantId === studentId ||
      vacation.studentId === studentId ||
      vacation.userId === studentId ||
      vacation.id === studentId;
    if (!matchesStudent) return false;

    if (vacation.status !== 'active' && vacation.status !== 'shortened') return false;
    if (!vacation.startDate || !vacation.endDate) return false;
    return checkDate >= vacation.startDate && checkDate <= vacation.endDate;
  });

  return found || null;
}

/**
 * Formats YYYY-MM-DD into readable string (e.g. 5 Oct 2026).
 * @param {string} dateStr
 * @returns {string}
 */
export function formatDateDisplay(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const [yyyy, mm, dd] = dateStr.split('-').map(Number);
  if (!yyyy || !mm || !dd) return dateStr;
  const d = new Date(yyyy, mm - 1, dd, 12, 0, 0);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

/**
 * Builds a complete FoodVacationDoc according to PROJECT.md interface contract.
 * Supports both object params and positional params.
 * @param {object|string} paramsOrTenantId
 * @param {string} [maybeStartDate]
 * @param {string} [maybeEndDate]
 * @param {string[]} [maybeMeals]
 * @param {object} [maybeOptions]
 * @returns {object}
 */
export function buildVacationDoc(paramsOrTenantId = {}, maybeStartDate, maybeEndDate, maybeMeals, maybeOptions = {}) {
  let params = {};
  if (typeof paramsOrTenantId === 'string') {
    params = {
      tenantId: paramsOrTenantId,
      startDate: maybeStartDate,
      endDate: maybeEndDate,
      meals: maybeMeals,
      ...maybeOptions
    };
  } else if (paramsOrTenantId && typeof paramsOrTenantId === 'object') {
    params = { ...paramsOrTenantId };
  }

  const {
    id = `vacation_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    tenantId = '',
    tenantName = '',
    tenantPhone = '',
    roomNumber = '',
    bedNumber = '',
    adminId = '',
    pgId = '',
    startDate = '',
    endDate = '',
    originalEndDate = null,
    reason = '',
    status = 'active',
    resumedAt = null,
    createdAt = new Date().toISOString(),
    updatedAt = new Date().toISOString(),
  } = params;

  // Normalized meals array
  const rawMeals = Array.isArray(params.meals)
    ? params.meals
    : typeof params.meals === 'string'
      ? [params.meals]
      : [];

  const normalizedMeals = rawMeals
    .map(m => String(m).toLowerCase().trim())
    .filter(m => ALL_MEALS.includes(m));

  // Determine isAllMeals
  let isAllMeals;
  if (typeof params.isAllMeals === 'boolean') {
    isAllMeals = params.isAllMeals;
  } else {
    isAllMeals = normalizedMeals.length === 0 || normalizedMeals.length === ALL_MEALS.length;
  }

  const effectiveMeals = isAllMeals ? [...ALL_MEALS] : normalizedMeals;

  const dates = Array.isArray(params.dates) && params.dates.length > 0
    ? params.dates
    : generateDateRange(startDate, endDate);

  return {
    id: String(id || ''),
    tenantId: String(tenantId || ''),
    tenantName: String(tenantName || ''),
    tenantPhone: tenantPhone ? String(tenantPhone) : '',
    roomNumber: String(roomNumber || ''),
    bedNumber: bedNumber ? String(bedNumber) : '',
    adminId: String(adminId || ''),
    pgId: String(pgId || ''),
    startDate: String(startDate || ''),
    endDate: String(endDate || ''),
    originalEndDate: originalEndDate ? String(originalEndDate) : String(endDate || ''),
    dates,
    isAllMeals: Boolean(isAllMeals),
    meals: effectiveMeals,
    status,
    reason: reason ? String(reason) : '',
    createdAt: String(createdAt),
    updatedAt: String(updatedAt),
    resumedAt: resumedAt ? String(resumedAt) : null,
  };
}

export default {
  ALL_MEALS,
  MEAL_LABELS,
  formatDateStr,
  getTodayStr,
  generateDateRange,
  validateVacationRange,
  isMealPausedOnDate,
  isStudentOnVacation,
  getStudentActiveVacation,
  formatDateDisplay,
  buildVacationDoc
};
