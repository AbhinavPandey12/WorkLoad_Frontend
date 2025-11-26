import React from "react"
import Navbar_Manager from "./Navbar_Manager"
import Navbar_IC from "./Navbar_IC"

export default function Navbar(props) {
    const { user } = props
    const isManager = (user?.role_type || "").trim().toLowerCase() === "manager"

    if (isManager) {
        return <Navbar_Manager {...props} />
    } else {
        return <Navbar_IC {...props} />
    }
}
