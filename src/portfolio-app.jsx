import React, {useMemo, useState} from 'react'
import {createRoot} from 'react-dom/client'
import {Area, AreaChart, Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts'
import {CalendarDays, Check, CircleAlert, Plus, Search, TrendingUp, X} from 'lucide-react'
import {demoHoldings, funds, stocks} from './data'
import './style.css'

const money=n=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(n||0)
const val=h=>Number(h.units)*Number(h.current_price)
const cost=h=>Number(h.units)*Number(h.avg_cost)
const returns=h=>cost(h)?((val(h)-cost(h))/cost(h))*100:0

function TransactionForm({initial={},onSave,onClose}) {
  const [form,setForm]=useState({type:'stock',name:'',symbol:'',units:'',price:'',date:new Date().toISOString().slice(0,10),...initial})
  const update=(key,value)=>setForm(x=>({...x,[key]:value}))
  return <div className="modal"><form onSubmit={e=>{e.preventDefault();onSave({...form,units:Number(form.units),price:Number(form.price)})}}>
    <button type="button" className="close" onClick={onClose}><X/></button><span className="eyebrow">ADD INVESTMENT</span><h2>Record a purchase</h2>
    <p className="formHint">Every entry records what you bought, how much, and when—so invested capital and returns stay accurate.</p>
    <div className="two"><label>Asset type<select value={form.type} onChange={e=>update('type',e.target.value)}><option value="stock">NSE / BSE stock</option><option value="fund">Mutual fund / SIP</option></select></label><label>Purchase date<input required type="date" value={form.date} onChange={e=>update('date',e.target.value)}/></label></div>
    <label>Stock or fund name<input required placeholder="e.g. Reliance Industries" value={form.name} onChange={e=>update('name',e.target.value)}/></label>
    <div className="two"><label>Ticker / scheme code<input required placeholder="e.g. RELIANCE" value={form.symbol} onChange={e=>update('symbol',e.target.value.toUpperCase())}/></label><label>{form.type==='stock'?'Shares purchased':'Units purchased'}<input required min="0" step="any" type="number" value={form.units} onChange={e=>update('units',e.target.value)}/></label></div>
    <label>{form.type==='stock'?'Buy price per share':'Purchase NAV per unit'}<input required min="0" step="any" type="number" value={form.price} onChange={e=>update('price',e.target.value)}/></label>
    <button className="gold" type="submit">Add to portfolio <Check/></button>
  </form></div>
}

function Setup({onComplete}) {
  const [query,setQuery]=useState(''),[selected,setSelected]=useState([]),[form,setForm]=useState(null)
  const choices=useMemo(()=>[...stocks,...funds].filter(x=>(x.name+x.symbol).toLowerCase().includes(query.toLowerCase())).slice(0,18),[query])
  const add=x=>setForm({type:x.type,name:x.name,symbol:x.symbol})
  return <main className="onboard"><header><span className="eyebrow">TRANSACTION-FIRST SETUP</span><h1>Start with what<br/>you <em>bought.</em></h1><p>Search India’s listed universe or add any scheme manually. Record every purchase date and amount.</p></header>
    <label className="search"><Search/><input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search stocks and mutual funds"/><button type="button" onClick={()=>setForm({name:query})}>Add custom</button></label>
    <p className="lookup">The catalogue includes popular instruments. For complete NSE/BSE and AMFI coverage, connect a securities master-data provider in production.</p>
    <div className="selectionList">{choices.map(x=><div className="selectRow" key={x.symbol}><div className="assetName"><b>{x.name}</b><code>{x.symbol} · {x.type==='stock'?'EQUITY':'MUTUAL FUND'}</code></div><button className="add" onClick={()=>add(x)}><Plus/> Add purchase</button></div>)}</div>
    <footer className="onboardFoot"><span>{selected.length} purchase{selected.length!==1?'s':''} recorded</span><button className="gold" disabled={!selected.length} onClick={()=>onComplete(selected)}>Open my portfolio <TrendingUp/></button></footer>
    {form&&<TransactionForm initial={form} onClose={()=>setForm(null)} onSave={x=>{setSelected(s=>[...s,{id:crypto.randomUUID(),name:x.name,symbol:x.symbol,type:x.type,units:x.units,avg_cost:x.price,current_price:x.price,buy_date:x.date}]);setForm(null)}}/>}
  </main>
}

function Dashboard({holdings,onAdd}) {
  const [lastRefresh,setLastRefresh]=useState('Not refreshed yet')
  const total=holdings.reduce((a,h)=>a+val(h),0), invested=holdings.reduce((a,h)=>a+cost(h),0), profit=total-invested
  const ordered=[...holdings].sort((a,b)=>new Date(a.buy_date)-new Date(b.buy_date)); let runningInvested=0
  const plot=ordered.map((h,i)=>{runningInvested+=cost(h); const current=ordered.slice(0,i+1).reduce((a,x)=>a+val(x),0); return {date:new Date(h.buy_date||Date.now()).toLocaleDateString('en-IN',{day:'numeric',month:'short'}),invested:runningInvested,value:current,profit:current-runningInvested}})
  const refresh=()=>setLastRefresh('Prices need a configured market-data feed. Last checked '+new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}))
  return <main className="dash"><div className="ticker"><div className="tickerTrack">{[...holdings,...holdings].map((h,i)=><span key={i}><b>{h.symbol}</b> {money(h.current_price)} <i className={returns(h)>=0?'up':'down'}>{returns(h)>=0?'+':''}{returns(h).toFixed(2)}%</i></span>)}</div></div><nav><div className="brand">LEDGER <i>ALPHA</i></div><span className="navText">INDIAN INVESTMENT LEDGER</span><button className="add" onClick={onAdd}><Plus/> Record purchase</button></nav>
    <section className="hero"><div><span className="eyebrow">CURRENT PORTFOLIO VALUE</span><h1>{money(total)}</h1><p className={profit>=0?'up':'down'}>{profit>=0?'▲':'▼'} {money(Math.abs(profit))} <small>profit after {money(invested)} invested</small></p></div><div className="heroActions"><button className="refresh" onClick={refresh}>Refresh daily prices</button><small>Stocks update from a market feed · mutual-fund NAVs use the latest published NAV</small></div></section>
    <section className="cards"><Stat label="TOTAL INVESTED" value={money(invested)} /><Stat label="CURRENT VALUE" value={money(total)} tone="gold"/><Stat label="NET PROFIT / LOSS" value={money(profit)} tone={profit>=0?'green':'red'}/><Stat label="RETURN" value={`${returns({units:1,avg_cost:invested,current_price:total}).toFixed(2)}%`} tone="teal"/></section>
    <section className="grid"><Panel title="Invested vs current value" sub="Gold = current value · dashed line = capital you invested"><ResponsiveContainer><AreaChart data={plot}><defs><linearGradient id="goldFill" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#c9a227" stopOpacity=".35"/><stop offset="1" stopColor="#c9a227" stopOpacity="0"/></linearGradient></defs><XAxis dataKey="date"/><YAxis hide/><Tooltip formatter={x=>money(x)}/><Area type="monotone" name="Current value" dataKey="value" stroke="#c9a227" strokeWidth={2} fill="url(#goldFill)"/><Area type="monotone" name="Invested" dataKey="invested" stroke="#77838d" strokeDasharray="6 5" strokeWidth={2} fill="none"/></AreaChart></ResponsiveContainer></Panel><Panel title="Profit by holding" sub="Green is gain; red is loss"><ResponsiveContainer><BarChart data={holdings.map(h=>({name:h.symbol,profit:val(h)-cost(h)}))}><XAxis dataKey="name" interval={0}/><YAxis hide/><Tooltip formatter={x=>money(x)}/><Bar dataKey="profit" fill="#3fb68c"/></BarChart></ResponsiveContainer></Panel></section>
    <section className="ledger"><div className="sectionTitle"><div><span className="eyebrow">HOLDINGS & PURCHASE HISTORY</span><h2>Your portfolio</h2></div><span className="lastUpdate"><CalendarDays/> {lastRefresh}</span></div><div className="tableWrap"><table><thead><tr><th>Instrument</th><th>Purchased on</th><th>Units</th><th>Invested</th><th>Current value</th><th>Profit / loss</th><th>Return</th></tr></thead><tbody>{holdings.map(h=><tr key={h.id}><td><b>{h.name}</b><code className={h.type}>{h.symbol} · {h.type==='fund'?'NAV DELAYED':'NSE/BSE'}</code></td><td>{h.buy_date||'—'}</td><td>{h.units}</td><td>{money(cost(h))}</td><td>{money(val(h))}</td><td className={val(h)>=cost(h)?'up':'down'}>{money(val(h)-cost(h))}</td><td className={returns(h)>=0?'up':'down'}>{returns(h).toFixed(2)}%</td></tr>)}</tbody></table></div></section>
  </main>
}
function Stat({label,value,tone=''}){return <article className={'stat '+tone}><span>{label}</span><b>{value}</b></article>}
function Panel({title,sub,children}){return <article className="panel"><h3>{title}</h3><p>{sub}</p>{children}</article>}
function App(){const [mode,setMode]=useState('setup'),[holdings,setHoldings]=useState(demoHoldings),[form,setForm]=useState(false);return mode==='setup'?<Setup onComplete={h=>{setHoldings(h);setMode('dash')}}/>:<><Dashboard holdings={holdings} onAdd={()=>setForm(true)}/>{form&&<TransactionForm onClose={()=>setForm(false)} onSave={x=>{setHoldings(h=>[...h,{id:crypto.randomUUID(),name:x.name,symbol:x.symbol,type:x.type,units:x.units,avg_cost:x.price,current_price:x.price,buy_date:x.date}]);setForm(false)}}/>}</>}
createRoot(document.getElementById('root')).render(<App/>)
