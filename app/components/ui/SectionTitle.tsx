type SectionTitleProps = {
  title: string;
  subtitle?: string;
};

export default function SectionTitle({ title, subtitle }: SectionTitleProps) {
  return (
    <div className="py-4 text-center">
      <h1 className="text-xl font-semibold sm:text-2xl">{title}</h1>
      {subtitle ? (
        <p className="mt-2 text-sm leading-relaxed text-muted">{subtitle}</p>
      ) : null}
    </div>
  );
}
