export function parseSource(name, content) {
  const lines = content.split('\n')
  const open = lines.findIndex(l => l.startsWith('```'))

  // log files: line 1 is the first line inside the code block (README rule)
  if (open !== -1) {
    const close = lines.findIndex((l, i) => i > open && l.startsWith('```'))
    const body = lines.slice(open + 1, close === -1 ? undefined : close)
    return {
      head: lines.slice(0, open).join('\n'),
      rows: body.map((text, i) => ({ key: `L${i + 1}`, label: String(i + 1), text }))
    }
  }

  // tables, runbooks and rules
  const prefix = name.startsWith('01_') ? 'R' : 'S'
  return {
    head: '',
    rows: lines.map(text => {
      let key = null
      if (text.startsWith('|')) key = text.split('|')[1]?.trim() ?? null
      const num = text.match(/^(\d+(?:\.\d+)?)\.?\s/)
      if (num) key = prefix + num[1]
      return { key, label: '', text }
    })
  }
}
