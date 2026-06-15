# Software Requirements Specification

## Thikana

Version: 1.0  
Date: May 3, 2026  
Prepared for: Thikana project stakeholders  
Project type: Product marketplace and property listing web application

---

## 1. Introduction

### 1.1 Purpose

This Software Requirements Specification (SRS) describes the functional and non-functional requirements for Thikana, a web-based marketplace platform that allows users to buy, sell, rent, book, and communicate around products and property listings. The document is intended for developers, testers, project supervisors, maintainers, and stakeholders who need a clear understanding of the system behavior and constraints.

### 1.2 Scope

Thikana provides a role-based marketplace for buyers, sellers, and administrators. Buyers can browse listings, save favourites, make inquiries, add eligible products to cart, place orders, book rental properties, review purchased products, and message verified sellers. Sellers can verify identity, upload listings, manage products, receive inquiries, handle orders, and communicate with buyers or other verified sellers. Administrators can review NID submissions, approve or reject product listings, and monitor platform statistics.

The system includes:

- React frontend built with Vite.
- Node.js and Express backend API.
- MySQL database.
- Socket.io based real-time messaging.
- JWT authentication.
- Email-based OTP and password reset flows.
- File upload support for images, chat files, and voice messages.

### 1.3 Intended Audience

The intended readers are:

- Project evaluators and academic supervisors.
- Frontend and backend developers.
- QA testers.
- System administrators.
- Future maintainers of the Thikana codebase.

### 1.4 Definitions

| Term | Meaning |
| --- | --- |
| Buyer | A registered user who can browse, purchase, book, review, favourite, inquire, and message. |
| Seller | A registered user who can upload listings, manage products, respond to inquiries, process orders, and message. |
| Admin | A privileged user who reviews listings, NID submissions, and platform activity. |
| NID | National Identity Document used for identity verification. |
| Listing | A product or property published by a seller. |
| OTP | One-time password/code used for email verification. |
| JWT | JSON Web Token used for API authentication. |

---

## 2. Overall Description

### 2.1 Product Perspective

Thikana is a full-stack web application. The frontend communicates with the backend through REST API endpoints under `/api`, while real-time chat events are handled through Socket.io. Uploaded files are stored on the server under the uploads directory and served as static assets.

### 2.2 Product Functions

At a high level, the system shall:

- Allow users to create accounts as buyers or sellers.
- Verify user email through OTP.
- Authenticate users using email and password.
- Support password recovery and password changes.
- Allow users to update profile and avatar information.
- Allow users to submit NID verification documents.
- Restrict sensitive marketplace actions to NID-verified users where required.
- Allow sellers to create and edit listings.
- Allow admins to approve or reject pending product listings.
- Allow buyers to browse, filter, view, favourite, and purchase products.
- Allow buyers to book house rental listings with an advance amount.
- Allow buyers and sellers to manage orders.
- Allow verified users to exchange messages in real time.
- Notify users about relevant platform events.
- Allow verified buyers to submit reviews for products.

### 2.3 User Classes

| User Class | Description |
| --- | --- |
| Guest | Can access public pages such as home, product listings, login, signup, terms, and privacy pages. |
| Buyer | Can manage profile, verify NID, browse listings, favourite products, use cart, place orders, book properties, submit reviews, send inquiries, and message sellers. |
| Seller | Can manage profile, verify NID, create and edit listings, receive inquiries, manage seller orders, and message verified users. |
| Admin | Can access admin dashboard, review product listings, review NID submissions, and view platform statistics. |

### 2.4 Operating Environment

The system is designed to run in the following environment:

- Client: Modern web browser.
- Frontend runtime: Vite development server.
- Backend runtime: Node.js.
- Database: MySQL, commonly via XAMPP in local development.
- Default backend port: `5000`.
- Default frontend development origin: `http://localhost:5173`.

### 2.5 Design and Implementation Constraints

- The backend shall use Express.js and MySQL.
- The frontend shall use React and React Router.
- API authorization shall use JWT bearer tokens.
- Passwords shall be hashed before storage.
- Role-based access rules shall be enforced server-side.
- NID-gated actions shall be enforced server-side.
- Uploaded files shall be validated and stored through backend upload utilities.
- Socket.io messaging shall require authenticated connections.

### 2.6 Assumptions and Dependencies

