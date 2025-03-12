import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes/index';
import { ThemeProvider } from './contexts/ThemeContext';

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>
  );
};

export default App;
