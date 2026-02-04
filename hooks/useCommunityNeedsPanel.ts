"use client";

import { useEffect, useMemo, useState } from "react";
import type { CommunityNeedsItem, CommunityNeedsMember } from "@/types/community";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";

type UseCommunityNeedsPanelParams = {
  members: CommunityNeedsMember[];
  items: CommunityNeedsItem[];
  unknownLabel: string;
  storageKey?: string;
};

export const useCommunityNeedsPanel = ({
  members,
  items,
  unknownLabel,
  storageKey,
}: UseCommunityNeedsPanelParams) => {
  const STORAGE_SUFFIX_SELECTED = "selected-members";
  const STORAGE_SUFFIX_COLLAPSED = "collapsed-groups";

  const normalizeStorageKey = (value?: string) => {
    if (!value) return undefined;
    return encodeURIComponent(value.trim());
  };

  const buildStorageKey = (suffix: string) => {
    const normalized = normalizeStorageKey(storageKey);
    if (!normalized) return undefined;
    return `${normalized}-${suffix}`;
  };

  const selectedMembersKey = buildStorageKey(STORAGE_SUFFIX_SELECTED);
  const collapsedGroupsKey = buildStorageKey(STORAGE_SUFFIX_COLLAPSED);

  const defaultMemberSet = () => new Set(members.map((member) => member.id));

  const [selectedMembers, setSelectedMembers] = useLocalStorageState<Set<string>>(
    selectedMembersKey,
    defaultMemberSet,
    {
      serialize: (value) => JSON.stringify(Array.from(value)),
      deserialize: (raw) => {
        try {
          const parsed = JSON.parse(raw);
          if (!Array.isArray(parsed)) return new Set<string>();
          return new Set(
            parsed.filter((entry): entry is string => typeof entry === "string")
          );
        } catch {
          return new Set<string>();
        }
      },
    }
  );

  const [collapsedGroups, setCollapsedGroups] = useLocalStorageState<Set<string>>(
    collapsedGroupsKey,
    () => new Set<string>(),
    {
      serialize: (value) => JSON.stringify(Array.from(value)),
      deserialize: (raw) => {
        try {
          const parsed = JSON.parse(raw);
          if (!Array.isArray(parsed)) return new Set<string>();
          return new Set(
            parsed.filter((entry): entry is string => typeof entry === "string")
          );
        } catch {
          return new Set<string>();
        }
      },
    }
  );
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setSelectedMembers((prev) => {
      const validIds = new Set(members.map((member) => member.id));
      if (prev.size === 0) {
        return prev;
      }
      const next = new Set(
        Array.from(prev).filter((id) => validIds.has(id))
      );
      if (next.size === 0 && validIds.size > 0) {
        return validIds;
      }
      return next;
    });
  }, [members, setSelectedMembers]);

  const toggleMember = (memberId: string) => {
    setSelectedMembers((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) {
        next.delete(memberId);
      } else {
        next.add(memberId);
      }
      return next;
    });
  };

  const toggleGroup = (groupType: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupType)) {
        next.delete(groupType);
      } else {
        next.add(groupType);
      }
      return next;
    });
  };

  const groupedItems = useMemo(() => {
    const rarityOrder = new Map([
      ["Legendary", 0],
      ["Epic", 1],
      ["Rare", 2],
      ["Uncommon", 3],
      ["Common", 4],
      ["Unknown", 5],
    ]);

    const filtered = items
      .map((item) => {
        const memberNeeds = item.memberNeeds.filter((member) =>
          selectedMembers.has(member.memberId)
        );
        const totalNeeded = memberNeeds.reduce(
          (sum, entry) => sum + entry.needed,
          0
        );
        return {
          ...item,
          memberNeeds,
          totalNeeded,
        };
      })
      .filter((item) => item.totalNeeded > 0);

    const groups = new Map<string, typeof filtered>();
    for (const item of filtered) {
      const key = item.itemType || unknownLabel;
      const group = groups.get(key) ?? [];
      group.push(item);
      groups.set(key, group);
    }

    const sortedGroups = Array.from(groups.entries()).sort((a, b) =>
      a[0].localeCompare(b[0])
    );

    return sortedGroups.map(([type, group]) => {
      const sorted = group.slice().sort((a, b) => {
        const rarityA = rarityOrder.get(a.rarity) ?? 99;
        const rarityB = rarityOrder.get(b.rarity) ?? 99;
        if (rarityA !== rarityB) return rarityA - rarityB;
        return a.displayName.localeCompare(b.displayName);
      });
      return { type, items: sorted };
    });
  }, [items, selectedMembers, unknownLabel]);

  useEffect(() => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      const availableGroupTypes = new Set(groupedItems.map((group) => group.type));
      let changed = false;
      for (const type of Array.from(next)) {
        if (!availableGroupTypes.has(type)) {
          next.delete(type);
          changed = true;
        }
      }
      if (!changed) {
        return prev;
      }
      return next;
    });
  }, [groupedItems, setCollapsedGroups]);

  const activeItem = useMemo(() => {
    if (!activeItemId) return null;
    for (const group of groupedItems) {
      const match = group.items.find((entry) => entry.itemId === activeItemId);
      if (match) return match;
    }
    return null;
  }, [activeItemId, groupedItems]);

  useEffect(() => {
    if (!activeItemId) return;
    const itemIds = new Set(
      groupedItems.flatMap((group) => group.items.map((item) => item.itemId))
    );
    if (!itemIds.has(activeItemId)) {
      setActiveItemId(null);
    }
  }, [activeItemId, groupedItems]);

  return {
    selectedMembers,
    toggleMember,
    collapsedGroups,
    toggleGroup,
    activeItemId,
    setActiveItemId,
    activeItem,
    groupedItems,
    mounted,
  };
};
