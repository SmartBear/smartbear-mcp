import { describe, it, expect } from "vitest";
import { RefineInputSchema } from "../../../pactflow/client/ai";

describe("AI zod schemas validation tests", () => {
    it("Parses RefineInputSchema with partial input", () => {
        const result = RefineInputSchema.safeParse({
            pactTests: {
                filename: "test.js",
                language: "javascript",
                body: "describe('API', () => { it('works', () => { }); });"
            }
        });
        expect(result.success).toBe(true);
        expect(result.data).toEqual({
            pactTests: {
                filename: "test.js",
                language: "javascript",
                body: "describe('API', () => { it('works', () => { }); });"
            }
        });
    });
});
