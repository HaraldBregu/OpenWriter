import type { RootState } from '../index';
import type { DocumentItem } from './types';
export declare const selectWorkspaceState: (state: RootState) => import("./state").WorkspaceState;
export declare const selectCurrentWorkspacePath: ((state: {
    workspace: import("./state").WorkspaceState;
}) => string | null) & {
    clearCache: () => void;
    resultsCount: () => number;
    resetResultsCount: () => void;
} & {
    resultFunc: (resultFuncArgs_0: import("./state").WorkspaceState) => string | null;
    memoizedResultFunc: ((resultFuncArgs_0: import("./state").WorkspaceState) => string | null) & {
        clearCache: () => void;
        resultsCount: () => number;
        resetResultsCount: () => void;
    };
    lastResult: () => string | null;
    dependencies: [(state: RootState) => import("./state").WorkspaceState];
    recomputations: () => number;
    resetRecomputations: () => void;
    dependencyRecomputations: () => number;
    resetDependencyRecomputations: () => void;
} & {
    argsMemoize: typeof import("reselect").weakMapMemoize;
    memoize: typeof import("reselect").weakMapMemoize;
};
export declare const selectHasWorkspace: ((state: {
    workspace: import("./state").WorkspaceState;
}) => boolean) & {
    clearCache: () => void;
    resultsCount: () => number;
    resetResultsCount: () => void;
} & {
    resultFunc: (resultFuncArgs_0: string | null) => boolean;
    memoizedResultFunc: ((resultFuncArgs_0: string | null) => boolean) & {
        clearCache: () => void;
        resultsCount: () => number;
        resetResultsCount: () => void;
    };
    lastResult: () => boolean;
    dependencies: [((state: {
        workspace: import("./state").WorkspaceState;
    }) => string | null) & {
        clearCache: () => void;
        resultsCount: () => number;
        resetResultsCount: () => void;
    } & {
        resultFunc: (resultFuncArgs_0: import("./state").WorkspaceState) => string | null;
        memoizedResultFunc: ((resultFuncArgs_0: import("./state").WorkspaceState) => string | null) & {
            clearCache: () => void;
            resultsCount: () => number;
            resetResultsCount: () => void;
        };
        lastResult: () => string | null;
        dependencies: [(state: RootState) => import("./state").WorkspaceState];
        recomputations: () => number;
        resetRecomputations: () => void;
        dependencyRecomputations: () => number;
        resetDependencyRecomputations: () => void;
    } & {
        argsMemoize: typeof import("reselect").weakMapMemoize;
        memoize: typeof import("reselect").weakMapMemoize;
    }];
    recomputations: () => number;
    resetRecomputations: () => void;
    dependencyRecomputations: () => number;
    resetDependencyRecomputations: () => void;
} & {
    argsMemoize: typeof import("reselect").weakMapMemoize;
    memoize: typeof import("reselect").weakMapMemoize;
};
export declare const selectWorkspaceName: ((state: {
    workspace: import("./state").WorkspaceState;
}) => string | null) & {
    clearCache: () => void;
    resultsCount: () => number;
    resetResultsCount: () => void;
} & {
    resultFunc: (resultFuncArgs_0: string | null) => string | null;
    memoizedResultFunc: ((resultFuncArgs_0: string | null) => string | null) & {
        clearCache: () => void;
        resultsCount: () => number;
        resetResultsCount: () => void;
    };
    lastResult: () => string | null;
    dependencies: [((state: {
        workspace: import("./state").WorkspaceState;
    }) => string | null) & {
        clearCache: () => void;
        resultsCount: () => number;
        resetResultsCount: () => void;
    } & {
        resultFunc: (resultFuncArgs_0: import("./state").WorkspaceState) => string | null;
        memoizedResultFunc: ((resultFuncArgs_0: import("./state").WorkspaceState) => string | null) & {
            clearCache: () => void;
            resultsCount: () => number;
            resetResultsCount: () => void;
        };
        lastResult: () => string | null;
        dependencies: [(state: RootState) => import("./state").WorkspaceState];
        recomputations: () => number;
        resetRecomputations: () => void;
        dependencyRecomputations: () => number;
        resetDependencyRecomputations: () => void;
    } & {
        argsMemoize: typeof import("reselect").weakMapMemoize;
        memoize: typeof import("reselect").weakMapMemoize;
    }];
    recomputations: () => number;
    resetRecomputations: () => void;
    dependencyRecomputations: () => number;
    resetDependencyRecomputations: () => void;
} & {
    argsMemoize: typeof import("reselect").weakMapMemoize;
    memoize: typeof import("reselect").weakMapMemoize;
};
export declare const selectProjectName: ((state: {
    workspace: import("./state").WorkspaceState;
}) => string | null) & {
    clearCache: () => void;
    resultsCount: () => number;
    resetResultsCount: () => void;
} & {
    resultFunc: (resultFuncArgs_0: import("./state").WorkspaceState) => string | null;
    memoizedResultFunc: ((resultFuncArgs_0: import("./state").WorkspaceState) => string | null) & {
        clearCache: () => void;
        resultsCount: () => number;
        resetResultsCount: () => void;
    };
    lastResult: () => string | null;
    dependencies: [(state: RootState) => import("./state").WorkspaceState];
    recomputations: () => number;
    resetRecomputations: () => void;
    dependencyRecomputations: () => number;
    resetDependencyRecomputations: () => void;
} & {
    argsMemoize: typeof import("reselect").weakMapMemoize;
    memoize: typeof import("reselect").weakMapMemoize;
};
export declare const selectProjectDescription: ((state: {
    workspace: import("./state").WorkspaceState;
}) => string | null) & {
    clearCache: () => void;
    resultsCount: () => number;
    resetResultsCount: () => void;
} & {
    resultFunc: (resultFuncArgs_0: import("./state").WorkspaceState) => string | null;
    memoizedResultFunc: ((resultFuncArgs_0: import("./state").WorkspaceState) => string | null) & {
        clearCache: () => void;
        resultsCount: () => number;
        resetResultsCount: () => void;
    };
    lastResult: () => string | null;
    dependencies: [(state: RootState) => import("./state").WorkspaceState];
    recomputations: () => number;
    resetRecomputations: () => void;
    dependencyRecomputations: () => number;
    resetDependencyRecomputations: () => void;
} & {
    argsMemoize: typeof import("reselect").weakMapMemoize;
    memoize: typeof import("reselect").weakMapMemoize;
};
export declare const selectWorkspaces: ((state: {
    workspace: import("./state").WorkspaceState;
}) => import("../../../../shared").WorkspaceInfo[]) & {
    clearCache: () => void;
    resultsCount: () => number;
    resetResultsCount: () => void;
} & {
    resultFunc: (resultFuncArgs_0: import("./state").WorkspaceState) => import("../../../../shared").WorkspaceInfo[];
    memoizedResultFunc: ((resultFuncArgs_0: import("./state").WorkspaceState) => import("../../../../shared").WorkspaceInfo[]) & {
        clearCache: () => void;
        resultsCount: () => number;
        resetResultsCount: () => void;
    };
    lastResult: () => import("../../../../shared").WorkspaceInfo[];
    dependencies: [(state: RootState) => import("./state").WorkspaceState];
    recomputations: () => number;
    resetRecomputations: () => void;
    dependencyRecomputations: () => number;
    resetDependencyRecomputations: () => void;
} & {
    argsMemoize: typeof import("reselect").weakMapMemoize;
    memoize: typeof import("reselect").weakMapMemoize;
};
export declare const selectWorkspaceStatus: ((state: {
    workspace: import("./state").WorkspaceState;
}) => "error" | "idle" | "loading" | "ready") & {
    clearCache: () => void;
    resultsCount: () => number;
    resetResultsCount: () => void;
} & {
    resultFunc: (resultFuncArgs_0: import("./state").WorkspaceState) => "error" | "idle" | "loading" | "ready";
    memoizedResultFunc: ((resultFuncArgs_0: import("./state").WorkspaceState) => "error" | "idle" | "loading" | "ready") & {
        clearCache: () => void;
        resultsCount: () => number;
        resetResultsCount: () => void;
    };
    lastResult: () => "error" | "idle" | "loading" | "ready";
    dependencies: [(state: RootState) => import("./state").WorkspaceState];
    recomputations: () => number;
    resetRecomputations: () => void;
    dependencyRecomputations: () => number;
    resetDependencyRecomputations: () => void;
} & {
    argsMemoize: typeof import("reselect").weakMapMemoize;
    memoize: typeof import("reselect").weakMapMemoize;
};
export declare const selectWorkspaceError: ((state: {
    workspace: import("./state").WorkspaceState;
}) => string | null) & {
    clearCache: () => void;
    resultsCount: () => number;
    resetResultsCount: () => void;
} & {
    resultFunc: (resultFuncArgs_0: import("./state").WorkspaceState) => string | null;
    memoizedResultFunc: ((resultFuncArgs_0: import("./state").WorkspaceState) => string | null) & {
        clearCache: () => void;
        resultsCount: () => number;
        resetResultsCount: () => void;
    };
    lastResult: () => string | null;
    dependencies: [(state: RootState) => import("./state").WorkspaceState];
    recomputations: () => number;
    resetRecomputations: () => void;
    dependencyRecomputations: () => number;
    resetDependencyRecomputations: () => void;
} & {
    argsMemoize: typeof import("reselect").weakMapMemoize;
    memoize: typeof import("reselect").weakMapMemoize;
};
export declare const selectWorkspaceIsLoading: ((state: {
    workspace: import("./state").WorkspaceState;
}) => boolean) & {
    clearCache: () => void;
    resultsCount: () => number;
    resetResultsCount: () => void;
} & {
    resultFunc: (resultFuncArgs_0: "error" | "idle" | "loading" | "ready") => boolean;
    memoizedResultFunc: ((resultFuncArgs_0: "error" | "idle" | "loading" | "ready") => boolean) & {
        clearCache: () => void;
        resultsCount: () => number;
        resetResultsCount: () => void;
    };
    lastResult: () => boolean;
    dependencies: [((state: {
        workspace: import("./state").WorkspaceState;
    }) => "error" | "idle" | "loading" | "ready") & {
        clearCache: () => void;
        resultsCount: () => number;
        resetResultsCount: () => void;
    } & {
        resultFunc: (resultFuncArgs_0: import("./state").WorkspaceState) => "error" | "idle" | "loading" | "ready";
        memoizedResultFunc: ((resultFuncArgs_0: import("./state").WorkspaceState) => "error" | "idle" | "loading" | "ready") & {
            clearCache: () => void;
            resultsCount: () => number;
            resetResultsCount: () => void;
        };
        lastResult: () => "error" | "idle" | "loading" | "ready";
        dependencies: [(state: RootState) => import("./state").WorkspaceState];
        recomputations: () => number;
        resetRecomputations: () => void;
        dependencyRecomputations: () => number;
        resetDependencyRecomputations: () => void;
    } & {
        argsMemoize: typeof import("reselect").weakMapMemoize;
        memoize: typeof import("reselect").weakMapMemoize;
    }];
    recomputations: () => number;
    resetRecomputations: () => void;
    dependencyRecomputations: () => number;
    resetDependencyRecomputations: () => void;
} & {
    argsMemoize: typeof import("reselect").weakMapMemoize;
    memoize: typeof import("reselect").weakMapMemoize;
};
export declare const selectWorkspaceDeletionReason: ((state: {
    workspace: import("./state").WorkspaceState;
}) => string | null) & {
    clearCache: () => void;
    resultsCount: () => number;
    resetResultsCount: () => void;
} & {
    resultFunc: (resultFuncArgs_0: import("./state").WorkspaceState) => string | null;
    memoizedResultFunc: ((resultFuncArgs_0: import("./state").WorkspaceState) => string | null) & {
        clearCache: () => void;
        resultsCount: () => number;
        resetResultsCount: () => void;
    };
    lastResult: () => string | null;
    dependencies: [(state: RootState) => import("./state").WorkspaceState];
    recomputations: () => number;
    resetRecomputations: () => void;
    dependencyRecomputations: () => number;
    resetDependencyRecomputations: () => void;
} & {
    argsMemoize: typeof import("reselect").weakMapMemoize;
    memoize: typeof import("reselect").weakMapMemoize;
};
export declare const selectResources: ((state: {
    workspace: import("./state").WorkspaceState;
}) => import("../../../../shared").ResourceInfo[]) & {
    clearCache: () => void;
    resultsCount: () => number;
    resetResultsCount: () => void;
} & {
    resultFunc: (resultFuncArgs_0: import("./state").WorkspaceState) => import("../../../../shared").ResourceInfo[];
    memoizedResultFunc: ((resultFuncArgs_0: import("./state").WorkspaceState) => import("../../../../shared").ResourceInfo[]) & {
        clearCache: () => void;
        resultsCount: () => number;
        resetResultsCount: () => void;
    };
    lastResult: () => import("../../../../shared").ResourceInfo[];
    dependencies: [(state: RootState) => import("./state").WorkspaceState];
    recomputations: () => number;
    resetRecomputations: () => void;
    dependencyRecomputations: () => number;
    resetDependencyRecomputations: () => void;
} & {
    argsMemoize: typeof import("reselect").weakMapMemoize;
    memoize: typeof import("reselect").weakMapMemoize;
};
export declare const selectResourcesStatus: ((state: {
    workspace: import("./state").WorkspaceState;
}) => import("./state").ResourcesStatus) & {
    clearCache: () => void;
    resultsCount: () => number;
    resetResultsCount: () => void;
} & {
    resultFunc: (resultFuncArgs_0: import("./state").WorkspaceState) => import("./state").ResourcesStatus;
    memoizedResultFunc: ((resultFuncArgs_0: import("./state").WorkspaceState) => import("./state").ResourcesStatus) & {
        clearCache: () => void;
        resultsCount: () => number;
        resetResultsCount: () => void;
    };
    lastResult: () => import("./state").ResourcesStatus;
    dependencies: [(state: RootState) => import("./state").WorkspaceState];
    recomputations: () => number;
    resetRecomputations: () => void;
    dependencyRecomputations: () => number;
    resetDependencyRecomputations: () => void;
} & {
    argsMemoize: typeof import("reselect").weakMapMemoize;
    memoize: typeof import("reselect").weakMapMemoize;
};
export declare const selectResourcesError: ((state: {
    workspace: import("./state").WorkspaceState;
}) => string | null) & {
    clearCache: () => void;
    resultsCount: () => number;
    resetResultsCount: () => void;
} & {
    resultFunc: (resultFuncArgs_0: import("./state").WorkspaceState) => string | null;
    memoizedResultFunc: ((resultFuncArgs_0: import("./state").WorkspaceState) => string | null) & {
        clearCache: () => void;
        resultsCount: () => number;
        resetResultsCount: () => void;
    };
    lastResult: () => string | null;
    dependencies: [(state: RootState) => import("./state").WorkspaceState];
    recomputations: () => number;
    resetRecomputations: () => void;
    dependencyRecomputations: () => number;
    resetDependencyRecomputations: () => void;
} & {
    argsMemoize: typeof import("reselect").weakMapMemoize;
    memoize: typeof import("reselect").weakMapMemoize;
};
export declare const selectResourcesIsLoading: ((state: {
    workspace: import("./state").WorkspaceState;
}) => boolean) & {
    clearCache: () => void;
    resultsCount: () => number;
    resetResultsCount: () => void;
} & {
    resultFunc: (resultFuncArgs_0: import("./state").ResourcesStatus) => boolean;
    memoizedResultFunc: ((resultFuncArgs_0: import("./state").ResourcesStatus) => boolean) & {
        clearCache: () => void;
        resultsCount: () => number;
        resetResultsCount: () => void;
    };
    lastResult: () => boolean;
    dependencies: [((state: {
        workspace: import("./state").WorkspaceState;
    }) => import("./state").ResourcesStatus) & {
        clearCache: () => void;
        resultsCount: () => number;
        resetResultsCount: () => void;
    } & {
        resultFunc: (resultFuncArgs_0: import("./state").WorkspaceState) => import("./state").ResourcesStatus;
        memoizedResultFunc: ((resultFuncArgs_0: import("./state").WorkspaceState) => import("./state").ResourcesStatus) & {
            clearCache: () => void;
            resultsCount: () => number;
            resetResultsCount: () => void;
        };
        lastResult: () => import("./state").ResourcesStatus;
        dependencies: [(state: RootState) => import("./state").WorkspaceState];
        recomputations: () => number;
        resetRecomputations: () => void;
        dependencyRecomputations: () => number;
        resetDependencyRecomputations: () => void;
    } & {
        argsMemoize: typeof import("reselect").weakMapMemoize;
        memoize: typeof import("reselect").weakMapMemoize;
    }];
    recomputations: () => number;
    resetRecomputations: () => void;
    dependencyRecomputations: () => number;
    resetDependencyRecomputations: () => void;
} & {
    argsMemoize: typeof import("reselect").weakMapMemoize;
    memoize: typeof import("reselect").weakMapMemoize;
};
export declare const selectImporting: ((state: {
    workspace: import("./state").WorkspaceState;
}) => boolean) & {
    clearCache: () => void;
    resultsCount: () => number;
    resetResultsCount: () => void;
} & {
    resultFunc: (resultFuncArgs_0: import("./state").WorkspaceState) => boolean;
    memoizedResultFunc: ((resultFuncArgs_0: import("./state").WorkspaceState) => boolean) & {
        clearCache: () => void;
        resultsCount: () => number;
        resetResultsCount: () => void;
    };
    lastResult: () => boolean;
    dependencies: [(state: RootState) => import("./state").WorkspaceState];
    recomputations: () => number;
    resetRecomputations: () => void;
    dependencyRecomputations: () => number;
    resetDependencyRecomputations: () => void;
} & {
    argsMemoize: typeof import("reselect").weakMapMemoize;
    memoize: typeof import("reselect").weakMapMemoize;
};
export declare const selectIndexingInfo: ((state: {
    workspace: import("./state").WorkspaceState;
}) => import("../../../../shared").IndexingInfo | null) & {
    clearCache: () => void;
    resultsCount: () => number;
    resetResultsCount: () => void;
} & {
    resultFunc: (resultFuncArgs_0: import("./state").WorkspaceState) => import("../../../../shared").IndexingInfo | null;
    memoizedResultFunc: ((resultFuncArgs_0: import("./state").WorkspaceState) => import("../../../../shared").IndexingInfo | null) & {
        clearCache: () => void;
        resultsCount: () => number;
        resetResultsCount: () => void;
    };
    lastResult: () => import("../../../../shared").IndexingInfo | null;
    dependencies: [(state: RootState) => import("./state").WorkspaceState];
    recomputations: () => number;
    resetRecomputations: () => void;
    dependencyRecomputations: () => number;
    resetDependencyRecomputations: () => void;
} & {
    argsMemoize: typeof import("reselect").weakMapMemoize;
    memoize: typeof import("reselect").weakMapMemoize;
};
/** All document items as an array. */
export declare const selectAllDocuments: (state: RootState) => DocumentItem[];
/** The currently selected document item, or undefined if none. */
export declare const selectSelectedDocument: ((state: {
    workspace: import("./state").WorkspaceState;
}) => DocumentItem | undefined) & {
    clearCache: () => void;
    resultsCount: () => number;
    resetResultsCount: () => void;
} & {
    resultFunc: (resultFuncArgs_0: import("./state").WorkspaceState) => DocumentItem | undefined;
    memoizedResultFunc: ((resultFuncArgs_0: import("./state").WorkspaceState) => DocumentItem | undefined) & {
        clearCache: () => void;
        resultsCount: () => number;
        resetResultsCount: () => void;
    };
    lastResult: () => DocumentItem | undefined;
    dependencies: [(state: RootState) => import("./state").WorkspaceState];
    recomputations: () => number;
    resetRecomputations: () => void;
    dependencyRecomputations: () => number;
    resetDependencyRecomputations: () => void;
} & {
    argsMemoize: typeof import("reselect").weakMapMemoize;
    memoize: typeof import("reselect").weakMapMemoize;
};
/** The id of the currently selected document. */
export declare const selectSelectedDocumentId: (state: RootState) => string | null;
/** Documents loading status. */
export declare const selectDocumentsStatus: (state: RootState) => import("./state").DocumentsStatus;
/** Documents error message. */
export declare const selectDocumentsError: (state: RootState) => string | null;
/** A single document item by id, or undefined. */
export declare const selectDocumentById: (state: RootState, id: string) => DocumentItem | undefined;
