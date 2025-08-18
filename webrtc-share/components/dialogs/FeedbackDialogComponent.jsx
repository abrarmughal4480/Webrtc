import {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose
} from "@/components/ui/dialog"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import * as VisuallyHidden from "@radix-ui/react-visually-hidden"
import { XIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export function FeedbackDialogComponent({ open, setOpen, isCloseable = false, children, overlayColor = "bg-orange-500" }) {
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogPortal>
        <DialogOverlay className={overlayColor} />
        <DialogPrimitive.Content
          className={cn(
            "bg-white data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-auto translate-x-[-50%] translate-y-[-50%] gap-4 border-none outline-none shadow-lg duration-200 rounded-2xl",
            "w-[80vw] sm:w-auto sm:min-w-[300px] md:min-w-[350px] lg:min-w-[400px] xl:min-w-[450px]",
            "max-w-[calc(100%-1rem)] sm:max-w-[70vw] md:max-w-[60vw] lg:max-w-[50vw] xl:max-w-[40vw]",
            "p-3 sm:p-4 md:p-6 pt-4 sm:pt-6 md:pt-8",
            "[&>button]:hidden"
          )}
        >
          {/* Add hidden title for accessibility */}
          <VisuallyHidden.Root asChild>
            <DialogPrimitive.Title>
              Feedback Dialog
            </DialogPrimitive.Title>
          </VisuallyHidden.Root>
          {children}
          <DialogClose
            className="ring-offset-background focus:ring-0 focus:outline-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4">
            <XIcon />
            <span className="sr-only">Close</span>
          </DialogClose>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  )
}
  