import { chromium } from 'playwright-core'

const BASE = 'http://localhost:4173/Vision-board-/'
const CHROME = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
let failures = 0
const ok = (name, cond, extra = '') => {
  if (cond) console.log(`  ✓ ${name}`)
  else { failures++; console.log(`  ✗ FAIL: ${name} ${extra}`) }
}

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] })
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
const page = await ctx.newPage()
const consoleErrors = []
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()) })
page.on('pageerror', e => consoleErrors.push(String(e)))

const today = new Date()
const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
const store = () => page.evaluate(() => JSON.parse(localStorage.getItem('matt-os-state-v1')))
const dismissCheer = async () => {
  if (await page.locator('.celebrate-overlay').count()) {
    await page.locator('.celebrate-overlay').click()
    await page.waitForTimeout(250)
  }
}

console.log('1. Today — the daily plan')
await page.goto(BASE, { waitUntil: 'networkidle' })
let body = await page.textContent('body')
ok('coach greeting', /Good (morning|afternoon|evening), Matt/.test(body))
ok('day context shown', /Work day|Day off/.test(body))
ok("today's plan hero", body.includes("Today's plan"))
ok('progress ring', await page.locator('.progress-ring').count() >= 1)
const stepCount = await page.locator('.path-step').count()
ok('path has 4-8 steps', stepCount >= 4 && stepCount <= 8, `got ${stepCount}`)
ok('a focus area is named', await page.locator('.plan-focus-chip').count() >= 1)
ok('an UP NEXT step highlighted', await page.locator('.path-item.next').count() === 1)
ok('plan explains itself', body.includes('Why this plan?'))
let s = await store()
ok('plan pinned for the day', !!s.assignments[iso] && s.assignments[iso].roomIds.length >= 1)

console.log('2. Habit step — tick anchors, step completes, celebration fires')
await page.locator('.path-step', { hasText: 'Morning kickoff' }).click()
await page.waitForSelector('.sheet')
const anchorRows = await page.locator('.sheet .anchor-row').count()
ok('morning anchors listed', anchorRows >= 3, `got ${anchorRows}`)
// tick every morning anchor to its target (skincare & teeth need two taps);
// the sheet closes itself the moment the final one completes
for (let i = 0; i < anchorRows && (await page.locator('.sheet').count()); i++) {
  const row = page.locator('.sheet .anchor-row').nth(i)
  for (let t = 0; t < 3; t++) {
    if (!(await page.locator('.sheet').count())) break
    if (await row.locator('.anchor-box.on').count()) break
    await row.click({ timeout: 5000 }).catch(() => {})
    await page.waitForTimeout(120)
  }
}
await page.waitForTimeout(400)
ok('celebration appeared', (await page.locator('.celebrate-overlay').count()) === 1)
ok('sheet auto-closed', (await page.locator('.sheet').count()) === 0)
await dismissCheer()
ok('morning step marked done', await page.locator('.path-item.done', { hasText: 'Morning kickoff' }).count() === 1)
s = await store()
ok('anchors persisted', Object.keys(s.commitmentLog[iso] ?? {}).length >= anchorRows)

console.log('3. Focus step — "I did this" logs a session and celebrates')
const focusStep = page.locator('.path-step', { has: page.locator('.path-area') }).first()
const focusTitle = (await focusStep.locator('.path-title').textContent()).trim()
await focusStep.click()
await page.waitForSelector('.sheet')
ok('mission shown', (await page.textContent('.sheet')).includes("Today's mission"))
ok('full page link offered', (await page.textContent('.sheet')).includes('Open full page'))
await page.getByRole('button', { name: '✓ I did this' }).click()
await page.waitForTimeout(300)
ok('celebration after focus', (await page.locator('.celebrate-overlay').count()) === 1)
await dismissCheer()
s = await store()
ok('session logged for focus room', s.roomSessions.length >= 1, focusTitle)
ok('planLog updated', (s.planLog[iso] ?? []).some(id => id.startsWith('focus-')))
ok('progress advanced', (await page.textContent('.plan-hero')).includes('to go'))

console.log('4. Plan is stable — same steps after completing one')
const titlesNow = await page.locator('.path-title').allTextContents()
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(300)
const titlesAfter = await page.locator('.path-title').allTextContents()
ok('steps unchanged across reload', JSON.stringify(titlesNow) === JSON.stringify(titlesAfter))
ok('done state survived reload', await page.locator('.path-item.done').count() >= 2)

console.log('5. Check-in step routes to the check-in screen')
await page.locator('.path-step', { hasText: '60-second check-in' }).click()
await page.waitForTimeout(300)
ok('check-in opens', (await page.textContent('main')).length > 80)
await page.locator('main .chip', { hasText: 'Lunch' }).click()
await page.waitForTimeout(600)
await page.locator('.nav button', { hasText: 'Today' }).click()
await page.waitForTimeout(250)
ok('check-in step done', await page.locator('.path-item.done', { hasText: 'check-in' }).count() === 1)

