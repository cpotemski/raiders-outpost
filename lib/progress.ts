type ItemProgress = {
  quantityRequired: number;
  quantityOwned: number;
};

export const isItemComplete = (item: ItemProgress) =>
  item.quantityRequired > 0 && item.quantityOwned >= item.quantityRequired;

export const getProgressStats = (items: ItemProgress[]) => {
  const totalCount = items.length;
  const completedCount = items.filter(isItemComplete).length;
  const isCompleted = totalCount === 0 || completedCount === totalCount;
  const progressRatio = totalCount ? completedCount / totalCount : 1;

  return {
    completedCount,
    totalCount,
    isCompleted,
    progressRatio,
  };
};
