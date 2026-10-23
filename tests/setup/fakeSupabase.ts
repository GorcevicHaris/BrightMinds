// tests/setup/fakeSupabase.ts
// Baza u memoriji umesto `@supabase/supabase-js` (zamenu radi tests/setup/register.mjs).
//
// lib/supabase.ts ostaje pravi: on pozove `createClient(...)` i dobije ovaj lažni klijent,
// pa se `supabaseAdmin`, `withSchemaFallback` i prepoznavanje grešaka izvršavaju kao u
// produkciji. Podržan je samo deo PostgREST upita koji rute zaista koriste.
//
// U testu:
//   db.reset();                                   // prazna baza sa svim migracijama
//   db.seed("children", [{ id: 1, … }]);          // redovi (id se dodeljuje ako ga nema)
//   db.dropColumns("progress_logs", "passed");    // „kolona ne postoji” → PGRST204
//   db.dropTable("play_sessions");                // „tabela ne postoji” → PGRST205
//   db.failNext("children", "insert", { code: "23505" });   // jednokratna greška baze
//   db.rows("progress_logs");                     // šta je ruta upisala
// Filter po putanji u JSON koloni (`.eq("settings->companion->>v", "3")`) je podržan.

export type Row = Record<string, unknown>;
type Operation = "select" | "insert" | "update" | "delete";

export interface DbError {
    code: string;
    message: string;
}

interface Result {
    data: unknown;
    error: DbError | null;
}

type Predicate = (row: Row) => boolean;

// ── Poređenje vrednosti ───────────────────────────────────────────────────────

const isNullish = (value: unknown): boolean => value === null || value === undefined;

/** Redosled kao u Postgresu: NULL je „najveći” (ASC → na kraju, DESC → na početku). */
function compare(a: unknown, b: unknown): number {
    if (isNullish(a) || isNullish(b)) return Number(isNullish(a)) - Number(isNullish(b));
    if (typeof a === "number" && typeof b === "number") return a - b;
    return String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0;
}

const COMPARISONS: Record<string, (value: unknown, operand: unknown) => boolean> = {
    eq: (value, operand) => value === operand,
    neq: (value, operand) => !isNullish(value) && value !== operand,
    gt: (value, operand) => !isNullish(value) && compare(value, operand) > 0,
    gte: (value, operand) => !isNullish(value) && compare(value, operand) >= 0,
    lt: (value, operand) => !isNullish(value) && compare(value, operand) < 0,
    lte: (value, operand) => !isNullish(value) && compare(value, operand) <= 0,
    is: (value, operand) => (operand === null ? isNullish(value) : value === operand),
};

function likePattern(pattern: string, flags: string): RegExp {
    const source = pattern.replace(/\\.|[%_]|[^\\%_]+/g, (token) => {
        if (token === "%") return ".*";
        if (token === "_") return ".";
        return (token.startsWith("\\") ? token.slice(1) : token).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    });
    return new RegExp(`^${source}$`, `s${flags}`);
}

// ── Putanja u JSON koloni: "settings->companion->>v" ──────────────────────────
// `->` vodi u objekat, `->>` vraća vrednost kao tekst (kao u Postgresu); nepostojeće je NULL.

function columnName(column: string): string {
    return column.split("->")[0];
}

function readColumn(row: Row, column: string): unknown {
    if (!column.includes("->")) return row[column];
    const steps = column.split(/(->>?)/);
    let value: unknown = row[steps[0]];
    let asText = false;
    for (let i = 1; i < steps.length; i += 2) {
        if (typeof value !== "object" || value === null) return null;
        value = (value as Row)[steps[i + 1]];
        asText = steps[i] === "->>";
    }
    if (isNullish(value)) return null;
    return asText ? (typeof value === "object" ? JSON.stringify(value) : String(value)) : value;
}

// ── Izraz za `.or(...)`: "level.lt.5,and(level.eq.5,id.lt.10)" ────────────────

function splitTopLevel(expression: string): string[] {
    const parts: string[] = [];
    let depth = 0;
    let current = "";
    for (const char of expression) {
        if (char === "(") depth += 1;
        if (char === ")") depth -= 1;
        if (char === "," && depth === 0) {
            parts.push(current);
            current = "";
        } else current += char;
    }
    return [...parts, current];
}

function parseOperand(text: string): unknown {
    if (text === "null") return null;
    return /^-?\d+(\.\d+)?$/.test(text) ? Number(text) : text;
}

function parseLogic(expression: string, columns: Set<string>, mode: "or" | "and"): Predicate {
    const terms = splitTopLevel(expression).map((term): Predicate => {
        const group = /^(and|or)\((.*)\)$/.exec(term);
        if (group) return parseLogic(group[2], columns, group[1] as "or" | "and");

        const [column, operator, ...rest] = term.split(".");
        const matches = COMPARISONS[operator];
        if (!matches) throw new Error(`fakeSupabase: operator "${operator}" u or() nije podržan`);
        columns.add(column);
        const operand = parseOperand(rest.join("."));
        return (row) => matches(row[column], operand);
    });
    return (row) => (mode === "or" ? terms.some((term) => term(row)) : terms.every((term) => term(row)));
}

