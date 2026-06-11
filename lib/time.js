import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const DEFAULT_TIME_ZONE = 'Asia/Shanghai';
const OPTIONAL_TIME_PACKAGE = 'luxon';

let cachedOptionalTimeModule = null;
let optionalTimeModuleChecked = false;

const dateFormatterCache = new Map();
const hourFormatterCache = new Map();

function createDateFormatter(timeZone = DEFAULT_TIME_ZONE) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

function getDateFormatter(timeZone = DEFAULT_TIME_ZONE) {
  if (!dateFormatterCache.has(timeZone)) {
    dateFormatterCache.set(timeZone, createDateFormatter(timeZone));
  }
  return dateFormatterCache.get(timeZone);
}

function createHourFormatter(timeZone = DEFAULT_TIME_ZONE) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: '2-digit',
    hourCycle: 'h23'
  });
}

function getHourFormatter(timeZone = DEFAULT_TIME_ZONE) {
  if (!hourFormatterCache.has(timeZone)) {
    hourFormatterCache.set(timeZone, createHourFormatter(timeZone));
  }
  return hourFormatterCache.get(timeZone);
}

function loadOptionalTimeModule() {
  if (optionalTimeModuleChecked) return cachedOptionalTimeModule;
  optionalTimeModuleChecked = true;
  try {
    const loaded = require(OPTIONAL_TIME_PACKAGE);
    cachedOptionalTimeModule = loaded?.default || loaded || null;
  } catch {
    cachedOptionalTimeModule = null;
  }
  return cachedOptionalTimeModule;
}

function formatDatePartsWithIntl(date, timeZone = DEFAULT_TIME_ZONE) {
  return Object.fromEntries(
    getDateFormatter(timeZone)
      .formatToParts(date)
      .filter(part => part.type !== 'literal')
      .map(part => [part.type, part.value])
  );
}

function getLuxonDateTime(date, timeZone = DEFAULT_TIME_ZONE) {
  const timeModule = loadOptionalTimeModule();
  const DateTime = timeModule?.DateTime;
  if (!DateTime) return null;
  const baseDate = date instanceof Date ? date : new Date(date);
  return DateTime.fromJSDate(baseDate, { zone: timeZone });
}

export function getOptionalTimeSupport() {
  return {
    enabled: Boolean(loadOptionalTimeModule()?.DateTime),
    packageName: OPTIONAL_TIME_PACKAGE,
    timeZone: DEFAULT_TIME_ZONE
  };
}

export function getTodayKey(date = new Date(), timeZone = DEFAULT_TIME_ZONE) {
  const dateTime = getLuxonDateTime(date, timeZone);
  if (dateTime?.isValid) {
    return dateTime.toFormat('yyyy-LL-dd');
  }
  const parts = formatDatePartsWithIntl(date, timeZone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function getNowTimestamp() {
  return Date.now();
}

export function getNowDateKey(timeZone = DEFAULT_TIME_ZONE) {
  return getTodayKey(new Date(), timeZone);
}

export function getLocalHour(date = new Date(), timeZone = DEFAULT_TIME_ZONE) {
  const dateTime = getLuxonDateTime(date, timeZone);
  if (dateTime?.isValid) {
    return dateTime.hour;
  }
  const hourPart = getHourFormatter(timeZone)
    .formatToParts(date)
    .find(part => part.type === 'hour');
  return Math.max(0, Math.min(23, Number(hourPart?.value || 0)));
}

export function getTimeRuntimeInfo() {
  return {
    timeZone: DEFAULT_TIME_ZONE,
    optionalPackage: OPTIONAL_TIME_PACKAGE,
    optionalPackageLoaded: Boolean(loadOptionalTimeModule()?.DateTime)
  };
}
