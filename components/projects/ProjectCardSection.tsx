import { ProjectCard } from "@/components/projects/ProjectCard";
import type { ProjectCardData } from "@/components/projects/projectCards";
import { EmptyState } from "@/components/ui/EmptyState";

type ProjectCardSectionProps = {
  title: string;
  countLabel: string;
  cards: ProjectCardData[];
  emptyLabel: string;
  testId: string;
};

export function ProjectCardSection({
  title,
  countLabel,
  cards,
  emptyLabel,
  testId,
}: ProjectCardSectionProps) {
  return (
    <div>
      <div className="flex items-center justify-between pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
        <span>{title}</span>
        <span aria-label={countLabel}>{cards.length}</span>
      </div>
      <div
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
        data-testid={testId}
      >
        {cards.length ? (
          cards.map((card) => (
            <ProjectCard key={card.project.slug} {...card} />
          ))
        ) : (
          <EmptyState className="col-span-full">
            {emptyLabel}
          </EmptyState>
        )}
      </div>
    </div>
  );
}
