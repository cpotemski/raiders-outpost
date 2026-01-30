type RosterStatusProps = {
  message: string;
};

export function RosterStatus({ message }: RosterStatusProps) {
  return (
    <div className="border-t border-frame2 px-4 py-5 text-sm uppercase tracking-[0.08em] text-muted">
      {message}
    </div>
  );
}
