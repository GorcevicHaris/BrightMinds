"use client";

import dynamic from "next/dynamic";

const ExtraLabLazy = dynamic(() => import("./ExtraLab"), { ssr: false });

export default ExtraLabLazy;
