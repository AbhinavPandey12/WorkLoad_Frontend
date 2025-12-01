import React from "react"
import NavbarManager from "./Navbar_Manager"
import NavbarIC from "./Navbar_IC"

export default function Navbar(props) {
    const { user } = props
    const isManager = (user?.role_type || "").trim().toLowerCase() === "manager"

    if (isManager) {
        return <NavbarManager {...props} />
    } else {
        return <NavbarIC {...props} />
    }
}
