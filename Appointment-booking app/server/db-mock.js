/**
 * In-memory database mock — vitest mock for ../db.
 *
 * Stores tables internally as arrays of objects with auto-incrementing IDs.
 * Handles all SQL patterns used by the route handlers in the test suite.
 *
 * Supported operations:
 *   SELECT [DISTINCT] cols FROM table [JOIN ... ON ...] [WHERE conds] [ORDER BY ...] [LIMIT N] [OFFSET N]
 *   INSERT INTO table (cols) VALUES (vals) RETURNING id
 *   UPDATE table SET col=$N, ... WHERE conds
 *   DELETE FROM table WHERE conds
 *   CREATE TABLE IF NOT EXISTS ... (no-op)
 *
 * Supported WHERE operators: =, !=, <, >, <=, >=, IN, ILIKE, IS NULL, IS NOT NULL
 * Supports AND/OR, nested parens, ::type casts, NOW(), COALESCE, COUNT, SUM, DISTINCT
 *
 * KNOWN LIMITATIONS (will silently produce wrong results or throw errors):
 *   - GREATEST() / LEAST() expressions are not supported
 *   - UNION / UNION ALL is not supported (throws "Unsupported SQL" error)
 *   - NULLS FIRST / NULLS LAST in ORDER BY is silently ignored
 *   - DATE() / DATE_TRUNC() / INTERVAL SQL functions return undefined
 *   - ON CONFLICT DO NOTHING / DO UPDATE without explicit conflict target (e.g. ON CONFLICT (col))
 *     relies on all-columns-heuristic — may not detect conflicts for partial unique constraints
 *   - GROUP BY with aggregation functions is not supported
 */

'use strict';

// ─── In-memory tables ───────────────────────────

const tables = {};
const sequences = {};
const TABLE_NAMES = ['users', 'services', 'appointments', 'business_settings'];

function ensureTable(name) {
  if (!tables[name]) {
    tables[name] = [];
    sequences[name] = 0;
  }
}

function nextId(table) {
  ensureTable(table);
  return ++sequences[table];
}

// ─── Init / Reset ───────────────────────────────

function reset() {
  for (const name of TABLE_NAMES) {
    tables[name] = [];
    sequences[name] = 0;
  }
}

/** Pre-seed default data set by vitest.setup.js */
function seedDefaults() {
  const bcrypt = require('bcryptjs');
  const pw = bcrypt.hashSync('password123', 10);

  tables.users = [
    { id: 1, name: 'Admin User', email: 'admin@test.com', password: pw, role: 'admin', created_at: new Date().toISOString(), email_reminders: null },
    { id: 2, name: 'Test Customer', email: 'customer@test.com', password: pw, role: 'customer', created_at: new Date().toISOString(), email_reminders: null },
    { id: 3, name: 'Jane Doe', email: 'jane@test.com', password: pw, role: 'customer', created_at: new Date().toISOString(), email_reminders: null },
  ];
  sequences.users = 3;

  tables.services = [
    { id: 1, name: 'Haircut', description: 'Professional haircut', duration: 30, price: 35.00, category: 'Hair', is_active: 1, created_at: new Date().toISOString(), image_url: null },
    { id: 2, name: 'Massage', description: 'Relaxing massage', duration: 60, price: 75.00, category: 'Wellness', is_active: 1, created_at: new Date().toISOString(), image_url: null },
    { id: 3, name: 'Facial', description: 'Deep cleansing facial', duration: 45, price: 55.00, category: 'Skincare', is_active: 1, created_at: new Date().toISOString(), image_url: null },
  ];
  sequences.services = 3;

  tables.appointments = [
    { id: 1, user_id: 2, service_id: 1, date: '2026-07-15', time: '10:00', status: 'confirmed', notes: 'First appointment', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), reminder_sent: 0 },
    { id: 2, user_id: 2, service_id: 2, date: '2026-07-20', time: '14:00', status: 'confirmed', notes: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), reminder_sent: 0 },
    { id: 3, user_id: 3, service_id: 1, date: '2026-07-16', time: '11:00', status: 'confirmed', notes: 'Jane booking', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), reminder_sent: 0 },
    { id: 4, user_id: 2, service_id: 3, date: '2026-06-10', time: '09:00', status: 'cancelled', notes: 'Was cancelled', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), reminder_sent: 0 },
  ];
  sequences.appointments = 4;
}

// ─── SQL Parsing Helpers ────────────────────────

function parseIdentifier(sql) {
  return sql.replace(/"([^"]+)"/g, '$1').trim();
}

function stripTypeCast(expr) {
  return expr.replace(/::\w+(?:\([^)]*\))?/g, '').trim();
}

function resolveParam(sql, params, paramIdx) {
  // $1, $2, etc.
  const match = sql.match(/\$(\d+)/);
  if (match) {
    const idx = parseInt(match[0].slice(1)) - 1;
    return idx < params.length ? params[idx] : undefined;
  }
  return undefined;
}

function evaluateExpr(expr, row, params) {
  const clean = stripTypeCast(expr.trim());

  // $N -> lookup param
  if (/^\$\d+$/.test(clean)) {
    const idx = parseInt(clean.slice(1)) - 1;
    return idx < params.length ? params[idx] : undefined;
  }

  // column reference
  if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(clean)) {
    // Try alias prefixes like a.xxx, s.xxx, u.xxx
    const parts = clean.split('.');
    const col = parts[parts.length - 1];
    return row[col] !== undefined ? row[col] : undefined;
  }

  // quoted string
  if ((clean.startsWith("'") && clean.endsWith("'")) || (clean.startsWith('"') && clean.endsWith('"'))) {
    return clean.slice(1, -1);
  }

  // number
  if (/^-?\d+(\.\d+)?$/.test(clean)) {
    return parseFloat(clean);
  }

  // NOW()
  if (/^now\(\)$/i.test(clean)) {
    return new Date().toISOString();
  }

  // NULL
  if (/^null$/i.test(clean)) {
    return null;
  }

  // literal value
  return clean;
}

function extractTableName(sql) {
  const m = sql.match(/\bFROM\s+([a-zA-Z_][a-zA-Z0-9_]*)/i);
  return m ? m[1].toLowerCase() : null;
}

function extractTableNameInsert(sql) {
  const m = sql.match(/INSERT\s+INTO\s+([a-zA-Z_][a-zA-Z0-9_]*)/i);
  return m ? m[1].toLowerCase() : null;
}

function extractTableNameUpdate(sql) {
  const m = sql.match(/UPDATE\s+([a-zA-Z_][a-zA-Z0-9_]*)/i);
  return m ? m[1].toLowerCase() : null;
}

function extractTableNameDelete(sql) {
  const m = sql.match(/DELETE\s+FROM\s+([a-zA-Z_][a-zA-Z0-9_]*)/i);
  return m ? m[1].toLowerCase() : null;
}

