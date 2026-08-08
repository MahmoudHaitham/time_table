/**
 * Capture production screenshots with uniform zoom-out and multi-section coverage.
 * Usage: node capture-screenshots.mjs [--skip-public] [--only-admin]
 */
import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '..', 'docs', 'screenshots');
const BASE = 'https://www.mahmoudhaisam.com';

const VIEWPORT = { width: 2560, height: 1440 };
const MAX_SECTIONS = 30;
const ADMIN_REG = '00000';
const ADMIN_PASS = 'Boing787@';

const PUBLIC_PAGES = [
  { url: '/', file: 'public/home-portfolio.png', wait: 'text=Mahmoud Haisam Mohammed' },
  { url: '/login', file: 'public/01-login.png', wait: 'text=Timetable System' },
  { url: '/login', file: 'public/public-login.png', wait: 'text=Timetable System' },
  { url: '/problem', file: 'public/public-problem.png', wait: 'text=Report' },
  { url: '/timetable', file: 'public/legacy-timetable.png', wait: 'text=Timetable' },
  { url: '/timetable/terms/4', file: 'public/legacy-term-4.png', wait: 'text=4' },
  { url: '/test-api', file: 'public/test-api.png' },
];

const STUDENT_PAGES = [
  { url: '/student/timetable', file: 'student/student-home.png', wait: 'text=Choose' },
  { url: '/student/timetable/system/140', file: 'student/student-system-140.png', wait: 'text=Select Term' },
  { url: '/student/timetable/system/160', file: 'student/student-system-160.png', wait: 'text=Select Term' },
  { url: '/student/timetable/system/180', file: 'student/student-system-180.png', wait: 'text=Select Term' },
  { url: '/student/timetable/other', file: 'student/student-other.png', wait: 'text=Other' },
  { url: '/student/timetable/other/schedules', file: 'student/student-other-schedules.png' },
  { url: '/student/timetable/electives', file: 'student/student-electives.png' },
  { url: '/student/manual', file: 'student/student-manual.png', wait: 'text=Manual' },
  { url: '/student/timetable/4/all-classes', file: 'student/student-all-classes-term4.png', wait: 'text=Classes' },
];

const ADMIN_PAGES = [
  { url: '/admin/timetable', file: 'admin/admin-timetable.png', wait: 'text=Timetable Management' },
  { url: '/admin/timetable/courses', file: 'admin/admin-courses.png', wait: 'text=Courses' },
  { url: '/admin/timetable/instructors', file: 'admin/admin-instructors.png', wait: 'text=Instructor Schedule' },
  { url: '/admin/timetable/templates', file: 'admin/admin-templates.png', wait: 'text=Templates' },
  { url: '/admin/timetable/coursesForOtherDept', file: 'admin/admin-other-dept.png', wait: 'text=Other' },
  { url: '/admin/room-schedule', file: 'admin/admin-room-schedule.png', wait: 'text=Room' },
  { url: '/admin/timetable/generation-logs', file: 'admin/admin-generation-logs.png', wait: 'text=Generation Logs' },
  { url: '/admin/problems', file: 'admin/admin-problems.png', wait: 'text=Problems' },
  { url: '/admin/all_instructors', file: 'admin/admin-all-instructors.png', wait: 'text=All Instructors', hScroll: '.overflow-x-auto' },
  { url: '/admin/timetable/terms/4', file: 'admin/admin-term-4.png', wait: 'text=Back to Terms' },
  { url: '/admin/timetable/classes/1', file: 'admin/admin-class-detail.png', wait: 'text=Back' },
];

async function applyUniformZoom(page) {
  // Uniform scale: fixed large viewport, no per-page CSS/CDP zoom (avoids inconsistent rendering).
  await page.setViewportSize(VIEWPORT);
  await page.waitForTimeout(150);
}

async function gotoPage(page, url, waitSelector, retries = 3) {
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await page.goto(`${BASE}${url}`, { waitUntil: 'networkidle', timeout: 90000 });
      lastError = null;
      break;
    } catch (err) {
      lastError = err;
      console.warn(`  navigation retry ${attempt}/${retries} for ${url}: ${err.message}`);
      await page.waitForTimeout(2000 * attempt);
    }
  }
  if (lastError) throw lastError;

  await applyUniformZoom(page);
  if (waitSelector) {
    try {
      await page.waitForSelector(waitSelector, { timeout: 15000 });
    } catch {
      console.warn(`  wait selector not found: ${waitSelector}`);
    }
  }
  await page.waitForTimeout(500);
  await applyUniformZoom(page);
}

