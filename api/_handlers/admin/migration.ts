import type { VercelRequest, VercelResponse } from "@vercel/node"
import { db } from "../../_lib/db.js"

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  console.log('🚀 Starting Domain Migration...')
  const results = {
    migratedDomains: 0,
    scrubbedProfiles: 0,
    errors: [] as string[]
  }
  
  try {
    // 1. Update solDomain: replace .tiplnk.sol with .tipstack.sol
    const users = await db('user').where('solDomain', 'like', '%.tiplnk.sol')
    for (const user of users) {
      try {
        const newDomain = user.solDomain.replace('.tiplnk.sol', '.tipstack.sol')
        await db('user').where({ id: user.id }).update({ solDomain: newDomain })
        results.migratedDomains++
      } catch (e: any) {
        results.errors.push(`Domain migration error for ${user.id}: ${e.message}`)
      }
    }

    // 2. Flush any references to tiplink.so in profileData
    const usersWithProfile = await db('user').where('profileData', 'like', '%tiplink.so%')
    for (const user of usersWithProfile) {
      try {
        const newProfileData = user.profileData.replace(/tiplink\.so/g, 'tipstack.fun')
        await db('user').where({ id: user.id }).update({ profileData: newProfileData })
        results.scrubbedProfiles++
      } catch (e: any) {
        results.errors.push(`Profile scrubbing error for ${user.id}: ${e.message}`)
      }
    }

    return res.json({ success: true, results })
  } catch (err: any) {
    console.error('❌ Migration Failed:', err)
    return res.status(500).json({ success: false, error: err.message })
  }
}
