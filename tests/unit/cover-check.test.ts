import { describe, expect, it } from "vitest";
import { imageSize, isAllowedCoverHost, looksLikeCover } from "@/lib/cover-check";
import { bnfCoverUrl, googleCoverByIsbn } from "@/lib/book-sources";

function png(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(24);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  new DataView(bytes.buffer).setUint32(16, width);
  new DataView(bytes.buffer).setUint32(20, height);
  return bytes;
}

/** JPEG minimal : SOI, un segment APP0, puis le SOF0 qui porte les dimensions. */
function jpeg(width: number, height: number): Uint8Array {
  return new Uint8Array([
    0xff,
    0xd8,
    0xff,
    0xe0,
    0x00,
    0x04,
    0x00,
    0x00,
    0xff,
    0xc0,
    0x00,
    0x11,
    0x08,
    height >> 8,
    height & 0xff,
    width >> 8,
    width & 0xff,
    0x03,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
  ]);
}

function gif(width: number, height: number): Uint8Array {
  return new Uint8Array([
    0x47,
    0x49,
    0x46,
    0x38,
    0x39,
    0x61,
    width & 0xff,
    width >> 8,
    height & 0xff,
    height >> 8,
  ]);
}

describe("dimensions d'une image", () => {
  it("lit les en-têtes PNG, JPEG et GIF", () => {
    expect(imageSize(png(400, 583))).toEqual({ width: 400, height: 583 });
    expect(imageSize(jpeg(575, 883))).toEqual({ width: 575, height: 883 });
    expect(imageSize(gif(1, 1))).toEqual({ width: 1, height: 1 });
  });

  it("renvoie null pour ce qui n'est pas une image", () => {
    expect(imageSize(new TextEncoder().encode("<!DOCTYPE html><html></html>"))).toBeNull();
  });
});

describe("couverture plausible", () => {
  it("accepte une couverture en portrait", () => {
    expect(looksLikeCover("https://catalogue.bnf.fr/couverture", { width: 400, height: 583 })).toBe(
      true,
    );
  });

  it("écarte le pixel de remplacement et les images en paysage", () => {
    expect(looksLikeCover("https://covers.openlibrary.org/x", { width: 1, height: 1 })).toBe(false);
    expect(looksLikeCover("https://books.google.com/x", { width: 600, height: 100 })).toBe(false);
  });

  it("reconnaît la vignette « image not available » de Google", () => {
    expect(looksLikeCover("https://books.google.com/x", { width: 575, height: 750 })).toBe(false);
    // Les mêmes dimensions ailleurs sont une vraie couverture.
    expect(looksLikeCover("https://covers.openlibrary.org/x", { width: 575, height: 750 })).toBe(
      true,
    );
  });
});

describe("hôtes de couverture", () => {
  it("ne télécharge que les hôtes des sources de livres, en HTTPS", () => {
    expect(isAllowedCoverHost("https://ia801601.us.archive.org/x.jpg")).toBe(true);
    expect(isAllowedCoverHost(bnfCoverUrl("ark:/12148/cb41023439w"))).toBe(true);
    expect(isAllowedCoverHost(googleCoverByIsbn("9782070612758"))).toBe(true);
    expect(isAllowedCoverHost("http://books.google.com/x")).toBe(false);
    expect(isAllowedCoverHost("https://m.media-amazon.com/images/x.jpg")).toBe(false);
    expect(isAllowedCoverHost("pas une url")).toBe(false);
  });
});
