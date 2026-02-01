/* eslint-disable @next/next/no-img-element */
import type { ReactNode } from "react";

const getImageSrc = (imageFile: string) =>
  `/api/arc-items/image?file=${encodeURIComponent(imageFile)}`;

type ItemTileMediaProps = {
  imageFile: string | null;
  wrapperClassName?: string;
  imgClassName?: string;
  fallback?: ReactNode;
  filterStyle?: string;
};

export function ItemTileMedia({
  imageFile,
  wrapperClassName,
  imgClassName,
  fallback,
  filterStyle,
}: ItemTileMediaProps) {
  if (!imageFile) {
    return <>{fallback ?? null}</>;
  }

  return (
    <div className={wrapperClassName}>
      <img
        src={getImageSrc(imageFile)}
        alt=""
        loading="lazy"
        className={imgClassName}
        style={filterStyle ? { filter: filterStyle } : undefined}
        draggable={false}
      />
    </div>
  );
}
