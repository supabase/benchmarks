#!/usr/bin/env node
// clear.js - Batched cleanup script for TPC-B benchmark

/**
 * Standalone cleanup script that can be run independently of k6
 * Usage: node scripts/clear.js
 */

const CONVEX_URL = process.env.CONVEX_URL || 'https://your-deployment.convex.cloud'

async function convexMutation(path, args) {
  const response = await fetch(`${CONVEX_URL}/api/mutation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, args, format: 'json' }),
  })
  return response.json()
}

async function clear() {
  console.log('Clearing TPC-B benchmark data...')
  console.log(`Convex URL: ${CONVEX_URL}\n`)

  const batchSize = 8000
  const tables = ['history', 'accounts', 'tellers', 'branches', 'counters']

  for (const table of tables) {
    console.log(`Clearing ${table}...`)
    let totalCleared = 0
    let result

    do {
      result = await convexMutation('benchmark:clearTableBatch', {
        table,
        limit: batchSize,
      })
      totalCleared += result.deleted || 0
      if (result.deleted > 0) {
        process.stdout.write(`  Cleared: ${totalCleared}\r`)
      }
    } while (result.deleted === batchSize)

    console.log(`  Cleared: ${totalCleared} records`)
  }

  console.log('\nCleanup complete!')
}

clear().catch(console.error)
