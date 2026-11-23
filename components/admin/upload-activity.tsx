"use client";
import { createContext, useContext } from "react";
export const UploadActivityContext = createContext({ count: 0, change: (_delta: number) => {} });
export const useUploadActivity = () => useContext(UploadActivityContext);