- Users have access to a web browser and internet/local network connection.
- The MySQL database exists and migrations have been executed.
- Environment variables are configured for database access, JWT secret, mail service, backend port, and client URL.
- Email services are available for OTP and password reset delivery.
- Payment gateway integration is not currently automated; order and booking flows are handled within the application logic.

---

## 3. External Interface Requirements

### 3.1 User Interface

The frontend shall provide pages for:

- Home and listing discovery.
- Login, signup, email verification, forgot password, and reset password.
- User profile.
- NID verification.
- Product upload and product details.
- Cart and checkout.
- Order details.
- Messages.
- Notifications.
- Settings.
- Admin dashboard.
- Terms and privacy pages.

The UI shall be responsive and usable on desktop and mobile browsers.

### 3.2 Hardware Interfaces

The system has no special hardware interface requirements. Users may optionally use device storage and camera/gallery access through browser file inputs for images and verification documents.

### 3.3 Software Interfaces

The system interfaces with:

- MySQL database.
- SMTP/email service through Nodemailer.
- Browser local storage for storing the JWT token.
- Socket.io for real-time communication.
- Server filesystem for uploaded images, files, and voice messages.

### 3.4 Communication Interfaces

The frontend shall communicate with the backend through HTTP/HTTPS REST API requests. Authenticated API calls shall include:

```http
Authorization: Bearer <jwt_token>
```

Socket.io connections shall authenticate using a JWT token supplied during the socket handshake.

---

## 4. System Features and Functional Requirements

### 4.1 Authentication and Account Management

| ID | Requirement |
| --- | --- |
| FR-001 | The system shall allow a guest to create an account with full name, email, password, and role. |
| FR-002 | The system shall reject duplicate email registrations. |
| FR-003 | The system shall hash user passwords before saving them. |
| FR-004 | The system shall send or generate an OTP for email verification after signup. |
| FR-005 | The system shall allow users to verify email by submitting email and OTP. |
| FR-006 | The system shall prevent unverified users from logging in successfully. |
| FR-007 | The system shall allow verified users to log in using email and password. |
| FR-008 | The system shall issue a JWT token after successful login or email verification. |
| FR-009 | The system shall allow authenticated users to retrieve their current account details. |
| FR-010 | The system shall support forgot password and reset password flows. |
| FR-011 | The system shall allow authenticated users to change their password. |
| FR-012 | The system shall allow users to log out by removing the stored JWT token from the client. |

### 4.2 Profile and Settings

| ID | Requirement |
| --- | --- |
| FR-013 | The system shall allow authenticated users to view their profile. |
| FR-014 | The system shall allow authenticated users to update profile information. |
| FR-015 | The system shall allow authenticated users to upload or update an avatar. |
| FR-016 | The system shall show role and NID verification status in the profile/settings area. |

### 4.3 NID Verification

| ID | Requirement |
| --- | --- |
| FR-017 | The system shall allow authenticated users to view their current NID verification status. |
| FR-018 | The system shall allow authenticated users to submit NID number, NID front image, and selfie image. |
| FR-019 | The system shall prevent users from submitting a new NID request while another request is pending. |
| FR-020 | The system shall store submitted NID images and create a pending NID submission record. |
| FR-021 | The system shall allow admins to list pending NID submissions. |
| FR-022 | The system shall allow admins to approve or reject NID submissions with an optional note. |
| FR-023 | The system shall mark users as NID verified after admin approval. |

### 4.4 Product and Property Listings

| ID | Requirement |
| --- | --- |
| FR-024 | The system shall allow public users to view approved product and property listings. |
| FR-025 | The system shall allow users to view details for a selected listing. |
| FR-026 | The system shall support listing categories including furniture, appliance, house sale, and house rent. |
| FR-027 | The system shall allow verified sellers to upload listings with category, title, description, price, location, coordinates, attributes, and images. |
| FR-028 | The system shall require title, category, price, and location when creating a listing. |
| FR-029 | The system shall save listing images through backend upload storage. |
| FR-030 | The system shall create new listings with a moderation status before public approval. |
| FR-031 | The system shall allow verified sellers to edit their own listings. |
| FR-032 | The system shall allow sellers to mark products as sold where applicable. |
| FR-033 | The system shall allow admins to review pending listings. |
| FR-034 | The system shall allow admins to approve or reject product listings. |

### 4.5 Favourites

| ID | Requirement |
| --- | --- |
| FR-035 | The system shall allow authenticated buyers to view favourite listings. |
| FR-036 | The system shall allow authenticated buyers to add or remove a listing from favourites. |
| FR-037 | The system shall allow authenticated buyers to check whether a listing is already favourited. |

