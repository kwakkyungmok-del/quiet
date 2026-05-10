import { cn } from "@/lib/utils";

type Props = {
  name: string;
  color: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  onClick?: () => void;
  title?: string;
};

export function CharacterBadge({ name, color, size = "md", className, onClick, title }: Props) {
  const sizes = {
    sm: "text-xs px-2 py-0.5 gap-1.5",
    md: "text-sm px-2.5 py-1 gap-2",
    lg: "text-base px-3 py-1.5 gap-2",
  };
  const dot = { sm: "h-2 w-2", md: "h-2.5 w-2.5", lg: "h-3 w-3" };
  const Tag: any = onClick ? "button" : "span";
  return (
    <Tag
      onClick={onClick}
      title={title}
      data-color={color}
      className={cn(
        "inline-flex items-center rounded-full glass font-medium transition",
        sizes[size],
        onClick && "hover:shadow-glow hover:-translate-y-0.5 cursor-pointer",
        className,
      )}
    >
      <span
        className={cn("rounded-full shrink-0", dot[size])}
        style={{ backgroundColor: "var(--char, var(--color-primary))", boxShadow: "0 0 8px var(--char, var(--color-primary))" }}
      />
      <span className="font-display tracking-tight">{name}</span>
    </Tag>
  );
}
