import { useState, useCallback } from 'react'

// ─── Config ───────────────────────────────────────────────────────────────
const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages'
let ANTHROPIC_KEY = localStorage.getItem('sauce_api_key') || ''
const GMAIL_MCP     = 'https://gmail.mcp.claude.com/mcp'
const MODEL         = 'claude-sonnet-4-20250514'

const BRAND = {
  red: '#E8291C', black: '#111111', offWhite: '#F5F0E8',
  blush: '#F5D5C8', darkBrown: '#3D0D0D',
}

const TODAY     = new Date()
const TODAY_STR = TODAY.toISOString().split('T')[0]
const MONTH     = TODAY.toLocaleString('en-US', { month: 'long' })
const YEAR      = TODAY.getFullYear()

const SEND_TIMES = { us_first: 'Tuesday 8am EST', india_first: 'Wednesday 9am IST', global: 'Tuesday 10am UTC' }

const BUCKET_ICONS = {
  'New Models & Research': '🚀', 'Video, Image & Audio Gen': '🎬',
  'Claude, Gemini & ChatGPT': '🤖', 'Agentic AI & Skills': '⚡',
  'Brands & Agencies Using AI': '📣', 'My Links': '🔗',
  'r/StableDiffusion': '🎨', 'r/comfyui': '🔧',
}

const TOPIC_BUCKETS = [
  { id: 'models_research',   label: 'New Models & Research',       enabled: true,  type: 'web',    queries: [`new AI model release ${MONTH} ${YEAR}`, `AI research paper ${MONTH} ${YEAR}`, `foundation model announcement ${MONTH} ${YEAR}`] },
  { id: 'video_image_audio', label: 'Video, Image & Audio Gen',    enabled: true,  type: 'web',    queries: [`AI video generation release ${MONTH} ${YEAR}`, `Flux Midjourney image AI ${MONTH} ${YEAR}`, `AI audio generation ${MONTH} ${YEAR}`] },
  { id: 'ai_assistants',     label: 'Claude, Gemini & ChatGPT',    enabled: true,  type: 'web',    queries: [`Claude Anthropic update ${MONTH} ${YEAR}`, `Gemini Google AI ${MONTH} ${YEAR}`, `ChatGPT OpenAI release ${MONTH} ${YEAR}`] },
  { id: 'agentic_skills',    label: 'Agentic AI & Skills',         enabled: true,  type: 'web',    queries: [`AI agents agentic workflow ${MONTH} ${YEAR}`, `MCP model context protocol ${MONTH} ${YEAR}`, `AI automation design ${MONTH} ${YEAR}`] },
  { id: 'brand_agency',      label: 'Brands & Agencies Using AI',  enabled: true,  type: 'web',    queries: [`ad agency AI creative ${MONTH} ${YEAR}`, `brand generative AI production ${MONTH} ${YEAR}`, `AI marketing creative ${MONTH} ${YEAR}`] },
  { id: 'reddit_sd',         label: 'r/StableDiffusion',           enabled: true,  type: 'reddit', subreddit: 'StableDiffusion' },
  { id: 'reddit_comfy',      label: 'r/comfyui',                   enabled: true,  type: 'reddit', subreddit: 'comfyui' },
  { id: 'x_handles',         label: 'X / Twitter Handles',         enabled: false, type: 'x',      handles: [] },
]

const GOALS  = ['thought_leadership','lead_gen','personal_brand','category_ownership']
const STAGES = ['bootstrapped','series_a','series_b','series_c_plus']
const ROLES  = ['founder','vp_director','pmm_content','enterprise_employee']
const GEOS   = ['us_first','india_first','global']