// ─── WHERE Clause Parser ────────────────────────

/**
 * Tokenize a WHERE clause into tokens.
 */
function tokenizeWhere(str) {
  const tokens = [];
  let i = 0;
  while (i < str.length) {
    if (str[i] === ' ') { i++; continue; }
    if (str[i] === '(') { tokens.push('('); i++; continue; }
    if (str[i] === ')') { tokens.push(')'); i++; continue; }
    if (str[i] === "'") {
      let j = i + 1;
      while (j < str.length && !(str[j] === "'" && str[j + 1] !== "'")) {
        if (str[j] === "'" && str[j + 1] === "'") { j += 2; continue; }
        j++;
      }
      if (str[j] === "'") j++;
      tokens.push(str.slice(i, j));
      i = j;
      continue;
    }
    if (/^\$\d+/.test(str.slice(i))) {
      const m = str.slice(i).match(/^\$\d+/);
      tokens.push(m[0]);
      i += m[0].length;
      continue;
    }
    if (/^[a-zA-Z_][a-zA-Z0-9_.]*/.test(str.slice(i))) {
      const m = str.slice(i).match(/^[a-zA-Z_][a-zA-Z0-9_.]*/);
      tokens.push(m[0]);
      i += m[0].length;
      continue;
    }
    if (/^\d+(\.\d+)?/.test(str.slice(i))) {
      const m = str.slice(i).match(/^\d+(\.\d+)?/);
      tokens.push(m[0]);
      i += m[0].length;
      continue;
    }
    if (str.slice(i).toUpperCase().startsWith('ILIKE')) {
      tokens.push('ILIKE');
      i += 5;
      continue;
    }
    if (str.slice(i).toUpperCase().startsWith('IS')) {
      tokens.push('IS');
      i += 2;
      continue;
    }
    if (str.slice(i).toUpperCase().startsWith('NOT')) {
      tokens.push('NOT');
      i += 3;
      continue;
    }
    if (str.slice(i).toUpperCase().startsWith('NULL')) {
      tokens.push('NULL');
      i += 4;
      continue;
    }
    if (str.slice(i).toUpperCase().startsWith('AND')) {
      tokens.push('AND');
      i += 3;
      continue;
    }
    if (str.slice(i).toUpperCase().startsWith('OR')) {
      tokens.push('OR');
      i += 2;
      continue;
    }
    if (str.slice(i).toUpperCase().startsWith('IN')) {
      const rest = str.slice(i);
      if (rest.length === 2 || !/^[a-zA-Z]/.test(rest[2])) {
        tokens.push('IN');
        i += 2;
        continue;
      }
    }
    // Operators
    if (str.slice(i, i + 2) === '<=') { tokens.push('<='); i += 2; continue; }
    if (str.slice(i, i + 2) === '>=') { tokens.push('>='); i += 2; continue; }
    if (str.slice(i, i + 2) === '!=') { tokens.push('!='); i += 2; continue; }
    if (str.slice(i, i + 2) === '<>') { tokens.push('<>'); i += 2; continue; }
    if (str.slice(i, i + 2) === '||') { tokens.push('||'); i += 2; continue; }
    if (str[i] === '<' || str[i] === '>' || str[i] === '=') { tokens.push(str[i]); i++; continue; }
    if (str[i] === ',') { tokens.push(','); i++; continue; }
    // Skip ::type casts (e.g. ::int, ::time, ::numeric(10,2))
    // Collapse into the preceding token so $2::time stays as $2
    if (str[i] === ':') {
      if (str[i + 1] === ':') {
        i += 2; // skip ::
        while (i < str.length && /[a-zA-Z0-9_]/.test(str[i])) i++;
        // Skip optional parenthesized args like (10,2)
        if (i < str.length && str[i] === '(') {
          i++;
          while (i < str.length && str[i] !== ')') i++;
          if (i < str.length) i++;
        }
      } else {
        i++;
      }
      continue;
    }
    if (str[i] === '\r' || str[i] === '\n') { i++; continue; }
    i++;
  }
  return tokens;
}

/**
 * Evaluate a WHERE clause against a row.
 */
function evaluateWhere(whereStr, row, params) {
  if (!whereStr) return true;
  const tokens = tokenizeWhere(whereStr);
  return evaluateCondition(tokens, 0, row, params).result;
}

