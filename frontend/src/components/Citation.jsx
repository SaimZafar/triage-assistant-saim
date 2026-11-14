import { SHORT } from '../lib/sources'

const CITE = /\[\[([^\]#]+)#([^\]]+)\]\]/g

// Turns [[file#ref]] inside a string into clickable chips. Everything else stays plain text.
export function RichText({ text = '', onCite }) {
  const parts = []
  let last = 0
  let m
  CITE.lastIndex = 0
  while ((m = CITE.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    const file = m[1]
    const ref = m[2]
    parts.push(
      <button key={m.index} type="button" className="cite" onClick={e => onCite({ file, ref }, e.currentTarget)} title={`Open ${file}`}>
        {SHORT[file] ?? file} · {ref.length > 24 ? ref.slice(0, 22) + '…' : ref}
      </button>
    )
    last = m.index + m[0].length
  }
  parts.push(text.slice(last))
  return <>{parts}</>
}
