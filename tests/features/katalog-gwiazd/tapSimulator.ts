// Mały symulator TAP VizieR dla testów katalog-gwiazd (bez sieci). Wykonuje zapytania ADQL na tabelach z vizierRows.ts
// i odpowiada tekstem CSV jak TAPVizieR (LF, nagłówek z aliasów, puste pole = NULL; COUNT bez aliasu → `COUNT_ALL`).
// Obsługiwane: SELECT [TOP n] (* | wyrażenie [[AS] alias], … | COUNT(*) [[AS] alias]) FROM "tabela" [[AS] t]
// [WHERE warunek] [ORDER BY …] (ORDER BY jest pomijany). Warunek: porównania (= <> != < <= > >=), + − * /, nawiasy,
// IS [NOT] NULL, [NOT] BETWEEN … AND …, AND / OR / NOT z logiką trójwartościową SQL. Nazwy kolumn bez względu na
// wielkość liter, także w cudzysłowie ("RA(ICRS)") i z przedrostkiem tabeli (t.VTmag).
// Funkcje (np. COALESCE, CASE) dają błąd: prawdziwy TAPVizieR odrzucił COALESCE i CASE przy sprawdzaniu (2026-10-20).

export type CellValue = number | string | null

export interface CsvTable {
  columns: string[]
  /** Surowe pola (bez cudzysłowów). */
  rows: string[][]
}

/** Odczyt prostego CSV (pola w cudzysłowie, LF albo CRLF, pusta linia na końcu pomijana). */
export function parseCsv(text: string): CsvTable {
  const lines = text.split(/\r?\n/)
  if (lines.at(-1) === '') lines.pop()
  const split = (line: string): string[] => {
    const fields: string[] = []
    let current = ''
    let quoted = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (quoted) {
        if (ch === '"' && line[i + 1] === '"') {
          current += '"'
          i++
        } else if (ch === '"') quoted = false
        else current += ch
      } else if (ch === '"') quoted = true
      else if (ch === ',') {
        fields.push(current)
        current = ''
      } else current += ch
    }
    fields.push(current)
    return fields
  }
  const [header = '', ...rest] = lines
  return { columns: split(header), rows: rest.map(split) }
}

