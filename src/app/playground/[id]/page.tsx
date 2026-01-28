"use client";
import React from "react"
import { useParams } from "next/navigation";

const Page = () => {
    const {id} = useParams<{id:string}>();
    return (
        <div>Page</div>
    )
}
export default Page;
