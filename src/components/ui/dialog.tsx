import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
export function DialogContent({
  title,
  description,
  closeLabel,
  children,
  className = "",
}: {
  title: string;
  description: string;
  closeLabel: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="dialog-overlay" />
      <DialogPrimitive.Content className={`dialog-content ${className}`}>
        <DialogPrimitive.Title className="dialog-title">
          {title}
        </DialogPrimitive.Title>
        <DialogPrimitive.Description className="muted">
          {description}
        </DialogPrimitive.Description>
        {children}
        <DialogPrimitive.Close
          className="dialog-close button button-ghost button-icon"
          aria-label={closeLabel}
        >
          <X size={18} />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