async function capturePageSections(page, relFile, options = {}) {
  const { hScroll } = options;
  const outPath = path.join(OUT_DIR, relFile);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  const stem = path.basename(relFile.replace(/\.png$/i, ''));
  const dir = path.dirname(outPath);
  const ext = '.png';

  for (const f of fs.readdirSync(dir)) {
    if (f.startsWith(stem) && f.endsWith(ext)) {
      fs.unlinkSync(path.join(dir, f));
    }
  }

  await applyUniformZoom(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);

  const metrics = await page.evaluate(() => ({
    scrollHeight: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight),
    scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
    clientHeight: window.innerHeight,
    clientWidth: window.innerWidth,
  }));

  const stepY = Math.floor(metrics.clientHeight * 0.88);
  const maxY = Math.max(0, metrics.scrollHeight - metrics.clientHeight);

  const yPositions = [];
  for (let y = 0; y <= maxY; y += stepY) yPositions.push(y);
  if (yPositions.length === 0) yPositions.push(0);
  if (maxY > 0 && yPositions[yPositions.length - 1] < maxY) {
    yPositions.push(maxY);
  }
  while (yPositions.length > MAX_SECTIONS) {
    yPositions.pop();
  }

  let part = 0;
  const saved = [];

  for (const y of yPositions) {
    await applyUniformZoom(page);
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    if (hScroll) {
      await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (el) el.scrollLeft = 0;
      }, hScroll);
    }
    await page.waitForTimeout(350);

    part += 1;
    const suffix = yPositions.length === 1 && !hScroll ? '' : `-${part}`;
    const fileName = `${stem}${suffix}${ext}`;
    const filePath = path.join(dir, fileName);
    await page.screenshot({ path: filePath, fullPage: false });
    saved.push(path.relative(OUT_DIR, filePath).replace(/\\/g, '/'));
    console.log(`  saved ${saved[saved.length - 1]}`);
  }

  if (hScroll) {
    const hMetrics = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      return {
        maxX: Math.max(0, el.scrollWidth - el.clientWidth),
        step: Math.floor(el.clientWidth * 0.85),
      };
    }, hScroll);

    if (hMetrics && hMetrics.maxX > 20) {
      await page.evaluate(() => window.scrollTo(0, 0));
      const xPositionsInner = [];
      for (let x = hMetrics.step; x <= hMetrics.maxX; x += hMetrics.step) xPositionsInner.push(x);
      if (xPositionsInner[xPositionsInner.length - 1] < hMetrics.maxX) {
        xPositionsInner.push(hMetrics.maxX);
      }

      for (const x of xPositionsInner) {
        await applyUniformZoom(page);
        await page.evaluate(({ sel, x }) => {
          const el = document.querySelector(sel);
          if (el) el.scrollLeft = x;
        }, { sel: hScroll, x });
        await page.waitForTimeout(350);

        part += 1;
        const fileName = `${stem}-${part}${ext}`;
        const filePath = path.join(dir, fileName);
        await page.screenshot({ path: filePath, fullPage: false });
        saved.push(path.relative(OUT_DIR, filePath).replace(/\\/g, '/'));
        console.log(`  saved ${saved[saved.length - 1]} (horizontal)`);
      }
    }
  }

  if (saved.length > 0) {
    const primary = path.join(OUT_DIR, saved[0]);
    if (primary !== outPath) {
      fs.copyFileSync(primary, outPath);
    }
  }

  const fullPath = path.join(dir, `${stem}-full${ext}`);
  await applyUniformZoom(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);
  await page.screenshot({ path: fullPath, fullPage: true });
  console.log(`  saved ${path.relative(OUT_DIR, fullPath).replace(/\\/g, '/')}`);

  return saved;
}

async function loginAdmin(context, page) {
  const res = await page.request.post(`${BASE}/api/auth/login`, {
    data: { registration_number: ADMIN_REG, password: ADMIN_PASS },
  });
  const body = await res.json();
  const token = body.data?.token;
  if (!token) throw new Error(`Admin API login failed: ${JSON.stringify(body)}`);

  await context.addCookies([
    {
      name: 'auth_token',
      value: token,
      url: `${BASE}/`,
      sameSite: 'Lax',
      expires: Math.floor(Date.now() / 1000) + 900,
    },
  ]);

  await context.addInitScript((authToken) => {
    sessionStorage.setItem('auth_token', authToken);
  }, token);

  await gotoPage(page, '/admin/timetable', 'text=Timetable Management');
  await page.evaluate((authToken) => {
    sessionStorage.setItem('auth_token', authToken);
  }, token);
  console.log('Admin login OK');
}

async function discoverStudentTerm4Urls(page) {
  const res = await page.request.get(`${BASE}/api/timetable/terms`);
  const body = await res.json();
  const terms = Array.isArray(body) ? body : body.data || [];
  const term4 = terms.find((t) => String(t.term_number) === '4');
  if (!term4?.token) throw new Error('Could not find Term 4 token from API');

  const token = term4.token;
  return [
    { url: `/student/timetable/system/140/${token}`, file: 'student/student-term4-system140.png' },
    { url: `/student/timetable/system/140/${token}/schedules`, file: 'student/student-term4-schedules.png' },
  ];
}

async function captureRoute(page, { url, file, wait, hScroll }) {
  console.log(`\n${url} -> ${file}`);
  await gotoPage(page, url, wait);
  await capturePageSections(page, file, { hScroll });
}

async function main() {
  const skipPublic = process.argv.includes('--skip-public');
  const onlyAdmin = process.argv.includes('--only-admin');
  fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log(`Uniform viewport: ${VIEWPORT.width}x${VIEWPORT.height} (no CSS zoom)`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    ignoreHTTPSErrors: true,
  });

  await context.addInitScript(() => {
    document.documentElement.style.zoom = '';
    document.body.style.zoom = '';
  });

  const page = await context.newPage();

  console.log('\n=== Public pages ===');
  if (!skipPublic && !onlyAdmin) {
    for (const route of PUBLIC_PAGES) await captureRoute(page, route);
  } else {
    console.log('skipped');
  }

  console.log('\n=== Student pages ===');
  if (!onlyAdmin) {
    const dynamicStudent = await discoverStudentTerm4Urls(page);
    for (const route of [...STUDENT_PAGES, ...dynamicStudent]) await captureRoute(page, route);
  } else {
    console.log('skipped');
  }

  console.log('\n=== Admin login ===');
  await loginAdmin(context, page);

  console.log('\n=== Admin pages ===');
  for (const route of ADMIN_PAGES) await captureRoute(page, route);

  try {
    console.log('\n/admin/timetable/terms/12 -> admin/admin-term-other-dept.png');
    await captureRoute(page, {
      url: '/admin/timetable/terms/12',
      file: 'admin/admin-term-other-dept.png',
      wait: 'text=Other_Departments',
    });
  } catch (e) {
    console.warn('  skipped admin-term-other-dept:', e.message);
  }

  await browser.close();
  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
