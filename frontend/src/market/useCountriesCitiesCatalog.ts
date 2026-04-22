import { useCallback, useEffect, useMemo, useState } from "react";

const API = "https://countriesnow.space/api/v0.1/countries";
const CACHE_KEY = "pawhub_market_location_catalog_v1";

export type CountryCatalogRow = { country: string; cities: string[] };

type ApiResponse = { error?: boolean; msg?: string; data?: CountryCatalogRow[] };

function readCache(): CountryCatalogRow[] | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as unknown;
    if (!Array.isArray(p)) return null;
    return p as CountryCatalogRow[];
  } catch {
    return null;
  }
}

/**
 * Loads country → city lists once (sessionStorage cache ~1MB) for Paw Market area pickers.
 */
export function useCountriesCitiesCatalog() {
  const [rows, setRows] = useState<CountryCatalogRow[] | null>(() => readCache());
  const [loading, setLoading] = useState(() => readCache() == null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (rows != null) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        setLoading(true);
        const res = await fetch(API);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as ApiResponse;
        if (json.error || !Array.isArray(json.data)) {
          throw new Error(typeof json.msg === "string" ? json.msg : "Invalid catalog response");
        }
        if (cancelled) return;
        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify(json.data));
        } catch {
          // quota or private mode — still use in-memory
        }
        setRows(json.data);
        setError(null);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load location list");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [rows]);

  const countries = useMemo(() => {
    if (!rows) return [];
    return rows.map((r) => r.country).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  }, [rows]);

  const citiesForCountry = useMemo(() => {
    const map = new Map<string, string[]>();
    if (!rows) return map;
    for (const r of rows) {
      const sorted = [...(r.cities ?? [])].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
      map.set(r.country, sorted);
    }
    return map;
  }, [rows]);

  const getCities = useCallback(
    (countryName: string) => {
      if (!countryName) return [];
      return citiesForCountry.get(countryName) ?? [];
    },
    [citiesForCountry]
  );

  return { countries, getCities, loading, error, hasData: rows != null && rows.length > 0 };
}
