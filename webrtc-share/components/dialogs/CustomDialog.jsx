import React from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader
} from "@/components/ui/dialog"

const CustomDialog = ({open,setOpen,children,heading}) => {
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="max-w-[95vw] w-full sm:max-w-[600px] bg-white dialog-content rounded-xl border-none outline-none shadow-none ring-0 p-0 overflow-hidden">
                <DialogHeader className={'bg-purple-500 text-white absolute top-0 left-0 right-0 h-auto py-4 flex items-center justify-between px-6 rounded-t-xl border-none m-0 z-10'}>
                    <div className="w-full">
                        {typeof heading === 'string' ? (
                            <h2 className='text-[1.8rem] font-bold text-white text-center'>{heading}</h2>
                        ) : (
                            heading
                        )}
                    </div>
                </DialogHeader>
                <div className='overflow-y-auto mt-[4rem] p-2 pt-6 max-h-[80vh]'>
                    {children}
                </div>
            </DialogContent>
        </Dialog>
    )
}

export default CustomDialog
