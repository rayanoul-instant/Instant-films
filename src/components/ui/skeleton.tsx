import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-md animate-shimmer", className)}
      style={{
        background: 'linear-gradient(90deg, hsl(265 15% 16%) 25%, hsl(265 20% 28%) 50%, hsl(265 15% 16%) 75%)',
        backgroundSize: '200% 100%',
      }}
      {...props}
    />
  );
}

export { Skeleton };
