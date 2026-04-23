"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  type CollectionReference,
  type DocumentData,
  type DocumentReference,
  type Firestore,
  type QueryConstraint,
  type Query,
} from "firebase/firestore";
import { ACTIVE_EVENT_ID } from "@/lib/config";
import { getFirebaseBrowserDb } from "@/lib/firebase-browser";

interface RealtimeBinding {
  table: string;
  filter?: string;
}

function mapFilterField(field: string) {
  if (field === "event_id") {
    return "eventId";
  }

  return field;
}

function parseFilter(filter?: string) {
  if (!filter) {
    return {
      field: null as string | null,
      operator: null as string | null,
      value: null as string | null,
    };
  }

  const firstSeparatorIndex = filter.indexOf("=");

  if (firstSeparatorIndex === -1) {
    return {
      field: mapFilterField(filter),
      operator: null,
      value: null,
    };
  }

  const field = mapFilterField(filter.slice(0, firstSeparatorIndex));
  const remainder = filter.slice(firstSeparatorIndex + 1);

  if (remainder.startsWith("eq.")) {
    return {
      field,
      operator: "eq",
      value: remainder.slice(3) || null,
    };
  }

  const secondSeparatorIndex = remainder.indexOf("=");

  if (secondSeparatorIndex === -1) {
    return {
      field,
      operator: remainder || null,
      value: null,
    };
  }

  return {
    field,
    operator: remainder.slice(0, secondSeparatorIndex) || null,
    value: remainder.slice(secondSeparatorIndex + 1) || null,
  };
}

function buildTarget(
  db: Firestore,
  binding: RealtimeBinding,
):
  | { kind: "doc"; ref: DocumentReference<DocumentData, DocumentData> }
  | {
      kind: "query";
      ref:
        | CollectionReference<DocumentData, DocumentData>
        | Query<DocumentData, DocumentData>;
    } {
  const { field, operator, value } = parseFilter(binding.filter);

  if (binding.table === "race_events") {
    const docId = field === "id" && operator === "eq" && value ? value : ACTIVE_EVENT_ID;
    return { kind: "doc", ref: doc(db, "race_events", docId) };
  }

  if (binding.table === "video_state") {
    const docId = field === "eventId" && operator === "eq" && value ? value : ACTIVE_EVENT_ID;
    return { kind: "doc", ref: doc(db, "video_state", docId) };
  }

  if (binding.table === "runners" || binding.table === "finishers") {
    const baseCollection = collection(db, "race_events", ACTIVE_EVENT_ID, binding.table);
    const constraints: QueryConstraint[] = [];

    if (field && operator === "eq" && value) {
      constraints.push(where(field, "==", value));
    }

    return {
      kind: "query",
      ref: constraints.length > 0 ? query(baseCollection, ...constraints) : baseCollection,
    };
  }

  return { kind: "query", ref: collection(db, binding.table) };
}

export function useFirebaseRealtime(
  channelName: string,
  bindings: RealtimeBinding[],
  onChange: () => void,
  enabled = true,
) {
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const bindingsSignature = useMemo(() => JSON.stringify(bindings), [bindings]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const db = getFirebaseBrowserDb();

    if (!db) {
      return;
    }

    const parsedBindings = JSON.parse(bindingsSignature) as RealtimeBinding[];
    const unsubscribers = parsedBindings.map((binding) => {
      const target = buildTarget(db, binding);

      if (target.kind === "doc") {
        return onSnapshot(target.ref, () => {
          onChangeRef.current();
        });
      }

      return onSnapshot(target.ref, () => {
        onChangeRef.current();
      });
    });

    return () => {
      for (const unsubscribe of unsubscribers) {
        unsubscribe();
      }
    };
  }, [bindingsSignature, channelName, enabled]);
}