function evaluateCondition(tokens, idx, row, params) {
  let result = true;
  let currentOp = 'AND';

  while (idx < tokens.length) {
    // Handle parentheses
    if (tokens[idx] === '(') {
      const sub = evaluateCondition(tokens, idx + 1, row, params);
      if (sub === null) return { result: true, nextIdx: tokens.length };
      result = currentOp === 'AND' ? (result && sub.result) : (result || sub.result);
      idx = sub.nextIdx;
      if (idx < tokens.length && tokens[idx] === ')') idx++;
      continue;
    }
    if (tokens[idx] === ')') {
      return { result, nextIdx: idx };
    }

    // Handle AND/OR
    if (tokens[idx] === 'AND') { currentOp = 'AND'; idx++; continue; }
    if (tokens[idx] === 'OR') { currentOp = 'OR'; idx++; continue; }

    // Column operator value
    const colToken = tokens[idx];

    // Handle IS NULL / IS NOT NULL
    if (idx + 1 < tokens.length && tokens[idx + 1] === 'IS') {
      const colName = colToken.split('.').pop();
      const colVal = row[colName];
      if (idx + 2 < tokens.length && tokens[idx + 2] === 'NOT') {
        const isNull = colVal === null || colVal === undefined;
        result = currentOp === 'AND' ? (result && !isNull) : (result || !isNull);
        idx += 4;
      } else if (idx + 2 < tokens.length && tokens[idx + 2] === 'NULL') {
        const isNull = colVal === null || colVal === undefined;
        result = currentOp === 'AND' ? (result && isNull) : (result || isNull);
        idx += 3;
      } else {
        idx += 2;
      }
      continue;
    }

    if (idx + 1 >= tokens.length) {
      idx++;
      continue;
    }

    const operator = tokens[idx + 1];

    // Handle BETWEEN: col BETWEEN low AND high
    if (operator.toUpperCase() === 'BETWEEN') {
      const colName = colToken.split('.').pop();
      const colVal = row[colName];
      const lowToken = tokens[idx + 2];
      // BETWEEN syntax: col BETWEEN low AND high
      // low and high can be $N, literals, or subexpressions
      // The AND token at idx+3 is a BETWEEN-syntax separator, not a logical operator
      if (idx + 4 < tokens.length && tokens[idx + 3] === 'AND') {
        const highToken = tokens[idx + 4];
        const lowVal = evaluateExpr(lowToken, row, params);
        const highVal = evaluateExpr(highToken, row, params);
        let matched = false;
        if (colVal !== null && colVal !== undefined &&
            lowVal !== null && lowVal !== undefined &&
            highVal !== null && highVal !== undefined) {
          const cmpLow = String(colVal).localeCompare(String(lowVal), undefined, { numeric: true });
          const cmpHigh = String(colVal).localeCompare(String(highVal), undefined, { numeric: true });
          matched = cmpLow >= 0 && cmpHigh <= 0;
        }
        result = currentOp === 'AND' ? (result && matched) : (result || matched);
        idx += 5; // col BETWEEN low AND high
        continue;
      }
      // Malformed BETWEEN — just skip (idx+1 to advance past operator below)
    }

    if (operator === 'IN') {
      // IN ($N, ...) — parse the list
      const colName = colToken.split('.').pop();
      const colVal = row[colName];
      let inIdx = idx + 3; // skip past "IN ("
      const values = [];
      while (inIdx < tokens.length && tokens[inIdx] !== ')') {
        if (tokens[inIdx] !== ',') {
          values.push(evaluateExpr(tokens[inIdx], row, params));
        }
        inIdx++;
      }
      const matched = values.some(v => v === colVal);
      result = currentOp === 'AND' ? (result && matched) : (result || matched);
      idx = inIdx + 1;
      continue;
    }

    if (operator === 'ILIKE') {
      const colName = colToken.split('.').pop();
      const colVal = row[colName];
      if (colVal === null || colVal === undefined) {
        result = currentOp === 'AND' ? (result && false) : (result || false);
        idx += 3;
        continue;
      }
      let pattern = evaluateExpr(tokens[idx + 2], row, params);
      if (pattern === null || pattern === undefined) pattern = '';
      pattern = String(pattern);
      // Convert SQL LIKE pattern to regex
      const regex = new RegExp(
        '^' + pattern.replace(/%/g, '.*').replace(/_/g, '.') + '$',
        'i'
      );
      const matched = regex.test(String(colVal));
      result = currentOp === 'AND' ? (result && matched) : (result || matched);
      idx += 3;
      continue;
    }

    // Comparison operators: =, !=, <, >, <=, >=
    if (['=', '!=', '<>', '<', '>', '<=', '>='].includes(operator)) {
      const rightToken = tokens[idx + 2];

      // Complex right-side expression (parenthetical) — use simple token expression evaluator
      if (rightToken === '(') {
        // Complex parenthetical expression — can't evaluate precisely.
        // As a best-effort heuristic, check if the left value equals the time
        // column referenced inside the expression (exact time match = conflict).
        const leftVal = evaluateExpr(colToken, row, params);
        let nextToken = idx + 3;
        // Skip past '(' and find the first column reference inside
        while (nextToken < tokens.length && (tokens[nextToken] === '(' || tokens[nextToken] === '+' || tokens[nextToken] === '||')) nextToken++;
        if (nextToken < tokens.length && leftVal !== undefined) {
          const innerCol = tokens[nextToken].split('.').pop();
          const rowVal = row[innerCol];
          if (rowVal !== undefined && rowVal !== null) {
            const cmp = String(leftVal).localeCompare(String(rowVal), undefined, { numeric: true });
            const matched = cmp === 0; // exact time match = conflict
            result = currentOp === 'AND' ? (result && matched) : (result || matched);
          }
        }

        // Skip past the parenthetical expression
        let depth = 1;
        let skipIdx = idx + 2;
        while (skipIdx < tokens.length && depth > 0) {
          skipIdx++;
          if (tokens[skipIdx] === '(') depth++;
          else if (tokens[skipIdx] === ')') depth--;
        }
        idx = skipIdx + 1;
        continue;
      }

      const colName = colToken.split('.').pop();
      const colVal = row[colName];
      const rightVal = evaluateExpr(rightToken, row, params);

      let matched = false;
      if (colVal === null || colVal === undefined) {
        matched = (operator === '!=' || operator === '<>');
      } else if (rightVal === null || rightVal === undefined) {
        matched = (operator === '!=' || operator === '<>');
      } else {
        const cmp = String(colVal).localeCompare(String(rightVal), undefined, { numeric: true });
        switch (operator) {
          case '=': matched = colVal == rightVal; break;
          case '!=': case '<>': matched = colVal != rightVal; break;
          case '<': matched = cmp < 0; break;
          case '>': matched = cmp > 0; break;
          case '<=': matched = cmp <= 0; break;
          case '>=': matched = cmp >= 0; break;
        }
      }

      result = currentOp === 'AND' ? (result && matched) : (result || matched);
      idx += 3;
      continue;
    }

    idx++;
  }

  return { result, nextIdx: idx };
}

// ─── ORDER BY Parser ────────────────────────────

function parseOrderBy(sql, joins, aliasToTable) {
  // Normalize newlines so . matches across lines
  const normalized = sql.replace(/\n/g, ' ').replace(/\r/g, '');
  const m = normalized.match(/ORDER\s+BY\s+(.+?)(?:\s+LIMIT|\s+OFFSET|$)/i);
  if (!m) return null;
  return m[1].split(',').map(s => {
    const parts = s.trim().split(/\s+/);
    const fullName = parts[0];
    const dir = parts[1] && parts[1].toUpperCase() === 'DESC' ? -1 : 1;
    let col;
    if (joins && joins.length > 0 && fullName.includes('.')) {
      const [prefix, name] = fullName.split('.');
      const tbl = (aliasToTable && aliasToTable[prefix]) || prefix;
      col = tbl + '_' + name;
    } else {
      col = fullName.split('.').pop();
    }
    return { col, dir };
  });
}

function parseLimitOffset(sql) {
  const limitM = sql.match(/LIMIT\s+(\d+)/i);
  const offsetM = sql.match(/OFFSET\s+(\d+)/i);
  return {
    limit: limitM ? parseInt(limitM[1]) : Infinity,
    offset: offsetM ? parseInt(offsetM[1]) : 0,
  };
}

// ─── JOIN parser ────────────────────────────────

