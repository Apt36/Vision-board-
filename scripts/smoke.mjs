import { chromium } from 'playwright-core'

const BASE = 'http://localhost:4173/Vision-board-/'
let failures = 0
const ok = (name, cond, extra = '') => {
  if (cond) console.log(`  ✓ ${name}`)
  else { failures++; console.log(`  ✗ FAIL: ${name} ${extra}`) }
}

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] })
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }) // iPhone-ish
const page = await ctx.newPage()
const consoleErrors = []
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()) })
page.on('pageerror', e => consoleErrors.push(String(e)))

console.log('1. Today screen loads')
await page.goto(BASE, { waitUntil: 'networkidle' })
ok('brand visible', await page.getByText('MATT OS').first().isVisible())
const body = await page.textContent('body')
ok('day type shown', /WORK DAY|OFF DAY/.test(body))
ok('capacity shown', /CAPACITY/i.test(body) && /%/.test(body))
ok('Life Radar shown', body.includes('Life Radar'))
ok('priorities list rendered', await page.locator('.plist li').count() >= 2)

console.log('2. WHAT SHOULD I DO engine')
await page.getByRole('button', { name: 'WHAT SHOULD I DO?' }).click()
await page.waitForSelector('.sheet')
const recText = await page.textContent('.sheet')
ok('recommendation has context + steps', /It's/.test(recText) && await page.locator('.sheet .plist li').count() >= 2)
await page.getByRole('button', { name: 'Got it' }).click()

console.log('3. Navigation — every tab and subscreen')
for (const tab of ['Check-In', 'Goals', 'Week', 'Life', 'Today']) {
  await page.locator('.nav button', { hasText: tab }).click()
  await page.waitForTimeout(150)
  ok(`tab ${tab}`, (await page.textContent('main')).length > 50)
}
await page.locator('.nav button', { hasText: 'Life' }).click()
for (const sub of ['Body', 'Career', 'French', 'Money', 'Creative', 'Mind', 'Routines', 'Settings']) {
  await page.locator('main .row', { hasText: sub }).first().click()
  await page.waitForTimeout(150)
  ok(`subscreen ${sub}`, (await page.textContent('main')).length > 50)
  await page.getByRole('button', { name: '← Life' }).click()
  await page.waitForTimeout(100)
}

console.log('4. Check-in with autosave + persistence across reload')
await page.locator('.nav button', { hasText: 'Check-In' }).click()
// sleep: default display 7, one + = 7.5
await page.getByRole('button', { name: 'increase' }).first().click()
// energy slider -> 4
await page.locator('#energy').fill('4')
// meals: two increases
const steppers = page.locator('.stepper')
await steppers.nth(1).getByRole('button', { name: 'increase' }).click()
await steppers.nth(1).getByRole('button', { name: 'increase' }).click()
// exercise on
await page.getByRole('switch', { name: 'Exercise' }).click()
// french on + duolingo chip
await page.getByRole('switch', { name: 'Practiced French' }).click()
await page.getByRole('button', { name: 'Duolingo' }).click()
// partner connection
await page.getByRole('button', { name: 'Partner', exact: true }).click()
await page.waitForTimeout(700) // let debounced autosave fire
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(200)
const checkinText = await page.textContent('main')
ok('check-in persisted after reload', checkinText.includes("loaded today's check-in"))
const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('matt-os-state-v1')))
const today = new Date(); const iso = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
const c = stored.checkins[iso]
ok('sleep saved (7.5)', c?.sleepHours === 7.5, `got ${c?.sleepHours}`)
ok('energy saved (4)', c?.energy === 4, `got ${c?.energy}`)
ok('meals saved (2)', c?.meals === 2, `got ${c?.meals}`)
ok('exercise saved', c?.exercised === true)
ok('french saved', c?.french?.practiced === true && c?.french?.types.includes('duolingo'))
ok('partner saved', c?.connection?.partner === true)

console.log('5. Today reflects check-in')
await page.locator('.nav button', { hasText: 'Today' }).click()
const todayText = await page.textContent('main')
ok('quick check-in shows saved state', todayText.includes('Checked in today'))

