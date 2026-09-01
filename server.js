const { existsSync } = require('node:fs')
const { spawnSync } = require('node:child_process')
const path = require('node:path')

const entry = path.join(__dirname, 'dist', 'index.js')

if (!existsSync(entry)) {
  const tsc = path.join(__dirname, 'node_modules', 'typescript', 'bin', 'tsc')
  const result = spawnSync(process.execPath, [tsc, '-p', 'tsconfig.json'], {
    cwd: __dirname,
    stdio: 'inherit',
  })
  if (result.status) {
    process.exit(result.status)
  }
}

require(entry)
