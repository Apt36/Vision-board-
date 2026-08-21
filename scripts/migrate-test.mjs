import { chromium } from 'playwright-core'
const BASE='http://localhost:4173/Vision-board-/'
let f=0; const ok=(n,c,e='')=>{ if(c) console.log(`  ✓ ${n}`); else {f++;console.log(`  ✗ FAIL ${n} ${e}`)} }
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']})
const p=await (await b.newContext({viewport:{width:390,height:844}})).newPage()
const p2=p
const errs=[]; p.on('pageerror',e=>errs.push(String(e)))

// Seed a realistic v1 state, as it would exist on the phone right now.
const v1 = {
  version:1,
  settings:{name:'Matt',schedule:{sat:{off:false,start:'09:00',end:'17:00'},sun:{off:false,start:'09:00',end:'17:00'},mon:{off:false,start:'11:00',end:'19:00'},tue:{off:false,start:'11:00',end:'19:00'},wed:{off:false,start:'11:00',end:'19:00'},thu:{off:true,start:'09:00',end:'17:00'},fri:{off:true,start:'09:00',end:'17:00'}},currentJob:'Leasing Consultant (contract)',targetWeight:null,weightUnit:'lbs',goalDirection:'gain',money:{savingsGoal:5000,currentSavings:1200,monthlyTarget:null,extraIncomeGoal:null,extraIncomeEarned:null,note:'keep going'}},
  domains:[],
  checkins:{'2026-08-13':{date:'2026-08-13',sleepHours:6.5,energy:5,meals:2,exercised:true,exerciseNote:'pushups',steps:14000,weight:113,french:{practiced:true,minutes:15,types:['duolingo']},reading:false,career:true,connection:{partner:true,family:false,friends:false},creative:false,mind:false,notes:'long shift',updatedAt:'x'}},
  goals:[{id:'g-accora',name:'Accora Brain',domainId:'projects',description:'d',status:'maintenance',priority:3,nextAction:'',lastWorkedOn:null,targetDate:null,createdAt:'x'},
         {id:'custom123',name:'Learn guitar',domainId:'creative',description:'my own goal',status:'active',priority:2,nextAction:'buy strings',lastWorkedOn:'2026-08-12',targetDate:null,createdAt:'x'}],
  projectNotes:[], weeklyReviews:[{weekStart:'2026-08-10',priorities:['body','french'],reflection:'r',completedAt:'x'}],
  routine:{morning:[{id:'m1',label:'Wake'}],workday:[],evening:[]},
  weights:[{date:'2026-08-13',weight:113}],
  jobApps:[{id:'j1',company:'Acme',role:'Coordinator',date:'2026-08-12',status:'applied',notes:''}],
  therapy:[{id:'t1',date:'2026-08-11',reflection:'good session',nextSession:'2026-08-25',topics:'work'}],
  content:[{id:'ct1',kind:'footage',title:'property walk',notes:'',date:'2026-08-12'}],
  activity:[], anchorChecks:{}
}
await p.goto(BASE,{waitUntil:'networkidle'})
await p.evaluate(v=>localStorage.setItem('matt-os-state-v1',JSON.stringify(v)),v1)
await p.reload({waitUntil:'networkidle'})
await p.waitForTimeout(500)

const s=await p.evaluate(()=>JSON.parse(localStorage.getItem('matt-os-state-v1')))
console.log('Migration v1 -> v2')
ok('app still renders', await p.getByText('Journey').first().isVisible())
ok('version bumped', s.version===5, s.version)
ok('check-in preserved', !!s.checkins['2026-08-13'])
const c=s.checkins['2026-08-13']
ok('meals=2 became breakfast+lunch', c.breakfast===true&&c.lunch===true&&c.dinner===false, JSON.stringify({b:c.breakfast,l:c.lunch,d:c.dinner}))
ok('sleep/energy kept', c.sleepHours===6.5&&c.energy===5)
ok('french kept', c.french.practiced===true&&c.french.minutes===15)
ok('weight kept', c.weight===113)
ok('weights array kept', s.weights.length===1)
ok('money kept', s.settings.money.savingsGoal===5000&&s.settings.money.currentSavings===1200)
ok('minimalSpendMonth added', typeof s.settings.money.minimalSpendMonth==='boolean')
ok('schedule kept', s.settings.schedule.mon.start==='11:00')
ok('job apps kept', s.jobApps.length===1)
ok('therapy kept', s.therapy.length===1)
ok('weekly review kept', s.weeklyReviews.length===1)
ok('rooms seeded', s.rooms.length>=20, s.rooms.length)
ok('custom goal became a room', s.rooms.some(r=>r.name==='Learn guitar'), JSON.stringify(s.rooms.filter(r=>r.id==='custom123')))
ok('custom room kept next action', s.rooms.find(r=>r.id==='custom123')?.nextAction==='buy strings')
ok('accora room in maintenance', s.rooms.find(r=>r.id==='r-accora')?.status==='maintenance')
ok('old content got roomId field', s.content[0].roomId===null&&s.content[0].editId===null)
ok('old content title kept', s.content[0].title==='property walk')
ok('commitments seeded', s.commitments.length>=8)
ok('goals key removed', s.goals===undefined)
ok('no page errors', errs.length===0, JSON.stringify(errs.slice(0,2)))

