"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

type StorageSerializer<T> = (value: T) => string;
type StorageDeserializer<T> = (raw: string) => T;

type UseLocalStorageStateOptions<T> = {
  serialize?: StorageSerializer<T>;
  deserialize?: StorageDeserializer<T>;
};

const defaultSerialize = <T,>(value: T) => JSON.stringify(value);

const defaultDeserialize = <T,>(raw: string) => {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return raw as T;
  }
};

const resolveDefault = <T,>(value: T | (() => T)) =>
  typeof value === "function" ? (value as () => T)() : value;

export const useLocalStorageState = <T,>(
  key: string | undefined,
  defaultValue: T | (() => T),
  options: UseLocalStorageStateOptions<T> = {}
) => {
  const serialize = options.serialize ?? defaultSerialize;
  const deserialize = options.deserialize ?? defaultDeserialize;
  const [state, setState] = useState<T>(() => resolveDefault(defaultValue));
  const [hydrated, setHydrated] = useState(false);
  const hydratedRef = useRef(false);
  const keyRef = useRef<string | undefined>(key);

  const resolvedDefault = useMemo(() => resolveDefault(defaultValue), [defaultValue]);

  useEffect(() => {
    if (!key) return;
    if (keyRef.current !== key) {
      keyRef.current = key;
      hydratedRef.current = false;
      setHydrated(false);
    }
    if (hydratedRef.current) return;
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(key);
    if (stored === null) {
      setState(resolvedDefault);
      hydratedRef.current = true;
      setHydrated(true);
      return;
    }
    setState(deserialize(stored));
    hydratedRef.current = true;
    setHydrated(true);
  }, [deserialize, key, resolvedDefault]);

  const setValue: Dispatch<SetStateAction<T>> = useCallback(
    (value) => {
      setState((previous) => {
        const next =
          typeof value === "function"
            ? (value as (prevState: T) => T)(previous)
            : value;
        if (
          key &&
          hydratedRef.current &&
          typeof window !== "undefined"
        ) {
          window.localStorage.setItem(key, serialize(next));
        }
        return next;
      });
    },
    [key, serialize]
  );

  return [state, setValue, hydrated] as const;
};
