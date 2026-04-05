/*
# Writer Graph Guide

`src/main/agents/writer` implements the document-writing graph used for inline
continuations and writing assistance. The runtime follows this intent-driven
drafting loop:

```mermaid
flowchart TD
    A[User Input] --> B[Understand Intent + Context]

    B --> C{What does the user need?}

    C -->|Continue| D[Extend text naturally from context]
    C -->|Improve| E[Refine clarity, tone, and structure]
    C -->|Transform| F[Rewrite or adapt style]
    C -->|Expand| G[Add detail, depth, or examples]
    C -->|Condense| H[Summarize key ideas]
    C -->|Unclear| I[Infer best action or ask briefly]

    D --> J[Draft Response]
    E --> J
    F --> J
    G --> J
    H --> J
    I --> J

    J --> K[Align with tone, length, audience]

    K --> L{Satisfactory?}
    L -->|Yes| M[Return to user]
    L -->|No| N[Refine and adjust]
    N --> K
```
*/
