export const PAINTER_DOCUMENTATION = `src/main/agents/painter implements a visual generation workflow.

Flow:
1. Interpret the user's visual intent.
2. Create an image-ready prompt.
3. Generate the image through OpenAI's Image API.
4. Check alignment against the request.
5. Deliver the image, or loop back to prompt creation if another pass is needed.`;
