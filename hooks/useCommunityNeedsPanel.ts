"use client";

import { useEffect, useMemo, useState } from "react";
import type { CommunityNeedsItem, CommunityNeedsMember } from "@/types/community";

type UseCommunityNeedsPanelParams = {
  members: CommunityNeedsMember[];
  items: CommunityNeedsItem[];
  unknownLabel: string;
};

export const useCommunityNeedsPanel = ({
  members,
  items,
  unknownLabel,
}: UseCommunityNeedsPanelParams) => {
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(
    () => new Set(members.map((member) => member.id))
  );
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    () => new Set()
  );
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setSelectedMembers(new Set(members.map((member) => member.id)));
  }, [members]);

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
