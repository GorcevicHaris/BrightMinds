// tests/setup/register.mjs
// Učitava se pre testova (`node --import ./tests/setup/register.mjs --test …`).
//
// Node sam izvršava .ts fajlove (briše tipove), ali ne zna za četiri stvari koje Next.js
// rešava sam, pa ih ovde dodaje mala kuka za razrešavanje modula:
//   1. alias `@/x` → `<koren>/x` (tsconfig `paths`);
//   2. uvoz bez nastavka (`./games`) → `.ts`, `.tsx`, `/index.ts`;
//   3. `next/server` i slični podputevi paketa bez nastavka → `.js`;
//   4. `.tsx` iz projekta (JSX) se prevodi TypeScript kompajlerom.
// Uz to zamenjuje dva modula test-dvojnicima (videti README, odeljak „Testovi”):
//   • `next/headers`          → tests/setup/nextHeaders.ts (kolačići koje postavlja test);
//   • `@supabase/supabase-js` → tests/setup/fakeSupabase.ts (baza u memoriji).
// Pravi lib/supabase.ts i lib/auth.ts ostaju netaknuti i izvršavaju se u testovima.
import { createRequire, registerHooks } from "node:module";
import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ROOT_URL = pathToFileURL(ROOT).href + "/";

// ── Okruženje testa ───────────────────────────────────────────────────────────
// Vrednosti postoje samo u procesu testa; .env.local se nikada ne čita.
process.env.JWT_SECRET = "test-only-secret-not-used-anywhere-else";
process.env.NEXT_PUBLIC_SUPABASE_URL = "http://supabase.test.invalid";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-only-service-role-key";
// Zona procesa je namerno RAZLIČITA od zone aplikacije (Europe/Belgrade), da test padne
// ako neko računanje dana osloni na zonu servera umesto na `APP_TIME_ZONE`.
process.env.TZ = "UTC";

const STUBS = {
    "next/headers": pathToFileURL(path.join(ROOT, "tests/setup/nextHeaders.ts")).href,
    "@supabase/supabase-js": pathToFileURL(path.join(ROOT, "tests/setup/fakeSupabase.ts")).href,
};

function isFile(candidate) {
    return statSync(candidate, { throwIfNoEntry: false })?.isFile() ?? false;
}

/** Putanja bez nastavka → postojeći fajl, redom kojim ih traži i Next.js. */
function findSource(base) {
    return [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts"), path.join(base, "index.tsx")].find(isFile) ?? null;
}

function isProjectSource(url) {
    return Boolean(url?.startsWith(ROOT_URL)) && !url.includes("/node_modules/");
}

function isRelative(specifier) {
    return specifier.startsWith("./") || specifier.startsWith("../");
}

// Sintaksa koju Node ne ume samo da obriše (traži pravo prevođenje): svojstva-parametri
// konstruktora (`constructor(public status: number)`), `enum` i `namespace`.
const NEEDS_TRANSPILE =
    /\bconstructor\s*\([^)]*\b(?:public|private|protected|readonly)\s|^\s*(?:export\s+)?(?:declare\s+)?(?:const\s+)?enum\s|^\s*(?:export\s+)?namespace\s/m;

let typescript = null;

/** Prevodi jedan fajl TypeScript kompajlerom koji je već u devDependencies (učitava se tek kad zatreba). */
function transpile(source, url) {
    const jsx = url.endsWith(".tsx");
    typescript ??= createRequire(import.meta.url)("typescript");
    return typescript.transpileModule(source, {
        fileName: fileURLToPath(url),
        compilerOptions: {
            module: typescript.ModuleKind.ESNext,
            target: typescript.ScriptTarget.ES2022,
            // Kao Next.js (SWC): polja klase se dodeljuju u konstruktoru
            useDefineForClassFields: false,
            // .tsx (npr. katalog predmeta sa SVG crtežima): JSX → react/jsx-runtime, kao u Next.js
            ...(jsx ? { jsx: typescript.JsxEmit.ReactJSX } : {}),
            inlineSourceMap: true,
            inlineSources: true,
        },
    }).outputText;
}

registerHooks({
    resolve(specifier, context, nextResolve) {
        if (Object.hasOwn(STUBS, specifier)) return { url: STUBS[specifier], format: "module-typescript", shortCircuit: true };

        let base = null;
        if (specifier.startsWith("@/")) base = path.join(ROOT, specifier.slice(2));
        else if (isRelative(specifier) && isProjectSource(context.parentURL)) {
            base = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
        }
        if (base !== null) {
            const file = findSource(base);
            if (file) {
                const format = /\.tsx?$/.test(file) ? { format: "module-typescript" } : {};
                return { url: pathToFileURL(file).href, ...format, shortCircuit: true };
            }
        }

        try {
            const resolved = nextResolve(specifier, context);
            // Ulazni test fajl: package.json nema "type", pa Node inače pogađa format (uz upozorenje)
            const isProjectTs = isProjectSource(resolved.url) && resolved.url.endsWith(".ts");
            return isProjectTs ? { ...resolved, format: "module-typescript" } : resolved;
        } catch (error) {
            // `next/server` → `next/server.js`: Node u ESM-u ne dodaje nastavak podputu paketa
            const isBareSubpath = !isRelative(specifier) && !path.isAbsolute(specifier) && !/^[a-z][a-z0-9+.-]*:/i.test(specifier);
            if (error?.code === "ERR_MODULE_NOT_FOUND" && isBareSubpath && specifier.includes("/")) {
                return nextResolve(`${specifier}.js`, context);
            }
            throw error;
        }
    },

    load(url, context, nextLoad) {
        // Node ume samo da obriše tipove, JSX ne razume: .tsx iz projekta se uvek prevodi
        if (isProjectSource(url) && url.endsWith(".tsx")) {
            const source = readFileSync(fileURLToPath(url), "utf8");
            return { format: "module", source: transpile(source, url), shortCircuit: true };
        }
        const result = nextLoad(url, context);
        if (!isProjectSource(url) || !url.endsWith(".ts") || result.source == null) return result;

        const source = result.source.toString();
        if (!NEEDS_TRANSPILE.test(source)) return result;
        return { format: "module", source: transpile(source, url), shortCircuit: true };
    },
});