function parseJoins(sql) {
  const joins = [];
  // More robust JOIN parser: find each JOIN keyword, then parse table, alias, type, and ON clause
  const joinStartRegex = /\bJOIN\s+/gi;
  let match;
  while ((match = joinStartRegex.exec(sql)) !== null) {
    // Detect join type by checking the word(s) before JOIN
    const beforeSql = sql.slice(0, match.index).trim();
    const beforeWords = beforeSql.split(/\s+/);
    let joinType = 'INNER';
    if (beforeWords.length > 0) {
      const lastWord = beforeWords[beforeWords.length - 1].toUpperCase();
      if (lastWord === 'LEFT') joinType = 'LEFT';
      else if (lastWord === 'RIGHT') joinType = 'RIGHT';
      else if (lastWord === 'FULL') joinType = 'FULL';
      else if (lastWord === 'CROSS') joinType = 'CROSS';
    }

    const rest = sql.slice(match.index + match[0].length);

    // Extract table name (first word)
    const tableMatch = rest.match(/^([a-zA-Z_][a-zA-Z0-9_]*)/);
    if (!tableMatch) continue;
    const table = tableMatch[1];
    let afterTable = rest.slice(tableMatch[0].length).trimStart();

    // Determine alias: check next word
    const SQL_KEYWORDS = ['ON', 'WHERE', 'ORDER', 'LIMIT', 'OFFSET', 'GROUP', 'HAVING',
      'INNER', 'LEFT', 'RIGHT', 'FULL', 'CROSS', 'JOIN', 'AS', 'USING'];
    let alias = table;

    if (/^AS\s/i.test(afterTable)) {
      // Explicit alias: JOIN table AS alias ON ...
      afterTable = afterTable.replace(/^AS\s+/i, '');
      const aliasMatch = afterTable.match(/^([a-zA-Z_][a-zA-Z0-9_]*)/);
      if (aliasMatch) {
        alias = aliasMatch[1];
        afterTable = afterTable.slice(aliasMatch[0].length).trimStart();
      }
    } else {
      // Check if next word is a valid alias (not a SQL keyword)
      const nextWordMatch = afterTable.match(/^([a-zA-Z_][a-zA-Z0-9_]*)/);
      if (nextWordMatch) {
        const nextWord = nextWordMatch[1].toUpperCase();
        if (!SQL_KEYWORDS.includes(nextWord)) {
          alias = nextWordMatch[1];
          afterTable = afterTable.slice(nextWordMatch[0].length).trimStart();
        }
      }
    }

    // Expect "ON" next
    if (!/^ON\s/i.test(afterTable)) {
      continue; // malformed JOIN, skip
    }
    afterTable = afterTable.replace(/^ON\s+/i, '');

    // Extract the ON clause by matching until the next JOIN/WHERE/ORDER BY/etc.
    const onClauseMatch = afterTable.match(/^(.+?)(?:\s+(?:LEFT\s+)?(?:RIGHT\s+)?(?:INNER\s+)?(?:FULL\s+)?(?:CROSS\s+)?JOIN\s+|\s+WHERE\s+|\s+ORDER\s+BY\s+|\s+LIMIT\s+|\s+OFFSET\s+|\s+GROUP\s+BY\s+|\s+HAVING\s+|\)?\s*$)/i);
    const onClause = onClauseMatch ? onClauseMatch[1].trim() : afterTable.trim();

    joins.push({ table, alias, onClause, type: joinType });
  }
  return joins;
}

function extractWhereClause(sql) {
  // Normalize newlines so . matches across lines
  const normalized = sql.replace(/\n/g, ' ').replace(/\r/g, '');
  // Find WHERE at depth 0 (not inside parentheses) to avoid matching subquery WHERE
  let depth = 0;
  for (let i = 0; i < normalized.length; i++) {
    if (normalized[i] === '(') depth++;
    else if (normalized[i] === ')') depth--;
    else if (depth === 0) {
      const slice = normalized.slice(i);
      if (/^WHERE\s/i.test(slice)) {
        const afterWhere = slice.slice(5).trim();
        // Find end of WHERE clause: next ORDER BY, LIMIT, OFFSET, GROUP BY, or end of string
        const endMatch = afterWhere.match(/(.+?)(?:\s+ORDER\s+BY|\s+LIMIT|\s+OFFSET|\s+GROUP\s+BY|$)/i);
        return endMatch ? endMatch[1].trim() : afterWhere.trim();
      }
    }
  }
  return null;
}

function extractSelectColumns(sql) {
  // Normalize newlines so . matches across lines
  const normalized = sql.replace(/\n/g, ' ').replace(/\r/g, '');
  // Find FROM at depth 0 (not inside subqueries)
  let depth = 0;
  let fromIdx = -1;
  for (let i = 0; i < normalized.length; i++) {
    if (normalized[i] === '(') depth++;
    else if (normalized[i] === ')') depth--;
    else if (depth === 0) {
      const slice = normalized.slice(i);
      if (/^FROM\s/i.test(slice)) {
        fromIdx = i;
        break;
      }
    }
  }
  if (fromIdx === -1) return '*';
  const selectEnd = normalized.slice(0, fromIdx).trimEnd();
  const m = selectEnd.match(/SELECT\s+(.+)/i);
  return m ? m[1].trim() : '*';
}

function isDistinct(sql) {
  return /SELECT\s+DISTINCT/i.test(sql);
}

function extractInsertColumns(sql) {
  const m = sql.match(/INSERT\s+INTO\s+\w+\s*\(([^)]+)\)/i);
  return m ? m[1].split(',').map(s => s.trim().replace(/"/g, '')) : [];
}

function extractInsertValues(sql) {
  const m = sql.match(/VALUES\s*\(([^)]+)\)/i);
  return m ? m[1].split(',').map(s => s.trim()) : [];
}

