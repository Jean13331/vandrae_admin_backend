import os from 'node:os'

function isPrivateIPv4(address: string) {
  if (address.startsWith('10.')) return true
  if (address.startsWith('192.168.')) return true
  const match = /^172\.(\d+)\./.exec(address)
  if (!match) return false
  const second = Number(match[1])
  return second >= 16 && second <= 31
}

function isVirtualAdapter(address: string) {
  return address.startsWith('192.168.56.') || address.startsWith('192.168.137.')
}

export function lanIPv4() {
  const preferred: string[] = []
  const others: string[] = []

  for (const addrs of Object.values(os.networkInterfaces())) {
    for (const addr of addrs ?? []) {
      if (addr.family !== 'IPv4' || addr.internal || !isPrivateIPv4(addr.address) || isVirtualAdapter(addr.address)) {
        continue
      }
      if (addr.address.startsWith('192.168.0.') || addr.address.startsWith('192.168.1.')) {
        preferred.push(addr.address)
      } else {
        others.push(addr.address)
      }
    }
  }

  return preferred[0] ?? others[0] ?? null
}