// ─── Scoring ──────────────────────────────────────────────────────────────
function recencyScore(d) {
  if (!d) return 3
  try {
    const days = Math.floor((TODAY - new Date(d)) / 86400000)
    if (days <= 1) return 10; if (days <= 3) return 9; if (days <= 7) return 8
    if (days <= 14) return 7; if (days <= 21) return 6; if (days <= 30) return 5
    return 2
  } catch { return 3 }
}
function compositeScore(a) {
  return Math.round((recencyScore(a.published_date) * 0.6 + (a.relevance_score || 5) * 0.4) * 10) / 10
}
function formatDate(d) {
  if (!d) return 'Date unknown'
  try {
    const days = Math.floor((TODAY - new Date(d)) / 86400000)
    if (days === 0) return 'Today'; if (days === 1) return 'Yesterday'
    if (days <= 6) return `${days}d ago`; if (days <= 13) return '1 week ago'
    if (days <= 27) return `${Math.ceil(days/7)}w ago`
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch { return d }
}
function recencyBadge(d) {
  const s = recencyScore(d)
  if (s >= 9) return { label: 'Today',     bg: BRAND.red,      color: '#fff' }
  if (s >= 8) return { label: 'This week', bg: BRAND.black,    color: BRAND.blush }
  if (s >= 6) return { label: 'Recent',    bg: BRAND.blush,    color: BRAND.red }
  return null
}

// ─── API ──────────────────────────────────────────────────────────────────
function callClaude(messages, system, useSearch = true) {
  const body = { model: MODEL, max_tokens: 1000, system: system || '', messages }
  if (useSearch) body.tools = [{ type: 'web_search_20250305', name: 'web_search' }]
  return fetch(ANTHROPIC_API, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' }, body: JSON.stringify(body) }).then(r => r.json())
}
function extractText(content) {
  return (content || []).filter(b => b.type === 'text').map(b => b.text).join('\n')
}

// ─── Scrapers ─────────────────────────────────────────────────────────────
async function scrapeWeb(bucket) {
  const q = bucket.queries[Math.floor(Math.random() * bucket.queries.length)]
  const data = await callClaude([{ role: 'user', content: `Today is ${TODAY_STR}. Search for 3 recently published articles about: "${q}". Prioritize last 7 days. Return ONLY raw JSON array:\n[{"title":"...","url":"...","source":"...","summary":"2-3 sentences why this matters","published_date":"YYYY-MM-DD or empty","og_image":"full https URL to article thumbnail/og image or empty string","bucket":"${bucket.id}","bucket_label":"${bucket.label}","relevance_score":8}]\nExactly 3 items newest first. No markdown.` }], `Research analyst. Today is ${TODAY_STR}. Return only raw valid JSON arrays.`)
  const text = extractText(data.content)
  const match = text.match(/\[[\s\S]*?\]/)
  if (!match) return []
  try { return JSON.parse(match[0]).map(a => ({ ...a, composite_score: compositeScore(a) })) } catch { return [] }
}

async function scrapeReddit(bucket) {
  try {
    const res = await fetch(`https://www.reddit.com/r/${bucket.subreddit}/hot.json?limit=5`, { headers: { 'User-Agent': 'the-sauce-newsletter/1.0' } })
    const json = await res.json()
    return (json?.data?.children || []).slice(0, 3).map(p => {
      const d = p.data
      const published_date = new Date(d.created_utc * 1000).toISOString().split('T')[0]
      return { title: d.title, url: d.url.startsWith('http') ? d.url : `https://reddit.com${d.permalink}`, source: `r/${bucket.subreddit}`, summary: d.selftext ? d.selftext.slice(0, 200).trim() + '…' : `${d.score} upvotes · ${d.num_comments} comments`, published_date, bucket: bucket.id, bucket_label: bucket.label, relevance_score: Math.min(10, Math.round(Math.log10(d.score + 1) * 3)), reddit_score: d.score, reddit_comments: d.num_comments, composite_score: 0 }
    }).map(a => ({ ...a, composite_score: compositeScore(a) }))
  } catch { return [] }
}

async function scrapeX(bucket) {
  if (!bucket.handles?.length) return []
  const handle = bucket.handles[Math.floor(Math.random() * bucket.handles.length)].replace('@', '')
  const data = await callClaude([{ role: 'user', content: `Today is ${TODAY_STR}. Search for recent posts from @${handle} on X about AI, generative AI, or creative tools. Return ONLY raw JSON array:\n[{"title":"post summary","url":"https://x.com/${handle}/status/...","source":"@${handle} on X","summary":"what was said and why it matters","published_date":"YYYY-MM-DD or empty","bucket":"${bucket.id}","bucket_label":"${bucket.label}","relevance_score":7}]\nUp to 3 items. No markdown.` }], `Social media analyst. Today is ${TODAY_STR}. Return only raw valid JSON arrays.`)
  const text = extractText(data.content)
  const match = text.match(/\[[\s\S]*?\]/)
  if (!match) return []
  try { return JSON.parse(match[0]).map(a => ({ ...a, composite_score: compositeScore(a) })) } catch { return [] }
}

async function enrichWithImages(articles) {
  return Promise.all(articles.map(async a => {
    try {
      const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(a.url)}`, { signal: AbortSignal.timeout(4000) })
      const data = await res.json()
      const html = data.contents || ''
      const m = html.match(/property=["']og:image["'][^>]*content=["']([^"']+)["']/) || html.match(/content=["']([^"']+)["'][^>]*property=["']og:image["']/)
      if (m?.[1]?.startsWith('http')) return { ...a, og_image: m[1] }
    } catch {}
    return { ...a, og_image: '' }
  }))
}

async function scrapeOneBucket(bucket) {
  if (bucket.type === 'reddit') return scrapeReddit(bucket)
  if (bucket.type === 'x') return scrapeX(bucket)
  return scrapeWeb(bucket)
}

async function fetchManualLink(url) {
  const data = await callClaude([{ role: 'user', content: `Extract metadata for this URL: ${url}\nReturn ONLY raw JSON: {"title":"...","source":"domain name","summary":"2-3 sentences","published_date":"YYYY-MM-DD or empty","relevance_score":8}` }], 'Research analyst. Return only raw valid JSON.', false)
  const text = extractText(data.content)
  const m = text.match(/\{[\s\S]*?\}/)
  if (!m) return null
  try { const meta = JSON.parse(m[0]); return { ...meta, url, bucket: 'manual', bucket_label: 'My Links', composite_score: compositeScore(meta) } } catch { return null }
}

async function generateDraft(ctx, articles) {
  const roleNote = ctx.role === 'founder' ? 'Write with direct founder POV.' : 'Use third-party validation and cite sources.'
  const list = articles.map((a, i) => `${i + 1}. [${a.bucket_label}] ${a.title} (${a.published_date || 'recent'}): ${a.summary}`).join('\n')
  const data = await callClaude([{ role: 'user', content: `Write a sharp AI/creative industry newsletter. Context: goal=${ctx.goal}, stage=${ctx.stage}, role=${ctx.role}. ${roleNote}. Tone: tactical, punchy. Today: ${TODAY_STR}.\n\nArticles:\n${list}\n\nReturn raw JSON only:\n{"subject_lines":["specific punchy","contrarian angle","direct utility"],"hook":"~75 words grabbing from a specific trend","core_insight":"~200 words — key pattern with named examples and data","playbook":["action 1","action 2","action 3","action 4"],"cta":"one sentence for ${ctx.goal}"}` }], 'Expert AI newsletter writer. Return only raw valid JSON, no markdown.', false)
  const text = extractText(data.content)
  const m = text.match(/\{[\s\S]*\}/)
  if (!m) throw new Error('No JSON')
  return JSON.parse(m[0])
}

async function sendViaGmail(to, subject, htmlBody) {
  return fetch(ANTHROPIC_API, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, max_tokens: 500, mcp_servers: [{ type: 'url', url: GMAIL_MCP, name: 'gmail-mcp' }], messages: [{ role: 'user', content: `Send email via Gmail:\nTo: ${to}\nSubject: ${subject}\nHTML Body: ${htmlBody}` }] })
  }).then(r => r.json())
}

// ─── Email HTML builder ────────────────────────────────────────────────────
function buildEmailHTML(ctx, draft, articles) {
  const date   = TODAY.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const F      = 'Georgia, "Times New Roman", Times, serif'
  const FS     = 'Helvetica Neue, Helvetica, Arial, sans-serif'
  const RED    = BRAND.red
  const BLACK  = BRAND.black
  const BG     = '#EBEBEB'
  const LOGO   = 'https://the-sauce-newsletter.netlify.app/logo.png'

  const tagColor = () => ({ bg: '#E8E8E8', color: '#111111' })

  const articleCard = (a, isFirst) => {
    const tag = tagColor(a.bucket_label)
    const hasImg = !!a.og_image
    const imgBlock = hasImg
      ? `<tr><td style="padding:0;line-height:0;font-size:0;">
           <a href="${a.url}" style="display:block;line-height:0;"><img src="${a.og_image}" width="560" alt="" style="display:block;width:100%;max-width:560px;height:auto;border-radius:10px 10px 0 0;background:#ddd;" /></a>
         </td></tr>`
      : `<tr><td bgcolor="#F0EFED" style="height:${isFirst ? 200 : 140}px;border-radius:10px 10px 0 0;text-align:center;vertical-align:middle;padding:24px;">
           <p style="margin:0;font-family:${FS};font-size:11px;font-weight:600;color:#999;text-transform:uppercase;letter-spacing:2px;">${a.source || a.bucket_label}</p>
         </td></tr>`

    const topPad = isFirst ? '20px 20px 0' : '16px 20px 0'

    return `
    <tr><td style="padding:0 0 20px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #EBEBEB;">
        ${imgBlock}
        <tr><td style="padding:${topPad};">
          <table cellpadding="0" cellspacing="0" border="0"><tr>
            <td bgcolor="${tag.bg}" style="border-radius:100px;padding:4px 12px;">
              <span style="font-family:${FS};font-size:10px;font-weight:600;color:${tag.color};text-transform:uppercase;letter-spacing:1px;">${a.bucket_label}</span>
            </td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:12px 20px 8px;">
          <h2 style="margin:0;font-family:${F};font-size:${isFirst ? 22 : 18}px;font-weight:700;color:${BLACK};line-height:1.35;letter-spacing:-0.3px;">
            <a href="${a.url}" style="color:${BLACK};text-decoration:none;">${a.title}</a>
          </h2>
        </td></tr>
        <tr><td style="padding:0 20px 16px;">
          <p style="margin:0;font-family:${FS};font-size:14px;color:#555;line-height:1.7;">${a.summary}</p>
        </td></tr>
        <tr><td style="padding:0 20px 20px;border-top:1px solid #F2F2F2;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td valign="middle" style="padding-top:14px;">
              <span style="font-family:${FS};font-size:12px;color:#999;">${a.source || ''}${a.published_date ? ` · ${new Date(a.published_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}</span>
            </td>
            <td valign="middle" align="right" style="padding-top:14px;">
              <a href="${a.url}" style="font-family:${FS};font-size:13px;font-weight:600;color:${RED};text-decoration:none;letter-spacing:-0.2px;">Read → </a>
            </td>
          </tr></table>
        </td></tr>
      </table>
    </td></tr>`
  }

  const articleRows = articles.map((a, i) => articleCard(a, i === 0)).join('')

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<meta name="color-scheme" content="light"/>
<title>The Sauce — ${date}</title>
<style type="text/css">
  body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
  table,td{mso-table-lspace:0pt;mso-table-rspace:0pt}
  img{-ms-interpolation-mode:bicubic;border:0;outline:none;text-decoration:none}
  body{margin:0;padding:0;background-color:${BG}}
  a{color:inherit}
  @media only screen and (max-width:600px){
    .wrapper{width:100%!important;padding:16px!important}
    .inner{padding:0 4px!important}
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:${BG};">
<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${BG}">
<tr><td align="center" style="padding:40px 20px 48px;" class="wrapper">
  <table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;" class="inner">

    <!-- Logo / Header -->
    <tr><td style="padding-bottom:28px;text-align:center;">
      <p style="margin:0 0 16px;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-size:10px;font-weight:700;color:#aaa;text-transform:uppercase;letter-spacing:3px;">${date}</p>
      <img src="${LOGO}" width="220" alt="SECRETSAUCE" style="display:inline-block;width:220px;height:auto;border:0;outline:none;" />
      <p style="margin:20px 0 0;font-family:${F};font-size:22px;color:${BLACK};line-height:1.4;font-style:italic;">Hi James, here is your<br/>daily AI chef notes</p>
    </td></tr>

    <!-- Divider -->
    <tr><td style="padding-bottom:24px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-top:2px solid ${BLACK};font-size:0;line-height:0;">&nbsp;</td></tr></table>
    </td></tr>

    <!-- Articles -->
    <tr><td>
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        ${articleRows}
      </table>
    </td></tr>

    <!-- Footer -->
    <tr><td style="padding-top:32px;text-align:center;border-top:1px solid #E5E5E5;">
      <p style="margin:0 0 6px;font-family:${FS};font-size:11px;color:#aaa;text-transform:uppercase;letter-spacing:2px;">The Sauce by SECRETSAUCE</p>
      <p style="margin:0;font-family:${F};font-size:12px;color:#bbb;font-style:italic;">get saucy with us · ${SEND_TIMES[ctx.geo]}</p>
    </td></tr>

  </table>
</td></tr>
</table>
</body>
</html>`
}

// ─── Validation ───────────────────────────────────────────────────────────
function ValidationChecklist({ ctx, draft, articles }) {
  const dated = articles.filter(a => a.published_date).length
  const fresh  = articles.filter(a => recencyScore(a.published_date) >= 7).length
  const checks = [
    { label: 'Freshness',      pass: fresh >= 3,                           note: `${fresh}/${articles.length} from last 7 days` },
    { label: 'Dates captured', pass: dated === articles.length,            note: dated === articles.length ? 'All dated' : `${articles.length - dated} missing` },
    { label: 'Subject lines',  pass: (draft.subject_lines?.length || 0) >= 3, note: '3 options — A/B test' },
    { label: 'CTA',            pass: !!draft.cta,                          note: 'Add UTM before sending' },
    { label: 'Send time',      pass: true,                                 note: SEND_TIMES[ctx.geo] },
  ]
  return (
    <div style={{ background: '#f5f0e8', borderRadius: 8, padding: '12px 16px', marginBottom: '1.25rem', border: '1px solid rgba(0,0,0,0.08)' }}>
      <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: '#999' }}>Validation</p>
      {checks.map((c, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, padding: '3px 0', alignItems: 'baseline' }}>
          <span style={{ fontSize: 12, color: c.pass ? '#27AE60' : '#E8291C', flexShrink: 0, minWidth: 14 }}>{c.pass ? '✓' : '!'}</span>
          <span style={{ fontSize: 13, fontWeight: 500 }}>{c.label}</span>
          <span style={{ fontSize: 12, color: '#999' }}>— {c.note}</span>
        </div>
      ))}
    </div>
  )
}

function ScoreBar({ score }) {
  const pct   = Math.round((score / 10) * 100)
  const color = score >= 8 ? BRAND.red : score >= 6 ? '#1D4ED8' : '#aaa'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ flex: 1, height: 3, background: '#e5e5e0', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2 }} />
      </div>
      <span style={{ fontSize: 11, color, minWidth: 22, textAlign: 'right' }}>{score.toFixed(1)}</span>
    </div>
  )
}

// ─── Step machine ─────────────────────────────────────────────────────────
const STEP = { CONTEXT: 'context', SCRAPING: 'scraping', REVIEW: 'review', GENERATING: 'generating', DRAFT: 'draft', PREVIEW: 'preview', SENDING: 'sending', DONE: 'done' }
const DEFAULT_CTX = { goal: 'thought_leadership', stage: 'bootstrapped', role: 'founder', geo: 'us_first' }

const BUCKET_PILLS = {
  models_research:   { bg: '#EBF5FF', color: '#1D4ED8' },
  video_image_audio: { bg: '#FFF7E6', color: '#B45309' },
  ai_assistants:     { bg: '#ECFDF5', color: '#065F46' },
  agentic_skills:    { bg: '#FEF2F2', color: '#991B1B' },
  brand_agency:      { bg: '#F5F0E8', color: '#666' },
  reddit_sd:         { bg: '#FFF0E8', color: '#C44E00' },
  reddit_comfy:      { bg: '#FFF0E8', color: '#C44E00' },
  x_handles:         { bg: '#EBF5FF', color: '#1D4ED8' },
  manual:            { bg: '#111', color: BRAND.red },
}

function Label({ children }) {
  return <p style={{ margin: '0 0 5px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: '#999' }}>{children}</p>
}
function Sel({ value, onChange, options }) {
  return <select value={value} onChange={e => onChange(e.target.value)} style={{ width: '100%', fontSize: 13 }}>{options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
}

// ─── App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [apiKey,     setApiKey]     = useState(() => localStorage.getItem('sauce_api_key') || '')
  const [step,       setStep]       = useState(STEP.CONTEXT)
  const [ctx,        setCtx]        = useState(DEFAULT_CTX)
  const [buckets,    setBuckets]    = useState(TOPIC_BUCKETS)
  const [xHandles,   setXHandles]   = useState('')
  const [manualLinks,setManualLinks]= useState('')
  const [articles,   setArticles]   = useState([])
  const [selected,   setSelected]   = useState({})
  const [editedSum,  setEditedSum]  = useState({})
  const [draft,      setDraft]      = useState(null)
  const [ed,         setEd]         = useState(null)
  const [previewHtml,setPreviewHtml]= useState('')
  const [recipient,  setRecipient]  = useState('')
  const [scraping,   setScraping]   = useState('')
  const [doneBkts,   setDoneBkts]   = useState([])
  const [error,      setError]      = useState('')
  const [activeSub,  setActiveSub]  = useState(0)
  const [editingIdx, setEditingIdx] = useState(null)
  const [sortBy,     setSortBy]     = useState('score')

  const setC = (k, v) => setCtx(c => ({ ...c, [k]: v }))
  const toggleBucket = id => setBuckets(bs => bs.map(b => b.id === id ? { ...b, enabled: !b.enabled } : b))

  const scrape = useCallback(async () => {
    const activeBuckets = buckets.map(b => b.id === 'x_handles' && xHandles.trim() ? { ...b, handles: xHandles.split(/[\s,]+/).filter(Boolean) } : b).filter(b => b.enabled)
    const hasManual = manualLinks.trim().length > 0
    if (!activeBuckets.length && !hasManual) { setError('Enable at least one topic or paste some links.'); return }
    setStep(STEP.SCRAPING); setError(''); setArticles([]); setDoneBkts([])
    const all = []
    if (hasManual) {
      setScraping('Your links')
      const urls = manualLinks.split(/[\n,]/).map(u => u.trim()).filter(u => u.startsWith('http'))
      for (const url of urls) { const a = await fetchManualLink(url); if (a) all.push(a) }
      setDoneBkts(d => [...d, 'manual'])
    }
    for (const bucket of activeBuckets) {
      setScraping(bucket.label)
      const arts = await scrapeOneBucket(bucket)
      const enriched = await enrichWithImages(arts)
      all.push(...enriched)
      setDoneBkts(d => [...d, bucket.id])
    }
    const sel = {}; all.forEach((_, i) => sel[i] = true)
    setArticles(all); setSelected(sel); setEditedSum({})
    setScraping(''); setStep(STEP.REVIEW)
  }, [buckets, xHandles, manualLinks])

  const sortedIndices = useCallback(arts => {
    const idx = arts.map((a, i) => ({ a, i }))
    if (sortBy === 'date') return idx.sort((x, y) => new Date(y.a.published_date || 0) - new Date(x.a.published_date || 0))
    if (sortBy === 'relevance') return idx.sort((x, y) => (y.a.relevance_score || 0) - (x.a.relevance_score || 0))
    return idx.sort((x, y) => (y.a.composite_score || 0) - (x.a.composite_score || 0))
  }, [sortBy])

  const generate = useCallback(async () => {
    const approved = articles.filter((_, i) => selected[i]).map(a => ({ ...a, summary: editedSum[articles.indexOf(a)] ?? a.summary }))
    if (approved.length < 2) { setError('Select at least 2 articles.'); return }
    setStep(STEP.GENERATING); setError('')
    try {
      const d = await generateDraft(ctx, approved)
      setDraft(d); setEd(JSON.parse(JSON.stringify(d))); setStep(STEP.DRAFT)
    } catch { setError('Draft generation failed. Try again.'); setStep(STEP.REVIEW) }
  }, [ctx, articles, selected, editedSum])

  const goPreview = useCallback(() => {
    const approved = articles.filter((_, i) => selected[i]).map(a => ({ ...a, summary: editedSum[articles.indexOf(a)] ?? a.summary }))
    const html = buildEmailHTML(ctx, ed, approved)
    setPreviewHtml(html)
    setStep(STEP.PREVIEW)
  }, [ctx, ed, articles, selected, editedSum])

  const send = useCallback(async () => {
    if (!recipient.includes('@')) { setError('Enter a valid email.'); return }
    setStep(STEP.SENDING); setError('')
    try {
      await sendViaGmail(recipient, ed.subject_lines[activeSub], previewHtml)
      setStep(STEP.DONE)
    } catch { setError('Send failed. Check Gmail connection.'); setStep(STEP.PREVIEW) }
  }, [recipient, ed, activeSub, previewHtml])

  const reset = () => { setStep(STEP.CONTEXT); setArticles([]); setSelected({}); setDraft(null); setEd(null); setRecipient(''); setError(''); setCtx(DEFAULT_CTX); setBuckets(TOPIC_BUCKETS); setEditingIdx(null); setDoneBkts([]); setPreviewHtml(''); setManualLinks('') }

  const approvedCount = Object.values(selected).filter(Boolean).length
  const stepLabels    = ['Setup', 'Review', 'Draft', 'Preview', 'Send']
  const stepIdx       = { [STEP.CONTEXT]: 0, [STEP.SCRAPING]: 0, [STEP.REVIEW]: 1, [STEP.GENERATING]: 1, [STEP.DRAFT]: 2, [STEP.PREVIEW]: 3, [STEP.SENDING]: 4, [STEP.DONE]: 4 }
  const cur           = stepIdx[step] ?? 0

  const inputStyle  = { width: '100%', fontSize: 13, padding: '8px 12px', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 8, boxSizing: 'border-box', fontFamily: 'inherit', background: '#fff', color: '#111' }
  const taStyle     = { ...inputStyle, minHeight: 80, resize: 'vertical', lineHeight: 1.7 }
  const redBtn      = { fontSize: 14, padding: '12px 32px', background: BRAND.red, color: '#fff', border: 'none', borderRadius: 100, cursor: 'pointer', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '2rem 1rem' }}>
      <style>{`@keyframes pulse{0%,100%{opacity:.2}50%{opacity:1}}`}</style>

      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ background: BRAND.red, color: '#fff', padding: '3px 12px', borderRadius: 3, fontSize: 13, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>THE SAUCE</div>
              <span style={{ fontSize: 12, color: '#999' }}>by SECRETSAUCE</span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#999' }}>AI · Creative · Production newsletter studio</p>
          </div>
          {step !== STEP.CONTEXT && <button onClick={reset} style={{ fontSize: 12 }}>Start over</button>}
        </div>

        {/* Progress bar */}
        <div style={{ display: 'flex', marginTop: '1rem', borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.1)' }}>
          {stepLabels.map((l, i) => (
            <div key={i} style={{ flex: 1, padding: '7px 0', textAlign: 'center', fontSize: 11, fontWeight: i === cur ? 600 : 400, background: i === cur ? '#f5f0e8' : '#fff', color: i <= cur ? '#111' : '#bbb', borderRight: i < 4 ? '1px solid rgba(0,0,0,0.08)' : 'none', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              {i < cur ? '✓ ' : ''}{l}
            </div>
          ))}
        </div>
      </div>

      {error && <div style={{ padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, color: '#991B1B', fontSize: 13, marginBottom: '1rem' }}>{error}</div>}

      {/* ── Setup ── */}
      {(step === STEP.CONTEXT || step === STEP.SCRAPING) && (
        <div>
          <Label>Topic sources</Label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: '1.25rem' }}>
            {buckets.map(b => {
              const isDone = doneBkts.includes(b.id); const isActive = scraping === b.label
              const pill = BUCKET_PILLS[b.id] || BUCKET_PILLS.brand_agency
              return (
                <div key={b.id}>
                  <div onClick={() => step === STEP.CONTEXT && toggleBucket(b.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 8, border: `1px solid ${b.enabled ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.07)'}`, background: b.enabled ? '#fff' : '#fafaf8', cursor: step === STEP.CONTEXT ? 'pointer' : 'default', opacity: b.enabled ? 1 : 0.5 }}>
                    <div style={{ width: 32, height: 18, borderRadius: 9, background: b.enabled ? BRAND.red : '#ccc', position: 'relative', flexShrink: 0, transition: 'background 0.15s' }}>
                      <div style={{ position: 'absolute', top: 3, left: b.enabled ? 16 : 3, width: 12, height: 12, borderRadius: '50%', background: '#fff', transition: 'left 0.15s' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 14, fontWeight: 500 }}>{b.label}</span>
                      <span style={{ marginLeft: 8, fontSize: 11, padding: '2px 7px', borderRadius: 6, background: pill.bg, color: pill.color }}>{b.type === 'reddit' ? 'Reddit' : b.type === 'x' ? 'X / Twitter' : 'Web'}</span>
                    </div>
                    {isActive && <div style={{ display: 'flex', gap: 4 }}>{[0,1,2].map(i => <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: '#aaa', animation: `pulse 1.2s ease-in-out ${i*0.2}s infinite` }} />)}</div>}
                    {isDone && !isActive && <span style={{ fontSize: 13, color: '#27AE60' }}>✓</span>}
                  </div>
                  {b.id === 'x_handles' && b.enabled && step === STEP.CONTEXT && (
                    <div style={{ padding: '8px 14px 10px', background: '#fafaf8', borderRadius: '0 0 8px 8px', border: '1px solid rgba(0,0,0,0.08)', borderTop: 'none', marginTop: -1 }}>
                      <input value={xHandles} onChange={e => setXHandles(e.target.value)} placeholder="@sama, @karpathy, @emostaque ..." style={inputStyle} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <Label>My links — paste URLs to include</Label>
          <div style={{ marginBottom: '1.25rem' }}>
            <textarea value={manualLinks} onChange={e => setManualLinks(e.target.value)} placeholder={'https://example.com/article-1\nhttps://example.com/article-2\n\nOne URL per line'} style={{ ...taStyle, minHeight: 80, fontFamily: 'monospace', fontSize: 12 }} />
            {manualLinks.trim() && <p style={{ margin: '5px 0 0', fontSize: 11, color: '#999' }}>{manualLinks.split(/[\n,]/).map(u => u.trim()).filter(u => u.startsWith('http')).length} URL(s) detected</p>}
          </div>

          <Label>Context</Label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: '1.25rem' }}>
            {[['goal', GOALS], ['stage', STAGES], ['role', ROLES], ['geo', GEOS]].map(([k, opts]) => (
              <div key={k}><p style={{ margin: '0 0 4px', fontSize: 12, color: '#999', textTransform: 'capitalize' }}>{k}</p>
                <Sel value={ctx[k]} onChange={v => setC(k, v)} options={opts.map(g => ({ value: g, label: g.replace(/_/g, ' ') }))} />
              </div>
            ))}
          </div>

          <Label>Anthropic API key</Label>
          <div style={{ marginBottom: '1.25rem' }}>
            <input type="password" value={apiKey} onChange={e => { setApiKey(e.target.value); ANTHROPIC_KEY = e.target.value; localStorage.setItem('sauce_api_key', e.target.value) }} placeholder="sk-ant-..." style={inputStyle} />
            {!apiKey && <p style={{ margin: '5px 0 0', fontSize: 11, color: BRAND.red }}>Required — get yours at console.anthropic.com</p>}
          </div>

          {step === STEP.SCRAPING
            ? <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><span style={{ fontSize: 13, color: '#666' }}>Fetching {scraping}...</span></div>
            : <button onClick={scrape} disabled={!apiKey} style={{ ...redBtn, opacity: apiKey ? 1 : 0.4, cursor: apiKey ? 'pointer' : 'not-allowed' }}>Fetch articles ({buckets.filter(b => b.enabled).length} sources) →</button>}
        </div>
      )}

      {/* ── Review ── */}
      {step === STEP.REVIEW && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: 8 }}>
            <p style={{ margin: 0, fontSize: 14, color: '#666' }}>{approvedCount}/{articles.length} selected</p>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: '#999' }}>Sort:</span>
              {['score','date','relevance'].map(s => <button key={s} onClick={() => setSortBy(s)} style={{ fontSize: 11, padding: '3px 9px', background: sortBy === s ? '#f5f0e8' : 'transparent', fontWeight: sortBy === s ? 600 : 400, border: '1px solid rgba(0,0,0,0.1)', borderRadius: 6, cursor: 'pointer' }}>{s === 'score' ? 'Best match' : s === 'date' ? 'Newest' : 'Relevance'}</button>)}
              <button onClick={generate} style={{ ...redBtn, fontSize: 13, padding: '7px 16px' }}>Generate draft ↗</button>
            </div>
          </div>

          {/* My Links group */}
          {articles.some(a => a.bucket === 'manual') && (() => {
            const pairs = sortedIndices(articles).filter(({ a }) => a.bucket === 'manual')
            return (
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', padding: '3px 8px', borderRadius: 6, background: '#111', color: BRAND.red }}>My Links</span>
                </div>
                {pairs.map(({ a, i }) => <ArticleCard key={i} a={a} i={i} selected={selected} setSelected={setSelected} editedSum={editedSum} setEditedSum={setEditedSum} editingIdx={editingIdx} setEditingIdx={setEditingIdx} />)}
              </div>
            )
          })()}

          {buckets.filter(b => b.enabled && articles.some(a => a.bucket === b.id || a.bucket_label === b.label)).map(bucket => {
            const pairs = sortedIndices(articles).filter(({ a }) => a.bucket === bucket.id || a.bucket_label === bucket.label)
            if (!pairs.length) return null
            const pill = BUCKET_PILLS[bucket.id] || BUCKET_PILLS.brand_agency
            return (
              <div key={bucket.id} style={{ marginBottom: '1.5rem' }}>
                <div style={{ marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', padding: '3px 8px', borderRadius: 6, background: pill.bg, color: pill.color }}>{bucket.label}</span>
                </div>
                {pairs.map(({ a, i }) => <ArticleCard key={i} a={a} i={i} selected={selected} setSelected={setSelected} editedSum={editedSum} setEditedSum={setEditedSum} editingIdx={editingIdx} setEditingIdx={setEditingIdx} />)}
              </div>
            )
          })}
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
            <button onClick={generate} style={redBtn}>Generate draft ↗</button>
          </div>
        </div>
      )}

      {step === STEP.GENERATING && (
        <div style={{ padding: '3rem 0', textAlign: 'center' }}>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: '1rem' }}>
            {[0,1,2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: BRAND.red, animation: `pulse 1.2s ease-in-out ${i*0.2}s infinite` }} />)}
          </div>
          <p style={{ fontSize: 14, color: '#666', margin: 0 }}>Writing hook · core insight · playbook · CTA...</p>
        </div>
      )}

      {/* ── Draft ── */}
      {step === STEP.DRAFT && ed && (
        <div>
          <ValidationChecklist ctx={ctx} draft={ed} articles={articles.filter((_, i) => selected[i])} />

          <div style={{ marginBottom: '1.25rem' }}>
            <Label>Subject lines — pick one</Label>
            {ed.subject_lines.map((s, i) => (
              <div key={i} onClick={() => setActiveSub(i)} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '9px 12px', marginBottom: 6, borderRadius: 8, border: `1px solid ${activeSub === i ? BRAND.red : 'rgba(0,0,0,0.1)'}`, background: activeSub === i ? '#FFF5F5' : '#fff', cursor: 'pointer' }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', border: `1.5px solid ${activeSub === i ? BRAND.red : '#ccc'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {activeSub === i && <div style={{ width: 7, height: 7, borderRadius: '50%', background: BRAND.red }} />}
                </div>
                <span style={{ fontSize: 13 }}>{s}</span>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: '1.25rem' }}><Label>Hook</Label><textarea value={ed.hook} onChange={e => setEd(d => ({ ...d, hook: e.target.value }))} style={{ ...taStyle, minHeight: 80 }} /></div>
          <div style={{ marginBottom: '1.25rem' }}><Label>Core insight</Label><textarea value={ed.core_insight} onChange={e => setEd(d => ({ ...d, core_insight: e.target.value }))} style={{ ...taStyle, minHeight: 120 }} /></div>

          <div style={{ marginBottom: '1.25rem' }}>
            <Label>Playbook steps</Label>
            {ed.playbook.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: BRAND.red, color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i+1}</div>
                <input value={s} onChange={e => setEd(d => { const p = [...d.playbook]; p[i] = e.target.value; return { ...d, playbook: p } })} style={{ ...inputStyle }} />
              </div>
            ))}
          </div>

          <div style={{ marginBottom: '1.5rem' }}><Label>CTA</Label><input value={ed.cta} onChange={e => setEd(d => ({ ...d, cta: e.target.value }))} style={inputStyle} /></div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={goPreview} style={redBtn}>Preview email →</button>
          </div>
        </div>
      )}

      {/* ── Preview ── */}
      {step === STEP.PREVIEW && previewHtml && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem', padding: '10px 14px', background: '#f5f0e8', borderRadius: 8, border: '1px solid rgba(0,0,0,0.08)' }}>
            <div style={{ background: BRAND.red, color: '#fff', padding: '3px 10px', borderRadius: 3, fontSize: 11, fontWeight: 700, letterSpacing: '1px', flexShrink: 0 }}>THE SAUCE</div>
            <span style={{ fontSize: 12, color: '#666', flex: 1 }}>Bulletproof table HTML · Outlook + Gmail + Apple Mail</span>
            <button onClick={() => setStep(STEP.DRAFT)} style={{ fontSize: 12 }}>← Edit draft</button>
          </div>

          {/* Fake email client chrome */}
          <div style={{ border: `2px solid ${BRAND.black}`, borderRadius: 6, overflow: 'hidden', marginBottom: '1.25rem' }}>
            <div style={{ background: '#f0ede8', borderBottom: '1px solid rgba(0,0,0,0.1)', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ display: 'flex', gap: 5 }}>
                {[BRAND.red, '#F5A623', '#27AE60'].map((c, i) => <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />)}
              </div>
              <div style={{ flex: 1, background: '#fff', borderRadius: 4, padding: '4px 10px', fontSize: 11, color: '#666', border: '1px solid rgba(0,0,0,0.1)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                {ed.subject_lines[activeSub]}
              </div>
            </div>
            <iframe srcDoc={previewHtml} style={{ width: '100%', height: 700, border: 'none', display: 'block' }} title="Email preview" sandbox="allow-same-origin" />
          </div>

          {/* Send */}
          <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 12, padding: '16px' }}>
            <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 500 }}>Looks good? Send via Gmail</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="email" placeholder="recipient@example.com" value={recipient} onChange={e => setRecipient(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
              <button onClick={send} style={{ ...redBtn, fontSize: 14, padding: '10px 24px' }}>Send ↗</button>
            </div>
            <p style={{ margin: '8px 0 0', fontSize: 12, color: '#999' }}>Recommended: {SEND_TIMES[ctx.geo]}</p>
          </div>
        </div>
      )}

      {step === STEP.SENDING && (
        <div style={{ padding: '3rem 0', textAlign: 'center' }}>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: '1rem' }}>
            {[0,1,2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: BRAND.red, animation: `pulse 1.2s ease-in-out ${i*0.2}s infinite` }} />)}
          </div>
          <p style={{ fontSize: 14, color: '#666', margin: 0 }}>Sending The Sauce via Gmail...</p>
        </div>
      )}

      {step === STEP.DONE && (
        <div style={{ padding: '3rem 0', textAlign: 'center' }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: BRAND.red, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <span style={{ fontSize: 24, color: '#fff' }}>✓</span>
          </div>
          <p style={{ fontSize: 16, fontWeight: 600, margin: '0 0 6px' }}>The Sauce is sent 🔥</p>
          <p style={{ fontSize: 13, color: '#666', margin: '0 0 4px' }}>Delivered to {recipient}</p>
          <p style={{ fontSize: 12, color: '#aaa', margin: '0 0 1.5rem' }}>"{ed?.subject_lines[activeSub]}"</p>
          <button onClick={reset} style={redBtn}>Cook up the next issue</button>
        </div>
      )}
    </div>
  )
}

