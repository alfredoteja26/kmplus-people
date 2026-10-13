import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("keeps a type-ramp size next to a text color", () => {
    expect(cn("text-micro text-faint")).toBe("text-micro text-faint");
    expect(cn("m-0 text-h2 text-muted")).toBe("m-0 text-h2 text-muted");
  });

  it("still lets a later size replace an earlier one", () => {
    expect(cn("text-sm", "text-label")).toBe("text-label");
  });
});
