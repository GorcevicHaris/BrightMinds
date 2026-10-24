"use client";

import dynamic from "next/dynamic";

const MoreLabLazy = dynamic(() => import("./MoreLab"), { ssr: false });

export default MoreLabLazy;
