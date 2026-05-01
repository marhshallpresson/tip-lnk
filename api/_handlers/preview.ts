import type { VercelRequest, VercelResponse } from "@vercel/node"
import fs from "fs"
import path from "path"
import { fetchProfileByWalletOrHandle } from "../_lib/profiles.js"

/**
 * Dynamic Preview Handler
 * Intercepts /:username requests to serve HTML with dynamic Open Graph tags.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const url = new URL(req.url || '', `http://${req.headers.host}`)
  const pathParts = url.pathname.split('/').filter(Boolean)
  
  // If it's an API call or a static file, we shouldn't be here (vercel.json should prevent this)
  // but as a fallback:
  if (pathParts[0] === 'api' || pathParts[0]?.includes('.')) {
    return res.status(404).end()
  }

  const username = pathParts[0]
  if (!username) return serveStaticIndex(res)

  try {
    const profileData = await fetchProfileByWalletOrHandle(username)
    
    if (!profileData) {
      return serveStaticIndex(res)
    }

    const { profile, metadata } = profileData
    const displayName = profile.displayName || username

    // Read index.html
    const indexPath = path.join(process.cwd(), 'dist', 'index.html')
    let html = ''
    
    try {
      html = fs.readFileSync(indexPath, 'utf8')
    } catch (e) {
      // Fallback for dev or missing dist
      html = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf8')
    }

    // Dynamic Meta Tags Replacement
    const metaTags = `
  <title>${metadata.title}</title>
  <meta name="description" content="${metadata.description}">
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://tipstack.fun/${username}">
  <meta property="og:title" content="${metadata.title}">
  <meta property="og:description" content="${metadata.description}">
  <meta property="og:image" content="${metadata.image}">

  <!-- Twitter -->
  <meta property="twitter:card" content="${metadata.card}">
  <meta property="twitter:url" content="https://tipstack.fun/${username}">
  <meta property="twitter:title" content="${metadata.title}">
  <meta property="twitter:description" content="${metadata.description}">
  <meta property="twitter:image" content="${metadata.image}">
    `

    // Inject before </head> or replace existing block
    // We'll replace the Primary Meta Tags section if it exists, or just inject into head
    html = html.replace(/<title>.*?<\/title>/, '')
    html = html.replace(/<meta name="description" content=".*?">/, '')
    html = html.replace(/<!-- Primary Meta Tags -->[\s\S]*?<!-- Structured Data/, '<!-- Dynamic Meta Tags -->' + metaTags + '\n  <!-- Structured Data')

    res.setHeader('Content-Type', 'text/html')
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30')
    return res.status(200).send(html)

  } catch (err) {
    console.error('Preview Handler Error:', err)
    return serveStaticIndex(res)
  }
}

function serveStaticIndex(res: VercelResponse) {
  try {
    const indexPath = path.join(process.cwd(), 'dist', 'index.html')
    const html = fs.readFileSync(indexPath, 'utf8')
    res.setHeader('Content-Type', 'text/html')
    return res.status(200).send(html)
  } catch (e) {
    // If dist doesn't exist, we might be in dev
    const indexPath = path.join(process.cwd(), 'index.html')
    const html = fs.readFileSync(indexPath, 'utf8')
    res.setHeader('Content-Type', 'text/html')
    return res.status(200).send(html)
  }
}
