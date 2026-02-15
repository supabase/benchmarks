#!/usr/bin/env node
// seed.js - Batched seeding script for TPC-B benchmark

/**
 * Standalone seeding script that can be run independently of k6
 * Usage: node scripts/seed.js [scale_factor]
 */

const CONVEX_URL = process.env.CONVEX_URL || 'https://your-deployment.convex.cloud'
const SCALE = parseInt(process.argv[2] || process.env.SCALE_FACTOR || '10')

async function convexMutation(path, args) {
  const response = await fetch(`${CONVEX_URL}/api/mutation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, args, format: 'json' }),
  })
  return response.json()
}

async function seed() {
  console.log(`Seeding TPC-B benchmark with scale factor ${SCALE}`)
  console.log(`Convex URL: ${CONVEX_URL}\n`)

  // Seed branches
  console.log(`Seeding ${SCALE} branches...`)
  let result = await convexMutation('benchmark:seedBranches', { scale: SCALE })
  console.log(`  Branches: ${result.seeded} seeded\n`)

  // Seed tellers
  console.log(`Seeding ${SCALE * 10} tellers...`)
  result = await convexMutation('benchmark:seedTellers', { scale: SCALE })
  console.log(`  Tellers: ${result.seeded} seeded\n`)

  // Seed accounts in batches
  const totalAccounts = 100000 * SCALE
  const batchSize = 5000
  console.log(`Seeding ${totalAccounts} accounts in batches of ${batchSize}...`)

  for (let startAid = 1; startAid <= totalAccounts; startAid += batchSize) {
    const count = Math.min(batchSize, totalAccounts - startAid + 1)
    await convexMutation('benchmark:seedAccountBatch', {
      startAid,
      count,
      scale: SCALE,
    })

    const progress = Math.min(100, Math.round((startAid / totalAccounts) * 100))
    if (startAid % (batchSize * 10) === 1 || startAid + batchSize > totalAccounts) {
      console.log(`  Progress: ${progress}% (${startAid + count - 1}/${totalAccounts})`)
    }
  }

  console.log('\nSeeding complete!')
}

seed().catch(console.error)
