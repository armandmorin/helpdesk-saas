import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { PrivateRoute, AdminRoute, AgentRoute } from './components/routing/PrivateRoute';

// Auth Components
import Login from './components/auth/Login';
import Register from './components/auth/Register';

// Placeholder components (to be implemented)
const Dashboard = () => <div>Dashboard</div>;
const UserManagement = () => <div>User Management</div>;
const TicketsList = () => <div>Tickets List</div>;
const TicketDetail = () => <div>Ticket Detail</div>;
const CreateTicket = () => <div>Create Ticket</div>;
const AdminSettings = () => <div>Admin Settings</div>;

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Switch>
            <Route exact path="/login" component={Login} />
            <Route exact path="/register" component={Register} />
            <PrivateRoute exact path="/dashboard" component={Dashboard} />
            <PrivateRoute exact path="/tickets" component={TicketsList} />
            <PrivateRoute exact path="/tickets/:id" component={TicketDetail} />
            <PrivateRoute exact path="/create-ticket" component={CreateTicket} />
            <AdminRoute exact path="/admin/users" component={UserManagement} />
            <AdminRoute exact path="/admin/settings" component={AdminSettings} />
            <Route path="/" component={Login} />
          </Switch>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
