"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useInstallPrompt } from "@/hooks/use-install-prompt"

export function InstallPrompt() {
    const { isInstallable, promptInstall } = useInstallPrompt()
    const [isOpen, setIsOpen] = useState(false)

    // Open the modal when installation is available
    useEffect(() => {
        if (isInstallable) {
            setIsOpen(true)
        }
    }, [isInstallable])

    if (!isInstallable) return null

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-md bg-gradient-to-br from-red-500 via-orange-500 to-yellow-500 border-none text-white">
                <DialogHeader>
                    <DialogTitle className="text-white">Install App</DialogTitle>
                    <DialogDescription className="text-white/90">
                        Install this app on your device for a better experience, offline access, and easier recharge calculations.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex gap-2 mt-2">
                    <Button
                        onClick={() => {
                            promptInstall()
                            setIsOpen(false)
                        }}
                        className="flex-1 bg-white text-orange-600 hover:bg-gray-100 border-none font-bold"
                    >
                        Install Now
                    </Button>
                    <Button
                        onClick={() => setIsOpen(false)}
                        className="flex-1 bg-white/20 text-white hover:bg-white/30 border-none"
                    >
                        Later
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