### 4.6 Inquiries

| ID | Requirement |
| --- | --- |
| FR-038 | The system shall allow verified buyers to send an inquiry to a seller for an approved or sold listing. |
| FR-039 | The system shall prevent buyers from sending inquiries about their own listings. |
| FR-040 | The system shall allow verified sellers to view inquiries for their listings. |
| FR-041 | The system shall allow verified sellers to view unread inquiry count. |
| FR-042 | The system shall allow verified sellers to mark inquiries as read. |

### 4.7 Cart and Checkout

| ID | Requirement |
| --- | --- |
| FR-043 | The system shall allow authenticated buyers to view cart items. |
| FR-044 | The system shall allow authenticated buyers to view cart count. |
| FR-045 | The system shall allow authenticated buyers to add eligible products to cart. |
| FR-046 | The system shall only allow furniture and appliance products to be added to cart. |
| FR-047 | The system shall prevent buyers from adding their own products to cart. |
| FR-048 | The system shall prevent unavailable or unapproved products from being added to cart. |
| FR-049 | The system shall allow buyers to remove items from cart. |
| FR-050 | The system shall allow buyers to clear the cart. |
| FR-051 | The system shall calculate cart total using item price and quantity. |

### 4.8 Orders and Bookings

| ID | Requirement |
| --- | --- |
| FR-052 | The system shall allow verified buyers to place an order. |
| FR-053 | The system shall allow verified buyers to book eligible rental property listings using an advance amount. |
| FR-054 | The system shall allow buyers to view their order history. |
| FR-055 | The system shall allow verified sellers to view orders related to their listings. |
| FR-056 | The system shall allow buyers, sellers, or admins to view order details where permitted. |
| FR-057 | The system shall allow permitted users to update order status. |
| FR-058 | The system shall support order states such as pending, confirmed, shipped, delivered, cancelled, and related booking states where implemented. |

### 4.9 Reviews

| ID | Requirement |
| --- | --- |
| FR-059 | The system shall allow users to view reviews for a product. |
| FR-060 | The system shall allow authenticated buyers to submit a product review. |
| FR-061 | The system shall require a rating value for submitted reviews. |
| FR-062 | The system shall associate reviews with products and buyers. |

### 4.10 Messaging and Chat Uploads

| ID | Requirement |
| --- | --- |
| FR-063 | The system shall allow verified buyers and sellers to view conversations. |
| FR-064 | The system shall allow verified users to retrieve message history with another permitted user. |
| FR-065 | The system shall allow verified users to send text messages. |
| FR-066 | The system shall allow verified users to send supported chat file, image, and voice messages. |
| FR-067 | The system shall prevent users from messaging themselves. |
| FR-068 | The system shall prevent admins from using direct chat. |
| FR-069 | The system shall enforce chat permission rules based on user role and NID verification. |
| FR-070 | The system shall show unread message counts. |
| FR-071 | The system shall allow users to mark conversations as read. |
| FR-072 | The system shall emit real-time events for new messages, typing status, online status, and read status. |

### 4.11 Notifications

| ID | Requirement |
| --- | --- |
| FR-073 | The system shall allow authenticated users to list notifications. |
| FR-074 | The system shall allow authenticated users to view unread notification count. |
| FR-075 | The system shall allow authenticated users to mark one notification as read. |
| FR-076 | The system shall allow authenticated users to mark all notifications as read. |

### 4.12 Admin Dashboard

| ID | Requirement |
| --- | --- |
| FR-077 | The system shall restrict admin routes to admin users only. |
| FR-078 | The system shall allow admins to view dashboard statistics. |
| FR-079 | The system shall allow admins to view pending products. |
| FR-080 | The system shall allow admins to approve or reject products. |
| FR-081 | The system shall allow admins to view pending NID submissions. |
| FR-082 | The system shall allow admins to approve or reject NID submissions. |

---

## 5. API Requirements

The backend shall expose REST endpoints under the following groups:

