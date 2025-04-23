import React, { useContext } from 'react';
import { Route, Redirect } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

// Protected route component that requires authentication
const PrivateRoute = ({ component: Component, ...rest }) => {
  const { isAuthenticated, loading } = useContext(AuthContext);
  
  return (
    <Route
      {...rest}
      render={props =>
        loading ? (
          <div className="flex justify-center items-center h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        ) : isAuthenticated ? (
          <Component {...props} />
        ) : (
          <Redirect to="/login" />
        )
      }
    />
  );
};

// Route that requires admin role
const AdminRoute = ({ component: Component, ...rest }) => {
  const { isAuthenticated, loading, isAdmin } = useContext(AuthContext);
  
  return (
    <Route
      {...rest}
      render={props =>
        loading ? (
          <div className="flex justify-center items-center h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        ) : isAuthenticated && isAdmin ? (
          <Component {...props} />
        ) : isAuthenticated ? (
          <Redirect to="/dashboard" />
        ) : (
          <Redirect to="/login" />
        )
      }
    />
  );
};

// Route that requires agent role (includes admin)
const AgentRoute = ({ component: Component, ...rest }) => {
  const { isAuthenticated, loading, isAgent } = useContext(AuthContext);
  
  return (
    <Route
      {...rest}
      render={props =>
        loading ? (
          <div className="flex justify-center items-center h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        ) : isAuthenticated && isAgent ? (
          <Component {...props} />
        ) : isAuthenticated ? (
          <Redirect to="/dashboard" />
        ) : (
          <Redirect to="/login" />
        )
      }
    />
  );
};

export { PrivateRoute, AdminRoute, AgentRoute };
