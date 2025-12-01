import { useState, useEffect } from "react"

export function useIsMobile(breakpoint = 900) {
    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        const checkMobile = () => {
            if (typeof window !== "undefined") {
                setIsMobile(window.innerWidth <= breakpoint)
            }
        }

        checkMobile()
        window.addEventListener("resize", checkMobile)
        return () => window.removeEventListener("resize", checkMobile)
    }, [breakpoint])

    return isMobile
}