// second reload must be stable (idempotent migration)
await p.reload({waitUntil:'networkidle'}); await p.waitForTimeout(400)
const s2=await p.evaluate(()=>JSON.parse(localStorage.getItem('matt-os-state-v1')))
ok('migration idempotent', s2.rooms.length===s.rooms.length && !!s2.checkins['2026-08-13'], `${s2.rooms.length} vs ${s.rooms.length}`)

// ---- v2 -> v3: a real in-use v2 install must gain channels/window losslessly ----
console.log('\nMigration v2 -> v3')
const v2 = JSON.parse(JSON.stringify(s2))
v2.version = 2
delete v2.channels; delete v2.window; delete v2.windowReviews; delete v2.assignments
v2.rooms = v2.rooms.filter(r => r.id !== 'r-plants')
v2.domains = v2.domains.filter(d => d.id !== 'home')
v2.roomSessions = [{id:'rs1',roomId:'r-french',date:'2026-08-14',minutes:20,note:'duo',filmed:true}]
v2.commitmentLog = {'2026-08-14':{'c-pushups':1,'c-teeth':2}}
v2.challenge = {id:'monk',name:'Monk',vices:['Weed'],targetDays:60,startDate:'2026-08-14',active:true,bestRun:0}
v2.challengeLog = {'2026-08-14':true}
v2.collection = [{id:'c1',collection:'art',title:'Basquiat',maker:'JMB',status:'framed',notes:'',cost:null,date:'2026-08-14'}]
v2.edits = [{id:'e1',date:'2026-08-14',title:'wk',minutes:40,clipIds:[],published:false,note:''}]
await p2.evaluate(v=>localStorage.setItem('matt-os-state-v1',JSON.stringify(v)),v2)
await p2.reload({waitUntil:'networkidle'}); await p2.waitForTimeout(500)
const s3=await p2.evaluate(()=>JSON.parse(localStorage.getItem('matt-os-state-v1')))
ok('v3 version', s3.version===5, s3.version)
ok('app renders after v3 migrate', await p2.getByText('Journey').first().isVisible())
ok('channels added', s3.channels?.length===8, s3.channels?.length)
ok('window started', !!s3.window?.startDate && s3.window.number===2)
ok('plants room added', s3.rooms.some(r=>r.id==='r-plants'))
ok('home domain added', s3.domains.some(d=>d.id==='home'))
ok('room sessions kept', s3.roomSessions.length===1 && s3.roomSessions[0].filmed===true)
ok('commitment log kept', s3.commitmentLog['2026-08-14']['c-teeth']===2)
ok('monk challenge kept', s3.challenge.active===true && s3.challenge.startDate==='2026-08-14')
ok('challenge log kept', s3.challengeLog['2026-08-14']===true)
ok('collection kept', s3.collection.length===1 && s3.collection[0].status==='framed')
ok('edits kept', s3.edits.length===1)
ok('checkin still there', !!s3.checkins['2026-08-13'])
ok('custom room still there', s3.rooms.some(r=>r.id==='custom123'))
ok('every channel room resolves', s3.channels.every(c=>c.roomIds.every(id=>s3.rooms.some(r=>r.id===id))),
   JSON.stringify(s3.channels.flatMap(c=>c.roomIds.filter(id=>!s3.rooms.some(r=>r.id===id)))))
await p2.reload({waitUntil:'networkidle'}); await p2.waitForTimeout(400)
const s4=await p2.evaluate(()=>JSON.parse(localStorage.getItem('matt-os-state-v1')))
ok('v3 idempotent', s4.channels.length===8 && s4.rooms.length===s3.rooms.length && s4.window.number===2)