function cellValue(raw: string): CellValue {
  if (raw.trim() === '') return null
  return /^\s*[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?\s*$/.test(raw) ? Number(raw) : raw
}

type Token =
  | { kind: 'number'; text: string }
  | { kind: 'string'; text: string }
  | { kind: 'ident'; text: string; quoted: boolean }
  | { kind: 'op'; text: string }

function tokenize(query: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  while (i < query.length) {
    const rest = query.slice(i)
    const space = /^\s+/.exec(rest)
    if (space) {
      i += space[0].length
      continue
    }
    const number = /^(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?/.exec(rest)
    if (number) {
      tokens.push({ kind: 'number', text: number[0] })
      i += number[0].length
      continue
    }
    if (rest[0] === "'") {
      let end = 1
      let text = ''
      while (end < rest.length) {
        if (rest[end] === "'" && rest[end + 1] === "'") {
          text += "'"
          end += 2
        } else if (rest[end] === "'") break
        else text += rest[end++]
      }
      if (end >= rest.length) throw new Error('niezamknięty napis w zapytaniu')
      tokens.push({ kind: 'string', text })
      i += end + 1
      continue
    }
    if (rest[0] === '"') {
      const end = rest.indexOf('"', 1)
      if (end < 0) throw new Error('niezamknięty identyfikator w cudzysłowie')
      tokens.push({ kind: 'ident', text: rest.slice(1, end), quoted: true })
      i += end + 1
      continue
    }
    const ident = /^[A-Za-z_][A-Za-z0-9_]*/.exec(rest)
    if (ident) {
      tokens.push({ kind: 'ident', text: ident[0], quoted: false })
      i += ident[0].length
      continue
    }
    const op = /^(<=|>=|<>|!=|[<>=+\-*/(),.;])/.exec(rest)
    if (op) {
      tokens.push({ kind: 'op', text: op[0] })
      i += op[0].length
      continue
    }
    throw new Error(`nieznany znak w zapytaniu: ${rest[0]}`)
  }
  return tokens
}

type Expr =
  | { type: 'literal'; value: CellValue }
  | { type: 'column'; name: string }
  | { type: 'unary'; op: '-' | 'NOT'; arg: Expr }
  | { type: 'binary'; op: string; left: Expr; right: Expr }
  | { type: 'isNull'; arg: Expr; negated: boolean }
  | { type: 'between'; arg: Expr; low: Expr; high: Expr; negated: boolean }

interface SelectItem {
  expr: Expr | 'count'
  alias: string | null
}

export interface ParsedQuery {
  table: string
  top: number | null
  items: SelectItem[] | '*'
  where: Expr | null
}

const KEYWORDS = new Set(['SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IS', 'NULL', 'AS', 'TOP', 'ORDER', 'BY', 'BETWEEN'])

class Parser {
  private pos = 0
  private readonly tokens: Token[]

  constructor(tokens: Token[]) {
    this.tokens = tokens
  }

  private peek(offset = 0): Token | undefined {
    return this.tokens[this.pos + offset]
  }

  private isKeyword(word: string, offset = 0): boolean {
    const token = this.peek(offset)
    return token?.kind === 'ident' && !token.quoted && token.text.toUpperCase() === word
  }

  private isOp(op: string): boolean {
    const token = this.peek()
    return token?.kind === 'op' && token.text === op
  }

  private expectKeyword(word: string): void {
    if (!this.isKeyword(word)) throw new Error(`oczekiwano ${word} w zapytaniu`)
    this.pos++
  }

  private expectOp(op: string): void {
    if (!this.isOp(op)) throw new Error(`oczekiwano „${op}” w zapytaniu`)
    this.pos++
  }

  parseQuery(): ParsedQuery {
    this.expectKeyword('SELECT')
    let top: number | null = null
    if (this.isKeyword('TOP')) {
      this.pos++
      const token = this.peek()
      if (token?.kind !== 'number') throw new Error('TOP bez liczby')
      top = Number(token.text)
      this.pos++
    }
    let items: SelectItem[] | '*'
    if (this.isOp('*')) {
      this.pos++
      items = '*'
    } else {
      items = []
      for (;;) {
        items.push(this.parseSelectItem())
        if (!this.isOp(',')) break
        this.pos++
      }
    }
    this.expectKeyword('FROM')
    const tableToken = this.peek()
    if (tableToken?.kind !== 'ident') throw new Error('brak nazwy tabeli')
    this.pos++
    if (this.isKeyword('AS')) this.pos += 2
    else if (this.peek()?.kind === 'ident' && !this.isKeyword('WHERE') && !this.isKeyword('ORDER')) this.pos++
    let where: Expr | null = null
    if (this.isKeyword('WHERE')) {
      this.pos++
      where = this.parseOr()
    }
    if (this.isKeyword('ORDER')) this.pos = this.tokens.length
    if (this.isOp(';')) this.pos++
    if (this.pos < this.tokens.length) throw new Error(`nieobsługiwany fragment zapytania: ${this.peek()?.text ?? ''}`)
    return { table: tableToken.text, top, items, where }
  }

  private parseSelectItem(): SelectItem {
    let expr: Expr | 'count'
    if (this.isKeyword('COUNT') && this.peek(1)?.text === '(') {
      this.pos += 2
      this.expectOp('*')
      this.expectOp(')')
      expr = 'count'
    } else expr = this.parseAdditive()
    let alias: string | null = null
    if (this.isKeyword('AS')) {
      this.pos++
      const token = this.peek()
      if (token?.kind !== 'ident') throw new Error('AS bez aliasu')
      alias = token.text
      this.pos++
    } else {
      const token = this.peek()
      if (token?.kind === 'ident' && !KEYWORDS.has(token.text.toUpperCase())) {
        alias = token.text
        this.pos++
      }
    }
    return { expr, alias }
  }

  private parseOr(): Expr {
    let left = this.parseAnd()
    while (this.isKeyword('OR')) {
      this.pos++
      left = { type: 'binary', op: 'OR', left, right: this.parseAnd() }
    }
    return left
  }

  private parseAnd(): Expr {
    let left = this.parseNot()
    while (this.isKeyword('AND')) {
      this.pos++
      left = { type: 'binary', op: 'AND', left, right: this.parseNot() }
    }
    return left
  }

  private parseNot(): Expr {
    if (this.isKeyword('NOT')) {
      this.pos++
      return { type: 'unary', op: 'NOT', arg: this.parseNot() }
    }
    return this.parsePredicate()
  }

  private parsePredicate(): Expr {
    const left = this.parseAdditive()
    const token = this.peek()
    if (token?.kind === 'op' && ['=', '<>', '!=', '<', '<=', '>', '>='].includes(token.text)) {
      this.pos++
      return { type: 'binary', op: token.text, left, right: this.parseAdditive() }
    }
    if (this.isKeyword('IS')) {
      this.pos++
      let negated = false
      if (this.isKeyword('NOT')) {
        negated = true
        this.pos++
      }
      this.expectKeyword('NULL')
      return { type: 'isNull', arg: left, negated }
    }
    let negated = false
    if (this.isKeyword('NOT') && this.isKeyword('BETWEEN', 1)) {
      negated = true
      this.pos++
    }
    if (this.isKeyword('BETWEEN')) {
      this.pos++
      const low = this.parseAdditive()
      this.expectKeyword('AND')
      return { type: 'between', arg: left, low, high: this.parseAdditive(), negated }
    }
    return left
  }

  private parseAdditive(): Expr {
    let left = this.parseMultiplicative()
    while (this.isOp('+') || this.isOp('-')) {
      const op = this.tokens[this.pos++].text
      left = { type: 'binary', op, left, right: this.parseMultiplicative() }
    }
    return left
  }

  private parseMultiplicative(): Expr {
    let left = this.parseUnary()
    while (this.isOp('*') || this.isOp('/')) {
      const op = this.tokens[this.pos++].text
      left = { type: 'binary', op, left, right: this.parseUnary() }
    }
    return left
  }

  private parseUnary(): Expr {
    if (this.isOp('-')) {
      this.pos++
      return { type: 'unary', op: '-', arg: this.parseUnary() }
    }
    if (this.isOp('+')) {
      this.pos++
      return this.parseUnary()
    }
    return this.parsePrimary()
  }

  private parsePrimary(): Expr {
    const token = this.peek()
    if (!token) throw new Error('niedokończone zapytanie')
    if (token.kind === 'number') {
      this.pos++
      return { type: 'literal', value: Number(token.text) }
    }
    if (token.kind === 'string') {
      this.pos++
      return { type: 'literal', value: token.text }
    }
    if (token.kind === 'op' && token.text === '(') {
      this.pos++
      const inner = this.parseOr()
      this.expectOp(')')
      return inner
    }
    if (token.kind === 'ident') {
      if (!token.quoted && token.text.toUpperCase() === 'NULL') {
        this.pos++
        return { type: 'literal', value: null }
      }
      if (!token.quoted && (token.text.toUpperCase() === 'CASE' || this.peek(1)?.text === '(')) {
        throw new Error(`Incorrect ADQL query: funkcja/wyrażenie ${token.text} nieobsługiwane (TAPVizieR też go nie przyjmuje)`)
      }
      this.pos++
      let name = token.text
      if (this.isOp('.')) {
        this.pos++
        const next = this.peek()
        if (next?.kind !== 'ident') throw new Error('zła nazwa kolumny')
        name = next.text
        this.pos++
      }
      return { type: 'column', name }
    }
    throw new Error(`nieoczekiwany element zapytania: ${token.text}`)
  }
}

export function parseAdql(query: string): ParsedQuery {
  return new Parser(tokenize(query)).parseQuery()
}

type Truth = boolean | null

function compare(op: string, a: CellValue | boolean, b: CellValue | boolean): Truth {
  if (a === null || b === null) return null
  switch (op) {
    case '=':
      return a === b
    case '<>':
    case '!=':
      return a !== b
    case '<':
      return a < b
    case '<=':
      return a <= b
    case '>':
      return a > b
    default:
      return a >= b
  }
}

function evaluate(expr: Expr, row: Map<string, CellValue>): CellValue | boolean {
  switch (expr.type) {
    case 'literal':
      return expr.value
    case 'column': {
      const key = expr.name.toLowerCase()
      if (!row.has(key)) throw new Error(`Incorrect ADQL query: Unknown column "${expr.name}"`)
      return row.get(key) ?? null
    }
    case 'unary': {
      const value = evaluate(expr.arg, row)
      if (expr.op === 'NOT') return value === null ? null : !value
      return value === null ? null : -Number(value)
    }
    case 'isNull': {
      const isNull = evaluate(expr.arg, row) === null
      return expr.negated ? !isNull : isNull
    }
    case 'between': {
      const value = evaluate(expr.arg, row)
      const low = compare('>=', value, evaluate(expr.low, row))
      const high = compare('<=', value, evaluate(expr.high, row))
      const inside = low === false || high === false ? false : low === null || high === null ? null : true
      return expr.negated && inside !== null ? !inside : inside
    }
    case 'binary': {
      if (expr.op === 'AND' || expr.op === 'OR') {
        const left = evaluate(expr.left, row) as Truth
        const right = evaluate(expr.right, row) as Truth
        if (expr.op === 'AND') return left === false || right === false ? false : left === null || right === null ? null : true
        return left === true || right === true ? true : left === null || right === null ? null : false
      }
      const left = evaluate(expr.left, row)
      const right = evaluate(expr.right, row)
      if (['+', '-', '*', '/'].includes(expr.op)) {
        if (left === null || right === null) return null
        const a = Number(left)
        const b = Number(right)
        return expr.op === '+' ? a + b : expr.op === '-' ? a - b : expr.op === '*' ? a * b : a / b
      }
      return compare(expr.op, left, right)
    }
  }
}

export interface QueryResult {
  csv: string
  /** Tabela z zapytania. */
  table: string
  /** Zapytanie COUNT(*). */
  isCount: boolean
  /** Kolumna `recno` zwróconych wierszy (dla COUNT: wiersze policzone). */
  recnos: number[]
}

function formatCell(value: CellValue | boolean, raw: string | null): string {
  if (value === null) return ''
  if (raw !== null) return /[",\n]/.test(raw) ? `"${raw.replaceAll('"', '""')}"` : raw
  return String(value)
}

/** Wykonuje zapytanie ADQL na tabelach `tables` (nazwa → CSV `SELECT *`). Błąd zapytania → wyjątek. */
export function runAdql(query: string, tables: Readonly<Record<string, string>>): QueryResult {
  const parsed = parseAdql(query)
  const text = tables[parsed.table]
  if (text === undefined) throw new Error(`Incorrect ADQL query: Unknown table "${parsed.table}"`)
  const table = parseCsv(text)
  const keys = table.columns.map((column) => column.toLowerCase())
  const matching = table.rows
    .map((raw) => ({ raw, values: new Map(keys.map((key, i) => [key, cellValue(raw[i] ?? '')])) }))
    .filter(({ values }) => (parsed.where ? evaluate(parsed.where, values) === true : true))
  const limited = parsed.top === null ? matching : matching.slice(0, parsed.top)
  const recnos = limited.map(({ values }) => Number(values.get('recno')))
  if (parsed.items !== '*' && parsed.items.some((item) => item.expr === 'count')) {
    if (parsed.items.length !== 1) throw new Error('symulator: COUNT(*) tylko jako jedyna kolumna')
    return { csv: `${parsed.items[0].alias ?? 'COUNT_ALL'}\n${matching.length}\n`, table: parsed.table, isCount: true, recnos }
  }
  const items: SelectItem[] =
    parsed.items === '*' ? table.columns.map((column) => ({ expr: { type: 'column', name: column }, alias: null })) : parsed.items
  const header = items.map((item, i) => {
    if (item.alias !== null) return item.alias
    if (item.expr !== 'count' && item.expr.type === 'column') return item.expr.name
    return `expr${i + 1}`
  })
  const lines = limited.map(({ raw, values }) =>
    items
      .map((item) => {
        const expr = item.expr as Expr
        const value = evaluate(expr, values)
        const rawText = expr.type === 'column' ? (raw[keys.indexOf(expr.name.toLowerCase())] ?? null) : null
        return formatCell(value, rawText)
      })
      .join(','),
  )
  return { csv: [header.join(','), ...lines].join('\n') + '\n', table: parsed.table, isCount: false, recnos }
}
