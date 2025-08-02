# Credlio - Peer-to-Peer Lending Platform

A modern peer-to-peer lending platform with separate experiences for lenders and borrowers.

## Features

### For Lenders (Landing at `/`)
- View borrower reputation and risk scores
- Track active loans and payments
- Access blacklist database
- Invite borrowers via WhatsApp
- Document verification tools
- Subscription-based access

### For Borrowers (Landing at `/borrower`)
- Build credit reputation
- Create loan requests
- Track payment history
- View loan offers
- Manage active loans
- Access reputation badges

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS, Radix UI
- **Backend**: Supabase (PostgreSQL, Authentication)
- **Payments**: Stripe
- **Package Manager**: npm

## Getting Started

### Prerequisites
- Node.js 18+
- npm
- Supabase account
- Stripe account

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Mvula88/credlio.git
cd credlio
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file with:
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
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the lender landing page
Open [http://localhost:3000/borrower](http://localhost:3000/borrower) for the borrower landing page

## Project Structure

```
├── app/
│   ├── page.tsx              # Lender landing page
│   ├── borrower/
│   │   ├── page.tsx          # Borrower landing page
│   │   └── dashboard/        # Borrower dashboard
│   └── lender/
│       └── dashboard/        # Lender dashboard
├── components/
│   ├── home/                 # Lender landing components
│   ├── borrower-landing/     # Borrower landing components
│   ├── lender/              # Lender-specific components
│   └── borrower/            # Borrower-specific components
└── lib/                     # Utilities and configurations
```

## Deployment

Deploy to Vercel:
1. Push to GitHub
2. Import repository in Vercel
3. Add environment variables
4. Deploy

## License

Private and proprietary