# Help Desk SaaS - User Guide

This document provides instructions for using the Help Desk SaaS application.

## Getting Started

### Registration and Login

1. **Register a new account**:
   - Navigate to the registration page
   - Enter your email, password, first name, last name, and organization name
   - Submit the form to create your account
   - You'll be automatically assigned as an admin for your organization

2. **Login to your account**:
   - Enter your email and password
   - Click "Sign in" to access your dashboard

### User Roles

The system has three user roles with different permissions:

1. **Admin**:
   - Full access to all features
   - Can manage users and subusers
   - Can configure pricing plans
   - Can manage Stripe integration
   - Can view and manage all tickets

2. **Agent**:
   - Can view and respond to all tickets
   - Can update ticket status
   - Can add internal notes to tickets

3. **Customer**:
   - Can create and view their own tickets
   - Can respond to their tickets
   - Cannot see internal notes

## Ticket Management

### Creating Tickets

1. Navigate to the "Tickets" section
2. Click "Create New Ticket"
3. Fill in the ticket details:
   - Title: A brief summary of the issue
   - Category: The type of issue (e.g., Technical, Billing, Feature Request)
   - Priority: Low, Medium, High, or Urgent
   - Description: Detailed explanation of the issue
4. Click "Create Ticket" to submit

### Managing Tickets

1. **Viewing Tickets**:
   - Navigate to the "Tickets" section to see a list of all tickets
   - Use the search bar to find specific tickets
   - Filter tickets by status using the dropdown menu

2. **Responding to Tickets**:
   - Open a ticket by clicking on it in the list
   - Scroll to the bottom to find the response form
   - Type your response and click "Submit Response"
   - Agents can check "Internal note" to add notes only visible to other agents

3. **Updating Ticket Status**:
   - Agents and admins can update the ticket status using the dropdown at the top of the ticket
   - Available statuses: Open, In Progress, On Hold, Pending, Resolved, Archived

## Admin Features

### User Management

1. Navigate to the "Admin" section and select "User Management"
2. **Adding Users**:
   - Click "Add User"
   - Fill in the user details including email, password, name, and role
   - Click "Create User" to add the new user

3. **Managing Users**:
   - View all users in your organization
   - Activate or deactivate users as needed
   - The main admin account cannot be deactivated

### Pricing Configuration

1. Navigate to the "Admin" section and select "Pricing Settings"
2. **Stripe Integration**:
   - Connect your Stripe account by clicking "Connect Stripe"
   - Toggle between test and live modes as needed

3. **Managing Pricing Plans**:
   - Click "Add Plan" to create a new pricing plan
   - Fill in the plan details including name, price, billing cycle, and features
   - Existing plans can be activated or deactivated as needed

### Subscription Management

1. Navigate to the "Admin" section and select "Subscription Management"
2. **Current Subscription**:
   - View details of your current subscription
   - Cancel your subscription if needed

3. **Changing Plans**:
   - Browse available plans
   - Click "Subscribe" on a plan to upgrade or change your subscription
   - Follow the Stripe checkout process to complete payment

## Best Practices

1. **Ticket Organization**:
   - Use clear, descriptive titles for tickets
   - Assign appropriate categories and priorities
   - Update ticket status regularly to reflect current state

2. **User Management**:
   - Create separate accounts for each team member
   - Assign appropriate roles based on responsibilities
   - Deactivate accounts for users who no longer need access

3. **Communication**:
   - Use internal notes for team communication
   - Provide clear, helpful responses to customers
   - Update tickets promptly to maintain good customer service

## Troubleshooting

- **Login Issues**: Ensure you're using the correct email and password. Use the "Forgot Password" feature if needed.
- **Missing Features**: Verify your user role has permission to access the feature you're looking for.
- **Payment Problems**: Check your Stripe connection and subscription status in the admin dashboard.