console.log('6. Capacity changes when schedule changes')
const capBefore = (await page.textContent('.capacity-num')).trim()
const dayTypeBefore = /OFF DAY/.test(await page.textContent('main')) ? 'off' : 'work'
// flip today's day in settings
await page.locator('.nav button', { hasText: 'Life' }).click()
await page.locator('main .row', { hasText: 'Settings' }).first().click()
const dayName = today.toLocaleDateString('en-US', { weekday: 'long' })
await page.getByRole('switch', { name: `${dayName} work day` }).click()
await page.locator('.nav button', { hasText: 'Today' }).click()
await page.waitForTimeout(150)
const capAfter = (await page.textContent('.capacity-num')).trim()
const dayTypeAfter = /OFF DAY/.test(await page.textContent('main')) ? 'off' : 'work'
ok('day type flipped', dayTypeBefore !== dayTypeAfter, `${dayTypeBefore} -> ${dayTypeAfter}`)
ok('capacity changed', capBefore !== capAfter, `${capBefore} -> ${capAfter}`)
// flip it back
await page.locator('.nav button', { hasText: 'Life' }).click()
await page.locator('main .row', { hasText: 'Settings' }).first().click()
await page.getByRole('switch', { name: `${dayName} work day` }).click()

console.log('7. Add a goal + persistence')
await page.locator('.nav button', { hasText: 'Goals' }).click()
await page.getByRole('button', { name: '+ Add goal or project' }).click()
await page.locator('#g-name').fill('Learn guitar')
await page.locator('#g-domain').selectOption('creative')
await page.locator('#g-next').fill('Buy strings')
await page.getByRole('button', { name: 'Add', exact: true }).click()
await page.reload({ waitUntil: 'networkidle' })
await page.locator('.nav button', { hasText: 'Goals' }).click()
ok('goal persisted', (await page.textContent('main')).includes('Learn guitar'))

console.log('8. Weekly review')
await page.locator('.nav button', { hasText: 'Week' }).click()
const wkText = await page.textContent('main')
ok('week stats render', wkText.includes('Work days') && wkText.includes('Average energy'))
for (const d of ['French', 'Creative', 'Mind']) {
  await page.locator('main .chip', { hasText: d }).first().click()
}
await page.getByRole('button', { name: /Set weekly priorities|Update weekly priorities/ }).click()
ok('review saved', (await page.textContent('main')).includes('Saved'))
await page.locator('.nav button', { hasText: 'Today' }).click()
ok('today shows protected priorities', (await page.textContent('main')).includes('protected priorities'))

console.log('9. Routines anchors toggle')
await page.locator('.nav button', { hasText: 'Life' }).click()
await page.locator('main .row', { hasText: 'Routines' }).first().click()
await page.locator('main .card button.row').first().click()
await page.waitForTimeout(100)
ok('anchor checked', (await page.textContent('main')).includes('1/'))

console.log('10. PWA config')
const manifest = await page.evaluate(async () => (await fetch('/Vision-board-/manifest.webmanifest')).json())
ok('manifest name', manifest.name === 'Matt OS')
ok('manifest standalone', manifest.display === 'standalone')
const swStatus = await page.evaluate(async () => (await fetch('/Vision-board-/sw.js')).status)
ok('service worker served', swStatus === 200)
const iconStatus = await page.evaluate(async () => (await fetch('/Vision-board-/apple-touch-icon.png')).status)
ok('apple touch icon', iconStatus === 200)

console.log('11. Desktop viewport sanity')
await page.setViewportSize({ width: 1280, height: 800 })
await page.locator('.nav button', { hasText: 'Today' }).click()
ok('desktop renders', await page.getByText('MATT OS').first().isVisible())

const realErrors = consoleErrors.filter(e => !e.includes('favicon'))
ok('no console errors', realErrors.length === 0, JSON.stringify(realErrors.slice(0, 3)))

await browser.close()
console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} FAILURES`)
process.exit(failures === 0 ? 0 : 1)
