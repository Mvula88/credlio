# Credlio - Peer-to-Peer Lending Platform

A modern peer-to-peer lending platform built with Next.js, TypeScript, Supabase, and Stripe.

## Features

- **User Authentication**: Secure authentication with role-based access (Lender/Borrower)
- **Loan Management**: Create loan requests, make offers, track payments
- **Payment Processing**: Integrated with Stripe for secure payment handling
- **Admin Dashboard**: Comprehensive admin tools for platform management
- **Country-Specific Features**: Support for multiple countries with localized settings
- **Risk Management**: Borrower risk assessment and tracking
- **Real-time Notifications**: Stay updated with loan and payment activities

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS, Radix UI components
- **Backend**: Supabase (PostgreSQL, Authentication, Real-time)
- **Payments**: Stripe
- **Package Manager**: pnpm

## Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm (install with `npm install -g pnpm`)
- Supabase account
- Stripe account

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/credlio.git
cd credlio
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
Create a `.env.local` file with your credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret
```

4. Run the development server:
```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Database Setup

Run the SQL scripts in the `/scripts` folder in your Supabase SQL editor to set up the database schema and policies.

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import your repository in Vercel
3. Add environment variables in Vercel project settings
4. Deploy

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

## Project Structure

```
├── app/              # Next.js app directory
├── components/       # React components
├── lib/             # Utility functions and configurations
├── hooks/           # Custom React hooks
├── scripts/         # Database setup scripts
├── public/          # Static assets
└── styles/          # Global styles
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is private and proprietary.