import React, {useEffect, useRef, useState} from 'react'
import {createRoot} from 'react-dom/client'
import {AreaChart, Area, BarChart, Bar, Cell, PieChart, Pie, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts'
import {ArrowUpRight, Check, ChevronLeft, CircleAlert, Edit3, LogOut, Plus, RefreshCw, Search, Trash2, X} from 'lucide-react'
import {configured, supabase} from './supabase'
import {demoHoldings, funds, stocks} from './data'
import './style.css'

const rupee = n => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(Number(n)||0)
const decimal = n => new Intl.NumberFormat('en-IN',{maximumFractionDigits:2}).format(Number(n)||0)
const uid = () => crypto.randomUUID()
const value = h => Number(h.units)*Number(h.current_price)
const invested = h => Number(h.units)*Number(h.avg_cost)
const change = h => (value(h)-invested(h))/invested(h)*100

function Count({value: target}) {
  const [shown,setShown]=useState(target)
  const before=useRef(target)
  useEffect(()=>{
    let start, frame
    const from=before.current, diff=target-from
    const run=t=>{
      start??=t
      const p=Math.min((t-start)/700,1)
      setShown(from+diff*(1-Math.pow(1-p,3)))
      if(p<1) frame=requestAnimationFrame(run)
      else before.current=target
    }
    frame=requestAnimationFrame(run)
    return()=>cancelAnimationFrame(frame)
  },[target])
  return <>{rupee(shown)}</>
}

function BgVideo({src}){
  return (
    <div className="bgVideo">
      <video key={src} autoPlay muted loop playsInline src={src}/>
      <div className="bgOverlay"/>
    </div>
  )
}

function MusicPlayer({src}){
  const ref=useRef(null)
  const [on,setOn]=useState(false)

  useEffect(()=>{
    const tryPlay=()=>{
      if(ref.current && !on){
        ref.current.volume = 0.35
        ref.current.play().then(()=>setOn(true)).catch(()=>{})
      }
      document.removeEventListener('click', tryPlay)
    }
    document.addEventListener('click', tryPlay)
    return()=>document.removeEventListener('click', tryPlay)
  },[on])

  const toggle=()=>{
    if(!ref.current) return
    if(ref.current.paused){
      ref.current.play()
      setOn(true)
    } else {
      ref.current.pause()
      setOn(false)
    }
  }

  return (
    <>
      <audio ref={ref} loop preload="auto" src={src}/>
      <button className="musicToggle" onClick={toggle}>
        {on ? '♫ Sound on' : '♪ Sound off'}
      </button>
    </>
  )
}

function CustomCursor() {
  const dotRef = useRef(null)
  const ringRef = useRef(null)

  useEffect(() => {
    const move = (e) => {
      if (dotRef.current && ringRef.current) {
        dotRef.current.style.left = e.clientX + 'px'
        dotRef.current.style.top = e.clientY + 'px'
        ringRef.current.style.left = e.clientX + 'px'
        ringRef.current.style.top = e.clientY + 'px'
      }
    }

    const addHover = () => document.body.classList.add('cursor-hover')
    const removeHover = () => document.body.classList.remove('cursor-hover')

    window.addEventListener('mousemove', move)

    const attach = () => {
      const interactives = document.querySelectorAll(
        'button, a, .oauth, .refresh, .add, .viewTabs button, .selectRow, .rowActions button, .musicToggle, input'
      )
      interactives.forEach(el => {
        el.addEventListener('mouseenter', addHover)
        el.addEventListener('mouseleave', removeHover)
      })
      return interactives
    }

    let interactives = attach()
    const observer = new MutationObserver(() => {
      interactives.forEach(el => {
        el.removeEventListener('mouseenter', addHover)
        el.removeEventListener('mouseleave', removeHover)
      })
      interactives = attach()
    })
    observer.observe(document.body, {childList:true, subtree:true})

    return () => {
      window.removeEventListener('mousemove', move)
      observer.disconnect()
      interactives.forEach(el => {
        el.removeEventListener('mouseenter', addHover)
        el.removeEventListener('mouseleave', removeHover)
      })
    }
  }, [])

  return (
    <>
      <div className="cursor-dot" ref={dotRef}></div>
      <div className="cursor-ring" ref={ringRef}></div>
    </>
  )
}

function App(){
  const [session,setSession]=useState(null)
  const [screen,setScreen]=useState('login')
  const [holdings,setHoldings]=useState(demoHoldings)
  const [history,setHistory]=useState([])
  const [notice,setNotice]=useState('')
  const [refreshing,setRefreshing]=useState(false)
  const [modal,setModal]=useState(null)

  useEffect(()=>{
    if(!configured) return
    supabase.auth.getSession().then(({data})=>setSession(data.session))
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_e,s)=>setSession(s))
    return()=>subscription.unsubscribe()
  },[])

  useEffect(()=>{
    if(!session) return
    load()
    async function load(){
      const [{data:h},{data:p},{data:hist}] = await Promise.all([
        supabase.from('holdings').select('*').order('updated_at'),
        supabase.from('profiles').select('setup_complete').single(),
        supabase.from('portfolio_history').select('*').order('recorded_at').limit(30)
      ])
      setHoldings(h || [])
      setHistory(hist || [])
      setScreen(p?.setup_complete ? 'dashboard' : 'onboard')
    }
  }, [session])

  const persist = async next => {
    setHoldings(next)
    if(configured && session){
      const {error} = await supabase.from('holdings').upsert(
        next.map(({id,...h})=>({
          ...h,
          id: id?.startsWith('d') ? undefined : id,
          user_id: session.user.id
        }))
      )
      if(error) setNotice(error.message)
    }
  }

  const login = async provider => {
    if(!configured){
      setNotice('Add Supabase environment variables to enable real OAuth. Showing the product flow in preview mode.')
      setScreen('onboard')
      return
    }
    const {error} = await supabase.auth.signInWithOAuth({
      provider,
      options:{redirectTo: location.origin}
    })
    if(error) setNotice(error.message)
  }

  const refresh = async () => {
    setRefreshing(true)
    setNotice('')
    try {
      const stocksOnly = holdings.filter(h => h.type==='stock' && h.symbol && h.symbol.trim())
      const fundsWithCode = holdings.filter(h => h.type==='fund' && /^\d+$/.test(String(h.symbol).trim()))
      const fundsManual = holdings.filter(h => h.type==='fund' && !/^\d+$/.test(String(h.symbol).trim()))

      let stockQuotes = [], stockAttempted = 0
      if(stocksOnly.length){
        stockAttempted = stocksOnly.length
        const results = await Promise.all(stocksOnly.map(async h => {
          try {
            const r = await fetch(`/api/quote?symbol=${encodeURIComponent(h.symbol.trim())}`)
            const d = await r.json()
            if(!d.price) return null
            return [h.id, Number(d.price)]
          } catch { return null }
        }))
        stockQuotes = results.filter(Boolean)
      }

      const fundResults = await Promise.all(fundsWithCode.map(async h => {
        try {
          const r = await fetch(`https://api.mfapi.in/mf/${encodeURIComponent(String(h.symbol).trim())}/latest`)
          const d = await r.json()
          const nav = Number(d?.data?.[0]?.nav)
          if(!nav) return null
          return {id: h.id, nav}
        } catch { return null }
      }))
      const fundQuotes = fundResults.filter(Boolean)

      let matchedManual = 0
      const manualUpgrades = await Promise.all(fundsManual.map(async h => {
        try {
          const r = await fetch(`https://api.mfapi.in/mf/search?q=${encodeURIComponent(h.name)}`)
          const list = await r.json()
          const arr = Array.isArray(list) ? list : []
          if(!arr.length) return null
          const directGrowth = arr.find(x => /direct/i.test(x.schemeName) && /growth/i.test(x.schemeName) && !/idcw|dividend/i.test(x.schemeName))
          const anyGrowth = arr.find(x => /growth/i.test(x.schemeName) && !/idcw|dividend/i.test(x.schemeName))
          const best = directGrowth || anyGrowth || arr[0]
          const navRes = await fetch(`https://api.mfapi.in/mf/${best.schemeCode}/latest`)
          const navData = await navRes.json()
          const nav = Number(navData?.data?.[0]?.nav)
          if(!nav) return null
          matchedManual++
          return {id: h.id, nav, scheme: String(best.schemeCode)}
        } catch { return null }
      }))
      const upgrades = manualUpgrades.filter(Boolean)

      const map = new Map([...stockQuotes, ...fundQuotes.map(f => [f.id, f.nav])])
      const upgradeMap = new Map(upgrades.map(u => [u.id, u]))

      const next = holdings.map(h => {
        if(map.has(h.id)) return {...h, current_price: map.get(h.id)}
        if(upgradeMap.has(h.id)){
          const u = upgradeMap.get(h.id)
          return {...h, current_price: u.nav, symbol: u.scheme}
        }
        return h
      })

      await persist(next)
      await record(next)

      const stockFailed = stockAttempted - stockQuotes.length
      const fundFailed = fundsWithCode.length - fundQuotes.length
      const parts = []
      if(stockAttempted) parts.push(`${stockQuotes.length} of ${stockAttempted} stock(s)`)
      if(fundsWithCode.length) parts.push(`${fundQuotes.length} of ${fundsWithCode.length} fund NAV(s)`)
      if(matchedManual) parts.push(`${matchedManual} manual fund(s) auto-matched to AMFI and upgraded`)

      let msg = parts.length ? `Refreshed ${parts.join(' · ')}.` : 'Nothing to refresh — add a holding first.'
      if(stockFailed > 0) msg += ` ${stockFailed} stock symbol(s) had no data.`
      if(fundFailed > 0) msg += ` ${fundFailed} fund(s) had no NAV data.`
      const unmatched = fundsManual.length - matchedManual
      if(unmatched > 0) msg += ` ${unmatched} fund(s) couldn't be matched by name — try renaming to match the official scheme name, or re-add via "Search all AMFI schemes".`

      setNotice(msg)
    } catch(e) {
      setNotice(e.message)
    } finally {
      setRefreshing(false)
    }
  }

  const record = async list => {
    const total = list.reduce((s,h) => s + value(h), 0)
    const investedTotal = list.reduce((s,h) => s + invested(h), 0)
    const point = {value: total, invested: investedTotal, recorded_at: new Date().toISOString()}
    setHistory(x => [...x, point])
    if(configured && session) {
      await supabase.from('portfolio_history').insert({...point, user_id: session.user.id})
    }
  }

  const saveHolding = async h => {
    const next = modal?.id
      ? holdings.map(x => x.id === h.id ? h : x)
      : [...holdings, {...h, id: uid()}]
    await persist(next)
    setModal(null)
  }

  const remove = async id => {
    const next = holdings.filter(h => h.id !== id)
    setHoldings(next)
    if(configured && session) {
      await supabase.from('holdings').delete().eq('id', id)
    }
  }

  if(screen === 'login') return (
    <>
      <CustomCursor />
      <MusicPlayer src="https://res.cloudinary.com/x1e5dtb1/video/upload/v1787532150/bg-music.mp3"/>
      <Login onLogin={login} notice={notice}/>
    </>
  )

  if(screen === 'onboard') return (
    <>
      <CustomCursor />
      <MusicPlayer src="https://res.cloudinary.com/x1e5dtb1/video/upload/v1787532150/bg-music.mp3"/>
      <Onboard
        initial={holdings.filter(h => !h.id.startsWith('d'))}
        onDone={async selected => {
          await persist(selected)
          if(configured && session) {
            await supabase.from('profiles').upsert({id: session.user.id, setup_complete: true})
          }
          setScreen('dashboard')
        }}
        onBack={() => setScreen('login')}
      />
    </>
  )

  return (
    <>
      <CustomCursor />
      <MusicPlayer src="https://res.cloudinary.com/x1e5dtb1/video/upload/v1787532150/bg-music.mp3"/>
      <Dashboard
        holdings={holdings}
        history={history}
        notice={notice}
        refreshing={refreshing}
        onRefresh={refresh}
        onLogout={async () => {
          if(configured) await supabase.auth.signOut()
          setScreen('login')
        }}
        onEdit={setModal}
        onDelete={remove}
        onAdd={() => setModal({type: 'stock'})}
      >
        {modal && (
          <HoldingModal
            initial={modal.id ? modal : {...modal, units:'', avg_cost:'', current_price:''}}
            onClose={() => setModal(null)}
            onSave={saveHolding}
          />
        )}
      </Dashboard>
    </>
  )
}