| API Group | Purpose |
| --- | --- |
| `/api/auth` | Signup, email verification, login, current user, password reset, password change. |
| `/api/profile` | Profile read/update and avatar upload. |
| `/api/nid` | NID status and NID submission. |
| `/api/products` | Public listing search/detail and seller product creation/editing. |
| `/api/favourites` | Buyer favourites. |
| `/api/inquiries` | Buyer inquiries and seller inquiry management. |
| `/api/cart` | Buyer cart and cart count. |
| `/api/orders` | Orders, bookings, seller orders, status updates, order details. |
| `/api/messages` | Conversations, message history, unread count, send message, mark read. |
| `/api/notifications` | Notifications and read states. |
| `/api/upload/chat` | Chat attachment upload. |
| `/api/reviews` | Product reviews. |
| `/api/admin` | Admin statistics, product review, and NID review. |
| `/api/health` | Backend health check. |

All protected endpoints shall validate JWT tokens. Role-restricted endpoints shall enforce buyer, seller, admin, and NID verification rules on the server.

---

## 6. Data Requirements

The database shall persist the following major entities:

| Entity | Description |
| --- | --- |
| users | Stores user identity, role, verification state, profile data, and credentials. |
| refresh_tokens | Stores refresh token records if token refresh is used. |
| nid_submissions | Stores NID verification requests and review outcomes. |
| products | Stores listing information, category, seller, price, location, attributes, and status. |
| product_images | Stores image references for listings. |
| favourites | Stores buyer saved listings. |
| inquiries | Stores buyer inquiries sent to sellers. |
| cart_items | Stores buyer cart entries. |
| orders | Stores order and booking header data. |
| order_items | Stores products included in each order. |
| reviews | Stores product reviews and ratings. |
| messages | Stores chat messages, attachments, and read status. |
| notifications | Stores user notification records. |

The system shall maintain referential relationships between users, products, orders, messages, reviews, and notifications where applicable.

---

## 7. Non-Functional Requirements

### 7.1 Security

| ID | Requirement |
| --- | --- |
| NFR-001 | The system shall hash passwords before storing them. |
| NFR-002 | The system shall use JWT-based authentication for protected API routes. |
| NFR-003 | The system shall enforce role-based access control on backend routes. |
| NFR-004 | The system shall enforce NID verification for sensitive actions such as listing upload, orders, bookings, inquiries, and messaging. |
| NFR-005 | The system shall reject unauthenticated or unauthorized requests with appropriate HTTP status codes. |
| NFR-006 | The system shall apply rate limiting to sensitive endpoints such as signup, login, OTP, cart, messages, inquiries, reviews, and uploads. |
| NFR-007 | The system shall validate required inputs before processing requests. |

### 7.2 Performance

| ID | Requirement |
| --- | --- |
| NFR-008 | Public listing and detail pages shall load within an acceptable time on normal local or hosted network conditions. |
| NFR-009 | API endpoints shall return paginated or filtered data where needed to avoid excessive payloads. |
| NFR-010 | Real-time chat events shall be delivered with minimal delay while both users are connected. |

### 7.3 Reliability and Availability

| ID | Requirement |
| --- | --- |
| NFR-011 | The backend shall provide a health check endpoint. |
| NFR-012 | The backend shall return consistent JSON error responses for failed API calls. |
| NFR-013 | The system shall preserve database records for users, listings, orders, messages, and reviews across server restarts. |

### 7.4 Usability

| ID | Requirement |
| --- | --- |
| NFR-014 | The UI shall be responsive across desktop and mobile browsers. |
| NFR-015 | The UI shall provide clear feedback for loading, success, and error states. |
| NFR-016 | Navigation shall expose major buyer, seller, and admin workflows based on role. |

### 7.5 Maintainability

| ID | Requirement |
| --- | --- |
| NFR-017 | Frontend API calls shall be centralized through the API service layer. |
| NFR-018 | Backend route handlers shall be organized by domain controller and route modules. |
| NFR-019 | Database schema setup shall be reproducible through migration scripts. |

### 7.6 Portability

| ID | Requirement |
| --- | --- |
| NFR-020 | The system shall run locally using Node.js, npm, and MySQL. |
| NFR-021 | Environment-specific configuration shall be supplied through environment variables. |

---

## 8. Business Rules

| ID | Rule |
| --- | --- |
| BR-001 | Only verified users may access NID-gated marketplace actions. |
| BR-002 | Only sellers may upload or edit listings. |
| BR-003 | Only buyers may use cart and favourites. |
| BR-004 | Only furniture and appliance products may be added to cart. |
| BR-005 | House rent listings may be booked with an advance amount. |
| BR-006 | Buyers cannot buy or inquire about their own listings. |
| BR-007 | Admin users cannot use direct chat. |
| BR-008 | Buyers may chat only with verified sellers. |
| BR-009 | Sellers may chat with verified buyers or verified sellers. |
| BR-010 | Product listings require admin review before normal public availability. |
| BR-011 | NID verification requires admin review before a user is marked verified. |

