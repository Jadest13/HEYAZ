import { textStyles } from '@heyaz/app/styles/typography';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Global, ThemeProvider } from '@emotion/react';
import { theme } from '@heyaz/app/styles/index';
import { AppProvider } from '@heyaz/app/hooks/useApp';
import { storage } from './adapters/storage';
import App from './App';
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <Global
        styles={{
          '*': { boxSizing: 'border-box' },
          ':root': { colorScheme: 'dark' },
          'input::placeholder,textarea::placeholder': { color: theme.colors.muted, opacity: 1 },
          body: {
            margin: 0,
            fontFamily: theme.typography.fontFamily,
            background: theme.colors.background,
            color: theme.colors.text,
            ...textStyles.body,
          },
          a: { color: 'inherit', textDecoration: 'none' },
          'button:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible': {
            outline: `3px solid ${theme.colors.accent}`,
            outlineOffset: 3,
          },
          'h1,h2,h3,p': { marginTop: 0 },
          h1: textStyles.heading,
          h2: textStyles.title,
          h3: { ...textStyles.lead, fontWeight: 700 },
          'button,input,select,textarea': {
            fontFamily: 'inherit',
            fontSize: theme.typography.body,
            lineHeight: 1.5,
          },
          button: { touchAction: 'manipulation', color: 'inherit' },
        }}
      />
      <BrowserRouter>
        <AppProvider storage={storage}>
          <App />
        </AppProvider>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>,
);
