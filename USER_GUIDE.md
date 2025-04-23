# Help Desk SaaS User Guide

This guide provides instructions for using the Help Desk SaaS application deployed on Netlify with Supabase.

## User Roles

The application supports four user roles:

1. **Superadmin**: Platform owner who manages admins and global settings
2. **Admin**: Manages their own help desk instance with customizable branding
3. **Agent**: Handles tickets for a specific admin's help desk
4. **Customer**: End-user who creates and views tickets

## Getting Started

### Registration and Login

1. Navigate to the application URL
2. Click "Register" to create a new account
3. Fill in your details and select your role (if applicable)
4. After registration, log in with your email and password

### Dashboard Navigation

The dashboard layout varies based on your user role:

- **Superadmin**: Access to admin management, platform branding, and Stripe settings
- **Admin**: Access to user management, ticket management, and organization branding
- **Agent**: Access to assigned tickets and customer management
- **Customer**: Access to their own tickets and profile settings

## Ticket Management

### Creating a Ticket

1. Click "New Ticket" button
2. Fill in the ticket details:
   - Title
   - Description
   - Priority (Low, Medium, High, Urgent)
   - Category
3. Click "Submit" to create the ticket

### Managing Tickets

1. View all tickets in the "Tickets" section
2. Filter tickets by status, priority, or category
3. Search for tickets using the search bar
4. Click on a ticket to view details

### Ticket Statuses

- **Open**: Newly created tickets
- **In Progress**: Tickets being worked on
- **On Hold**: Tickets temporarily paused
- **Pending**: Tickets awaiting customer response
- **Resolved**: Completed tickets
- **Archived**: Tickets removed from active view

### Responding to Tickets

1. Open a ticket
2. Type your response in the text box
3. For agents: Toggle "Internal Note" for private comments
4. Click "Send" to post your response

## User Management

### For Admins

1. Navigate to "Users" section
2. View all users in your organization
3. Create new users with the "Add User" button
4. Edit user details or deactivate accounts as needed

### For Superadmins

1. Navigate to "Admins" section
2. Manage admin accounts across the platform
3. Create new admin organizations
4. Monitor admin activity and usage

## Branding Customization

### For Admins

1. Navigate to "Branding" section
2. Customize your help desk appearance:
   - Upload logo
   - Set background color
   - Set sidebar color
   - Choose font colors
   - Set button and link colors
3. Preview changes in real-time
4. Save your branding settings

### For Superadmins

1. Navigate to "Platform Branding"
2. Set default branding for the entire platform
3. Changes will apply to all help desks without custom branding

## Search Functionality

1. Use the search bar in the header
2. Superadmins: Search for admins
3. Admins: Search for tickets or users
4. Results appear in a dropdown or dedicated search results page

## Profile Settings

1. Click on your profile icon
2. Select "Profile Settings"
3. Update your personal information
4. Change your password
5. Manage notification preferences

## Stripe Integration (Superadmin Only)

1. Navigate to "Stripe Settings"
2. Configure Stripe API keys:
   - Test mode keys for development
   - Live mode keys for production
3. Set up pricing plans for admins
4. Monitor subscription status and payments

## Customer Portal

Each admin has a dedicated customer portal where their users can:

1. Register for an account
2. Create and view tickets
3. Update their profile information
4. View knowledge base articles (if enabled)

The customer portal URL follows this format:
`https://[admin-subdomain].yourhelpdesk.com`
