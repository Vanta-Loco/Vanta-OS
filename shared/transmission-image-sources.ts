export function getTransmissionImageSources(post: {
  coverImage: string;
  images?: string[] | null;
}): { cover: string; gallery: string[] } {
  return {
    cover: post.coverImage,
    gallery: post.images ?? [],
  };
}
