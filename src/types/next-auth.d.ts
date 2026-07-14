import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      handle: string | null;
      isFoundingMember: boolean;
      reviewCount: number;
      isAdmin: boolean;
      email?: string | null;
      name?: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    handle?: string | null;
    isFoundingMember?: boolean;
    reviewCount?: number;
    isAdmin?: boolean;
  }
}
