"use client";

import dynamic from "next/dynamic";

const EngineLabLazy = dynamic(() => import("../EngineLab"), { ssr: false });

export default EngineLabLazy;