---

## 9. Use Case Summary

### UC-001: Register and Verify Email

Primary actor: Guest  
Precondition: Guest has not registered with the email.  
Main flow:

1. Guest submits signup form.
2. System creates account and generates OTP.
3. Guest submits OTP.
4. System verifies email and issues JWT token.

Postcondition: User account is verified and authenticated.

### UC-002: Submit NID Verification

Primary actor: Buyer or seller  
Precondition: User is authenticated.  
Main flow:

1. User opens NID verification page.
2. User submits NID number, NID front image, and selfie.
3. System stores files and creates pending submission.
4. Admin reviews the submission.
5. System updates verification status.

Postcondition: User is approved, rejected, or remains pending.

### UC-003: Upload Product Listing

Primary actor: Seller  
Precondition: Seller is authenticated and NID verified.  
Main flow:

1. Seller selects category.
2. Seller enters listing information, location, attributes, and images.
3. Seller submits listing.
4. System stores listing and images.
5. Admin reviews listing.

Postcondition: Listing is pending, approved, or rejected.

### UC-004: Purchase Product

Primary actor: Buyer  
Precondition: Buyer is authenticated and eligible product is approved.  
Main flow:

1. Buyer views product.
2. Buyer adds product to cart.
3. Buyer checks out.
4. System creates order and order items.
5. Buyer and seller can track order status.

Postcondition: Order exists and can be managed by permitted users.

### UC-005: Book Rental Property

Primary actor: Buyer  
Precondition: Buyer is authenticated and NID verified.  
Main flow:

1. Buyer views house rent listing.
2. Buyer selects or enters advance booking amount.
3. Buyer provides phone and optional note.
4. System creates a booking order.

Postcondition: Booking record exists for the property listing.

### UC-006: Real-Time Messaging

Primary actor: Verified buyer or seller  
Precondition: User is authenticated, NID verified, and allowed to message the receiver.  
Main flow:

1. User opens messages.
2. System loads conversations or message history.
3. User sends text, image, file, or voice message.
4. System stores message.
5. Socket.io emits new message and unread count to receiver.

Postcondition: Message is stored and delivered in real time when receiver is connected.

---

## 10. Acceptance Criteria

| ID | Criteria |
| --- | --- |
| AC-001 | A new user can sign up, verify email, log in, and view profile. |
| AC-002 | An unverified email user cannot log in. |
| AC-003 | A user can submit NID documents and see pending status. |
| AC-004 | An admin can approve an NID submission and the user becomes NID verified. |
| AC-005 | A verified seller can submit a listing and an admin can approve or reject it. |
| AC-006 | Public users can browse and view approved listings. |
| AC-007 | A buyer can favourite and unfavourite a listing. |
| AC-008 | A buyer can add eligible furniture or appliance listings to cart and place an order. |
| AC-009 | A buyer cannot add house sale or house rent listings to cart. |
| AC-010 | A verified buyer can book a house rent listing with an advance amount. |
| AC-011 | Buyers and sellers can view relevant order details and status updates. |
| AC-012 | Verified permitted users can exchange real-time messages. |
| AC-013 | Users can see unread message and notification counts. |
| AC-014 | A buyer can submit a rating/review for a product where permitted. |
| AC-015 | Admin-only endpoints reject non-admin users. |

---

## 11. Future Enhancements

The following enhancements are outside the current baseline scope but are suitable for future development:

- Automated NID verification using OCR or identity verification APIs.
- Payment gateway integration such as SSLCommerz, Stripe, or bKash.
- Courier and delivery API integration.
- Advanced dispute management.
- User suspension and fine-grained permission management.
- Improved analytics and reporting dashboards.
- Automated email templates and notification preferences.

---

## 12. Appendix: Technology Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, Vite, React Router, Tailwind CSS, Lucide React |
| State Management | React Context API |
| Maps | Leaflet, React Leaflet |
| Backend | Node.js, Express.js |
| Database | MySQL |
| Authentication | JWT, bcryptjs |
| Real-Time | Socket.io, socket.io-client |
| File Upload | Multer and server-side upload utilities |
| Email | Nodemailer |
| Development Database Environment | XAMPP MySQL |

