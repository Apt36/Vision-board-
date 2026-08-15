import { chromium } from 'playwright-core'
const BASE='http://localhost:4173/Vision-board-/'
let f=0; const ok=(n,c,e='')=>{ if(c) console.log(`  ✓ ${n}`); else {f++;console.log(`  ✗ FAIL ${n} ${e}`)} }
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']})
const p=await (await b.newContext({viewport:{width:390,height:844}})).newPage()
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
ok('app still renders', await p.getByText('MATT OS').first().isVisible())
ok('version bumped', s.version===2, s.version)
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

await b.close()
console.log(f===0?'\nMIGRATION SAFE':`\n${f} FAILURES`)
process.exit(f?1:0)
