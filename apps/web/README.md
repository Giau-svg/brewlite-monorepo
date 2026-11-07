This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Backend configuration

Copy `.env.example` to `.env.local` in `apps/web` and set `NEXT_PUBLIC_API_URL` to the NestJS origin (`http://localhost:3001`) or API base (`http://localhost:3001/api`). Both forms support a trailing slash; the service requests `/api/products` without duplicating `/api`. Restart the development server after changes. This URL is public and bundled during production builds, so configure it before `npm run build`. The menu keeps its existing error state if the URL is missing, the response is invalid or the API cannot be reached.

The current API uses UUID strings, `basePrice` (Prisma Decimal JSON string or numeric JSON), and nullable `imageUrl`. Prices are validated before formatting as VND. Cards use a fallback when the image is missing, invalid or fails to load. No detail route is linked yet.
