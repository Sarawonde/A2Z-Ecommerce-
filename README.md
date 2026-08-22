# A-to-Z Online Shopping Platform

An end-to-end e-commerce application with a React/Tailwind frontend and an Express/MongoDB backend.

## Features

- Secure account registration and JWT login with hashed passwords
- Searchable product catalog, categories, details, and stock tracking
- Persistent customer carts and quantity controls
- Checkout, shipping details, order totals, and order history
- Seller product publishing
- Direct JPG, PNG, and WebP product-image uploads (5 MB limit)
- Seller dashboard with editing, deletion, stock, discounts, variants, sales, and seller orders
- Product approval workflow and administrator inventory alerts
- Administrator users, roles, suspension, reports, categories, and order management
- Product ratings, reviews, wishlists, related products, and discounted pricing
- Responsive layout for desktop and mobile

## Project structure

- `frontend/` — React application built with Vite
- `backend/` — Express API with MongoDB authentication and cart routes

## Run locally

Create `backend/.env` from `backend/.env.example`, then run the backend:

```sh
cd backend
npm install
npm run dev
```

In another terminal, run the frontend:

```sh
cd frontend
npm install
npm run dev
```

The backend defaults to port `4000`. Ensure `CLIENT_ORIGIN` and frontend API URLs match the ports used in your environment.

For deployment, configure:

- Railway backend: `MONGO_URI`, `JWT_SECRET`, and `CLIENT_ORIGIN` (your Vercel URL; multiple URLs can be comma-separated)
- Vercel frontend: `VITE_API_URL` (your Railway public URL without `/api` or a trailing slash)

After changing `VITE_API_URL`, redeploy the frontend because Vite embeds it at build time.

Seed the database with demo products and role-based accounts:

```sh
cd backend
npm run seed
```

Demo seller: `seller@atoz.test` / `Seller123!`

Demo administrator: `saron@gmail.com` / `saron1234`

Change these credentials before using the application outside local development.

## Image storage

Development uploads are stored in `backend/uploads` and served from `/api/uploads`. The upload endpoint validates seller/admin permissions, file type, and a 5 MB size limit. For production, replace the Multer disk storage adapter with Cloudinary or Amazon S3 while keeping the same API response shape (`imageUrl`).
