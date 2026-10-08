"use client";

import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { FALLBACK_SETTINGS, type ResolvedSettings } from "@/lib/childSettings";
import { toCyrillic } from "@/lib/script";
import { setChildSettings } from "@/lib/settingsStore";
import { cn } from "@/lib/cn";

const ChildSettingsContext = createContext<ResolvedSettings>(FALLBACK_SETTINGS);

/** Podešavanja deteta (uzrast, pismo, zvuk, pomoć). Van provajdera vraća preporuke za srednji uzrast. */
export function useChildSettings(): ResolvedSettings {
    return useContext(ChildSettingsContext);
}

const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "TEXTAREA", "INPUT", "SELECT", "OPTION"]);

function isSkipped(node: Node): boolean {
    const element = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
    return Boolean(element?.closest("[data-no-translit]")) || Boolean(element && SKIP_TAGS.has(element.tagName));
}

function convertText(node: Node) {
    if (node.nodeType !== Node.TEXT_NODE || !node.nodeValue || isSkipped(node)) return;
    const converted = toCyrillic(node.nodeValue);
    if (converted !== node.nodeValue) node.nodeValue = converted;
}

function convertTree(root: Node) {
    if (root.nodeType === Node.TEXT_NODE) {
        convertText(root);
        return;
    }
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) convertText(node);
}

interface ProviderProps {
    settings: ResolvedSettings;
    children: ReactNode;
    className?: string;
}

/**
 * Obuhvata dečji deo aplikacije i primenjuje podešavanja:
 *  • pismo — ako je izabrana ćirilica, sav vidljiv tekst se preslovljava (sadržaj igara
 *    je pisan latinicom; glas i dalje čita izvorni tekst)
 *  • velika slova i smanjeno kretanje — preko data-atributa i CSS-a (globals.css)
 *  • zvuk — podešavanja se prosleđuju modulima za zvuk i govor
 * Delovi označeni sa `data-no-translit` (npr. logo) se ne preslovljavaju.
 */
export function ChildSettingsProvider({ settings, children, className }: ProviderProps) {
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setChildSettings(settings);
        return () => setChildSettings(FALLBACK_SETTINGS);
    }, [settings]);

    useEffect(() => {
        const root = rootRef.current;
        if (settings.script !== "cyrillic" || !root) return;

        convertTree(root);
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === "characterData") convertText(mutation.target);
                else mutation.addedNodes.forEach(convertTree);
            }
        });
        observer.observe(root, { subtree: true, childList: true, characterData: true });
        return () => observer.disconnect();
    }, [settings.script]);

    return (
        <ChildSettingsContext.Provider value={settings}>
            <div
                ref={rootRef}
                lang={settings.script === "cyrillic" ? "sr-Cyrl" : "sr-Latn"}
                data-caps={settings.uppercase ? "" : undefined}
                data-motion={settings.reduceMotion ? "reduced" : undefined}
                className={cn(className)}
            >
                {children}
            </div>
        </ChildSettingsContext.Provider>
    );
}
