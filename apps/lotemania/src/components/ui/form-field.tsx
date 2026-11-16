import * as React from "react";
import { cn } from "cn";

// Matches the original panel's "notched border" field style: the label
// sits as a <legend> cutting through the top border, instead of a
// separate <Label> floating above the input.
function FormField({
  label,
  required,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset
      className={cn(
        "min-w-0 rounded-lg border border-input px-3 pb-2.5 pt-0 transition-colors focus-within:border-ring",
        className,
      )}
    >
      <legend className="px-1 text-xs text-muted-foreground">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </legend>
      {children}
    </fieldset>
  );
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-xs text-muted-foreground">{children}</p>;
}

function FieldInput({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-7 w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

export { FormField, FieldHint, FieldInput };
