# 🛍️ Mariot E-Commerce

![Mariot E-Commerce Banner](https://raw.githubusercontent.com/anvar010/Mariot-E-Commerce/main/public/assets/banner.png)
<p align="center">
  <img src="https://raw.githubusercontent.com/anvar010/Mariot-E-Commerce/main/public/assets/banner.png" alt="Mariot E-Commerce Banner" width="100%">
</p>
## ✨ Overview
**Mariot E-Commerce** is a premium, high-performance B2B and B2C marketplace built with **Next.js 13**, **TypeScript**, and **Framer Motion**. It offers a seamless shopping experience with professional-grade features including internationalization, AI-powered assistance, and secure payment processing.

Designed for scalability and modern aesthetics, Mariot provides a robust platform for both sellers and customers, featuring a powerful admin dashboard and state-of-the-art SEO optimization.

---

## 🚀 Key Features

### 🛒 Comprehensive Shopping Experience
- **Advanced Dynamic Filtering**: Filter products by brand, category, price range, and custom attributes.
- **Multilingual Support**: Fully localized using `next-intl` with right-to-left (RTL) support for Arabic.
- **Seamless Checkout**: Integrated with **Stripe** for secure, multi-currency transactions.
- **Product Management**: Detailed product views, variation handling, and inventory tracking.

### 🤖 Intelligent Features
- **AI Chatbot**: Integrated Gemini AI to assist users with product queries and navigation.
- **Smart Recommendations**: Data-driven product suggestions to enhance user engagement.

### 🛡️ Secure & Scalable Admin Portal
- **Dashboard Analytics**: Real-time sales tracking and performance metrics.
- **Order Management**: End-to-end order processing, from placement to delivery.
- **User & Seller Tiers**: Role-based access control for customers, sellers, and administrators.

### 📈 Performance & SEO
- **SEO Optimized**: Dynamic metadata generation, sitemaps, and optimized heading structures.
- **Lightning Fast**: Built on Next.js 13 App Router for optimal Server Side Rendering (SSR) and performance.
- **Responsive Design**: Fluid UI that works beautifully across mobile, tablet, and desktop.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: [Next.js 13](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: Vanilla CSS Modules
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **State Management**: React Context API & Hooks

### Backend & Integrations
- **Payment Gateway**: [Stripe API](https://stripe.com/)
- **Authentication**: [React Google OAuth](https://github.com/MomenSherif/react-oauth) & JWT
- **AI Integration**: [Google Generative AI (Gemini)](https://ai.google.dev/)
- **Mailing**: [Nodemailer](https://nodemailer.com/)
- **Database Connection**: [MySQL2](https://github.com/sidorares/node-mysql2)

---

## 📦 Getting Started

### Prerequisites
- Node.js (v18 or later)
- NPM or Yarn
- MySQL Database

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/anvar010/Mariot-E-Commerce.git
   cd Mariot-E-Commerce
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Setup:**
   Create a `.env.local` file in the root directory and add the following:
   ```env
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_key
   STRIPE_SECRET_KEY=your_key
   GOOGLE_CLIENT_ID=your_id
   DB_HOST=localhost
   DB_USER=root
   DB_PASS=your_password
   GEMINI_API_KEY=your_key
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

---

## 📂 Project Structure

```text
src/
├── app/            # App router pages & layouts
├── components/     # Reusable UI components
│   ├── Admin/      # Admin dashboard components
│   ├── Home/       # Home page sections
│   ├── Layout/     # Header, Footer, Navigation
│   └── shared/     # Generic UI elements
├── context/        # Global state management
├── hooks/          # Custom React hooks
├── i18n/           # Internationalization config
├── utils/          # Helper functions & API calls
└── assets/         # Static images & styles
```

---

## 🤝 Contributing

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License
Distributed under the MIT License. See `LICENSE` for more information.

---

## 📧 Contact
Project Link: [https://github.com/anvar010/Mariot-E-Commerce](https://github.com/anvar010/Mariot-E-Commerce)