// ── Upit ──────────────────────────────────────────────────────────────────────

class Query implements PromiseLike<Result> {
    private operation: Operation = "select";
    private payload: Row[] = [];
    private columns: string | null = null;
    private readonly filters: Predicate[] = [];
    private readonly orders: { column: string; ascending: boolean }[] = [];
    private window: { from: number; to: number } | null = null;
    private cardinality: "many" | "one" | "maybeOne" = "many";
    /** Sve kolone koje upit pominje — za proveru „kolona ne postoji” */
    private readonly mentioned = new Set<string>();
    private readonly database: FakeDatabase;
    private readonly table: string;

    // Bez svojstava-parametara (`constructor(private x)`): Node ih ne ume samo da obriše
    constructor(database: FakeDatabase, table: string) {
        this.database = database;
        this.table = table;
    }

    // Šta se radi
    select(columns = "*"): this {
        this.columns = columns;
        return this;
    }
    insert(values: Row | Row[]): this {
        this.operation = "insert";
        this.payload = Array.isArray(values) ? values : [values];
        return this;
    }
    update(values: Row): this {
        this.operation = "update";
        this.payload = [values];
        return this;
    }
    delete(): this {
        this.operation = "delete";
        return this;
    }

    // Filteri
    private where(column: string, test: (value: unknown) => boolean): this {
        this.mentioned.add(columnName(column));
        this.filters.push((row) => test(readColumn(row, column)));
        return this;
    }
    eq(column: string, operand: unknown): this {
        return this.where(column, (value) => COMPARISONS.eq(value, operand));
    }
    neq(column: string, operand: unknown): this {
        return this.where(column, (value) => COMPARISONS.neq(value, operand));
    }
    gt(column: string, operand: unknown): this {
        return this.where(column, (value) => COMPARISONS.gt(value, operand));
    }
    lt(column: string, operand: unknown): this {
        return this.where(column, (value) => COMPARISONS.lt(value, operand));
    }
    in(column: string, operands: readonly unknown[]): this {
        return this.where(column, (value) => operands.includes(value));
    }
    is(column: string, operand: null | boolean): this {
        return this.where(column, (value) => COMPARISONS.is(value, operand));
    }
    like(column: string, pattern: string): this {
        const regex = likePattern(pattern, "");
        return this.where(column, (value) => typeof value === "string" && regex.test(value));
    }
    ilike(column: string, pattern: string): this {
        const regex = likePattern(pattern, "i");
        return this.where(column, (value) => typeof value === "string" && regex.test(value));
    }
    not(column: string, operator: string, operand: unknown): this {
        const matches = COMPARISONS[operator];
        if (!matches) throw new Error(`fakeSupabase: not("${operator}") nije podržan`);
        return this.where(column, (value) => !matches(value, operand));
    }
    or(expression: string): this {
        this.filters.push(parseLogic(expression, this.mentioned, "or"));
        return this;
    }

    // Oblik rezultata
    order(column: string, { ascending = true }: { ascending?: boolean } = {}): this {
        this.mentioned.add(column);
        this.orders.push({ column, ascending });
        return this;
    }
    limit(count: number): this {
        this.window = { from: 0, to: count - 1 };
        return this;
    }
    range(from: number, to: number): this {
        this.window = { from, to };
        return this;
    }
    single(): this {
        this.cardinality = "one";
        return this;
    }
    maybeSingle(): this {
        this.cardinality = "maybeOne";
        return this;
    }

    then<A = Result, B = never>(
        onFulfilled?: ((value: Result) => A | PromiseLike<A>) | null,
        onRejected?: ((reason: unknown) => B | PromiseLike<B>) | null
    ): Promise<A | B> {
        return new Promise<Result>((resolve) => resolve(this.run())).then(onFulfilled, onRejected);
    }

    private selectedColumns(): string[] {
        if (this.columns === null || this.columns.trim() === "*") return [];
        return this.columns.split(",").map((column) => column.trim());
    }