function splitAggColumns(colSpec) {
  // Split column specification by comma at depth 0 to handle
  // nested function calls like COALESCE(SUM(price), 0) AS total
  const parts = [];
  let depth = 0;
  let current = '';
  for (const ch of colSpec) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function extractSetClauses(sql) {
  const m = sql.match(/SET\s+(.+?)(?:\s+WHERE|$)/i);
  if (!m) return [];
  // Split by comma, respecting nested expressions
  const clauses = splitAggColumns(m[1]);
  return clauses;
}

function extractHasReturning(sql) {
  return /RETURNING\s+id/i.test(sql);
}

// ─── ON CONFLICT parser ─────────────────────────

/**
 * Parse ON CONFLICT clause from an INSERT statement.
 * Returns null if no ON CONFLICT clause is present.
 *
 * Returns:
 *   { conflictCols: [string], action: 'NOTHING' | 'UPDATE', setClauses: [{col, expr}] }
 *
 * For ON CONFLICT DO NOTHING without explicit conflict target, conflictCols is
 * an empty array (the mock can't infer unique constraints without schema tracking).
 */
function parseOnConflict(sql) {
  const conflictM = sql.match(/ON\s+CONFLICT\s*(?:\(([^)]+)\))?\s+/i);
  if (!conflictM) return null;

  const result = {
    conflictCols: conflictM[1]
      ? conflictM[1].split(',').map(s => s.trim().replace(/"/g, ''))
      : [],
    action: 'NOTHING',
    setClauses: [],
  };

  // Check for DO UPDATE
  const updateM = sql.slice(conflictM.index + conflictM[0].length).match(/^DO\s+UPDATE\s+SET\s+/i);
  if (updateM) {
    result.action = 'UPDATE';
    // Extract SET clauses after DO UPDATE SET ... until end of string
    const afterSet = sql.slice(conflictM.index + conflictM[0].length + updateM[0].length);
    const setClauses = splitAggColumns(afterSet);
    for (const clause of setClauses) {
      const eqIdx = clause.indexOf('=');
      if (eqIdx === -1) continue;
      const col = clause.slice(0, eqIdx).trim();
      const expr = clause.slice(eqIdx + 1).trim();
      result.setClauses.push({ col, expr });
    }
  }

  return result;
}

/**
 * Evaluate a DO UPDATE SET expression against an existing row.
 * Handles:
 *   - $N param references
 *   - tablename.column references (resolves to existing row value)
 *   - column references (resolves to existing row value)
 *   - numeric literals
 *   - string literals (quoted)
 *   - NOW()
 *   - expr1 + expr2 (addition, numeric or string concatenation)
 *   - expr1 - expr2 (subtraction)
 */
function evaluateUpsertExpr(expr, existingRow, params) {
  const clean = stripTypeCast(expr.trim());

  // $N -> lookup param
  if (/^\$\d+$/.test(clean)) {
    const idx = parseInt(clean.slice(1)) - 1;
    return idx < params.length ? params[idx] : undefined;
  }

  // NOW()
  if (/^now\(\)$/i.test(clean)) {
    return new Date().toISOString();
  }

  // NULL
  if (/^null$/i.test(clean)) {
    return null;
  }

  // quoted string
  if ((clean.startsWith("'") && clean.endsWith("'")) || (clean.startsWith('"') && clean.endsWith('"'))) {
    return clean.slice(1, -1);
  }

  // number
  if (/^-?\d+(\.\d+)?$/.test(clean)) {
    return parseFloat(clean);
  }

  // Binary operation: expr1 + expr2 or expr1 - expr2
  // Split on + or - at depth 0 (not inside parens)
  const parts = splitBinaryExpr(clean);
  if (parts.length >= 3) {
    let result = evaluateUpsertExpr(parts[0], existingRow, params);
    for (let i = 1; i < parts.length; i += 2) {
      const op = parts[i];
      const right = evaluateUpsertExpr(parts[i + 1], existingRow, params);
      if (op === '+') {
        result = (parseFloat(result) || 0) + (parseFloat(right) || 0);
      } else if (op === '-') {
        result = (parseFloat(result) || 0) - (parseFloat(right) || 0);
      }
    }
    return result;
  }

  // Column reference (possibly table-qualified: tablename.col)
  if (/^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(clean)) {
    const parts = clean.split('.');
    const col = parts[parts.length - 1];
    return existingRow[col] !== undefined ? existingRow[col] : undefined;
  }

  // Function call like GREATEST(...) — not supported, return the literal
  return clean;
}

/**
 * Split an expression by + or - operators at depth 0 (not inside parentheses).
 * Returns tokens as [left, op, right, op, right, ...]
 * e.g. "a + b" → ["a", "+", "b"]
 */
function splitBinaryExpr(expr) {
  const parts = [];
  let depth = 0;
  let current = '';
  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i];
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (depth === 0 && (ch === '+' || ch === '-')) {
      parts.push(current.trim());
      parts.push(ch);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

// ─── Main query handlers ────────────────────────

function handleSelect(sql, params) {
  const distinct = isDistinct(sql);
  const tableName = extractTableName(sql);
  if (!tableName || !tables[tableName]) return [];

  let rows = tables[tableName];
  const aliasToTable = { a: 'appointments', s: 'services', u: 'users' };
  const joins = parseJoins(sql);

  // Handle subquery in WHERE (e.g. (SELECT COUNT(*) FROM appointments WHERE user_id = u.id))
  // For simplicity, evaluate scalar subqueries
  let whereClause = extractWhereClause(sql);

  // When JOINs are present, transform aliased column references (a.date) to
  // table-prefixed names (appointments_date) to match the prefixed merged rows
  if (joins.length > 0 && whereClause) {
    whereClause = whereClause.replace(/(\w+)\.(\w+)/g, (m, prefix, col) => {
      const tbl = aliasToTable[prefix] || prefix;
      return tbl + '_' + col;
    });
  }
  const subqueryRegex = /\(\s*SELECT\s+(COUNT\(\*\)|SUM\([^)]+\))/gi;
  let subMatch;
  let modifiedWhere = whereClause;
  if (whereClause) {
    while ((subMatch = subqueryRegex.exec(whereClause)) !== null) {
      // For COUNT(*) subquery, evaluate it
      const subStart = whereClause.indexOf('(', subMatch.index);
      let depth = 0;
      let subEnd = subStart;
      for (let i = subStart; i < whereClause.length; i++) {
        if (whereClause[i] === '(') depth++;
        if (whereClause[i] === ')') { depth--; if (depth === 0) { subEnd = i; break; } }
      }
      const subQuery = whereClause.slice(subStart + 1, subEnd);
      const subTable = extractTableName(subQuery);
      const subWhere = extractWhereClause(subQuery);
      let count = 0;
      if (subTable && tables[subTable]) {
        // The subquery references outer columns like u.id
        // We need to evaluate it for each row
        count = 'CORRELATED'; // Mark as correlated
      }
      // We'll handle this in the filter loop below
      modifiedWhere = modifiedWhere.replace(whereClause.slice(subStart, subEnd + 1), '1=1');
    }
  }

  // Joins
  if (joins.length > 0) {
    // To avoid column name collisions (e.g. both users and services have 'name'),
    // prefix every column with the table name plus underscore before merging.
    function prefixRow(r, prefix) {
      const p = {};
      for (const [k, v] of Object.entries(r)) {
        p[prefix + '_' + k] = v;
      }
      return p;
    }

    // Helper: create a null-padded prefixed row for outer join preservation
    function nullPrefixedRow(joinTable, joinPrefix) {
      const nullRow = {};
      const firstJoinRow = tables[joinTable]?.[0];
      if (firstJoinRow) {
        for (const key of Object.keys(firstJoinRow)) {
          nullRow[joinPrefix + '_' + key] = null;
        }
      }
      return nullRow;
    }

    // Build ON clause evaluator helper to avoid duplicating alias-to-prefix logic
    function resolveOnClause(onClause) {
      return onClause
        .replace(/\ba\./g, 'appointments.')
        .replace(/\bs\./g, 'services.')
        .replace(/\bu\./g, 'users.')
        .replace(/(\w+)\.(\w+)/g, (m, prefix, col) => {
          const tbl = aliasToTable[prefix] || prefix;
          return tbl + '_' + col;
        });
    }

    const expanded = [];
    for (const row of rows) {
      let joinedRows = [prefixRow(row, tableName)];
      for (const join of joins) {
        if (!tables[join.table]) continue;
        const joinPrefix = join.table;
        const onWherePrefixed = resolveOnClause(join.onClause);
        const newJoined = [];

        for (const jr of joinedRows) {
          let matchFound = false;
          for (const joinRow of tables[join.table]) {
            // Merge: existing prefixed row + new prefixed row (existing takes priority)
            const merged = { ...prefixRow(joinRow, joinPrefix), ...jr };

            if (evaluateWhere(onWherePrefixed, merged, params)) {
              newJoined.push({ ...prefixRow(joinRow, joinPrefix), ...jr });
              matchFound = true;
            }
          }

          // LEFT JOIN: if no ON match, preserve left row with NULL right-side columns
          if (!matchFound && join.type === 'LEFT') {
            const nullRow = nullPrefixedRow(join.table, joinPrefix);
            newJoined.push({ ...nullRow, ...jr });
          }
        }

        // If no rows were produced at all (e.g. left table empty + LEFT JOIN fails)
        // and it's a LEFT JOIN, emit at least one null-padded row per original left row
        if (newJoined.length === 0 && join.type === 'LEFT') {
          for (const jr of joinedRows) {
            const nullRow = nullPrefixedRow(join.table, joinPrefix);
            newJoined.push({ ...nullRow, ...jr });
          }
        }

        joinedRows = newJoined;
      }
      expanded.push(...joinedRows);
    }
    rows = expanded;

  }

  // WHERE filtering
  if (whereClause) {
    rows = rows.filter(row => {
      // Pre-process subquery by evaluating against this row
      let wc = whereClause;
      const sqRegex = /\(\s*SELECT\s+(COUNT\(\*\)|SUM\([^)]+\))(?:::?\w+(?:\([^)]*\))?)?\s+FROM\s+(\w+)\s+(?:AS\s+\w+\s+)?WHERE\s+(.+?)\)/gi;
      let sqMatch;
      while ((sqMatch = sqRegex.exec(whereClause)) !== null) {
        const aggFn = sqMatch[1].toUpperCase();
        const aggTable = sqMatch[2];
        const aggWhere = sqMatch[3];
        // Replace outer column references (like u.id) with the actual row's data
        const resolvedWhere = aggWhere
          .replace(/(\w+)\.id/g, (m, alias) => {
            const val = row['id'];
            return val !== undefined ? String(val) : '0';
          });
        const count = tables[aggTable] ? tables[aggTable].filter(r => evaluateWhere(resolvedWhere, r, params)).length : 0;
        wc = wc.replace(sqRegex, String(count));
      }

      // Also resolve simple subquery patterns
      if (wc !== whereClause) {
        return evaluateWhere(wc, row, params);
      }
      return evaluateWhere(whereClause, row, params);
    });
  }

  // DISTINCT
  if (distinct && rows.length > 0) {
    const colSpec = extractSelectColumns(sql);
    let distinctCol = colSpec.replace(/DISTINCT\s+/i, '').trim();
    if (joins.length > 0 && distinctCol.includes('.')) {
      const [prefix, col] = distinctCol.split('.');
      const tbl = aliasToTable[prefix] || prefix;
      distinctCol = tbl + '_' + col;
    } else {
      distinctCol = distinctCol.split('.').pop();
    }
    const seen = new Set();
    rows = rows.filter(r => {
      const key = r[distinctCol];
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // ORDER BY
  const orderBy = parseOrderBy(sql, joins, aliasToTable);
  if (orderBy) {
    rows = [...rows].sort((a, b) => {
      for (const { col, dir } of orderBy) {
        const va = a[col] ?? '';
        const vb = b[col] ?? '';
        const cmp = String(va).localeCompare(String(vb));
        if (cmp !== 0) return cmp * dir;
      }
      return 0;
    });
  }

  // LIMIT / OFFSET
  const { limit, offset } = parseLimitOffset(sql);
  if (offset > 0 || limit < Infinity) {
    rows = rows.slice(offset, offset + limit);
  }

  // Map columns if specific columns are requested
  const colSpec = extractSelectColumns(sql);

  // Handle correlated subqueries in the SELECT list (e.g. (SELECT COUNT(*) ...) as alias)
  // These should be evaluated per-row before column mapping
  const hasSelectSubquery = /\(SELECT\s+/i.test(colSpec);
  if (hasSelectSubquery && rows.length > 0) {
    const subqueryInSelectRegex = /\(\s*SELECT\s+(COUNT\(\*\)|SUM\([^)]+\))(?:::?\w+(?:\([^)]*\))?)?\s+FROM\s+(\w+)\s+(?:AS\s+\w+\s+)?WHERE\s+(.+?)\)\s+as\s+(\w+)/gi;
    rows = rows.map(row => {
      let processed = { ...row };
      subqueryInSelectRegex.lastIndex = 0;
      let sqMatch;
      while ((sqMatch = subqueryInSelectRegex.exec(colSpec)) !== null) {
        const aggTable = sqMatch[2];
        const aggWhere = sqMatch[3];
        const aggAlias = sqMatch[4];
        // Replace outer column references (like u.id) with the actual row's data
        const resolvedWhere = aggWhere
          .replace(/(\w+)\.(\w+)/g, (m, alias, col) => {
            const tbl = aliasToTable[alias] || alias;
            const val = row[tbl + '_' + col] !== undefined ? row[tbl + '_' + col] : row[col];
            return val !== undefined ? String(val) : '0';
          });
        const count = tables[aggTable]
          ? tables[aggTable].filter(r => evaluateWhere(resolvedWhere, r, params)).length
          : 0;
        processed[aggAlias] = count;
      }
      return processed;
    });
  }

  if (colSpec !== '*' && !distinct && !/^\s*COUNT\s*\(|^\s*SUM\s*\(|^\s*COALESCE/i.test(colSpec)) {
    const cols = [];
    for (const s of colSpec.split(',')) {
      const trimmed = s.trim();
      const parts = trimmed.replace(/\s+AS\s+/i, ' AS ').split(/\s+AS\s+/i);
      const fullName = parts[0].trim();
      const alias = parts[1] ? parts[1].trim() : null;

      // Handle wildcard: a.* — expand to include all columns from that table
      if (fullName.endsWith('.*')) {
        const prefix = fullName.split('.')[0];
        cols.push({ wildcard: true, prefix });
      } else {
        const finalAlias = alias || fullName.split('.').pop();
        let lookupKey;
        if (joins.length > 0 && fullName.includes('.')) {
          const [prefix, col] = fullName.split('.');
          const tbl = aliasToTable[prefix] || prefix;
          lookupKey = tbl + '_' + col;
        } else {
          lookupKey = fullName.split('.').pop();
        }
        cols.push({ lookupKey, alias: finalAlias });
      }
    }

    rows = rows.map(row => {
      const mapped = {};
      for (const col of cols) {
        if (col.wildcard) {
          // Expand wildcard: include all columns from the specified table
          const prefix = col.prefix ? (aliasToTable[col.prefix] || col.prefix) + '_' : '';
          for (const [key, val] of Object.entries(row)) {
            if (key.startsWith(prefix)) {
              mapped[key.slice(prefix.length)] = val;
            }
          }
        } else {
          mapped[col.alias] = row[col.lookupKey] !== undefined ? row[col.lookupKey] : null;
        }
      }
      return mapped;
    });
  }    // Handle COUNT(*) / SUM / COALESCE aggregations (only when ALL columns are aggregated)
  if (/^\s*COUNT\s*\(|^\s*SUM\s*\(|^\s*COALESCE/i.test(colSpec)) {
    // Extract aliases and aggregate results
    // Split by comma at depth 0 to avoid splitting inside nested function calls
    // e.g. COALESCE(SUM(price), 0) AS total should stay as one element
    const aggCols = splitAggColumns(colSpec);
    const result = {};
    for (const agg of aggCols) {
      const asMatch = agg.match(/AS\s+(\w+)/i);
      const alias = asMatch ? asMatch[1] : 'count';      // Order matters: COALESCE must be checked BEFORE SUM
      // because COALESCE(SUM(...), 0) would trigger the SUM branch first
      if (/^\s*COALESCE/i.test(agg)) {
        // Parse COALESCE arguments using depth-based comma splitting
        // to handle nested parentheses (e.g. COALESCE(SUM(price), 0))
        const m = agg.match(/^COALESCE\s*\(/i);
        if (m) {
          const inner = agg.slice(m[0].length, agg.lastIndexOf(')'));
          let depth = 0;
          let commaIdx = -1;
          for (let i = 0; i < inner.length; i++) {
            if (inner[i] === '(') depth++;
            else if (inner[i] === ')') depth--;
            else if (inner[i] === ',' && depth === 0) { commaIdx = i; break; }
          }
          if (commaIdx !== -1) {
            const colExpr = inner.slice(0, commaIdx).trim();
            const fallbackExpr = inner.slice(commaIdx + 1).trim();
            if (/SUM\s*\(/i.test(colExpr)) {
              // COALESCE wrapping SUM: extract the nested SUM value
              const sumM = colExpr.match(/SUM\s*\((.+?)\)/i);
              if (sumM) {
                const col = sumM[1].replace(/::\w+(?:\([^)]*\))?/g, '').trim().split('.').pop();
                const sumVal = rows.reduce((sum, r) => sum + (parseFloat(r[col]) || 0), 0);
                const fallback = evaluateExpr(fallbackExpr, rows[0] || {}, params);
                result[alias] = rows.length > 0 ? sumVal : fallback;
                result[alias] = parseFloat(Number(result[alias]).toFixed(2));
              }
            } else {
              // Non-SUM COALESCE: sum the column directly with fallback
              const col = colExpr.replace(/::\w+(?:\([^)]*\))?/g, '').trim().split('.').pop();
              const fallback = evaluateExpr(fallbackExpr, rows[0] || {}, params);
              const sumVal = rows.reduce((sum, r) => sum + (parseFloat(r[col]) || 0), 0);
              result[alias] = rows.length > 0 ? sumVal : fallback;
              result[alias] = parseFloat(Number(result[alias]).toFixed(2));
            }
          }
        }
      } else if (/COUNT\s*\(\*\)/i.test(agg)) {
        result[alias] = rows.length;
      } else if (/COUNT\s*\(DISTINCT/i.test(agg)) {
        const colM = agg.match(/COUNT\s*\(\s*DISTINCT\s+(.+?)\)/i);
        if (colM) {
          const col = colM[1].split('.').pop().trim();
          const distinctVals = new Set(rows.map(r => r[col]));
          result[alias] = distinctVals.size;
        }
      } else if (/SUM\(/i.test(agg)) {
        const colM = agg.match(/SUM\s*\((.+?)\)/i);
        if (colM) {
          const col = colM[1].replace(/::\w+(?:\([^)]*\))?/g, '').trim().split('.').pop();
          result[alias] = rows.reduce((sum, r) => sum + (parseFloat(r[col]) || 0), 0);
        }
      } else if (/COALESCE/i.test(agg)) {
        // Parse COALESCE arguments using depth-based comma splitting
        // to handle nested parentheses (e.g. COALESCE(SUM(s.price)::numeric(10,2), 0))
        const m = agg.match(/^COALESCE\s*\(/i);
        if (m) {
          const inner = agg.slice(m[0].length, agg.lastIndexOf(')'));
          let depth = 0;
          let commaIdx = -1;
          for (let i = 0; i < inner.length; i++) {
            if (inner[i] === '(') depth++;
            else if (inner[i] === ')') depth--;
            else if (inner[i] === ',' && depth === 0) { commaIdx = i; break; }
          }
          if (commaIdx !== -1) {
            const colExpr = inner.slice(0, commaIdx).trim();
            const fallbackExpr = inner.slice(commaIdx + 1).trim();
            const col = colExpr.replace(/::\w+(?:\([^)]*\))?/g, '').trim().split('.').pop();
            const fallback = evaluateExpr(fallbackExpr, rows[0] || {}, params);
            const sumVal = rows.reduce((sum, r) => sum + (parseFloat(r[col]) || 0), 0);
            result[alias] = rows.length > 0 ? sumVal : fallback;
            // For numeric(10,2) cast
            result[alias] = parseFloat(Number(result[alias]).toFixed(2));
          }
        }
      }
    }
    return [result];
  }

  return rows;
}

function handleInsert(sql, params) {
  const tableName = extractTableNameInsert(sql);
  if (!tableName) throw new Error(`Cannot parse table from INSERT: ${sql}`);

  ensureTable(tableName);
  const cols = extractInsertColumns(sql);
  const vals = extractInsertValues(sql);

  // Check for ON CONFLICT clause
  const conflict = parseOnConflict(sql);

  // Build the new row values
  const newValues = {};
  cols.forEach((col, i) => {
    const valExpr = vals[i];
    newValues[col] = evaluateExpr(valExpr, {}, params);
  });

  // Handle ON CONFLICT: check if a conflicting row already exists
  if (conflict) {
    // For explicit conflict target like ON CONFLICT (user_id), check those columns
    // For no target (ON CONFLICT DO NOTHING without column list), the mock
    // cannot infer unique constraints — skip conflict detection (insert proceeds)
    if (conflict.conflictCols.length > 0) {
      const existingIdx = tables[tableName].findIndex(row =>
        conflict.conflictCols.every(col => {
          const newVal = newValues[col];
          const existingVal = row[col];
          return newVal === existingVal || (newVal == null && existingVal == null);
        })
      );

      if (existingIdx !== -1) {
        // Conflict found
        if (conflict.action === 'NOTHING') {
          // Skip insert, return existing row's ID
          return { lastInsertRowid: tables[tableName][existingIdx].id, rowCount: 0 };
        } else if (conflict.action === 'UPDATE') {
          // DO UPDATE: apply SET clauses to the existing row
          const existingRow = tables[tableName][existingIdx];
          for (const { col, expr } of conflict.setClauses) {
            // Only set columns that don't have table-qualified naming
            // The column name in SET might be just the column name (e.g. "balance_cents")
            const colName = col.split('.').pop();
            const val = evaluateUpsertExpr(expr, existingRow, params);
            if (val !== undefined) {
              existingRow[colName] = val;
            }
          }
          // Ensure updated_at is set
          if (existingRow.updated_at === undefined) {
            existingRow.updated_at = new Date().toISOString();
          }
          return { lastInsertRowid: existingRow.id, rowCount: 1 };
        }
      }
    }
  }

  // No conflict or conflict not detected — insert normally
  const row = { id: nextId(tableName), ...newValues };

  // Add default columns
  if (tableName === 'users' && row.created_at === undefined) row.created_at = new Date().toISOString();
  if (tableName === 'services' && row.created_at === undefined) row.created_at = new Date().toISOString();
  if (tableName === 'services' && row.is_active === undefined) row.is_active = 1;
  if (tableName === 'appointments' && row.created_at === undefined) row.created_at = new Date().toISOString();
  if (tableName === 'appointments' && row.updated_at === undefined) row.updated_at = new Date().toISOString();
  if (tableName === 'appointments' && row.reminder_sent === undefined) row.reminder_sent = 0;

  tables[tableName].push(row);

  if (extractHasReturning(sql)) {
    return { lastInsertRowid: row.id, rowCount: 1 };
  }
  return { lastInsertRowid: row.id, rowCount: 1 };
}

function handleUpdate(sql, params) {
  const tableName = extractTableNameUpdate(sql);
  if (!tableName || !tables[tableName]) return { lastInsertRowid: null, rowCount: 0 };

  const setClauses = extractSetClauses(sql);
  const whereClause = extractWhereClause(sql);

  let count = 0;
  for (const row of tables[tableName]) {
    if (evaluateWhere(whereClause, row, params)) {
      for (const clause of setClauses) {
        const eqIdx = clause.indexOf('=');
        const col = clause.slice(0, eqIdx).trim();
        const valExpr = clause.slice(eqIdx + 1).trim();
        const val = evaluateExpr(valExpr, row, params);
        // Handle special: status = 'cancelled' (inline string)
        if (/^'[^']*'$/.test(valExpr)) {
          row[col] = valExpr.slice(1, -1);
        } else if (/^now\(\)$/i.test(valExpr)) {
          row[col] = new Date().toISOString();
        } else {
          row[col] = val;
        }
      }
      count++;
    }
  }

  return { lastInsertRowid: null, rowCount: count };
}

function handleDelete(sql, params) {
  const tableName = extractTableNameDelete(sql);
  if (!tableName || !tables[tableName]) return { lastInsertRowid: null, rowCount: 0 };

  const whereClause = extractWhereClause(sql);
  const before = tables[tableName].length;
  tables[tableName] = tables[tableName].filter(row => !evaluateWhere(whereClause, row, params));
  const deleted = before - tables[tableName].length;

  return { lastInsertRowid: null, rowCount: deleted };
}

function handleCreateTable(sql) {
  // Extract table name, create if not exists — no schema enforcement
  const m = sql.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/i);
  if (m) {
    ensureTable(m[1]);
  }
  return { rows: [] };
}

function handleAlterTable(sql) {
  // No-op: mock doesn't enforce schema
  // ALTER TABLE users ADD COLUMN ...
  return { rows: [] };
}

function handleInformationSchema(sql) {
  // Return empty result for information_schema queries
  return { rows: [] };
}

function handleSelect1(sql) {
  // SELECT 1
  return { rows: [{ '?column?': 1 }] };
}

// ─── Main SQL dispatcher ────────────────────────

function dispatchQuery(sql, params) {
  const trimmed = sql.trim();

  // CREATE SCHEMA
  if (/CREATE\s+SCHEMA/i.test(trimmed)) return { rows: [] };

  // SET search_path
  if (/SET\s+search_path/i.test(trimmed)) return { rows: [] };

  // SELECT 1
  if (/^SELECT\s+1$/i.test(trimmed)) return handleSelect1(trimmed);

  // information_schema
  if (/information_schema/i.test(trimmed)) return handleInformationSchema(trimmed);

  // CREATE TABLE
  if (/CREATE\s+TABLE/i.test(trimmed)) return handleCreateTable(trimmed);

  // ALTER TABLE
  if (/ALTER\s+TABLE/i.test(trimmed)) return handleAlterTable(trimmed);

  // DROP SCHEMA
  if (/DROP\s+SCHEMA/i.test(trimmed)) return { rows: [] };

  // INSERT
  if (/^INSERT/i.test(trimmed)) return handleInsert(trimmed, params);

  // UPDATE
  if (/^UPDATE/i.test(trimmed)) return handleUpdate(trimmed, params);

  // DELETE
  if (/^DELETE/i.test(trimmed)) return handleDelete(trimmed, params);

  // SELECT
  if (/^SELECT/i.test(trimmed)) {
    return handleSelect(trimmed, params);
  }

  throw new Error(`Mock db: Unsupported SQL: ${trimmed.slice(0, 100)}`);
}

// ─── Exported API (matching db.js) ──────────────

async function initDatabase() {
  reset();
  seedDefaults();
  return poolMock;
}

function getDb() {
  return poolMock;
}

async function queryAll(sql, params = []) {
  const result = dispatchQuery(sql, params);
  if (Array.isArray(result)) return result;
  return result.rows || [];
}

async function queryOne(sql, params = []) {
  const rows = await queryAll(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

async function run(sql, params = []) {
  const result = dispatchQuery(sql, params);
  if (result.lastInsertRowid !== undefined) {
    return { lastInsertRowid: result.lastInsertRowid, rowCount: result.rowCount || 1 };
  }
  return { lastInsertRowid: null, rowCount: result.rowCount || 0 };
}

async function closePool() {
  // no-op
}

async function dropSchema() {
  // no-op
}

const poolMock = {
  query: dispatchQuery,
  connect: async () => ({
    query: dispatchQuery,
    release: () => {},
  }),
  end: async () => {},
};

module.exports = {
  initDatabase,
  getDb,
  queryAll,
  queryOne,
  run,
  closePool,
  dropSchema,
  // Test helpers
  _reset: reset,
  _seedDefaults: seedDefaults,
  _getTables: () => tables,
  _getTable: (name) => tables[name] || [],
};