// ─── ArticleCard component ─────────────────────────────────────────────────
function ArticleCard({ a, i, selected, setSelected, editedSum, setEditedSum, editingIdx, setEditingIdx }) {
  const badge = recencyBadge(a.published_date)
  return (
    <div style={{ background: '#fff', border: `1px solid ${selected[i] ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.07)'}`, borderRadius: 12, padding: '13px 15px', marginBottom: 7, opacity: selected[i] ? 1 : 0.4, transition: 'opacity 0.15s' }}>
      <div style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
        <input type="checkbox" checked={!!selected[i]} onChange={() => setSelected(s => ({ ...s, [i]: !s[i] }))} style={{ marginTop: 4, flexShrink: 0, width: 'auto' }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 4, flexWrap: 'wrap' }}>
            <a href={a.url} target="_blank" rel="noreferrer" style={{ fontSize: 14, fontWeight: 500, color: '#111', textDecoration: 'none', flex: 1, minWidth: 0 }}
              onMouseEnter={e => e.target.style.textDecoration = 'underline'}
              onMouseLeave={e => e.target.style.textDecoration = 'none'}>{a.title}</a>
            {badge && <span style={{ fontSize: 10, padding: '2px 7px', background: badge.bg, color: badge.color, borderRadius: 6, flexShrink: 0, whiteSpace: 'nowrap', fontWeight: 600 }}>{badge.label}</span>}
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: '#999' }}>{a.source}</span>
            {a.published_date
              ? <span style={{ fontSize: 11, color: '#666' }}>{new Date(a.published_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · {formatDate(a.published_date)}</span>
              : <span style={{ fontSize: 11, color: '#aaa', fontStyle: 'italic' }}>Date unknown</span>}
            {a.reddit_score && <span style={{ fontSize: 11, color: '#C44E00' }}>↑{Number(a.reddit_score).toLocaleString()}</span>}
          </div>
          <div style={{ marginBottom: 8 }}><ScoreBar score={a.composite_score || 5} /></div>
          {editingIdx === i
            ? <div>
                <textarea value={editedSum[i] ?? a.summary} onChange={e => setEditedSum(s => ({ ...s, [i]: e.target.value }))} style={{ width: '100%', minHeight: 60, fontSize: 13, padding: '6px 8px', resize: 'vertical', borderRadius: 8, border: '1px solid rgba(0,0,0,0.12)', background: '#fafaf8', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                <button onClick={() => setEditingIdx(null)} style={{ fontSize: 12, marginTop: 4, padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.1)', cursor: 'pointer', background: '#fff' }}>Done</button>
              </div>
            : <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <p style={{ margin: 0, fontSize: 13, color: '#666', lineHeight: 1.6, flex: 1 }}>{editedSum[i] ?? a.summary}</p>
                <button onClick={() => setEditingIdx(i)} style={{ fontSize: 11, padding: '3px 8px', flexShrink: 0, borderRadius: 6, border: '1px solid rgba(0,0,0,0.1)', cursor: 'pointer', background: '#fff' }}>Edit</button>
              </div>}
        </div>
      </div>
    </div>
  )
}