    private run(): Result {
        const { database, table, operation } = this;
        database.queries.push({ table, operation });

        const written = operation === "insert" || operation === "update" ? this.payload.flatMap(Object.keys) : [];
        const schemaError = database.schemaError(table, [...this.mentioned, ...this.selectedColumns(), ...written]);
        if (schemaError) return { data: null, error: schemaError };
        const injected = database.takeFailure(table, operation);
        if (injected) return { data: null, error: injected };

        const stored = database.rows(table);
        const matches = (row: Row) => this.filters.every((filter) => filter(row));
        let affected: Row[];
        if (operation === "insert") {
            affected = this.payload.map((values) => database.insert(table, values));
        } else if (operation === "update") {
            affected = stored.filter(matches);
            for (const row of affected) Object.assign(row, structuredClone(this.payload[0]));
        } else if (operation === "delete") {
            affected = stored.filter(matches);
            database.replace(table, stored.filter((row) => !affected.includes(row)));
        } else {
            affected = stored.filter(matches);
        }

        // Izmene bez `.select()` ne vraćaju redove (kao PostgREST bez `Prefer: return=representation`)
        if (operation !== "select" && this.columns === null) return { data: null, error: null };

        let rows = [...affected];
        for (const { column, ascending } of [...this.orders].reverse()) {
            rows.sort((a, b) => (ascending ? compare(a[column], b[column]) : compare(b[column], a[column])));
        }
        if (this.window) rows = rows.slice(this.window.from, this.window.to + 1);

        const selected = this.selectedColumns();
        const shaped = rows.map((row) => {
            const copy = structuredClone(row);
            return selected.length === 0 ? copy : Object.fromEntries(selected.map((column) => [column, copy[column] ?? null]));
        });

        if (this.cardinality === "many") return { data: shaped, error: null };
        if (shaped.length === 1) return { data: shaped[0], error: null };
        if (shaped.length === 0 && this.cardinality === "maybeOne") return { data: null, error: null };
        return { data: null, error: { code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned" } };
    }
}

// ── Baza ──────────────────────────────────────────────────────────────────────

class FakeDatabase {
    private tables = new Map<string, Row[]>();
    private missingTables = new Set<string>();
    private missingColumns = new Map<string, Set<string>>();
    private failures: { table: string; operation: Operation; error: DbError }[] = [];
    /** Izvršeni upiti, redom — npr. da se proveri koliko je puta ruta pokušala upis */
    queries: { table: string; operation: Operation }[] = [];

    /** Prazna baza u kojoj postoje sve tabele i kolone. */
    reset(): void {
        this.tables = new Map();
        this.missingTables = new Set();
        this.missingColumns = new Map();
        this.failures = [];
        this.queries = [];
    }

    seed(table: string, rows: Row[]): void {
        for (const row of rows) this.insert(table, row);
    }

    /** Živi redovi tabele (kopija niza; redovi su isti objekti koje menja `update`). */
    rows(table: string): Row[] {
        return [...(this.tables.get(table) ?? [])];
    }

    /** Tabela ili pogled ne postoji (migracija nije primenjena) → greška PGRST205. */
    dropTable(table: string): void {
        this.missingTables.add(table);
    }

    /** Kolone ne postoje (migracija nije primenjena) → greška PGRST204 čim ih upit pomene. */
    dropColumns(table: string, ...columns: string[]): void {
        const missing = this.missingColumns.get(table) ?? new Set<string>();
        for (const column of columns) missing.add(column);
        this.missingColumns.set(table, missing);
    }

    /** Sledeći upit te vrste nad tabelom vraća zadatu grešku (npr. 23505 — jedinstveni indeks). */
    failNext(table: string, operation: Operation, error: { code: string; message?: string }): void {
        this.failures.push({ table, operation, error: { message: `fakeSupabase: ${error.code}`, ...error } });
    }

    /** Broj izvršenih upita date vrste nad tabelom. */
    count(table: string, operation: Operation): number {
        return this.queries.filter((query) => query.table === table && query.operation === operation).length;
    }

    from(table: string): Query {
        return new Query(this, table);
    }

    // ── Za `Query` ────────────────────────────────────────────────────────────

    schemaError(table: string, columns: readonly string[]): DbError | null {
        if (this.missingTables.has(table)) {
            return { code: "PGRST205", message: `Could not find the table 'public.${table}' in the schema cache` };
        }
        const missing = columns.find((column) => this.missingColumns.get(table)?.has(column));
        if (missing === undefined) return null;
        return { code: "PGRST204", message: `Could not find the '${missing}' column of '${table}' in the schema cache` };
    }

    takeFailure(table: string, operation: Operation): DbError | null {
        const index = this.failures.findIndex((failure) => failure.table === table && failure.operation === operation);
        return index === -1 ? null : this.failures.splice(index, 1)[0].error;
    }

    insert(table: string, values: Row): Row {
        const rows = this.tables.get(table) ?? [];
        const nextId = rows.reduce((max, row) => (typeof row.id === "number" ? Math.max(max, row.id) : max), 0) + 1;
        const row: Row = { id: nextId, ...structuredClone(values) };
        rows.push(row);
        this.tables.set(table, rows);
        return row;
    }

    replace(table: string, rows: Row[]): void {
        this.tables.set(table, rows);
    }
}

/** Jedina baza u procesu testa; svaki test počinje sa `db.reset()`. */
export const db = new FakeDatabase();

/** Potpis kao u `@supabase/supabase-js`; argumenti (URL, ključ) se ne koriste. */
export function createClient(): FakeDatabase {
    return db;
}