function Login({onLogin, notice}){
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [localNotice, setLocalNotice] = useState('')

  const handleEmailAuth = async (e) => {
    e.preventDefault()
    if (!email || !password) {
      setLocalNotice('Please enter both email and password')
      return
    }
    if(!configured){
      setLocalNotice('Add Supabase environment variables to enable real email sign-in.')
      return
    }

    setLoading(true)
    setLocalNotice('')

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setLocalNotice('Account created successfully! You can now sign in.')
        setMode('login')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (err) {
      setLocalNotice(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login">
      <BgVideo src="https://res.cloudinary.com/x1e5dtb1/video/upload/v1787531589/login-bg.mp4"/>
      <div className="brand">LEDGER <i>ALPHA</i></div>

      <section className="loginCard">
        <span className="eyebrow">PRIVATE INVESTMENT LEDGER</span>
        <h1>Every rupee.<br/><em>In its place.</em></h1>
        <p>A personal ledger for the Indian investor who prefers clarity over noise.</p>

        <form onSubmit={handleEmailAuth} style={{marginTop: '28px', width: '340px'}}>
          <div style={{marginBottom: '12px'}}>
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '13px 14px',
                background: 'rgba(15,21,28,0.85)',
                border: '1px solid var(--line)',
                color: 'var(--text)',
                borderRadius: '4px',
                outline: 'none'
              }}
            />
          </div>

          <div style={{marginBottom: '16px'}}>
            <input
              type="password"
              placeholder="Password (min 6 characters)"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              style={{
                width: '100%',
                padding: '13px 14px',
                background: 'rgba(15,21,28,0.85)',
                border: '1px solid var(--line)',
                color: 'var(--text)',
                borderRadius: '4px',
                outline: 'none'
              }}
            />
          </div>

          <button
            type="submit"
            className="gold"
            disabled={loading}
            style={{width: '100%', justifyContent: 'center', gap: '10px'}}
          >
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign In to Ledger' : 'Create Ledger Account'}
          </button>

          <p style={{
            marginTop: '14px',
            fontSize: '12px',
            color: 'var(--muted)',
            textAlign: 'center'
          }}>
            {mode === 'login' ? (
              <>
                New here?{' '}
                <button
                  type="button"
                  onClick={() => {setMode('signup'); setLocalNotice('')}}
                  style={{background:'none', border:'none', color:'var(--gold)', cursor:'pointer', textDecoration:'underline'}}
                >
                  Create a Ledger Account
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {setMode('login'); setLocalNotice('')}}
                  style={{background:'none', border:'none', color:'var(--gold)', cursor:'pointer', textDecoration:'underline'}}
                >
                  Sign In
                </button>
              </>
            )}
          </p>
        </form>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          margin: '22px 0 16px',
          width: '340px',
          color: 'var(--muted)',
          fontSize: '11px'
        }}>
          <div style={{flex:1, height:'1px', background:'var(--line)'}}></div>
          <span>OR CONTINUE WITH</span>
          <div style={{flex:1, height:'1px', background:'var(--line)'}}></div>
        </div>

        <button className="oauth google" onClick={() => onLogin('google')}>
          <img src="https://developers.google.com/identity/images/g-logo.png" alt="Google"/>
          <span>Continue with Google</span>
        </button>
        <button className="oauth x" onClick={() => onLogin('twitter')}>
          <span className="xIcon">𝕏</span>
          <span>Continue with X</span>
        </button>

        {(notice || localNotice) && (
          <p className="notice">
            <CircleAlert/> {localNotice || notice}
          </p>
        )}

        <small>By continuing, you agree to manage your own investment records.</small>
      </section>

      <div className="loginMark">₹<br/><span>EST. 2026</span></div>
    </main>
  )
}

