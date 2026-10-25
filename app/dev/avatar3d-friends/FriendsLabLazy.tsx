"use client";

import dynamic from "next/dynamic";

const FriendsLabLazy = dynamic(() => import("./FriendsLab"), { ssr: false });

export default FriendsLabLazy;
