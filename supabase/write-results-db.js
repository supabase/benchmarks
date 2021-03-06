// uploads all .json files in the output directory to the db
const fs = require('fs').promises
const { createClient } = require('@supabase/supabase-js')

const { supabaseKey, supabaseUrl } = process.env

const resultsDir = process.env.resultsDir || './output';

if (!supabaseKey || !supabaseUrl) {
  console.log('Export supabaseKey and supabaseUrl as environment variables. Exiting.')
  process.exit(0)
}

const supabase = createClient(supabaseUrl, supabaseKey)

;(async () => {
  const files = await fs.readdir(resultsDir)

  for (const file of files) {
    if (file.endsWith('.json')) {
      // valid benchmark file, lets update supabase table
      const benchmarkName = file.split('.json')[0]
      const data = JSON.parse(await fs.readFile(`${resultsDir}/${file}`))

      try {
        await supabase.from('benchmarks').insert([{ data, benchmark_name: benchmarkName }])
      } catch (err) {
        console.log('Error writing to the database', err)
      }
    }
  }
})()
