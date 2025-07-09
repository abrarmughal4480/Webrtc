import {
  Dialog,
  DialogContent
} from "@/components/ui/dialog"

export function DialogComponent({ open, setOpen, isCloseable = false, children }) {
  return (
    <Dialog open={open} onOpenChange={isCloseable ? setOpen : () => {}}>
      <DialogContent
        className="w-auto p-0 bg-white border-none rounded-2xl shadow-md [&>button]:hidden" // hides the default close button
      >
        {children}
      </DialogContent>
    </Dialog>
  )
}