function Onboard({initial, onDone, onBack}){
  const [tab, setTab] = useState('stock')
  const [query, setQuery] = useState('')
  const [chosen, setChosen] = useState(initial)
  const [remote, setRemote] = useState([])
  const [lookup, setLookup] = useState('')

  const catalog = tab === 'stock' ? stocks : funds
  const local = catalog.filter(x => (x.name + x.symbol).toLowerCase().includes(query.toLowerCase()))
  const matches = [...local, ...remote.filter(x => !local.some(y => y.symbol === x.symbol))]

  const toggle = x => setChosen(c =>
    c.some(v => v.symbol === x.symbol)
      ? c.filter(v => v.symbol !== x.symbol)
      : [...c, {...x, id: uid(), units:'', avg_cost:'', current_price:''}]
  )

  const edit = (symbol, key, val) => setChosen(c =>
    c.map(v => v.symbol === symbol ? {...v, [key]: val} : v)
  )

  const findStock = async () => {
    if(!query.trim()) return
    try {
      setLookup('Searching exchange…')
      const r = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
      const d = await r.json()
      const found = d.results || []
      setRemote(found)
      setLookup(found.length ? '' : 'No Indian listings found.')
    } catch {
      setLookup('Lookup failed. Check your connection and retry.')
    }
  }

  const findFund = async () => {
    if(!query.trim()) return
    try {
      setLookup('Searching the full AMFI fund catalogue…')
      const r = await fetch(`https://api.mfapi.in/mf/search?q=${encodeURIComponent(query)}`)
      const d = await r.json()
      const found = (Array.isArray(d) ? d : []).slice(0, 40).map(x => ({
        name: x.schemeName,
        symbol: String(x.schemeCode),
        type: 'fund'
      }))
      setRemote(found)
      setLookup(found.length ? '' : 'No matching scheme found.')
    } catch {
      setLookup('Lookup failed. Check your connection and retry.')
    }
  }

  const ready = chosen.length && chosen.every(x => x.units && x.avg_cost && x.current_price)

  return (
    <main className="onboard">
      <BgVideo src="https://res.cloudinary.com/x1e5dtb1/video/upload/v1787531570/onboard-bg.mp4"/>
      <button className="back" onClick={onBack}><ChevronLeft/> Back</button>
      <header>
        <span className="eyebrow">PORTFOLIO SETUP · ONE TIME</span>
        <h1>Build your <em>ledger.</em></h1>
        <p>Select what you hold today. You can edit it any time.</p>
      </header>

      <div className="tabs">
        <button className={tab==='stock'?'active':''} onClick={()=>setTab('stock')}>
          Stocks <b>{chosen.filter(x=>x.type==='stock').length}</b>
        </button>
        <button className={tab==='fund'?'active':''} onClick={()=>setTab('fund')}>
          SIP / Mutual Funds <b>{chosen.filter(x=>x.type==='fund').length}</b>
        </button>
      </div>

      <label className="search">
        <Search/>
        <input
          autoFocus
          placeholder={`Search ${tab==='stock'?'NSE & BSE shares':'mutual funds'}`}
          value={query}
          onChange={e => {
            setQuery(e.target.value)
            setRemote([])
            setLookup('')
          }}
        />
        {tab==='stock' && <button type="button" onClick={findStock}>Full exchange lookup</button>}
        {tab==='fund' && <button type="button" onClick={findFund}>Search all AMFI schemes</button>}
      </label>

      {lookup && <p className="lookup">{lookup}</p>}

      <div className="selectionList">
        {matches.map(x => {
          const found = chosen.find(v => v.symbol === x.symbol)
          return (
            <div className={'selectRow ' + (found ? 'selected' : '')} key={x.symbol}>
              <button aria-label={'Select '+x.name} className="check" onClick={()=>toggle(x)}>
                {found && <Check/>}
              </button>
              <div className="assetName">
                <b>{x.name}</b>
                <code>{x.symbol}</code>
              </div>
              {found && (
                <div className="inlineFields">
                  <label>
                    {x.type==='stock'?'Quantity':'Units'}
                    <input type="number" value={found.units} onChange={e=>edit(x.symbol,'units',e.target.value)}/>
                  </label>
                  <label>
                    Avg {x.type==='stock'?'buy price':'NAV'}
                    <input type="number" value={found.avg_cost} onChange={e=>edit(x.symbol,'avg_cost',e.target.value)}/>
                  </label>
                  <label>
                    Current {x.type==='stock'?'price':'NAV'}
                    <input type="number" value={found.current_price} onChange={e=>edit(x.symbol,'current_price',e.target.value)}/>
                  </label>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <footer className="onboardFoot">
        <span>{chosen.length} holding{chosen.length!==1?'s':''} selected</span>
        <button className="gold" disabled={!ready} onClick={()=>onDone(chosen)}>
          Build my portfolio <ArrowUpRight/>
        </button>
      </footer>
    </main>
  )
}

function Dashboard({holdings, history, notice, refreshing, onRefresh, onLogout, onEdit, onDelete, onAdd, children}){
  const [view, setView] = useState('all')
  const shown = view === 'all' ? holdings : holdings.filter(h => h.type === view)
  const total = shown.reduce((s,h) => s + value(h), 0)
  const cost = shown.reduce((s,h) => s + invested(h), 0)
  const gain = total - cost
  const stocksValue = holdings.filter(h => h.type==='stock').reduce((s,h) => s + value(h), 0)
  const fundsValue = holdings.filter(h => h.type==='fund').reduce((s,h) => s + value(h), 0)

  const chartHistory = (history.length
    ? history
    : [
        {value: cost, recorded_at: new Date(Date.now()-864e5).toISOString()},
        {value: total, recorded_at: new Date().toISOString()}
      ]
  ).map(x => ({
    ...x,
    date: new Date(x.recorded_at).toLocaleDateString('en-IN',{day:'numeric',month:'short'})
  }))

  const allocation = shown.map(h => ({
    name: h.symbol,
    value: value(h),
    fill: h.type==='stock' ? '#c9a227' : '#2e8b7f'
  }))

  return (
    <main className="dash">
      <BgVideo
        src={view === 'fund'
          ? 'https://res.cloudinary.com/x1e5dtb1/video/upload/v1787532652/dark-thorn-knight.3840x2160.mp4'
          : 'https://res.cloudinary.com/x1e5dtb1/video/upload/v1787531490/dashboard-bg.mp4'
        }
      />

      <div className="ticker">
        <div className="tickerTrack">
          {[...holdings, ...holdings].map((h,i) => (
            <span key={i}>
              <b>{h.symbol}</b> {rupee(h.current_price)}{' '}
              <i className={change(h)>=0 ? 'up' : 'down'}>
                {change(h)>=0?'+':''}{change(h).toFixed(2)}%
              </i>
            </span>
          ))}
        </div>
      </div>

      <nav>
        <div className="brand">LEDGER <i>ALPHA</i></div>
        <div className="viewTabs">
          <button className={view==='all'?'on':''} onClick={()=>setView('all')}>Combined</button>
          <button className={view==='stock'?'on':''} onClick={()=>setView('stock')}>Stocks</button>
          <button className={view==='fund'?'on':''} onClick={()=>setView('fund')}>SIP</button>
        </div>
        <span className="navText">PERSONAL PORTFOLIO / INDIA</span>
        <button className="logout" onClick={onLogout}><LogOut/> Log out</button>
      </nav>

      <section className="hero">
        <div>
          <span className="eyebrow">NET PORTFOLIO VALUE</span>
          <h1><Count value={total}/></h1>
          <p className={gain>=0?'up':'down'}>
            {gain>=0?'▲':'▼'} {rupee(Math.abs(gain))}{' '}
            <small>({Math.abs(gain/cost*100||0).toFixed(2)}%) all time</small>
          </p>
        </div>
        <div className="heroActions">
          <button className="refresh" onClick={onRefresh} disabled={refreshing}>
            <RefreshCw className={refreshing?'spin':''}/> {refreshing?'Refreshing…':'Refresh live prices'}
          </button>
          <small>Stocks via market-data API · Fund NAVs auto-refresh if added via AMFI search</small>
        </div>
      </section>

      {notice && (
        <div className="notice dashboardNotice">
          <CircleAlert/>{notice}
          <button onClick={onRefresh}>Retry</button>
        </div>
      )}

      <section className="cards">
        <Stat label="TOTAL INVESTED" value={rupee(cost)}/>
        <Stat label="STOCKS VALUE" value={rupee(stocksValue)} tone="gold"/>
        <Stat label="SIP / FUND VALUE" value={rupee(fundsValue)} tone="teal"/>
        <Stat label="NET GAIN / LOSS" value={rupee(gain)} tone={gain>=0?'green':'red'}/>
      </section>

      <section className="grid">
        <Panel title="Portfolio trajectory" sub="A new data point is recorded with each price refresh." cls="trajectory">
          <ResponsiveContainer>
            <AreaChart data={chartHistory}>
              <defs>
                <linearGradient id="goldFill" x1="0" x2="0" y1="0" y2="1">
                  <stop stopColor="#c9a227" stopOpacity=".32"/>
                  <stop offset="1" stopColor="#c9a227" stopOpacity="0"/>
                </linearGradient>
              </defs>
              <XAxis dataKey="date"/>
              <YAxis hide/>
              <Tooltip formatter={v=>rupee(v)}/>
              <Area type="monotone" dataKey="value" stroke="#c9a227" strokeWidth={2} fill="url(#goldFill)"/>
            </AreaChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Allocation" sub="Current value by holding" cls="allocation">
          <ResponsiveContainer>
            <PieChart>
              <Pie data={allocation} dataKey="value" innerRadius="56%" outerRadius="78%" paddingAngle={3}>
                {allocation.map((x,i)=><Cell key={i} fill={x.fill}/>)}
              </Pie>
              <Tooltip formatter={v=>rupee(v)}/>
            </PieChart>
          </ResponsiveContainer>
          <div className="legend">
            <i/><span>Stocks</span>
            <i className="teal"/><span>Funds</span>
          </div>
        </Panel>

        <Panel title="Return by holding" sub="Unrealised return percentage" cls="returns">
          <ResponsiveContainer>
            <BarChart data={shown.map(h=>({name:h.symbol, return:change(h)}))}>
              <XAxis dataKey="name" interval={0} tick={{fontSize:9}}/>
              <YAxis hide/>
              <Tooltip formatter={v=>`${Number(v).toFixed(2)}%`}/>
              <Bar dataKey="return" radius={[3,3,0,0]}>
                {shown.map((h,i)=>(
                  <Cell key={i} fill={change(h)>=0?'#3fb68c':'#e2604b'}/>
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </section>

      <section className="ledger">
        <div className="sectionTitle">
          <div>
            <span className="eyebrow">YOUR HOLDINGS</span>
            <h2>The ledger</h2>
          </div>
          <button className="add" onClick={onAdd}><Plus/> Add holding</button>
        </div>

        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Instrument</th>
                <th>Units</th>
                <th>Avg. cost / NAV</th>
                <th>Current price / NAV</th>
                <th>Current value</th>
                <th>Return</th>
                <th/>
              </tr>
            </thead>
            <tbody>
              {shown.map(h => (
                <tr key={h.id}>
                  <td>
                    <b>{h.name}</b>
                    <code className={h.type}>
                      {h.symbol} · {h.type==='fund'?'MANUAL NAV':'NSE'}
                    </code>
                  </td>
                  <td>{decimal(h.units)}</td>
                  <td>{rupee(h.avg_cost)}</td>
                  <td>
                    <span className={`price ${h.type==='stock' ? 'pricePulse' : ''}`}>
                      {rupee(h.current_price)}
                    </span>
                  </td>
                  <td><b>{rupee(value(h))}</b></td>
                  <td className={change(h)>=0?'up':'down'}>
                    {change(h)>=0?'+':''}{change(h).toFixed(2)}%
                  </td>
                  <td className="rowActions">
                    <button aria-label="Edit" onClick={()=>onEdit(h)}><Edit3/></button>
                    <button aria-label="Delete" onClick={()=>onDelete(h.id)}><Trash2/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {children}
    </main>
  )
}

function Stat({label, value, tone=''}){
  return (
    <article className={'stat '+tone}>
      <span>{label}</span>
      <b>{value}</b>
    </article>
  )
}

function Panel({title, sub, cls, children}){
  return (
    <article className={'panel '+cls}>
      <h3>{title}</h3>
      <p>{sub}</p>
      {children}
    </article>
  )
}

function HoldingModal({initial, onClose, onSave}){
  const [h, setH] = useState(initial)
  const change = (k,v) => setH(x => ({...x, [k]:v}))

  return (
    <div className="modal">
      <form onSubmit={e => {
        e.preventDefault()
        onSave({
          ...h,
          units: Number(h.units),
          avg_cost: Number(h.avg_cost),
          current_price: Number(h.current_price)
        })
      }}>
        <button type="button" className="close" onClick={onClose}><X/></button>
        <span className="eyebrow">{h.id ? 'EDIT HOLDING' : 'NEW HOLDING'}</span>
        <h2>{h.id ? 'Update entry' : 'Add to ledger'}</h2>

        <label>
          Name
          <input required value={h.name||''} onChange={e=>change('name',e.target.value)}/>
        </label>

        <div className="two">
          <label>
            Ticker / Fund code
            <input required value={h.symbol||''} onChange={e=>change('symbol',e.target.value)}/>
          </label>
          <label>
            Type
            <select value={h.type} onChange={e=>change('type',e.target.value)}>
              <option value="stock">Stock</option>
              <option value="fund">SIP / Fund</option>
            </select>
          </label>
        </div>

        <div className="two">
          <label>
            {h.type==='stock'?'Quantity':'Units'}
            <input required min="0" step="any" type="number" value={h.units} onChange={e=>change('units',e.target.value)}/>
          </label>
          <label>
            Average cost / NAV
            <input required min="0" step="any" type="number" value={h.avg_cost} onChange={e=>change('avg_cost',e.target.value)}/>
          </label>
        </div>

        <label>
          Current price / NAV
          <small>
            {h.type==='fund'
              ? 'Manual NAV — update from your fund statement.'
              : 'Live refresh can overwrite this.'}
          </small>
          <input required min="0" step="any" type="number" value={h.current_price} onChange={e=>change('current_price',e.target.value)}/>
        </label>

        <button className="gold" type="submit">
          Save holding <Check/>
        </button>
      </form>
    </div>
  )
}

createRoot(document.getElementById('root')).render(<App/>)
