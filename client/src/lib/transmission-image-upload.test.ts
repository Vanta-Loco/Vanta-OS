import assert from "node:assert/strict";
import test from "node:test";
import { getTransmissionImageSources } from "@shared/transmission-image-sources";
import { publishTransmission } from "./transmission-image-upload";

test("publishes images larger than the JSON limit as multipart uploads and displays saved URLs", async () => {
  const originalFetch = globalThis.fetch;
  const largePhoto = new File([new Uint8Array(150 * 1024)], "normal-photo.png", { type: "image/png" });
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const createdPost = {
    id: "post-1",
    coverImage: "/media/assets/cover",
    images: ["/media/assets/gallery-1"],
    imageLayouts: ["square"],
  };

  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    calls.push({ url, init });
    if (url === "/api/upload") {
      const body = init.body as FormData;
      const uploadedFile = body.get("file") as File;
      assert.equal(uploadedFile.size, largePhoto.size);
      assert.equal((init.headers as Record<string, string> | undefined)?.["Content-Type"], undefined);
      return Response.json({ url: calls.length === 1 ? createdPost.coverImage : createdPost.images[0] });
    }
    if (url === "/api/posts") {
      return Response.json(createdPost, { status: 201 });
    }
    throw new Error(`Unexpected request: ${url}`);
  };

  try {
    const response = await publishTransmission({
      title: "A Transmission",
      excerpt: "An excerpt",
      content: "Post content",
      coverImage: `data:image/png;base64,${"a".repeat(largePhoto.size)}`,
      coverImagePosition: "50% 50%",
      images: ["data:image/png;base64,gallery-preview"],
      imageLayouts: ["square"],
      category: "Release",
      readTime: "5 min read",
      featured: "true",
      published: "true",
      musicUrl: "",
      imageLayout: "original",
    }, largePhoto, [largePhoto]);

    assert.equal(response.status, 201);
    assert.equal(calls.length, 3);
    assert.equal(calls[0].url, "/api/upload");
    assert.equal(calls[1].url, "/api/upload");
    assert.equal(calls[2].url, "/api/posts");
    assert.equal(calls[2].init.headers && (calls[2].init.headers as Record<string, string>)["Content-Type"], "application/json");

    const savedPost = await response.json();
    const displayImages = getTransmissionImageSources(savedPost);
    assert.deepEqual(displayImages, {
      cover: createdPost.coverImage,
      gallery: createdPost.images,
    });

    const postPayload = JSON.parse(String(calls[2].init.body));
    assert.equal(postPayload.coverImage, createdPost.coverImage);
    assert.deepEqual(postPayload.images, createdPost.images);
    assert.equal(JSON.stringify(postPayload).includes("data:image"), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("does not create a post if any gallery upload fails", async () => {
  const originalFetch = globalThis.fetch;
  const file = new File([new Uint8Array(1)], "photo.png", { type: "image/png" });
  const requests: string[] = [];
  globalThis.fetch = async (input) => {
    const url = String(input);
    requests.push(url);
    if (url === "/api/upload" && requests.length === 2) {
      return Response.json({ error: "Upload failed." }, { status: 413 });
    }
    return Response.json({ url: "/media/assets/uploaded" });
  };

  try {
    await assert.rejects(
      publishTransmission({
        title: "A Transmission",
        excerpt: "An excerpt",
        content: "Post content",
        coverImage: "local-preview",
        coverImagePosition: "50% 50%",
        images: ["first", "second"],
        imageLayouts: ["original", "original"],
        category: "Release",
        readTime: "5 min read",
        featured: "false",
        published: "true",
        musicUrl: "",
        imageLayout: "original",
      }, file, [file, file]),
      /Upload failed/,
    );
    assert.deepEqual(requests, ["/api/upload", "/api/upload"]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
