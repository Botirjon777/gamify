import { describe, expect, it } from "vitest";
import { certificateFileName, contentDisposition, nameStyle, typeset } from "./certificate-text";

describe("certificate text", () => {
  it("sets the Uzbek ʻ and ʼ as the curly quotes the fonts have", () => {
    expect(typeset("Oʻgʻiloy Maʼmura")).toBe("O‘g‘iloy Ma’mura");
    expect(typeset("Aziz")).toBe("Aziz");
  });

  it("shrinks a long name to one line and keeps a short one at full size", () => {
    expect(nameStyle("Aziz Karimov")).toEqual({ fontFamily: "Script", fontWeight: 400, fontSize: 112 });
    const long = nameStyle("O‘g‘iloy Ma’mura Abdurahmonova-To‘xtasinova");
    expect(long.fontFamily).toBe("Script");
    expect(long.fontSize).toBeLessThan(50);
    // The longest name the form accepts (40 + 40 letters) still gets a readable size.
    expect(nameStyle(`${"a".repeat(40)} ${"b".repeat(40)}`).fontSize).toBeGreaterThanOrEqual(23);
  });

  it("uses the serif with Cyrillic for names in other alphabets", () => {
    expect(nameStyle("Жасур Тошпўлатов")).toMatchObject({ fontFamily: "Names", fontWeight: 700 });
    expect(nameStyle("Жасур Тошпўлатов").fontSize).toBeLessThanOrEqual(68);
  });
});

describe("certificate file name", () => {
  it("is the site, what it is, and the person's name", () => {
    expect(certificateFileName({ site: "Zukkolar", name: "Aziz Karimov" })).toBe("Zukkolar-IQ-sertifikat-Aziz-Karimov");
    expect(certificateFileName({ site: "Zukkolar", name: "Oʻgʻiloy Maʼmura" })).toBe("Zukkolar-IQ-sertifikat-Ogiloy-Mamura");
    expect(certificateFileName({ site: "Ziyo Markazi", name: "Жасур Тошпўлатов" })).toBe("Ziyo-Markazi-IQ-sertifikat-Жасур-Тошпўлатов");
  });
  it("cannot break out of the header or the file system", () => {
    const name = certificateFileName({ site: 'Zuk"kolar', name: "../../etc/passwd\r\nX: y" });
    expect(name).toBe("Zuk-kolar-IQ-sertifikat-etc-passwd-X-y");
    expect(contentDisposition(`${name}.pdf`, true)).toBe(`attachment; filename="${name}.pdf"; filename*=UTF-8''${name}.pdf`);
  });
  it("keeps a non-ASCII name in filename* and an ASCII stand-in beside it", () => {
    expect(contentDisposition("Жасур.pdf", false)).toBe(`inline; filename="_____.pdf"; filename*=UTF-8''${encodeURIComponent("Жасур.pdf")}`);
  });
});