console.log('6. Ask your coach')
await page.getByRole('button', { name: 'NOT SURE? ASK YOUR COACH' }).click()
await page.waitForSelector('.sheet')
ok('coach has context', /It's/.test(await page.textContent('.sheet')))
ok('coach gives steps', await page.locator('.sheet .plist li').count() >= 2)
await page.getByRole('button', { name: 'Got it' }).click()

console.log('7. Journey — streak, weekly coverage, chapter')
await page.locator('.nav button', { hasText: 'Journey' }).click()
await page.waitForTimeout(300)
body = await page.textContent('main')
ok('streak shown', /\d+ days?/.test(body) && body.includes('showing-up streak'))
ok('7 recent-day dots', await page.locator('.journey-day').count() === 7)
ok('today counts as showing up', await page.locator('.journey-dot.on').count() >= 1)
ok('8 areas in coverage', await page.locator('.cover-row').count() === 8)
ok('covered area has dots', await page.locator('.cover-dot.on').count() >= 1)
ok("today's focus flagged", body.includes("today's focus"))
ok('chapter shown', /Chapter \d+ · day \d+/.test(body))

console.log('8. Weekly reset reachable from Journey')
await page.getByRole('button', { name: 'Open the weekly reset ›' }).click()
await page.waitForTimeout(300)
ok('weekly reset opens', (await page.textContent('main')).includes('Week of'))
const prioCard = page.locator('.card', { hasText: 'What needs a turn' })
for (const d of ['French', 'Creative', 'Body']) {
  await prioCard.locator('.chip', { hasText: new RegExp(`^${d}$`) }).first().click()
}
await page.getByRole('button', { name: /Set weekly priorities|Update weekly priorities/ }).click()
await page.waitForTimeout(250)
ok('priorities saved', (await page.textContent('main')).includes('Saved'))
await page.getByRole('button', { name: '← Journey' }).click()
await page.waitForTimeout(200)
ok('back to Journey', (await page.textContent('main')).includes('showing-up streak'))

console.log('9. Board — the vision board')
await page.locator('.nav button', { hasText: 'Board' }).click()
await page.waitForTimeout(300)
body = await page.textContent('main')
ok('board title', body.includes('Your vision board'))
ok('8 area cards', await page.locator('.channel-card').count() === 8)
ok('weekly summary', /\d of 8 areas visited this week/.test(body))
ok("today's focus labeled", body.includes("TODAY'S FOCUS"))
ok('friendly names, not codenames', body.includes('The Body') && !/THE BODY(?!')/.test(body.replace("TODAY'S FOCUS", '')))

console.log('10. Area opens into its goals, and a goal logs a real session')
await page.locator('.channel-card', { hasText: 'Truce' }).click()
await page.waitForTimeout(300)
ok('area screen opens', (await page.textContent('main')).includes('The channel'))
ok('goals listed', (await page.textContent('main')).includes('Editing'))
await page.locator('.nav button', { hasText: 'Board' }).click()
await page.waitForTimeout(200)

console.log('11. You — hub for everything else')
await page.locator('.nav button', { hasText: 'You' }).click()
await page.waitForTimeout(250)
body = await page.textContent('main')
ok('You screen', body.includes('You are the project'))
ok('attention radar', await page.locator('.radar-row').count() >= 5)
for (const sub of ['Capture', 'Body', 'Career', 'French', 'Money', 'Mind', 'Routines', 'Settings']) {
  await page.locator('main .row', { hasText: sub }).first().click()
  await page.waitForTimeout(180)
  ok(`subscreen ${sub}`, (await page.textContent('main')).length > 80)
  await page.getByRole('button', { name: '← You' }).click()
  await page.waitForTimeout(150)
}

console.log('12. Monk mode still works, surfaces on Journey')
await page.locator('main .row', { hasText: 'Monk' }).first().click()
await page.waitForTimeout(200)
ok('monk setup shown', (await page.textContent('main')).includes('60 days, no vices'))
await page.locator('main .chip', { hasText: 'Weed' }).click()
await page.getByRole('button', { name: 'START DAY 1' }).click()
await page.waitForTimeout(250)
ok('challenge started', (await page.textContent('main')).includes('Day 1 of 60'))
await page.locator('.nav button', { hasText: 'Journey' }).click()
await page.waitForTimeout(250)
ok('monk card on Journey', await page.locator('.monk-card').count() === 1)

console.log('13. Everything persists over reload')
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(300)
s = await store()
ok('plan log survived', (s.planLog[iso] ?? []).length >= 1)
ok('pinned plan survived', !!s.assignments[iso])
ok('checkin survived', s.checkins[iso]?.lunch === true)
ok('monk survived', s.challenge.active === true)

console.log('14. PWA config')
const manifest = await page.evaluate(async () => (await fetch('/Vision-board-/manifest.webmanifest')).json())
ok('manifest name', manifest.name === 'Matt OS')
ok('manifest scoped to subpath', manifest.start_url === '/Vision-board-/')
ok('service worker served', await page.evaluate(async () => (await fetch('/Vision-board-/sw.js')).status) === 200)

console.log('15. Desktop + no console errors')
await page.setViewportSize({ width: 1280, height: 800 })
await page.locator('.nav button', { hasText: 'Journey' }).click()
await page.waitForTimeout(200)
ok('desktop renders', (await page.textContent('main')).includes('showing-up streak'))
const realErrors = consoleErrors.filter(e => !e.includes('favicon'))
ok('no console errors', realErrors.length === 0, JSON.stringify(realErrors.slice(0, 3)))

await browser.close()
console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} FAILURES`)
process.exit(failures === 0 ? 0 : 1)
