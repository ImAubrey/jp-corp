import type { ImageMetadata } from "astro";

export interface TeamMember {
  draft: boolean;
  name: string;
  title: string;
  avatar: {
    src: ImageMetadata;
    alt: string;
  };
  publishDate: Date;
  telegram: string;
  language?: string;
}

export interface TeamMemberCollection {
  data: TeamMember;
  id: string;
  slug: string;
}
