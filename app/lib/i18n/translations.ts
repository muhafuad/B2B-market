export type Language = "en" | "am";

export const languages: {
  code: Language;
  label: string;
  nativeLabel: string;
  flag: string;
}[] = [
  { code: "en", label: "English", nativeLabel: "English", flag: "🇬🇧" },
  { code: "am", label: "Amharic", nativeLabel: "አማርኛ", flag: "🇪🇹" },
];

type Dict = Record<string, string>;

const en: Dict = {
  // Brand
  "brand.name": "Hidaya B2B Market",
  "brand.tagline":
    "The B2B distribution marketplace connecting Ethiopian manufacturers and retailers.",

  // Landing nav
  "nav.features": "Features",
  "nav.categories": "Categories",
  "nav.products": "Products",
  "nav.howItWorks": "How It Works",
  "nav.signIn": "Sign In",
  "nav.getStarted": "Get Started",
  "nav.signOut": "Sign Out",
  "nav.browseProducts": "Browse Products",
  "nav.browseCatalog": "Browse Catalog",
  "nav.adminPortal": "Admin Portal",
  "nav.platform": "Platform",
  "nav.account": "Account",
  "nav.contact": "Contact",
  "nav.register": "Register",
  "nav.registerHere": "Register here",

  // Hero
  "hero.badge": "Wholesale Supply Platform",
  "hero.title1": "The B2B Marketplace for",
  "hero.titleHighlight": "Industrial Supply",
  "hero.subtitle":
    "We source quality materials from verified manufacturers and deliver them to retailers and businesses. Manage your entire supply chain — from purchase orders to delivery — in one platform.",
  "hero.startOrdering": "Start Ordering",
  "hero.stats.products": "Products",
  "hero.stats.suppliers": "Suppliers",
  "hero.stats.ordersFulfilled": "Orders Fulfilled",
  "hero.stats.countries": "Regions",

  // Features
  "features.title": "Everything you need to manage supply and distribution",
  "features.subtitle":
    "From procurement to delivery, our platform streamlines every step of the B2B supply chain.",
  "features.supplierManagement.title": "Supplier Management",
  "features.supplierManagement.desc":
    "Onboard manufacturers, track performance ratings, and manage supplier relationships with detailed profiles.",
  "features.purchaseRequests.title": "Purchase Requests",
  "features.purchaseRequests.desc":
    "Create purchase requests, receive quotations from suppliers, and convert them to purchase orders seamlessly.",
  "features.smartInventory.title": "Smart Inventory",
  "features.smartInventory.desc":
    "Track stock levels across warehouses with SKU, barcode, batch tracking, and low-stock alerts.",
  "features.deliveryTracking.title": "Delivery Tracking",
  "features.deliveryTracking.desc":
    "Monitor incoming deliveries, schedule inspections, and assign goods to warehouses automatically.",
  "features.analytics.title": "Analytics & Reports",
  "features.analytics.desc":
    "Real-time dashboards for revenue, sales trends, inventory value, and supplier performance.",
  "features.secure.title": "Secure & Reliable",
  "features.secure.desc":
    "Role-based access control, audit logs, and bank-grade security protect your business data.",

  // Categories
  "categories.title": "Shop by Category",
  "categories.subtitle":
    "Browse our curated catalog across industrial categories.",

  // Featured products
  "featured.title": "Featured Products",
  "featured.subtitle": "Quality materials from trusted manufacturers.",
  "featured.viewAll": "View All",
  "featured.badge": "Featured",
  "featured.per": "per",

  // How it works
  "howItWorks.title": "How It Works",
  "howItWorks.subtitle": "A streamlined procurement and distribution process.",
  "howItWorks.step1.title": "Register Your Account",
  "howItWorks.step1.desc":
    "Sign up as a customer to browse products, place orders, and track deliveries. Suppliers are onboarded by our team.",
  "howItWorks.step2.title": "Browse & Order",
  "howItWorks.step2.desc":
    "Explore our catalog, filter by category or brand, add products to your cart, and checkout with flexible payment options.",
  "howItWorks.step3.title": "Track & Receive",
  "howItWorks.step3.desc":
    "Monitor your orders in real-time, download invoices, and receive shipments with full tracking visibility.",

  // CTA
  "cta.title": "Ready to streamline your supply chain?",
  "cta.subtitle":
    "Join hundreds of businesses that trust Hidaya B2B Market for their industrial supply needs.",
  "cta.button": "Create Your Account",

  // Footer
  "footer.copyright": "© 2026 Hidaya B2B Market. All rights reserved.",

  // Login
  "login.welcomeBack": "Welcome Back",
  "login.subtitle": "Sign in to your account to continue",
  "login.email": "Email",
  "login.password": "Password",
  "login.signIn": "Sign In",
  "login.signingIn": "Signing in...",
  "login.noAccount": "Don't have an account?",
  "login.adminNote":
    "Admin and supplier accounts are created by the platform owner.",
  "login.welcome": "Welcome back!",

  // Register
  "register.title": "Create Account",
  "register.subtitle": "Join the Hidaya B2B Market today",
  "register.fullName": "Full Name",
  "register.email": "Email",
  "register.password": "Password",
  "register.confirmPassword": "Confirm Password",
  "register.role": "I am a...",
  "register.roleCustomer": "Customer / Retailer",
  "register.roleSupplier": "Supplier / Manufacturer",
  "register.createAccount": "Create Account",
  "register.creating": "Creating account...",
  "register.haveAccount": "Already have an account?",
  "register.signInHere": "Sign in here",
  "register.passwordMismatch": "Passwords do not match",
  "register.success": "Account created successfully! Please sign in.",
  "register.passwordShort": "Password must be at least 6 characters",

  // Dashboard shell
  "dashboard.loading": "Loading...",
  "dashboard.welcome": "Welcome back",
  "dashboard.user": "User",
  "dashboard.notifications": "Notifications",
  "dashboard.noNotifications": "No notifications",
  "dashboard.signedOut": "Signed out successfully",

  // Admin nav
  "nav.admin.dashboard": "Dashboard",
  "nav.admin.suppliers": "Suppliers",
  "nav.admin.customers": "Customers",
  "nav.admin.products": "Products",
  "nav.admin.inventory": "Inventory",
  "nav.admin.purchaseRequests": "Purchase Requests",
  "nav.admin.purchaseOrders": "Purchase Orders",
  "nav.admin.deliveries": "Deliveries",
  "nav.admin.orders": "Orders",
  "nav.admin.payments": "Payments",
  "nav.admin.employees": "Employees",
  "nav.admin.reports": "Reports",
  "nav.admin.messages": "Messages",
  "nav.admin.settings": "Settings",

  // Supplier nav
  "nav.supplier.dashboard": "Dashboard",
  "nav.supplier.catalog": "My Catalog",
  "nav.supplier.purchaseRequests": "Purchase Requests",
  "nav.supplier.purchaseOrders": "Purchase Orders",
  "nav.supplier.deliveries": "Deliveries",
  "nav.supplier.payments": "Payments",
  "nav.supplier.messages": "Messages",

  // Customer nav
  "nav.customer.browse": "Browse",
  "nav.customer.cart": "Cart",
  "nav.customer.orders": "Orders",
  "nav.customer.wishlist": "Wishlist",
  "nav.customer.invoices": "Invoices",
  "nav.customer.reviews": "Reviews",
  "nav.customer.messages": "Messages",

  // Roles
  "role.super_admin": "Admin",
  "role.supplier": "Supplier",
  "role.customer": "Customer",

  // Language switcher
  "language.label": "Language",
  "language.switch": "Switch Language",
};