// ---- v3 -> v4: an install with channels stored before music/journal existed ----
console.log('\nMigration v3 -> v4')
const v3 = JSON.parse(JSON.stringify(s4))
v3.version = 3
v3.rooms = v3.rooms.filter(r => r.id !== 'r-music' && r.id !== 'r-journal')
v3.channels = v3.channels.map(c => ({...c, roomIds: c.roomIds.filter(id => id !== 'r-music' && id !== 'r-journal')}))
v3.channels.find(c => c.id === 'ch-truce').weight = 5 // user-tuned weight must survive
await p2.evaluate(v=>localStorage.setItem('matt-os-state-v1',JSON.stringify(v)),v3)
await p2.reload({waitUntil:'networkidle'}); await p2.waitForTimeout(500)
const s5=await p2.evaluate(()=>JSON.parse(localStorage.getItem('matt-os-state-v1')))
ok('v4 version', s5.version===5, s5.version)
ok('music room added', s5.rooms.some(r=>r.id==='r-music'))
ok('journal room added', s5.rooms.some(r=>r.id==='r-journal'))
ok('music wired into TRUCE', s5.channels.find(c=>c.id==='ch-truce')?.roomIds.includes('r-music'))
ok('journal wired into THE MIND', s5.channels.find(c=>c.id==='ch-mind')?.roomIds.includes('r-journal'))
ok('tuned channel weight kept', s5.channels.find(c=>c.id==='ch-truce')?.weight===5)
ok('rooms not duplicated', s5.rooms.filter(r=>r.id==='r-music').length===1 && s5.rooms.filter(r=>r.id==='r-journal').length===1)

// ---- v4 -> v5: the season dial, the second pod, the long game ----
console.log('\nMigration v4 -> v5')
const v4 = JSON.parse(JSON.stringify(s5))
v4.version = 4
delete v4.window.focusRoomIds
v4.rooms = v4.rooms.filter(r => r.id !== 'r-pod-ent' && r.id !== 'r-longgame')
v4.channels = v4.channels.map(c => ({...c, roomIds: c.roomIds.filter(id => id !== 'r-pod-ent' && id !== 'r-longgame')}))
// untouched podcast room (old seed name + intention) must get the new copy...
const pod = v4.rooms.find(r => r.id === 'r-podcast')
pod.name = 'Podcast'
pod.intention = 'Usually after therapy, while your head is clear. Build the rhythm instead of waiting for the mood.'
// ...but a user-edited vlog intention must be left alone
v4.rooms.find(r => r.id === 'r-vlog').intention = 'my own words about the vlog'
await p2.evaluate(v=>localStorage.setItem('matt-os-state-v1',JSON.stringify(v)),v4)
await p2.reload({waitUntil:'networkidle'}); await p2.waitForTimeout(500)
const s6=await p2.evaluate(()=>JSON.parse(localStorage.getItem('matt-os-state-v1')))
ok('v5 version', s6.version===5, s6.version)
ok('season dial seeded', JSON.stringify(s6.window.focusRoomIds)===JSON.stringify(['r-license','r-realtor','r-french']), JSON.stringify(s6.window.focusRoomIds))
ok('entertainment pod added', s6.rooms.some(r=>r.id==='r-pod-ent'))
ok('long game room added', s6.rooms.some(r=>r.id==='r-longgame'))
ok('both wired into TRUCE', ['r-pod-ent','r-longgame'].every(id=>s6.channels.find(c=>c.id==='ch-truce')?.roomIds.includes(id)))
ok('untouched podcast renamed to Self Pod', s6.rooms.find(r=>r.id==='r-podcast')?.name==='Self Pod')
ok('edited vlog intention preserved', s6.rooms.find(r=>r.id==='r-vlog')?.intention==='my own words about the vlog')
ok('truce tagline refreshed', s6.channels.find(c=>c.id==='ch-truce')?.tagline.includes('archive'), s6.channels.find(c=>c.id==='ch-truce')?.tagline)
// a dial the user already set must survive a reload untouched
await p2.evaluate(()=>{const st=JSON.parse(localStorage.getItem('matt-os-state-v1'));st.window.focusRoomIds=['r-music'];localStorage.setItem('matt-os-state-v1',JSON.stringify(st))})
await p2.reload({waitUntil:'networkidle'}); await p2.waitForTimeout(400)
const s7=await p2.evaluate(()=>JSON.parse(localStorage.getItem('matt-os-state-v1')))
ok('user-set dial survives reload', JSON.stringify(s7.window.focusRoomIds)===JSON.stringify(['r-music']), JSON.stringify(s7.window.focusRoomIds))

await b.close()
console.log(f===0?'\nMIGRATION SAFE':`\n${f} FAILURES`)
process.exit(f?1:0)
