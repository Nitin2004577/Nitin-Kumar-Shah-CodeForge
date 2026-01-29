import {useState, useEffect, useCallback} from "react";
import {toast} from "sonner";

interface PlaygroundData {
    id: string;
    name?: string;
    [key: string]: any;
    }

    interface UsePlaygroundReturn {
    playgroundData: PlaygroundData | null;
    templateData: TemplateFolder | null;
    isLoading: boolean;
    error: string | null;
    loadPlayground:()=>Promise<void>;
    saveTemplate:(data: TemplateFolder)=>Promise<void>;
    }