const am: Dict = {
  // Brand
  "brand.name": "ህዳያ B2B ገበያ",
  "brand.tagline": "የኢትዮጵያ አምራቾችን እና ተሸጣሾችን የሚያገናኝ የB2B ስርጭት ገበያ.",

  // Landing nav
  "nav.features": "ባህሪያት",
  "nav.categories": "ምድቦች",
  "nav.products": "ምርቶች",
  "nav.howItWorks": "እንዴት እንደሚሰራ",
  "nav.signIn": "ግባ",
  "nav.getStarted": "ተጀምር",
  "nav.signOut": "ውጣ",
  "nav.browseProducts": "ምርቶችን ይመልከቱ",
  "nav.browseCatalog": "ካታሎግ ይመልከቱ",
  "nav.adminPortal": "የአስተዳዳሪ በርጫ",
  "nav.platform": "መድረክ",
  "nav.account": "መለያ",
  "nav.contact": "አግኙን",
  "nav.register": "ይመዝገቡ",
  "nav.registerHere": "እዚህ ይመዝገቡ",

  // Hero
  "hero.badge": "የጅምላ አቅርቦት መድረክ",
  "hero.title1": "ለኢንዱስትሪያዊ አቅርቦት የB2B ገበያ",
  "hero.titleHighlight": "ኢንዱስትሪያዊ አቅርቦት",
  "hero.subtitle":
    "ጥራት ያላቸውን እቃዎች ከተረጋገጡ አምራቾች እንቀበላለን እና ለተሸጣሾች እና ንግዶች እንልካለን። መላውን የአቅርቦት ሰንጠረዥዎን — ከግዢ ትዕዛዝ እስከ መላኪያ — በአንድ መድረክ ያስተዳድሩ።",
  "hero.startOrdering": "ትዕዛዝ ይጀምሩ",
  "hero.stats.products": "ምርቶች",
  "hero.stats.suppliers": "አቅራቢዎች",
  "hero.stats.ordersFulfilled": "የተፈጸሙ ትዕዛዞች",
  "hero.stats.countries": "ክልሎች",

  // Features
  "features.title": "አቅርቦትና ስርጭትን ለማስተዳደር የሚያስፈልግዎት ሁሉ",
  "features.subtitle":
    "ከግዢ እስከ መላኪያ፣ መድረካችን የB2B አቅርቦት ሰንጠረዥን በእያንዳንዱ ደረጃ ያቀላጥፋል።",
  "features.supplierManagement.title": "የአቅራቢ አስተዳደር",
  "features.supplierManagement.desc":
    "አምራቾችን ያስመዝግቡ፣ የአፈጻጸም ደረጃዎችን ይከታተሉ፣ እና በዝርዝር መገለጫዎች የአቅራቢ ግንኙነቶችን ያስተዱ።",
  "features.purchaseRequests.title": "የግዢ ጥያቄዎች",
  "features.purchaseRequests.desc":
    "የግዢ ጥያቄዎችን ይፍጠሩ፣ ከአቅራቢዎች ጥቅሶች ይቀበሉ፣ እና ወደ የግዢ ትዕዛዞች በቀላሉ ይቀይሩ።",
  "features.smartInventory.title": "ስማርት እቃ ቁጠባ",
  "features.smartInventory.desc":
    "በማከበቢያ ቤቶች የእቃ መጠን በSKU፣ ባርኮድ፣ ባች ቁጥር እና ዝቅተኛ እቃ ማስጠንቀቂያ ይከታተሉ።",
  "features.deliveryTracking.title": "የመላኪያ ቅንብር",
  "features.deliveryTracking.desc":
    "የሚመጡትን መላኪያዎች ይከታተሉ፣ ምርመራዎችን ያቅዱ፣ እና እቃዎችን በራስ-ሰር ወደ ማከበቢያ ቤቶች ያስተናግዱ።",
  "features.analytics.title": "ትንተናና ሪፖርቶች",
  "features.analytics.desc":
    "ለገቢ፣ የሽያጭ አዝማሮች፣ የእቃ ዋጋ እና የአቅራቢ አፈጻጸም በቀጥታ ዳሽቦርዶች።",
  "features.secure.title": "ደህንነቱ የተጠበቀ",
  "features.secure.desc":
    "በስራ ላይ የተመሰረተ መዳረሻ ቁጥጥር፣ ኦዲት ሎግ እና የባንክ ደረጃ ደህንነት የንግድ መረጃዎን ይጠብቃል።",

  // Categories
  "categories.title": "በምድብ ይግዙ",
  "categories.subtitle": "በኢንዱስትሪያዊ ምድቦች የተዘጋጀ ካታሎግዎን ይመልከቱ።",

  // Featured products
  "featured.title": "ተመልከተ ምርቶች",
  "featured.subtitle": "ከታመኑ አምራቾች ጥራት ያላቸው እቃዎች።",
  "featured.viewAll": "ሁሉንም ይመልከቱ",
  "featured.badge": "ተመልከተ",
  "featured.per": "በ",

  // How it works
  "howItWorks.title": "እንዴት እንደሚሰራ",
  "howItWorks.subtitle": "የተሳለጠ የግዢ እና ስርጭት ሂደት።",
  "howItWorks.step1.title": "መለያዎን ያስመዝግቡ",
  "howItWorks.step1.desc":
    "ምርቶችን ለመመልከት፣ ትዕዛዝ ለማስገባት እና መላኪያዎችን ለመከታተል እንደ ደንበኛ ይመዝገቡ። አቅራቢዎች በቡድናችን ይመዝገባሉ።",
  "howItWorks.step2.title": "ያስሱ እና ይዘዙ",
  "howItWorks.step2.desc":
    "ካታሎጋችንን ያስሱ፣ በምድብ ወይም በስም ያጣሩ፣ ምርቶችን ወደ ቅርጫት ያክሉ፣ እና በምርጫ ክፍያ አማራጮች ይከፍሉ።",
  "howItWorks.step3.title": "ይከታተሉ እና ይቀበሉ",
  "howItWorks.step3.desc":
    "ትዕዛዞችዎን በቀጥታ ይከታተሉ፣ ደረሰኞችን ያውርዱ፣ እና ሙሉ ቅንብር አሳይነት እቃዎችን ይቀበሉ።",

  // CTA
  "cta.title": "የአቅርቦት ሰንጠረዥዎን ለማሳለጥ ዝግጁ ነዎት?",
  "cta.subtitle": "ለኢንዱስትሪያዊ አቅርቦት ፍላጎታቸው ህዳያ B2B ገበያን የሚታመኑ መቶዎችን ንግዶች ይቀላቀሉ።",
  "cta.button": "መለያዎን ይፍጠሩ",

  // Footer
  "footer.copyright": "© 2026 ህዳያ B2B ገበያ። ሁሉም መብቶች የተጠበቁ ናቸው።",

  // Login
  "login.welcomeBack": "እንኳን በደህና መጡ",
  "login.subtitle": "ለመቀጠል ወደ መለያዎ ይግቡ",
  "login.email": "ኢሜይል",
  "login.password": "የይለፍ ቃል",
  "login.signIn": "ግባ",
  "login.signingIn": "በመግባት ላይ...",
  "login.noAccount": "መለያ የለዎትም?",
  "login.adminNote": "የአስተዳዳሪ እና የአቅራቢ መለያዎች በመድረኩ ባለቤት ይፈጠራሉ።",
  "login.welcome": "እንኳን በደህና መጡ!",

  // Register
  "register.title": "መለያ ይፍጠሩ",
  "register.subtitle": "ዛሬ የህዳያ B2B ገበያ ይቀላቀሉ",
  "register.fullName": "ሙሉ ስም",
  "register.email": "ኢሜይል",
  "register.password": "የይለፍ ቃል",
  "register.confirmPassword": "የይለፍ ቃል ያረጋግጡ",
  "register.role": "እኔ ነኝ...",
  "register.roleCustomer": "ደንበኛ / ተሸጣሽ",
  "register.roleSupplier": "አቅራቢ / አምራች",
  "register.createAccount": "መለያ ይፍጠሩ",
  "register.creating": "በመፍጠር ላይ...",
  "register.haveAccount": "መለያ አለዎት?",
  "register.signInHere": "እዚህ ይግቡ",
  "register.passwordMismatch": "የይለፍ ቃሎች አይገጥሙም",
  "register.success": "መለያ በተሳካ ሁኔታ ተፈጥሯል! እባክዎ ይግቡ።",
  "register.passwordShort": "የይለፍ ቃል ቢያንስ 6 ቁምፎች መሆን አለበት",

  // Dashboard shell
  "dashboard.loading": "በመጫን ላይ...",
  "dashboard.welcome": "እንኳን በደህና መጡ",
  "dashboard.user": "ተጠቃሚ",
  "dashboard.notifications": "ማስታወቂያዎች",
  "dashboard.noNotifications": "ማስታወቂያ የለም",
  "dashboard.signedOut": "በተሳካ ሁኔታ ወጥተዋል",

  // Admin nav
  "nav.admin.dashboard": "ዳሽቦርድ",
  "nav.admin.suppliers": "አቅራቢዎች",
  "nav.admin.customers": "ደንበኞች",
  "nav.admin.products": "ምርቶች",
  "nav.admin.inventory": "እቃ ቁጠባ",
  "nav.admin.purchaseRequests": "የግዢ ጥያቄዎች",
  "nav.admin.purchaseOrders": "የግዢ ትዕዛዞች",
  "nav.admin.deliveries": "መላኪያዎች",
  "nav.admin.orders": "ትዕዛዞች",
  "nav.admin.payments": "ክፍያዎች",
  "nav.admin.employees": "ሠራተኞች",
  "nav.admin.reports": "ሪፖርቶች",
  "nav.admin.messages": "መልዕክቶች",
  "nav.admin.settings": "ቅንብሮች",

  // Supplier nav
  "nav.supplier.dashboard": "ዳሽቦርድ",
  "nav.supplier.catalog": "የእኔ ካታሎግ",
  "nav.supplier.purchaseRequests": "የግዢ ጥያቄዎች",
  "nav.supplier.purchaseOrders": "የግዢ ትዕዛዞች",
  "nav.supplier.deliveries": "መላኪያዎች",
  "nav.supplier.payments": "ክፍያዎች",
  "nav.supplier.messages": "መልዕክቶች",

  // Customer nav
  "nav.customer.browse": "ያስሱ",
  "nav.customer.cart": "ቅርጫት",
  "nav.customer.orders": "ትዕዛዞች",
  "nav.customer.wishlist": "ምኞች",
  "nav.customer.invoices": "ደረሰኞች",
  "nav.customer.reviews": "ግምገማዎች",
  "nav.customer.messages": "መልዕክቶች",

  // Roles
  "role.super_admin": "አስተዳዳሪ",
  "role.supplier": "አቅራቢ",
  "role.customer": "ደንበኛ",

  // Language switcher
  "language.label": "ቋንቋ",
  "language.switch": "ቋንቋ ይቀይሩ",
};

export const dictionaries: Record<Language, Dict> = { en, am };

export function translate(lang: Language, key: string): string {
  return dictionaries[lang]?.[key] ?? dictionaries.en[key] ?? key;
}
